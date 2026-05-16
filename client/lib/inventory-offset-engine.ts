/**
 * Genesis G — Inventory Offset Engine (Deterministic v1)
 *
 * Takes procurement lines and applies inventory offsets:
 * toOrder = max(0, required - (onHand + onOrder))
 *
 * Location selection rules are v1 deterministic and upgradeable via Genesis D rules later.
 */

import type { ProcurementLine } from "@/../shared/types/procurement-calendar";
import { getInventoryState } from "@/lib/inventory-store";
import { listIFOs as listIFOsFromStore } from "@/lib/ifo-store";

export interface InventoryLookupRule {
  // Which location to check first
  locationId: string;

  // Optional fallback locations if ingredient not found in primary
  fallbackLocationIds?: string[];
}

/**
 * Find on-hand and on-order quantities for an ingredient at a location.
 * Returns null if not found.
 */
function findQty(
  locationId: string,
  ingredientName: string,
  unit: string,
): { onHandQty: number; onOrderQty: number } | null {
  const state = getInventoryState(locationId);
  const hit = state.find(
    (x) => x.ingredientName === ingredientName && x.unit === unit,
  );

  if (!hit) return null;

  return {
    onHandQty: hit.onHandQty,
    onOrderQty: hit.onOrderQty,
  };
}

/**
 * Apply inventory offsets to procurement lines.
 * For each line, subtract on-hand + on-order from required quantity.
 *
 * @param args.lines - Procurement lines from Genesis C plan
 * @param args.rule - Location lookup rule (primary + fallback locations)
 * @returns New array of lines with adjusted requiredQty and populated on-hand/on-order
 */
export function applyInventoryOffsets(args: {
  lines: ProcurementLine[];
  rule: InventoryLookupRule;
}): ProcurementLine[] {
  const { lines, rule } = args;

  return lines.map((line) => {
    // Try to find inventory in primary location
    let qty = findQty(rule.locationId, line.ingredientName, line.unit);

    // If not found and we have fallbacks, try them in order
    if (!qty && rule.fallbackLocationIds?.length) {
      for (const fallbackId of rule.fallbackLocationIds) {
        const fallbackQty = findQty(fallbackId, line.ingredientName, line.unit);
        if (fallbackQty) {
          qty = fallbackQty;
          break;
        }
      }
    }

    // If still not found, default to zero
    const onHand = qty?.onHandQty ?? 0;
    const onOrder = qty?.onOrderQty ?? 0;

    // Calculate net-to-order: never negative
    const toOrder = Math.max(0, line.requiredQty - (onHand + onOrder));

    // Return line with adjusted quantities
    return {
      ...line,
      onHandQty: onHand,
      onOrderQty: onOrder,
      requiredQty: toOrder, // overwrites required with net-to-order for downstream (Genesis F, Step 17)
    };
  });
}

/**
 * Legacy export alias for compatibility
 * Note: This function should be imported from @/stores/inventoryOffsetsStore instead
 * @deprecated Use getInventoryOffsets from @/stores/inventoryOffsetsStore
 */
export function getInventoryOffsets() {
  console.warn(
    "[DEPRECATED] getInventoryOffsets from inventory-offset-engine is deprecated. Use @/stores/inventoryOffsetsStore instead."
  );
  // Return empty object to prevent errors
  return {};
}

/**
 * Legacy export alias (compat): list all Internal Fulfillment Orders (IFOs)
 * @deprecated Import from "@/lib/ifo-store" instead.
 */
export function listIFOs() {
  return listIFOsFromStore();
}
