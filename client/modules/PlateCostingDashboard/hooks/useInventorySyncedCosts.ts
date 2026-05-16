/**
 * useInventorySyncedCosts Hook
 *
 * Subscribes to inventory changes and automatically recalculates plate costs
 * when ingredient prices or quantities change.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { osBus } from "@/lib/os-bus";
import { calculatePlateCost, type PlateRecipe } from "../lib/cost-calculator";

export interface InventoryUpdate {
  sku: string;
  name: string;
  oldPrice: number;
  newPrice: number;
  quantity: number;
  timestamp: number;
}

export interface CostUpdate {
  recipeId: string;
  recipeName: string;
  oldCost: number;
  newCost: number;
  costDelta: number;
  affectedIngredients: string[];
  timestamp: number;
}

export function useInventorySyncedCosts(recipes: PlateRecipe[] = []) {
  const [costUpdates, setCostUpdates] = useState<CostUpdate[]>([]);
  const [recentInventoryChanges, setRecentInventoryChanges] = useState<
    InventoryUpdate[]
  >([]);
  const [isSync, setIsSync] = useState(true);
  const recalculateTimeoutRef = useRef<number | null>(null);

  /**
   * Recalculate affected recipe costs
   */
  const recalculateAffectedCosts = useCallback(
    (changedSKUs: string[]) => {
      if (!isSync || recipes.length === 0) return;

      const affectedRecipes = recipes.filter((recipe) =>
        recipe.ingredients.some((ing) => changedSKUs.includes(ing.id))
      );

      affectedRecipes.forEach((recipe) => {
        const oldCost = recipe.ingredients.reduce((sum, ing) => {
          return sum + ing.quantity * ing.unitCost;
        }, 0);

        const newBreakdown = calculatePlateCost(recipe);
        const newCost = newBreakdown.totalCostWithWaste;

        if (Math.abs(newCost - oldCost) > 0.01) {
          const affectedIngredients = recipe.ingredients
            .filter((ing) => changedSKUs.includes(ing.id))
            .map((ing) => ing.name);

          setCostUpdates((prev) => {
            const updated = [
              {
                recipeId: recipe.id,
                recipeName: recipe.name,
                oldCost,
                newCost,
                costDelta: newCost - oldCost,
                affectedIngredients,
                timestamp: Date.now(),
              },
              ...prev,
            ].slice(0, 50); // Keep last 50 updates

            return updated;
          });

          console.log(
            `[useInventorySyncedCosts] Cost updated for ${recipe.name}: $${oldCost.toFixed(2)} → $${newCost.toFixed(2)}`
          );
        }
      });
    },
    [recipes, isSync]
  );

  /**
   * Handle inventory item updated event
   */
  const handleInventoryItemUpdated = useCallback(
    (event: CustomEvent<InventoryUpdate>) => {
      if (!isSync) return;

      const update = event.detail;
      setRecentInventoryChanges((prev) => {
        const updated = [update, ...prev].slice(0, 20); // Keep last 20
        return updated;
      });

      // Debounce recalculation
      if (recalculateTimeoutRef.current) {
        clearTimeout(recalculateTimeoutRef.current);
      }

      recalculateTimeoutRef.current = window.setTimeout(() => {
        recalculateAffectedCosts([update.sku]);
      }, 300);

      console.log(
        `[useInventorySyncedCosts] Inventory updated: ${update.name} ($${update.oldPrice} → $${update.newPrice})`
      );
    },
    [isSync, recalculateAffectedCosts]
  );

  /**
   * Handle batch inventory update
   */
  const handleInventoryBatchUpdate = useCallback(
    (event: CustomEvent<InventoryUpdate[]>) => {
      if (!isSync) return;

      const updates = event.detail;
      setRecentInventoryChanges((prev) => {
        const updated = [...updates, ...prev].slice(0, 20);
        return updated;
      });

      // Debounce recalculation for batch updates
      if (recalculateTimeoutRef.current) {
        clearTimeout(recalculateTimeoutRef.current);
      }

      recalculateTimeoutRef.current = window.setTimeout(() => {
        const changedSKUs = updates.map((u) => u.sku);
        recalculateAffectedCosts(changedSKUs);
      }, 500);

      console.log(
        `[useInventorySyncedCosts] Batch inventory update: ${updates.length} items`
      );
    },
    [isSync, recalculateAffectedCosts]
  );

  /**
   * Subscribe to inventory changes via osBus
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const unsubscribeSingle = osBus.on(
      "inventory:item_updated",
      handleInventoryItemUpdated as any
    );
    const unsubscribeBatch = osBus.on(
      "inventory:batch_updated",
      handleInventoryBatchUpdate as any
    );

    return () => {
      unsubscribeSingle?.();
      unsubscribeBatch?.();
      if (recalculateTimeoutRef.current) {
        clearTimeout(recalculateTimeoutRef.current);
      }
    };
  }, [handleInventoryItemUpdated, handleInventoryBatchUpdate]);

  /**
   * Clear old cost updates
   */
  const clearOldUpdates = useCallback(() => {
    const cutoff = Date.now() - 5 * 60 * 1000; // 5 minutes
    setCostUpdates((prev) => prev.filter((u) => u.timestamp > cutoff));
  }, []);

  /**
   * Toggle sync on/off
   */
  const toggleSync = useCallback(() => {
    setIsSync((prev) => !prev);
  }, []);

  return {
    costUpdates,
    recentInventoryChanges,
    isSync,
    toggleSync,
    clearOldUpdates,
    recalculateAffectedCosts,
  };
}

/**
 * Emit inventory update event
 */
export function emitInventoryUpdate(update: InventoryUpdate): void {
  if (typeof window !== "undefined") {
    osBus.emit("inventory:item_updated", update);
  }
}

/**
 * Emit batch inventory updates
 */
export function emitInventoryBatchUpdate(updates: InventoryUpdate[]): void {
  if (typeof window !== "undefined") {
    osBus.emit("inventory:batch_updated", updates);
  }
}
