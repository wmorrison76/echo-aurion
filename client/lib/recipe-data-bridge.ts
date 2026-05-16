/**
 * Recipe Data Bridge
 * 
 * Allows modules like Cake Builder to access recipe data from Echo Recipe Pro
 * Uses localStorage and event dispatching for cross-module communication
 * 
 * Supports:
 * - Recipe list and details
 * - Pricing data
 * - Allergen information
 * - Ingredient data
 */

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    allergens?: string[];
  }>;
  techniques?: string[];
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  cost?: number;
  price?: number;
  allergens?: string[];
  tags?: string[];
}

export interface RecipeDataStore {
  recipes: Recipe[];
  lastUpdated: number;
  version: "1.0";
}

const STORAGE_KEY = "luccca-recipe-data";
const EVENT_TYPE = "recipe-data-updated";

/**
 * Publish recipe data to the bridge
 * Called by Echo Recipe Pro or other recipe data sources
 */
export function publishRecipeData(recipes: Recipe[]) {
  const store: RecipeDataStore = {
    recipes,
    lastUpdated: Date.now(),
    version: "1.0",
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    console.log("[RecipeDataBridge] Published", recipes.length, "recipes");

    // Dispatch event to notify other modules
    window.dispatchEvent(
      new CustomEvent(EVENT_TYPE, {
        detail: { recipes, timestamp: Date.now() },
      }),
    );
  } catch (err) {
    console.error("[RecipeDataBridge] Failed to publish recipe data:", err);
  }
}

/**
 * Subscribe to recipe data updates
 * Returns unsubscribe function
 */
export function onRecipeDataUpdated(
  callback: (recipes: Recipe[], timestamp: number) => void,
): () => void {
  const handler = (event: any) => {
    if (event.detail?.recipes) {
      callback(event.detail.recipes, event.detail.timestamp);
    }
  };

  window.addEventListener(EVENT_TYPE, handler);

  return () => {
    window.removeEventListener(EVENT_TYPE, handler);
  };
}

/**
 * Get recipe data from the bridge
 * Returns null if no data has been published yet
 */
export function getRecipeData(): Recipe[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const store: RecipeDataStore = JSON.parse(stored);
    return store.recipes || null;
  } catch (err) {
    console.error("[RecipeDataBridge] Failed to retrieve recipe data:", err);
    return null;
  }
}

/**
 * Clear recipe data from the bridge
 */
export function clearRecipeData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log("[RecipeDataBridge] Cleared recipe data");

    // Dispatch event to notify other modules
    window.dispatchEvent(
      new CustomEvent(EVENT_TYPE, {
        detail: { recipes: [], timestamp: Date.now() },
      }),
    );
  } catch (err) {
    console.error("[RecipeDataBridge] Failed to clear recipe data:", err);
  }
}

/**
 * Get a single recipe by ID
 */
export function getRecipeById(id: string): Recipe | undefined {
  const recipes = getRecipeData();
  return recipes?.find((r) => r.id === id);
}

/**
 * Search recipes by name or ingredient
 */
export function searchRecipes(query: string): Recipe[] {
  const recipes = getRecipeData();
  if (!recipes) return [];

  const q = query.toLowerCase();
  return recipes.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.ingredients.some((i) => i.name.toLowerCase().includes(q)),
  );
}

/**
 * Get recipes by allergen (return recipes that DON'T have this allergen)
 */
export function getRecipesSafeForAllergen(allergen: string): Recipe[] {
  const recipes = getRecipeData();
  if (!recipes) return [];

  return recipes.filter(
    (r) =>
      !r.allergens?.includes(allergen) &&
      !r.ingredients.some((i) => i.allergens?.includes(allergen)),
  );
}

/**
 * Get pricing information for a recipe
 */
export function getRecipePricing(recipeId: string): {
  cost: number;
  price: number;
  margin: number;
} | null {
  const recipe = getRecipeById(recipeId);
  if (!recipe) return null;

  const cost = recipe.cost || 0;
  const price = recipe.price || 0;
  const margin = price > 0 ? ((price - cost) / price) * 100 : 0;

  return { cost, price, margin };
}
