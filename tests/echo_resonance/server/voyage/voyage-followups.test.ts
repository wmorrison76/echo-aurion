/**
 * ===========================================================================
 * Voyage follow-ups — pure-function tests
 * ===========================================================================
 * Layer:    Voyage
 * Status:   IMPLEMENTED
 * Phase:    2
 *
 * Purpose:  Pure-function coverage for the four Phase 2 follow-up services:
 *             - affinity-engine: decayFactor, categorizeSignal,
 *               computeAffinityFromSignals
 *             - unconverted-ask-tracker: aggregateUnconvertedAsks
 *             - map-engine: composeVoiceNote
 *             - corporate-orchestrator: parseICal
 *
 *           DB-touching paths are gated by existing DATABASE_URL_TEST
 *           skip semantics via signal-query / planEngine integration tests.
 * ===========================================================================
 */

import { describe, expect, it } from 'vitest';
import {
  computeAffinityFromSignals,
  categorizeSignal,
  decayFactor,
} from '../../../../server/services/echo-ai3/voyage/affinity-engine';
import { aggregateUnconvertedAsks } from '../../../../server/services/echo-ai3/voyage/unconverted-ask-tracker';
import { composeVoiceNote } from '../../../../server/services/echo-ai3/voyage/map-engine';
import { parseICal } from '../../../../server/services/echo-ai3/voyage/corporate-orchestrator';
import type { Signal, SignalSource } from '../../../../shared/types/signals';

const guestId = '11111111-2222-3333-4444-555555555555';

function signal(over: Partial<Signal> = {}): Signal {
  return {
    id: 'aaaaaaaa-1111-1111-1111-111111111111',
    guestId,
    visitId: null,
    timestamp: '2026-05-09T18:00:00.000Z',
    source: 'voyage-tap' as SignalSource,
    subject: { kind: 'venue', venueId: 'bbbbbbbb-1111-1111-1111-111111111111' },
    tags: [],
    conversion: null,
    sensitivity: 'preference',
    expiresAt: '2027-05-09T18:00:00.000Z',
    createdAt: '2026-05-09T18:00:00.000Z',
    ...over,
  };
}

// =============================================================================
// affinity-engine
// =============================================================================

describe('affinity-engine: decayFactor', () => {
  it('weight at 0 days = 1', () => {
    expect(decayFactor(0)).toBe(1);
  });

  it('weight at 90 days = 0.5 (half-life)', () => {
    expect(decayFactor(90 * 86_400_000)).toBeCloseTo(0.5, 5);
  });

  it('weight at 180 days = 0.25', () => {
    expect(decayFactor(180 * 86_400_000)).toBeCloseTo(0.25, 5);
  });

  it('negative ages clamped to 1 (no future-dating boost)', () => {
    expect(decayFactor(-1000)).toBe(1);
  });
});

describe('affinity-engine: categorizeSignal', () => {
  it('venue subject → venue', () => {
    expect(categorizeSignal(signal({ subject: { kind: 'venue', venueId: 'x' } }))).toBe('venue');
  });

  it('amenity subject → amenity', () => {
    expect(categorizeSignal(signal({ subject: { kind: 'amenity', amenityId: 'x' } }))).toBe('amenity');
  });

  it('occasion subject → occasionType', () => {
    expect(
      categorizeSignal(signal({ subject: { kind: 'occasion', occasionType: 'anniversary' } })),
    ).toBe('anniversary');
  });

  it('staff-member subject → null (no preference axis)', () => {
    expect(categorizeSignal(signal({ subject: { kind: 'staff-member', staffId: 'x' } }))).toBeNull();
  });

  it('time-slot subject → null', () => {
    expect(
      categorizeSignal(
        signal({ subject: { kind: 'time-slot', start: 'a', end: 'b' } as never }),
      ),
    ).toBeNull();
  });

  it('free-text subject pulls category from tags when present', () => {
    const s = signal({
      subject: { kind: 'free-text', text: 'note' },
      tags: [{ kind: 'category', value: 'spa' }],
    });
    expect(categorizeSignal(s)).toBe('spa');
  });
});

