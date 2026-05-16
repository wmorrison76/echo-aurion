import { generateEmbedding } from "./vector-engine"; /** * Generate embeddings for text using the existing vector engine * Abstracts Pinecone/pgvector seamlessly * Used by EchoChefBrain API endpoint */
export async function generateEmbeddingForQuery(
  text: string,
): Promise<number[]> {
  try {
    const embedding = await generateEmbedding(text);
    return embedding;
  } catch (error) {
    console.error("[EchoChef] Embedding generation failed:", error);
    throw new Error(
      `Failed to generate embedding: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
} /** * Generate embeddings for multiple texts (batch) */
export async function generateEmbeddingsForRecipes(
  recipes: Array<{ id: string; text: string }>,
): Promise<Map<string, number[]>> {
  const embeddings = new Map<string, number[]>();
  for (const recipe of recipes) {
    try {
      const embedding = await generateEmbeddingForQuery(recipe.text);
      embeddings.set(recipe.id, embedding);
    } catch (error) {
      console.error(`[EchoChef] Failed to embed recipe ${recipe.id}:`, error);
    }
  }
  return embeddings;
}
