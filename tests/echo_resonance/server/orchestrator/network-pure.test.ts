/**
 * ===========================================================================
 * Network orchestrator pure-function tests
 * ===========================================================================
 * Layer:    Substrate: Network
 * Status:   IMPLEMENTED
 * Phase:    6
 *
 * Purpose:  Pure-function coverage for the Phase 6 network services that
 *           do not require a database:
 *             - aggregator.aggregateSegment + K_ANONYMITY_THRESHOLD gate
 *             - consent-manager.effectiveScopeAt
 *             - corpus-builder.sanitizeEpisode
 *             - onboarding-bootstrap.segmentKeyFor + fallbackSegmentKeys
 * ===========================================================================
 */

import { describe, expect, it } from 'vitest';
import {
  aggregateSegment,
  K_ANONYMITY_THRESHOLD,
} from '../../../../server/services/echo-ai3/orchestrator/network/aggregator';
import { effectiveScopeAt } from '../../../../server/services/echo-ai3/orchestrator/network/consent-manager';
import {
  sanitizeEpisode,
  type DistillSourceRow,
} from '../../../../server/services/echo-ai3/orchestrator/network/corpus-builder';
import {
  segmentKeyFor,
  fallbackSegmentKeys,
  type PropertyProfile,
} from '../../../../server/services/echo-ai3/orchestrator/network/onboarding-bootstrap';

// =============================================================================
// aggregator
// =============================================================================

