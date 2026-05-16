/**
 * ===========================================================================
 * resonance-engine tests
 * ===========================================================================
 * Layer:    Resonance (test mirror of server/services/echo-ai3/resonance/)
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Tests for ResonanceEngine — the central service of Layer 1.
 *
 *   Unit layer (always runs): module-structure smoke + scoreFromAffect parity
 *   with client/lib/resonance/score.ts. Parity is guaranteed by re-export
 *   (single shared function), but a smoke test asserts the contract holds
 *   in case a future change introduces wrapping or transformation.
 *
 *   Integration layer (gated on DATABASE_URL_TEST): full createReading
 *   round-trip — verifies reading row, signal row, and trajectory update
 *   all land or all roll back. Plus getRecentReadings filtering and ordering.
 * ===========================================================================
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import {
  resonanceEngine,
  ResonanceEngine,
} from '../../../../server/services/echo-ai3/resonance/resonance-engine';
import { scoreFromAffect as clientScoreFromAffect } from '../../../../client/lib/resonance/score';
import type { NewResonanceReading } from '../../../../shared/types/resonance';
import {
  applyMigrations,
  closeTestPool,
  getTestPool,
} from '../../../_helpers/test-db';

// =============================================================================
// Unit layer — module structure + score parity (always runs)
// =============================================================================

describe('resonance-engine — module structure', () => {
  it('resonanceEngine singleton is an instance of ResonanceEngine', () => {
    expect(resonanceEngine).toBeInstanceOf(ResonanceEngine);
  });

  it('exposes the spec methods', () => {
    expect(typeof resonanceEngine.createReading).toBe('function');
    expect(typeof resonanceEngine.getRecentReadings).toBe('function');
    expect(typeof resonanceEngine.scoreFromAffect).toBe('function');
  });
});

describe('resonance-engine — scoreFromAffect parity with client/lib/resonance/score', () => {
  // Sample grid covering corners, neutral, and a few interior points.
  const samples: Array<{ arousal: number; valence: number }> = [
    { arousal: 0, valence: 0 },
    { arousal: 1, valence: 1 },
    { arousal: -1, valence: -1 },
    { arousal: 1, valence: -1 },
    { arousal: -1, valence: 1 },
    { arousal: 0.3, valence: 0.7 },
    { arousal: -0.5, valence: 0.5 },
    { arousal: 0.8, valence: -0.2 },
  ];

  it.each(samples)(
    'server.scoreFromAffect({arousal: $arousal, valence: $valence}) === client.scoreFromAffect',
    ({ arousal, valence }) => {
      const serverResult = resonanceEngine.scoreFromAffect({ arousal, valence });
      const clientResult = clientScoreFromAffect({ arousal, valence });
      expect(serverResult).toBe(clientResult);
    },
  );

  it('respects custom ScoreConfig identically to client', () => {
    const config = { arousalWeight: 0.6, floor: 0, ceiling: 100 };
    const affect = { arousal: 0.5, valence: -0.3 };
    expect(resonanceEngine.scoreFromAffect(affect, config)).toBe(
      clientScoreFromAffect(affect, config),
    );
  });
});

// =============================================================================
// Integration layer — actual DB (gated)
// =============================================================================

const TEST_DB_URL = process.env.DATABASE_URL_TEST;

describe.skipIf(!TEST_DB_URL)(
  'resonance-engine — createReading + getRecentReadings (DB integration)',
  () => {
    let pool: Pool;
    const insertedReadings: string[] = [];
    const insertedTrajectories: string[] = [];
    const insertedSignals: string[] = [];

    beforeAll(async () => {
      await applyMigrations();
      pool = getTestPool();
    }, 60_000);

    afterEach(async () => {
      if (insertedSignals.length > 0) {
        await pool.query(`DELETE FROM signals WHERE guest_id = ANY($1::uuid[])`, [insertedSignals]);
        insertedSignals.length = 0;
      }
      if (insertedReadings.length > 0) {
        await pool.query(`DELETE FROM resonance_readings WHERE id = ANY($1::uuid[])`, [insertedReadings]);
        insertedReadings.length = 0;
      }
      if (insertedTrajectories.length > 0) {
        await pool.query(`DELETE FROM resonance_trajectories WHERE visit_id = ANY($1::uuid[])`, [insertedTrajectories]);
        insertedTrajectories.length = 0;
      }
    });

    afterAll(async () => {
      await closeTestPool();
    });

    function makeInput(overrides?: Partial<NewResonanceReading>): NewResonanceReading {
      return {
        guestId: '00000000-0000-0000-0000-0000000b0001',
        visitId: null,
        capturedBy: '00000000-0000-0000-0000-0000000b0002',
        channel: 'observation',
        arousal: 0.3,
        valence: 0.5,
        resonance: 7,
        signals: [],
        confidence: 0.85,
        ...overrides,
      };
    }

    async function seedTrajectory(
      visitId: string,
      guestId: string,
      propertyId: string,
      entryScore: number,
    ): Promise<void> {
      const liftGoal = entryScore + 2;
      const liftGap = liftGoal - entryScore;
      const status = liftGap <= 0 ? 'green' : liftGap <= 1 ? 'amber' : 'red';
      await pool.query(
        `INSERT INTO resonance_trajectories
           (visit_id, guest_id, property_id, started_at, last_updated_at,
            entry_score, current_score, trajectory, projected_exit_score,
            lift_goal, lift_gap, status, reading_count, has_open_intervention)
         VALUES ($1, $2, $3, NOW(), NOW(), $4, $4, 0, $4, $5, $6, $7, 0, false)`,
        [visitId, guestId, propertyId, entryScore, liftGoal, liftGap, status],
      );
      insertedTrajectories.push(visitId);
    }

    it('createReading: persists reading, emits signal, returns canonical shape', async () => {
      const guestId = '00000000-0000-0000-0000-0000000b0010';
      insertedSignals.push(guestId);
      const reading = await resonanceEngine.createReading(makeInput({ guestId }));
      insertedReadings.push(reading.id);

      expect(reading.id).toMatch(/^[0-9a-f]{8}-/);
      expect(reading.guestId).toBe(guestId);
      expect(reading.arousal).toBe(0.3);
      expect(reading.valence).toBe(0.5);
      expect(reading.resonance).toBe(7);
      expect(reading.expiresAt).toBeTruthy();
      expect(reading.createdAt).toBeTruthy();

      // Verify reading row
      const readingRow = await pool.query('SELECT id FROM resonance_readings WHERE id = $1', [reading.id]);
      expect(readingRow.rowCount).toBe(1);

      // Verify signal emitted to graph
      const signalRow = await pool.query(
        `SELECT id, source, sensitivity FROM signals WHERE guest_id = $1`,
        [guestId],
      );
      expect(signalRow.rowCount).toBeGreaterThanOrEqual(1);
      expect(signalRow.rows[0].source).toBe('staff-whisper');
      expect(signalRow.rows[0].sensitivity).toBe('emotional');
    });

    it('createReading: Tenet 2 — expiresAt matches RETENTION_DAYS[emotional] (~30d)', async () => {
      const guestId = '00000000-0000-0000-0000-0000000b0020';
      insertedSignals.push(guestId);
      const before = new Date();
      const reading = await resonanceEngine.createReading(makeInput({ guestId }));
      insertedReadings.push(reading.id);

      // Reading row is the persisting score (Tenet 2). Expect ~30d TTL,
      // matching the corresponding emitted Signal's emotional sensitivity.
      const expiresAt = new Date(reading.expiresAt);
      const DAY_MS = 86_400_000;
      const expectedMin = before.getTime() + 29.5 * DAY_MS;
      const expectedMax = before.getTime() + 30.5 * DAY_MS;
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
    });

    it('createReading: voice channel emits aurion-voice-prosody source', async () => {
      const guestId = '00000000-0000-0000-0000-0000000b0025';
      insertedSignals.push(guestId);
      const reading = await resonanceEngine.createReading(
        makeInput({ guestId, channel: 'voice' }),
      );
      insertedReadings.push(reading.id);

      const signalRow = await pool.query<{ source: string }>(
        'SELECT source FROM signals WHERE guest_id = $1 ORDER BY created_at DESC LIMIT 1',
        [guestId],
      );
      expect(signalRow.rows[0].source).toBe('aurion-voice-prosody');
    });

    it('createReading: with visitId triggers trajectory update (when trajectory exists)', async () => {
      const visitId = '00000000-0000-0000-0000-0000000b0030';
      const guestId = '00000000-0000-0000-0000-0000000b0031';
      const propertyId = '00000000-0000-0000-0000-0000000b0032';
      await seedTrajectory(visitId, guestId, propertyId, 5);
      insertedSignals.push(guestId);

      const reading = await resonanceEngine.createReading(
        makeInput({ guestId, visitId, arousal: 0.5, valence: 0.7, resonance: 8 }),
      );
      insertedReadings.push(reading.id);

      const trajectoryRow = await pool.query<{ reading_count: number; current_score: number }>(
        'SELECT reading_count, current_score FROM resonance_trajectories WHERE visit_id = $1',
        [visitId],
      );
      expect(trajectoryRow.rows[0].reading_count).toBe(1);
      expect(trajectoryRow.rows[0].current_score).toBe(8);
    });

    it('createReading: visitId without trajectory still persists reading (graceful)', async () => {
      const visitId = '00000000-0000-0000-0000-0000000b0040';
      const guestId = '00000000-0000-0000-0000-0000000b0041';
      insertedSignals.push(guestId);

      const reading = await resonanceEngine.createReading(makeInput({ guestId, visitId }));
      insertedReadings.push(reading.id);

      // Reading is persisted even though no trajectory exists
      const readingRow = await pool.query('SELECT id FROM resonance_readings WHERE id = $1', [reading.id]);
      expect(readingRow.rowCount).toBe(1);
      // Trajectory is NOT auto-created (Phase 1.4 routes' responsibility)
      const trajectoryRow = await pool.query('SELECT visit_id FROM resonance_trajectories WHERE visit_id = $1', [visitId]);
      expect(trajectoryRow.rowCount).toBe(0);
    });

    it('getRecentReadings: returns this guest only, ordered most-recent-first', async () => {
      const guestId = '00000000-0000-0000-0000-0000000b0050';
      const otherGuest = '00000000-0000-0000-0000-0000000b0051';
      insertedSignals.push(guestId, otherGuest);

      const r1 = await resonanceEngine.createReading(makeInput({ guestId, resonance: 5 }));
      insertedReadings.push(r1.id);
      await new Promise((r) => setTimeout(r, 10));
      const r2 = await resonanceEngine.createReading(makeInput({ guestId, resonance: 7 }));
      insertedReadings.push(r2.id);
      const other = await resonanceEngine.createReading(makeInput({ guestId: otherGuest }));
      insertedReadings.push(other.id);

      const results = await resonanceEngine.getRecentReadings(guestId);
      const myIds = results.filter((r) => [r1.id, r2.id].includes(r.id)).map((r) => r.id);
      expect(myIds).toEqual([r2.id, r1.id]);
      expect(results.every((r) => r.guestId === guestId)).toBe(true);
    });

    it('getRecentReadings: respects limit parameter', async () => {
      const guestId = '00000000-0000-0000-0000-0000000b0060';
      insertedSignals.push(guestId);

      for (let i = 0; i < 4; i++) {
        const r = await resonanceEngine.createReading(makeInput({ guestId }));
        insertedReadings.push(r.id);
        await new Promise((r) => setTimeout(r, 5));
      }

      const limited = await resonanceEngine.getRecentReadings(guestId, 2);
      expect(limited.length).toBe(2);
    });
  },
);
