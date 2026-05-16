import { useState, useCallback, useEffect } from "react";
import {
  getIngredientDatabaseManager,
  type StandardizedIngredient,
} from "@/lib/ingredient-database-connector";

interface UseIngredientDatabaseOptions {
  usdaApiKey?: string;
  enableUSDA?: boolean;
  enableOpenFoodFacts?: boolean;
}

/**
 * Hook for searching and accessing standardized ingredient data
 * Supports USDA FoodData Central and Open Food Facts
 */
export function useIngredientDatabase(options: UseIngredientDatabaseOptions = {}) {
  const {
    usdaApiKey,
    enableUSDA = true,
    enableOpenFoodFacts = true,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<StandardizedIngredient[]>([]);

  // Get or create database manager
  const manager = getIngredientDatabaseManager(usdaApiKey);

  /**
   * Search for ingredients in standardized databases
   */
  const search = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const searchResults = await manager.search(query);
        setResults(searchResults);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to search ingredient database: ${errorMessage}`);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [manager]
  );

  /**
   * Get ingredient from cache
   */
  const getFromCache = useCallback(
    (name: string): StandardizedIngredient | undefined => {
      return manager.getFromCache(name);
    },
    [manager]
  );

  /**
   * Cache an ingredient
   */
  const cacheIngredient = useCallback(
    (ingredient: StandardizedIngredient) => {
      manager.cacheIngredient(ingredient);
    },
    [manager]
  );

  /**
   * Get detailed nutrition information for an ingredient
   */
  const getNutrition = useCallback(
    (ingredient: StandardizedIngredient) => {
      if (!ingredient.nutrition) {
        return null;
      }

      return {
        perHundredGrams: ingredient.nutrition,
        source: ingredient.dataSource,
        quality: ingredient.dataQuality,
      };
    },
    []
  );

  /**
   * Get allergen information
   */
  const getAllergens = useCallback((ingredient: StandardizedIngredient) => {
    return ingredient.allergens || [];
  }, []);

  /**
   * Clear all cached data
   */
  const clearCache = useCallback(() => {
    manager.clearCache();
  }, [manager]);

  return {
    // Actions
    search,
    getFromCache,
    cacheIngredient,
    clearCache,
    getNutrition,
    getAllergens,

    // State
    results,
    isLoading,
    error,
  };
}

/**
 * Hook to enrich an ingredient with standardized database data
 * Links local inventory items with national database data
 */
export function useIngredientEnrichment(
  localIngredientName: string,
  options: UseIngredientDatabaseOptions = {}
) {
  const [enrichedData, setEnrichedData] = useState<StandardizedIngredient | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const { search, getFromCache, cacheIngredient } = useIngredientDatabase(options);

  /**
   * Enrich the local ingredient with national database data
   */
  const enrich = useCallback(async () => {
    if (!localIngredientName.trim()) {
      setEnrichedData(null);
      return;
    }

    // Check cache first
    const cached = getFromCache(localIngredientName);
    if (cached) {
      setEnrichedData(cached);
      return;
    }

    setIsEnriching(true);
    try {
      const results = await search(localIngredientName);
      if (results.length > 0) {
        const best = results[0]; // Use highest confidence match
        cacheIngredient(best);
        setEnrichedData(best);
      } else {
        setEnrichedData(null);
      }
    } catch (error) {
      console.error("Enrichment error:", error);
      setEnrichedData(null);
    } finally {
      setIsEnriching(false);
    }
  }, [localIngredientName, search, getFromCache, cacheIngredient]);

  // Auto-enrich when ingredient name changes
  useEffect(() => {
    enrich();
  }, [localIngredientName, enrich]);

  return {
    enrichedData,
    isEnriching,
    manualEnrich: enrich,
  };
}