describe('aggregator: aggregateSegment k-anonymity gate', () => {
  it('returns null below the threshold', () => {
    const result = aggregateSegment('luxury_resort_us-fl_anniversary', [
      { segment_key: 'k', pre_state: {}, action: {}, post_state: {}, outcome_quality: 0.8 },
    ]);
    expect(result).toBeNull();
  });

  it('returns aggregate when at threshold', () => {
    const rows = Array.from({ length: K_ANONYMITY_THRESHOLD }, (_, i) => ({
      segment_key: 'k',
      pre_state: { entryScore: 6, affinityTags: ['quiet'] },
      action: { templateId: `tpl-${i % 3}` },
      post_state: { lift: 1.5 },
      outcome_quality: 0.7,
    }));
    const result = aggregateSegment('k', rows);
    expect(result).not.toBeNull();
    expect(result!.sampleSize).toBe(K_ANONYMITY_THRESHOLD);
    expect(result!.averageEntryScore).toBeCloseTo(6, 5);
    expect(result!.averageLift).toBeCloseTo(1.5, 5);
  });

  it('top intervention patterns are ordered by frequency', () => {
    const rows = [
      ...Array.from({ length: 30 }, () => ({
        segment_key: 'k',
        pre_state: {},
        action: { templateId: 'tpl-A' },
        post_state: {},
        outcome_quality: 0.8,
      })),
      ...Array.from({ length: 20 }, () => ({
        segment_key: 'k',
        pre_state: {},
        action: { templateId: 'tpl-B' },
        post_state: {},
        outcome_quality: 0.8,
      })),
    ];
    const result = aggregateSegment('k', rows);
    expect(result!.topInterventionPatterns[0]).toBe('tpl-A');
    expect(result!.topInterventionPatterns[1]).toBe('tpl-B');
  });

  it('affinity profile is normalized to [0, 1]', () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({
      segment_key: 'k',
      pre_state: { affinityTags: i < 30 ? ['quiet'] : ['lively'] },
      action: {},
      post_state: {},
      outcome_quality: 0.8,
    }));
    const result = aggregateSegment('k', rows);
    expect(Math.max(...Object.values(result!.affinityProfile))).toBe(1);
    expect(Math.min(...Object.values(result!.affinityProfile))).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// consent-manager
// =============================================================================

describe('consent-manager: effectiveScopeAt', () => {
  it('null consent collapses to this-property-only', () => {
    expect(effectiveScopeAt(null, 'prop-1')).toBe('this-property-only');
  });

  it('revoked consent collapses to this-property-only', () => {
    expect(
      effectiveScopeAt(
        {
          guestId: 'g',
          scope: 'all-network-properties',
          grantedAt: '2026-01-01T00:00:00Z',
          revokedAt: '2026-02-01T00:00:00Z',
        },
        'prop-1',
      ),
    ).toBe('this-property-only');
  });

  it('passes through scope when not gated by permittedPropertyIds', () => {
    expect(
      effectiveScopeAt(
        { guestId: 'g', scope: 'all-network-properties', grantedAt: 'x' },
        'prop-1',
      ),
    ).toBe('all-network-properties');
  });

  it('respects permittedPropertyIds — included property keeps wide scope', () => {
    expect(
      effectiveScopeAt(
        {
          guestId: 'g',
          scope: 'this-brand-only',
          grantedAt: 'x',
          permittedPropertyIds: ['prop-1', 'prop-2'],
        },
        'prop-1',
      ),
    ).toBe('this-brand-only');
  });

  it('respects permittedPropertyIds — excluded property collapses', () => {
    expect(
      effectiveScopeAt(
        {
          guestId: 'g',
          scope: 'this-brand-only',
          grantedAt: 'x',
          permittedPropertyIds: ['prop-1'],
        },
        'prop-99',
      ),
    ).toBe('this-property-only');
  });
});

// =============================================================================
// corpus-builder
// =============================================================================

describe('corpus-builder: sanitizeEpisode', () => {
  function source(over: Partial<DistillSourceRow> = {}): DistillSourceRow {
    return {
      visitId: '11111111-1111-1111-1111-111111111111',
      guestId: '22222222-2222-2222-2222-222222222222',
      segmentKey: 'luxury_resort_us-fl',
      preState: { entryScore: 5, name: 'Henderson', email: 'h@x.com' },
      action: { templateId: 'tpl-Q', staffId: 'staff-1' },
      postState: { lift: 1.5, roomNumber: '7B' },
      outcomeQuality: 0.85,
      ...over,
    };
  }

  it('strips PII keys at every nesting level', () => {
    const ep = sanitizeEpisode(source(), '2026-05-09T18:00:00Z');
    expect(JSON.stringify(ep.preState)).not.toContain('Henderson');
    expect(JSON.stringify(ep.preState)).not.toContain('@x.com');
    expect(JSON.stringify(ep.action)).not.toContain('staff-1');
    expect(JSON.stringify(ep.postState)).not.toContain('7B');
  });

  it('retains structural keys like entryScore and lift', () => {
    const ep = sanitizeEpisode(source(), '2026-05-09T18:00:00Z');
    expect((ep.preState as any).entryScore).toBe(5);
    expect((ep.postState as any).lift).toBe(1.5);
    expect((ep.action as any).templateId).toBe('tpl-Q');
  });

  it('clamps outcome quality to [0, 1]', () => {
    expect(sanitizeEpisode(source({ outcomeQuality: 1.4 }), 't').outcomeQuality).toBe(1);
    expect(sanitizeEpisode(source({ outcomeQuality: -0.1 }), 't').outcomeQuality).toBe(0);
    expect(sanitizeEpisode(source({ outcomeQuality: NaN }), 't').outcomeQuality).toBe(0);
  });

  it('id is deterministic per (visit, template) pair', () => {
    const a = sanitizeEpisode(source(), 't');
    const b = sanitizeEpisode(source(), 't');
    expect(a.id).toBe(b.id);
  });
});

// =============================================================================
// onboarding-bootstrap
// =============================================================================

describe('onboarding-bootstrap: segmentKeyFor', () => {
  function profile(over: Partial<PropertyProfile> = {}): PropertyProfile {
    return {
      propertyId: '33333333-3333-3333-3333-333333333333',
      geo: 'US-FL/Naples',
      priceTier: 'luxury',
      style: 'resort',
      ...over,
    };
  }

  it('composes a slug-style key', () => {
    expect(segmentKeyFor(profile())).toBe('luxury_resort_us-fl-naples');
  });

  it('handles unknown geo defensively', () => {
    expect(segmentKeyFor(profile({ geo: '   ' }))).toBe('luxury_resort_unknown');
  });

  it('fallback chain widens the segment progressively', () => {
    const chain = fallbackSegmentKeys(profile());
    expect(chain.length).toBe(4);
    expect(chain[0]).toBe('luxury_resort_us-fl-naples');
    expect(chain[chain.length - 1]).toBe('*_*_*');
  });
});
