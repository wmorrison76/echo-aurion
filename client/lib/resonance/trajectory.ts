/**
 * ===========================================================================
 * Trajectory client-side helpers
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Pure functions the dashboard uses to derive presentation state
 *           from a trajectory or a sparkline. The math here MUST agree with
 *           server/services/echo-ai3/resonance/trajectory-engine.ts.
 *
 * Aligned to: server trajectory-engine.computeSlope and
 *             server trajectory-engine.statusFromLiftGap (same thresholds:
 *             green liftGap <= 0; amber <= 1.0; red > 1.0).
 *
 *   Why duplicate the math here?
 *     - Server tells the truth via TrajectoryTile.status / .liftGap; the
 *       client receives those values directly. So 99% of the time these
 *       helpers are redundant.
 *     - But: drill-down components that fetch raw readings and want to
 *       render a "what would the status be at this snapshot" view need
 *       client-side recomputation. These helpers serve that case.
 *     - The parity test in tests/echo_resonance/server/resonance/
 *       smoke-adversarial.test.ts verifies the thresholds match.
 * ===========================================================================
 */

import type { ResonanceTrajectory, TrajectoryStatus } from '../../../shared/types/resonance';

const AMBER_THRESHOLD = 1.0;
const SCORE_FLOOR = 1;
const SCORE_CEILING = 10;

/**
 * Linear slope from a recent score window. (last - first) / (N-1).
 * Returns 0 for windows of 0 or 1 elements.
 *
 * Mirrors server trajectory-engine.computeSlope.
 */
export function computeSlope(scores: number[]): number {
  if (scores.length < 2) return 0;
  const first = scores[0];
  const last = scores[scores.length - 1];
  return (last - first) / (scores.length - 1);
}

/**
 * Project the exit score from the trajectory's current state. Mirrors the
 * server's PROJECTION_HORIZON = 2 (readings ahead) and clamps to [1, 10].
 */
export function projectExit(trajectory: ResonanceTrajectory): number {
  const PROJECTION_HORIZON = 2;
  const raw = trajectory.currentScore + trajectory.trajectory * PROJECTION_HORIZON;
  return Math.max(SCORE_FLOOR, Math.min(SCORE_CEILING, raw));
}

/**
 * Status from the trajectory's lift gap. Mirrors server statusFromLiftGap.
 *
 *   liftGap <= 0          → green
 *   0 < liftGap <= 1.0    → amber
 *   liftGap > 1.0         → red
 */
export function statusFromTrajectory(trajectory: ResonanceTrajectory): TrajectoryStatus {
  const gap = trajectory.liftGap;
  if (gap <= 0) return 'green';
  if (gap <= AMBER_THRESHOLD) return 'amber';
  return 'red';
}

/**
 * Build SVG-friendly point pairs for a sparkline given a series of scores
 * and a target box. Returns a polyline points string (e.g. "0,10 10,5 20,7").
 *
 * The points are normalized so:
 *   - x: evenly spaced across [0, width]
 *   - y: 0 at the top of the box (= score 10), height at the bottom (= score 1)
 */
export function sparklinePoints(
  scores: number[],
  box: { width: number; height: number },
): string {
  if (scores.length === 0) return '';
  if (scores.length === 1) {
    const y = scoreToY(scores[0], box.height);
    return `0,${y} ${box.width},${y}`;
  }
  return scores
    .map((s, i) => {
      const x = (i * box.width) / (scores.length - 1);
      const y = scoreToY(s, box.height);
      return `${x},${y}`;
    })
    .join(' ');
}

function scoreToY(score: number, height: number): number {
  const clamped = Math.max(SCORE_FLOOR, Math.min(SCORE_CEILING, score));
  // 10 maps to 0 (top); 1 maps to height (bottom).
  return ((SCORE_CEILING - clamped) / (SCORE_CEILING - SCORE_FLOOR)) * height;
}

/**
 * Tailwind class fragment for a status. Centralized so every component uses
 * the same color scheme. The /15 alpha is the project's existing convention
 * for status backgrounds.
 */
export function statusClasses(status: TrajectoryStatus): {
  text: string;
  bg: string;
  ring: string;
  stroke: string;
} {
  switch (status) {
    case 'green':
      return {
        text: 'text-emerald-700 dark:text-emerald-300',
        bg: 'bg-emerald-500/15',
        ring: 'ring-emerald-500/30',
        stroke: 'stroke-emerald-500',
      };
    case 'amber':
      return {
        text: 'text-amber-700 dark:text-amber-300',
        bg: 'bg-amber-400/15',
        ring: 'ring-amber-500/30',
        stroke: 'stroke-amber-500',
      };
    case 'red':
      return {
        text: 'text-rose-700 dark:text-rose-300',
        bg: 'bg-rose-500/15',
        ring: 'ring-rose-500/30',
        stroke: 'stroke-rose-500',
      };
  }
}

/** Status label as a short string for accessibility / chip rendering. */
export function statusLabel(status: TrajectoryStatus): string {
  switch (status) {
    case 'green':
      return 'on track';
    case 'amber':
      return 'at risk';
    case 'red':
      return 'needs care';
  }
}
