/**
 * ===========================================================================
 * signal-query tests
 * ===========================================================================
 * Layer:    Substrate: Signal Graph (test mirror of server/services/signals/)
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Tests for SignalQuery — the canonical read path.
 *
 *   Unit layer (always runs, no DB): module-structure smoke tests verifying
 *   the signalQuery singleton exposes the three spec'd methods. Read methods
 *   are pure SQL (no extractable pure logic), so the unit layer is intentionally
 *   minimal — the contract surface is the integration layer.
 *
 *   Integration layer (gated on DATABASE_URL_TEST): seeds rows via
 *   signalRecorder.recordSignal(), then asserts each query method's contract:
 *   per-guest history with limit, per-visit timeline excluding visit-less
 *   signals, source/since time window, ordering desc by timestamp, and the
 *   non-negotiable Tenet 7 defense-in-depth — expired rows (forbidden
 *   sensitivity is the load-bearing case) are NEVER returned.
 *
 *   afterEach cleanup deletes inserted rows by id; afterAll closes the pool.
 *
 * WARNING: DO NOT execute the DB-integration tests against production.
 *          The skip guard requires DATABASE_URL_TEST, NOT DATABASE_URL.
 * ===========================================================================
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { signalQuery, SignalQuery } from '../../../../server/services/signals/signal-query';
import {
  signalRecorder,
  type NewSignalInput,
} from '../../../../server/services/signals/signal-recorder';
import {
  applyMigrations,
  closeTestPool,
  getTestPool,
} from '../../../_helpers/test-db';

// =============================================================================
// Unit layer — module structure (always runs)
// =============================================================================

describe('signal-query — module structure', () => {
  it('signalQuery singleton is an instance of SignalQuery', () => {
    expect(signalQuery).toBeInstanceOf(SignalQuery);
  });

  it('exposes the three spec methods', () => {
    expect(typeof signalQuery.getSignalsForGuest).toBe('function');
    expect(typeof signalQuery.getSignalsForVisit).toBe('function');
    expect(typeof signalQuery.getSignalsBySource).toBe('function');
  });
});

// =============================================================================
// Integration layer — actual reads against test DB (gated)
// =============================================================================

const TEST_DB_URL = process.env.DATABASE_URL_TEST;

describe.skipIf(!TEST_DB_URL)(
  'signal-query — read path (DB integration)',
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

    async function seed(overrides?: Partial<NewSignalInput>): Promise<string> {
      const result = await signalRecorder.recordSignal(makeInput(overrides));
      insertedIds.push(result.id);
      return result.id;
    }

    it('getSignalsForGuest: returns this guest only, ordered most-recent-first', async () => {
      const guest = '00000000-0000-0000-0000-00000000beef';
      const otherGuest = '00000000-0000-0000-0000-00000000cafe';

      const id1 = await seed({ guestId: guest });
      // Small delay to ensure distinct timestamps
      await new Promise((r) => setTimeout(r, 10));
      const id2 = await seed({ guestId: guest });
      await seed({ guestId: otherGuest });

      const results = await signalQuery.getSignalsForGuest(guest);

      const myIds = results.filter((s) => [id1, id2].includes(s.id)).map((s) => s.id);
      expect(myIds).toEqual([id2, id1]); // desc by timestamp
      expect(results.every((s) => s.guestId === guest)).toBe(true);
    });

    it('getSignalsForGuest: respects limit parameter', async () => {
      const guest = '00000000-0000-0000-0000-00000000d00d';
      for (let i = 0; i < 4; i++) {
        await seed({ guestId: guest });
        await new Promise((r) => setTimeout(r, 5));
      }

      const limited = await signalQuery.getSignalsForGuest(guest, 2);
      expect(limited.length).toBe(2);
    });

    it('Tenet 7: getSignalsForGuest does NOT return expired rows (forbidden sensitivity)', async () => {
      const guest = '00000000-0000-0000-0000-00000000d33d';
      const liveId = await seed({ guestId: guest, sensitivity: 'preference' });
      const forbiddenId = await seed({ guestId: guest, sensitivity: 'forbidden' });

      const results = await signalQuery.getSignalsForGuest(guest);
      const ids = results.map((s) => s.id);
      expect(ids).toContain(liveId);
      expect(ids).not.toContain(forbiddenId);
    });

    it('getSignalsForVisit: returns only signals attached to that visit (excludes visit-less)', async () => {
      const visit = '00000000-0000-0000-0000-00000000fade';
      const attached = await seed({ visitId: visit });
      const visitless = await seed({ visitId: null });

      const results = await signalQuery.getSignalsForVisit(visit);
      const ids = results.map((s) => s.id);
      expect(ids).toContain(attached);
      expect(ids).not.toContain(visitless);
      expect(results.every((s) => s.visitId === visit)).toBe(true);
    });

    it('Tenet 7: getSignalsForVisit does NOT return expired rows', async () => {
      const visit = '00000000-0000-0000-0000-00000000feed';
      const liveId = await seed({ visitId: visit, sensitivity: 'behavioral' });
      const forbiddenId = await seed({ visitId: visit, sensitivity: 'forbidden' });

      const results = await signalQuery.getSignalsForVisit(visit);
      const ids = results.map((s) => s.id);
      expect(ids).toContain(liveId);
      expect(ids).not.toContain(forbiddenId);
    });

    it('getSignalsBySource: time-windows correctly via the since cutoff', async () => {
      const oldId = await seed({ source: 'flight-tracker' });
      const cutoff = new Date(Date.now() + 1).toISOString();
      // small wait so the next seed's timestamp is strictly after `cutoff`
      await new Promise((r) => setTimeout(r, 10));
      const newId = await seed({ source: 'flight-tracker' });

      const results = await signalQuery.getSignalsBySource('flight-tracker', cutoff);
      const ids = results.map((s) => s.id);
      expect(ids).toContain(newId);
      expect(ids).not.toContain(oldId);
    });

    it('Tenet 7: getSignalsBySource does NOT return expired rows', async () => {
      const since = new Date(Date.now() - 60_000).toISOString();
      const liveId = await seed({ source: 'pos-event', sensitivity: 'public' });
      const forbiddenId = await seed({ source: 'pos-event', sensitivity: 'forbidden' });

      const results = await signalQuery.getSignalsBySource('pos-event', since);
      const ids = results.map((s) => s.id);
      expect(ids).toContain(liveId);
      expect(ids).not.toContain(forbiddenId);
    });
  },
);