describe('affinity-engine: computeAffinityFromSignals', () => {
  const now = new Date('2026-05-10T00:00:00.000Z');

  it('empty signals → empty scores', () => {
    expect(computeAffinityFromSignals(guestId, [], now)).toEqual([]);
  });

  it('single positive signal produces a score > 0.5', () => {
    const result = computeAffinityFromSignals(
      guestId,
      [
        signal({
          source: 'voyage-add-to-itinerary',
          subject: { kind: 'venue', venueId: 'x' },
          timestamp: '2026-05-09T00:00:00.000Z',
        }),
      ],
      now,
    );
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('venue');
    expect(result[0].score).toBeGreaterThan(0.5);
    expect(result[0].signalCount).toBe(1);
  });

  it('a dismiss signal lowers score below 0.5', () => {
    const result = computeAffinityFromSignals(
      guestId,
      [
        signal({
          source: 'voyage-dismiss',
          subject: { kind: 'venue', venueId: 'x' },
        }),
      ],
      now,
    );
    expect(result[0].score).toBeLessThan(0.5);
  });

  it('mixed positive + negative balances toward middle', () => {
    const result = computeAffinityFromSignals(
      guestId,
      [
        signal({ source: 'voyage-tap', subject: { kind: 'venue', venueId: 'x' } }),
        signal({ source: 'voyage-dismiss', subject: { kind: 'venue', venueId: 'x' } }),
      ],
      now,
    );
    expect(result[0].score).toBeGreaterThan(0.4);
    expect(result[0].score).toBeLessThan(0.6);
  });

  it('older signals contribute less than recent ones (decay)', () => {
    const result = computeAffinityFromSignals(
      guestId,
      [
        signal({
          source: 'voyage-add-to-itinerary',
          subject: { kind: 'venue', venueId: 'x' },
          timestamp: '2026-05-09T00:00:00.000Z', // recent
        }),
        signal({
          source: 'voyage-dismiss',
          subject: { kind: 'venue', venueId: 'x' },
          timestamp: '2025-08-09T00:00:00.000Z', // 9 months old, ~0.5 decay
        }),
      ],
      now,
    );
    // Recent strong-positive should dominate over old negative
    expect(result[0].score).toBeGreaterThan(0.6);
  });

  it('signals from non-weighted sources are ignored', () => {
    const result = computeAffinityFromSignals(
      guestId,
      [
        signal({
          source: 'staff-whisper',
          subject: { kind: 'venue', venueId: 'x' },
        }),
      ],
      now,
    );
    expect(result).toEqual([]);
  });

  it('multiple categories produce multiple rows sorted by score DESC', () => {
    const result = computeAffinityFromSignals(
      guestId,
      [
        signal({
          source: 'voyage-add-to-itinerary',
          subject: { kind: 'amenity', amenityId: 'a' },
        }),
        signal({
          source: 'voyage-tap',
          subject: { kind: 'venue', venueId: 'v' },
        }),
      ],
      now,
    );
    expect(result.length).toBe(2);
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
  });
});

// =============================================================================
// unconverted-ask-tracker: aggregateUnconvertedAsks
// =============================================================================

interface MockSignalRow {
  source: string;
  subject: { kind?: string; venueId?: string; amenityId?: string; menuItemId?: string; occasionType?: string; staffId?: string; text?: string } | null;
  guest_id: string;
  visit_id: string | null;
  timestamp: Date | string;
  conversion: string | null;
}

function row(over: Partial<MockSignalRow>): MockSignalRow {
  return {
    source: 'voyage-tap',
    subject: { kind: 'venue', venueId: 'v1' },
    guest_id: 'guest',
    visit_id: 'visit',
    timestamp: '2026-05-09T18:00:00.000Z',
    conversion: null,
    ...over,
  };
}

