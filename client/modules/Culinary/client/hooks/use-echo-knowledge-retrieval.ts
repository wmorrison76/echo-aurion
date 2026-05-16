/**
 * Hook for Echo AI to use hybrid knowledge base + OpenAI retrieval
 * Dramatically speeds up response times and reduces API costs
 */

import { useCallback, useRef } from "react";
import {
  retrieveSmartly,
  retrieveWithHybridSearch,
  retrieveFromKnowledgeBaseOnly,
  recordRetrievalStat,
  type EchoRetrievalResult,
} from "@/lib/echo-knowledge-retrieval";

export interface UseEchoKnowledgeRetrievalOptions {
  /** Use knowledge base retrieval (default: true) */
  useKnowledgeBase?: boolean;
  /** Use OpenAI as fallback (default: true) */
  useOpenAiFallback?: boolean;
  /** Retrieval strategy: 'smart' (default), 'hybrid', 'kb-only', 'parallel' */
  strategy?: "smart" | "hybrid" | "kb-only" | "parallel";
  /** Enable stats recording (default: true) */
  recordStats?: boolean;
}

/**
 * Hook for Echo AI to retrieve answers using hybrid knowledge base
 * Example usage:
 *
 * const { retrieve, isLoading, lastResult } = useEchoKnowledgeRetrieval();
 *
 * const handleQuestion = async (question: string) => {
 *   const result = await retrieve(question);
 *   console.log(result.answer);
 *   console.log(`Answer from: ${result.source}`);
 *   console.log(`Response time: ${result.responseTime}ms`);
 * };
 */
export function useEchoKnowledgeRetrieval(
  options: UseEchoKnowledgeRetrievalOptions = {}
) {
  const {
    useKnowledgeBase = true,
    useOpenAiFallback = true,
    strategy = "smart",
    recordStats = true,
  } = options;

  const isLoadingRef = useRef(false);
  const lastResultRef = useRef<EchoRetrievalResult | null>(null);

  /**
   * Retrieve answer using configured strategy
   */
  const retrieve = useCallback(
    async (question: string): Promise<EchoRetrievalResult> => {
      if (!useKnowledgeBase) {
        return {
          answer: "Knowledge base is disabled.",
          source: "knowledge-base",
          confidence: 0,
          responseTime: 0,
          apiCallsUsed: 0,
        };
      }

      isLoadingRef.current = true;

      try {
        let result: EchoRetrievalResult;

        switch (strategy) {
          case "kb-only":
            result = await retrieveFromKnowledgeBaseOnly(question);
            break;
          case "hybrid":
            result = await retrieveWithHybridSearch(question, useOpenAiFallback);
            break;
          case "smart":
          default:
            result = await retrieveSmartly(question);
            break;
        }

        // Record stats if enabled
        if (recordStats) {
          recordRetrievalStat(result);
        }

        lastResultRef.current = result;
        return result;
      } catch (error) {
        const errorResult: EchoRetrievalResult = {
          answer: `Error retrieving information: ${error instanceof Error ? error.message : "Unknown error"}`,
          source: "knowledge-base",
          confidence: 0,
          responseTime: 0,
          apiCallsUsed: 0,
        };

        if (recordStats) {
          recordRetrievalStat(errorResult);
        }

        lastResultRef.current = errorResult;
        return errorResult;
      } finally {
        isLoadingRef.current = false;
      }
    },
    [useKnowledgeBase, useOpenAiFallback, strategy, recordStats]
  );

  /**
   * Retrieve multiple questions in parallel
   */
  const retrieveMultiple = useCallback(
    async (questions: string[]): Promise<EchoRetrievalResult[]> => {
      const results = await Promise.all(questions.map((q) => retrieve(q)));
      return results;
    },
    [retrieve]
  );

  /**
   * Check if knowledge base has been trained
   */
  const isKnowledgeBaseTrained = useCallback((): boolean => {
    try {
      const imports = JSON.parse(localStorage.getItem("echo:imports") || "[]");
      return imports.length > 0;
    } catch {
      return false;
    }
  }, []);

  /**
   * Get knowledge base training status
   */
  const getTrainingStatus = useCallback(
    () => {
      try {
        const imports = JSON.parse(localStorage.getItem("echo:imports") || "[]");
        const stats = JSON.parse(
          localStorage.getItem("echo:retrieval-stats") || "{}"
        );

        return {
          isTrained: imports.length > 0,
          totalImports: imports.length,
          totalRecipes: imports.reduce((sum: number, i: any) => sum + (i.totalRecipes || 0), 0),
          successfulImports: imports.filter((i: any) => i.successCount > 0).length,
          kbHits: stats.kbHits || 0,
          openaiCalls: stats.openaiCalls || 0,
          hybridResponses: stats.hybridResponses || 0,
          avgResponseTime: stats.avgResponseTime || 0,
        };
      } catch {
        return {
          isTrained: false,
          totalImports: 0,
          totalRecipes: 0,
          successfulImports: 0,
          kbHits: 0,
          openaiCalls: 0,
          hybridResponses: 0,
          avgResponseTime: 0,
        };
      }
    },
    []
  );

  /**
   * Get a hint about whether knowledge base might have the answer
   */
  const getAnswerSource = useCallback((lastResult: EchoRetrievalResult | null) => {
    if (!lastResult) return null;

    switch (lastResult.source) {
      case "knowledge-base":
        return {
          source: "knowledge-base",
          label: "From Imported Books",
          icon: "📚",
          color: "blue",
        };
      case "openai":
        return {
          source: "openai",
          label: "From AI Model",
          icon: "🤖",
          color: "purple",
        };
      case "hybrid":
        return {
          source: "hybrid",
          label: "From Books + AI",
          icon: "✨",
          color: "#c8a97e",
        };
      default:
        return null;
    }
  }, []);

  return {
    // Methods
    retrieve,
    retrieveMultiple,
    isKnowledgeBaseTrained,
    getTrainingStatus,
    getAnswerSource,

    // State
    isLoading: isLoadingRef.current,
    lastResult: lastResultRef.current,

    // Configuration
    config: {
      useKnowledgeBase,
      useOpenAiFallback,
      strategy,
      recordStats,
    },
  };
}

