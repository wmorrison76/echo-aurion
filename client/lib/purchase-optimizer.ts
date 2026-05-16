import { listVendorOptionsForIngredient } from "@/lib/vendor-store";
import { optimizeMultiplePacks } from "@/lib/pack-optimizer";
import type { PurchaseDelta } from "@/../shared/types/purchasing";
import type { OptimizedOrderLine } from "@/lib/pack-optimizer";

/**
 * Optimize an entire purchase plan against available vendor options
 * Automatically selects lowest-cost vendors and packs
 */
export function optimizePurchasePlan(
  deltas: PurchaseDelta[],
): OptimizedOrderLine[] {
  return optimizeMultiplePacks(deltas, (ingredientId) =>
    listVendorOptionsForIngredient(ingredientId),
  );
}

/**
 * Compute total cost for optimized orders
 */
export function computeTotalOrderCost(orders: OptimizedOrderLine[]): number {
  return orders.reduce((sum, order) => sum + order.totalCost, 0);
}

/**
 * Compute summary metrics for optimized orders
 */
export function computeOrderSummary(orders: OptimizedOrderLine[]) {
  const totalCost = computeTotalOrderCost(orders);
  const totalItems = orders.reduce((sum, order) => sum + order.packsToOrder, 0);

  return {
    lineCount: orders.length,
    totalPacks: totalItems,
    totalCost,
    averageCostPerLine: orders.length > 0 ? totalCost / orders.length : 0,
  };
}
