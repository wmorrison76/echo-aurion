/**
 * ===========================================================================
 * Expired-row filter — integration test for Tenet 2/7 defense in depth
 * ===========================================================================
 * Layer:    Substrate: Signal Graph + Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Verify the WHERE expires_at >= NOW() filter on every read path
 *           actually does what the SQL says. Until now the defense was
 *           asserted only by code inspection. This file makes it a real
 *           regression test.
 *
 *           Tested behaviors:
 *             - signal-query.getSignalsForGuest excludes expired rows
 *             - signal-query.getSignalsForVisit excludes expired rows
 *             - signal-query.getSignalsBySource excludes expired rows
 *             - resonance-engine.getRecentReadings excludes expired rows
 *             - signal-decay.purgeExpiredSignals deletes only the expired
 *               and reports the per-sensitivity breakdown correctly
 *
 *           Tenet 8 closure: a forbidden-sensitivity signal is written
 *           with expires_at = now() and is excluded from all read methods
 *           on the very next millisecond.
 *
 *   Gated on DATABASE_URL_TEST. Skipped when absent.
 * ===========================================================================
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { signalQuery } from '../../../../server/services/signals/signal-query';
import { signalDecay } from '../../../../server/services/signals/signal-decay';
import { resonanceEngine } from '../../../../server/services/echo-ai3/resonance/resonance-engine';
import { applyMigrations, closeTestPool, getTestPool } from '../../../_helpers/test-db';

const TEST_DB_URL = process.env.DATABASE_URL_TEST;

describe.skipIf(!TEST_DB_URL)(
  'expired-row filter — Tenet 2/7 defense in depth (DB integration)',
  () => {
    let pool: Pool;
    const insertedSignalIds: string[] = [];
    const insertedReadingIds: string[] = [];

    beforeAll(async () => {
      await applyMigrations();
      pool = getTestPool();
    }, 60_000);

    afterEach(async () => {
      if (insertedSignalIds.length > 0) {
        await pool.query('DELETE FROM signals WHERE id = ANY($1::uuid[])', [insertedSignalIds]);
        insertedSignalIds.length = 0;
      }
      if (insertedReadingIds.length > 0) {
        await pool.query('DELETE FROM resonance_readings WHERE id = ANY($1::uuid[])', [insertedReadingIds]);
        insertedReadingIds.length = 0;
      }
    });

    afterAll(async () => {
      await closeTestPool();
    });

    /** Insert a signal with explicit expires_at. Bypasses signal-recorder so
     *  we can simulate already-expired rows without waiting wall-clock days. */
    async function seedSignal(args: {
      guestId: string;
      visitId?: string | null;
      source?: string;
      sensitivity?: string;
      expiresAtMsFromNow: number;
      timestampMsFromNow?: number;
    }): Promise<string> {
      const id = uuidv4();
      const now = new Date();
      const ts = new Date(now.getTime() + (args.timestampMsFromNow ?? 0));
      const exp = new Date(now.getTime() + args.expiresAtMsFromNow);
      await pool.query(
        `INSERT INTO signals
           (id, guest_id, visit_id, timestamp, source, subject, tags,
            conversion, note, sensitivity, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, '[]'::jsonb,
                 NULL, NULL, $7, $8, NOW())`,
        [
          id,
          args.guestId,
          args.visitId ?? null,
          ts.toISOString(),
          args.source ?? 'staff-whisper',
          JSON.stringify({ kind: 'free-text', text: 'expired-row-filter test seed' }),
          args.sensitivity ?? 'public',
          exp.toISOString(),
        ],
      );
      insertedSignalIds.push(id);
      return id;
    }

    async function seedReading(args: {
      guestId: string;
      visitId?: string | null;
      capturedBy?: string;
      expiresAtMsFromNow: number;
    }): Promise<string> {
      const id = uuidv4();
      const now = new Date();
      const exp = new Date(now.getTime() + args.expiresAtMsFromNow);
      await pool.query(
        `INSERT INTO resonance_readings
           (id, guest_id, visit_id, timestamp, captured_by, channel,
            arousal, valence, resonance, signals, confidence,
            expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), $4, 'observation',
                 0.3, 0.5, 7, '[]'::jsonb, 0.85,
                 $5, NOW(), NOW())`,
        [id, args.guestId, args.visitId ?? null, args.capturedBy ?? uuidv4(), exp.toISOString()],
      );
      insertedReadingIds.push(id);
      return id;
    }

    // -------------------- signal-query: getSignalsForGuest --------------------

    it('getSignalsForGuest excludes signals with expires_at in the past', async () => {
      const guestId = uuidv4();
      const live = await seedSignal({ guestId, expiresAtMsFromNow: 60_000 });
      const expired = await seedSignal({ guestId, expiresAtMsFromNow: -60_000 });

      const result = await signalQuery.getSignalsForGuest(guestId);
      const ids = result.map((s) => s.id);
      expect(ids).toContain(live);
      expect(ids).not.toContain(expired);
    });

    // -------------------- signal-query: getSignalsForVisit --------------------

    it('getSignalsForVisit excludes signals with expires_at in the past', async () => {
      const guestId = uuidv4();
      const visitId = uuidv4();
      const live = await seedSignal({ guestId, visitId, expiresAtMsFromNow: 60_000 });
      const expired = await seedSignal({ guestId, visitId, expiresAtMsFromNow: -60_000 });

      const result = await signalQuery.getSignalsForVisit(visitId);
      const ids = result.map((s) => s.id);
      expect(ids).toContain(live);
      expect(ids).not.toContain(expired);
    });

    // -------------------- signal-query: getSignalsBySource --------------------

    it('getSignalsBySource excludes signals with expires_at in the past', async () => {
      const guestId = uuidv4();
      // Distinct source so the test doesn't pick up other tests' fixtures.
      const source = 'flight-tracker';
      const live = await seedSignal({
        guestId,
        source,
        expiresAtMsFromNow: 60_000,
        timestampMsFromNow: -1_000,
      });
      const expired = await seedSignal({
        guestId,
        source,
        expiresAtMsFromNow: -60_000,
        timestampMsFromNow: -2_000,
      });

      const since = new Date(Date.now() - 10_000).toISOString();
      const result = await signalQuery.getSignalsBySource(source as never, since);
      const ids = result.map((s) => s.id);
      expect(ids).toContain(live);
      expect(ids).not.toContain(expired);
    });

    // -------------------- resonance-engine: getRecentReadings --------------------

    it('resonance-engine.getRecentReadings excludes readings with expires_at in the past', async () => {
      const guestId = uuidv4();
      const live = await seedReading({ guestId, expiresAtMsFromNow: 60_000 });
      const expired = await seedReading({ guestId, expiresAtMsFromNow: -60_000 });

      const result = await resonanceEngine.getRecentReadings(guestId);
      const ids = result.map((r) => r.id);
      expect(ids).toContain(live);
      expect(ids).not.toContain(expired);
    });

    // -------------------- signal-decay: purgeExpiredSignals --------------------

    it('signal-decay.purgeExpiredSignals deletes only expired and reports per-sensitivity', async () => {
      const guestId = uuidv4();
      const liveId = await seedSignal({
        guestId,
        sensitivity: 'public',
        expiresAtMsFromNow: 60_000,
      });
      const expEmotional = await seedSignal({
        guestId,
        sensitivity: 'emotional',
        expiresAtMsFromNow: -10_000,
      });
      const expSensitive = await seedSignal({
        guestId,
        sensitivity: 'sensitive',
        expiresAtMsFromNow: -10_000,
      });

      const result = await signalDecay.purgeExpiredSignals();

      // The live row remains; the two expired rows are gone.
      const remaining = await pool.query(
        'SELECT id FROM signals WHERE id = ANY($1::uuid[])',
        [[liveId, expEmotional, expSensitive]],
      );
      const remainingIds = remaining.rows.map((r) => r.id);
      expect(remainingIds).toContain(liveId);
      expect(remainingIds).not.toContain(expEmotional);
      expect(remainingIds).not.toContain(expSensitive);

      // The breakdown counters reflect at least our two rows in their buckets.
      // (Other tests may add more; we assert >= our seeded count.)
      expect(result.deleted).toBeGreaterThanOrEqual(2);
      expect(result.bySensitivity.emotional).toBeGreaterThanOrEqual(1);
      expect(result.bySensitivity.sensitive).toBeGreaterThanOrEqual(1);

      // Drop the expired ids from cleanup tracking — already deleted.
      const idx1 = insertedSignalIds.indexOf(expEmotional);
      if (idx1 >= 0) insertedSignalIds.splice(idx1, 1);
      const idx2 = insertedSignalIds.indexOf(expSensitive);
      if (idx2 >= 0) insertedSignalIds.splice(idx2, 1);
    });

    // -------------------- Tenet 8 closure: forbidden expired-on-creation --------------------

    it('Tenet 8: a forbidden-sensitivity signal is filtered from all reads on next millisecond', async () => {
      const guestId = uuidv4();
      const visitId = uuidv4();

      const forbidden = await seedSignal({
        guestId,
        visitId,
        source: 'staff-whisper',
        sensitivity: 'forbidden',
        expiresAtMsFromNow: 0, // expires_at = now (Tenet 8 contract)
      });

      // Wait one tick so NOW() in the read query is strictly after the row's
      // expires_at. (Postgres NOW() is statement-time, not row-clock.)
      await new Promise((r) => setTimeout(r, 50));

      const byGuest = await signalQuery.getSignalsForGuest(guestId);
      const byVisit = await signalQuery.getSignalsForVisit(visitId);
      const bySource = await signalQuery.getSignalsBySource(
        'staff-whisper' as never,
        new Date(Date.now() - 5_000).toISOString(),
      );

      expect(byGuest.map((s) => s.id)).not.toContain(forbidden);
      expect(byVisit.map((s) => s.id)).not.toContain(forbidden);
      expect(bySource.map((s) => s.id)).not.toContain(forbidden);
    });
  },
);
