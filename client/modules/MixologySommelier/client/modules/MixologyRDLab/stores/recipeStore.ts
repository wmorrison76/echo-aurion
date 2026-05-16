/** * Recipe Store (Zustand) * Manages cocktail recipe state and operations */ import { create } from "zustand";
import { RecipeService } from "../services/recipe-service";
import type {
  CocktailRecipe,
  RecipeIngredient,
  RecipeCosting,
  RecipePerformance,
} from "../types/recipe";
interface RecipeState {
  recipes: CocktailRecipe[];
  currentRecipe: CocktailRecipe | null;
  loading: boolean;
  error: string | null; // Actions loadRecipes: () => Promise<void>; loadRecipe: (recipeId: string) => Promise<void>; createRecipe: (recipe: Partial<CocktailRecipe>) => Promise<CocktailRecipe>; updateRecipe: (recipeId: string, updates: Partial<CocktailRecipe>) => Promise<void>; createVersion: (recipeId: string, updates: Partial<CocktailRecipe>) => Promise<CocktailRecipe>; deleteRecipe: (recipeId: string) => Promise<void>; recalculateCostsForIngredient: (ingredientId: string) => Promise<void>; getRecipesUsingIngredient: (ingredientId: string) => CocktailRecipe[];
}
export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  currentRecipe: null,
  loading: false,
  error: null,
  loadRecipes: async () => {
    set({ loading: true, error: null });
    try {
      const recipes = await RecipeService.getAllRecipes();
      set({ recipes, loading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to load recipes",
        loading: false,
      });
    }
  },
  loadRecipe: async (recipeId: string) => {
    set({ loading: true, error: null });
    try {
      const recipe = await RecipeService.getRecipe(recipeId);
      set({ currentRecipe: recipe, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load recipe",
        loading: false,
      });
    }
  },
  createRecipe: async (recipe: Partial<CocktailRecipe>) => {
    set({ loading: true, error: null });
    try {
      const newRecipe = await RecipeService.createRecipe(recipe);
      set((state) => ({
        recipes: [...state.recipes, newRecipe],
        currentRecipe: newRecipe,
        loading: false,
      }));
      return newRecipe;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to create recipe",
        loading: false,
      });
      throw error;
    }
  },
  updateRecipe: async (recipeId: string, updates: Partial<CocktailRecipe>) => {
    set({ loading: true, error: null });
    try {
      const updated = await RecipeService.updateRecipe(recipeId, updates);
      set((state) => ({
        recipes: state.recipes.map((r) => (r.id === recipeId ? updated : r)),
        currentRecipe:
          state.currentRecipe?.id === recipeId ? updated : state.currentRecipe,
        loading: false,
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to update recipe",
        loading: false,
      });
    }
  },
  createVersion: async (recipeId: string, updates: Partial<CocktailRecipe>) => {
    set({ loading: true, error: null });
    try {
      const newVersion = await RecipeService.createVersion(recipeId, updates);
      set((state) => ({
        recipes: [...state.recipes, newVersion],
        currentRecipe: newVersion,
        loading: false,
      }));
      return newVersion;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to create version",
        loading: false,
      });
      throw error;
    }
  },
  deleteRecipe: async (recipeId: string) => {
    set({ loading: true, error: null });
    try {
      await RecipeService.deleteRecipe(recipeId);
      set((state) => ({
        recipes: state.recipes.filter((r) => r.id !== recipeId),
        currentRecipe:
          state.currentRecipe?.id === recipeId ? null : state.currentRecipe,
        loading: false,
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to delete recipe",
        loading: false,
      });
    }
  },
  recalculateCostsForIngredient: async (ingredientId: string) => {
    const { recipes } = get();
    const affectedRecipes = recipes.filter((recipe) =>
      recipe.ingredients.some((ing) => ing.ingredientId === ingredientId),
    );
    for (const recipe of affectedRecipes) {
      try {
        const updatedCosting = await RecipeService.calculateCosting(
          recipe.ingredients,
        );
        await get().updateRecipe(recipe.id, { costing: updatedCosting });
      } catch (error) {
        console.error(
          `Failed to recalculate costs for recipe ${recipe.id}:`,
          error,
        );
      }
    }
  },
  getRecipesUsingIngredient: (ingredientId: string) => {
    const { recipes } = get();
    return recipes.filter((recipe) =>
      recipe.ingredients.some((ing) => ing.ingredientId === ingredientId),
    );
  },
}));
