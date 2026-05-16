/**
 * pricingEngine.ts
 * ----------------------------------------------------------------------------
 * Per-item and menu-level pricing math for the composition canvas.
 *
 * Delegates the underlying per-kind calculation to Pkg 2's utils/pricing
 * (single source of truth for pricing math across BMB). This file owns the
 * higher-order responsibilities the canvas needs: per-item breakdown,
 * margin computation, market-price flagging, override handling, and
 * menu-level aggregation.
 * ----------------------------------------------------------------------------
 */

import type { CanvasSnapshot, PricingModel } from '../BanquetMenuBuilder.types';
import type { ComposedItem } from '../hooks/useCompositionStore';
import { calculateTotalCost } from '../utils/pricing';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface ItemPricingResult {
  instanceId: string;
  itemId: string;
  itemName: string;
  /** What this single composed entry contributes to the total */
  totalContribution: number;
  /** Per-guest contribution (totalContribution / guestCount) */
  perGuestContribution: number;
  /** The kind that was applied — useful for displaying badges */
  pricingKind: PricingModel['kind'];
  /** Effective unit cost (per-guest equivalent) from costBasis */
  effectiveUnitCost: number;
  /** Margin = (price - cost) / price; null if cost unknown */
  margin: number | null;
  /** Did the user override the price for this instance? */
  isOverride: boolean;
  /** True if the item is priced "market" (lastQuoted may be stale) */
  isMarketPrice: boolean;
}

export interface MenuPricingTotals {
  totalCost: number;
  perGuestCost: number;
  /** budgetTotal - totalCost (negative = over budget) */
  budgetDelta: number;
  /** Percentage of budget consumed (0..1+ — can exceed 1 when over budget) */
  budgetUtilization: number;
  /** Aggregated weighted margin across the menu */
  weightedMargin: number | null;
  items: ItemPricingResult[];
  /** True if any item has kind 'market-price' (price not finalized) */
  hasMarketPriceItems: boolean;
}

// ----------------------------------------------------------------------------
// Per-item pricing
// ----------------------------------------------------------------------------

export function computeItemPricing(
  composed: ComposedItem,
  guestCount: number,
): ItemPricingResult {
  const snapshot = composed.itemSnapshot;
  const pricing = snapshot.pricing;
  const isOverride = composed.priceOverride !== undefined;
  const isMarketPrice = pricing.kind === 'market-price';

  let totalContribution = 0;

  if (isOverride) {
    totalContribution = (composed.priceOverride ?? 0) * guestCount;
  } else {
    const total = calculateTotalCost(pricing, guestCount);
    totalContribution = total ? total.amount : 0;
  }

  const perGuestContribution =
    guestCount > 0 ? totalContribution / guestCount : 0;

  const effectiveUnitCost = computeEffectiveUnitCost(snapshot);
  const margin =
    effectiveUnitCost > 0 && perGuestContribution > 0
      ? (perGuestContribution - effectiveUnitCost) / perGuestContribution
      : null;

  return {
    instanceId: composed.instanceId,
    itemId: composed.itemId,
    itemName: snapshot.name,
    totalContribution: round2(totalContribution),
    perGuestContribution: round2(perGuestContribution),
    pricingKind: pricing.kind,
    effectiveUnitCost: round2(effectiveUnitCost),
    margin: margin !== null ? round4(margin) : null,
    isOverride,
    isMarketPrice,
  };
}

// ----------------------------------------------------------------------------
// Cost basis
// ----------------------------------------------------------------------------

// Treats CanvasSnapshot.costBasis as the per-guest equivalent cost.
// TODO: when PropertyItem gains structured cost (rawFoodCostPerUnit +
// portionPerGuest + yieldFactor), surface those on CanvasSnapshot and
// restore yield-aware costing here.
function computeEffectiveUnitCost(snapshot: CanvasSnapshot): number {
  return snapshot.costBasis?.amount ?? 0;
}

// ----------------------------------------------------------------------------
// Menu-level totals
// ----------------------------------------------------------------------------

export function computeMenuPricing(
  composedItems: ComposedItem[],
  guestCount: number,
  budgetTotal: number,
): MenuPricingTotals {
  const items = composedItems.map((c) => computeItemPricing(c, guestCount));

  const totalCost = items.reduce((sum, i) => sum + i.totalContribution, 0);
  const perGuestCost = guestCount > 0 ? totalCost / guestCount : 0;
  const budgetDelta = budgetTotal - totalCost;
  const budgetUtilization = budgetTotal > 0 ? totalCost / budgetTotal : 0;
  const hasMarketPriceItems = items.some((i) => i.isMarketPrice);

  const itemsWithMargin = items.filter((i) => i.margin !== null);
  const totalContribOfMargined = itemsWithMargin.reduce(
    (sum, i) => sum + i.totalContribution,
    0,
  );
  const weightedMargin =
    totalContribOfMargined > 0
      ? itemsWithMargin.reduce(
          (sum, i) => sum + (i.margin ?? 0) * i.totalContribution,
          0,
        ) / totalContribOfMargined
      : null;

  return {
    totalCost: round2(totalCost),
    perGuestCost: round2(perGuestCost),
    budgetDelta: round2(budgetDelta),
    budgetUtilization: round4(budgetUtilization),
    weightedMargin: weightedMargin !== null ? round4(weightedMargin) : null,
    items,
    hasMarketPriceItems,
  };
}

// ----------------------------------------------------------------------------
// Formatting helpers (used by UI; kept here for cohesion)
// ----------------------------------------------------------------------------

export function formatCurrency(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function formatPerGuest(amount: number, currency = 'USD'): string {
  return `${formatCurrency(amount, currency)}/guest`;
}

export function formatPercent(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

// ----------------------------------------------------------------------------
// Internal — rounding
// ----------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
