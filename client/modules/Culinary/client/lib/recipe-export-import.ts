import type { Recipe } from "@shared/recipes";
import { uid } from "uid";

/**
 * Download a file with the given blob and filename
 */
export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export a single recipe as JSON
 */
export function exportRecipeAsJSON(recipe: Recipe, includeImages: boolean = false) {
  const exportData: any = {
    id: recipe.id,
    title: recipe.title,
    tags: recipe.tags,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    yield: recipe.yield,
    yieldUnit: recipe.yieldUnit,
    servingSize: recipe.servingSize,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    restTime: recipe.restTime,
    notes: recipe.notes,
    source: recipe.source,
    favorite: recipe.favorite,
    rating: recipe.rating,
    isGlobal: recipe.isGlobal,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
  };

  if (includeImages && recipe.imageDataUrls?.length) {
    exportData.images = recipe.imageDataUrls;
  }

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  downloadFile(
    blob,
    `${recipe.title.replace(/\s+/g, "-").toLowerCase()}-${new Date().getTime()}.json`
  );
}

/**
 * Export multiple recipes as a single JSON file (for bulk/group operations)
 */
export function exportRecipesAsJSON(recipes: Recipe[], metadata: any = {}) {
  const exportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    count: recipes.length,
    metadata,
    recipes: recipes.map((r) => ({
      id: r.id,
      title: r.title,
      tags: r.tags,
      ingredients: r.ingredients,
      instructions: r.instructions,
      yield: r.yield,
      yieldUnit: r.yieldUnit,
      servingSize: r.servingSize,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      restTime: r.restTime,
      notes: r.notes,
      source: r.source,
      favorite: r.favorite,
      rating: r.rating,
      isGlobal: r.isGlobal,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  downloadFile(blob, `recipes-export-${new Date().toISOString().slice(0, 10)}.json`);
}

/**
 * Parse a recipe from JSON data
 */
export function parseRecipeFromJSON(data: any): Partial<Recipe> {
  return {
    id: data.id || uid(),
    title: data.title || "Untitled Recipe",
    tags: Array.isArray(data.tags) ? data.tags : [],
    ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
    instructions: Array.isArray(data.instructions) ? data.instructions : [],
    yield: data.yield,
    yieldUnit: data.yieldUnit,
    servingSize: data.servingSize,
    prepTime: data.prepTime,
    cookTime: data.cookTime,
    restTime: data.restTime,
    notes: data.notes,
    source: data.source,
    favorite: data.favorite ?? false,
    rating: data.rating,
    isGlobal: data.isGlobal ?? false,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

/**
 * Extract recipe learning metadata for AI training
 */
export function extractRecipeLearningData(recipe: Recipe) {
  const ingredients = recipe.ingredients || [];
  const instructions = recipe.instructions || [];

  // Parse ingredient quantities and types
  const parsedIngredients = ingredients.map((ing) => {
    const match = ing.match(/^([\d.]+)\s*(\w+)\s+(.+)$/);
    return {
      raw: ing,
      amount: match ? parseFloat(match[1]) : null,
      unit: match ? match[2] : null,
      name: match ? match[3] : ing,
    };
  });

  // Extract cooking methods from instructions
  const cookingMethods = extractCookingMethods(instructions.join(" "));

  // Analyze recipe characteristics
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0) + (recipe.restTime || 0);
  const difficulty = estimateDifficulty(ingredients.length, instructions.length, totalTime);

  return {
    id: recipe.id,
    title: recipe.title,
    tags: recipe.tags || [],
    ingredientCount: ingredients.length,
    ingredientDetails: parsedIngredients,
    instructionCount: instructions.length,
    cookingMethods,
    totalTime,
    difficulty,
    yield: recipe.yield,
    yieldUnit: recipe.yieldUnit,
    servingSize: recipe.servingSize,
    rating: recipe.rating || 0,
    isVegetarian: isVegetarian(ingredients),
    isVegan: isVegan(ingredients),
  };
}

/**
 * Extract cooking methods from instruction text
 */
function extractCookingMethods(text: string): string[] {
  const methods = [
    "bake",
    "boil",
    "braise",
    "broil",
    "fry",
    "grill",
    "roast",
    "sauté",
    "simmer",
    "steam",
    "stir",
    "fold",
    "knead",
    "whip",
    "blend",
    "puree",
    "dice",
    "chop",
    "slice",
    "mince",
  ];
  const lowerText = text.toLowerCase();
  return methods.filter((m) => lowerText.includes(m));
}

/**
 * Estimate recipe difficulty
 */
function estimateDifficulty(
  ingredientCount: number,
  instructionCount: number,
  totalTime: number
): "easy" | "medium" | "hard" {
  const score = ingredientCount * 0.3 + instructionCount * 0.4 + (totalTime / 60) * 0.3;
  if (score < 5) return "easy";
  if (score < 10) return "medium";
  return "hard";
}

/**
 * Check if recipe is vegetarian
 */
function isVegetarian(ingredients: string[]): boolean {
  const meatWords = [
    "chicken",
    "beef",
    "pork",
    "lamb",
    "fish",
    "shrimp",
    "meat",
    "ham",
    "bacon",
    "sausage",
  ];
  const ingredientText = ingredients.join(" ").toLowerCase();
  return !meatWords.some((word) => ingredientText.includes(word));
}

/**
 * Check if recipe is vegan
 */
function isVegan(ingredients: string[]): boolean {
  const animalWords = [
    "chicken",
    "beef",
    "pork",
    "lamb",
    "fish",
    "shrimp",
    "meat",
    "ham",
    "bacon",
    "sausage",
    "milk",
    "cheese",
    "butter",
    "egg",
    "cream",
    "yogurt",
    "honey",
  ];
  const ingredientText = ingredients.join(" ").toLowerCase();
  return !animalWords.some((word) => ingredientText.includes(word));
}
