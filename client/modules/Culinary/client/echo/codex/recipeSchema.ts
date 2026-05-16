export type RecipeCategory =
  | "appetizer"
  | "salad"
  | "soup"
  | "entree"
  | "side"
  | "dessert"
  | "cocktail"
  | "bread"
  | "sauce"
  | "base";

export interface RecipeCodexMetadata {
  id: string;
  title: string;
  category: RecipeCategory;
  cuisineRegion?: string;
  yieldDescription?: string;
  complexity: 1 | 2 | 3 | 4 | 5;
  primaryTechniques: string[];
  mainIngredients: string[];
  dietaryTags: string[];
  allergens: string[];
  flavorProfile: string[];
  serviceContext?: string;
}
