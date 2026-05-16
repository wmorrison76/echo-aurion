import { describe, expect, it } from 'vitest';
import {
  computeDietaryDistribution,
  detectDietaryGaps,
  analyzeDietary,
} from './dietaryEngine';
import type { ComposedItem } from '../hooks/useCompositionStore';
import type { CanvasSnapshot, DietaryTag, PricingModel } from '../BanquetMenuBuilder.types';

const PRICING: PricingModel = { kind: 'per-guest', price: { amount: 10, currency: 'USD' } };

function snap(id: string, tags: DietaryTag[]): CanvasSnapshot {
  return {
    id,
    name: `Item ${id}`,
    category: 'entree',
    pricing: PRICING,
    dietaryTags: tags,
  };
}

function item(id: string, tags: DietaryTag[]): ComposedItem {
  return {
    instanceId: `inst-${id}`,
    itemId: id,
    itemSnapshot: snap(id, tags),
    order: 0,
  };
}

describe('computeDietaryDistribution', () => {
  it('counts tags across composed items', () => {
    const items = [
      item('a', ['VG', 'G']),
      item('b', ['VE']),
      item('c', ['G']),
    ];
    const dist = computeDietaryDistribution(items);
    expect(dist.totalItems).toBe(3);
    expect(dist.counts.G).toBe(2);
    // Vegan implies vegetarian — items with VE bump VG too. Items: a(VG), b(VE→implied VG), c — VG count = 2.
    expect(dist.counts.VG).toBe(2);
    expect(dist.counts.VE).toBe(1);
    expect(dist.coverage.G).toBe(true);
    expect(dist.coverage.VE).toBe(true);
    expect(dist.density.G).toBeCloseTo(2 / 3, 4);
  });

  it('returns zeros for empty input', () => {
    const dist = computeDietaryDistribution([]);
    expect(dist.totalItems).toBe(0);
    expect(dist.counts.G).toBe(0);
    expect(dist.coverage.G).toBe(false);
  });
});

describe('detectDietaryGaps', () => {
  it('flags missing vegan option when menu has none', () => {
    const items = Array.from({ length: 5 }, (_, i) => item(`a${i}`, ['VG']));
    const dist = computeDietaryDistribution(items);
    const gaps = detectDietaryGaps(dist, 'wedding-reception');
    const tags = gaps.map((g) => g.tag);
    expect(tags).toContain('VE');
  });

  it('does not flag vegan when at least one vegan item present', () => {
    const items = [item('a', ['VE']), item('b', ['VG']), item('c', []), item('d', [])];
    const dist = computeDietaryDistribution(items);
    const gaps = detectDietaryGaps(dist, 'wedding-reception');
    expect(gaps.map((g) => g.tag)).not.toContain('VE');
  });

  it('flags inverse coverage gap when EVERY item contains gluten', () => {
    const items = Array.from({ length: 5 }, (_, i) => item(`a${i}`, ['G']));
    const dist = computeDietaryDistribution(items);
    const gaps = detectDietaryGaps(dist, 'wedding-reception');
    const glutenGap = gaps.find((g) => g.tag === 'G');
    expect(glutenGap).toBeDefined();
    expect(glutenGap?.severity).toBe('warning');
  });

  it('does not flag gluten gap when at least one item is gluten-free', () => {
    const items = [item('a', ['G']), item('b', ['G']), item('c', []), item('d', [])];
    const dist = computeDietaryDistribution(items);
    const gaps = detectDietaryGaps(dist, 'wedding-reception');
    expect(gaps.map((g) => g.tag).filter((t) => t === 'G')).toHaveLength(0);
  });

  it('skips rules below minMenuSize', () => {
    const items = [item('a', ['G'])];
    const dist = computeDietaryDistribution(items);
    const gaps = detectDietaryGaps(dist, 'wedding-reception');
    // Most rules have minMenuSize 3 or 4 — only the nut critical (minMenuSize 1) might fire
    // and only if all items carry N. Our items don't.
    expect(gaps.find((g) => g.tag === 'N')).toBeUndefined();
  });
});

describe('analyzeDietary', () => {
  it('returns distribution + gaps + itemsByTag', () => {
    const items = [item('a', ['VG']), item('b', ['VE'])];
    const result = analyzeDietary(items, 'wedding-reception');
    expect(result.distribution.totalItems).toBe(2);
    expect(Array.isArray(result.gaps)).toBe(true);
    expect(result.itemsByTag).toBeDefined();
  });
});
