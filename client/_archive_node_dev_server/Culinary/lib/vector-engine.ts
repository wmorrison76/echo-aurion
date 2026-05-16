/** * Vector Engine Abstraction Layer * * Supports switching between: * - Pinecone (high-performance, paid, for large venues) * - pgvector/Supabase (free, embedded in existing database, for small venues) */ import * as pineconeService from "./pinecone-service";
import * as pgvectorService from "./pgvector-service";
export type RecipeTrack = "fine-dining" | "manufacturing";
export type VectorEngine = "pinecone" | "pgvector";
export interface RecipeVector {
  id: string;
  recipeId: string;
  title: string;
  track: RecipeTrack;
  chefId: string;
  organizationId: string;
  embedding: number[];
  metadata: any;
}
export interface RecipeSimilarityMatch {
  id: string;
  recipeId: string;
  title: string;
  track: RecipeTrack;
  score: number;
  metadata: any;
}
interface Recipe {
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
} /** * Determine which vector engine to use based on environment */
function getActiveEngine(): VectorEngine {
  const engineConfig = process.env.VECTOR_ENGINE || "auto";
  if (engineConfig === "pinecone" || engineConfig === "pgvector") {
    return engineConfig;
  } // Auto-detect based on available credentials const hasPinecone = !!process.env.PINECONE_API_KEY; const hasSupabase = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY; // Prefer Pinecone if both are available (better performance) if (hasPinecone) { return"pinecone"; } if (hasSupabase) { return"pgvector"; } // Default to pgvector (cheaper) return"pgvector";
} /** * Get the currently active vector engine */
export function getCurrentEngine(): VectorEngine {
  return getActiveEngine();
} /** * Check if vector service is properly configured */
export async function checkVectorEngineHealth(): Promise<{
  engine: VectorEngine;
  available: boolean;
  error?: string;
}> {
  const engine = getActiveEngine();
  if (engine === "pinecone") {
    try {
      const result = await pineconeService.generateEmbedding("test");
      return { engine, available: result.length > 0 };
    } catch (error) {
      return {
        engine,
        available: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  } else {
    const result = await pgvectorService.checkPgvectorHealth();
    return { engine, available: result.available, error: result.error };
  }
} /** * Generate embedding for text */
export async function generateEmbedding(text: string): Promise<number[]> {
  const engine = getActiveEngine();
  if (engine === "pinecone") {
    return pineconeService.generateEmbedding(text);
  } else {
    return pgvectorService.generateEmbedding(text);
  }
} /** * Store a recipe vector */
export async function storeRecipeVector(
  recipe: Recipe,
  track: RecipeTrack,
  chefId: string,
  organizationId: string,
  collaborators?: string[],
): Promise<void> {
  const engine = getActiveEngine();
  if (engine === "pinecone") {
    return pineconeService.storeRecipeVector(
      recipe,
      track,
      chefId,
      organizationId,
      collaborators,
    );
  } else {
    return pgvectorService.storeRecipeVector(
      recipe,
      track,
      chefId,
      organizationId,
      collaborators,
    );
  }
} /** * Search for similar recipes */
export async function searchSimilarRecipes(
  recipeText: string,
  userTrack: RecipeTrack,
  chefId: string,
  organizationId: string,
  limit: number = 10,
  includeCrossTrack: boolean = true,
): Promise<RecipeSimilarityMatch[]> {
  const engine = getActiveEngine();
  if (engine === "pinecone") {
    return pineconeService.searchSimilarRecipes(
      recipeText,
      userTrack,
      chefId,
      organizationId,
      limit,
      includeCrossTrack,
    );
  } else {
    return pgvectorService.searchSimilarRecipes(
      recipeText,
      userTrack,
      chefId,
      organizationId,
      limit,
      includeCrossTrack,
    );
  }
} /** * Get recipes by track */
export async function getRecipesByTrack(
  track: RecipeTrack,
  organizationId: string,
  limit: number = 50,
): Promise<RecipeSimilarityMatch[]> {
  const engine = getActiveEngine();
  if (engine === "pinecone") {
    return pineconeService.getRecipesByTrack(track, organizationId, limit);
  } else {
    return pgvectorService.getRecipesByTrack(track, organizationId, limit);
  }
} /** * Delete a recipe vector */
export async function deleteRecipeVector(
  recipeId: string,
  track: RecipeTrack,
  chefId: string,
): Promise<void> {
  const engine = getActiveEngine();
  if (engine === "pinecone") {
    return pineconeService.deleteRecipeVector(recipeId, track, chefId);
  } else {
    return pgvectorService.deleteRecipeVector(recipeId, track, chefId);
  }
} /** * Get cross-track learning suggestions */
export async function getCrossTrackLearning(
  recipeText: string,
  organizationId: string,
  limit: number = 5,
): Promise<RecipeSimilarityMatch[]> {
  const engine = getActiveEngine();
  if (engine === "pinecone") {
    return pineconeService.getCrossTrackLearning(
      recipeText,
      organizationId,
      limit,
    );
  } else {
    return pgvectorService.getCrossTrackLearning(
      recipeText,
      organizationId,
      limit,
    );
  }
} /** * Export engine information for client telemetry */
export function getEngineInfo(): {
  engine: VectorEngine;
  description: string;
  costLevel: "free" | "paid";
} {
  const engine = getActiveEngine();
  if (engine === "pinecone") {
    return {
      engine,
      description: "Pinecone Vector Database (High Performance)",
      costLevel: "paid",
    };
  } else {
    return {
      engine,
      description: "Supabase pgvector (Cost Optimized)",
      costLevel: "free",
    };
  }
}
