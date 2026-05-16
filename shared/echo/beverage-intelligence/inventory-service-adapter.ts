/**
 * Inventory Service Adapter
 * Connects beverage intelligence to actual inventory service
 */

import { getInventoryItem, getInventoryItemsByOrg } from "../../../server/lib/inventory-database";
import type { InventoryItem } from "../../../shared/inventory-types";
import type { InventoryStatus } from "./inventory-aware-recommendations";

/**
 * Get inventory status for items
 */
export async function getInventoryStatuses(
  itemIds: string[],
  orgId: string,
  locationId?: string
): Promise<InventoryStatus[]> {
  const statuses: InventoryStatus[] = [];

  for (const itemId of itemIds) {
    try {
      // Get inventory item from database
      const items = await getInventoryItemsByOrg(orgId, {
        productId: itemId,
        locationId,
        activeOnly: true,
      });

      if (items.length > 0) {
        const item = items[0];
        const parLevel = item.par_level || item.on_hand_qty * 2;
        const reorderPoint = item.reorder_qty || parLevel * 0.3;
        const leadTimeDays = item.lead_time_days || 7;

        statuses.push({
          itemId: item.id,
          currentQuantity: item.on_hand_qty,
          reorderPoint,
          parLevel,
          leadTimeDays,
          lastOrderedAt: item.last_ordered_at || undefined,
          lastReceivedAt: item.last_received_at || undefined,
          status: item.on_hand_qty === 0
            ? "out_of_stock"
            : item.on_hand_qty <= reorderPoint
            ? "low_stock"
            : "in_stock",
        });
      } else {
        // Item not found in inventory
        statuses.push({
          itemId,
          currentQuantity: 0,
          reorderPoint: 0,
          parLevel: 0,
          leadTimeDays: 7,
          status: "out_of_stock",
        });
      }
    } catch (error) {
      console.error(`[InventoryAdapter] Failed to get status for item ${itemId}:`, error);
      // Return default out of stock status
      statuses.push({
        itemId,
        currentQuantity: 0,
        reorderPoint: 0,
        parLevel: 0,
        leadTimeDays: 7,
        status: "out_of_stock",
      });
    }
  }

  return statuses;
}

/**
 * Get inventory status for a single item
 */
export async function getInventoryStatus(
  itemId: string,
  orgId: string,
  locationId?: string
): Promise<InventoryStatus | null> {
  const statuses = await getInventoryStatuses([itemId], orgId, locationId);
  return statuses[0] || null;
}
