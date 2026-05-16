/**
 * Reference banquet fixtures — hand-calculated to $0.01 precision.
 * Used by Gate 1 (Financial Precision) audit. Each fixture defines:
 *   - The composed items + sections
 *   - The expected MenuPricingTotals down to the cent
 *
 * Edit policy: NEVER change `expected` to make a failing test pass. If
 * pricing math changes, recompute expected by hand (or refuse the change
 * if the new math is wrong). This file is the source of truth for what
 * "correct" means.
 */

import type { ComposedItem } from '../../hooks/useCompositionStore';
import type { CanvasSnapshot, PricingModel } from '../../BanquetMenuBuilder.types';

function snapshot(args: {
  id: string;
  name: string;
  pricing: PricingModel;
  costBasis?: number;
}): CanvasSnapshot {
  return {
    id: args.id,
    name: args.name,
    category: 'entree',
    pricing: args.pricing,
    costBasis: args.costBasis !== undefined
      ? { amount: args.costBasis, currency: 'USD' }
      : undefined,
    dietaryTags: [],
  };
}

function composed(snap: CanvasSnapshot, instanceSuffix: string): ComposedItem {
  return {
    instanceId: `inst-${snap.id}-${instanceSuffix}`,
    itemId: snap.id,
    itemSnapshot: snap,
    order: 0,
  };
}

// ----------------------------------------------------------------------------
// Banquet A — 100-guest plated dinner, mixed dietary
// ----------------------------------------------------------------------------
//
// Composition:
//   1. Heirloom Tomato & Burrata    per-guest $14   cost $5.50
//   2. Pan-Seared Branzino          per-guest $48   cost $19.00
//   3. Cauliflower Steak (vegan alt)per-guest $26   cost $7.00
//   4. Olive Oil Cake               per-guest $9    cost $2.75
//
// Per-guest cost = 14 + 48 + 26 + 9 = $97
//   (Note: branzino/cauliflower are alternatives, but for v1 pricing
//   math both contribute. Real menus would use selectionRule to gate.)
// Total cost = $97 × 100 = $9700.00
// Margins per item:
//   Burrata   : (14 - 5.50)/14    = 0.6071...
//   Branzino  : (48 - 19.00)/48   = 0.6042...
//   Cauliflower: (26 - 7.00)/26   = 0.7308...
//   Cake      : (9 - 2.75)/9      = 0.6944...
// Weighted margin = (0.6071*1400 + 0.6042*4800 + 0.7308*2600 + 0.6944*900) / 9700
//                 = (850 + 2900 + 1900 + 625) / 9700
//                 ≈ 6275 / 9700 ≈ 0.6469

export const banquetA = {
  guestCount: 100,
  budgetTotal: 12000,
  items: [
    composed(
      snapshot({
        id: 'A-burrata',
        name: 'Heirloom Tomato & Burrata',
        pricing: { kind: 'per-guest', price: { amount: 14, currency: 'USD' } },
        costBasis: 5.5,
      }),
      'a',
    ),
    composed(
      snapshot({
        id: 'A-branzino',
        name: 'Pan-Seared Branzino',
        pricing: { kind: 'per-guest', price: { amount: 48, currency: 'USD' } },
        costBasis: 19,
      }),
      'a',
    ),
    composed(
      snapshot({
        id: 'A-cauliflower',
        name: 'Cauliflower Steak',
        pricing: { kind: 'per-guest', price: { amount: 26, currency: 'USD' } },
        costBasis: 7,
      }),
      'a',
    ),
    composed(
      snapshot({
        id: 'A-cake',
        name: 'Olive Oil Cake',
        pricing: { kind: 'per-guest', price: { amount: 9, currency: 'USD' } },
        costBasis: 2.75,
      }),
      'a',
    ),
  ],
  expected: {
    totalCost: 9700.0,
    perGuestCost: 97.0,
    budgetDelta: 2300.0,
    budgetUtilization: 0.8083,
    weightedMargin: 0.6469,
    hasMarketPriceItems: false,
  },
};

