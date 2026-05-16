import { describe, expect, it } from 'vitest';
import {
  computeItemPricing,
  computeMenuPricing,
} from '../services/pricingEngine';
import type { ComposedItem } from '../hooks/useCompositionStore';
import type { CanvasSnapshot, PricingModel } from '../BanquetMenuBuilder.types';

function snapshot(overrides: Partial<CanvasSnapshot> & { pricing: PricingModel }): CanvasSnapshot {
  return {
    id: overrides.id ?? 'item-1',
    name: overrides.name ?? 'Test Item',
    category: overrides.category ?? 'entree',
    pricing: overrides.pricing,
    costBasis: overrides.costBasis,
    dietaryTags: overrides.dietaryTags ?? [],
    description: overrides.description,
    networkArchetypeId: overrides.networkArchetypeId,
    operationalLoad: overrides.operationalLoad,
  };
}

function composed(snap: CanvasSnapshot, overrides: Partial<ComposedItem> = {}): ComposedItem {
  return {
    instanceId: overrides.instanceId ?? 'inst-1',
    itemId: snap.id,
    itemSnapshot: snap,
    priceOverride: overrides.priceOverride,
    notes: overrides.notes,
    order: overrides.order ?? 0,
  };
}

describe('computeItemPricing', () => {
  it('computes per-guest price × guest count', () => {
    const item = composed(
      snapshot({ pricing: { kind: 'per-guest', price: { amount: 25, currency: 'USD' } } }),
    );
    const result = computeItemPricing(item, 100);
    expect(result.totalContribution).toBe(2500);
    expect(result.perGuestContribution).toBe(25);
    expect(result.pricingKind).toBe('per-guest');
  });

  it('computes per-piece × pieces-per-guest × guest count', () => {
    const item = composed(
      snapshot({
        pricing: { kind: 'per-piece', price: { amount: 12, currency: 'USD' }, minOrder: 24 },
      }),
    );
    const result = computeItemPricing(item, 100);
    // calculatePerGuestCost defaults piecesPerGuest to 1, so per-guest = price × 1 = 12
    expect(result.perGuestContribution).toBe(12);
    expect(result.totalContribution).toBe(1200);
  });

  it('flat-fee divides across guests for per-guest contribution', () => {
    const item = composed(
      snapshot({ pricing: { kind: 'flat-fee', price: { amount: 500, currency: 'USD' }, serves: '50 guests' } }),
    );
    const result = computeItemPricing(item, 100);
    expect(result.totalContribution).toBe(500);
    expect(result.perGuestContribution).toBe(5);
  });

  it('respects priceOverride as per-guest', () => {
    const item = composed(
      snapshot({ pricing: { kind: 'per-guest', price: { amount: 25, currency: 'USD' } } }),
      { priceOverride: 30 },
    );
    const result = computeItemPricing(item, 100);
    expect(result.totalContribution).toBe(3000);
    expect(result.isOverride).toBe(true);
  });

  it('flags market-price items', () => {
    const item = composed(
      snapshot({
        pricing: {
          kind: 'market-price',
          lastQuoted: { amount: 50, currency: 'USD' },
          quotedAt: new Date(),
        },
      }),
    );
    const result = computeItemPricing(item, 100);
    expect(result.isMarketPrice).toBe(true);
  });

  it('returns null margin when costBasis is missing', () => {
    const item = composed(
      snapshot({ pricing: { kind: 'per-guest', price: { amount: 25, currency: 'USD' } } }),
    );
    const result = computeItemPricing(item, 100);
    expect(result.margin).toBeNull();
  });

  it('computes positive margin when costBasis is below price', () => {
    const item = composed(
      snapshot({
        pricing: { kind: 'per-guest', price: { amount: 25, currency: 'USD' } },
        costBasis: { amount: 10, currency: 'USD' },
      }),
    );
    const result = computeItemPricing(item, 100);
    // margin = (25 - 10) / 25 = 0.6
    expect(result.margin).toBeCloseTo(0.6, 4);
  });

  it('computes negative margin when costBasis exceeds price', () => {
    const item = composed(
      snapshot({
        pricing: { kind: 'per-guest', price: { amount: 10, currency: 'USD' } },
        costBasis: { amount: 15, currency: 'USD' },
      }),
    );
    const result = computeItemPricing(item, 100);
    expect(result.margin).toBeLessThan(0);
  });
});

describe('computeMenuPricing', () => {
  it('returns zeros for empty menu', () => {
    const result = computeMenuPricing([], 100, 5000);
    expect(result.totalCost).toBe(0);
    expect(result.perGuestCost).toBe(0);
    expect(result.budgetDelta).toBe(5000);
    expect(result.budgetUtilization).toBe(0);
    expect(result.weightedMargin).toBeNull();
    expect(result.hasMarketPriceItems).toBe(false);
  });

  it('aggregates totals across multiple items', () => {
    const items: ComposedItem[] = [
      composed(
        snapshot({ id: 'a', pricing: { kind: 'per-guest', price: { amount: 20, currency: 'USD' } } }),
        { instanceId: 'inst-a' },
      ),
      composed(
        snapshot({ id: 'b', pricing: { kind: 'per-guest', price: { amount: 30, currency: 'USD' } } }),
        { instanceId: 'inst-b' },
      ),
    ];
    const result = computeMenuPricing(items, 100, 6000);
    expect(result.totalCost).toBe(5000);
    expect(result.perGuestCost).toBe(50);
    expect(result.budgetDelta).toBe(1000);
    expect(result.budgetUtilization).toBeCloseTo(0.8333, 3);
  });

  it('flags hasMarketPriceItems when any item is market-priced', () => {
    const items: ComposedItem[] = [
      composed(snapshot({ id: 'a', pricing: { kind: 'per-guest', price: { amount: 20, currency: 'USD' } } })),
      composed(
        snapshot({
          id: 'b',
          pricing: { kind: 'market-price', lastQuoted: { amount: 50, currency: 'USD' } },
        }),
        { instanceId: 'inst-b' },
      ),
    ];
    const result = computeMenuPricing(items, 100, 10000);
    expect(result.hasMarketPriceItems).toBe(true);
  });

  it('weighted margin aggregates by total contribution', () => {
    const items: ComposedItem[] = [
      composed(
        snapshot({
          id: 'a',
          pricing: { kind: 'per-guest', price: { amount: 20, currency: 'USD' } },
          costBasis: { amount: 10, currency: 'USD' },
        }),
        { instanceId: 'inst-a' },
      ),
      composed(
        snapshot({
          id: 'b',
          pricing: { kind: 'per-guest', price: { amount: 40, currency: 'USD' } },
          costBasis: { amount: 30, currency: 'USD' },
        }),
        { instanceId: 'inst-b' },
      ),
    ];
    const result = computeMenuPricing(items, 100, 10000);
    // Item a: margin 0.5, contribution 2000
    // Item b: margin 0.25, contribution 4000
    // Weighted: (0.5×2000 + 0.25×4000) / 6000 = (1000+1000)/6000 = 0.3333
    expect(result.weightedMargin).toBeCloseTo(0.3333, 3);
  });

  it('handles zero guest count without dividing by zero', () => {
    const items: ComposedItem[] = [
      composed(snapshot({ pricing: { kind: 'per-guest', price: { amount: 25, currency: 'USD' } } })),
    ];
    const result = computeMenuPricing(items, 0, 0);
    expect(result.perGuestCost).toBe(0);
    expect(result.budgetUtilization).toBe(0);
  });
});
