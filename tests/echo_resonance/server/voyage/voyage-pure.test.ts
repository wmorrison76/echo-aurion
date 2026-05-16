/**
 * ===========================================================================
 * Voyage pure-function tests
 * ===========================================================================
 * Layer:    Voyage
 * Status:   IMPLEMENTED
 * Phase:    2
 *
 * Purpose:  Lock the math + thresholds for the pure helpers in Voyage:
 *             - composeFromTemplate (brief-engine)
 *             - findGapsCore + classifyGap (gap-finder)
 *             - scoreCandidate (suggestion-ranker)
 *
 *           DB-touching surface (trip-engine.createFromBooking,
 *           briefEngine.composeBrief, plan-engine state transitions) is
 *           DB-gated and gets coverage when DATABASE_URL_TEST lands.
 *           These tests are the floor — pure logic, no IO.
 * ===========================================================================
 */

import { describe, expect, it } from 'vitest';
import {
  composeFromTemplate,
} from '../../../../server/services/echo-ai3/voyage/brief-engine';
import {
  findGapsCore,
  classifyGap,
} from '../../../../server/services/echo-ai3/voyage/gap-finder';
import {
  scoreCandidate,
  type SuggestionCandidate,
} from '../../../../server/services/echo-ai3/voyage/suggestion-ranker';
import type { Gap } from '../../../../server/services/echo-ai3/voyage/gap-finder';
import type { PlanBlock } from '../../../../shared/types/voyage';

// =============================================================================
// brief-engine.composeFromTemplate
// =============================================================================

describe('composeFromTemplate (brief-engine)', () => {
  it('produces 2 paragraphs + a soft call-to-action by default', () => {
    const result = composeFromTemplate({
      arrivalIso: '2026-05-09T14:00:00.000Z',
      departureIso: '2026-05-12T11:00:00.000Z',
      partySize: 2,
      purpose: 'leisure',
    });
    expect(result.paragraphs.length).toBe(2);
    expect(result.callToAction).toContain('only if you want them');
  });

  it('addresses guest by name when guestNameHint is provided', () => {
    const result = composeFromTemplate({
      guestNameHint: 'Mr. Henderson',
      arrivalIso: '2026-05-09T14:00:00.000Z',
      departureIso: '2026-05-10T11:00:00.000Z',
      partySize: 2,
      purpose: 'anniversary' as never,
    });
    expect(result.paragraphs[0]).toContain('Welcome, Mr. Henderson');
  });

  it('honors purpose-specific phrasing for corporate', () => {
    const result = composeFromTemplate({
      arrivalIso: '2026-05-09T14:00:00.000Z',
      departureIso: '2026-05-12T11:00:00.000Z',
      partySize: 1,
      purpose: 'corporate',
    });
    expect(result.paragraphs[0]).toContain('around the conference schedule');
  });

  it('honors purpose-specific phrasing for wellness', () => {
    const result = composeFromTemplate({
      arrivalIso: '2026-05-09T14:00:00.000Z',
      departureIso: '2026-05-12T11:00:00.000Z',
      partySize: 1,
      purpose: 'wellness',
    });
    expect(result.paragraphs[0]).toContain('slow down');
  });

  it('produces "stay for one" / "stay for two" / "stay for N"', () => {
    expect(
      composeFromTemplate({
        arrivalIso: '2026-05-09T14:00:00.000Z',
        departureIso: '2026-05-10T11:00:00.000Z',
        partySize: 1,
        purpose: 'leisure',
      }).paragraphs[0],
    ).toContain('a stay for one');
    expect(
      composeFromTemplate({
        arrivalIso: '2026-05-09T14:00:00.000Z',
        departureIso: '2026-05-10T11:00:00.000Z',
        partySize: 5,
        purpose: 'leisure',
      }).paragraphs[0],
    ).toContain('a stay for 5');
  });

  it('rounds nights correctly across a 3-night arc', () => {
    const result = composeFromTemplate({
      arrivalIso: '2026-05-09T14:00:00.000Z',
      departureIso: '2026-05-12T11:00:00.000Z',
      partySize: 2,
      purpose: 'leisure',
    });
    expect(result.paragraphs[1]).toContain('3-night plan');
  });

  it('never asks the guest a question (Tenet 1)', () => {
    const result = composeFromTemplate({
      arrivalIso: '2026-05-09T14:00:00.000Z',
      departureIso: '2026-05-12T11:00:00.000Z',
      partySize: 2,
      purpose: 'leisure',
    });
    const allText = [...result.paragraphs, result.callToAction].join(' ');
    expect(allText).not.toContain('?');
  });
});

