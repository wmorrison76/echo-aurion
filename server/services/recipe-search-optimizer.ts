/**
 * Recipe Search Optimizer
 * Optimizes vector search for recipes with improved accuracy and performance
 * 
 * Features:
 * - Optimized vector search (Pinecone/pgvector)
 * - Search accuracy improvements
 * - Performance optimizations
 * - Hybrid search (vector + keyword)
 * - Search result ranking
 */

import { logger } from "../lib/logger";
import { supabase } from "../lib/supabase";

/**
 * Recipe Search Types
 */
export interface OptimizedRecipeSearchResult {
  recipeId: string;
  title: string;
  description?: string;
  similarityScore: number; // 0-1 (vector similarity)
  keywordScore: number; // 0-1 (keyword match)
  combinedScore: number; // 0-1 (weighted combination)
  matchType: "vector" | "keyword" | "hybrid";
  matchedTerms: string[];
  metadata?: Record<string, any>;
}

export interface RecipeSearchOptions {
  orgId: string;
  query: string;
  filters?: {
    cuisine?: string;
    course?: string;
    difficulty?: string;
    dietaryTags?: string[];
    prepTimeMax?: number;
    cookTimeMax?: number;
  };
  searchType?: "vector" | "keyword" | "hybrid";
  limit?: number;
  minSimilarity?: number; // Minimum similarity score (0-1)
}

export interface SearchPerformanceMetrics {
  query: string;
  searchType: "vector" | "keyword" | "hybrid";
  resultCount: number;
  averageSimilarity: number;
  averageKeywordScore: number;
  averageCombinedScore: number;
  executionTime: number; // milliseconds
  cacheHit: boolean;
}

/**
 * Recipe Search Optimizer
 */
