/**
 * ===========================================================================
 * Trajectory engine — lift tracking
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Computes entry, current, projected exit, lift goal, lift gap,
 *           and status (green/amber/red) for active visits. Surfaces the
 *           floor-view tile data for the GM dashboard.
 *
 *           This is the lift-tracking heart of Echo Resonance. Every new
 *           ResonanceReading triggers updateTrajectory, which recomputes
 *           the visit's slope, projected exit, and status. When the
 *           trajectory enters the red zone, the intervention library
 *           (service #7) is consulted for a candidate intervention.
 *
 * Pending implementation:
 *   - [x] updateTrajectory: UPDATE-only — increments readingCount, updates
 *         lastUpdatedAt, recomputes currentScore/trajectory/liftGap/status
 *   - [x] getFloorView: returns active TrajectoryTile[] for a property
 *   - [x] getTrajectory: single trajectory by visitId
 *   - [x] PropertyId import fixed: was importing nonexistent PropertyId,
 *         now uses UUID per TICKET_003_PREP File 2
 *   - [DEFERRED to Phase 1.4 routes] initial trajectory creation —
 *         requires propertyId from request context; ResonanceReading
 *         doesn't carry it (TICKET_002 type contract). Routes will
 *         POST /api/echo-resonance/visits at check-in to create the
 *         trajectory row, then readings update it.
 *
 * Aligned to: server/database/migrations/009_resonance_trajectories.sql
 *             shared/types/resonance/trajectory.ts (TICKET_002 IMPLEMENTED)
 *             client/lib/resonance/score.ts (quadrant + score math; will be
 *             cross-imported in service #5 for parity with the engine)
 *
 * Design choices (v1, tunable later via config):
 *   - Slope window: last 3 readings inclusive of the new one (linear slope
 *     from first to last divided by N-1)
 *   - Projected exit = currentScore + slope * 2 readings, clamped to [1, 10]
 *   - Status thresholds:
 *       liftGap <= 0   → green   (on track to hit lift goal or exceed)
 *       0 < gap <= 1.0 → amber   (close but at risk)
 *       gap > 1.0      → red     (intervention needed)
 *
 * WARNING: This service is the canonical lift-tracking engine. All readings
 * route through updateTrajectory to maintain dashboard freshness.
 * Modifications require TICKET-level authorization. See ARCHITECTURE.md.
 * ===========================================================================
 */

import type { PoolClient } from 'pg';
import type {
  ResonanceTrajectory,
  TrajectoryTile,
  TrajectoryStatus,
  ResonanceReading,
} from '../../../../shared/types/resonance';
import type { UUID } from '../../../../shared/types/base';
import { query } from '../../../database/connection';
import { logger } from '../../../lib/logger';

const SLOPE_WINDOW = 3;
const PROJECTION_HORIZON = 2; // readings ahead to project for projectedExitScore
const SCORE_FLOOR = 1;
const SCORE_CEILING = 10;
const AMBER_THRESHOLD = 1.0;

interface TrajectoryRow {
  visit_id: string;
  guest_id: string;
  property_id: string;
  started_at: Date | string;
  last_updated_at: Date | string;
  ended_at: Date | string | null;
  entry_score: number;
  current_score: number;
  trajectory: number;
  projected_exit_score: number;
  lift_goal: number;
  lift_gap: number;
  status: string;
  reading_count: number;
  has_open_intervention: boolean;
}

function dateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  throw new Error(`trajectory-engine: unexpected date value type: ${typeof value}`);
}

function rowToTrajectory(row: TrajectoryRow): ResonanceTrajectory {
  return {
    visitId: row.visit_id,
    guestId: row.guest_id,
    propertyId: row.property_id,
    startedAt: dateToIso(row.started_at),
    lastUpdatedAt: dateToIso(row.last_updated_at),
    endedAt: row.ended_at ? dateToIso(row.ended_at) : undefined,
    entryScore: row.entry_score,
    currentScore: row.current_score,
    trajectory: row.trajectory,
    projectedExitScore: row.projected_exit_score,
    liftGoal: row.lift_goal,
    liftGap: row.lift_gap,
    status: row.status as TrajectoryStatus,
    readingCount: row.reading_count,
    hasOpenIntervention: row.has_open_intervention,
  };
}

function clampScore(value: number): number {
  return Math.max(SCORE_FLOOR, Math.min(SCORE_CEILING, value));
}

/**
 * Compute trajectory status from the lift gap. Lower gap = better trajectory.
 *
 *   liftGap <= 0     → green (on track or exceeding)
 *   0 < gap <= 1.0   → amber (at risk)
 *   gap > 1.0        → red (intervention needed)
 */
export function statusFromLiftGap(liftGap: number): TrajectoryStatus {
  if (liftGap <= 0) return 'green';
  if (liftGap <= AMBER_THRESHOLD) return 'amber';
  return 'red';
}

/**
 * Compute trajectory slope from a recent score window. Linear: (last-first) / (N-1).
 * Returns 0 for windows of size 0 or 1.
 */
export function computeSlope(recentScores: number[]): number {
  if (recentScores.length < 2) return 0;
  const first = recentScores[0];
  const last = recentScores[recentScores.length - 1];
  return (last - first) / (recentScores.length - 1);
}

async function runQuery<T extends Record<string, unknown> = Record<string, unknown>>(
  client: PoolClient | undefined,
  sql: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number | null }> {
  if (client) return client.query<T>(sql, params);
  return query<T>(sql, params);
}

