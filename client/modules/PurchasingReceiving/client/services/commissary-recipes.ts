import type { Recipe } from "@shared/recipes";
import { fuzzySearch } from "@/modules/Culinary/client/lib/fuzzy-matcher";

const LS_RECIPES = "app.recipes.v1";

export type RecipeMatchOption = {
  recipeId: string;
  title: string;
  score: number;
};

const readRecipes = (): Recipe[] => {
  try {
    const raw = localStorage.getItem(LS_RECIPES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeRecipes = (recipes: Recipe[]) => {
  try {
    localStorage.setItem(LS_RECIPES, JSON.stringify(recipes));
  } catch {
    // ignore
  }
};

export const matchRecipeOptions = (
  query: string,
  minScore = 0.6,
): RecipeMatchOption[] => {
  const recipes = readRecipes();
  return fuzzySearch(query, recipes, (recipe) => recipe.title, minScore).map(
    (result) => ({
      recipeId: result.item.id,
      title: result.item.title,
      score: result.score,
    }),
  );
};

export const createDraftRecipe = (title: string): Recipe => {
  const now = Date.now();
  return {
    id: `recipe-${Math.random().toString(36).slice(2)}`,
    title,
    createdAt: now,
    extra: {
      recipeStatus: "draft",
      needsReview: true,
      serverNotes: {
        title,
        ingredients: [],
        directions:
          "Draft recipe created from commissary order. Add ingredients and steps.",
        allergens: [],
        modifiers: {
          nationality: [],
          courses: [],
          recipeType: [],
          prepMethod: [],
          equipment: [],
        },
        totals: { fullRecipeCost: 0 },
        currency: "USD",
      },
    },
  } as Recipe;
};

export const saveDraftRecipe = (title: string): Recipe => {
  const recipes = readRecipes();
  const existing = recipes.find(
    (recipe) => recipe.title.toLowerCase() === title.toLowerCase(),
  );
  if (existing) return existing;
  const draft = createDraftRecipe(title);
  recipes.unshift(draft);
  writeRecipes(recipes);
  return draft;
};
