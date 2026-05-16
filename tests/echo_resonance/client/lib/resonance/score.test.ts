/**
 * ===========================================================================
 * client/lib/resonance/score tests
 * ===========================================================================
 * Layer:    Resonance (test mirror of client/lib/resonance/score.ts)
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Pure-function tests for scoreFromAffect() and quadrantOf().
 *           No DB, no async — the score math runs entirely in-memory and
 *           is environment-agnostic (no React, no DOM).
 *
 *           Server-vs-client parity is enforced separately in
 *           tests/echo_resonance/server/resonance/score-parity.test.ts.
 * ===========================================================================
 */

import { describe, expect, it } from 'vitest';
import { scoreFromAffect, quadrantOf } from '../../../../../client/lib/resonance/score';
import { DEFAULT_SCORE_CONFIG } from '../../../../../shared/types/resonance/score';

describe('client/lib/resonance/score — scoreFromAffect (pure)', () => {
  it('neutral affect (0,0) maps to the center of the score range', () => {
    // With default config (floor=1, ceiling=10): center = 1 + 9/2 = 5.5
    expect(scoreFromAffect({ arousal: 0, valence: 0 })).toBeCloseTo(5.5, 6);
  });

  it('maximum affect (+1,+1) maps to the ceiling', () => {
    expect(scoreFromAffect({ arousal: 1, valence: 1 })).toBe(10);
  });

  it('minimum affect (-1,-1) maps to the floor', () => {
    expect(scoreFromAffect({ arousal: -1, valence: -1 })).toBe(1);
  });

  it('respects arousalWeight: at default 0.4, valence dominates', () => {
    // arousal=+1, valence=-1 → combined = 0.4*1 + 0.6*(-1) = -0.2
    // raw = 1 + ((-0.2 + 1) / 2) * 9 = 1 + 0.4*9 = 4.6
    expect(scoreFromAffect({ arousal: 1, valence: -1 })).toBeCloseTo(4.6, 6);
  });

  it('respects custom config: ceiling and floor are honored', () => {
    const config = { arousalWeight: 0.5, floor: 0, ceiling: 100 };
    expect(scoreFromAffect({ arousal: 0, valence: 0 }, config)).toBeCloseTo(50, 6);
    expect(scoreFromAffect({ arousal: 1, valence: 1 }, config)).toBe(100);
    expect(scoreFromAffect({ arousal: -1, valence: -1 }, config)).toBe(0);
  });

  it('is monotonic in valence at fixed arousal', () => {
    const a = scoreFromAffect({ arousal: 0, valence: -0.5 });
    const b = scoreFromAffect({ arousal: 0, valence: 0 });
    const c = scoreFromAffect({ arousal: 0, valence: 0.5 });
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it('is monotonic in arousal at fixed valence', () => {
    const a = scoreFromAffect({ arousal: -0.5, valence: 0 });
    const b = scoreFromAffect({ arousal: 0, valence: 0 });
    const c = scoreFromAffect({ arousal: 0.5, valence: 0 });
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it('clamps results outside [floor, ceiling] (defensive)', () => {
    // Construct a pathological config where the linear formula could exceed
    // the range; clamp must catch it.
    const evil = { arousalWeight: 2, floor: 1, ceiling: 10 };
    const result = scoreFromAffect({ arousal: 1, valence: 1 }, evil);
    expect(result).toBeLessThanOrEqual(10);
    expect(result).toBeGreaterThanOrEqual(1);
  });

  it('is pure: same input → same output across calls', () => {
    const input = { arousal: 0.3, valence: -0.7 };
    const a = scoreFromAffect(input);
    const b = scoreFromAffect(input);
    const c = scoreFromAffect(input, DEFAULT_SCORE_CONFIG);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

describe('client/lib/resonance/score — quadrantOf (pure)', () => {
  it('high-pos: positive arousal + positive valence', () => {
    expect(quadrantOf({ arousal: 0.5, valence: 0.5 })).toBe('high-pos');
  });

  it('high-neg: positive arousal + negative valence (frustrated/anxious)', () => {
    expect(quadrantOf({ arousal: 0.7, valence: -0.5 })).toBe('high-neg');
  });

  it('low-pos: negative arousal + positive valence (content/peaceful)', () => {
    expect(quadrantOf({ arousal: -0.6, valence: 0.4 })).toBe('low-pos');
  });

  it('low-neg: negative arousal + negative valence (sad/withdrawn)', () => {
    expect(quadrantOf({ arousal: -0.4, valence: -0.4 })).toBe('low-neg');
  });

  it('zero boundaries: zero arousal is high-side; zero valence is positive', () => {
    expect(quadrantOf({ arousal: 0, valence: 0 })).toBe('high-pos');
    expect(quadrantOf({ arousal: 0, valence: -0.1 })).toBe('high-neg');
    expect(quadrantOf({ arousal: -0.1, valence: 0 })).toBe('low-pos');
  });

  it('extremes map to expected quadrants', () => {
    expect(quadrantOf({ arousal: 1, valence: 1 })).toBe('high-pos');
    expect(quadrantOf({ arousal: 1, valence: -1 })).toBe('high-neg');
    expect(quadrantOf({ arousal: -1, valence: 1 })).toBe('low-pos');
    expect(quadrantOf({ arousal: -1, valence: -1 })).toBe('low-neg');
  });
});