describe('unconverted-ask-tracker: aggregateUnconvertedAsks', () => {
  it('empty input → empty output', () => {
    expect(aggregateUnconvertedAsks([])).toEqual([]);
  });

  it('aggregates by (kind, subject id)', () => {
    const result = aggregateUnconvertedAsks([
      row({ subject: { kind: 'venue', venueId: 'v1' } }),
      row({ subject: { kind: 'venue', venueId: 'v1' } }),
      row({ subject: { kind: 'venue', venueId: 'v2' } }),
    ]);
    expect(result).toHaveLength(2);
    const v1 = result.find((r) => r.subjectId === 'v1');
    expect(v1?.consideredCount).toBe(2);
  });

  it('excludes converted signals', () => {
    const result = aggregateUnconvertedAsks([
      row({ conversion: 'converted' }),
      row({ conversion: null }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].consideredCount).toBe(1);
  });

  it('excludes non-consideration sources', () => {
    const result = aggregateUnconvertedAsks([
      row({ source: 'staff-whisper' }),
      row({ source: 'voyage-tap' }),
    ]);
    expect(result).toHaveLength(1);
  });

  it('returns sorted by consideredCount DESC', () => {
    const result = aggregateUnconvertedAsks([
      row({ subject: { kind: 'venue', venueId: 'v1' } }),
      row({ subject: { kind: 'venue', venueId: 'v2' } }),
      row({ subject: { kind: 'venue', venueId: 'v2' } }),
      row({ subject: { kind: 'venue', venueId: 'v2' } }),
    ]);
    expect(result[0].subjectId).toBe('v2');
    expect(result[0].consideredCount).toBe(3);
    expect(result[1].subjectId).toBe('v1');
  });

  it('lastConsideredAt = max timestamp seen for that subject', () => {
    const result = aggregateUnconvertedAsks([
      row({
        subject: { kind: 'venue', venueId: 'v1' },
        timestamp: '2026-05-08T10:00:00.000Z',
      }),
      row({
        subject: { kind: 'venue', venueId: 'v1' },
        timestamp: '2026-05-09T18:00:00.000Z',
      }),
    ]);
    expect(result[0].lastConsideredAt).toBe('2026-05-09T18:00:00.000Z');
  });
});

// =============================================================================
// map-engine: composeVoiceNote
// =============================================================================

describe('map-engine: composeVoiceNote', () => {
  it('dining template references the chef', () => {
    expect(composeVoiceNote('dining', 5)).toContain('chef');
  });

  it('spa template references quiet hours', () => {
    expect(composeVoiceNote('spa', 5)).toContain('quiet hours');
  });

  it('null walking minutes → "on the property"', () => {
    expect(composeVoiceNote('dining', null)).toContain('on the property');
  });

  it('< 5 minutes → "N min walk"', () => {
    expect(composeVoiceNote('dining', 3)).toContain('3 min walk');
  });

  it('< 15 minutes → "N min on foot"', () => {
    expect(composeVoiceNote('dining', 10)).toContain('10 min on foot');
  });

  it('>= 15 minutes → "short ride or a long walk"', () => {
    expect(composeVoiceNote('dining', 20)).toContain('short ride or a long walk');
  });

  it('unknown category falls back to dining template', () => {
    expect(composeVoiceNote('not-a-real-category', 5)).toContain('chef');
  });
});

// =============================================================================
// corporate-orchestrator: parseICal
// =============================================================================

describe('corporate-orchestrator: parseICal', () => {
  it('empty payload → empty events', () => {
    expect(parseICal('')).toEqual([]);
  });

  it('parses a single VEVENT with summary, dtstart, dtend', () => {
    const ical = `BEGIN:VEVENT
SUMMARY:Opening keynote
DTSTART:20260509T140000Z
DTEND:20260509T153000Z
END:VEVENT`;
    const result = parseICal(ical);
    expect(result).toHaveLength(1);
    expect(result[0].summary).toBe('Opening keynote');
    expect(result[0].startsAt).toBe('2026-05-09T14:00:00.000Z');
    expect(result[0].endsAt).toBe('2026-05-09T15:30:00.000Z');
  });

  it('detects mandatory keyword in summary', () => {
    const ical = `BEGIN:VEVENT
SUMMARY:Opening keynote
DTSTART:20260509T140000Z
DTEND:20260509T153000Z
END:VEVENT`;
    expect(parseICal(ical)[0].isMandatory).toBe(true);
  });

  it('honors X-MANDATORY:true', () => {
    const ical = `BEGIN:VEVENT
SUMMARY:Workshop A
DTSTART:20260509T100000Z
DTEND:20260509T120000Z
X-MANDATORY:true
END:VEVENT`;
    expect(parseICal(ical)[0].isMandatory).toBe(true);
  });

  it('honors X-CATERING:true', () => {
    const ical = `BEGIN:VEVENT
SUMMARY:Lunch break
DTSTART:20260509T120000Z
DTEND:20260509T130000Z
X-CATERING:true
END:VEVENT`;
    expect(parseICal(ical)[0].cateringProvided).toBe(true);
  });

  it('parses multiple VEVENTS', () => {
    const ical = `BEGIN:VEVENT
SUMMARY:Session A
DTSTART:20260509T090000Z
DTEND:20260509T100000Z
END:VEVENT
BEGIN:VEVENT
SUMMARY:Session B
DTSTART:20260509T110000Z
DTEND:20260509T120000Z
END:VEVENT`;
    const result = parseICal(ical);
    expect(result).toHaveLength(2);
    expect(result[0].summary).toBe('Session A');
    expect(result[1].summary).toBe('Session B');
  });

  it('skips incomplete VEVENTs gracefully', () => {
    const ical = `BEGIN:VEVENT
SUMMARY:Incomplete
END:VEVENT
BEGIN:VEVENT
SUMMARY:Complete
DTSTART:20260509T090000Z
DTEND:20260509T100000Z
END:VEVENT`;
    const result = parseICal(ical);
    expect(result).toHaveLength(1);
    expect(result[0].summary).toBe('Complete');
  });

  it('handles CRLF line endings', () => {
    const ical = `BEGIN:VEVENT\r\nSUMMARY:Test\r\nDTSTART:20260509T090000Z\r\nDTEND:20260509T100000Z\r\nEND:VEVENT`;
    expect(parseICal(ical)).toHaveLength(1);
  });

  it('throws on malformed dates', () => {
    const ical = `BEGIN:VEVENT
SUMMARY:Bad
DTSTART:not-a-date
DTEND:20260509T100000Z
END:VEVENT`;
    expect(() => parseICal(ical)).toThrow(/cannot parse iCal date/);
  });
});
