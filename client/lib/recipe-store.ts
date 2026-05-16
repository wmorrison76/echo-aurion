import type { Recipe } from "@/../shared/types/recipe";
import { v4 as uuidv4 } from "uuid";

const KEY = "luccca:recipes";

/**
 * Get all recipes from localStorage
 */
export function listRecipes(): Recipe[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Get a single recipe by name
 */
export function getRecipeByName(name: string): Recipe | undefined {
  return listRecipes().find(
    (r) => r.recipeName.toLowerCase() === name.toLowerCase(),
  );
}

/**
 * Get a single recipe by ID
 */
export function getRecipeById(recipeId: string): Recipe | undefined {
  return listRecipes().find((r) => r.recipeId === recipeId);
}

/**
 * Create or update a recipe
 */
export function upsertRecipe(recipe: Omit<Recipe, "recipeId">): Recipe {
  const recipes = listRecipes();
  const existing = recipes.find(
    (r) => r.recipeName.toLowerCase() === recipe.recipeName.toLowerCase(),
  );

  const now = new Date().toISOString();
  const upserted: Recipe = {
    recipeId: existing?.recipeId ?? `recipe_${uuidv4()}`,
    ...recipe,
    updatedAt: now,
    createdAt: existing?.createdAt ?? now,
  };

  const updated = existing
    ? recipes.map((r) => (r.recipeId === upserted.recipeId ? upserted : r))
    : [...recipes, upserted];

  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(updated));
  }

  return upserted;
}

/**
 * Delete a recipe by ID
 */
export function deleteRecipe(recipeId: string): boolean {
  const recipes = listRecipes();
  const updated = recipes.filter((r) => r.recipeId !== recipeId);

  if (updated.length === recipes.length) return false; // Not found

  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(updated));
  }

  return true;
}

/**
 * Initialize with sample recipes (for demo purposes)
 */
export function initializeSampleRecipes(): void {
  const existing = listRecipes();
  if (existing.length > 0) return; // Already initialized

  const samples: Omit<Recipe, "recipeId" | "createdAt" | "updatedAt">[] = [
    {
      recipeName: "Salmon Fillet",
      yieldCategory: "RAW_PROTEIN",
      portionsPerRecipe: 1,
      ingredients: [
        {
          ingredientId: "salmon_fillet",
          ingredientName: "Salmon Fillet (raw)",
          quantityPerPortion: 6,
          unit: "oz",
          yieldPercent: 0.8, // 80% usable after trimming
        },
        {
          ingredientId: "lemon",
          ingredientName: "Lemon",
          quantityPerPortion: 0.25,
          unit: "whole",
          yieldPercent: 1.0,
        },
        {
          ingredientId: "butter",
          ingredientName: "Butter",
          quantityPerPortion: 1,
          unit: "tbsp",
          yieldPercent: 1.0,
        },
      ],
    },
    {
      recipeName: "House Salad",
      yieldCategory: "PRODUCE",
      portionsPerRecipe: 1,
      ingredients: [
        {
          ingredientId: "mixed_greens",
          ingredientName: "Mixed Greens (raw)",
          quantityPerPortion: 3,
          unit: "oz",
          yieldPercent: 0.75, // 75% usable after washing/trimming
        },
        {
          ingredientId: "tomato",
          ingredientName: "Tomato",
          quantityPerPortion: 0.5,
          unit: "whole",
          yieldPercent: 0.85,
        },
        {
          ingredientId: "cucumber",
          ingredientName: "Cucumber",
          quantityPerPortion: 0.25,
          unit: "whole",
          yieldPercent: 0.9,
        },
      ],
    },
    {
      recipeName: "Chocolate Cake",
      yieldCategory: "BAKERY",
      portionsPerRecipe: 8,
      ingredients: [
        {
          ingredientId: "flour",
          ingredientName: "All-Purpose Flour",
          quantityPerPortion: 0.5,
          unit: "cup",
          yieldPercent: 1.0,
        },
        {
          ingredientId: "dark_chocolate",
          ingredientName: "Dark Chocolate",
          quantityPerPortion: 2,
          unit: "oz",
          yieldPercent: 1.0,
        },
        {
          ingredientId: "eggs",
          ingredientName: "Eggs",
          quantityPerPortion: 0.5,
          unit: "whole",
          yieldPercent: 1.0,
        },
        {
          ingredientId: "butter",
          ingredientName: "Butter",
          quantityPerPortion: 0.5,
          unit: "tbsp",
          yieldPercent: 1.0,
        },
      ],
    },
  ];

  samples.forEach((sample) => {
    upsertRecipe(sample);
  });
}
