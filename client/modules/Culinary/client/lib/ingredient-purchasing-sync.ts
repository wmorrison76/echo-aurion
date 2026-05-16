/**
 * Ingredient Purchasing Sync Utilities
 * Fuzzy search through purchasing inventory, calculate costs, and link to supplier data
 */

import { INVENTORY_ITEMS, InventoryItem } from "@/data/inventoryItems";
import { ingredientSimilarity, fuzzySearch } from "@/lib/fuzzy-matcher";

export interface IngredientCostMatch {
  inventoryId: string;
  name: string;
  costPerUnit: number;
  packSize: number;
  packUnit: string;
  supplier: string;
  sku: string;
  confidence: number; // 0-1 fuzzy match confidence
}

/**
 * Fuzzy search ingredients from purchasing inventory
 * Returns matches sorted by confidence
 * Uses advanced token-based fuzzy matching for better ingredient matching
 */
export function searchPurchasingInventory(
  query: string,
  minConfidence: number = 0.6
): IngredientCostMatch[] {
  if (!query.trim()) return [];

  // Use the advanced fuzzy search with ingredientSimilarity
  const results = fuzzySearch(
    query,
    INVENTORY_ITEMS,
    (item) => item.canonicalName,
    minConfidence
  );

  return results.map((result) => ({
    inventoryId: result.item.id,
    name: result.item.canonicalName,
    costPerUnit: getLatestCostPerUnit(result.item),
    packSize: result.item.supplierLinks[0]?.packSize || 1,
    packUnit: result.item.supplierLinks[0]?.packUnit || result.item.primaryUnit,
    supplier: result.item.supplierLinks[0]?.supplierName || "Unknown",
    sku: result.item.supplierLinks[0]?.sku || "",
    confidence: result.score,
  }));
}

/**
 * Get latest cost per unit from inventory item
 * Returns cost per single unit (not per pack)
 */
export function getLatestCostPerUnit(item: InventoryItem): number {
  if (item.supplierLinks.length === 0) return 0;

  const primarySupplier = item.supplierLinks[0];
  const packSize = primarySupplier.packSize || 1;
  const packPrice = primarySupplier.pricePerPack || 0;

  return packPrice / packSize;
}

/**
 * Calculate ingredient cost based on quantity, unit, and yield
 * @param ingredientItem - The inventory item
 * @param qty - Quantity entered by user
 * @param unit - Unit entered by user (e.g., "lb", "cup")
 * @param yieldPercent - Yield percentage from book of yields (0-100)
 * @returns Calculated cost for the ingredient as used
 */
export function calculateIngredientCost(
  ingredientItem: IngredientCostMatch | InventoryItem,
  qty: number,
  unit: string,
  yieldPercent: number = 100
): number {
  if (!ingredientItem || !qty || qty <= 0) return 0;

  // Get cost per unit
  const costPerUnit =
    "costPerUnit" in ingredientItem
      ? ingredientItem.costPerUnit
      : getLatestCostPerUnit(ingredientItem as InventoryItem);

  // Adjust for unit conversion (simplified - assumes metric equivalents)
  let unitMultiplier = 1;
  if (unit.toLowerCase() === "cup") unitMultiplier = 0.24; // 1 cup ≈ 0.24 lb for most ingredients
  if (unit.toLowerCase() === "oz") unitMultiplier = 0.0625; // 1 oz = 0.0625 lb
  if (unit.toLowerCase() === "g") unitMultiplier = 0.0022; // 1g ≈ 0.0022 lb
  if (unit.toLowerCase() === "ml") unitMultiplier = 0.0005; // 1ml ≈ 0.0005 lb for water
  if (unit.toLowerCase() === "pcs" || unit.toLowerCase() === "count") unitMultiplier = 0.5; // Approximate

  const adjustedQty = qty * unitMultiplier;
  const usableQty = (adjustedQty * yieldPercent) / 100;

  return usableQty * costPerUnit;
}

/**
 * Flag missing costs in recipe for audit
 */
export function auditRecipeCosts(
  ingredients: Array<{
    item: string;
    qty: string | number;
    unit: string;
    cost: string | number;
  }>
): {
  total: number;
  missing: number;
  missingItems: string[];
  hasWarnings: boolean;
} {
  const missing: string[] = [];

  ingredients.forEach((ing) => {
    if (!ing.item.trim()) return;
    const cost = typeof ing.cost === "string" ? parseFloat(ing.cost) : ing.cost;
    if (isNaN(cost) || cost === 0) {
      missing.push(`${ing.item} (${ing.qty} ${ing.unit})`);
    }
  });

  return {
    total: ingredients.filter((ing) => ing.item.trim()).length,
    missing: missing.length,
    missingItems: missing,
    hasWarnings: missing.length > 0,
  };
}
