import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { CompositionSnapshot } from '../hooks/useMenuComposition';
import type { CanvasSnapshot, PricingModel } from '../BanquetMenuBuilder.types';
import type { ItemCostHistoryEntry } from './eventCostHistoryService';

// Mock the history service so the test controls historical data exactly,
// independent of the production flag that hides synthetic history.
vi.mock('./eventCostHistoryService', () => ({
  recentSimilarEventItems: vi.fn(),
}));

import { recentSimilarEventItems } from './eventCostHistoryService';
import { detectCostVariance } from './costVarianceService';

const mockHistory = recentSimilarEventItems as unknown as ReturnType<typeof vi.fn>;

const PRICING: PricingModel = { kind: 'per-guest', price: { amount: 30, currency: 'USD' } };

const TARGET_ITEM = 'history-item-prosciutto-board';
const TARGET_BASE_COST = 22;

function buildHistoryAround(
  itemId: string,
  baseCost: number,
  spread = 0.05,
): ItemCostHistoryEntry[] {
  const entries: ItemCostHistoryEntry[] = [];
  for (let i = 0; i < 8; i++) {
    const noise = Math.sin(i * 7) * spread;
    entries.push({
      itemId,
      perGuestCost: Math.round(baseCost * (1 + noise) * 100) / 100,
      eventAt: new Date(Date.now() - (i + 1) * 14 * 24 * 60 * 60 * 1000),
      eventId: `synthetic-test-event-${i}`,
    });
  }
  return entries;
}

function snap(itemId: string, costBasis: number): CanvasSnapshot {
  return {
    id: itemId,
    name: `Item ${itemId}`,
    category: 'entree',
    pricing: PRICING,
    costBasis: { amount: costBasis, currency: 'USD' },
    dietaryTags: [],
  };
}

function compose(itemId: string, costBasis: number) {
  return {
    id: 's1',
    name: 'Section',
    kind: 'plated-entree' as const,
    order: 0,
    items: [snap(itemId, costBasis)],
  };
}

function makeSnapshot(itemId: string, costBasis: number): CompositionSnapshot {
  return {
    draftId: null,
    propertyId: 'prop-test',
    eventType: 'wedding-reception',
    guestCount: 150,
    budgetPerGuest: 75,
    budgetTotal: 11250,
    perGuestCost: 60,
    totalCost: 9000,
    weightedMargin: 0.4,
    itemCount: 1,
    sections: [compose(itemId, costBasis)],
    currency: 'USD',
    dietaryGaps: [],
    bottleneckStations: [],
    loadLevel: 'light',
    estimatedPrepHours: 10,
  };
}

describe('detectCostVariance', () => {
  beforeEach(() => {
    mockHistory.mockReset();
    mockHistory.mockResolvedValue(buildHistoryAround(TARGET_ITEM, TARGET_BASE_COST));
  });

  it('returns empty for empty composition', async () => {
    const snap = makeSnapshot(TARGET_ITEM, TARGET_BASE_COST);
    snap.itemCount = 0;
    snap.sections = [];
    const result = await detectCostVariance(snap);
    expect(result).toEqual([]);
  });

  it('returns empty when item has no historical data', async () => {
    const snap = makeSnapshot('unknown-item-with-no-history', 50);
    const result = await detectCostVariance(snap);
    expect(result).toEqual([]);
  });

  it('flags cost outlier when current cost diverges from historical mean', async () => {
    // Historical mean is ~$22; spike to $50 should flag.
    const snap = makeSnapshot(TARGET_ITEM, 50);
    const result = await detectCostVariance(snap);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].itemId).toBe(TARGET_ITEM);
    expect(result[0].severity).toMatch(/warning|critical/);
    expect(result[0].financialImpact).toBeGreaterThan(0);
  });

  it('skips items missing costBasis', async () => {
    const snap = makeSnapshot(TARGET_ITEM, TARGET_BASE_COST);
    snap.sections[0].items[0] = {
      id: TARGET_ITEM,
      name: 'No Cost',
      category: 'entree',
      pricing: PRICING,
      dietaryTags: [],
    };
    const result = await detectCostVariance(snap);
    expect(result).toEqual([]);
  });

  it('rankings sorted by financial impact descending', async () => {
    const snap = makeSnapshot(TARGET_ITEM, 50);
    snap.sections[0].items.push(snap.sections[0].items[0]); // duplicate; both should appear
    snap.itemCount = 2;
    const result = await detectCostVariance(snap);
    if (result.length > 1) {
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].financialImpact).toBeGreaterThanOrEqual(
          result[i + 1].financialImpact,
        );
      }
    }
  });

  it('returns empty when historical source is offline (empty history)', async () => {
    // This is the production-default behavior: real source returned [].
    // The detector must produce no warnings rather than fabricating any.
    mockHistory.mockResolvedValueOnce([]);
    const snap = makeSnapshot(TARGET_ITEM, 50);
    const result = await detectCostVariance(snap);
    expect(result).toEqual([]);
  });
});
