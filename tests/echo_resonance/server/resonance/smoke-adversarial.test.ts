/**
 * ===========================================================================
 * Adversarial smoke test — try to break TICKET_003 services
 * ===========================================================================
 * Layer:    All Resonance + Signals
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Hostile inputs against every service we just built. The brigade
 *           rule William named: "break it, fix it, break it differently, fix
 *           it again." This file is the first pass.
 *
 *           Targets demo-blocking failure modes only:
 *             - tenet violations (load-bearing for the EDF sale)
 *             - state-machine corruption (intervention library demo path)
 *             - score math under garbage inputs (dashboard correctness)
 *             - quadrant boundary behavior (intervention candidate selection)
 *
 *           Cosmetic/theoretical issues skipped — demo runway is 13 days.
 *
 *   IMPORTANT: this file is intentionally provocative. If a smoke fails,
 *   the production service hardens; the test stays. If a smoke passes,
 *   the documented behavior is locked in by regression.
 * ===========================================================================
 */

import { describe, expect, it } from 'vitest';
import { scoreFromAffect, quadrantOf } from '../../../../client/lib/resonance/score';
import { computeExpiresAt } from '../../../../server/services/signals/signal-recorder';
import {
  statusFromLiftGap,
  computeSlope,
} from '../../../../server/services/echo-ai3/resonance/trajectory-engine';
import { resonanceEngine } from '../../../../server/services/echo-ai3/resonance/resonance-engine';
import { interventionLibrary } from '../../../../server/services/echo-ai3/resonance/intervention-library';

// =============================================================================
// scoreFromAffect — try to make the math lie
// =============================================================================

describe('SMOKE: scoreFromAffect under hostile inputs', () => {
  it('inverted ceiling/floor in config does not produce NaN or unbounded output', () => {
    // Caller passes ceiling < floor — buggy config but plausible.
    const result = scoreFromAffect(
      { arousal: 0.5, valence: 0.5 },
      { arousalWeight: 0.5, floor: 100, ceiling: 0 },
    );
    // Whatever the answer is, it should be a finite number.
    expect(Number.isFinite(result)).toBe(true);
  });

  it('arousalWeight outside [0, 1] does not throw, output is finite', () => {
    const r1 = scoreFromAffect(
      { arousal: 0.5, valence: -0.5 },
      { arousalWeight: 2, floor: 1, ceiling: 10 },
    );
    const r2 = scoreFromAffect(
      { arousal: 0.5, valence: -0.5 },
      { arousalWeight: -1, floor: 1, ceiling: 10 },
    );
    expect(Number.isFinite(r1)).toBe(true);
    expect(Number.isFinite(r2)).toBe(true);
  });

  it('zero-range config (floor === ceiling) returns the floor value', () => {
    const result = scoreFromAffect(
      { arousal: 0.7, valence: -0.3 },
      { arousalWeight: 0.4, floor: 5, ceiling: 5 },
    );
    expect(result).toBe(5);
  });

  it('extreme corners stay clamped to [floor, ceiling]', () => {
    // The four corners of the affect plane should not exceed the score range.
    const corners = [
      { arousal: 1, valence: 1 },
      { arousal: 1, valence: -1 },
      { arousal: -1, valence: 1 },
      { arousal: -1, valence: -1 },
    ];
    for (const affect of corners) {
      const score = scoreFromAffect(affect);
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(10);
    }
  });

  it('NaN arousal propagates to NaN output (documents the contract)', () => {
    // Routes are responsible for finite-input validation. We document the
    // current behavior: garbage in → NaN out, not a thrown error.
    const result = scoreFromAffect({ arousal: NaN, valence: 0 });
    expect(Number.isNaN(result)).toBe(true);
  });
});

// =============================================================================
// quadrantOf — boundary behavior at zero
// =============================================================================

describe('SMOKE: quadrantOf boundary behavior', () => {
  it('zero arousal counts as high (documented)', () => {
    expect(quadrantOf({ arousal: 0, valence: 0.5 })).toBe('high-pos');
    expect(quadrantOf({ arousal: 0, valence: -0.5 })).toBe('high-neg');
  });

  it('zero valence counts as positive (documented)', () => {
    expect(quadrantOf({ arousal: 0.5, valence: 0 })).toBe('high-pos');
    expect(quadrantOf({ arousal: -0.5, valence: 0 })).toBe('low-pos');
  });

  it('exact origin (0,0) is high-pos (documented tiebreaker)', () => {
    expect(quadrantOf({ arousal: 0, valence: 0 })).toBe('high-pos');
  });

  it('NaN coordinates fall through to low-neg (no exception thrown)', () => {
    // Documents current behavior. NaN >= 0 is false, so both branches go low.
    expect(quadrantOf({ arousal: NaN, valence: NaN })).toBe('low-neg');
  });
});

// =============================================================================
// computeExpiresAt — the Tenet 7 / 8 boundary
// =============================================================================

