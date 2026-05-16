/**
 * ===========================================================================
 * signal-recorder tests
 * ===========================================================================
 * Layer:    Substrate: Signal Graph (test mirror of server/services/signals/)
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Two-layer test suite for SignalRecorder.
 *
 *   Unit layer (always runs, no DB): verifies the pure expiresAt math
 *   in computeExpiresAt() across all 6 SensitivityLevel values.
 *
 *   Integration layer (gated on DATABASE_URL_TEST): verifies actual
 *   writes against the test database — full Signal round-trip,
 *   expires_at correctness per Tenet 7, JSONB serialization, by-design
 *   nullability preservation, and the Tenet 8 forbidden design contract
 *   (row written + would-be-swept-on-next-tick).
 *
 *   Cleanup: each integration test tracks its inserted ids and afterEach
 *   deletes them — keeps the test DB clean across runs.
 *
 * WARNING: DO NOT execute the DB-integration tests against production.
 *          The skip guard requires DATABASE_URL_TEST, NOT DATABASE_URL.
 * ===========================================================================
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import {
  computeExpiresAt,
  signalRecorder,
  type NewSignalInput,
} from '../../../../server/services/signals/signal-recorder';
import {
  applyMigrations,
  closeTestPool,
  getTestPool,
} from '../../../_helpers/test-db';

const MS_PER_DAY = 86_400_000;

// =============================================================================
// Unit layer — pure expiresAt math (always runs)
// =============================================================================

describe('signal-recorder — computeExpiresAt (pure)', () => {
  const fixedBase = new Date('2026-01-15T12:00:00.000Z');

  it('public: base + 5 years', () => {
    const expected = fixedBase.getTime() + 365 * 5 * MS_PER_DAY;
    expect(computeExpiresAt('public', fixedBase).getTime()).toBe(expected);
  });

  it('preference: base + 2 years', () => {
    const expected = fixedBase.getTime() + 365 * 2 * MS_PER_DAY;
    expect(computeExpiresAt('preference', fixedBase).getTime()).toBe(expected);
  });

  it('behavioral: base + 90 days', () => {
    const expected = fixedBase.getTime() + 90 * MS_PER_DAY;
    expect(computeExpiresAt('behavioral', fixedBase).getTime()).toBe(expected);
  });

  it('emotional: base + 30 days (Tenet 7)', () => {
    const expected = fixedBase.getTime() + 30 * MS_PER_DAY;
    expect(computeExpiresAt('emotional', fixedBase).getTime()).toBe(expected);
  });

  it('sensitive: base + 30 days (Tenet 7)', () => {
    const expected = fixedBase.getTime() + 30 * MS_PER_DAY;
    expect(computeExpiresAt('sensitive', fixedBase).getTime()).toBe(expected);
  });

  it('forbidden: base + 0 days (immediate sweep, Tenet 8 design contract)', () => {
    expect(computeExpiresAt('forbidden', fixedBase).getTime()).toBe(fixedBase.getTime());
  });

  it('is pure: same input → same output', () => {
    const out1 = computeExpiresAt('emotional', fixedBase);
    const out2 = computeExpiresAt('emotional', fixedBase);
    expect(out1.getTime()).toBe(out2.getTime());
  });

  it('default base argument resolves to fresh now() (callable without args)', () => {
    const result = computeExpiresAt('public');
    const fiveYearsMs = 365 * 5 * MS_PER_DAY;
    const delta = result.getTime() - Date.now();
    expect(delta).toBeGreaterThan(fiveYearsMs - 60_000);
    expect(delta).toBeLessThan(fiveYearsMs + 60_000);
  });
});

// =============================================================================
// Integration layer — actual writes against test DB (gated)
// =============================================================================

const TEST_DB_URL = process.env.DATABASE_URL_TEST;

describe.skipIf(!TEST_DB_URL)(
  'signal-recorder — recordSignal (DB integration)',
  () => {
    let pool: Pool;
    const insertedIds: string[] = [];

    beforeAll(async () => {
      await applyMigrations();
      pool = getTestPool();
    }, 60_000);

    afterEach(async () => {
      if (insertedIds.length > 0) {
        await pool.query(`DELETE FROM signals WHERE id = ANY($1::uuid[])`, [insertedIds]);
        insertedIds.length = 0;
      }
    });

    afterAll(async () => {
      await closeTestPool();
    });

    function makeInput(overrides?: Partial<NewSignalInput>): NewSignalInput {
      return {
        guestId: '00000000-0000-0000-0000-00000000aaaa',
        visitId: null,
        source: 'staff-whisper',
        subject: { kind: 'free-text', text: 'integration-test' },
        tags: [],
        conversion: null,
        sensitivity: 'preference',
        ...overrides,
      };
    }

    it('persists a row and returns the full Signal with server-set fields', async () => {
      const result = await signalRecorder.recordSignal(makeInput());
      insertedIds.push(result.id);

      expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(result.guestId).toBe('00000000-0000-0000-0000-00000000aaaa');
      expect(result.source).toBe('staff-whisper');
      expect(result.sensitivity).toBe('preference');
      expect(result.expiresAt).toBeTruthy();
      expect(result.createdAt).toBeTruthy();
      expect(result.timestamp).toBeTruthy();

      const row = await pool.query(
        'SELECT id, sensitivity FROM signals WHERE id = $1',
        [result.id],
      );
      expect(row.rowCount).toBe(1);
      expect(row.rows[0].sensitivity).toBe('preference');
    });

    it('expiresAt = now + RETENTION_DAYS[sensitivity] (Tenet 7, sensitive=30d)', async () => {
      const before = new Date();
      const result = await signalRecorder.recordSignal(makeInput({ sensitivity: 'sensitive' }));
      insertedIds.push(result.id);
      const after = new Date();

      const expiresAt = new Date(result.expiresAt);
      const expectedMin = before.getTime() + 30 * MS_PER_DAY - 5_000;
      const expectedMax = after.getTime() + 30 * MS_PER_DAY + 5_000;

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
    });

    it('Tenet 8 design contract: forbidden persists AND would be swept on next decay tick', async () => {
      const beforeWrite = new Date();
      const result = await signalRecorder.recordSignal(makeInput({ sensitivity: 'forbidden' }));
      insertedIds.push(result.id);
      const afterWrite = new Date();

      // (a) row IS written at write-time
      const dbRow = await pool.query(
        'SELECT id, sensitivity, expires_at FROM signals WHERE id = $1',
        [result.id],
      );
      expect(dbRow.rowCount).toBe(1);
      expect(dbRow.rows[0].sensitivity).toBe('forbidden');

      // (b) row would be swept by next decay tick: expires_at <= now()
      const expiresAt = new Date(result.expiresAt);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(afterWrite.getTime());
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(beforeWrite.getTime() - 5_000);
    });

    it('preserves visitId=null and conversion=null (CC-4 by-design absent)', async () => {
      const result = await signalRecorder.recordSignal(
        makeInput({ visitId: null, conversion: null }),
      );
      insertedIds.push(result.id);

      expect(result.visitId).toBeNull();
      expect(result.conversion).toBeNull();
    });

    it('serializes subject + tags as JSONB and round-trips them', async () => {
      const subject = {
        kind: 'venue' as const,
        venueId: '00000000-0000-0000-0000-00000000bbbb',
      };
      const tags = [
        { class: 'body-language' as const, tag: 'leaning-in' },
      ];
      const result = await signalRecorder.recordSignal(makeInput({ subject, tags }));
      insertedIds.push(result.id);

      expect(result.subject).toEqual(subject);
      expect(result.tags).toEqual(tags);
    });
  },
);
