import { useCallback, useMemo } from "react";
import {
  calculateIngredientCost,
  searchPurchasingInventory,
  type IngredientCostMatch,
} from "@/lib/ingredient-purchasing-sync";
import { INVENTORY_ITEMS } from "@/data/inventoryItems";

export interface CostCalculationResult {
  cost: number;
  costPerUnit: number;
  supplier: string;
  confidence: number;
}

/**
 * Hook for calculating ingredient costs based on purchasing inventory
 * Auto-calculates cost when ingredient name, qty, unit, and yield are provided
 */
export function useIngredientCostCalculator() {
  // Get inventory items
  const inventoryItems = useMemo(() => INVENTORY_ITEMS, []);

  /**
   * Calculate cost for an ingredient
   * @param ingredientName - The ingredient name (will be fuzzy matched)
   * @param qty - Quantity entered by user
   * @param unit - Unit (lb, oz, cup, etc)
   * @param yieldPercent - Yield percentage (default 100)
   * @returns Cost calculation result with supplier info
   */
  const calculateCost = useCallback(
    (
      ingredientName: string,
      qty: string | number,
      unit: string,
      yieldPercent: number = 100
    ): CostCalculationResult | null => {
      if (!ingredientName.trim() || !qty || !unit.trim()) {
        return null;
      }

      const qtyNum = typeof qty === "string" ? parseFloat(qty) : qty;
      if (isNaN(qtyNum) || qtyNum <= 0) {
        return null;
      }

      // Search for ingredient in purchasing inventory
      const matches = searchPurchasingInventory(ingredientName, 0.5);
      if (matches.length === 0) {
        return null;
      }

      // Use best match
      const bestMatch = matches[0];

      // Calculate cost
      const cost = calculateIngredientCost(bestMatch, qtyNum, unit, yieldPercent);

      return {
        cost: Math.round(cost * 100) / 100, // Round to 2 decimal places
        costPerUnit: bestMatch.costPerUnit,
        supplier: bestMatch.supplier,
        confidence: bestMatch.confidence,
      };
    },
    []
  );

  /**
   * Get cost suggestion for ingredient without calculating
   * Useful for displaying supplier info before committing to a cost
   */
  const getSuggestion = useCallback(
    (ingredientName: string): IngredientCostMatch | null => {
      if (!ingredientName.trim()) {
        return null;
      }

      const matches = searchPurchasingInventory(ingredientName, 0.5);
      return matches.length > 0 ? matches[0] : null;
    },
    []
  );

  /**
   * Search ingredients from purchasing inventory
   * @param query - Search query
   * @param minConfidence - Minimum fuzzy match confidence (0-1)
   * @returns Array of matching ingredients
   */
  const searchIngredients = useCallback(
    (query: string, minConfidence: number = 0.5): IngredientCostMatch[] => {
      return searchPurchasingInventory(query, minConfidence);
    },
    []
  );

  return {
    calculateCost,
    getSuggestion,
    searchIngredients,
    inventoryItems,
  };
}

/**
 * Hook to manage ingredient cost calculations for a recipe
 */
export function useRecipeCostCalculation(ingredients: Array<{
  item: string;
  qty: string | number;
  unit: string;
  yield?: string | number;
  cost?: string | number;
}>) {
  const { calculateCost } = useIngredientCostCalculator();

  /**
   * Calculate total recipe cost
   */
  const calculateTotalCost = useCallback(() => {
    return ingredients.reduce((total, ing) => {
      if (!ing.item.trim()) return total;

      const yieldPercent = ing.yield
        ? (typeof ing.yield === "string" ? parseFloat(ing.yield) : ing.yield)
        : 100;

      const result = calculateCost(
        ing.item,
        ing.qty,
        ing.unit,
        Math.min(100, Math.max(0, yieldPercent))
      );

      return total + (result?.cost || 0);
    }, 0);
  }, [ingredients, calculateCost]);

  /**
   * Get cost per serving
   */
  const calculatePortionCost = useCallback(
    (servings: number = 1) => {
      if (servings <= 0) return 0;
      return calculateTotalCost() / servings;
    },
    [calculateTotalCost]
  );

  /**
   * Auto-fill costs for all ingredients
   * Returns new ingredients array with calculated costs
   */
  const autoFillCosts = useCallback(() => {
    return ingredients.map((ing) => {
      if (!ing.item.trim()) return ing;

      // Skip if cost already exists
      if (ing.cost && (typeof ing.cost === "number" ? ing.cost > 0 : ing.cost.toString().trim() !== "")) {
        return ing;
      }

      const yieldPercent = ing.yield
        ? (typeof ing.yield === "string" ? parseFloat(ing.yield) : ing.yield)
        : 100;

      const result = calculateCost(
        ing.item,
        ing.qty,
        ing.unit,
        Math.min(100, Math.max(0, yieldPercent))
      );

      return {
        ...ing,
        cost: result ? result.cost.toString() : ing.cost,
      };
    });
  }, [ingredients, calculateCost]);

  return {
    calculateTotalCost,
    calculatePortionCost,
    autoFillCosts,
  };
}