describe('SMOKE: computeExpiresAt boundary cases', () => {
  it('forbidden returns expiresAt strictly equal to base time', () => {
    const base = new Date('2026-05-06T12:00:00.000Z');
    const result = computeExpiresAt('forbidden', base);
    expect(result.getTime()).toBe(base.getTime());
  });

  it('forbidden row written then immediately compared to NOW() is expired', () => {
    // Tenet 8: forbidden rows are expired-on-creation and swept by next decay
    // tick. With clock granularity, the row's expires_at should never be in
    // the future relative to the moment the next decay tick runs.
    const base = new Date();
    const expiresAt = computeExpiresAt('forbidden', base);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('emotional gives exactly 30 days from base', () => {
    const base = new Date('2026-05-06T00:00:00.000Z');
    const result = computeExpiresAt('emotional', base);
    const expected = new Date('2026-06-05T00:00:00.000Z');
    expect(result.getTime()).toBe(expected.getTime());
  });

  it('public gives 5 years from base', () => {
    const base = new Date('2026-05-06T00:00:00.000Z');
    const result = computeExpiresAt('public', base);
    const days = (result.getTime() - base.getTime()) / 86_400_000;
    expect(days).toBe(365 * 5);
  });
});

// =============================================================================
// trajectory math — slope and status thresholds
// =============================================================================

describe('SMOKE: trajectory-engine pure math', () => {
  it('computeSlope on empty array returns 0', () => {
    expect(computeSlope([])).toBe(0);
  });

  it('computeSlope on single-element array returns 0', () => {
    expect(computeSlope([7])).toBe(0);
  });

  it('computeSlope on flat trajectory returns 0', () => {
    expect(computeSlope([5, 5, 5, 5])).toBe(0);
  });

  it('computeSlope on declining trajectory returns negative number', () => {
    // [8, 6, 4] over 2 steps: (4 - 8) / 2 = -2
    expect(computeSlope([8, 6, 4])).toBe(-2);
  });

  it('computeSlope on rising trajectory returns positive number', () => {
    // [3, 5, 7] over 2 steps: (7 - 3) / 2 = 2
    expect(computeSlope([3, 5, 7])).toBe(2);
  });

  it('statusFromLiftGap thresholds: green at 0, amber at 1, red at 1.001', () => {
    // Boundaries — matters for dashboard tile coloring.
    expect(statusFromLiftGap(-0.5)).toBe('green');
    expect(statusFromLiftGap(0)).toBe('green');
    expect(statusFromLiftGap(0.5)).toBe('amber');
    expect(statusFromLiftGap(1.0)).toBe('amber');
    expect(statusFromLiftGap(1.001)).toBe('red');
    expect(statusFromLiftGap(5)).toBe('red');
  });
});

// =============================================================================
// intervention-library — adversarial state machine
// =============================================================================

describe('SMOKE: intervention-library state-machine input validation', () => {
  // These run without DB — validation throws before SQL.
  const someId = '00000000-0000-0000-0000-0000000d0001';

  it('recordOutcome rejects -0.0001 (just below 0)', async () => {
    await expect(
      interventionLibrary.recordOutcome(someId, -0.0001, 5),
    ).rejects.toThrow(/outcomeScore must be in \[0, 1\]/);
  });

  it('recordOutcome rejects 1.0001 (just above 1)', async () => {
    await expect(
      interventionLibrary.recordOutcome(someId, 1.0001, 5),
    ).rejects.toThrow(/outcomeScore must be in \[0, 1\]/);
  });

  it('recordOutcome accepts exactly 0 and exactly 1 (will fail on missing row, not validation)', async () => {
    // Without a real DB the call fails on connection, but the validation
    // step should NOT fire for boundary values 0 and 1.
    const error = await interventionLibrary.recordOutcome(someId, 0, 5).catch((e) => e);
    expect(String(error)).not.toMatch(/outcomeScore must be in/);
    const error2 = await interventionLibrary.recordOutcome(someId, 1, 5).catch((e) => e);
    expect(String(error2)).not.toMatch(/outcomeScore must be in/);
  });

  it('recordOutcome rejects -Infinity outcomeScore', async () => {
    await expect(
      interventionLibrary.recordOutcome(someId, -Infinity, 5),
    ).rejects.toThrow(/outcomeScore must be in \[0, 1\]/);
  });

  it('recordOutcome rejects Infinity postReading', async () => {
    await expect(
      interventionLibrary.recordOutcome(someId, 0.5, Infinity),
    ).rejects.toThrow(/postReading must be finite/);
  });

  it('recordExecution rejects NaN preReading', async () => {
    await expect(
      interventionLibrary.recordExecution(someId, NaN),
    ).rejects.toThrow(/preReading must be finite/);
  });
});

// =============================================================================
// resonance-engine — module-structure smoke against hostile imports
// =============================================================================

describe('SMOKE: resonance-engine surface area', () => {
  it('every exported method exists and is callable', () => {
    // If a future refactor accidentally removed a method, this catches it.
    const methods: (keyof typeof resonanceEngine)[] = [
      'createReading',
      'getRecentReadings',
      'scoreFromAffect',
    ];
    for (const m of methods) {
      expect(typeof resonanceEngine[m]).toBe('function');
    }
  });

  it('intervention-library exports the full state machine', () => {
    const methods: (keyof typeof interventionLibrary)[] = [
      'findCandidates',
      'recordProposal',
      'recordApproval',
      'recordExecution',
      'recordSkip',
      'recordOutcome',
      'listTemplates',
    ];
    for (const m of methods) {
      expect(typeof interventionLibrary[m]).toBe('function');
    }
  });
});