// ----------------------------------------------------------------------------
// Banquet B — 250-guest reception, 5 stations (flat-fee per station)
// ----------------------------------------------------------------------------
//
// Composition (all flat-fee — total / guests):
//   1. Carving station          flat $1500  (serves all)  cost $620
//   2. Raw bar                  flat $2200                cost $880
//   3. Pasta station            flat $1100                cost $410
//   4. Cheese & charcuterie     flat $850                 cost $340
//   5. Dessert table            flat $750                 cost $300
//
// Total = 1500 + 2200 + 1100 + 850 + 750 = $6400.00
// Per-guest = 6400 / 250 = $25.60
//
// Per-guest cost contribution per item (computeItemPricing per-guest):
//   carving:    1500/250 = 6.00
//   raw bar:    2200/250 = 8.80
//   pasta:      1100/250 = 4.40
//   cheese:     850/250  = 3.40
//   dessert:    750/250  = 3.00
//
// Margins (treating costBasis as per-guest cost):
//   carving:    (6.00 - 620/250) / 6.00  = (6.00 - 2.48)/6.00   = 0.5867
//   raw bar:    (8.80 - 880/250) / 8.80  = (8.80 - 3.52)/8.80   = 0.6000
//   pasta:      (4.40 - 410/250) / 4.40  = (4.40 - 1.64)/4.40   = 0.6273
//   cheese:     (3.40 - 340/250) / 3.40  = (3.40 - 1.36)/3.40   = 0.6000
//   dessert:    (3.00 - 300/250) / 3.00  = (3.00 - 1.20)/3.00   = 0.6000
//
// IMPORTANT NOTE: per current pricingEngine, costBasis is treated as a
// per-guest equivalent cost (not divided). For flat-fee items this means
// the costBasis SHOULD already be the per-guest equivalent. So in the
// fixture, costBasis values are entered as per-guest (not flat). This
// matches Pkg 1's PricingMetadata.costBasis semantics today; revisit when
// structured cost lands.
//
// Per-guest costBasis values used:
//   carving: 2.48, raw bar: 3.52, pasta: 1.64, cheese: 1.36, dessert: 1.20
//
// Weighted margin =
//   (0.5867*1500 + 0.6000*2200 + 0.6273*1100 + 0.6000*850 + 0.6000*750) / 6400
//   = (880 + 1320 + 690 + 510 + 450) / 6400
//   = 3850 / 6400
//   ≈ 0.6016

export const banquetB = {
  guestCount: 250,
  budgetTotal: 8000,
  items: [
    composed(
      snapshot({
        id: 'B-carving',
        name: 'Carving Station',
        pricing: { kind: 'flat-fee', price: { amount: 1500, currency: 'USD' }, serves: '250 guests' },
        costBasis: 2.48,
      }),
      'b',
    ),
    composed(
      snapshot({
        id: 'B-rawbar',
        name: 'Raw Bar',
        pricing: { kind: 'flat-fee', price: { amount: 2200, currency: 'USD' }, serves: '250 guests' },
        costBasis: 3.52,
      }),
      'b',
    ),
    composed(
      snapshot({
        id: 'B-pasta',
        name: 'Pasta Station',
        pricing: { kind: 'flat-fee', price: { amount: 1100, currency: 'USD' }, serves: '250 guests' },
        costBasis: 1.64,
      }),
      'b',
    ),
    composed(
      snapshot({
        id: 'B-cheese',
        name: 'Cheese & Charcuterie',
        pricing: { kind: 'flat-fee', price: { amount: 850, currency: 'USD' }, serves: '250 guests' },
        costBasis: 1.36,
      }),
      'b',
    ),
    composed(
      snapshot({
        id: 'B-dessert',
        name: 'Dessert Table',
        pricing: { kind: 'flat-fee', price: { amount: 750, currency: 'USD' }, serves: '250 guests' },
        costBasis: 1.2,
      }),
      'b',
    ),
  ],
  expected: {
    totalCost: 6400.0,
    perGuestCost: 25.6,
    budgetDelta: 1600.0,
    budgetUtilization: 0.8,
    weightedMargin: 0.6016,
    hasMarketPriceItems: false,
  },
};

