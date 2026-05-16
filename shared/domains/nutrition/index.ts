/**
 * Nutrition domain
 * Ingredients -> nutrients -> per serving; allergens -> cross-contact risk; dietary tags.
 * Recipes + banquet menus can reference; propagation: ingredient allergen -> recipe -> menu item -> BEO -> production sheet -> label.
 */

export interface Nutrient {
  code: string;
  name: string;
  amount: number;
  unit: string;
  perServing: boolean;
}

export interface Allergen {
  code: string;
  name: string;
  crossContactRisk?: "low" | "medium" | "high";
}

export type DietaryTag =
  | "vegan"
  | "vegetarian"
  | "gluten-free"
  | "dairy-free"
  | "nut-free"
  | "halal"
  | "kosher"
  | "low-sodium"
  | "other";

export interface IngredientNutrition {
  ingredientId: string;
  nutrients: Nutrient[];
  allergens: Allergen[];
  dietaryTags: DietaryTag[];
}

export interface RecipeNutrition {
  recipeId: string;
  perServing: Nutrient[];
  allergens: Allergen[];
  dietaryTags: DietaryTag[];
  sourceIngredientIds: string[];
}

export interface MenuItemNutrition {
  menuItemId: string;
  perServing: Nutrient[];
  allergens: Allergen[];
  dietaryTags: DietaryTag[];
  sourceRecipeIds: string[];
}

/** Propagation chain: ingredient -> recipe -> menu item -> BEO -> production sheet -> label; each step emits trace link. */
export interface PropagationLink {
  fromType: "ingredient" | "recipe" | "menu_item" | "beo" | "production_sheet";
  fromId: string;
  toType: "recipe" | "menu_item" | "beo" | "production_sheet" | "label";
  toId: string;
  traceId?: string;
}
