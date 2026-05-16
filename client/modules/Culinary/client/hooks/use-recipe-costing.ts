import { useMemo, useCallback } from "react";
import { IngredientRow } from "@/types/ingredients";
import {
  getInventoryItem,
  getCurrentCostPerUnit,
  getCostVariance,
  InventoryItem,
} from "@/data/inventoryItems";

export interface RecipeCostSummary {
  totalRecipeCost: number;
  costPerServing: number;
  ingredientCount: number;
  linkedCount: number;
  estimatedCostVariance: number | null;
  suppliers: Map<string, number>; // supplierId → total cost from that supplier
  costByIngredient: Map<string, number>; // ingredientId → cost
}

export function useRecipeCostCalculation(
  ingredients: IngredientRow[],
  servings: number = 1,
) {
  // Calculate total cost for a single ingredient
  const calculateIngredientCost = useCallback(
    (ingredient: IngredientRow): number | null => {
      const qty = parseFloat(ingredient.qty);
      if (isNaN(qty) || qty <= 0) return null;

      // Prefer linked inventory cost
      if (ingredient.inventoryId) {
        const inventoryItem = getInventoryItem(ingredient.inventoryId);
        if (inventoryItem) {
          const costPerUnit = getCurrentCostPerUnit(inventoryItem);
          if (costPerUnit !== null) {
            return qty * costPerUnit;
          }
        }
      }

      // Fall back to manual costPerUnit
      if (ingredient.costPerUnit !== null) {
        return qty * ingredient.costPerUnit;
      }

      // Try to parse cost field as total cost
      const cost = parseFloat(ingredient.cost);
      if (!isNaN(cost) && cost > 0) {
        return cost;
      }

      return null;
    },
    [],
  );

  // Calculate cost per serving for a single ingredient
  const calculateIngredientCostPerServing = useCallback(
    (ingredient: IngredientRow, totalServings: number = servings): number | null => {
      const totalCost = calculateIngredientCost(ingredient);
      if (totalCost === null || totalServings <= 0) return null;
      return totalCost / totalServings;
    },
    [servings, calculateIngredientCost],
  );

  // Get inventory item for an ingredient
  const getIngredientInventoryItem = useCallback((ingredient: IngredientRow): InventoryItem | null => {
    if (!ingredient.inventoryId) return null;
    return getInventoryItem(ingredient.inventoryId) || null;
  }, []);

  // Get cost variance for an ingredient
  const getIngredientCostVariance = useCallback((ingredient: IngredientRow): number | null => {
    const inventoryItem = getIngredientInventoryItem(ingredient);
    if (!inventoryItem) return null;
    return getCostVariance(inventoryItem);
  }, [getIngredientInventoryItem]);

  // Main summary calculation
  const summary = useMemo((): RecipeCostSummary => {
    let totalCost = 0;
    let linkedCount = 0;
    let costVarianceSum = 0;
    let costVarianceCount = 0;
    const suppliers = new Map<string, number>();
    const costByIngredient = new Map<string, number>();

    for (const ingredient of ingredients) {
      // Skip dividers and empty items
      if (ingredient.type === "divider" || !ingredient.item.trim()) {
        continue;
      }

      const ingredientCost = calculateIngredientCost(ingredient);
      if (ingredientCost === null) continue;

      totalCost += ingredientCost;

      if (ingredient.inventoryId) {
        linkedCount++;
        costByIngredient.set(ingredient.inventoryId, ingredientCost);

        // Track supplier spend
        const inventoryItem = getIngredientInventoryItem(ingredient);
        if (inventoryItem && inventoryItem.supplierLinks.length > 0) {
          const primarySupplier = inventoryItem.supplierLinks[0];
          const currentTotal = suppliers.get(primarySupplier.supplierId) || 0;
          suppliers.set(primarySupplier.supplierId, currentTotal + ingredientCost);
        }

        // Track cost variance
        const variance = getIngredientCostVariance(ingredient);
        if (variance !== null) {
          costVarianceSum += variance;
          costVarianceCount++;
        }
      }
    }

    const estimatedVariance =
      costVarianceCount > 0 ? Math.round((costVarianceSum / costVarianceCount) * 10) / 10 : null;

    return {
      totalRecipeCost: Math.round(totalCost * 100) / 100,
      costPerServing: servings > 0 ? Math.round((totalCost / servings) * 100) / 100 : 0,
      ingredientCount: ingredients.filter((i) => i.type !== "divider" && i.item.trim()).length,
      linkedCount,
      estimatedCostVariance: estimatedVariance,
      suppliers,
      costByIngredient,
    };
  }, [ingredients, servings, calculateIngredientCost, getIngredientInventoryItem, getIngredientCostVariance]);

  return {
    summary,
    calculateIngredientCost,
    calculateIngredientCostPerServing,
    getIngredientInventoryItem,
    getIngredientCostVariance,
  };
}

// Hook for formatting and displaying costs
export function useFormatCost() {
  const formatCurrency = useCallback((value: number, currency: string = "USD"): string => {
    const symbols: Record<string, string> = {
      USD: "$",
      CAD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
    };

    const symbol = symbols[currency] || currency;
    return `${symbol}${value.toFixed(2)}`;
  }, []);

  return { formatCurrency };
}

// Hook for cost variance status (for UI color coding)
export function useCostVarianceStatus(variance: number | null) {
  return useMemo(() => {
    if (variance === null) return { status: "unknown", label: "No variance data" };
    if (variance > 10) return { status: "up-significant", label: `↑ ${variance}%` };
    if (variance > 2) return { status: "up-slight", label: `↑ ${variance}%` };
    if (variance < -10) return { status: "down-significant", label: `↓ ${Math.abs(variance)}%` };
    if (variance < -2) return { status: "down-slight", label: `↓ ${Math.abs(variance)}%` };
    return { status: "stable", label: "Stable" };
  }, [variance]);
}
