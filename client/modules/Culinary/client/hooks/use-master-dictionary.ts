/**
 * Use Master Culinary Dictionary Hook
 * Connects Echo's chat interface to the master culinary dictionary API
 * Enables knowledge queries across 10,000+ authoritative culinary terms
 */

import { useState, useCallback } from 'react';
import type { MasterCulinaryTerm } from '../../server/lib/master-culinary-dictionary';

interface DictionarySearchResult {
  status: string;
  entry?: {
    term: MasterCulinaryTerm | undefined;
    related: MasterCulinaryTerm[];
    statistics: any;
  };
  suggestions?: Array<{
    term: string;
    definition: string;
  }>;
  message: string;
}

interface DictionaryStats {
  totalTerms: number;
  categories: Record<string, number>;
  masteryLevels: Record<string, number>;
  averageConfidence: number;
}

interface LibraryStatus {
  masterDictionary: {
    totalTerms: number;
    categories: Record<string, number>;
    masteryLevels: Record<string, number>;
    averageConfidence: number;
  };
  culinaryTerminology: {
    totalTerms: number;
    categories: Record<string, number>;
  };
  hospitalityKnowledge: {
    totalKnowledge: number;
    categories: Record<string, number>;
  };
  combinedKnowledgeBase: number;
  readiness: {
    masterLevel: string;
    culinaryAuthority: string;
    knowledgeRetention: string;
  };
}

/**
 * Hook for accessing master culinary dictionary
 */
export function useMasterDictionary() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Search for a term in the master dictionary
   */
  const searchTerm = useCallback(
    async (term: string): Promise<DictionarySearchResult | null> => {
      if (!term.trim()) {
        setError('Search term is required');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/echo/hungry-learning/master-dictionary/${encodeURIComponent(term)}`
        );

        if (!response.ok) {
          const data = await response.json();
          setError(data.message || 'Term not found');
          return data;
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to search dictionary';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get terms by category
   */
  const getTermsByCategory = useCallback(
    async (category: string): Promise<{ entries: MasterCulinaryTerm[]; total: number } | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/echo/hungry-learning/master-dictionary/category/${encodeURIComponent(category)}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch category');
        }

        const data = await response.json();
        return {
          entries: data.entries || [],
          total: data.total || 0,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get terms by category';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get terms by mastery level
   */
  const getTermsByMasteryLevel = useCallback(
    async (
      level: 'fundamental' | 'intermediate' | 'advanced' | 'expert' | 'master'
    ): Promise<{ entries: MasterCulinaryTerm[]; total: number } | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/echo/hungry-learning/master-dictionary/mastery/${encodeURIComponent(level)}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch mastery level');
        }

        const data = await response.json();
        return {
          entries: data.entries || [],
          total: data.total || 0,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get terms by mastery level';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get dictionary statistics
   */
  const getStatistics = useCallback(async (): Promise<DictionaryStats | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/echo/hungry-learning/master-dictionary/statistics`);

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      return data.statistics;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get statistics';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get library import status
   */
  const getLibraryStatus = useCallback(async (): Promise<LibraryStatus | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/echo/hungry-learning/library-status`);

      if (!response.ok) {
        throw new Error('Failed to fetch library status');
      }

      const data = await response.json();
      return data.knowledge;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get library status';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Search across all knowledge domains (master dictionary, terminology, hospitality)
   */
  const searchAllKnowledge = useCallback(
    async (query: string): Promise<any | null> => {
      if (!query.trim()) {
        setError('Search query is required');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/echo/hungry-learning/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to search knowledge';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    searchTerm,
    getTermsByCategory,
    getTermsByMasteryLevel,
    getStatistics,
    getLibraryStatus,
    searchAllKnowledge,
    isLoading,
    error,
  };
}

/**
 * Enhanced hook with caching for better performance
 */
export function useMasterDictionaryWithCache() {
  const base = useMasterDictionary();
  const [cache, setCache] = useState<Map<string, any>>(new Map());

  const searchTermCached = useCallback(
    async (term: string) => {
      const cacheKey = `term:${term.toLowerCase()}`;
      
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }

      const result = await base.searchTerm(term);
      
      if (result) {
        setCache(prev => new Map(prev).set(cacheKey, result));
      }

      return result;
    },
    [base, cache]
  );

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  return {
    ...base,
    searchTerm: searchTermCached,
    clearCache,
    cacheSize: cache.size,
  };
}
