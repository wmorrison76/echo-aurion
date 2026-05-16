import type { Ingredient, VendorItem } from "../data/schemas";
export interface VendorCatalogEntry {
  vendorId: string;
  vendorName: string;
  items: VendorItem[];
}
export function flattenCatalog(catalog: VendorCatalogEntry[]): VendorItem[] {
  return catalog.flatMap((entry) => entry.items);
}
export function findPreferredVendorItem(
  ingredient: Ingredient,
  catalog: VendorCatalogEntry[],
): VendorItem | null {
  const allItems = flattenCatalog(catalog).filter(
    (item) => item.ingredientId === ingredient.id && item.active,
  );
  if (!allItems.length) {
    return null;
  }
  if (ingredient.preferredVendorItemId) {
    const preferred = allItems.find(
      (item) => item.id === ingredient.preferredVendorItemId,
    );
    if (preferred) return preferred;
  }
  return allItems.reduce((best, candidate) => {
    if (!best) return candidate;
    const bestCost = best.pricePerPack / best.convToBase;
    const candidateCost = candidate.pricePerPack / candidate.convToBase;
    return candidateCost < bestCost ? candidate : best;
  }, allItems[0]);
}
export function groupVendorItemsByVendor(
  items: VendorItem[],
): Record<string, VendorItem[]> {
  return items.reduce<Record<string, VendorItem[]>>((acc, item) => {
    if (!acc[item.vendorId]) {
      acc[item.vendorId] = [];
    }
    acc[item.vendorId].push(item);
    return acc;
  }, {});
}
