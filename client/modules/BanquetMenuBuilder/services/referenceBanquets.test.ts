/**
 * Gate 1: Financial Precision — reference banquet fixtures.
 *
 * Each fixture in __fixtures__/referenceBanquets.ts has hand-calculated
 * pricing math. These tests assert the engine's output matches to $0.01
 * (totalCost) and the documented precision for derived metrics.
 *
 * If any of these fail, do NOT update `expected` to match the engine.
 * Either find the bug, or recompute by hand and update the fixture
 * comment + expected together.
 */

import { describe, expect, it } from 'vitest';
import { computeMenuPricing } from './pricingEngine';
import { ALL_REFERENCE_BANQUETS } from './__fixtures__/referenceBanquets';

describe.each(ALL_REFERENCE_BANQUETS)('Reference banquet $name', ({ fixture }) => {
  const result = computeMenuPricing(
    fixture.items,
    fixture.guestCount,
    fixture.budgetTotal,
  );

  it('totalCost matches hand-calculated value to $0.01', () => {
    expect(result.totalCost).toBeCloseTo(fixture.expected.totalCost, 2);
  });

  it('perGuestCost matches hand-calculated value', () => {
    expect(result.perGuestCost).toBeCloseTo(fixture.expected.perGuestCost, 2);
  });

  it('budgetDelta = budgetTotal - totalCost', () => {
    expect(result.budgetDelta).toBeCloseTo(fixture.expected.budgetDelta, 2);
  });

  it('budgetUtilization = totalCost / budgetTotal (4 decimals)', () => {
    expect(result.budgetUtilization).toBeCloseTo(
      fixture.expected.budgetUtilization,
      4,
    );
  });

  it('weightedMargin matches hand-calculated value (within 0.005)', () => {
    expect(result.weightedMargin).not.toBeNull();
    expect(result.weightedMargin!).toBeCloseTo(
      fixture.expected.weightedMargin,
      2,
    );
  });

  it('hasMarketPriceItems flag', () => {
    expect(result.hasMarketPriceItems).toBe(fixture.expected.hasMarketPriceItems);
  });
});
