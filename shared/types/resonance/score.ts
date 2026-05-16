/**
 * ===========================================================================
 * Score config and computation type
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Config for converting AffectCoordinate to 1-10 Inn-style score.
 *
 * WARNING: This is the canonical type contract for the resonance score config and computation type.
 * Modifications require TICKET-level authorization. See ARCHITECTURE.md.
 * ===========================================================================
 */

import type { AffectCoordinate } from './reading';

export interface ScoreConfig {
  arousalWeight: number;
  floor: number;
  ceiling: number;
}

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  arousalWeight: 0.4,
  floor: 1,
  ceiling: 10,
};

export type ScoreComputeFn = (a: AffectCoordinate, c?: ScoreConfig) => number;
