import React from "react";
/** * MobileEnhancements Integration * * Connects MobileEnhancements module to shared stores * Enables offline sync for schedules and inventory */ import { useEffect } from "react";
import { useSchedulingIntegration } from "@/lib/store-integrations";
import { useInventoryIntegration } from "@/lib/store-integrations"; /** * Hook to integrate MobileEnhancements with shared stores */
export function useMobileEnhancementsIntegration() {
  const scheduling = useSchedulingIntegration();
  const inventory = useInventoryIntegration(); // Sync offline changes when online const syncOfflineChanges = async (changes: { schedules?: Array<{ id: string; updates: any }>; inventory?: Array<{ id: string; updates: any }>; }) => { // Sync schedule changes if (changes.schedules) { changes.schedules.forEach((change) => { scheduling.updateSchedule(change.id, change.updates); }); } // Sync inventory changes if (changes.inventory) { changes.inventory.forEach((change) => { const item = inventory.getItemById(change.id); if (item) { inventory.updateItem(change.id, change.updates); } }); } }; // Get data for offline caching const getOfflineData = () => { return { schedules: scheduling.getAllSchedules(), inventory: inventory.items, lastSync: new Date().toISOString(), }; }; return { syncOfflineChanges, getOfflineData, scheduling, inventory, };
}
