/**
 * ===========================================================================
 * Score math — pure client-side helpers
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Pure functions for converting an affect coordinate (arousal,
 *           valence) into a 1-10 Inn-style resonance score, plus the
 *           quadrant classifier used by the intervention library to choose
 *           an intervention pattern.
 *
 *           The math here MUST stay identical to
 *           server/services/echo-ai3/resonance/resonance-engine.ts's
 *           scoreFromAffect(). A cross-file unit test in
 *           tests/echo_resonance/server/resonance/score-parity.test.ts
 *           asserts they agree across a sample grid; if either side drifts,
 *           that test fails immediately.
 *
 * Aligned to: shared/types/resonance/reading.ts (AffectCoordinate)
 *             shared/types/resonance/score.ts (ScoreConfig, DEFAULT_SCORE_CONFIG)
 *
 * Pending implementation:
 *   - [x] scoreFromAffect — weighted arousal+valence linearly mapped to floor..ceiling
 *   - [x] quadrantOf — affect quadrant label (high-pos / high-neg / low-pos / low-neg)
 *   - [DEFERRED] non-linear mapping (e.g., logistic) — Phase 1 uses the
 *         simplest mapping that satisfies monotonicity; tunable later via
 *         ScoreConfig without breaking callers
 *
 * WARNING: This is the canonical client-side score math. The server-side
 * resonance-engine.scoreFromAffect must produce IDENTICAL numbers for the
 * same inputs. Modifications require updating both sides + the parity test.
 * ===========================================================================
 */

import type { AffectCoordinate, ScoreConfig } from '../../../shared/types/resonance';
import { DEFAULT_SCORE_CONFIG } from '../../../shared/types/resonance/score';

export type AffectQuadrant = 'high-pos' | 'high-neg' | 'low-pos' | 'low-neg';

/**
 * Convert an affect coordinate to a 1-10 Inn-style score.
 *
 * Math: weighted blend of arousal and valence (each in -1..+1), linearly
 * mapped to the score range [floor..ceiling]. arousalWeight in config
 * determines how much arousal contributes (default 0.4); valence gets
 * the remainder (default 0.6).
 *
 * Result is clamped to [floor, ceiling] for safety against ill-formed config.
 */
export function scoreFromAffect(
  affect: AffectCoordinate,
  config: ScoreConfig = DEFAULT_SCORE_CONFIG,
): number {
  const { arousalWeight, floor, ceiling } = config;
  const valenceWeight = 1 - arousalWeight;
  const combined = arousalWeight * affect.arousal + valenceWeight * affect.valence;
  const range = ceiling - floor;
  const raw = floor + ((combined + 1) / 2) * range;
  return Math.max(floor, Math.min(ceiling, raw));
}

/**
 * Classify an affect coordinate into one of four quadrants. Used by the
 * intervention library to select an intervention pattern.
 *
 * Convention: zero arousal is treated as high-arousal; zero valence is
 * treated as positive. Tiebreaker is arbitrary but consistent.
 */
export function quadrantOf(affect: AffectCoordinate): AffectQuadrant {
  const high = affect.arousal >= 0;
  const positive = affect.valence >= 0;
  if (high && positive) return 'high-pos';
  if (high && !positive) return 'high-neg';
  if (!high && positive) return 'low-pos';
  return 'low-neg';
}
