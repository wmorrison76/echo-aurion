import React from "react";
/** * UnifiedCanvas Integration * * Connects UnifiedCanvas module to shared stores * Syncs collaboration contexts across modules */ import { useEffect } from "react";
import { useSchedulingIntegration } from "@/lib/store-integrations";
import { useInventoryIntegration } from "@/lib/store-integrations"; /** * Hook to integrate UnifiedCanvas with shared stores */
export function useUnifiedCanvasIntegration() {
  const scheduling = useSchedulingIntegration();
  const inventory = useInventoryIntegration(); // Sync shared context to schedule const syncContextToSchedule = (context: { title: string; date?: string; changes?: any; }) => { if (context.date && context.changes?.schedule) { // Update schedule based on shared context const schedules = scheduling.getSchedulesByDate(context.date); schedules.forEach((schedule) => { scheduling.updateSchedule(schedule.id, context.changes.schedule); }); } }; // Sync shared context to inventory const syncContextToInventory = (context: { title: string; changes?: any; }) => { if (context.changes?.inventory) { // Update inventory based on shared context context.changes.inventory.forEach((change: any) => { const item = inventory.getItemById(change.itemId); if (item) { inventory.updateItem(change.itemId, change.updates); } }); } }; return { syncContextToSchedule, syncContextToInventory, scheduling, inventory, };
}
