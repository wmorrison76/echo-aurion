import { describe, expect, it } from 'vitest';
import { predictWaste } from './wastePredictionService';
import type { CompositionSnapshot } from '../hooks/useMenuComposition';
import type { CanvasSnapshot, PricingModel, MenuSectionType } from '../BanquetMenuBuilder.types';

const PRICING: PricingModel = { kind: 'per-guest', price: { amount: 10, currency: 'USD' } };

function makeSnap(opts: {
  eventType?: string;
  guestCount?: number;
  itemCount?: number;
  sectionKind?: MenuSectionType;
  dietaryTags?: string[];
}): CompositionSnapshot {
  return {
    draftId: null,
    propertyId: 'prop-1',
    eventType: opts.eventType ?? 'wedding-reception',
    guestCount: opts.guestCount ?? 100,
    budgetPerGuest: 50,
    budgetTotal: 5000,
    perGuestCost: 30,
    totalCost: 3000,
    weightedMargin: 0.5,
    itemCount: opts.itemCount ?? 1,
    sections: [
      {
        id: 's1',
        name: 'Section',
        kind: opts.sectionKind ?? 'salad',
        order: 0,
        items: [
          {
            id: 'item-1',
            name: 'Test Item',
            category: 'entree',
            pricing: PRICING,
            costBasis: { amount: 5, currency: 'USD' },
            dietaryTags: (opts.dietaryTags ?? []) as any,
          },
        ],
      },
    ],
    currency: 'USD',
    dietaryGaps: [],
    bottleneckStations: [],
    loadLevel: 'light',
    estimatedPrepHours: 5,
  };
}

describe('predictWaste', () => {
  it('returns no findings on empty menu', () => {
    const snap = makeSnap({ itemCount: 0 });
    snap.sections = [];
    expect(predictWaste(snap)).toEqual([]);
  });

  it('flags buffet salad at high guest count as warning+', () => {
    const snap = makeSnap({
      eventType: 'buffet-reception',
      guestCount: 200,
      sectionKind: 'salad',
    });
    const findings = predictWaste(snap);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toMatch(/warning|critical/);
    expect(findings[0].predictedWastePct).toBeGreaterThan(18);
  });

  it('does not flag plated entree (low waste)', () => {
    const snap = makeSnap({
      eventType: 'plated-dinner',
      guestCount: 100,
      sectionKind: 'plated-entree',
    });
    const findings = predictWaste(snap);
    // Plated entree base waste 4% + plated mod -4 = 0% — well under threshold
    expect(findings.length).toBe(0);
  });

  it('ranks findings by estimated cost impact', () => {
    const snap = makeSnap({
      eventType: 'buffet-reception',
      guestCount: 250,
      sectionKind: 'station',
    });
    const findings = predictWaste(snap);
    if (findings.length > 1) {
      for (let i = 0; i < findings.length - 1; i++) {
        expect(findings[i].estimatedCostImpact).toBeGreaterThanOrEqual(
          findings[i + 1].estimatedCostImpact,
        );
      }
    }
  });
});
