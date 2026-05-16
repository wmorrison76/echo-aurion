import { getRecipeIndex } from "./pineconeClient";
import type { RecipeCodexMetadata } from "../codex";

export interface RecipeVectorRecord {
  id: string;
  values: number[];
  metadata: RecipeCodexMetadata & {
    [key: string]: any;
  };
}

export interface RecipeVectorSearchResult {
  id: string;
  score: number;
  metadata: RecipeCodexMetadata;
}

export class RecipeVectorStore {
  static async upsertRecipes(records: RecipeVectorRecord[]): Promise<void> {
    const index = getRecipeIndex();

    await index.upsert(
      records.map((r) => ({
        id: r.id,
        values: r.values,
        metadata: r.metadata,
      })),
    );
  }

  static async semanticSearch(
    queryVector: number[],
    topK: number = 10,
    filters?: Partial<RecipeCodexMetadata>,
  ): Promise<RecipeVectorSearchResult[]> {
    const index = getRecipeIndex();

    const filter = filters
      ? Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== undefined),
        )
      : undefined;

    const result = await index.query({
      topK,
      vector: queryVector,
      includeMetadata: true,
      filter: filter as any,
    });

    return (
      result.matches?.map((m) => ({
        id: m.id!,
        score: m.score ?? 0,
        metadata: m.metadata as RecipeCodexMetadata,
      })) ?? []
    );
  }
}
