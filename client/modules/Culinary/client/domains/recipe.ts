/**
 * Domain types for Recipe entities.
 * Re-exports core types from shared/recipes and adds client-specific extensions.
 */
export type {
  Recipe as RecipeRecord,
  RecipeExport,
  RecipeNutrition,
  IngredientRow,
} from "../../shared/recipes";

export {
  normalizeRecipe,
  currencySymbol,
  downloadRecipeJSON,
} from "../../shared/recipes";
