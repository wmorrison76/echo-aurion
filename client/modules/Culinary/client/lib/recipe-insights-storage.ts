import type { Recipe } from "@shared/recipes";
import { extractRecipeInsights } from "./recipe-ai-insights";

/**
 * Update the stored insights in localStorage based on current recipes
 */
export function updateRecipeInsights(recipes: Recipe[]): void {
  if (recipes.length === 0) {
    localStorage.removeItem("kb:insights");
    return;
  }

  try {
    const insights = extractRecipeInsights(recipes);
    const flavorAverages = calculateFlavorAverages(insights.flavorProfiles);

    const storageData = {
      timestamp: new Date().toISOString(),
      recipeCount: recipes.length,
      ingredientRatios: Object.fromEntries(insights.ingredientRatios),
      flavorProfiles: insights.flavorProfiles,
      avgFlavorSweet: flavorAverages.sweet,
      avgFlavorSalty: flavorAverages.salty,
      avgFlavorSour: flavorAverages.sour,
      avgFlavorBitter: flavorAverages.bitter,
      avgFlavorUmami: flavorAverages.umami,
      avgFlavorSpicy: flavorAverages.spicy,
      cuisinePatterns: Object.fromEntries(insights.cuisinePatterns),
      commonCombinations: insights.commonCombinations,
      cookingMethods: Object.fromEntries(insights.cookingMethods),
      regionalPatterns: Object.fromEntries(insights.regionalPatterns),
    };

    localStorage.setItem("kb:insights", JSON.stringify(storageData));
  } catch (error) {
    console.error("Error updating recipe insights:", error);
  }
}

/**
 * Calculate average flavor profile values
 */
function calculateFlavorAverages(
  profiles: Array<{
    sweet: number;
    salty: number;
    sour: number;
    bitter: number;
    umami: number;
    spicy: number;
  }>
): Record<string, number> {
  if (profiles.length === 0) {
    return { sweet: 0, salty: 0, sour: 0, bitter: 0, umami: 0, spicy: 0 };
  }

  const sums = {
    sweet: 0,
    salty: 0,
    sour: 0,
    bitter: 0,
    umami: 0,
    spicy: 0,
  };

  profiles.forEach((profile) => {
    sums.sweet += profile.sweet;
    sums.salty += profile.salty;
    sums.sour += profile.sour;
    sums.bitter += profile.bitter;
    sums.umami += profile.umami;
    sums.spicy += profile.spicy;
  });

  return {
    sweet: sums.sweet / profiles.length,
    salty: sums.salty / profiles.length,
    sour: sums.sour / profiles.length,
    bitter: sums.bitter / profiles.length,
    umami: sums.umami / profiles.length,
    spicy: sums.spicy / profiles.length,
  };
}
