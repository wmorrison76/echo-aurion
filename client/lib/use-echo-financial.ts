/**
 * Echo AI Financial Query Hook
 * Enables React components to query financial data using natural language
 * through Echo AI integration
 *
 * Usage:
 * const { query, isLoading, error, data } = useEchoFinancialQuery();
 * const result = await query("What was our revenue last month?");
 */

import { useState, useCallback } from "react";

export interface FinancialQueryResult {
  ok: boolean;
  answer: string;
  parsed_query?: {
    metrics: string[];
    drill_down_level: "summary" | "departmental" | "cost-center" | "gl-account";
    comparisons: Record<string, boolean>;
    intent: string;
    confidence: number;
  };
  financial_data?: any;
  confidence?: number;
  error?: string;
  details?: string;
}

export interface FinancialInsightsResult {
  ok: boolean;
  insights: {
    summary: string;
    key_metrics: Array<{
      metric: string;
      status: "healthy" | "concern" | "warning";
      insight: string;
    }>;
    opportunities: string[];
    risks: string[];
    recommendations: string[];
  };
  financial_data?: any;
  error?: string;
}

interface UseEchoFinancialQueryOptions {
  outletIds?: string[];
  period?: {
    type: "monthly" | "daily" | "custom";
    start_date?: string;
    end_date?: string;
    fiscal_year?: number;
    fiscal_period?: number;
  };
}

export function useEchoFinancialQuery(
  options: UseEchoFinancialQueryOptions = {},
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FinancialQueryResult | null>(null);
  const [lastQuery, setLastQuery] = useState<string | null>(null);

  const query = useCallback(
    async (question: string): Promise<FinancialQueryResult> => {
      try {
        setIsLoading(true);
        setError(null);
        setLastQuery(question);

        const response = await fetch("/api/echo/financial-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            outlet_ids: options.outletIds,
            period: options.period,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Query failed";
          setError(errorMessage);
          return {
            ok: false,
            answer: errorMessage,
            error: errorMessage,
          };
        }

        const result: FinancialQueryResult = await response.json();
        setData(result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        return {
          ok: false,
          answer: errorMessage,
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [options.outletIds, options.period],
  );

  const getInsights =
    useCallback(async (): Promise<FinancialInsightsResult> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/echo/financial-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outlet_ids: options.outletIds,
            period: options.period,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Insights generation failed";
          setError(errorMessage);
          return {
            ok: false,
            insights: {
              summary: errorMessage,
              key_metrics: [],
              opportunities: [],
              risks: [],
              recommendations: [],
            },
            error: errorMessage,
          };
        }

        const result: FinancialInsightsResult = await response.json();
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        return {
          ok: false,
          insights: {
            summary: errorMessage,
            key_metrics: [],
            opportunities: [],
            risks: [],
            recommendations: [],
          },
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    }, [options.outletIds, options.period]);

  const reset = useCallback(() => {
    setError(null);
    setData(null);
    setLastQuery(null);
  }, []);

  return {
    query,
    getInsights,
    isLoading,
    error,
    data,
    lastQuery,
    reset,
  };
}
