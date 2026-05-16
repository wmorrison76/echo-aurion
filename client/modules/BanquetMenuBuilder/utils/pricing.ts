/**
 * Pricing Utilities
 *
 * Helpers for working with the various pricing models defined in the
 * schema. Currency formatting, model-specific math, percentile lookups,
 * margin calculations, and aggregations.
 */

import type { Money, PricingModel } from '../BanquetMenuBuilder.types';

// =====================================================
// Money Construction & Formatting
// =====================================================

/**
 * Create a Money object from a number.
 */
export function money(amount: number, currency: 'USD' = 'USD'): Money {
  return { amount, currency };
}

/**
 * Format money for display.
 * Examples:
 *   formatMoney(178)  → "$178"
 *   formatMoney(178.5) → "$178.50"
 *   formatMoney(178, { compact: true }) → "$178"
 */
export function formatMoney(
  m: Money | number,
  options: { compact?: boolean; showCents?: boolean } = {}
): string {
  const amount = typeof m === 'number' ? m : m.amount;
  const showCents = options.showCents ?? !Number.isInteger(amount);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(amount);
}

/**
 * Add two Money objects (returns new Money).
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add money of different currencies: ${a.currency} + ${b.currency}`);
  }
  return { amount: a.amount + b.amount, currency: a.currency };
}

/**
 * Multiply Money by a scalar (e.g., per-guest × guest count).
 */
export function multiplyMoney(m: Money, multiplier: number): Money {
  return { amount: m.amount * multiplier, currency: m.currency };
}

// =====================================================
// Pricing Model Resolution
// =====================================================

/**
 * Get the displayable single price from any pricing model.
 * For variable models (per-guest, per-piece), returns the unit price.
 * For market-price, returns the last quoted (or null).
 * For package-tier, returns the lowest tier.
 */
export function resolveDisplayPrice(model: PricingModel): Money | null {
  switch (model.kind) {
    case 'per-guest':
    case 'per-dozen':
    case 'per-piece':
    case 'per-gallon':
    case 'per-bottle':
    case 'per-drink':
    case 'flat-fee':
      return model.price;
    case 'market-price':
      return model.lastQuoted ?? null;
    case 'package-tier':
      return model.tiers[0]?.price ?? null;
    case 'add-on':
      return model.basePrice;
  }
}

/**
 * Get the display label for a pricing model.
 * Examples:
 *   "$32 per guest"
 *   "$169 per dozen"
 *   "$8 add-on"
 *   "Market Price"
 */
export function formatPricingModel(model: PricingModel): string {
  const price = resolveDisplayPrice(model);
  const priceStr = price ? formatMoney(price) : '';

  switch (model.kind) {
    case 'per-guest':
      return `${priceStr} per guest`;
    case 'per-dozen':
      return `${priceStr} per dozen`;
    case 'per-piece':
      return `${priceStr} per piece`;
    case 'per-gallon':
      return `${priceStr} per gallon`;
    case 'per-bottle':
      return `${priceStr} per bottle`;
    case 'per-drink':
      return `${priceStr} per drink`;
    case 'flat-fee':
      return `${priceStr} (serves ${model.serves})`;
    case 'market-price':
      return price ? `Market Price (last: ${priceStr})` : 'Market Price';
    case 'package-tier':
      return model.tiers
        .map((t) => `${t.hours}hr ${formatMoney(t.price)}`)
        .join(' / ');
    case 'add-on':
      return `${priceStr} add-on (per ${model.appliedTo})`;
  }
}

// =====================================================
// Per-Guest Calculations
// =====================================================

/**
 * Calculate the per-guest cost of a single item, given the model and guest count.
 * For per-guest items, returns the unit price directly.
 * For per-dozen items, divides by guests-per-dozen ratio.
 * For per-piece items, assumes one piece per guest unless specified.
 * Returns null for non-quantifiable models (market-price without quote).
 */
