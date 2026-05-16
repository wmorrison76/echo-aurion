/**
 * ===========================================================================
 * Resonance types — public exports
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Canonical type exports for the resonance layer. Five concerns:
 *
 *           reading.ts      — ResonanceReading + AffectCoordinate (the atomic
 *                             unit of emotional intelligence)
 *           trajectory.ts   — ResonanceTrajectory + TrajectoryTile + status
 *                             (the GM dashboard's data shape)
 *           intervention.ts — InterventionTemplate + InterventionExecution +
 *                             AffectQuadrant + state-machine enums
 *           forecast.ts     — Pre-arrival forecast types (Phase 2 surface)
 *           score.ts        — ScoreConfig + DEFAULT_SCORE_CONFIG (the math's
 *                             contract; the math itself lives in
 *                             client/lib/resonance/score.ts and is mirrored
 *                             server-side via re-export)
 *
 *           Tenet 3 enforcement: this barrel is on the forbidden-imports
 *           list for commerce modules — every type here is tone-bearing.
 * ===========================================================================
 */

export * from './reading';
export * from './trajectory';
export * from './intervention';
export * from './forecast';
export * from './score';
