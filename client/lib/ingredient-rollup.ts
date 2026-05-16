import type { ProductionSheet } from "@/../shared/types/production";
import type { IngredientRequirement } from "@/../shared/types/purchasing";
import { getRecipeByName } from "@/lib/recipe-store";

/**
 * Roll up production items into ingredient requirements
 * v2: Recipe-aware with yield loss
 * v1 fallback: 1 menu item = 1 ingredient (if recipe not found)
 *
 * Deterministic aggregation across all stations
 * Backwards compatible with existing systems
 */
export function rollupIngredients(
  sheets: ProductionSheet[],
): IngredientRequirement[] {
  const map = new Map<string, IngredientRequirement>();

  sheets.forEach((sheet) => {
    sheet.items.forEach((item) => {
      const recipe = getRecipeByName(item.itemName);

      if (!recipe) {
        // v1 fallback: treat menu item as ingredient
        const key = item.itemName;

        if (!map.has(key)) {
          map.set(key, {
            ingredientId: item.itemId,
            ingredientName: item.itemName,
            requiredQuantity: 0,
            unit: item.unit,
            source: {
              beoId: sheet.beoId,
              productionId: sheet.productionId,
              station: sheet.station,
            },
          });
        }

        map.get(key)!.requiredQuantity += item.quantity;
        return;
      }

      // v2: break down recipe into true ingredients with yield loss
      recipe.ingredients.forEach((ing) => {
        // Calculate required quantity accounting for yield loss
        // Example: if we need 10 portions of salmon at 6 oz each with 80% yield:
        // Required = (10 * 6) / 0.8 = 75 oz (to account for trim loss)
        const required =
          (item.quantity * ing.quantityPerPortion) / ing.yieldPercent;

        if (!map.has(ing.ingredientId)) {
          map.set(ing.ingredientId, {
            ingredientId: ing.ingredientId,
            ingredientName: ing.ingredientName,
            requiredQuantity: 0,
            unit: ing.unit,
            source: {
              beoId: sheet.beoId,
              productionId: sheet.productionId,
              station: sheet.station,
            },
          });
        }

        map.get(ing.ingredientId)!.requiredQuantity += required;
      });
    });
  });

  return Array.from(map.values());
}
