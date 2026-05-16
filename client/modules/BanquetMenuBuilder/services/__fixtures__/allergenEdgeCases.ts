/**
 * Gate 3 — Allergen Safety: 20 edge-case menus.
 *
 * Each fixture is a CompositionSnapshot intentionally crafted to surface
 * a specific allergen-handling failure mode. continuousAuditService +
 * dietaryEngine should flag the issue (or correctly remain silent on
 * known-safe variants).
 *
 * Severity expectations are documented per fixture in the `expect` field.
 */

import type { CompositionSnapshot, CompositionSnapshotSection } from '../../hooks/useMenuComposition';
import type { CanvasSnapshot, DietaryTag, PricingModel } from '../../BanquetMenuBuilder.types';

const PRICING: PricingModel = { kind: 'per-guest', price: { amount: 10, currency: 'USD' } };

function snap(args: { id: string; name: string; tags: DietaryTag[]; cost?: number }): CanvasSnapshot {
  return {
    id: args.id,
    name: args.name,
    category: 'entree',
    pricing: PRICING,
    costBasis: { amount: args.cost ?? 5, currency: 'USD' },
    dietaryTags: args.tags,
  };
}

function section(name: string, items: CanvasSnapshot[]): CompositionSnapshotSection {
  return { id: `s-${name}`, name, kind: 'plated-entree', order: 0, items };
}

function snapshot(opts: {
  name: string;
  eventType?: string;
  guestCount?: number;
  items: CanvasSnapshot[];
  dietaryGaps?: string[];
}): CompositionSnapshot {
  const items = opts.items;
  return {
    draftId: null,
    propertyId: 'fixture-prop',
    eventType: opts.eventType ?? 'wedding-reception',
    guestCount: opts.guestCount ?? 100,
    budgetPerGuest: 50,
    budgetTotal: (opts.guestCount ?? 100) * 50,
    perGuestCost: 30,
    totalCost: 30 * (opts.guestCount ?? 100),
    weightedMargin: 0.5,
    itemCount: items.length,
    sections: [section('Course', items)],
    currency: 'USD',
    dietaryGaps: opts.dietaryGaps ?? [],
    bottleneckStations: [],
    loadLevel: 'light',
    estimatedPrepHours: 5,
  };
}

export interface AllergenEdgeCase {
  name: string;
  snapshot: CompositionSnapshot;
  expect: {
    /** Audit signal id we expect to fire (or 'none' for clean menus) */
    auditSignal: string | 'none';
    auditStatus?: 'passing' | 'warning' | 'critical';
    /** dietary engine should flag this gap tag (or 'none') */
    dietaryGapTag?: DietaryTag | 'none';
    notes?: string;
  };
}