// =============================================================================
// gap-finder.findGapsCore + classifyGap
// =============================================================================

const tripId = '11111111-2222-3333-4444-555555555555';

function block(over: Partial<PlanBlock>): PlanBlock {
  return {
    id: 'aaaaaaaa-0000-0000-0000-000000000001',
    tripId,
    class: 'confirmed',
    kind: 'meal',
    startsAt: '2026-05-09T18:00:00.000Z',
    endsAt: '2026-05-09T19:30:00.000Z',
    title: 'Dinner',
    source: 'guest',
    proposedAt: '2026-05-09T00:00:00.000Z',
    ...over,
  };
}

describe('findGapsCore (gap-finder)', () => {
  const windowStart = '2026-05-09T08:00:00.000Z';
  const windowEnd = '2026-05-09T22:00:00.000Z';

  it('empty plan → one gap = the whole window', () => {
    const gaps = findGapsCore({ tripId, blocks: [], windowStart, windowEnd });
    expect(gaps.length).toBe(1);
    expect(gaps[0].startsAt).toBe(windowStart);
    expect(gaps[0].endsAt).toBe(windowEnd);
    expect(gaps[0].durationMinutes).toBe(14 * 60);
  });

  it('one block in middle → two gaps (leading + trailing)', () => {
    const gaps = findGapsCore({
      tripId,
      blocks: [block({})],
      windowStart,
      windowEnd,
    });
    expect(gaps.length).toBe(2);
    expect(gaps[0].endsAt).toBe('2026-05-09T18:00:00.000Z');
    expect(gaps[1].startsAt).toBe('2026-05-09T19:30:00.000Z');
  });

  it('overlapping blocks merge into one occupied span', () => {
    const blocks = [
      block({
        id: 'aaaaaaaa-0000-0000-0000-000000000001',
        startsAt: '2026-05-09T12:00:00.000Z',
        endsAt: '2026-05-09T14:00:00.000Z',
      }),
      block({
        id: 'aaaaaaaa-0000-0000-0000-000000000002',
        startsAt: '2026-05-09T13:00:00.000Z',
        endsAt: '2026-05-09T15:30:00.000Z',
      }),
    ];
    const gaps = findGapsCore({ tripId, blocks, windowStart, windowEnd });
    // Should produce: 08:00-12:00 leading; 15:30-22:00 trailing
    expect(gaps.length).toBe(2);
    expect(gaps[1].startsAt).toBe('2026-05-09T15:30:00.000Z');
  });

  it('gaps below threshold are filtered out', () => {
    // 30-min gap below default 60-min threshold
    const blocks = [
      block({
        id: 'aaaaaaaa-0000-0000-0000-000000000001',
        startsAt: '2026-05-09T12:00:00.000Z',
        endsAt: '2026-05-09T13:00:00.000Z',
      }),
      block({
        id: 'aaaaaaaa-0000-0000-0000-000000000002',
        startsAt: '2026-05-09T13:30:00.000Z',
        endsAt: '2026-05-09T15:00:00.000Z',
      }),
    ];
    const gaps = findGapsCore({ tripId, blocks, windowStart, windowEnd });
    // 13:00-13:30 is 30min — should be excluded
    const innerGap = gaps.find(
      (g) => g.startsAt === '2026-05-09T13:00:00.000Z',
    );
    expect(innerGap).toBeUndefined();
  });

  it('blocks outside the window are excluded', () => {
    const blocks = [
      block({
        startsAt: '2026-05-09T05:00:00.000Z',
        endsAt: '2026-05-09T06:00:00.000Z', // entirely before window
      }),
    ];
    const gaps = findGapsCore({ tripId, blocks, windowStart, windowEnd });
    // Window is empty of blocks → one big gap
    expect(gaps.length).toBe(1);
    expect(gaps[0].durationMinutes).toBe(14 * 60);
  });

  it('classifyGap produces short-break for sub-90-min gaps', () => {
    expect(classifyGap('2026-05-09T14:00:00.000Z', 75)).toBe('short-break');
  });

  it('classifyGap by daypart at 09:00 = morning', () => {
    expect(classifyGap('2026-05-09T09:00:00', 120)).toBe('morning');
  });

  it('classifyGap at 12:00 = meal-window', () => {
    expect(classifyGap('2026-05-09T12:00:00', 120)).toBe('meal-window');
  });

  it('classifyGap at 15:00 = afternoon', () => {
    expect(classifyGap('2026-05-09T15:00:00', 120)).toBe('afternoon');
  });

  it('classifyGap at 19:00 = evening', () => {
    expect(classifyGap('2026-05-09T19:00:00', 120)).toBe('evening');
  });
});

