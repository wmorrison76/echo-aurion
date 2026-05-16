export interface NutritionProfile {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sodium_mg?: number;
}

export interface RecipeNutritionEntry {
  id: string;
  recipeId: string;
  perPortion: NutritionProfile;
}
