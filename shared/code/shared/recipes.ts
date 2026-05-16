export const currencySymbol = "$";

export interface Recipe {
  id: string;
  name: string;
  [key: string]: any;
}

export type RecipeExport = Recipe & {
  exportedAt?: string;
};

export function normalizeRecipe(recipe: Recipe): RecipeExport {
  return {
    ...recipe,
    exportedAt: new Date().toISOString(),
  };
}
