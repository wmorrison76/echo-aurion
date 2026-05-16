export type RecipeTrack = "fine-dining" | "manufacturing";

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  ingredients?: string[];
  cuisine?: string;
  course?: string;
  prepTime?: number;
  cookTime?: number;
  difficulty?: string;
  tags?: string[];
}

export interface RecipeSimilarityMatch {
  id: string;
  recipeId: string;
  title: string;
  track: RecipeTrack;
  score: number;
  metadata?: any;
}

export interface CrossTrackSuggestion {
  id: string;
  recipeId: string;
  title: string;
  track: "fine-dining";
  score: number;
  metadata?: any;
}

/**
 * Store a recipe vector (works with Pinecone or pgvector)
 */
export async function storeRecipeVector(
  recipe: Recipe,
  track: RecipeTrack,
  chefId: string,
  organizationId: string,
  collaborators?: string[],
): Promise<{ success: boolean; recipeId: string; error?: string }> {
  try {
    const response = await fetch("/api/vector/recipes/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipe,
        track,
        chefId,
        organizationId,
        collaborators,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to store recipe");
    }

    const data = await response.json();
    return {
      success: true,
      recipeId: data.data.recipeId,
    };
  } catch (error) {
    return {
      success: false,
      recipeId: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Search for similar recipes (works with Pinecone or pgvector)
 */
export async function searchSimilarRecipes(
  recipeText: string,
  userTrack: RecipeTrack,
  chefId: string,
  organizationId: string,
  options?: {
    limit?: number;
    includeCrossTrack?: boolean;
  },
): Promise<{
  success: boolean;
  matches: RecipeSimilarityMatch[];
  error?: string;
}> {
  try {
    const response = await fetch("/api/vector/recipes/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipeText,
        userTrack,
        chefId,
        organizationId,
        limit: options?.limit ?? 10,
        includeCrossTrack: options?.includeCrossTrack ?? true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to search recipes");
    }

    const data = await response.json();
    return {
      success: true,
      matches: data.data?.matches || [],
    };
  } catch (error) {
    return {
      success: false,
      matches: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get recipes by track (works with Pinecone or pgvector)
 */
export async function getRecipesByTrack(
  track: RecipeTrack,
  organizationId: string,
  limit: number = 50,
): Promise<{
  success: boolean;
  recipes: RecipeSimilarityMatch[];
  error?: string;
}> {
  try {
    const response = await fetch(
      `/api/vector/recipes/by-track?track=${track}&organizationId=${organizationId}&limit=${limit}`,
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to fetch recipes");
    }

    const data = await response.json();
    return {
      success: true,
      recipes: data.data?.recipes || [],
    };
  } catch (error) {
    return {
      success: false,
      recipes: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a recipe vector (works with Pinecone or pgvector)
 */
export async function deleteRecipeVector(
  recipeId: string,
  track: RecipeTrack,
  chefId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/vector/recipes/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipeId,
        track,
        chefId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to delete recipe");
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get cross-track learning suggestions (works with Pinecone or pgvector)
 */
export async function getCrossTrackLearning(
  recipeText: string,
  organizationId: string,
  limit: number = 5,
): Promise<{
  success: boolean;
  suggestions: CrossTrackSuggestion[];
  error?: string;
}> {
  try {
    const response = await fetch("/api/vector/cross-track-learning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipeText,
        organizationId,
        limit,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to get suggestions");
    }

    const data = await response.json();
    return {
      success: true,
      suggestions: data.data?.suggestions || [],
    };
  } catch (error) {
    return {
      success: false,
      suggestions: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate an embedding for text (works with Pinecone or pgvector)
 */
export async function generateEmbedding(
  text: string,
): Promise<{ success: boolean; embedding?: number[]; error?: string }> {
  try {
    const response = await fetch("/api/vector/embedding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || "Failed to generate embedding",
      );
    }

    const data = await response.json();
    return {
      success: true,
      embedding: data.data?.embedding,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