// ----------------------------------------------------------------------------
// Banquet C — 50-guest tasting menu (per-piece + per-guest mix)
// ----------------------------------------------------------------------------
//
// Composition:
//   1. Caviar service          per-piece $35 (default piecesPerGuest=1)  cost $14
//   2. Tasting flight wine     per-guest $45                              cost $18
//   3. Truffle pasta           per-guest $32                              cost $11
//   4. Cheese course           per-piece $18 (1/guest)                    cost $7
//   5. Petit fours             per-piece $9  (1/guest)                    cost $3
//
// Per-guest contributions:
//   caviar : 35
//   wine   : 45
//   pasta  : 32
//   cheese : 18
//   petits : 9
//   total per-guest = 139
// Total = 139 × 50 = $6950.00
//
// Margins per item:
//   caviar : (35 - 14)/35 = 0.6
//   wine   : (45 - 18)/45 = 0.6
//   pasta  : (32 - 11)/32 = 0.65625
//   cheese : (18 - 7)/18  = 0.6111
//   petits : (9 - 3)/9    = 0.6667
//
// Total contributions:
//   caviar : 35 * 50 = 1750
//   wine   : 45 * 50 = 2250
//   pasta  : 32 * 50 = 1600
//   cheese : 18 * 50 = 900
//   petits : 9 * 50  = 450
//
// Weighted margin = (0.6*1750 + 0.6*2250 + 0.65625*1600 + 0.6111*900 + 0.6667*450) / 6950
//                 = (1050 + 1350 + 1050 + 550 + 300) / 6950
//                 = 4300 / 6950
//                 ≈ 0.6187

export const banquetC = {
  guestCount: 50,
  budgetTotal: 7500,
  items: [
    composed(
      snapshot({
        id: 'C-caviar',
        name: 'Caviar Service',
        pricing: { kind: 'per-piece', price: { amount: 35, currency: 'USD' }, minOrder: 1 },
        costBasis: 14,
      }),
      'c',
    ),
    composed(
      snapshot({
        id: 'C-wine',
        name: 'Tasting Flight',
        pricing: { kind: 'per-guest', price: { amount: 45, currency: 'USD' } },
        costBasis: 18,
      }),
      'c',
    ),
    composed(
      snapshot({
        id: 'C-pasta',
        name: 'Truffle Pasta',
        pricing: { kind: 'per-guest', price: { amount: 32, currency: 'USD' } },
        costBasis: 11,
      }),
      'c',
    ),
    composed(
      snapshot({
        id: 'C-cheese',
        name: 'Cheese Course',
        pricing: { kind: 'per-piece', price: { amount: 18, currency: 'USD' }, minOrder: 1 },
        costBasis: 7,
      }),
      'c',
    ),
    composed(
      snapshot({
        id: 'C-petits',
        name: 'Petit Fours',
        pricing: { kind: 'per-piece', price: { amount: 9, currency: 'USD' }, minOrder: 1 },
        costBasis: 3,
      }),
      'c',
    ),
  ],
  expected: {
    totalCost: 6950.0,
    perGuestCost: 139.0,
    budgetDelta: 550.0,
    budgetUtilization: 0.9267,
    weightedMargin: 0.6187,
    hasMarketPriceItems: false,
  },
};

export const ALL_REFERENCE_BANQUETS = [
  { name: 'A: 100-guest plated dinner, mixed dietary', fixture: banquetA },
  { name: 'B: 250-guest reception, 5 stations', fixture: banquetB },
  { name: 'C: 50-guest tasting menu', fixture: banquetC },
];