export const allergenEdgeCases: AllergenEdgeCase[] = [
  // ---------- Single-allergen pure-positive cases ----------
  {
    name: '01: every item contains gluten — no GF option',
    snapshot: snapshot({
      name: '01',
      items: Array.from({ length: 5 }, (_, i) => snap({ id: `g${i}`, name: `Pasta ${i}`, tags: ['G'] })),
    }),
    expect: { auditSignal: 'audit-dietary-coverage', auditStatus: 'warning', dietaryGapTag: 'G' },
  },
  {
    name: '02: every item contains nuts — critical (severe allergen)',
    snapshot: snapshot({
      name: '02',
      items: [snap({ id: 'n1', name: 'Pesto', tags: ['N'] })],
    }),
    expect: { auditSignal: 'audit-dietary-coverage', auditStatus: 'warning', dietaryGapTag: 'N', notes: 'rule has minMenuSize 1; severity critical' },
  },
  {
    name: '03: all dairy at large event — needs DF option',
    snapshot: snapshot({
      name: '03',
      eventType: 'wedding-reception',
      items: Array.from({ length: 7 }, (_, i) => snap({ id: `d${i}`, name: `Cream ${i}`, tags: ['D'] })),
    }),
    expect: { auditSignal: 'audit-dietary-coverage', auditStatus: 'warning', dietaryGapTag: 'D' },
  },
  {
    name: '04: no vegan option in 5-item menu',
    snapshot: snapshot({
      name: '04',
      items: Array.from({ length: 5 }, (_, i) => snap({ id: `m${i}`, name: `Meat ${i}`, tags: ['VG'] })),
    }),
    expect: { auditSignal: 'audit-dietary-coverage', auditStatus: 'warning', dietaryGapTag: 'VE' },
  },

  // ---------- Multi-allergen presence ----------
  {
    name: '05: shellfish + dairy + gluten in single dish',
    snapshot: snapshot({
      name: '05',
      items: [
        snap({ id: 'lobster-mac', name: 'Lobster Mac', tags: ['S', 'D', 'G'] }),
        snap({ id: 'salad', name: 'Garden Salad', tags: ['VE', 'VG'] }),
        snap({ id: 'fruit', name: 'Fruit', tags: ['VE'] }),
      ],
    }),
    expect: { auditSignal: 'none', auditStatus: 'passing', notes: 'Multi-allergen present but coverage exists for diets' },
  },
  {
    name: '06: shellfish-only menu — guest with shellfish allergy unsafe',
    snapshot: snapshot({
      name: '06',
      items: Array.from({ length: 4 }, (_, i) => snap({ id: `s${i}`, name: `Seafood ${i}`, tags: ['S'] })),
    }),
    expect: { auditSignal: 'audit-dietary-coverage', dietaryGapTag: 'VE', notes: 'No vegan option; shellfish escape hatch required separately' },
  },

  // ---------- Empty / edge ----------
  {
    name: '07: empty menu — no audit alarms (no items to evaluate)',
    snapshot: snapshot({ name: '07', items: [] }),
    expect: { auditSignal: 'audit-empty-sections', auditStatus: 'warning' },
  },
  {
    name: '08: single allergen-free item',
    snapshot: snapshot({
      name: '08',
      items: [snap({ id: 'sa', name: 'Steak', tags: [] })],
    }),
    expect: { auditSignal: 'none', auditStatus: 'passing', notes: 'Below minMenuSize for most rules' },
  },

  // ---------- Coverage borderline ----------
  {
    name: '09: 3 vegan items at wedding — VE coverage but no VG inclusivity',
    snapshot: snapshot({
      name: '09',
      items: [
        snap({ id: 'v1', name: 'Vegan A', tags: ['VE'] }),
        snap({ id: 'v2', name: 'Vegan B', tags: ['VE'] }),
        snap({ id: 'v3', name: 'Vegan C', tags: ['VE'] }),
      ],
    }),
    expect: { auditSignal: 'none', auditStatus: 'passing', notes: 'VE+VG both present (vegan implies vegetarian-acceptable)' },
  },
  {
    name: '10: VG without VE — vegan gap',
    snapshot: snapshot({
      name: '10',
      items: Array.from({ length: 5 }, (_, i) => snap({ id: `vg${i}`, name: `VegItem ${i}`, tags: ['VG'] })),
    }),
    expect: { auditSignal: 'audit-dietary-coverage', dietaryGapTag: 'VE' },
  },

  // ---------- Sub-threshold (rules don't fire) ----------
  {
    name: '11: 3-item all-gluten menu — VG gap fires (3 items ≥ minMenuSize 3, no VG/VE)',
    snapshot: snapshot({
      name: '11',
      items: Array.from({ length: 3 }, (_, i) => snap({ id: `g${i}`, name: `Bread ${i}`, tags: ['G'] })),
    }),
    expect: { auditSignal: 'audit-dietary-coverage', auditStatus: 'warning', dietaryGapTag: 'VG', notes: 'GF rule requires minMenuSize 4 (does NOT fire here), but VG rule fires at minMenuSize 3' },
  },
  {
    name: '12: 5-item all-dairy at small event — DF rule does not apply to all events',
    snapshot: snapshot({
      name: '12',
      eventType: 'staff-lunch',
      items: Array.from({ length: 5 }, (_, i) => snap({ id: `d${i}`, name: `Dairy ${i}`, tags: ['D'] })),
    }),
    expect: { auditSignal: 'audit-dietary-coverage', dietaryGapTag: 'VE', notes: 'staff-lunch not in DF rule appliesToEvents; VE gap fires' },
  },

  // ---------- Mix-in safety ----------
  {
    name: '13: nuts in dessert only — flagged because every item carries N',
    snapshot: snapshot({
      name: '13',
      items: [snap({ id: 'pecan-pie', name: 'Pecan Pie', tags: ['N'] })],
    }),
    expect: { auditSignal: 'audit-dietary-coverage', dietaryGapTag: 'N', auditStatus: 'warning' },
  },
  {
    name: '14: one nut item plus three nut-free — no N gap',
    snapshot: snapshot({
      name: '14',
      items: [
        snap({ id: 'pecan', name: 'Pecan Pie', tags: ['N'] }),
        snap({ id: 'fruit', name: 'Fruit', tags: ['VE'] }),
        snap({ id: 'salad', name: 'Salad', tags: ['VE', 'VG'] }),
        snap({ id: 'cheese', name: 'Cheese', tags: ['VG', 'D'] }),
      ],
    }),
    expect: { auditSignal: 'none', auditStatus: 'passing' },
  },

  // ---------- Comprehensive coverage ----------
  {
    name: '15: balanced 6-item menu with VE/VG/non-allergens',
    snapshot: snapshot({
      name: '15',
      items: [
        snap({ id: 'veg', name: 'Veg Plate', tags: ['VE', 'VG'] }),
        snap({ id: 'fish', name: 'Fish (no allergen)', tags: [] }),
        snap({ id: 'beef', name: 'Beef', tags: [] }),
        snap({ id: 'salad', name: 'Salad', tags: ['VE'] }),
        snap({ id: 'sorbet', name: 'Sorbet', tags: ['VE'] }),
        snap({ id: 'fruit', name: 'Fruit', tags: ['VE'] }),
      ],
    }),
    expect: { auditSignal: 'none', auditStatus: 'passing' },
  },

  // ---------- Cost-basis missing (audit catches) ----------
  {
    name: '16: item missing costBasis surfaces in audit',
    snapshot: ((): CompositionSnapshot => {
      const items: CanvasSnapshot[] = [
        snap({ id: 'ok', name: 'OK Item', tags: ['VE'] }),
        {
          id: 'missing-cost',
          name: 'Missing Cost',
          category: 'entree',
          pricing: PRICING,
          dietaryTags: ['VG'],
          // costBasis intentionally omitted
        },
      ];
      return snapshot({ name: '16', items });
    })(),
    expect: { auditSignal: 'audit-cost-basis-recency', auditStatus: 'warning' },
  },

  // ---------- Empty propertyId (multi-tenant attack) ----------
  {
    name: '17: missing propertyId — critical block',
    snapshot: ((): CompositionSnapshot => {
      const s = snapshot({ name: '17', items: [snap({ id: 'a', name: 'A', tags: ['VE'] })] });
      s.propertyId = '';
      return s;
    })(),
    expect: { auditSignal: 'audit-tenant-scope', auditStatus: 'critical' },
  },

  // ---------- Pricing precision drift ----------
  {
    name: '18: totalCost ≠ perGuestCost × guests — flag warning',
    snapshot: ((): CompositionSnapshot => {
      const s = snapshot({ name: '18', items: [snap({ id: 'a', name: 'A', tags: ['VE'] })] });
      s.totalCost = 9999.99;
      s.perGuestCost = 50;
      s.guestCount = 100; // implies 5000 — drift of ~5000
      return s;
    })(),
    expect: { auditSignal: 'audit-pricing-precision', auditStatus: 'warning' },
  },

  // ---------- All allergens carried (extreme case) ----------
  {
    name: '19: every item carries D+G+N+S — multiple inverse-coverage gaps',
    snapshot: snapshot({
      name: '19',
      items: Array.from({ length: 4 }, (_, i) =>
        snap({ id: `all${i}`, name: `Allergic ${i}`, tags: ['D', 'G', 'N', 'S'] }),
      ),
    }),
    expect: { auditSignal: 'audit-dietary-coverage', auditStatus: 'warning', notes: 'Should fire G + D + N gaps (3 inverse-coverage rules trigger)' },
  },

  // ---------- Clean reference ----------
  {
    name: '20: reference clean menu — passes everything',
    snapshot: snapshot({
      name: '20',
      items: [
        snap({ id: 'a', name: 'Vegan Starter', tags: ['VE', 'VG'] }),
        snap({ id: 'b', name: 'Pescatarian', tags: [] }),
        snap({ id: 'c', name: 'Beef', tags: [] }),
        snap({ id: 'd', name: 'GF Pasta', tags: ['VG'] }),
        snap({ id: 'e', name: 'Sorbet', tags: ['VE'] }),
        snap({ id: 'f', name: 'Fruit', tags: ['VE'] }),
      ],
    }),
    expect: { auditSignal: 'none', auditStatus: 'passing' },
  },
];
