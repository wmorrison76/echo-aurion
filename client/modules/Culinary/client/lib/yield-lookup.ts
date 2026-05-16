/**
 * Yield Lookup Utility
 * Links ingredient selections to Book of Yields data for automatic yield suggestions
 */

import { YIELD_REFERENCE_DATA, type YieldReferenceRecord } from "@/data/yieldReference";
import { INVENTORY_ITEMS, type InventoryItem } from "@/data/inventoryItems";

export interface YieldSuggestion {
  yieldPercent: number;
  method: string;
  notes?: string;
  source: "book-of-yields" | "base-data";
}

/**
 * Find yield suggestions for an ingredient and preparation method
 * @param ingredientName - Name of the ingredient (searches against canonicalName)
 * @param prepMethod - Optional preparation method
 * @returns Array of matching yield suggestions, ordered by relevance
 */
export function lookupYieldSuggestions(
  ingredientName: string,
  prepMethod?: string
): YieldSuggestion[] {
  if (!ingredientName.trim()) return [];

  const suggestions: YieldSuggestion[] = [];
  const lowerName = ingredientName.toLowerCase();
  const lowerMethod = prepMethod?.toLowerCase().trim() || "";

  // First, search the Book of Yields reference data
  for (const record of YIELD_REFERENCE_DATA) {
    const recordItemName = record.item.toLowerCase();

    // Check for exact or fuzzy match on ingredient name
    const nameMatches =
      recordItemName === lowerName ||
      recordItemName.includes(lowerName) ||
      lowerName.includes(recordItemName);

    if (nameMatches) {
      // If method is specified, prioritize exact method matches
      if (lowerMethod) {
        const methodMatches =
          record.method.toLowerCase().includes(lowerMethod) ||
          lowerMethod.includes(record.method.toLowerCase());

        if (methodMatches) {
          suggestions.push({
            yieldPercent: record.yield,
            method: record.method,
            notes: record.notes,
            source: "book-of-yields",
          });
        }
      } else {
        // No specific method requested, add all methods for this ingredient
        suggestions.push({
          yieldPercent: record.yield,
          method: record.method,
          notes: record.notes,
          source: "book-of-yields",
        });
      }
    }
  }

  // If no Book of Yields match, try inventory base yields
  const inventoryItem = findInventoryItemByName(ingredientName);
  if (inventoryItem && suggestions.length === 0) {
    // Try to estimate a base yield from the inventory item's description
    const defaultYield = estimateBaseYield(inventoryItem);
    if (defaultYield) {
      suggestions.push({
        yieldPercent: defaultYield,
        method: "standard preparation",
        notes: "Estimated from inventory data",
        source: "base-data",
      });
    }
  }

  // Sort suggestions: exact method matches first, then by yield (higher is better)
  suggestions.sort((a, b) => {
    // Prioritize exact method matches
    if (lowerMethod) {
      const aExact = a.method.toLowerCase() === lowerMethod ? 1 : 0;
      const bExact = b.method.toLowerCase() === lowerMethod ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
    }

    // Then sort by yield percentage (higher yields first)
    return b.yieldPercent - a.yieldPercent;
  });

  return suggestions;
}

/**
 * Get the single best yield suggestion for an ingredient
 * @param ingredientName - Name of the ingredient
 * @param prepMethod - Optional preparation method
 * @returns The best matching yield suggestion, or null if none found
 */
export function getBestYieldSuggestion(
  ingredientName: string,
  prepMethod?: string
): YieldSuggestion | null {
  const suggestions = lookupYieldSuggestions(ingredientName, prepMethod);
  return suggestions.length > 0 ? suggestions[0] : null;
}

/**
 * Find an inventory item by name (fuzzy match)
 */
function findInventoryItemByName(name: string): InventoryItem | null {
  if (!name.trim()) return null;

  const lowerName = name.toLowerCase();

  // Exact match on canonicalName
  for (const item of INVENTORY_ITEMS) {
    if (item.canonicalName.toLowerCase() === lowerName) {
      return item;
    }
  }

  // Partial match (item name contains ingredient name)
  for (const item of INVENTORY_ITEMS) {
    const itemNameLower = item.canonicalName.toLowerCase();
    if (itemNameLower.includes(lowerName) || lowerName.includes(itemNameLower)) {
      return item;
    }
  }

  return null;
}

/**
 * Estimate a base yield percentage from inventory item description
 * This is a heuristic that looks for common yield-related keywords
 */
function estimateBaseYield(item: InventoryItem): number | null {
  if (!item.description) return null;

  const desc = item.description.toLowerCase();

  // Common base yields by category
  const categoryYields: Record<string, number> = {
    protein: 75, // meats have higher waste
    vegetable: 80,
    fruit: 75,
    dairy: 95, // minimal waste
    pantry: 98, // minimal waste
    spice: 100, // no waste
  };

  return categoryYields[item.category] || 85; // default 85%
}

/**
 * Link an ingredient with yield data
 * Updates the yield field if a good match is found
 */
export function enrichIngredientWithYield(
  ingredientName: string,
  currentYield: string | number,
  prepMethod?: string
): {
  yield: string | number;
  yieldSource: "user" | "suggested" | "auto-filled";
  notes?: string;
} {
  // If user already provided yield, respect it
  const userYieldValue = parseFloat(String(currentYield).replace(/[^0-9.]/g, ""));
  if (!isNaN(userYieldValue) && userYieldValue > 0 && userYieldValue <= 100) {
    return {
      yield: currentYield,
      yieldSource: "user",
    };
  }

  // Try to find a suggestion
  const suggestion = getBestYieldSuggestion(ingredientName, prepMethod);
  if (suggestion) {
    return {
      yield: suggestion.yieldPercent,
      yieldSource: "auto-filled",
      notes: suggestion.notes,
    };
  }

  // No suggestion found, return empty
  return {
    yield: "",
    yieldSource: "suggested",
  };
}

/**
 * Lookup yield reference records by ingredient
 * Useful for UI that wants to show all available prep methods
 */
export function getYieldMethodsForIngredient(ingredientName: string): YieldReferenceRecord[] {
  if (!ingredientName.trim()) return [];

  const lowerName = ingredientName.toLowerCase();
  return YIELD_REFERENCE_DATA.filter(
    (record) =>
      record.item.toLowerCase().includes(lowerName) ||
      lowerName.includes(record.item.toLowerCase())
  );
}
