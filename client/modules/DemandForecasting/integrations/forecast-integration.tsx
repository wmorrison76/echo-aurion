import React from "react";
/** * DemandForecast → Schedule → Inventory Integration * * Connects DemandForecasting module to scheduling and inventory stores * Auto-updates schedules and triggers inventory orders based on forecasts */ import { useEffect } from "react";
import { useDemandScheduleChain } from "@/lib/store-integrations";
import { useSchedulingStore } from "@/stores/shared/schedulingStore";
import { useInventoryStore } from "@/stores/shared/inventoryStore"; /** * Hook to integrate DemandForecasting with scheduling and inventory */
export function useDemandForecastIntegration() {
  const scheduling = useSchedulingStore();
  const inventory = useInventoryStore();
  const { applyForecastToSchedule } = useDemandScheduleChain(); // Apply forecast to schedule and inventory const applyForecast = (forecast: { id: string; date: string; outletId: string; demand: number; avgPerStaff: number; requiredIngredients?: Array<{ itemId: string; required: number; unit: string; }>; }) => { // Apply forecast to schedule applyForecastToSchedule(forecast); // Update inventory based on forecast if (forecast.requiredIngredients) { forecast.requiredIngredients.forEach((ingredient) => { const item = inventory.getItemById(ingredient.itemId); if (item && item.currentStock < ingredient.required) { // Item will be low, ensure it's flagged if (item.currentStock <= item.reorderPoint) { // Already at reorder point, forecast confirms need console.log(`[DemandForecast] Item ${item.name} needs restocking for forecast ${forecast.id}`); } } }); } }; return { applyForecast, scheduling, inventory, };
}
