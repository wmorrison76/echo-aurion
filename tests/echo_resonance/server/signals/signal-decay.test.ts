/**
 * ===========================================================================
 * signal-decay tests
 * ===========================================================================
 * Layer:    Substrate: Signal Graph (test mirror of server/services/signals/)
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Tests for SignalDecay — the cron-driven retention enforcement.
 *
 *   Unit layer (always runs): module-structure smoke. Decay is a single
 *   DELETE statement; no extractable pure logic to unit-test.
 *
 *   Integration layer (gated on DATABASE_URL_TEST): seeds a mix of
 *   expired/non-expired/forbidden rows via signalRecorder, then verifies
 *   purgeExpiredSignals() hard-deletes only the expired ones and returns
 *   the correct per-sensitivity breakdown. Non-expired rows must remain.
 *   Idempotent re-run returns deleted=0.
 *
 * WARNING: DO NOT execute the DB-integration tests against production.
 *          The skip guard requires DATABASE_URL_TEST, NOT DATABASE_URL.
 * ===========================================================================
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { signalDecay, SignalDecay } from '../../../../server/services/signals/signal-decay';
import {
  signalRecorder,
  type NewSignalInput,
} from '../../../../server/services/signals/signal-recorder';
import {
  applyMigrations,
  closeTestPool,
  getTestPool,
} from '../../../_helpers/test-db';

describe('signal-decay — module structure', () => {
  it('signalDecay singleton is an instance of SignalDecay', () => {
    expect(signalDecay).toBeInstanceOf(SignalDecay);
  });

  it('exposes purgeExpiredSignals method', () => {
    expect(typeof signalDecay.purgeExpiredSignals).toBe('function');
  });
});

const TEST_DB_URL = process.env.DATABASE_URL_TEST;

describe.skipIf(!TEST_DB_URL)(
  'signal-decay — purgeExpiredSignals (DB integration)',
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

    /**
     * Seed a row, then forcibly expire it by SQL UPDATE. The recorder always
     * sets expiresAt = now + RETENTION_DAYS[sensitivity], which is in the
     * future for non-forbidden sensitivities — we override post-hoc to
     * simulate a row that has aged past its retention window.
     */
    async function seedAndExpire(overrides?: Partial<NewSignalInput>): Promise<string> {
      const result = await signalRecorder.recordSignal(makeInput(overrides));
      insertedIds.push(result.id);
      await pool.query(
        `UPDATE signals SET expires_at = NOW() - interval '1 second' WHERE id = $1`,
        [result.id],
      );
      return result.id;
    }

    async function seedFresh(overrides?: Partial<NewSignalInput>): Promise<string> {
      const result = await signalRecorder.recordSignal(makeInput(overrides));
      insertedIds.push(result.id);
      return result.id;
    }

    it('deletes expired rows and leaves non-expired rows untouched', async () => {
      const expiredId = await seedAndExpire({ sensitivity: 'preference' });
      const liveId = await seedFresh({ sensitivity: 'preference' });

      const result = await signalDecay.purgeExpiredSignals();

      expect(result.deleted).toBeGreaterThanOrEqual(1);

      const remaining = await pool.query<{ id: string }>(
        'SELECT id FROM signals WHERE id = ANY($1::uuid[])',
        [[expiredId, liveId]],
      );
      const remainingIds = remaining.rows.map((r) => r.id);
      expect(remainingIds).not.toContain(expiredId);
      expect(remainingIds).toContain(liveId);
    });

    it('Tenet 8: forbidden rows (expired-on-creation) are swept on the next pass', async () => {
      // signal-recorder sets expires_at = now() for sensitivity='forbidden'.
      // No need to forcibly expire — the row is already at-or-past expiry.
      const forbiddenId = await seedFresh({ sensitivity: 'forbidden' });

      // small wait to ensure NOW() has advanced past the row's expires_at
      await new Promise((r) => setTimeout(r, 50));

      const result = await signalDecay.purgeExpiredSignals();
      expect(result.bySensitivity.forbidden).toBeGreaterThanOrEqual(1);

      const remaining = await pool.query<{ id: string }>(
        'SELECT id FROM signals WHERE id = $1',
        [forbiddenId],
      );
      expect(remaining.rowCount).toBe(0);
    });

    it('returns per-sensitivity breakdown that sums to total deleted', async () => {
      await seedAndExpire({ sensitivity: 'preference' });
      await seedAndExpire({ sensitivity: 'behavioral' });
      await seedAndExpire({ sensitivity: 'emotional' });

      const result = await signalDecay.purgeExpiredSignals();

      const sum =
        result.bySensitivity.public +
        result.bySensitivity.preference +
        result.bySensitivity.behavioral +
        result.bySensitivity.emotional +
        result.bySensitivity.sensitive +
        result.bySensitivity.forbidden;
      expect(sum).toBe(result.deleted);
      expect(result.bySensitivity.preference).toBeGreaterThanOrEqual(1);
      expect(result.bySensitivity.behavioral).toBeGreaterThanOrEqual(1);
      expect(result.bySensitivity.emotional).toBeGreaterThanOrEqual(1);
    });

    it('idempotent: re-running immediately after a sweep returns deleted=0', async () => {
      await seedAndExpire({ sensitivity: 'preference' });
      await signalDecay.purgeExpiredSignals();

      const second = await signalDecay.purgeExpiredSignals();
      expect(second.deleted).toBe(0);
    });
  },
);
