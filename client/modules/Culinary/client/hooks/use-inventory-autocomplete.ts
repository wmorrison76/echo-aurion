import { useMemo } from "react";

/**
 * Hook to provide ingredient autocomplete suggestions from scanned inventory items
 * Typically populated from Purchasing/Receiving module
 */
export interface InventoryAutocompleteItem {
  id: string;
  canonicalName: string;
  category: "protein" | "vegetable" | "fruit" | "dairy" | "pantry" | "spice" | "other";
  primaryUnit: string;
  currentStock?: number;
  reorderPoint?: number;
  costPerUnit?: number;
}

export interface UseInventoryAutocompleteOptions {
  inventory: InventoryAutocompleteItem[];
  searchQuery: string;
  maxSuggestions?: number;
  outletId?: string;
}

/**
 * Provides filtered ingredient suggestions from scanned inventory
 * @param inventory - Array of inventory items from Purchasing/Receiving
 * @param searchQuery - Current search input
 * @param maxSuggestions - Maximum number of suggestions (default: 10)
 * @returns Filtered and sorted suggestions
 */
export function useInventoryAutocomplete({
  inventory,
  searchQuery,
  maxSuggestions = 10,
  outletId,
}: UseInventoryAutocompleteOptions) {
  return useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();

    return inventory
      .filter((item) => {
        // Filter by name match
        const nameMatch = item.canonicalName.toLowerCase().includes(query);
        // Filter by outlet if specified (outlet-specific inventory)
        const outletMatch = !outletId || item.id.startsWith(outletId);
        return nameMatch && outletMatch;
      })
      .sort((a, b) => {
        // Prioritize exact prefix matches
        const aStartsWith = a.canonicalName.toLowerCase().startsWith(query);
        const bStartsWith = b.canonicalName.toLowerCase().startsWith(query);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        // Then sort by stock availability
        const aHasStock = (a.currentStock ?? 0) > (a.reorderPoint ?? 0);
        const bHasStock = (b.currentStock ?? 0) > (b.reorderPoint ?? 0);
        if (aHasStock && !bHasStock) return -1;
        if (!aHasStock && bHasStock) return 1;

        // Finally sort alphabetically
        return a.canonicalName.localeCompare(b.canonicalName);
      })
      .slice(0, maxSuggestions)
      .map((item) => ({
        id: item.id,
        label: item.canonicalName,
        unit: item.primaryUnit,
        category: item.category,
        inStock: (item.currentStock ?? 0) > (item.reorderPoint ?? 0),
        currentStock: item.currentStock,
        costPerUnit: item.costPerUnit,
      }));
  }, [inventory, searchQuery, maxSuggestions, outletId]);
}

/**
 * Hook to get inventory items by category for quick filtering
 */
export function useInventoryByCategory(inventory: InventoryAutocompleteItem[]) {
  return useMemo(() => {
    const grouped: Record<string, InventoryAutocompleteItem[]> = {
      protein: [],
      vegetable: [],
      fruit: [],
      dairy: [],
      pantry: [],
      spice: [],
      other: [],
    };

    inventory.forEach((item) => {
      grouped[item.category].push(item);
    });

    return grouped;
  }, [inventory]);
}

/**
 * Format an inventory item for display in ingredient row
 */
export function formatInventoryItemForRecipe(item: InventoryAutocompleteItem): {
  item: string;
  unit: string;
} {
  return {
    item: item.canonicalName,
    unit: item.primaryUnit,
  };
}
