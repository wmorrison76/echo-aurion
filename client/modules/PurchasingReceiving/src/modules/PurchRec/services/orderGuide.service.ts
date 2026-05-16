import { getPurchRecAdapters } from "./adapters";
import { loadIngredientsMap, loadOnHand, loadVendorCatalog } from "./fixtures";
import {
  applyYieldAndWaste,
  calcSuggestedOrder,
  convertQuantity,
  convertToBaseUnit,
  costPerBaseFromVendorItem,
  extendedCost,
  roundCurrency,
} from "../utils/cost";
import { findPreferredVendorItem, VendorCatalogEntry } from "../utils/vendors";
import type {
  Ingredient,
  MenuItem,
  RecipeComponent,
  VendorItem,
} from "../data/schemas";
import { usePurchRecStore } from "../state/purchRec.store";
export interface OrderGuideRow {
  ingredient: Ingredient;
  vendor: VendorCatalogEntry | null;
  vendorItem: VendorItem | null;
  packSizeDisplay: string | null;
  parLevelBase: number;
  onHandBase: number;
  suggestedBase: number;
  suggestedPacks: number;
  unitCostBase: number;
  extCost: number;
  menuUsage: { menuItemId: string; menuItemName: string; qtyBase: number }[];
}
interface IngredientDemandAggregate {
  ingredient: Ingredient;
  demandBase: number;
  menuUsage: OrderGuideRow["menuUsage"];
}
export async function generateOrderGuide(): Promise<OrderGuideRow[]> {
  const adapters = getPurchRecAdapters();
  const [menuItems, ingredientsMap, onHandMap, vendorCatalog] =
    await Promise.all([
      adapters.listActiveMenuItems(),
      loadIngredientsMap(),
      adapters.getInventoryOnHand
        ? adapters.getInventoryOnHand()
        : loadOnHand(),
      loadVendorCatalog(),
    ]);
  const baseOnHand: Record<string, number> = {};
  Object.entries(onHandMap).forEach(([ingredientId, entry]) => {
    const ingredient = ingredientsMap[ingredientId];
    if (!ingredient) return;
    baseOnHand[ingredientId] = safeConvert(
      entry.qtyBase,
      entry.unit,
      ingredient,
    );
  });
  usePurchRecStore.getState().setInitialInventory(baseOnHand);
  const aggregates = await buildIngredientDemand(menuItems, ingredientsMap);
  return aggregates
    .map((aggregate) => buildRow(aggregate, onHandMap, vendorCatalog))
    .sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name));
}
async function buildIngredientDemand(
  menuItems: MenuItem[],
  ingredientsMap: Record<string, Ingredient>,
): Promise<IngredientDemandAggregate[]> {
  const adapters = getPurchRecAdapters();
  const demand = new Map<string, IngredientDemandAggregate>();
  for (const menuItem of menuItems.filter((item) => item.active)) {
    const recipe = await adapters.getRecipeById(menuItem.recipeId);
    if (!recipe) continue;
    recipe.components.forEach((component: RecipeComponent) => {
      const ingredient = ingredientsMap[component.ingredientId];
      if (!ingredient) return;
      let componentBaseQty: number;
      try {
        componentBaseQty = convertToBaseUnit(
          component.qty,
          component.uom,
          ingredient,
        );
      } catch {
        componentBaseQty = component.qty;
      }
      const demandBase = applyYieldAndWaste(
        componentBaseQty,
        ingredient.yieldPct ?? 1,
        component.wastePct ?? 0,
      );
      const existing = demand.get(ingredient.id);
      const usageEntry = {
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        qtyBase: demandBase,
      };
      if (existing) {
        existing.demandBase += demandBase;
        existing.menuUsage.push(usageEntry);
      } else {
        demand.set(ingredient.id, {
          ingredient,
          demandBase,
          menuUsage: [usageEntry],
        });
      }
    });
  }
  return Array.from(demand.values());
}
function buildRow(
  aggregate: IngredientDemandAggregate,
  onHandMap: Record<string, { qtyBase: number; unit: string }>,
  vendorCatalog: VendorCatalogEntry[],
): OrderGuideRow {
  const { ingredient, demandBase, menuUsage } = aggregate;
  const onHandEntry = onHandMap[ingredient.id];
  const onHandBase = onHandEntry
    ? safeConvert(onHandEntry.qtyBase, onHandEntry.unit, ingredient)
    : 0;
  const parLevel = Math.max(demandBase * 1.2, onHandBase);
  const suggestedBase = calcSuggestedOrder(parLevel, onHandBase);
  const vendorItem = findPreferredVendorItem(ingredient, vendorCatalog);
  const vendor = vendorItem
    ? (vendorCatalog.find((entry) => entry.vendorId === vendorItem.vendorId) ??
      null)
    : null;
  const unitCostBase = vendorItem
    ? costPerBaseFromVendorItem(vendorItem)
    : ingredient.currentCostPerBaseUom;
  const extCost = extendedCost(unitCostBase, suggestedBase);
  const suggestedPacks = vendorItem ? suggestedBase / vendorItem.convToBase : 0;
  const packSizeDisplay = vendorItem
    ? `${vendorItem.packSizeQty} ${vendorItem.packSizeUom}`
    : null;
  return {
    ingredient,
    vendor,
    vendorItem,
    packSizeDisplay,
    parLevelBase: roundCurrency(parLevel),
    onHandBase: roundCurrency(onHandBase),
    suggestedBase: roundCurrency(suggestedBase),
    suggestedPacks: roundCurrency(suggestedPacks),
    unitCostBase: roundCurrency(unitCostBase),
    extCost,
    menuUsage,
  };
}
function safeConvert(
  qty: number,
  unit: string,
  ingredient: Ingredient,
): number {
  try {
    return convertQuantity(qty, unit, ingredient.baseUom);
  } catch {
    return qty;
  }
}