export function calculatePerGuestCost(
  model: PricingModel,
  guestCount: number,
  options: { piecesPerGuest?: number } = {}
): Money | null {
  if (guestCount <= 0) return null;

  switch (model.kind) {
    case 'per-guest':
      return model.price;
    case 'per-dozen': {
      // 1 dozen serves roughly 12 guests; pieces per guest defaults to 1
      const dozensNeeded = Math.ceil((guestCount * (options.piecesPerGuest ?? 1)) / 12);
      const totalCost = dozensNeeded * model.price.amount;
      return money(totalCost / guestCount);
    }
    case 'per-piece': {
      const piecesPerGuest = options.piecesPerGuest ?? 1;
      return money(model.price.amount * piecesPerGuest);
    }
    case 'flat-fee': {
      return money(model.price.amount / guestCount);
    }
    case 'add-on':
      return model.basePrice;
    default:
      return null;
  }
}

/**
 * Calculate total cost for a given quantity of a per-guest/per-piece item.
 */
export function calculateTotalCost(model: PricingModel, guestCount: number): Money | null {
  const perGuest = calculatePerGuestCost(model, guestCount);
  if (!perGuest) return null;
  return multiplyMoney(perGuest, guestCount);
}

// =====================================================
// Margin Calculations
// =====================================================

/**
 * Calculate margin percentage from price and cost basis.
 *   Margin% = (price - cost) / price × 100
 */
export function calculateMarginPct(price: Money, costBasis: Money): number {
  if (price.amount <= 0) return 0;
  return ((price.amount - costBasis.amount) / price.amount) * 100;
}

/**
 * Determine the price needed to achieve a target margin.
 *   Price = cost / (1 - targetMarginPct/100)
 */
export function priceForTargetMargin(costBasis: Money, targetMarginPct: number): Money {
  if (targetMarginPct >= 100) {
    throw new Error('Target margin cannot be 100% or higher');
  }
  return money(costBasis.amount / (1 - targetMarginPct / 100));
}

// =====================================================
// Network Percentile Helpers
// =====================================================

/**
 * Format a network percentile for display.
 *   formatNetworkPercentile(72) → "p72"
 *   formatNetworkPercentile(50) → "median"
 *   formatNetworkPercentile(95) → "p95 (top 5%)"
 */
export function formatNetworkPercentile(percentile: number | null | undefined): string {
  if (percentile === null || percentile === undefined) return '';
  const rounded = Math.round(percentile);
  if (rounded === 50) return 'median';
  if (rounded >= 90) return `p${rounded} (top ${100 - rounded}%)`;
  if (rounded <= 10) return `p${rounded} (bottom ${rounded}%)`;
  return `p${rounded}`;
}

/**
 * Categorize a network percentile into pricing position labels.
 */
export function categorizePercentile(
  percentile: number | null | undefined
): 'value' | 'competitive' | 'premium' | 'super-premium' | 'unknown' {
  if (percentile === null || percentile === undefined) return 'unknown';
  if (percentile <= 25) return 'value';
  if (percentile <= 60) return 'competitive';
  if (percentile <= 85) return 'premium';
  return 'super-premium';
}

// =====================================================
// Menu-Wide Aggregations
// =====================================================

/**
 * Sum per-guest costs across multiple items for a single guest's portion.
 * Used to calculate the menu's estimated per-guest price.
 */
export function aggregatePerGuestPrice(
  models: PricingModel[],
  guestCount: number
): Money {
  let total = 0;
  models.forEach((m) => {
    const perGuest = calculatePerGuestCost(m, guestCount);
    if (perGuest) total += perGuest.amount;
  });
  return money(total);
}

/**
 * Calculate budget utilization percentage.
 *   utilization = actualPerGuest / budgetPerGuest × 100
 */
export function budgetUtilization(actual: Money, budget: Money): number {
  if (budget.amount <= 0) return 0;
  return (actual.amount / budget.amount) * 100;
}

/**
 * Determine budget status against a target.
 */
export function budgetStatus(
  actual: Money,
  budget: Money,
  toleranceLowPct = 5,
  toleranceHighPct = 0
): 'under' | 'within' | 'over' {
  const util = budgetUtilization(actual, budget);
  if (util < 100 - toleranceLowPct) return 'under';
  if (util > 100 + toleranceHighPct) return 'over';
  return 'within';
}
