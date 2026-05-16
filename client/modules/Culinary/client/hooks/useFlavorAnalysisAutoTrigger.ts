/**
 * useFlavorAnalysisAutoTrigger
 * 
 * React hook for automatic flavor analysis triggers.
 * 
 * Features:
 * - Auto-analyze on recipe save
 * - Auto-analyze on recipe modification
 * - Auto-analyze on recipe duplication
 * - Debounced updates for performance
 * - Caching to avoid redundant API calls
 * 
 * Usage:
 * const { analysis, isLoading, error } = useFlavorAnalysisAutoTrigger(recipe);
 */

import { useEffect, useState, useCallback, useRef } from "react";
import type { FlavorAnalysisResult } from "@/shared/echo/flavor-engine";

export interface UseFlavorAnalysisAutoTriggerOptions {
  enabled?: boolean;
  debounceMs?: number;
  cacheKey?: string;
  apiUrl?: string;
  onAnalysisComplete?: (analysis: FlavorAnalysisResult) => void;
  onError?: (error: Error) => void;
}

export function useFlavorAnalysisAutoTrigger(
  recipe: any | null | undefined,
  options: UseFlavorAnalysisAutoTriggerOptions = {}
) {
  const {
    enabled = true,
    debounceMs = 1000,
    cacheKey = "",
    apiUrl = "/api",
    onAnalysisComplete,
    onError,
  } = options;

  const [analysis, setAnalysis] = useState<FlavorAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Cache to avoid re-analyzing same recipe
  const cacheRef = useRef<Map<string, FlavorAnalysisResult>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRecipeHashRef = useRef<string>("");

  // Generate hash of recipe for cache key
  const getRecipeHash = useCallback((r: any) => {
    if (!r) return "";
    try {
      return JSON.stringify(r);
    } catch {
      return "";
    }
  }, []);

  // Trigger analysis
  const triggerAnalysis = useCallback(
    async (recipeToAnalyze: any) => {
      if (!enabled || !recipeToAnalyze) {
        setAnalysis(null);
        return;
      }

      const hash = getRecipeHash(recipeToAnalyze);
      const cacheKey_ = cacheKey || hash;

      // Check cache first
      if (cacheRef.current.has(cacheKey_)) {
        const cachedAnalysis = cacheRef.current.get(cacheKey_)!;
        setAnalysis(cachedAnalysis);
        onAnalysisComplete?.(cachedAnalysis);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/echo/flavor/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(recipeToAnalyze),
        });

        if (!response.ok) {
          throw new Error(`Analysis failed: ${response.statusText}`);
        }

        const result = await response.json();
        const analysisData = result.analysis as FlavorAnalysisResult;

        // Cache result
        cacheRef.current.set(cacheKey_, analysisData);

        // Limit cache size
        if (cacheRef.current.size > 100) {
          const firstKey = cacheRef.current.keys().next().value;
          cacheRef.current.delete(firstKey);
        }

        setAnalysis(analysisData);
        onAnalysisComplete?.(analysisData);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [enabled, apiUrl, cacheKey, getRecipeHash, onAnalysisComplete, onError]
  );

  // Auto-trigger analysis with debounce
  useEffect(() => {
    if (!enabled || !recipe) {
      return;
    }

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const recipeHash = getRecipeHash(recipe);

    // Only re-analyze if recipe changed
    if (recipeHash !== lastRecipeHashRef.current) {
      lastRecipeHashRef.current = recipeHash;

      // Debounce the analysis
      debounceTimerRef.current = setTimeout(() => {
        triggerAnalysis(recipe);
      }, debounceMs);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [recipe, enabled, debounceMs, triggerAnalysis, getRecipeHash]);

  // Manual trigger function
  const manualTrigger = useCallback(() => {
    if (recipe) {
      triggerAnalysis(recipe);
    }
  }, [recipe, triggerAnalysis]);

  // Clear cache
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    analysis,
    isLoading,
    error,
    manualTrigger,
    clearCache,
    cacheSize: cacheRef.current.size,
  };
}

/**
 * Hook for tracking recipe changes (save, modify, duplicate events)
 * 
 * Usage:
 * const { isSaved, onSave, onModify, onDuplicate } = useRecipeChangeTracking(recipe);
 */
export function useRecipeChangeTracking(recipe: any | null | undefined) {
  const [isSaved, setIsSaved] = useState(true);
  const [lastSavedRecipe, setLastSavedRecipe] = useState<any>(null);
  const [changeType, setChangeType] = useState<
    "saved" | "modified" | "duplicated" | null
  >(null);

  // Check if recipe has been modified
  useEffect(() => {
    if (!recipe) return;

    const isModified =
      lastSavedRecipe &&
      JSON.stringify(recipe) !== JSON.stringify(lastSavedRecipe);

    setIsSaved(!isModified);
  }, [recipe, lastSavedRecipe]);

  const onSave = useCallback(() => {
    setLastSavedRecipe(recipe);
    setIsSaved(true);
    setChangeType("saved");

    // Clear change type after 2 seconds
    setTimeout(() => setChangeType(null), 2000);
  }, [recipe]);

  const onModify = useCallback(() => {
    setIsSaved(false);
    setChangeType("modified");

    // Clear change type after 2 seconds
    setTimeout(() => setChangeType(null), 2000);
  }, []);

  const onDuplicate = useCallback(() => {
    // Duplication resets the "saved" state
    setLastSavedRecipe(null);
    setIsSaved(false);
    setChangeType("duplicated");

    // Clear change type after 2 seconds
    setTimeout(() => setChangeType(null), 2000);
  }, []);

  return {
    isSaved,
    changeType,
    onSave,
    onModify,
    onDuplicate,
  };
}

/**
 * Combined hook for flavor analysis with change tracking
 * 
 * Usage:
 * const { analysis, isLoading, error, isSaved, changeType } = 
 *   useRecipeFlavorAnalysis(recipe, { autoAnalyze: true });
 */
export function useRecipeFlavorAnalysis(
  recipe: any | null | undefined,
  options: UseFlavorAnalysisAutoTriggerOptions & {
    autoAnalyze?: boolean;
  } = {}
) {
  const { autoAnalyze = true, ...analysisOptions } = options;

  const flavorAnalysis = useFlavorAnalysisAutoTrigger(recipe, {
    ...analysisOptions,
    enabled: (analysisOptions.enabled ?? true) && autoAnalyze,
  });

  const changeTracking = useRecipeChangeTracking(recipe);

  return {
    // Flavor analysis results
    analysis: flavorAnalysis.analysis,
    isLoading: flavorAnalysis.isLoading,
    error: flavorAnalysis.error,
    manualTrigger: flavorAnalysis.manualTrigger,
    clearCache: flavorAnalysis.clearCache,

    // Change tracking
    isSaved: changeTracking.isSaved,
    changeType: changeTracking.changeType,
    onSave: changeTracking.onSave,
    onModify: changeTracking.onModify,
    onDuplicate: changeTracking.onDuplicate,
  };
}
