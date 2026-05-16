/**
 * ===========================================================================
 * Gap finder — empty time in the Living Plan
 * ===========================================================================
 * Layer:    Voyage
 * Status:   IMPLEMENTED
 * Phase:    2
 *
 * Purpose:  Per master doc §6.4: finds gaps in a Living Plan worth filling.
 *           First half of the gap-fill flow; suggestion-ranker is the
 *           second half.
 *
 *           Phase 2: minimum-size detection (60 min default), classifies
 *           gaps by daypart, computes a buffer estimate. Phase 2.x extends
 *           with sleep/rest window subtraction and travel-time-aware
 *           buffers between adjacent blocks.
 *
 * Aligned to: shared/types/voyage/plan.ts (LivingPlan)
 *
 * WARNING: Pure-function logic exposed via class facade matches the
 * existing stub API. The class wraps a deterministic `findGaps` core
 * for ease of testing.
 * ===========================================================================
 */

import type { LivingPlan, PlanBlock } from '../../../../shared/types/voyage';
import type { UUID, ISODateTime } from '../../../../shared/types/base';

export interface Gap {
  tripId: UUID;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  durationMinutes: number;
  classification: 'short-break' | 'meal-window' | 'afternoon' | 'evening' | 'morning';
  /** Travel time consumed by surrounding blocks. Phase 2 placeholder = 0. */
  bufferMinutes: number;
}

const MS_PER_MIN = 60_000;

/**
 * Pure helper. Sorts blocks, walks pairwise, returns gaps that meet the
 * minimum-duration threshold. Exported for direct testing.
 */
export function findGapsCore(args: {
  tripId: UUID;
  blocks: PlanBlock[];
  windowStart: ISODateTime;
  windowEnd: ISODateTime;
  minimumGapMinutes?: number;
}): Gap[] {
  const minMs = (args.minimumGapMinutes ?? 60) * MS_PER_MIN;
  const windowStartMs = new Date(args.windowStart).getTime();
  const windowEndMs = new Date(args.windowEnd).getTime();
  if (windowEndMs <= windowStartMs) return [];

  if (args.blocks.length === 0) {
    const duration = windowEndMs - windowStartMs;
    if (duration < minMs) return [];
    return [
      {
        tripId: args.tripId,
        startsAt: args.windowStart,
        endsAt: args.windowEnd,
        durationMinutes: Math.floor(duration / MS_PER_MIN),
        classification: classifyGap(args.windowStart, duration / MS_PER_MIN),
        bufferMinutes: 0,
      },
    ];
  }

  const occupied = args.blocks
    .map((b) => ({
      start: Math.max(new Date(b.startsAt).getTime(), windowStartMs),
      end: Math.min(new Date(b.endsAt).getTime(), windowEndMs),
    }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);

  if (occupied.length === 0) {
    return [
      {
        tripId: args.tripId,
        startsAt: args.windowStart,
        endsAt: args.windowEnd,
        durationMinutes: Math.floor((windowEndMs - windowStartMs) / MS_PER_MIN),
        classification: classifyGap(args.windowStart, (windowEndMs - windowStartMs) / MS_PER_MIN),
        bufferMinutes: 0,
      },
    ];
  }

  // Merge overlapping blocks
  const merged: Array<{ start: number; end: number }> = [];
  for (const b of occupied) {
    const last = merged[merged.length - 1];
    if (last && b.start <= last.end) {
      last.end = Math.max(last.end, b.end);
    } else {
      merged.push({ ...b });
    }
  }

  const gaps: Gap[] = [];

  // Leading gap
  if (merged[0].start - windowStartMs >= minMs) {
    const dur = merged[0].start - windowStartMs;
    gaps.push({
      tripId: args.tripId,
      startsAt: args.windowStart,
      endsAt: new Date(merged[0].start).toISOString(),
      durationMinutes: Math.floor(dur / MS_PER_MIN),
      classification: classifyGap(args.windowStart, dur / MS_PER_MIN),
      bufferMinutes: 0,
    });
  }

  // Inter-block gaps
  for (let i = 0; i < merged.length - 1; i++) {
    const gapMs = merged[i + 1].start - merged[i].end;
    if (gapMs >= minMs) {
      const startsAt = new Date(merged[i].end).toISOString();
      gaps.push({
        tripId: args.tripId,
        startsAt,
        endsAt: new Date(merged[i + 1].start).toISOString(),
        durationMinutes: Math.floor(gapMs / MS_PER_MIN),
        classification: classifyGap(startsAt, gapMs / MS_PER_MIN),
        bufferMinutes: 0,
      });
    }
  }

  // Trailing gap
  const last = merged[merged.length - 1];
  if (windowEndMs - last.end >= minMs) {
    const dur = windowEndMs - last.end;
    const startsAt = new Date(last.end).toISOString();
    gaps.push({
      tripId: args.tripId,
      startsAt,
      endsAt: args.windowEnd,
      durationMinutes: Math.floor(dur / MS_PER_MIN),
      classification: classifyGap(startsAt, dur / MS_PER_MIN),
      bufferMinutes: 0,
    });
  }

  return gaps;
}

/**
 * Classify a gap by its starting time + duration.
 * Exported for testing.
 */
export function classifyGap(
  startsAtIso: ISODateTime,
  durationMinutes: number,
): Gap['classification'] {
  if (durationMinutes < 90) return 'short-break';
  const hour = new Date(startsAtIso).getHours();
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'meal-window';
  if (hour >= 14 && hour < 18) return 'afternoon';
  return 'evening';
}

export class GapFinder {
  /**
   * Find all gap candidates in a plan within a time window.
   * Window starts at the earliest block's start (or now) and extends
   * `withinHours` ahead.
   */
  async findGaps(plan: LivingPlan, withinHours = 48): Promise<Gap[]> {
    const now = Date.now();
    const earliestBlockMs = plan.blocks
      .map((b) => new Date(b.startsAt).getTime())
      .reduce((min, t) => Math.min(min, t), Infinity);
    const windowStartMs =
      Number.isFinite(earliestBlockMs) ? Math.min(earliestBlockMs, now) : now;
    const windowEndMs = windowStartMs + withinHours * 3_600_000;

    return findGapsCore({
      tripId: plan.tripId,
      blocks: plan.blocks,
      windowStart: new Date(windowStartMs).toISOString(),
      windowEnd: new Date(windowEndMs).toISOString(),
      minimumGapMinutes: 60,
    });
  }
}

export const gapFinder = new GapFinder();
