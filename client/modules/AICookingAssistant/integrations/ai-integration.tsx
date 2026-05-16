import React from "react";
/** * AICookingAssistant Integration * * Connects AICookingAssistant module to shared stores * Syncs recipe guidance and problem-solving data */ import { useEffect } from "react";
import { useInventoryIntegration } from "@/lib/store-integrations"; /** * Hook to integrate AICookingAssistant with shared stores */
export function useAICookingAssistantIntegration() {
  const inventory = useInventoryIntegration(); // Sync recipe guidance to inventory for ingredient availability const checkIngredientAvailability = (recipeId: string, ingredients: string[]) => { const unavailable = ingredients.filter((ingredient) => { const item = inventory.items.find((item) => item.name.toLowerCase().includes(ingredient.toLowerCase()) ); return !item || item.currentStock <= 0; }); return { available: unavailable.length === 0, unavailable, }; }; return { checkIngredientAvailability, inventory, };
}
