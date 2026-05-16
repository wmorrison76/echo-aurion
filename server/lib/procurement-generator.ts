/***
 * LUCCCA — BUILD 26 (Part 1)
 * Procurement Generator
 *
 * PURPOSE:
 *  - From event menu & headcount, generate:
 *      - ingredient quantities
 *      - total purchase quantities
 *      - vendor grouping (placeholder)
 *
 * ASSUMPTIONS:
 *  - Menu items each have "recipe" with ingredient-per-guest usage
 ***/

export type IngredientUsage = {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  perGuestQty: number;
};

export type MenuItem = {
  id: string;
  name: string;
  ingredients: IngredientUsage[];
};

export type ProcurementResult = {
  items: {
    ingredientId: string;
    ingredientName: string;
    unit: string;
    totalQty: number;
  }[];
};

export function generateProcurement(
  headcount: number,
  menuItems: MenuItem[]
): ProcurementResult {
  const aggregate = new Map<
    string,
    { name: string; unit: string; total: number }
  >();

  for (const item of menuItems) {
    for (const ing of item.ingredients) {
      const existing = aggregate.get(ing.ingredientId);
      const addQty = ing.perGuestQty * headcount;

      if (!existing) {
        aggregate.set(ing.ingredientId, {
          name: ing.ingredientName,
          unit: ing.unit,
          total: addQty,
        });
      } else {
        existing.total += addQty;
      }
    }
  }

  const items = Array.from(aggregate.entries()).map(([ingredientId, v]) => ({
    ingredientId,
    ingredientName: v.name,
    unit: v.unit,
    totalQty: Number(v.total.toFixed(2)),
  }));

  return { items };
}
