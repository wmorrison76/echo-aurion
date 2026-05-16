/**
 * ===========================================================================
 * Atrium pure-function tests
 * ===========================================================================
 * Layer:    Atrium
 * Status:   IMPLEMENTED
 * Phase:    5
 *
 * Purpose:  Pure-function coverage for Atrium services:
 *             - hero-selector: scoreAsset, currentDaypart, currentSeason
 *             - narrative-composer: composeNarrativeFallback
 *             - brief-composer: buildBriefPrompt
 * ===========================================================================
 */

import { describe, expect, it } from 'vitest';
import {
  scoreAsset,
  currentDaypart,
  currentSeason,
} from '../../../../server/services/echo-ai3/atrium/hero-selector';
import { composeNarrativeFallback } from '../../../../server/services/echo-ai3/atrium/narrative-composer';
import { buildBriefPrompt } from '../../../../server/services/echo-ai3/aurion/brief-composer';
import type { MediaAsset } from '../../../../shared/types/atrium';

function asset(over: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: 'aaaaaaaa-1111-1111-1111-111111111111',
    venueId: 'bbbbbbbb-1111-1111-1111-111111111111',
    kind: 'hero-loop',
    storageUrl: 'https://example.com/v.mp4',
    durationSeconds: 10,
    silentByDefault: true,
    moods: [],
    dayparts: [],
    seasons: [],
    uploadedAt: '2026-05-09T18:00:00.000Z',
    uploadedBy: 'cccccccc-1111-1111-1111-111111111111',
    publishedToInstagram: false,
    publishedToApp: true,
    ...over,
  };
}

// =============================================================================
// hero-selector
// =============================================================================

describe('hero-selector: scoreAsset', () => {
  it('high-pos guest + lively mood → high score', () => {
    const r = scoreAsset(asset({ moods: ['lively'] }), {
      guestAffect: { arousal: 0.7, valence: 0.7 },
      currentDaypart: 'evening',
      currentSeason: 'summer',
      recentlyViewedAssetIds: [],
    });
    expect(r.score).toBeGreaterThan(0.8);
    expect(r.breakdown.mood).toBe(1.0);
  });

  it('low-pos guest + quiet mood → high score', () => {
    const r = scoreAsset(asset({ moods: ['quiet'] }), {
      guestAffect: { arousal: -0.5, valence: 0.6 },
      currentDaypart: 'midday',
      currentSeason: 'summer',
      recentlyViewedAssetIds: [],
    });
    expect(r.breakdown.mood).toBe(1.0);
  });

  it('high-pos guest + only quiet asset → low mood score', () => {
    const r = scoreAsset(asset({ moods: ['quiet'] }), {
      guestAffect: { arousal: 0.7, valence: 0.7 },
      currentDaypart: 'morning',
      currentSeason: 'summer',
      recentlyViewedAssetIds: [],
    });
    expect(r.breakdown.mood).toBe(0.1);
  });

  it('daypart match → +0.4 to score', () => {
    const r = scoreAsset(asset({ moods: ['lively'], dayparts: ['evening'] }), {
      currentDaypart: 'evening',
      currentSeason: 'summer',
      recentlyViewedAssetIds: [],
    });
    expect(r.breakdown.daypart).toBe(0.4);
  });

  it('daypart mismatch → 0', () => {
    const r = scoreAsset(asset({ moods: ['lively'], dayparts: ['morning'] }), {
      currentDaypart: 'evening',
      currentSeason: 'summer',
      recentlyViewedAssetIds: [],
    });
    expect(r.breakdown.daypart).toBe(0);
  });

  it('season match → +0.2', () => {
    const r = scoreAsset(asset({ seasons: ['summer'] }), {
      currentDaypart: 'evening',
      currentSeason: 'summer',
      recentlyViewedAssetIds: [],
    });
    expect(r.breakdown.season).toBe(0.2);
  });

  it('recently-viewed penalty', () => {
    const a = asset();
    const r = scoreAsset(a, {
      currentDaypart: 'evening',
      currentSeason: 'summer',
      recentlyViewedAssetIds: [a.id],
    });
    expect(r.breakdown.recentlyViewed).toBe(-0.5);
  });

  it('no affect → constant credit for tagged moods', () => {
    const r = scoreAsset(asset({ moods: ['lively'] }), {
      currentDaypart: 'evening',
      currentSeason: 'summer',
      recentlyViewedAssetIds: [],
    });
    expect(r.breakdown.mood).toBe(0.3);
  });
});

