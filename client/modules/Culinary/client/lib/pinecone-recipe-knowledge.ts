/**
 * Store imported recipes in Pinecone for Echo knowledge base
 * Enables Echo to recall recipes without calling OpenAI each time
 */

import { storeRecipeVector, searchSimilarRecipes } from "./pinecone-client";

export interface ImportedRecipeKnowledge {
  recipeId: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  prepTime?: string;
  cookTime?: string;
  yield?: string;
  difficulty?: string;
  sourceBook: string;
  sourcePage: number;
  importedAt: string;
  tags: string[];
  cuisine?: string;
  course?: string;
}

/**
 * Store a recipe in Pinecone knowledge base
 * @param recipe Recipe to store
 * @param sourceBook Name of the source book
 * @param sourcePage Page number in the book
 */
export async function storeImportedRecipeInPinecone(
  recipe: ImportedRecipeKnowledge
): Promise<{ success: boolean; recipeId: string }> {
  try {
    // Create a searchable text representation
    const recipeText = `
Recipe: ${recipe.title}
Ingredients: ${recipe.ingredients.join(", ")}
Instructions: ${recipe.instructions.join(" ")}
${recipe.prepTime ? `Prep Time: ${recipe.prepTime}` : ""}
${recipe.cookTime ? `Cook Time: ${recipe.cookTime}` : ""}
${recipe.yield ? `Yield: ${recipe.yield}` : ""}
${recipe.difficulty ? `Difficulty: ${recipe.difficulty}` : ""}
${recipe.cuisine ? `Cuisine: ${recipe.cuisine}` : ""}
${recipe.course ? `Course: ${recipe.course}` : ""}
Tags: ${recipe.tags.join(", ")}
Source: Page ${recipe.sourcePage} of ${recipe.sourceBook}
    `.trim();

    // Add source metadata to tags for retrieval
    const enrichedTags = [
      ...recipe.tags,
      `source:${recipe.sourceBook.replace(/\s+/g, "-")}`,
      `page:${recipe.sourcePage}`,
      "knowledge-base-import",
    ];

    // Store in Pinecone with rich metadata
    const result = await storeRecipeVector(
      {
        id: recipe.recipeId,
        title: recipe.title,
        description: recipeText,
        ingredients: recipe.ingredients,
        cuisine: recipe.cuisine,
        course: recipe.course,
        difficulty: recipe.difficulty,
        tags: enrichedTags,
        prepTime: recipe.prepTime ? parseInt(recipe.prepTime) : undefined,
        cookTime: recipe.cookTime ? parseInt(recipe.cookTime) : undefined,
      },
      "manufacturing", // Store in manufacturing track for global knowledge
      "echo-system", // Chef ID for system imports
      "global-knowledge" // Organization ID for global knowledge base
    );

    return {
      success: result.success,
      recipeId: recipe.recipeId,
    };
  } catch (error) {
    console.error("Failed to store recipe in Pinecone:", error);
    return {
      success: false,
      recipeId: recipe.recipeId,
    };
  }
}

/**
 * Store multiple recipes from a book import
 * Tracks import success/failure for AI learning
 */
export async function storeBookImportInPinecone(
  recipes: ImportedRecipeKnowledge[],
  bookName: string
): Promise<{
  success: number;
  failed: number;
  results: Array<{ recipeId: string; success: boolean; error?: string }>;
}> {
  const results = [];
  let success = 0;
  let failed = 0;

  for (const recipe of recipes) {
    try {
      const result = await storeImportedRecipeInPinecone(recipe);
      results.push({
        recipeId: recipe.recipeId,
        success: result.success,
      });
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
      results.push({
        recipeId: recipe.recipeId,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Store import metadata for Echo learning
  try {
    const importMetadata = {
      bookName,
      timestamp: new Date().toISOString(),
      totalRecipes: recipes.length,
      successCount: success,
      failedCount: failed,
      recipeIds: recipes.map((r) => r.recipeId),
    };
    const meta = JSON.parse(localStorage.getItem("echo:imports") || "[]");
    meta.push(importMetadata);
    // Keep last 50 imports for learning
    localStorage.setItem("echo:imports", JSON.stringify(meta.slice(-50)));
  } catch {}

  return { success, failed, results };
}

/**
 * Search imported recipes by keyword
 * Used by Echo to quickly find relevant recipes without API calls
 */
export async function searchImportedRecipes(
  query: string,
  limit: number = 5
): Promise<
  Array<{
    title: string;
    ingredients: string[];
    instructions: string[];
    sourceBook: string;
    sourcePage: number;
    similarity: number;
  }>
> {
  try {
    const result = await searchSimilarRecipes(
      query,
      "manufacturing",
      "echo-system",
      "global-knowledge",
      { limit }
    );

    if (!result.success || !result.matches) {
      return [];
    }

    return result.matches.map((match) => {
      // Extract source book and page from tags or metadata
      const sourceBook = match.metadata?.sourceBook || "Unknown Book";
      const sourcePage = match.metadata?.sourcePage || 0;

      return {
        title: match.metadata?.title || "Unknown Recipe",
        ingredients: match.metadata?.ingredients || [],
        instructions: match.metadata?.instructions || [],
        sourceBook,
        sourcePage,
        similarity: match.score || 0,
      };
    });
  } catch (error) {
    console.error("Failed to search imported recipes:", error);
    return [];
  }
}

/**
 * Get all recipes imported from a specific book
 * For Echo to know which recipes came from which book
 */
export async function getRecipesFromBook(bookName: string): Promise<string[]> {
  try {
    const imports = JSON.parse(localStorage.getItem("echo:imports") || "[]");
    const bookImport = imports.find(
      (i: any) => i.bookName === bookName
    );
    if (!bookImport) return [];
    return bookImport.recipeIds || [];
  } catch {
    return [];
  }
}

/**
 * Get import history for Echo learning
 * Tracks which recipes were imported and when for continuous improvement
 */
export function getImportHistory(): Array<{
  bookName: string;
  timestamp: string;
  successCount: number;
  failedCount: number;
}> {
  try {
    const imports = JSON.parse(localStorage.getItem("echo:imports") || "[]");
    return imports.map((i: any) => ({
      bookName: i.bookName,
      timestamp: i.timestamp,
      successCount: i.successCount || 0,
      failedCount: i.failedCount || 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Clear import history (admin only)
 */
export function clearImportHistory(): void {
  localStorage.removeItem("echo:imports");
}