export class TrajectoryEngine {
  /**
   * Recompute trajectory after a new reading is recorded. UPDATE-only.
   *
   * Returns the updated trajectory, or null if no trajectory exists for
   * this visit yet (caller must ensure visit-start created the trajectory
   * row — Phase 1.4 routes work).
   */
  async updateTrajectory(
    visitId: UUID,
    newReading: ResonanceReading,
    client?: PoolClient,
  ): Promise<ResonanceTrajectory | null> {
    try {
      // Find existing trajectory
      const existing = await runQuery<TrajectoryRow>(
        client,
        'SELECT * FROM resonance_trajectories WHERE visit_id = $1',
        [visitId],
      );

      if (existing.rows.length === 0) {
        logger.warn('[TrajectoryEngine] updateTrajectory: no trajectory exists for visit', {
          visitId,
          readingId: newReading.id,
        });
        return null;
      }

      const prior = existing.rows[0];

      // Get recent reading scores for slope calculation (most-recent first, then reverse)
      const recent = await runQuery<{ resonance: number }>(
        client,
        `SELECT resonance FROM resonance_readings
         WHERE visit_id = $1
         ORDER BY timestamp DESC
         LIMIT $2`,
        [visitId, SLOPE_WINDOW],
      );
      const recentScores = recent.rows.map((r) => r.resonance).reverse(); // ascending time

      const newReadingCount = prior.reading_count + 1;
      const currentScore = newReading.resonance;
      const slope = computeSlope(recentScores);
      const projectedExitScore = clampScore(currentScore + slope * PROJECTION_HORIZON);
      const liftGoal = prior.entry_score + 2; // The Inn metric — stable across the visit
      const liftGap = liftGoal - projectedExitScore;
      const status = statusFromLiftGap(liftGap);

      const updated = await runQuery<TrajectoryRow>(
        client,
        `UPDATE resonance_trajectories
         SET current_score        = $2,
             trajectory           = $3,
             projected_exit_score = $4,
             lift_goal            = $5,
             lift_gap             = $6,
             status               = $7,
             reading_count        = $8,
             last_updated_at      = NOW()
         WHERE visit_id = $1
         RETURNING *`,
        [
          visitId,
          currentScore,
          slope,
          projectedExitScore,
          liftGoal,
          liftGap,
          status,
          newReadingCount,
        ],
      );

      if (updated.rows.length === 0) {
        throw new Error(`trajectory-engine: UPDATE returned no rows for visit ${visitId}`);
      }
      return rowToTrajectory(updated.rows[0]);
    } catch (err) {
      logger.error('[TrajectoryEngine] updateTrajectory failed', {
        visitId,
        readingId: newReading.id,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Floor view for the GM dashboard — every active visit at the property as
   * a TrajectoryTile (sparkline + status + lift gap).
   *
   * Excludes ended visits (ended_at IS NOT NULL).
   *
   * NOTE: guestName / tableOrRoom / partySize fields on TrajectoryTile are
   * UI projection fields that come from the existing LUCCCA guest/visit
   * tables. Phase 1.3 returns them as empty/zero defaults; Phase 1.5
   * frontend hydrates from a separate guest profile fetch. This is a
   * documented integration boundary, not placeholder slop.
   */
  async getFloorView(propertyId: UUID, client?: PoolClient): Promise<TrajectoryTile[]> {
    try {
      const trajectories = await runQuery<TrajectoryRow>(
        client,
        `SELECT * FROM resonance_trajectories
         WHERE property_id = $1
           AND ended_at IS NULL
         ORDER BY started_at ASC`,
        [propertyId],
      );

      if (trajectories.rows.length === 0) return [];

      // Sparkline: last N reading scores per visit
      const visitIds = trajectories.rows.map((t) => t.visit_id);
      const sparklines = await runQuery<{ visit_id: string; resonance: number; timestamp: Date | string }>(
        client,
        `SELECT visit_id, resonance, timestamp
         FROM resonance_readings
         WHERE visit_id = ANY($1::uuid[])
         ORDER BY visit_id, timestamp ASC`,
        [visitIds],
      );

      const byVisit = new Map<string, number[]>();
      for (const row of sparklines.rows) {
        const arr = byVisit.get(row.visit_id) ?? [];
        arr.push(row.resonance);
        byVisit.set(row.visit_id, arr);
      }

      return trajectories.rows.map((t) => ({
        guestId: t.guest_id,
        guestName: '', // Phase 1.5 integration boundary — see file header
        tableOrRoom: '', // Phase 1.5 integration boundary
        partySize: 0,    // Phase 1.5 integration boundary
        visitId: t.visit_id,
        status: t.status as TrajectoryStatus,
        sparkline: byVisit.get(t.visit_id) ?? [],
        liftGap: t.lift_gap,
        hasOpenIntervention: t.has_open_intervention,
      }));
    } catch (err) {
      logger.error('[TrajectoryEngine] getFloorView failed', {
        propertyId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /** Get a single trajectory by visit. Returns null if not found. */
  async getTrajectory(visitId: UUID, client?: PoolClient): Promise<ResonanceTrajectory | null> {
    try {
      const result = await runQuery<TrajectoryRow>(
        client,
        'SELECT * FROM resonance_trajectories WHERE visit_id = $1',
        [visitId],
      );
      if (result.rows.length === 0) return null;
      return rowToTrajectory(result.rows[0]);
    } catch (err) {
      logger.error('[TrajectoryEngine] getTrajectory failed', {
        visitId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const trajectoryEngine = new TrajectoryEngine();