export class RecipeSearchOptimizer {
  private searchCache: Map<string, { results: OptimizedRecipeSearchResult[]; expiresAt: number }> =
    new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Optimized recipe search (hybrid: vector + keyword)
   */
  async searchRecipes(options: RecipeSearchOptions): Promise<OptimizedRecipeSearchResult[]> {
    const startTime = Date.now();
    const { query, orgId, filters, searchType = "hybrid", limit = 20, minSimilarity = 0.6 } = options;

    try {
      logger.info("[RecipeSearchOptimizer] Searching recipes", {
        query,
        orgId,
        searchType,
        limit,
      });

      // Check cache
      const cacheKey = this.getCacheKey(options);
      const cached = this.searchCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        logger.debug("[RecipeSearchOptimizer] Cache hit", { query });
        return cached.results;
      }

      let results: OptimizedRecipeSearchResult[] = [];

      // Hybrid search (vector + keyword)
      if (searchType === "hybrid" || searchType === "vector") {
        // Vector search via Pinecone/pgvector
        try {
          const vectorResults = await this.vectorSearch(query, orgId, limit * 2);
          results.push(...vectorResults);
        } catch (error) {
          logger.warn("[RecipeSearchOptimizer] Vector search failed, falling back to keyword", {
            error,
            query,
          });
        }
      }

      // Keyword search (fallback or hybrid)
      if (searchType === "hybrid" || searchType === "keyword" || results.length === 0) {
        const keywordResults = await this.keywordSearch(query, orgId, filters, limit * 2);
        results.push(...keywordResults);
      }

      // Merge and deduplicate results
      const mergedResults = this.mergeSearchResults(results, query);

      // Apply filters
      const filteredResults = this.applyFilters(mergedResults, filters);

      // Rank and score results
      const rankedResults = this.rankResults(filteredResults, query);

      // Filter by minimum similarity
      const finalResults = rankedResults
        .filter((r) => r.combinedScore >= minSimilarity)
        .slice(0, limit);

      // Cache results
      this.searchCache.set(cacheKey, {
        results: finalResults,
        expiresAt: Date.now() + this.CACHE_TTL,
      });

      const executionTime = Date.now() - startTime;

      logger.info("[RecipeSearchOptimizer] Search complete", {
        query,
        resultCount: finalResults.length,
        executionTime,
      });

      // Track analytics (non-blocking)
      try {
        const { recipeSearchAnalyticsService } = await import('./recipe-search-analytics-service.js');
        recipeSearchAnalyticsService
          .trackSearch({
            orgId: options.orgId,
            userId: undefined, // Will be set by route handler
            query: options.query,
            queryType: options.searchType || 'hybrid',
            resultsCount: finalResults.length,
            latencyMs: executionTime,
            engine: 'pgvector', // TODO: Track actual engine used
            filters: options.filters,
            success: finalResults.length > 0,
          })
          .catch((error) => {
            logger.error('[RecipeSearchOptimizer] Failed to track analytics', { error });
          });
      } catch (error) {
        // Analytics service not available - continue without tracking
        logger.debug('[RecipeSearchOptimizer] Analytics service not available', { error });
      }

      return finalResults;
    } catch (error) {
      logger.error("[RecipeSearchOptimizer] Search failed", { error, query, orgId });
      return [];
    }
  }

  /**
   * Vector search (Pinecone/pgvector)
   */
  private async vectorSearch(
    query: string,
    orgId: string,
    limit: number,
  ): Promise<OptimizedRecipeSearchResult[]> {
    try {
      // Generate query embedding using OpenAI or local model
      let queryEmbedding: number[];
      
      try {
        // Try OpenAI embedding API
        const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY || process.env.ECHO_OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: query,
            model: "text-embedding-3-small",
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          queryEmbedding = embeddingData.data[0]?.embedding;
        } else {
          throw new Error(`Embedding API error: ${embeddingResponse.status}`);
        }
      } catch (error) {
        logger.warn("[RecipeSearchOptimizer] OpenAI embedding failed, using keyword-only search", { error });
        // Fall back to keyword search if embedding fails
        return [];
      }

      if (!queryEmbedding || queryEmbedding.length === 0) {
        throw new Error("Failed to generate embedding");
      }

      try {
        // Search using pgvector (Supabase) - check if function exists
        const { data, error } = await supabase.rpc("search_similar_recipes", {
          query_embedding: queryEmbedding,
          search_organization_id: orgId,
          search_track: "fine-dining", // Default track
          search_limit: limit,
          include_cross_track: true,
        });

        if (error) {
          // If RPC function doesn't exist, fall back to direct table query with pgvector
          logger.warn(
            "[RecipeSearchOptimizer] RPC function not available, using direct query",
            { error },
          );

          // Fallback: direct vector search on recipes table
          const { data: directResults, error: directError } = await supabase
            .from("recipes")
            .select("id, name, description, embedding")
            .eq("org_id", orgId)
            .not("embedding", "is", null)
            .limit(limit);

          if (directError) throw directError;

          // Calculate cosine similarity manually if needed
          // For now, return basic results
          return (directResults || []).map((item: any) => ({
            recipeId: item.id,
            title: item.name,
            description: item.description,
            similarityScore: 0.8, // Placeholder - would calculate actual similarity
            keywordScore: 0,
            combinedScore: 0.8,
            matchType: "vector" as const,
            matchedTerms: [],
            metadata: {},
          }));
        }

        return (data || []).map((item: any) => ({
          recipeId: item.recipe_id || item.id,
          title: item.title || item.name,
          description: item.metadata?.description || item.description,
          similarityScore: item.similarity || 0,
          keywordScore: 0, // Will be calculated in merge
          combinedScore: item.similarity || 0,
          matchType: "vector" as const,
          matchedTerms: [],
          metadata: item.metadata || {},
        }));
      } catch (rpcError) {
        logger.warn(
          "[RecipeSearchOptimizer] Vector search RPC failed, using keyword fallback",
          { error: rpcError },
        );
        // Fall back to empty array - keyword search will handle it
        return [];
      }
    } catch (error) {
      logger.warn("[RecipeSearchOptimizer] Vector search failed", { error, query });
      return [];
    }
  }

  /**
   * Keyword search (SQL full-text search)
   */
  private async keywordSearch(
    query: string,
    orgId: string,
    filters: RecipeSearchOptions["filters"],
    limit: number,
  ): Promise<OptimizedRecipeSearchResult[]> {
    try {
      // Build SQL query with full-text search
      let searchQuery = supabase
        .from("recipes")
        .select("id, name, description, cuisine, course, difficulty, prep_time, cook_time, dietary_tags, tags")
        .eq("org_id", orgId)
        .or(
          `name.ilike.%${query}%,description.ilike.%${query}%,ingredients.ilike.%${query}%,tags.cs.{${query}}`,
        );

      // Apply filters
      if (filters?.cuisine) {
        searchQuery = searchQuery.eq("cuisine", filters.cuisine);
      }
      if (filters?.course) {
        searchQuery = searchQuery.eq("course", filters.course);
      }
      if (filters?.difficulty) {
        searchQuery = searchQuery.eq("difficulty", filters.difficulty);
      }
      if (filters?.dietaryTags && filters.dietaryTags.length > 0) {
        searchQuery = searchQuery.contains("dietary_tags", filters.dietaryTags);
      }
      if (filters?.prepTimeMax) {
        searchQuery = searchQuery.lte("prep_time", filters.prepTimeMax);
      }
      if (filters?.cookTimeMax) {
        searchQuery = searchQuery.lte("cook_time", filters.cookTimeMax);
      }

      const { data, error } = await searchQuery.limit(limit);

      if (error) throw error;

      // Calculate keyword scores
      const queryTerms = query.toLowerCase().split(/\s+/);

      return (data || []).map((item: any) => {
        const keywordScore = this.calculateKeywordScore(queryTerms, item);
        return {
          recipeId: item.id,
          title: item.name,
          description: item.description,
          similarityScore: 0, // Will be calculated in merge if vector results exist
          keywordScore,
          combinedScore: keywordScore,
          matchType: "keyword" as const,
          matchedTerms: this.extractMatchedTerms(queryTerms, item),
          metadata: {
            cuisine: item.cuisine,
            course: item.course,
            difficulty: item.difficulty,
            prepTime: item.prep_time,
            cookTime: item.cook_time,
            dietaryTags: item.dietary_tags,
            tags: item.tags,
          },
        };
      });
    } catch (error) {
      logger.error("[RecipeSearchOptimizer] Keyword search failed", { error, query });
      return [];
    }
  }

  /**
   * Calculate keyword match score
   */
  private calculateKeywordScore(queryTerms: string[], recipe: any): number {
    let score = 0;
    const recipeText = `${recipe.name || ""} ${recipe.description || ""} ${(recipe.tags || []).join(" ")} ${(recipe.ingredients || []).join(" ")}`.toLowerCase();

    // Exact match in title (highest weight)
    if (recipe.name && recipe.name.toLowerCase().includes(queryTerms.join(" "))) {
      score += 0.5;
    } else {
      // Partial matches
      const titleMatches = queryTerms.filter((term) =>
        (recipe.name || "").toLowerCase().includes(term),
      ).length;
      score += 0.3 * (titleMatches / queryTerms.length);
    }

    // Description match
    if (recipe.description) {
      const descMatches = queryTerms.filter((term) =>
        recipe.description.toLowerCase().includes(term),
      ).length;
      score += 0.2 * (descMatches / queryTerms.length);
    }

    // Tag match
    if (recipe.tags && recipe.tags.length > 0) {
      const tagMatches = recipe.tags.filter((tag: string) =>
        queryTerms.some((term) => tag.toLowerCase().includes(term)),
      ).length;
      score += 0.2 * (tagMatches / Math.max(recipe.tags.length, queryTerms.length));
    }

    // Ingredient match (if available)
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      const ingredientMatches = recipe.ingredients.filter((ing: string) =>
        queryTerms.some((term) => ing.toLowerCase().includes(term)),
      ).length;
      score += 0.1 * (ingredientMatches / Math.max(recipe.ingredients.length, queryTerms.length));
    }

    return Math.min(1, score);
  }

  /**
   * Extract matched terms from recipe
   */
  private extractMatchedTerms(queryTerms: string[], recipe: any): string[] {
    const matched: string[] = [];
    const recipeText = `${recipe.name || ""} ${recipe.description || ""} ${(recipe.tags || []).join(" ")}`.toLowerCase();

    for (const term of queryTerms) {
      if (recipeText.includes(term)) {
        matched.push(term);
      }
    }

    return matched;
  }

  /**
   * Merge vector and keyword search results
   */
  private mergeSearchResults(
    results: OptimizedRecipeSearchResult[],
    query: string,
  ): OptimizedRecipeSearchResult[] {
    const merged = new Map<string, OptimizedRecipeSearchResult>();

    for (const result of results) {
      const existing = merged.get(result.recipeId);

      if (existing) {
        // Merge scores (use highest similarity, combine keyword scores)
        existing.similarityScore = Math.max(existing.similarityScore, result.similarityScore);
        existing.keywordScore = Math.max(existing.keywordScore, result.keywordScore);
        existing.matchType = existing.matchType === "vector" || result.matchType === "vector" ? "hybrid" : "keyword";
        existing.matchedTerms = [...new Set([...existing.matchedTerms, ...result.matchedTerms])];
      } else {
        merged.set(result.recipeId, result);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Apply filters to search results
   */
  private applyFilters(
    results: OptimizedRecipeSearchResult[],
    filters?: RecipeSearchOptions["filters"],
  ): OptimizedRecipeSearchResult[] {
    if (!filters) return results;

    return results.filter((result) => {
      const metadata = result.metadata || {};

      if (filters.cuisine && metadata.cuisine !== filters.cuisine) {
        return false;
      }

      if (filters.course && metadata.course !== filters.course) {
        return false;
      }

      if (filters.difficulty && metadata.difficulty !== filters.difficulty) {
        return false;
      }

      if (filters.dietaryTags && filters.dietaryTags.length > 0) {
        const recipeTags = metadata.dietaryTags || [];
        const hasMatchingTag = filters.dietaryTags.some((tag) => recipeTags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      if (filters.prepTimeMax && (metadata.prepTime || 0) > filters.prepTimeMax) {
        return false;
      }

      if (filters.cookTimeMax && (metadata.cookTime || 0) > filters.cookTimeMax) {
        return false;
      }

      return true;
    });
  }

  /**
   * Rank results by combined score
   */
  private rankResults(
    results: OptimizedRecipeSearchResult[],
    query: string,
  ): OptimizedRecipeSearchResult[] {
    // Calculate combined score (weighted average: 60% vector, 40% keyword)
    const ranked = results.map((result) => {
      const combinedScore = result.similarityScore * 0.6 + result.keywordScore * 0.4;
      return {
        ...result,
        combinedScore,
      };
    });

    // Sort by combined score (descending)
    ranked.sort((a, b) => b.combinedScore - a.combinedScore);

    return ranked;
  }

  /**
   * Get cache key for search options
   */
  private getCacheKey(options: RecipeSearchOptions): string {
    return `${options.orgId}:${options.query}:${JSON.stringify(options.filters)}:${options.searchType}`;
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
    logger.info("[RecipeSearchOptimizer] Cache cleared");
  }

  /**
   * Get search performance metrics
   */
  async getSearchPerformance(
    query: string,
    searchType: "vector" | "keyword" | "hybrid",
    results: OptimizedRecipeSearchResult[],
    executionTime: number,
    cacheHit: boolean,
  ): Promise<SearchPerformanceMetrics> {
    const averageSimilarity =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.similarityScore, 0) / results.length
        : 0;
    const averageKeywordScore =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.keywordScore, 0) / results.length
        : 0;
    const averageCombinedScore =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.combinedScore, 0) / results.length
        : 0;

    return {
      query,
      searchType,
      resultCount: results.length,
      averageSimilarity,
      averageKeywordScore,
      averageCombinedScore,
      executionTime,
      cacheHit,
    };
  }
}

// Export singleton instance
export const recipeSearchOptimizer = new RecipeSearchOptimizer();
