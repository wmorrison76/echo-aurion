/**
 * ===========================================================================
 * Aurion pure-function tests — Phase 3
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED
 * Phase:    3
 *
 * Purpose:  Lock the math + thresholds for the pure helpers in Aurion:
 *             - prosody-analyzer: extractFeatures, featuresToAffect, featureConfidence
 *             - whisper-engine: composeArrivalWhisperText
 *             - conversation-memory: signalToMemoryItems
 *
 *           DB-touching paths (sessionManager, whisperEngine.composeArrivalWhisper,
 *           conversationMemory.forgetAll) are DB-gated and get coverage when
 *           DATABASE_URL_TEST lands.
 * ===========================================================================
 */

import { describe, expect, it } from 'vitest';
import {
  extractFeatures,
  featuresToAffect,
  featureConfidence,
} from '../../../../server/services/echo-ai3/aurion/prosody-analyzer';
import { composeArrivalWhisperText } from '../../../../server/services/echo-ai3/aurion/whisper-engine';
import { signalToMemoryItems } from '../../../../server/services/echo-ai3/aurion/conversation-memory';
import type { Signal, SignalSource } from '../../../../shared/types/signals';

// =============================================================================
// prosody-analyzer
// =============================================================================

describe('prosody-analyzer: extractFeatures', () => {
  it('empty buffer → all-zero features', () => {
    const f = extractFeatures(new ArrayBuffer(0));
    expect(f.energyLevel).toBe(0);
    expect(f.warmth).toBe(0);
    expect(f.hesitation).toBe(0);
    expect(f.pitchVariability).toBe(0);
    expect(f.speakingRate).toBe(0);
  });

  it('high-energy uniform buffer produces non-zero energy', () => {
    const buf = new ArrayBuffer(1024);
    const view = new Uint8Array(buf);
    for (let i = 0; i < view.length; i++) view[i] = i % 2 === 0 ? 250 : 10;
    const f = extractFeatures(buf);
    expect(f.energyLevel).toBeGreaterThan(0.5);
  });

  it('all-features in [0, 1]', () => {
    const buf = new ArrayBuffer(2048);
    const view = new Uint8Array(buf);
    for (let i = 0; i < view.length; i++) view[i] = (i * 17) & 0xff;
    const f = extractFeatures(buf);
    Object.values(f).forEach((v) => {
      if (typeof v === 'number') {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    });
  });
});

describe('prosody-analyzer: featuresToAffect', () => {
  it('low energy + cold → low arousal, neutral-to-negative valence', () => {
    const result = featuresToAffect({
      energyLevel: 0.1,
      warmth: 0.3,
      hesitation: 0.2,
      pitchVariability: 0.1,
      speakingRate: 0.1,
      detectedSighs: 0,
      detectedLaughs: 0,
    });
    expect(result.arousal).toBeLessThan(0);
    expect(result.valence).toBeLessThan(0.5);
  });

  it('high energy + warm + laughs → high arousal, positive valence', () => {
    const result = featuresToAffect({
      energyLevel: 0.9,
      warmth: 0.9,
      hesitation: 0,
      pitchVariability: 0.7,
      speakingRate: 0.7,
      detectedSighs: 0,
      detectedLaughs: 2,
    });
    expect(result.arousal).toBeGreaterThan(0);
    expect(result.valence).toBeGreaterThan(0.5);
  });

  it('clamps to [-1, 1]', () => {
    const result = featuresToAffect({
      energyLevel: 1,
      warmth: 1,
      hesitation: 0,
      pitchVariability: 1,
      speakingRate: 1,
      detectedSighs: 0,
      detectedLaughs: 10,
    });
    expect(result.arousal).toBeLessThanOrEqual(1);
    expect(result.valence).toBeLessThanOrEqual(1);
  });

  it('hesitation drives valence down', () => {
    const a = featuresToAffect({
      energyLevel: 0.5,
      warmth: 0.7,
      hesitation: 0,
      pitchVariability: 0.3,
      speakingRate: 0.3,
      detectedSighs: 0,
      detectedLaughs: 0,
    });
    const b = featuresToAffect({
      energyLevel: 0.5,
      warmth: 0.7,
      hesitation: 0.8,
      pitchVariability: 0.3,
      speakingRate: 0.3,
      detectedSighs: 0,
      detectedLaughs: 0,
    });
    expect(b.valence).toBeLessThan(a.valence);
  });
});

describe('prosody-analyzer: featureConfidence', () => {
  it('silence → 0 confidence', () => {
    expect(
      featureConfidence({
        energyLevel: 0.02,
        warmth: 0,
        hesitation: 0,
        pitchVariability: 0,
        speakingRate: 0,
        detectedSighs: 0,
        detectedLaughs: 0,
      }),
    ).toBe(0);
  });

  it('reasonable energy + variation → confidence > threshold', () => {
    const c = featureConfidence({
      energyLevel: 0.6,
      warmth: 0.5,
      hesitation: 0.2,
      pitchVariability: 0.5,
      speakingRate: 0.5,
      detectedSighs: 0,
      detectedLaughs: 0,
    });
    expect(c).toBeGreaterThan(0.5);
  });
});

// =============================================================================
// whisper-engine
// =============================================================================

describe('whisper-engine: composeArrivalWhisperText', () => {
  it('check-in with no signals → background urgency, default fallback line', () => {
    const result = composeArrivalWhisperText({
      context: 'check-in',
      signalTags: [],
    });
    expect(result.urgency).toBe('background');
    expect(result.text).toContain('Returning guest');
    expect(result.doNots).toEqual([]);
  });

  it('delayed-flight tag → "be warm, skip the trip questions" + do-not', () => {
    const result = composeArrivalWhisperText({
      context: 'check-in',
      signalTags: ['arrival-mode:delayed-flight'],
    });
    expect(result.text).toContain('travel was hard');
    expect(result.doNots).toContain('do not ask about the flight');
    expect(result.urgency).toBe('noticed');
  });

  it('anniversary tag → quiet acknowledgment + no-song do-not', () => {
    const result = composeArrivalWhisperText({
      context: 'tableside',
      signalTags: ['occasion:anniversary'],
    });
    expect(result.text).toContain('anniversary');
    expect(result.doNots.some((d) => /no song|no sparkler/i.test(d))).toBe(true);
  });

  it('shellfish-allergy raises urgency to priority', () => {
    const result = composeArrivalWhisperText({
      context: 'tableside',
      signalTags: ['allergy:shellfish-allergy'],
    });
    expect(result.urgency).toBe('priority');
  });

  it('memorial-context → warmth not celebration', () => {
    const result = composeArrivalWhisperText({
      context: 'check-in',
      signalTags: ['returning-guest:memorial-context'],
    });
    expect(result.text).toContain('warmth not celebration');
  });

  it('duration in 3-10 second range', () => {
    const result = composeArrivalWhisperText({
      context: 'check-in',
      signalTags: ['arrival-mode:delayed-flight', 'occasion:anniversary'],
    });
    expect(result.durationSeconds).toBeGreaterThanOrEqual(3);
    expect(result.durationSeconds).toBeLessThanOrEqual(10);
  });
});

// =============================================================================
// conversation-memory: signalToMemoryItems
// =============================================================================

function signal(over: Partial<Signal> = {}): Signal {
  return {
    id: 'aaaaaaaa-1111-1111-1111-111111111111',
    guestId: 'guest',
    visitId: null,
    timestamp: '2026-05-09T18:00:00.000Z',
    source: 'staff-whisper' as SignalSource,
    subject: { kind: 'free-text', text: 'note' },
    tags: [],
    conversion: null,
    sensitivity: 'preference',
    expiresAt: '2027-05-09T18:00:00.000Z',
    createdAt: '2026-05-09T18:00:00.000Z',
    ...over,
  };
}

describe('conversation-memory: signalToMemoryItems', () => {
  it('allergy tag produces an allergens item', () => {
    const result = signalToMemoryItems(
      signal({
        tags: [{ kind: 'allergy', value: 'shellfish' }],
      }),
    );
    const allergen = result.find((r) => r.category === 'allergens');
    expect(allergen).toBeTruthy();
    expect(allergen!.item.description).toContain('shellfish allergy');
    expect(allergen!.item.canForget).toBe(true);
  });

  it('occasion subject produces an occasions item', () => {
    const result = signalToMemoryItems(
      signal({
        subject: { kind: 'occasion', occasionType: 'anniversary' },
      }),
    );
    const occ = result.find((r) => r.category === 'occasions');
    expect(occ).toBeTruthy();
    expect(occ!.item.description).toBe('anniversary');
  });

  it('voyage-tap on a venue produces an amenity-affinity item', () => {
    const result = signalToMemoryItems(
      signal({
        source: 'voyage-tap',
        subject: { kind: 'venue', venueId: 'aaaa-bbbb-cccc-dddd-1234567890ab' },
      }),
    );
    const aa = result.find((r) => r.category === 'amenity-affinity');
    expect(aa).toBeTruthy();
  });

  it('staff-whisper free-text with note → service-history', () => {
    const result = signalToMemoryItems(
      signal({
        source: 'staff-whisper',
        subject: { kind: 'free-text', text: 'note' },
        note: 'guest preferred quiet seating',
      }),
    );
    const sh = result.find((r) => r.category === 'service-history');
    expect(sh).toBeTruthy();
    expect(sh!.item.description).toBe('guest preferred quiet seating');
    expect(sh!.item.source).toBe('observed-by-staff');
  });

  it('aurion-voice-* source attributes "inferred-by-aurion"', () => {
    const result = signalToMemoryItems(
      signal({
        source: 'aurion-voice-prosody',
        subject: { kind: 'occasion', occasionType: 'birthday' },
      }),
    );
    expect(result[0].item.source).toBe('inferred-by-aurion');
  });

  it('subject with no relevant kind + no allergy tag + non-preference sensitivity → empty', () => {
    const result = signalToMemoryItems(
      signal({
        sensitivity: 'public',
        subject: { kind: 'staff-member', staffId: 's' },
      }),
    );
    expect(result).toEqual([]);
  });

  it('preference-sensitivity signal with no matched subject → preferences fallback', () => {
    const result = signalToMemoryItems(
      signal({
        sensitivity: 'preference',
        subject: null,
        note: 'prefers window seating',
      }),
    );
    const pref = result.find((r) => r.category === 'preferences');
    expect(pref).toBeTruthy();
    expect(pref!.item.description).toBe('prefers window seating');
  });
});
