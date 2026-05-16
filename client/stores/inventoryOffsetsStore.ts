/**
 * Inventory Offsets Store (Genesis G Signal)
 * Persists on-hand and on-order adjustments that reduce procurement need
 * Storage key: luccca:genesis:inventory_offsets:v1
 */

import type {
  InventoryOffset,
  InventoryOffsetsSnapshot,
} from "@/../shared/types/genesis-procurement";

const STORAGE_KEY = "luccca:genesis:inventory_offsets:v1";

/**
 * Load inventory offsets from storage
 */
function loadInventoryOffsets(): InventoryOffsetsSnapshot {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return createDefaultInventoryOffsets();
    }
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to load inventory offsets:", e);
    return createDefaultInventoryOffsets();
  }
}

/**
 * Save inventory offsets to storage
 */
function saveInventoryOffsets(snapshot: InventoryOffsetsSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.error("Failed to save inventory offsets:", e);
  }
}

/**
 * Get current inventory offsets snapshot
 */
export function getInventoryOffsets(): InventoryOffsetsSnapshot {
  return loadInventoryOffsets();
}

/**
 * Set inventory offsets
 */
export function setInventoryOffsets(snapshot: InventoryOffsetsSnapshot): void {
  saveInventoryOffsets(snapshot);
}

/**
 * Add an offset
 */
export function addOffset(offset: InventoryOffset): void {
  const snapshot = loadInventoryOffsets();
  const exists = snapshot.offsets.find((o) => o.offsetId === offset.offsetId);
  if (!exists) {
    snapshot.offsets.push(offset);
    snapshot.capturedAt = new Date().toISOString();
    saveInventoryOffsets(snapshot);
  }
}

/**
 * Update an offset
 */
export function updateOffset(
  offsetId: string,
  updates: Partial<InventoryOffset>,
): void {
  const snapshot = loadInventoryOffsets();
  const offset = snapshot.offsets.find((o) => o.offsetId === offsetId);
  if (offset) {
    Object.assign(offset, updates);
    snapshot.capturedAt = new Date().toISOString();
    saveInventoryOffsets(snapshot);
  }
}

/**
 * Remove an offset
 */
export function removeOffset(offsetId: string): void {
  const snapshot = loadInventoryOffsets();
  snapshot.offsets = snapshot.offsets.filter((o) => o.offsetId !== offsetId);
  snapshot.capturedAt = new Date().toISOString();
  saveInventoryOffsets(snapshot);
}

/**
 * Get offsets for a specific item
 */
export function getOffsetsForItem(itemKey: string): InventoryOffset[] {
  const snapshot = loadInventoryOffsets();
  return snapshot.offsets.filter((o) => o.itemKey === itemKey);
}

/**
 * Get offsets for a specific location
 */
export function getOffsetsForLocation(locationId: string): InventoryOffset[] {
  const snapshot = loadInventoryOffsets();
  return snapshot.offsets.filter((o) => o.locationId === locationId);
}

/**
 * Clear all offsets
 */
export function clearInventoryOffsets(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear inventory offsets:", e);
  }
}

/**
 * Get offset statistics
 */
export function getOffsetStats(): {
  offsetCount: number;
  totalOnHandQty: number;
  totalOnOrderQty: number;
  lastUpdated: string;
} {
  const snapshot = loadInventoryOffsets();
  const totalOnHandQty = snapshot.offsets.reduce(
    (sum, o) => sum + o.onHandQty,
    0,
  );
  const totalOnOrderQty = snapshot.offsets.reduce(
    (sum, o) => sum + o.onOrderQty,
    0,
  );

  return {
    offsetCount: snapshot.offsets.length,
    totalOnHandQty,
    totalOnOrderQty,
    lastUpdated: snapshot.capturedAt,
  };
}

/**
 * Create default inventory offsets with sample data
 */
function createDefaultInventoryOffsets(): InventoryOffsetsSnapshot {
  return {
    snapshotId: `snapshot_${Date.now()}`,
    propertyId: "prop_default",
    offsets: [
      {
        offsetId: "offset_flour_commissary",
        itemKey: "FLOUR_AP",
        itemName: "All-Purpose Flour",
        locationId: "commissary_main",
        onHandQty: 100,
        onOrderQty: 50,
        unit: "lbs",
        expiresAt: undefined,
        notes: "Main storeroom supply",
      },
      {
        offsetId: "offset_chicken_commissary",
        itemKey: "CHICKEN_BREAST",
        itemName: "Chicken Breast",
        locationId: "commissary_main",
        onHandQty: 200,
        onOrderQty: 100,
        unit: "lbs",
        expiresAt: undefined,
        notes: "Freezer stock",
      },
      {
        offsetId: "offset_olive_oil",
        itemKey: "OLIVE_OIL_EXTRA_VIRGIN",
        itemName: "Olive Oil (Extra Virgin)",
        locationId: "restaurant_0",
        onHandQty: 50,
        onOrderQty: 25,
        unit: "L",
        expiresAt: undefined,
        notes: "Back-of-house storage",
      },
    ],
    capturedAt: new Date().toISOString(),
  };
}
