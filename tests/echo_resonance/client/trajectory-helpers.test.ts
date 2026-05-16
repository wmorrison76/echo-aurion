/**
 * ===========================================================================
 * Client trajectory helpers — pure-math + color contract tests
 * ===========================================================================
 * Layer:    Resonance (client)
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Locks the math + color/label contract for the dashboard's pure
 *           helpers. Server-side parity is verified separately by
 *           tests/echo_resonance/server/resonance/smoke-adversarial.test.ts
 *           — the thresholds match.
 * ===========================================================================
 */

import { describe, expect, it } from 'vitest';
import {
  computeSlope,
  projectExit,
  sparklinePoints,
  statusFromTrajectory,
  statusClasses,
  statusLabel,
} from '../../../client/lib/resonance/trajectory';
import type { ResonanceTrajectory } from '../../../shared/types/resonance';

function makeTrajectory(over: Partial<ResonanceTrajectory> = {}): ResonanceTrajectory {
  return {
    visitId: 'v',
    guestId: 'g',
    propertyId: 'p',
    startedAt: '2026-05-06T00:00:00.000Z',
    lastUpdatedAt: '2026-05-06T01:00:00.000Z',
    entryScore: 5,
    currentScore: 5,
    trajectory: 0,
    projectedExitScore: 5,
    liftGoal: 7,
    liftGap: 2,
    status: 'red',
    readingCount: 1,
    hasOpenIntervention: false,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// computeSlope
// ---------------------------------------------------------------------------

describe('client trajectory.computeSlope', () => {
  it('empty array → 0', () => {
    expect(computeSlope([])).toBe(0);
  });

  it('single element → 0', () => {
    expect(computeSlope([7])).toBe(0);
  });

  it('flat sequence → 0', () => {
    expect(computeSlope([5, 5, 5])).toBe(0);
  });

  it('rising sequence → positive', () => {
    expect(computeSlope([3, 5, 7])).toBe(2);
  });

  it('declining sequence → negative', () => {
    expect(computeSlope([8, 6, 4])).toBe(-2);
  });
});

// ---------------------------------------------------------------------------
// projectExit
// ---------------------------------------------------------------------------

describe('client trajectory.projectExit', () => {
  it('flat trajectory projects to current', () => {
    const t = makeTrajectory({ currentScore: 6, trajectory: 0 });
    expect(projectExit(t)).toBe(6);
  });

  it('rising trajectory projects upward (+2 readings horizon)', () => {
    const t = makeTrajectory({ currentScore: 5, trajectory: 1 });
    expect(projectExit(t)).toBe(7); // 5 + 1*2
  });

  it('clamps to ceiling 10', () => {
    const t = makeTrajectory({ currentScore: 9, trajectory: 5 });
    expect(projectExit(t)).toBe(10);
  });

  it('clamps to floor 1', () => {
    const t = makeTrajectory({ currentScore: 2, trajectory: -5 });
    expect(projectExit(t)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// statusFromTrajectory — must match server thresholds
// ---------------------------------------------------------------------------

describe('client trajectory.statusFromTrajectory thresholds', () => {
  it('liftGap = -0.5 → green', () => {
    expect(statusFromTrajectory(makeTrajectory({ liftGap: -0.5 }))).toBe('green');
  });

  it('liftGap = 0 → green (boundary inclusive)', () => {
    expect(statusFromTrajectory(makeTrajectory({ liftGap: 0 }))).toBe('green');
  });

  it('liftGap = 0.5 → amber', () => {
    expect(statusFromTrajectory(makeTrajectory({ liftGap: 0.5 }))).toBe('amber');
  });

  it('liftGap = 1.0 → amber (boundary inclusive)', () => {
    expect(statusFromTrajectory(makeTrajectory({ liftGap: 1.0 }))).toBe('amber');
  });

  it('liftGap = 1.001 → red', () => {
    expect(statusFromTrajectory(makeTrajectory({ liftGap: 1.001 }))).toBe('red');
  });

  it('liftGap = 5 → red', () => {
    expect(statusFromTrajectory(makeTrajectory({ liftGap: 5 }))).toBe('red');
  });
});

// ---------------------------------------------------------------------------
// sparklinePoints
// ---------------------------------------------------------------------------

describe('client trajectory.sparklinePoints', () => {
  const box = { width: 100, height: 50 };

  it('empty array → empty string', () => {
    expect(sparklinePoints([], box)).toBe('');
  });

  it('single value spans the full width at constant y (midpoint of 1-10 scale is 5.5)', () => {
    // The 1-10 scale is 9 units wide; the midpoint is 5.5, not 5.
    // For a value of 5.5 in a 50px-tall box, y = (10-5.5)/9 * 50 = 25.
    const result = sparklinePoints([5.5], box);
    expect(result).toBe('0,25 100,25');
  });

  it('two values at scale extremes produce top/bottom points', () => {
    const result = sparklinePoints([1, 10], box);
    // score=1 → y=50 (bottom); score=10 → y=0 (top)
    expect(result).toBe('0,50 100,0');
  });

  it('clamps out-of-range scores', () => {
    const result = sparklinePoints([0, 11], box);
    // 0 clamps to 1 → bottom; 11 clamps to 10 → top
    expect(result).toBe('0,50 100,0');
  });

  it('three values are evenly distributed across width', () => {
    const result = sparklinePoints([5.5, 5.5, 5.5], box);
    // 5.5 is the midpoint → y=25 for all; x at 0, 50, 100
    expect(result).toBe('0,25 50,25 100,25');
  });
});

// ---------------------------------------------------------------------------
// statusClasses & statusLabel — color and label contract
// ---------------------------------------------------------------------------

describe('client trajectory.statusClasses', () => {
  it('green uses emerald palette', () => {
    const c = statusClasses('green');
    expect(c.text).toMatch(/emerald/);
    expect(c.bg).toMatch(/emerald/);
    expect(c.stroke).toMatch(/emerald/);
  });

  it('amber uses amber palette', () => {
    const c = statusClasses('amber');
    expect(c.text).toMatch(/amber/);
    expect(c.bg).toMatch(/amber/);
    expect(c.stroke).toMatch(/amber/);
  });

  it('red uses rose palette', () => {
    const c = statusClasses('red');
    expect(c.text).toMatch(/rose/);
    expect(c.bg).toMatch(/rose/);
    expect(c.stroke).toMatch(/rose/);
  });
});

describe('client trajectory.statusLabel', () => {
  it('green → "on track"', () => {
    expect(statusLabel('green')).toBe('on track');
  });

  it('amber → "at risk"', () => {
    expect(statusLabel('amber')).toBe('at risk');
  });

  it('red → "needs care"', () => {
    expect(statusLabel('red')).toBe('needs care');
  });
});
