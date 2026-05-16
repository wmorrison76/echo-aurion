import type { PurchaseDelta } from "@/../shared/types/purchasing";
import type { VendorPack } from "@/../shared/types/vendor";

/**
 * Optimized order line
 * Result of selecting the best vendor pack for a purchase delta
 */
export type OptimizedOrderLine = {
  ingredientId: string;
  ingredientName: string;

  vendorId: string;
  vendorName: string;
  packSize: number;
  packUnit: string;

  packsToOrder: number;
  totalQuantity: number;
  totalCost: number;

  costPerUnit: number; // for comparison
};

/**
 * Optimize a single purchase delta against available vendor packs
 * Selects the lowest total cost option
 */
export function optimizePacks(
  delta: PurchaseDelta,
  vendorOptions: VendorPack[],
): OptimizedOrderLine | null {
  // No order needed or no vendor options available
  if (!vendorOptions.length || delta.toOrder <= 0) {
    return null;
  }

  // Calculate pack requirements for each vendor option
  const ranked = vendorOptions
    .map((pack) => {
      const packsNeeded = Math.ceil(delta.toOrder / pack.packSize);
      const totalCost = packsNeeded * pack.pricePerPack;

      return {
        pack,
        packsNeeded,
        totalCost,
        costPerUnit: pack.effectiveUnitCost,
      };
    })
    .sort((a, b) => a.totalCost - b.totalCost); // Sort by lowest total cost

  const best = ranked[0];

  return {
    ingredientId: delta.ingredientId,
    ingredientName: delta.ingredientName,

    vendorId: best.pack.vendorId,
    vendorName: best.pack.vendorName,
    packSize: best.pack.packSize,
    packUnit: best.pack.packUnit,

    packsToOrder: best.packsNeeded,
    totalQuantity: best.packsNeeded * best.pack.packSize,
    totalCost: best.totalCost,

    costPerUnit: best.costPerUnit,
  };
}

/**
 * Optimize multiple purchase deltas
 */
export function optimizeMultiplePacks(
  deltas: PurchaseDelta[],
  vendorLookup: (ingredientId: string) => VendorPack[],
): OptimizedOrderLine[] {
  return deltas
    .map((delta) => optimizePacks(delta, vendorLookup(delta.ingredientId)))
    .filter((line): line is OptimizedOrderLine => line !== null);
}
