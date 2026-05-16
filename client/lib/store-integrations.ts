/**
 * Store Integration Hooks
 * 
 * Provides hooks and utilities to connect modules to shared stores
 * with real-time sync support
 */

import { useEffect, useCallback } from "react";
import { useInventoryStore } from "@/stores/shared/inventoryStore";
import { useSchedulingStore } from "@/stores/shared/schedulingStore";
import { useFinancialsStore } from "@/stores/shared/financialsStore";
import { getRealtimeSync, type SyncEvent, type SyncEventType } from "./realtime-sync";

/**
 * Hook to connect inventory module to shared store with real-time sync
 */
export function useInventoryIntegration() {
  const store = useInventoryStore();
  const sync = getRealtimeSync();

  useEffect(() => {
    if (!sync) {
      console.debug("[StoreIntegration] RealtimeSync not initialized, running in offline mode");
      return;
    }

    // Subscribe to inventory events
    const unsubscribe = sync.subscribe("inventory.update", (event: SyncEvent) => {
      if (event.data) {
        store.setItems(event.data.items || []);
      }
    });

    const unsubscribeTransaction = sync.subscribe("inventory.transaction", (event: SyncEvent) => {
      if (event.data) {
        store.addTransaction(event.data);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeTransaction();
    };
  }, [store, sync]);

  const syncInventoryUpdate = useCallback((itemId: string, updates: any) => {
    store.updateItem(itemId, updates);
    
    if (sync) {
      sync.emit({
        type: "inventory.update",
        module: "inventory",
        entityId: itemId,
        data: { itemId, updates },
        timestamp: new Date().toISOString(),
        userId: "", // Will be filled by sync
        organizationId: "", // Will be filled by sync
      });
    }
  }, [store, sync]);

  return {
    ...store,
    syncUpdate: syncInventoryUpdate,
  };
}

/**
 * Hook to connect scheduling module to shared store with real-time sync
 */
export function useSchedulingIntegration() {
  const store = useSchedulingStore();
  const sync = getRealtimeSync();

  useEffect(() => {
    if (!sync) {
      console.debug("[StoreIntegration] RealtimeSync not initialized, running in offline mode");
      return;
    }

    const unsubscribe = sync.subscribe("schedule.update", (event: SyncEvent) => {
      if (event.data) {
        store.setSchedules(event.data.schedules || []);
      }
    });

    const unsubscribeShift = sync.subscribe("schedule.shift", (event: SyncEvent) => {
      if (event.data) {
        store.addShift(event.data);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeShift();
    };
  }, [store, sync]);

  const syncScheduleUpdate = useCallback((scheduleId: string, updates: any) => {
    store.updateSchedule(scheduleId, updates);
    
    if (sync) {
      sync.emit({
        type: "schedule.update",
        module: "schedule",
        entityId: scheduleId,
        data: { scheduleId, updates },
        timestamp: new Date().toISOString(),
        userId: "",
        organizationId: "",
      });
    }
  }, [store, sync]);

  return {
    ...store,
    syncUpdate: syncScheduleUpdate,
  };
}

/**
 * Hook to connect financials module to shared store with real-time sync
 */
export function useFinancialsIntegration() {
  const store = useFinancialsStore();
  const sync = getRealtimeSync();

  useEffect(() => {
    if (!sync) {
      console.debug("[StoreIntegration] RealtimeSync not initialized, running in offline mode");
      return;
    }

    const unsubscribe = sync.subscribe("financials.transaction", (event: SyncEvent) => {
      if (event.data) {
        store.addTransaction(event.data);
      }
    });

    const unsubscribePosting = sync.subscribe("financials.posting", (event: SyncEvent) => {
      if (event.data?.transactionIds) {
        store.postMultipleTransactions(event.data.transactionIds);
      }
    });

    return () => {
      unsubscribe();
      unsubscribePosting();
    };
  }, [store, sync]);

  const syncTransaction = useCallback((transaction: any) => {
    store.addTransaction(transaction);
    
    if (sync) {
      sync.emit({
        type: "financials.transaction",
        module: "financials",
        entityId: transaction.id,
        data: transaction,
        timestamp: new Date().toISOString(),
        userId: "",
        organizationId: "",
      });
    }
  }, [store, sync]);

  return {
    ...store,
    syncTransaction,
  };
}

/**
 * Connect Culinary → Inventory → Purchasing chain
 */
export function useCulinaryInventoryChain() {
  const inventoryStore = useInventoryStore();
  const sync = getRealtimeSync();

  const onRecipeUpdate = useCallback((recipeId: string, ingredients: any[]) => {
    // Update inventory based on recipe ingredient changes
    ingredients.forEach((ingredient) => {
      const currentItem = inventoryStore.getItemById(ingredient.itemId);
      if (currentItem) {
        // Calculate new stock based on recipe changes
        // This is a simplified example - actual logic would be more complex
        inventoryStore.updateItem(ingredient.itemId, {
          currentStock: currentItem.currentStock + (ingredient.quantity || 0),
        });

        // Emit to Purchasing module if stock is low
        if (currentItem.currentStock <= currentItem.reorderPoint) {
          if (sync) {
            sync.emit({
              type: "purchasing.order",
              module: "culinary",
              entityId: ingredient.itemId,
              data: {
                itemId: ingredient.itemId,
                reason: "recipe_update_low_stock",
                recipeId,
              },
              timestamp: new Date().toISOString(),
              userId: "",
              organizationId: "",
            });
          }
        }
      }
    });
  }, [inventoryStore, sync]);

  return { onRecipeUpdate };
}

/**
 * Connect Schedule → Payroll → Financials chain
 */
export function useScheduleFinancialsChain() {
  const schedulingStore = useSchedulingStore();
  const financialsStore = useFinancialsStore();

  const postScheduleToFinancials = useCallback(async (scheduleId: string) => {
    const schedule = schedulingStore.getScheduleById(scheduleId);
    if (!schedule) return;

    // Create financial transaction for labor cost
    const transaction = {
      id: `labor-${scheduleId}-${Date.now()}`,
      type: "expense" as const,
      category: "labor",
      amount: schedule.totalCost,
      currency: "USD",
      date: schedule.weekStart,
      outletId: schedule.outletId,
      description: `Labor costs for schedule ${schedule.weekStart} - ${schedule.weekEnd}`,
      reference: scheduleId,
      glAccount: "labor_cost",
      posted: false,
      createdAt: new Date().toISOString(),
    };

    // Post transaction atomically
    await financialsStore.postTransaction(transaction.id);
    financialsStore.addTransaction(transaction);
  }, [schedulingStore, financialsStore]);

  return { postScheduleToFinancials };
}

/**
 * Connect DemandForecast → Schedule → Inventory chain
 */
export function useDemandScheduleChain() {
  const schedulingStore = useSchedulingStore();
  const inventoryStore = useInventoryStore();
  const sync = getRealtimeSync();

  const applyForecastToSchedule = useCallback((forecast: any) => {
    // Update schedule based on demand forecast
    const outletId = forecast.outletId;
    const date = forecast.date;
    
    // Calculate required staff based on forecast
    const requiredStaff = Math.ceil(forecast.demand / forecast.avgPerStaff);
    
    // Create or update shifts
    const existingSchedule = schedulingStore.getSchedulesByOutlet(outletId)
      .find((s) => date >= s.weekStart && date <= s.weekEnd);
    
    if (existingSchedule) {
      // Update existing schedule
      const currentShifts = schedulingStore.getShiftsByDate(date);
      const currentStaff = currentShifts.length;
      
      if (currentStaff < requiredStaff) {
        // Add shifts - simplified, actual logic would be more complex
        const shiftsNeeded = requiredStaff - currentStaff;
        // Logic to create shifts would go here
      }
    }

    // Update inventory based on forecast
    forecast.requiredIngredients?.forEach((ingredient: any) => {
      const item = inventoryStore.getItemById(ingredient.itemId);
      if (item && item.currentStock < ingredient.required) {
        // Trigger purchase order
        if (sync) {
          sync.emit({
            type: "purchasing.order",
            module: "demand_forecast",
            entityId: ingredient.itemId,
            data: {
              itemId: ingredient.itemId,
              reason: "forecast_demand",
              requiredQuantity: ingredient.required - item.currentStock,
              forecastId: forecast.id,
            },
            timestamp: new Date().toISOString(),
            userId: "",
            organizationId: "",
          });
        }
      }
    });
  }, [schedulingStore, inventoryStore, sync]);

  return { applyForecastToSchedule };
}

/**
 * Connect Whiteboard → Schedule → Kitchen chain
 */
export function useWhiteboardKitchenChain() {
  const schedulingStore = useSchedulingStore();
  const sync = getRealtimeSync();

  const pushDecisionToKDS = useCallback((decision: any) => {
    if (decision.type === "schedule_change" && decision.scheduleId) {
      // Update schedule based on whiteboard decision
      const schedule = schedulingStore.getScheduleById(decision.scheduleId);
      if (schedule) {
        schedulingStore.updateSchedule(decision.scheduleId, {
          shifts: decision.shifts || schedule.shifts,
          status: decision.status || schedule.status,
        });
      }

      // Emit to Kitchen Display System
      if (sync) {
        sync.emit({
          type: "maestro.event",
          module: "whiteboard",
          entityId: decision.scheduleId,
          data: {
            action: "schedule_update",
            scheduleId: decision.scheduleId,
            changes: decision.changes,
          },
          timestamp: new Date().toISOString(),
          userId: "",
          organizationId: "",
        });
      }
    }
  }, [schedulingStore, sync]);

  return { pushDecisionToKDS };
}
