/**
 * Zustand hook wrapper for Genesis Procurement Store
 * Provides React hook interface matching GenesisOrderingHub expectations
 */

import { create } from "zustand";
import {
  getLastProcurementPlan,
  saveProcurementPlan,
  getProcurementHistory,
} from "./genesisProcurementStore";
import { runCombinedProcurement } from "@/lib/genesis/orchestrator/runCombinedProcurement";
import { getGenesisConfig } from "@/lib/genesis-config-store";
import { getVendorSchedule } from "./vendorScheduleStore";
import { listIFOs, getInventoryOffsets } from "@/lib/inventory-offset-engine";
import { osBus } from "@/lib/os-bus";

interface ProcurementStoreState {
  lastPlan: any | null;
  history: any[];
  runNow: (actor: { userId: string; role: string; displayName: string }) => void;
  refresh: () => void;
}

// Initialize with current state
const initialState = {
  lastPlan: getLastProcurementPlan(),
  history: getProcurementHistory(10),
};

export const useGenesisProcurementStore = create<ProcurementStoreState>((set, get) => ({
  ...initialState,

  refresh: () => {
    set({
      lastPlan: getLastProcurementPlan(),
      history: getProcurementHistory(10),
    });
  },

  runNow: async (actor) => {
    try {
      const config = getGenesisConfig();
      const vendors = getVendorSchedule();
      const offsets = getInventoryOffsets();

      // Get IFOs as demands
      const ifos = listIFOs();
      const demands = ifos.map((ifo) => ({
        demandId: ifo.id,
        locationId: ifo.requestingOutletId,
        itemKey: `${ifo.itemCategory}_${ifo.itemName}`,
        itemName: ifo.itemName,
        unit: ifo.unit || "ea",
        quantity: ifo.quantity,
        totalQuantity: ifo.quantity,
        dueAt: new Date(ifo.dueAt).toISOString(),
        priority: ifo.priority || "STANDARD",
        sourceType: "IFO",
        sourceId: ifo.id,
      }));

      // Run orchestrator
      const result = runCombinedProcurement({
        config,
        demands,
        vendorSchedule: vendors,
        inventoryOffsets: offsets,
      });

      // Save plan
      saveProcurementPlan(result.plan);

      // Emit event
      osBus.emit("genesis:procurement_run_requested", {
        planId: result.plan.planId,
        actor: actor.userId,
        timestamp: new Date().toISOString(),
      });

      // Refresh store
      get().refresh();
    } catch (error) {
      console.error("Failed to run procurement:", error);
      throw error;
    }
  },
}));
