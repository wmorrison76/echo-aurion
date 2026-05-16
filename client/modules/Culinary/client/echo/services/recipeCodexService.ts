import {
  RecipeVectorStore,
  RecipeVectorSearchResult,
} from "./recipeVectorStore";
import type { RecipeCodexMetadata } from "../codex";

export class RecipeCodexService {
  static async searchByQueryEmbedding(
    queryVector: number[],
    options?: {
      topK?: number;
      filters?: Partial<RecipeCodexMetadata>;
    },
  ): Promise<RecipeVectorSearchResult[]> {
    return RecipeVectorStore.semanticSearch(
      queryVector,
      options?.topK ?? 10,
      options?.filters,
    );
  }

  static async findSimilarRecipes(
    recipeEmbedding: number[],
    options?: {
      topK?: number;
      excludeId?: string;
      filters?: Partial<RecipeCodexMetadata>;
    },
  ): Promise<RecipeVectorSearchResult[]> {
    const results = await RecipeVectorStore.semanticSearch(
      recipeEmbedding,
      options?.topK ?? 10,
      options?.filters,
    );

    if (options?.excludeId) {
      return results.filter((r) => r.id !== options.excludeId);
    }

    return results;
  }
}
