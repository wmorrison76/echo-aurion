/**
 * useLivePricing.ts
 * ----------------------------------------------------------------------------
 * Returns the live pricing totals derived from the composition store.
 *
 * Memoization rule:
 *   This hook must NEVER recompute on every render. It only recomputes
 *   when the relevant slice of state changes:
 *     - items (any add/remove/override)
 *     - guestCount
 *     - budgetTotal
 *
 * Performance: with 50 items in the menu the engine runs in <1ms, so we
 * don't need worker offloading. Keep it simple.
 * ----------------------------------------------------------------------------
 */

import { useMemo } from 'react';
import { useCompositionStore, selectAllComposedItems } from './useCompositionStore';
import { computeMenuPricing, type MenuPricingTotals } from '../services/pricingEngine';

export function useLivePricing(): MenuPricingTotals {
  const items = useCompositionStore(selectAllComposedItems);
  const guestCount = useCompositionStore((s) => s.meta.guestCount);
  const budgetTotal = useCompositionStore((s) => s.meta.budgetTotal);

  return useMemo(
    () => computeMenuPricing(items, guestCount, budgetTotal),
    [items, guestCount, budgetTotal],
  );
}