// =============================================================================
// suggestion-ranker.scoreCandidate
// =============================================================================

const exampleGap: Gap = {
  tripId,
  startsAt: '2026-05-09T15:00:00.000Z',
  endsAt: '2026-05-09T17:00:00.000Z',
  durationMinutes: 120,
  classification: 'afternoon',
  bufferMinutes: 0,
};

function candidate(over: Partial<SuggestionCandidate> = {}): SuggestionCandidate {
  return {
    venueId: 'bbbbbbbb-0000-0000-0000-000000000001',
    category: 'spa',
    estimatedDurationMinutes: 90,
    affinity: 0.8,
    energyFit: 0.9,
    capacityAvailable: true,
    travelMinutes: 5,
    isSurprise: false,
    fitsAllPartyMembers: true,
    name: 'Spa session',
    ...over,
  };
}

describe('scoreCandidate (suggestion-ranker)', () => {
  it('strong candidate (high affinity + energy + capacity) scores > 0.85', () => {
    const r = scoreCandidate(candidate(), exampleGap);
    expect(r.score).toBeGreaterThan(0.85);
  });

  it('candidate with capacity unavailable is penalized but not zeroed', () => {
    const a = scoreCandidate(candidate(), exampleGap);
    const b = scoreCandidate(candidate({ capacityAvailable: false }), exampleGap);
    expect(b.score).toBeLessThan(a.score);
    expect(b.score).toBeGreaterThan(0); // still surfaced, just ranked lower
  });

  it('diversity penalty: already-suggested category lowers score', () => {
    const a = scoreCandidate(candidate(), exampleGap, {
      alreadySuggestedCategories: [],
    });
    const b = scoreCandidate(candidate(), exampleGap, {
      alreadySuggestedCategories: ['spa'],
    });
    expect(b.score).toBeLessThan(a.score);
  });

  it('surprise budget: stretch suggestions degrade as budget burns', () => {
    const c = candidate({ isSurprise: true });
    const fresh = scoreCandidate(c, exampleGap, { surpriseBudgetUsed: 0 });
    const halfUsed = scoreCandidate(c, exampleGap, { surpriseBudgetUsed: 1 });
    const spent = scoreCandidate(c, exampleGap, { surpriseBudgetUsed: 2 });
    expect(fresh.score).toBeGreaterThan(halfUsed.score);
    expect(halfUsed.score).toBeGreaterThan(spent.score);
  });

  it('non-surprise candidates ignore budget consumption', () => {
    const c = candidate({ isSurprise: false });
    const a = scoreCandidate(c, exampleGap, { surpriseBudgetUsed: 0 });
    const b = scoreCandidate(c, exampleGap, { surpriseBudgetUsed: 5 });
    expect(a.score).toBe(b.score);
  });

  it('companion harmony violation multiplies score by 0.7 on the axis', () => {
    const a = scoreCandidate(candidate(), exampleGap);
    const b = scoreCandidate(candidate({ fitsAllPartyMembers: false }), exampleGap);
    expect(b.factors.companionHarmony).toBe(0.7);
    expect(a.factors.companionHarmony).toBe(1);
  });

  it('schedule fit: travel exceeds half the gap → minimum schedule score', () => {
    const c = candidate({ travelMinutes: 70 }); // > 60 min half-gap
    const r = scoreCandidate(c, exampleGap);
    expect(r.factors.scheduleFit).toBeLessThanOrEqual(0.1);
  });

  it('all axes always in [0, 1]', () => {
    const r = scoreCandidate(candidate(), exampleGap);
    Object.values(r.factors).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it('NaN inputs are coerced to 0 (defensive)', () => {
    const c = candidate({ affinity: NaN, energyFit: NaN });
    const r = scoreCandidate(c, exampleGap);
    expect(Number.isFinite(r.score)).toBe(true);
  });
});
