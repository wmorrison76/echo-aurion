import { describe, expect, it } from 'vitest';
import { analyzeOperational, loadLevelLabel } from './operationalEngine';
import type { ComposedItem } from '../hooks/useCompositionStore';
import type {
  CanvasSnapshot,
  KitchenStation,
  EquipmentCategory,
  PricingModel,
} from '../BanquetMenuBuilder.types';

const PRICING: PricingModel = { kind: 'per-guest', price: { amount: 10, currency: 'USD' } };

function snap(opts: {
  id: string;
  stations?: KitchenStation[];
  equipment?: EquipmentCategory[];
  complexityScore?: number;
}): CanvasSnapshot {
  return {
    id: opts.id,
    name: `Item ${opts.id}`,
    category: 'entree',
    pricing: PRICING,
    dietaryTags: [],
    operationalLoad: {
      stations: opts.stations,
      equipment: opts.equipment,
      complexityScore: opts.complexityScore,
    },
  };
}

function item(id: string, opts: Parameters<typeof snap>[0]): ComposedItem {
  return {
    instanceId: `inst-${id}`,
    itemId: id,
    itemSnapshot: snap({ ...opts, id }),
    order: 0,
  };
}

describe('analyzeOperational', () => {
  it('returns empty analysis for no items', () => {
    const result = analyzeOperational([], 100);
    expect(result.totalComplexity).toBe(0);
    expect(result.estimatedPrepHours).toBe(0);
    expect(result.stationLoads).toEqual([]);
    expect(result.bottleneckStations).toEqual([]);
  });

  it('aggregates complexity across items', () => {
    const items = [
      item('a', { stations: ['saute'], complexityScore: 2 }),
      item('b', { stations: ['grill'], complexityScore: 1.5 }),
    ];
    const result = analyzeOperational(items, 100);
    expect(result.totalComplexity).toBeCloseTo(3.5, 1);
    expect(result.estimatedPrepHours).toBeGreaterThan(0);
  });

  it('detects bottleneck stations', () => {
    // 4 items on saute, 1 on grill — saute should be bottleneck
    const items = [
      item('a', { stations: ['saute'], complexityScore: 5 }),
      item('b', { stations: ['saute'], complexityScore: 5 }),
      item('c', { stations: ['saute'], complexityScore: 5 }),
      item('d', { stations: ['saute'], complexityScore: 5 }),
      item('e', { stations: ['grill'], complexityScore: 0.5 }),
    ];
    const result = analyzeOperational(items, 100);
    expect(result.bottleneckStations).toContain('saute');
  });

  it('classifies load level by total complexity', () => {
    const lightItems = [item('a', { stations: ['saute'], complexityScore: 0.5 })];
    expect(analyzeOperational(lightItems, 100).loadLevel).toBe('light');
  });

  it('skips items without operationalLoad', () => {
    const items: ComposedItem[] = [
      {
        instanceId: 'a',
        itemId: 'a',
        itemSnapshot: {
          id: 'a',
          name: 'No-ops item',
          category: 'entree',
          pricing: PRICING,
          dietaryTags: [],
        },
        order: 0,
      },
    ];
    const result = analyzeOperational(items, 100);
    expect(result.totalComplexity).toBe(0);
  });

  it('aggregates equipment requirements with suggested units', () => {
    const items = [
      item('a', { equipment: ['chafer', 'induction_burner'], complexityScore: 1 }),
      item('b', { equipment: ['chafer'], complexityScore: 1 }),
    ];
    const result = analyzeOperational(items, 100);
    expect(result.equipmentRequirements.length).toBeGreaterThan(0);
    const chafer = result.equipmentRequirements.find((e) => e.category === 'chafer');
    expect(chafer?.itemCount).toBe(2);
    expect(chafer?.suggestedUnits).toBeGreaterThanOrEqual(1);
  });
});

describe('loadLevelLabel', () => {
  it('returns human-readable labels', () => {
    expect(loadLevelLabel('light')).toBe('Light Load');
    expect(loadLevelLabel('extreme')).toBe('Extreme Load');
  });
});
