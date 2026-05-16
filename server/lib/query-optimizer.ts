/**
 * Query Optimizer
 * 
 * Provides query optimization utilities and automatic index recommendations.
 */

import { logger } from "./logger";
import { getSupabaseServiceClient } from "./supabase-service-client";
import { getSlowQueryMonitor } from "./slow-query-monitor";

/**
 * Execute query with performance monitoring
 */
export async function executeOptimizedQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  organizationId?: string
): Promise<{ data: T | null; error: any }> {
  const startTime = Date.now();

  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;

    // Log slow queries
    if (duration > 100) {
      const monitor = getSlowQueryMonitor();
      await monitor.logSlowQuery("query", duration, organizationId);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[QueryOptimizer] Query failed after ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Analyze query plan (for development/debugging)
 */
export async function analyzeQueryPlan(query: string): Promise<any> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.rpc("explain_query", {
      query_text: query,
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    logger.error("[QueryOptimizer] Error analyzing query plan:", error);
    return null;
  }
}
