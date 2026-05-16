/**
 * Apply Inventory Offsets to Procurement Demand
 * Reduces net procurement need by on-hand and on-order inventory
 */

import type {
  InventoryOffset,
  InventoryOffsetsSnapshot,
} from "@/../shared/types/genesis-procurement";
import type { DemandItem } from "@/../shared/types/genesis-orchestrator";

export interface OffsetApplication {
  demandId: string;
  offsetId: string;
  itemKey: string;
  originalQty: number;
  offsetQty: number;
  netQty: number;
  notes: string;
}

/**
 * Apply all available offsets to demand items
 * Returns: array of OffsetApplications describing adjustments
 */
export function applyInventoryOffsets(
  demands: DemandItem[],
  offsets: InventoryOffsetsSnapshot,
): {
  adjustedDemands: DemandItem[];
  offsetApplications: OffsetApplication[];
} {
  const adjustedDemands = [...demands];
  const offsetApplications: OffsetApplication[] = [];

  // Group offsets by item key for fast lookup
  const offsetsByItem = new Map<string, InventoryOffset[]>();
  offsets.offsets.forEach((offset) => {
    if (!offsetsByItem.has(offset.itemKey)) {
      offsetsByItem.set(offset.itemKey, []);
    }
    offsetsByItem.get(offset.itemKey)!.push(offset);
  });

  // Process each demand
  adjustedDemands.forEach((demand) => {
    const relevantOffsets = offsetsByItem.get(demand.itemKey) || [];

    // Sum available offsets for this item
    let totalOffsetQty = 0;
    const appliedOffsets: InventoryOffset[] = [];

    for (const offset of relevantOffsets) {
      if (offset.expiresAt && new Date(offset.expiresAt) < new Date()) {
        continue; // Skip expired offsets
      }

      const availableQty = offset.onHandQty + offset.onOrderQty;
      totalOffsetQty += availableQty;
      appliedOffsets.push(offset);
    }

    // Calculate net quantity
    const netQty = Math.max(0, demand.quantity - totalOffsetQty);
    const offsetQty = demand.quantity - netQty;

    if (offsetQty > 0) {
      // Record offset application
      offsetApplications.push({
        demandId: demand.demandId,
        offsetId: appliedOffsets.map((o) => o.offsetId).join(","),
        itemKey: demand.itemKey,
        originalQty: demand.quantity,
        offsetQty,
        netQty,
        notes: `Applied ${offsetQty} units offset (${appliedOffsets.map((o) => o.locationId).join(", ")})`,
      });

      // Update demand quantity
      demand.quantityOffset = offsetQty;
      demand.totalQuantity = netQty;
      demand.quantity = netQty;
    }
  });

  return {
    adjustedDemands,
    offsetApplications,
  };
}

/**
 * Filter out zero-quantity demands (after offset application)
 */
export function filterZeroDemands(demands: DemandItem[]): DemandItem[] {
  return demands.filter((d) => d.quantity > 0);
}

/**
 * Check if an offset is still valid
 */
export function isOffsetValid(offset: InventoryOffset): boolean {
  if (offset.expiresAt && new Date(offset.expiresAt) < new Date()) {
    return false;
  }
  return offset.onHandQty + offset.onOrderQty > 0;
}

/**
 * Get total offset available for an item across all locations
 */
export function getTotalOffsetForItem(
  itemKey: string,
  offsets: InventoryOffsetsSnapshot,
): number {
  return offsets.offsets
    .filter((o) => o.itemKey === itemKey && isOffsetValid(o))
    .reduce((sum, o) => sum + o.onHandQty + o.onOrderQty, 0);
}
