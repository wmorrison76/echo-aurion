/**
 * Culinary → Inventory Integration
 *
 * Connects Culinary module to shared inventory store
 * Syncs recipe ingredient changes to inventory in real-time
 */

import React from "react";
import {
  useInventoryIntegration,
  useCulinaryInventoryChain,
} from "../../../lib/store-integrations";
import { useInventoryStore } from "../../../stores/shared/inventoryStore";

/**
 * Hook to integrate Culinary module with inventory store
 */
export function useCulinaryInventoryIntegration() {
  const inventory = useInventoryIntegration();
  const { onRecipeUpdate } = useCulinaryInventoryChain();

  // Sync recipe ingredient changes to inventory
  const syncRecipeToInventory = (
    recipeId: string,
    ingredients: Array<{
      itemId: string;
      quantity: number;
      unit: string;
      name: string;
    }>,
  ) => {
    // Update inventory based on recipe changes
    ingredients.forEach((ingredient) => {
      const currentItem = inventory.getItemById(ingredient.itemId);
      if (currentItem) {
        // Calculate stock impact from recipe usage
        const stockImpact = -ingredient.quantity; // Negative because recipe consumes inventory
        inventory.updateItem(ingredient.itemId, {
          currentStock: Math.max(0, currentItem.currentStock + stockImpact),
        });

        // Add transaction record
        inventory.addTransaction({
          id: `recipe-${recipeId}-${ingredient.itemId}-${Date.now()}`,
          itemId: ingredient.itemId,
          type: "consumption",
          quantity: ingredient.quantity,
          timestamp: new Date().toISOString(),
          userId: "", // Will be filled by auth context
          notes: `Recipe ${recipeId} - ${ingredient.name}`,
        });

        // Check if stock is low and trigger purchase order
        if (currentItem.currentStock <= currentItem.reorderPoint) {
          onRecipeUpdate(recipeId, [ingredient]);
        }
      }
    });
  };

  return {
    ...inventory,
    syncRecipeToInventory,
  };
}

/**
 * Wrapper component to provide inventory integration to Culinary module
 */
export function CulinaryInventoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const inventory = useInventoryStore();

  // Load inventory items on mount
  React.useEffect(() => {
    // This would typically fetch from API
    // For now, we'll rely on the store's initial state
  }, []);

  return <>{children}</>;
}
