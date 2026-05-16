/**
 * ===========================================================================
 * trajectory-engine tests
 * ===========================================================================
 * Layer:    Resonance (test mirror of server/services/echo-ai3/resonance/)
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Tests for TrajectoryEngine — lift tracking and floor view.
 *
 *   Unit layer (always runs): pure-function tests for the extracted helpers
 *   (statusFromLiftGap, computeSlope) plus module-structure smoke. These are
 *   the only extractable pure pieces; the rest of the engine touches the DB.
 *
 *   Integration layer (gated on DATABASE_URL_TEST): seeds a trajectory row
 *   directly via SQL (since createTrajectory is a Phase 1.4 route concern,
 *   per the file header), then exercises updateTrajectory + getFloorView +
 *   getTrajectory against a real DB. Verifies status transitions, slope
 *   computation, lift gap math, and the active-visits-only filter on
 *   getFloorView.
 * ===========================================================================
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import {
  trajectoryEngine,
  TrajectoryEngine,
  statusFromLiftGap,
  computeSlope,
} from '../../../../server/services/echo-ai3/resonance/trajectory-engine';
import type { ResonanceReading } from '../../../../shared/types/resonance';
import {
  applyMigrations,
  closeTestPool,
  getTestPool,
} from '../../../_helpers/test-db';

// =============================================================================
// Unit layer — pure helpers + module structure (always runs)
// =============================================================================

describe('trajectory-engine — module structure', () => {
  it('trajectoryEngine singleton is an instance of TrajectoryEngine', () => {
    expect(trajectoryEngine).toBeInstanceOf(TrajectoryEngine);
  });

  it('exposes the three spec methods', () => {
    expect(typeof trajectoryEngine.updateTrajectory).toBe('function');
    expect(typeof trajectoryEngine.getFloorView).toBe('function');
    expect(typeof trajectoryEngine.getTrajectory).toBe('function');
  });
});

describe('trajectory-engine — statusFromLiftGap (pure)', () => {
  it('green when liftGap <= 0 (on track or exceeding goal)', () => {
    expect(statusFromLiftGap(-5)).toBe('green');
    expect(statusFromLiftGap(0)).toBe('green');
  });

  it('amber when 0 < liftGap <= 1.0 (at risk)', () => {
    expect(statusFromLiftGap(0.1)).toBe('amber');
    expect(statusFromLiftGap(0.5)).toBe('amber');
    expect(statusFromLiftGap(1.0)).toBe('amber');
  });

  it('red when liftGap > 1.0 (intervention needed)', () => {
    expect(statusFromLiftGap(1.01)).toBe('red');
    expect(statusFromLiftGap(2)).toBe('red');
    expect(statusFromLiftGap(5)).toBe('red');
  });
});

describe('trajectory-engine — computeSlope (pure)', () => {
  it('returns 0 for window of size 0 or 1', () => {
    expect(computeSlope([])).toBe(0);
    expect(computeSlope([7])).toBe(0);
  });

  it('positive slope for ascending scores', () => {
    expect(computeSlope([5, 6, 7])).toBe(1);
    expect(computeSlope([5, 7])).toBe(2);
  });

  it('negative slope for descending scores', () => {
    expect(computeSlope([7, 6, 5])).toBe(-1);
    expect(computeSlope([8, 6])).toBe(-2);
  });

  it('zero slope for flat scores', () => {
    expect(computeSlope([5, 5, 5])).toBe(0);
  });

  it('linear: (last - first) / (N - 1) regardless of intermediates', () => {
    // Intermediate values don't affect the slope per v1 design
    expect(computeSlope([5, 9, 7])).toBe(1); // (7-5)/2
  });
});

// =============================================================================
// Integration layer — actual DB (gated)
// =============================================================================

const TEST_DB_URL = process.env.DATABASE_URL_TEST;

describe.skipIf(!TEST_DB_URL)(
  'trajectory-engine — DB integration',
  () => {
    let pool: Pool;
    const insertedTrajectories: string[] = [];
    const insertedReadings: string[] = [];

    beforeAll(async () => {
      await applyMigrations();
      pool = getTestPool();
    }, 60_000);

    afterEach(async () => {
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

    /**
     * Seed an initial trajectory row directly via SQL (createTrajectory
     * is Phase 1.4 routes work; tests bypass that to exercise updateTrajectory).
     */
    async function seedTrajectory(
      visitId: string,
      guestId: string,
      propertyId: string,
      entryScore: number,
    ): Promise<void> {
      const liftGoal = entryScore + 2;
      const liftGap = liftGoal - entryScore;
      const status =
        liftGap <= 0 ? 'green' : liftGap <= 1.0 ? 'amber' : 'red';
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

    /**
     * Insert a reading row directly via SQL. Returns the inserted row's id.
     */
    async function seedReading(
      visitId: string | null,
      guestId: string,
      arousal: number,
      valence: number,
      resonance: number,
    ): Promise<ResonanceReading> {
      const result = await pool.query<{
        id: string;
        guest_id: string;
        visit_id: string | null;
        timestamp: Date;
        captured_by: string;
        channel: string;
        arousal: number;
        valence: number;
        resonance: number;
        confidence: number;
        expires_at: Date;
        created_at: Date;
        updated_at: Date;
      }>(
        `INSERT INTO resonance_readings
           (id, guest_id, visit_id, timestamp, captured_by, channel,
            arousal, valence, resonance, signals, confidence, expires_at)
         VALUES (gen_random_uuid(), $1, $2, NOW(), 'staff-test', 'observation',
                 $3, $4, $5, '[]'::jsonb, 0.9, NOW() + interval '1 day')
         RETURNING *`,
        [guestId, visitId, arousal, valence, resonance],
      );
      const row = result.rows[0];
      insertedReadings.push(row.id);
      return {
        id: row.id,
        guestId: row.guest_id,
        visitId: row.visit_id,
        timestamp: row.timestamp.toISOString(),
        capturedBy: row.captured_by,
        channel: row.channel as ResonanceReading['channel'],
        arousal: row.arousal,
        valence: row.valence,
        resonance: row.resonance,
        signals: [],
        confidence: row.confidence,
        expiresAt: row.expires_at.toISOString(),
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      };
    }

    it('updateTrajectory: returns null when no trajectory exists for the visit', async () => {
      const visitId = '00000000-0000-0000-0000-0000000a0001';
      const guestId = '00000000-0000-0000-0000-0000000a0002';
      const reading = await seedReading(visitId, guestId, 0.5, 0.5, 7);

      const result = await trajectoryEngine.updateTrajectory(visitId, reading);
      expect(result).toBeNull();
    });

    it('updateTrajectory: increments readingCount, updates currentScore, recomputes status', async () => {
      const visitId = '00000000-0000-0000-0000-0000000a0010';
      const guestId = '00000000-0000-0000-0000-0000000a0011';
      const propertyId = '00000000-0000-0000-0000-0000000a0012';
      await seedTrajectory(visitId, guestId, propertyId, 5);

      const reading = await seedReading(visitId, guestId, 0.5, 0.7, 8);
      const result = await trajectoryEngine.updateTrajectory(visitId, reading);

      expect(result).not.toBeNull();
      expect(result!.readingCount).toBe(1);
      expect(result!.currentScore).toBe(8);
      expect(result!.entryScore).toBe(5); // unchanged
      expect(result!.liftGoal).toBe(7); // entryScore + 2
    });

    it('updateTrajectory: status transitions across green/amber/red as scores evolve', async () => {
      const visitId = '00000000-0000-0000-0000-0000000a0020';
      const guestId = '00000000-0000-0000-0000-0000000a0021';
      const propertyId = '00000000-0000-0000-0000-0000000a0022';
      await seedTrajectory(visitId, guestId, propertyId, 3);
      // entryScore=3, liftGoal=5

      // First reading: low → projected ≈ low → red
      const r1 = await seedReading(visitId, guestId, -0.5, -0.3, 3);
      const t1 = await trajectoryEngine.updateTrajectory(visitId, r1);
      expect(t1!.status).toBe('red');

      // Second reading: rising
      await new Promise((r) => setTimeout(r, 5));
      const r2 = await seedReading(visitId, guestId, 0.0, 0.2, 5);
      const t2 = await trajectoryEngine.updateTrajectory(visitId, r2);
      expect(t2!.readingCount).toBe(2);

      // Third reading: hits goal — slope is positive, projection >= goal → green
      await new Promise((r) => setTimeout(r, 5));
      const r3 = await seedReading(visitId, guestId, 0.5, 0.6, 7);
      const t3 = await trajectoryEngine.updateTrajectory(visitId, r3);
      expect(t3!.readingCount).toBe(3);
      expect(t3!.currentScore).toBe(7);
      expect(['green', 'amber']).toContain(t3!.status);
    });

    it('getTrajectory: returns null when not found', async () => {
      const result = await trajectoryEngine.getTrajectory('00000000-0000-0000-0000-0000000a9999');
      expect(result).toBeNull();
    });

    it('getTrajectory: returns the seeded trajectory in canonical shape', async () => {
      const visitId = '00000000-0000-0000-0000-0000000a0030';
      const guestId = '00000000-0000-0000-0000-0000000a0031';
      const propertyId = '00000000-0000-0000-0000-0000000a0032';
      await seedTrajectory(visitId, guestId, propertyId, 6);

      const result = await trajectoryEngine.getTrajectory(visitId);
      expect(result).not.toBeNull();
      expect(result!.visitId).toBe(visitId);
      expect(result!.guestId).toBe(guestId);
      expect(result!.propertyId).toBe(propertyId);
      expect(result!.entryScore).toBe(6);
      expect(result!.liftGoal).toBe(8);
      expect(result!.readingCount).toBe(0);
    });

    it('getFloorView: returns active visits only (excludes ended)', async () => {
      const propertyId = '00000000-0000-0000-0000-0000000a0040';
      const activeVisit = '00000000-0000-0000-0000-0000000a0041';
      const endedVisit = '00000000-0000-0000-0000-0000000a0042';

      await seedTrajectory(activeVisit, '00000000-0000-0000-0000-0000000a0043', propertyId, 6);
      await seedTrajectory(endedVisit, '00000000-0000-0000-0000-0000000a0044', propertyId, 5);
      // Mark second as ended
      await pool.query(
        `UPDATE resonance_trajectories SET ended_at = NOW() WHERE visit_id = $1`,
        [endedVisit],
      );

      const tiles = await trajectoryEngine.getFloorView(propertyId);
      const visitIds = tiles.map((t) => t.visitId);
      expect(visitIds).toContain(activeVisit);
      expect(visitIds).not.toContain(endedVisit);
    });

    it('getFloorView: integration-boundary fields (guestName/tableOrRoom/partySize) are empty defaults', async () => {
      const propertyId = '00000000-0000-0000-0000-0000000a0050';
      const visitId = '00000000-0000-0000-0000-0000000a0051';
      await seedTrajectory(visitId, '00000000-0000-0000-0000-0000000a0052', propertyId, 5);

      const tiles = await trajectoryEngine.getFloorView(propertyId);
      const tile = tiles.find((t) => t.visitId === visitId);
      expect(tile).toBeDefined();
      // These are Phase 1.5 integration boundaries (documented in file header)
      expect(tile!.guestName).toBe('');
      expect(tile!.tableOrRoom).toBe('');
      expect(tile!.partySize).toBe(0);
    });

    it('getFloorView: sparkline contains the visit\'s recent reading scores in time order', async () => {
      const propertyId = '00000000-0000-0000-0000-0000000a0060';
      const visitId = '00000000-0000-0000-0000-0000000a0061';
      const guestId = '00000000-0000-0000-0000-0000000a0062';
      await seedTrajectory(visitId, guestId, propertyId, 5);

      await seedReading(visitId, guestId, 0, 0, 5);
      await new Promise((r) => setTimeout(r, 5));
      await seedReading(visitId, guestId, 0.2, 0.3, 6);
      await new Promise((r) => setTimeout(r, 5));
      await seedReading(visitId, guestId, 0.4, 0.5, 7);

      const tiles = await trajectoryEngine.getFloorView(propertyId);
      const tile = tiles.find((t) => t.visitId === visitId);
      expect(tile).toBeDefined();
      expect(tile!.sparkline).toEqual([5, 6, 7]);
    });
  },
);
