import { describe, expect, it } from 'vitest';
import { runContinuousAudit } from './continuousAuditService';
import type { CompositionSnapshot } from '../hooks/useMenuComposition';
import type { CanvasSnapshot, PricingModel } from '../BanquetMenuBuilder.types';

const PRICING: PricingModel = { kind: 'per-guest', price: { amount: 10, currency: 'USD' } };

function makeSnapshot(overrides: Partial<CompositionSnapshot> = {}): CompositionSnapshot {
  return {
    draftId: overrides.draftId ?? null,
    propertyId: overrides.propertyId ?? 'prop-1',
    eventType: overrides.eventType ?? 'wedding-reception',
    guestCount: overrides.guestCount ?? 100,
    budgetPerGuest: overrides.budgetPerGuest ?? 75,
    budgetTotal: overrides.budgetTotal ?? 7500,
    perGuestCost: overrides.perGuestCost ?? 60,
    totalCost: overrides.totalCost ?? 6000,
    weightedMargin: overrides.weightedMargin ?? 0.4,
    itemCount: overrides.itemCount ?? 3,
    sections: overrides.sections ?? [
      {
        id: 's1',
        name: 'Entree',
        kind: 'plated-entree',
        order: 0,
        items: [
          {
            id: 'item-1',
            name: 'Steak',
            category: 'entree',
            pricing: PRICING,
            costBasis: { amount: 10, currency: 'USD' },
            dietaryTags: [],
          },
        ],
      },
    ],
    currency: overrides.currency ?? 'USD',
    dietaryGaps: overrides.dietaryGaps ?? [],
    bottleneckStations: overrides.bottleneckStations ?? [],
    loadLevel: overrides.loadLevel ?? 'light',
    estimatedPrepHours: overrides.estimatedPrepHours ?? 5,
  };
}

describe('runContinuousAudit', () => {
  it('returns passing signals on a clean menu', async () => {
    const snap = makeSnapshot();
    const result = await runContinuousAudit(snap);
    const passing = result.signals.filter((s) => s.status === 'passing');
    expect(passing.length).toBeGreaterThan(0);
    expect(result.blockingPublish.length).toBe(0);
  });

  it('flags missing propertyId as critical', async () => {
    const snap = makeSnapshot({ propertyId: '' });
    const result = await runContinuousAudit(snap);
    const tenantSig = result.signals.find((s) => s.id === 'audit-tenant-scope');
    expect(tenantSig?.status).toBe('critical');
    expect(result.blockingPublish.length).toBeGreaterThan(0);
  });

  it('flags dietary gaps as warning', async () => {
    const snap = makeSnapshot({ dietaryGaps: ['No vegetarian options', 'No vegan options'] });
    const result = await runContinuousAudit(snap);
    const dietary = result.signals.find((s) => s.id === 'audit-dietary-coverage');
    expect(dietary?.status).toBe('warning');
  });

  it('flags pricing precision drift', async () => {
    // perGuestCost × guestCount differs from totalCost by > $0.05
    const snap = makeSnapshot({ perGuestCost: 60, guestCount: 100, totalCost: 6500 });
    const result = await runContinuousAudit(snap);
    const pricing = result.signals.find((s) => s.id === 'audit-pricing-precision');
    expect(pricing?.status).toBe('warning');
  });

  it('flags items missing costBasis', async () => {
    const snap = makeSnapshot({
      sections: [
        {
          id: 's1',
          name: 'Entree',
          kind: 'plated-entree',
          order: 0,
          items: [
            {
              id: 'item-no-cost',
              name: 'No Cost',
              category: 'entree',
              pricing: PRICING,
              dietaryTags: [],
            },
          ],
        },
      ],
    });
    const result = await runContinuousAudit(snap);
    const cost = result.signals.find((s) => s.id === 'audit-cost-basis-recency');
    expect(cost?.status).toBe('warning');
    expect(cost?.affectedItems).toContain('No Cost');
  });

  it('flags empty sections', async () => {
    const snap = makeSnapshot({
      sections: [
        { id: 's1', name: 'Empty', kind: 'plated-entree', order: 0, items: [] },
      ],
    });
    const result = await runContinuousAudit(snap);
    const empty = result.signals.find((s) => s.id === 'audit-empty-sections');
    expect(empty?.status).toBe('warning');
  });
});
