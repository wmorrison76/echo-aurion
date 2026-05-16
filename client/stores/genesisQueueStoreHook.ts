/**
 * Zustand hook wrapper for Genesis Queue Store
 */

import { create } from "zustand";
import { listIFOs } from "@/lib/inventory-offset-engine";

interface GenesisQueueStoreState {
  requests: any[];
}

export const useGenesisQueueStore = create<GenesisQueueStoreState>(() => ({
  requests: listIFOs(),
}));