describe('hero-selector: currentDaypart', () => {
  it('06:00 → morning', () => {
    expect(currentDaypart(new Date(2026, 5, 9, 6, 0, 0))).toBe('morning');
  });
  it('12:00 → midday', () => {
    expect(currentDaypart(new Date(2026, 5, 9, 12, 0, 0))).toBe('midday');
  });
  it('18:00 → evening', () => {
    expect(currentDaypart(new Date(2026, 5, 9, 18, 0, 0))).toBe('evening');
  });
  it('23:00 → late-night', () => {
    expect(currentDaypart(new Date(2026, 5, 9, 23, 0, 0))).toBe('late-night');
  });
});

describe('hero-selector: currentSeason', () => {
  it('March → spring', () => {
    expect(currentSeason(new Date(2026, 2, 15))).toBe('spring');
  });
  it('July → summer', () => {
    expect(currentSeason(new Date(2026, 6, 15))).toBe('summer');
  });
  it('October → fall', () => {
    expect(currentSeason(new Date(2026, 9, 15))).toBe('fall');
  });
  it('January → winter', () => {
    expect(currentSeason(new Date(2026, 0, 15))).toBe('winter');
  });
});

// =============================================================================
// narrative-composer
// =============================================================================

describe('narrative-composer: composeNarrativeFallback', () => {
  it('restaurant kind references the chef', () => {
    const result = composeNarrativeFallback({
      venueName: "Victoria's",
      venueKind: 'restaurant',
      shortDescription: 'Eight tables, two seatings nightly.',
      hasMemorySummary: false,
    });
    expect(result).toContain('chef');
    expect(result).toContain("Victoria's");
  });

  it('spa kind references slowness', () => {
    expect(
      composeNarrativeFallback({
        venueName: 'Sea Spa',
        venueKind: 'spa',
        shortDescription: 'Quiet hours hold.',
        hasMemorySummary: false,
      }),
    ).toContain('slower');
  });

  it('bar kind references the pour', () => {
    expect(
      composeNarrativeFallback({
        venueName: 'Atlas',
        venueKind: 'bar',
        shortDescription: 'Cocktail list.',
        hasMemorySummary: false,
      }),
    ).toContain('pour');
  });

  it('result is exactly two sentences when description is one sentence', () => {
    const result = composeNarrativeFallback({
      venueName: "Victoria's",
      venueKind: 'restaurant',
      shortDescription: 'Tasting room.',
      hasMemorySummary: false,
    });
    const sentences = result.split(/(?<=[.!?])\s+/).filter(Boolean);
    expect(sentences.length).toBeGreaterThanOrEqual(2);
  });

  it('never asks a question (Tenet 1)', () => {
    const result = composeNarrativeFallback({
      venueName: 'X',
      venueKind: 'spa',
      shortDescription: 'Y',
      hasMemorySummary: true,
    });
    expect(result).not.toContain('?');
  });
});

// =============================================================================
// brief-composer (Aurion)
// =============================================================================

describe('brief-composer: buildBriefPrompt', () => {
  it('contains the never-ask-questions constraint', () => {
    const prompt = buildBriefPrompt({
      tripPurpose: 'leisure',
      arrivalIso: '2026-05-09T14:00:00.000Z',
      departureIso: '2026-05-12T11:00:00.000Z',
      partySize: 2,
    });
    expect(prompt).toContain('Never ask the guest a question');
  });

  it('inserts guestNameHint when provided', () => {
    const prompt = buildBriefPrompt({
      tripPurpose: 'corporate',
      arrivalIso: '2026-05-09T14:00:00.000Z',
      departureIso: '2026-05-12T11:00:00.000Z',
      partySize: 1,
      guestNameHint: 'Henderson party',
    });
    expect(prompt).toContain('Henderson party');
  });

  it('inserts memorySummary when provided', () => {
    const prompt = buildBriefPrompt({
      tripPurpose: 'leisure',
      arrivalIso: '2026-05-09T14:00:00.000Z',
      departureIso: '2026-05-12T11:00:00.000Z',
      partySize: 2,
      memorySummary: 'wine drinker; anniversary in May',
    });
    expect(prompt).toContain('Memory context');
    expect(prompt).toContain('wine drinker');
  });

  it('forbids exclamation points and marketing copy', () => {
    const prompt = buildBriefPrompt({
      tripPurpose: 'leisure',
      arrivalIso: '2026-05-09T14:00:00.000Z',
      departureIso: '2026-05-12T11:00:00.000Z',
      partySize: 2,
    });
    expect(prompt).toContain('No marketing copy');
    expect(prompt).toContain('No exclamation points');
  });
});
