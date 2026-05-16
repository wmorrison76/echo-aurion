/**
 * Zustand hook wrapper for Inventory Offsets Store
 */

import { create } from "zustand";
import { getInventoryOffsets } from "@/lib/inventory-offset-engine";

interface InventoryOffsetsStoreState {
  offsets: any[];
}

export const useInventoryOffsetsStore = create<InventoryOffsetsStoreState>(() => ({
  offsets: getInventoryOffsets(),
}));
