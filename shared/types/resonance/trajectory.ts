/**
 * ===========================================================================
 * Trajectory - lift-tracking time-series during a visit
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  The lift-tracking data model. Computes entry, current, projected exit, lift goal, lift gap.
 *
 * Aligned to: server/database/migrations/009_resonance_trajectories.sql
 *
 * WARNING: This is the canonical type contract for ResonanceTrajectory - the lift-tracking time-series.
 * Modifications require TICKET-level authorization. See ARCHITECTURE.md.
 * ===========================================================================
 */

import type { UUID, ISODate } from '../base';

export type TrajectoryStatus = 'green' | 'amber' | 'red';

export interface ResonanceTrajectory {
  visitId: UUID;                        // SQL PRIMARY KEY
  guestId: UUID;
  propertyId: UUID;                     // SQL NOT NULL

  startedAt: ISODate;
  lastUpdatedAt: ISODate;
  endedAt?: ISODate;                    // temporal: visit will end (null while in-progress)

  entryScore: number;
  currentScore: number;
  trajectory: number;                   // SQL DEFAULT 0
  projectedExitScore: number;
  liftGoal: number;                     // entryScore + 2 (the Inn metric)
  liftGap: number;
  status: TrajectoryStatus;

  readingCount: number;                 // SQL INT NOT NULL DEFAULT 0
  hasOpenIntervention: boolean;         // SQL BOOLEAN NOT NULL DEFAULT false
}

/**
 * UI projection type for the trajectory floor view tile.
 * Composed by the floor-view query joining resonance_trajectories with
 * guest profile data and recent reading scores. Not a row type.
 */
export interface TrajectoryTile {
  guestId: UUID;
  guestName: string;
  tableOrRoom: string;
  partySize: number;
  visitId: UUID;
  status: TrajectoryStatus;
  sparkline: number[];                  // recent reading scores
  liftGap: number;
  hasOpenIntervention: boolean;
}