/**
 * Hook specifically for Echo AI integration
 * Provides convenience methods for the Echo AI system
 */
export function useEchoAI() {
  const retrieval = useEchoKnowledgeRetrieval({
    useKnowledgeBase: true,
    useOpenAiFallback: true,
    strategy: "smart",
    recordStats: true,
  });

  /**
   * Ask Echo a question and get immediate answer
   * Optimized for streaming responses
   */
  const ask = retrieval.retrieve;

  /**
   * Check if Echo can answer from knowledge base (fast path)
   */
  const canAnswerFromKnowledgeBase = async (question: string): Promise<boolean> => {
    const result = await retrieval.retrieve(question);
    return result.source === "knowledge-base" && result.confidence > 0.65;
  };

  /**
   * Get Echo's training status (for UI display)
   */
  const trainingStatus = retrieval.getTrainingStatus();

  return {
    ask,
    canAnswerFromKnowledgeBase,
    trainingStatus,
    isLoading: retrieval.isLoading,
    lastResult: retrieval.lastResult,
    getAnswerSource: retrieval.getAnswerSource,
  };
}

/**
 * Hook for displaying knowledge base stats in UI
 */
export function useEchoStats() {
  const { getTrainingStatus } = useEchoKnowledgeRetrieval();

  const stats = getTrainingStatus();

  const kbHitRate =
    stats.kbHits + stats.openaiCalls + stats.hybridResponses > 0
      ? (
          (stats.kbHits / (stats.kbHits + stats.openaiCalls + stats.hybridResponses)) *
          100
        ).toFixed(1)
      : "0";

  const costSavings =
    stats.openaiCalls > 0 ? ((stats.kbHits / (stats.kbHits + stats.openaiCalls)) * 100).toFixed(1) : "0";

  return {
    ...stats,
    kbHitRate: parseFloat(kbHitRate),
    costSavings: parseFloat(costSavings),
    averageResponseTimeMs: stats.avgResponseTime.toFixed(0),
    totalQuestions: stats.kbHits + stats.openaiCalls + stats.hybridResponses,
  };
}
