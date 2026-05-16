/**
 * Recipe Search Analytics Service
 * 
 * Tracks recipe search performance, accuracy, and usage patterns
 * - Search query tracking
 * - Performance metrics (latency, result quality)
 * - Search accuracy scoring
 * - Popular search terms
 * - Search failure tracking
 */

import { logger } from '../lib/logger';
import { supabase } from '../lib/supabase';

export interface SearchQuery {
  id: string;
  orgId: string;
  userId?: string;
  query: string;
  queryType: 'semantic' | 'keyword' | 'filter';
  resultsCount: number;
  latencyMs: number;
  engine: 'pgvector' | 'pinecone' | 'hybrid';
  filters?: Record<string, any>;
  clickedResults?: string[]; // Recipe IDs that were clicked
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface SearchAnalytics {
  totalSearches: number;
  averageLatency: number;
  averageResults: number;
  successRate: number;
  popularQueries: Array<{ query: string; count: number }>;
  searchByEngine: Record<string, number>;
  searchByType: Record<string, number>;
  topClickedRecipes: Array<{ recipeId: string; clicks: number }>;
  failureRate: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface SearchPerformanceMetrics {
  query: string;
  resultsCount: number;
  latencyMs: number;
  relevanceScore?: number;
  userFeedback?: 'helpful' | 'not_helpful';
  clickedResult?: string;
}

/**
 * Recipe Search Analytics Service
 */
export class RecipeSearchAnalyticsService {
  /**
   * Track a search query
   */
  async trackSearch(metrics: SearchPerformanceMetrics & { orgId: string; userId?: string; engine?: string; queryType?: string }): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('recipe_search_analytics')
        .insert({
          org_id: metrics.orgId,
          user_id: metrics.userId || null,
          query: metrics.query,
          query_type: metrics.queryType || 'semantic',
          results_count: metrics.resultsCount,
          latency_ms: metrics.latencyMs,
          engine: metrics.engine || 'pgvector',
          relevance_score: metrics.relevanceScore || null,
          user_feedback: metrics.userFeedback || null,
          clicked_result: metrics.clickedResult || null,
          success: metrics.resultsCount > 0,
          timestamp: new Date().toISOString(),
        });

      if (error) throw error;

      logger.debug('[RecipeSearchAnalytics] Search tracked', {
        query: metrics.query,
        latency: metrics.latencyMs,
        results: metrics.resultsCount,
      });
    } catch (error) {
      logger.error('[RecipeSearchAnalytics] Failed to track search', { error, metrics });
      // Don't throw - analytics failures shouldn't block searches
    }
  }

  /**
   * Track clicked search result
   */
  async trackClick(searchId: string, recipeId: string, position: number): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('recipe_search_clicks')
        .insert({
          search_id: searchId,
          recipe_id: recipeId,
          position,
          clicked_at: new Date().toISOString(),
        });

      if (error) throw error;

      logger.debug('[RecipeSearchAnalytics] Click tracked', { searchId, recipeId, position });
    } catch (error) {
      logger.error('[RecipeSearchAnalytics] Failed to track click', { error, searchId, recipeId });
    }
  }

  /**
   * Get search analytics for organization
   */
  async getAnalytics(orgId: string, startDate?: Date, endDate?: Date): Promise<SearchAnalytics> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
      const end = endDate || new Date();

      // Get all searches for period
      const { data: searches, error } = await supabase
        .from('recipe_search_analytics')
        .select('*')
        .eq('org_id', orgId)
        .gte('timestamp', start.toISOString())
        .lte('timestamp', end.toISOString());

      if (error) throw error;

      const searchData = searches || [];

      // Calculate metrics
      const totalSearches = searchData.length;
      const successfulSearches = searchData.filter((s) => s.success);
      const failedSearches = searchData.filter((s) => !s.success);

      const averageLatency =
        searchData.length > 0
          ? searchData.reduce((sum, s) => sum + (s.latency_ms || 0), 0) / searchData.length
          : 0;

      const averageResults =
        searchData.length > 0
          ? searchData.reduce((sum, s) => sum + (s.results_count || 0), 0) / searchData.length
          : 0;

      const successRate = totalSearches > 0 ? (successfulSearches.length / totalSearches) * 100 : 0;
      const failureRate = totalSearches > 0 ? (failedSearches.length / totalSearches) * 100 : 0;

      // Popular queries
      const queryCounts = new Map<string, number>();
      searchData.forEach((s) => {
        const count = queryCounts.get(s.query) || 0;
        queryCounts.set(s.query, count + 1);
      });
      const popularQueries = Array.from(queryCounts.entries())
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Search by engine
      const engineCounts: Record<string, number> = {};
      searchData.forEach((s) => {
        const engine = s.engine || 'unknown';
        engineCounts[engine] = (engineCounts[engine] || 0) + 1;
      });

      // Search by type
      const typeCounts: Record<string, number> = {};
      searchData.forEach((s) => {
        const type = s.query_type || 'semantic';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      // Top clicked recipes (from clicks table)
      const { data: clicks } = await supabase
        .from('recipe_search_clicks')
        .select('recipe_id')
        .in(
          'search_id',
          searchData.map((s) => s.id)
        );

      const recipeClickCounts = new Map<string, number>();
      (clicks || []).forEach((click: any) => {
        const count = recipeClickCounts.get(click.recipe_id) || 0;
        recipeClickCounts.set(click.recipe_id, count + 1);
      });
      const topClickedRecipes = Array.from(recipeClickCounts.entries())
        .map(([recipeId, clicks]) => ({ recipeId, clicks }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10);

      return {
        totalSearches,
        averageLatency: Math.round(averageLatency),
        averageResults: Math.round(averageResults),
        successRate: Math.round(successRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
        popularQueries,
        searchByEngine: engineCounts,
        searchByType: typeCounts,
        topClickedRecipes,
        period: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      };
    } catch (error) {
      logger.error('[RecipeSearchAnalytics] Failed to get analytics', { error, orgId });
      throw error;
    }
  }

  /**
   * Get search performance issues
   */
  async getPerformanceIssues(orgId: string, thresholdLatency = 1000): Promise<Array<{ query: string; latency: number; timestamp: string }>> {
    try {
      const { data, error } = await supabase
        .from('recipe_search_analytics')
        .select('query, latency_ms, timestamp')
        .eq('org_id', orgId)
        .gte('latency_ms', thresholdLatency)
        .order('latency_ms', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map((s) => ({
        query: s.query,
        latency: s.latency_ms,
        timestamp: s.timestamp,
      }));
    } catch (error) {
      logger.error('[RecipeSearchAnalytics] Failed to get performance issues', { error, orgId });
      throw error;
    }
  }

  /**
   * Optimize search parameters based on analytics
   */
  async getOptimizationRecommendations(orgId: string): Promise<Array<{ type: string; issue: string; recommendation: string }>> {
    try {
      const analytics = await this.getAnalytics(orgId);
      const recommendations: Array<{ type: string; issue: string; recommendation: string }> = [];

      // Check latency issues
      if (analytics.averageLatency > 500) {
        recommendations.push({
          type: 'performance',
          issue: `Average search latency is ${analytics.averageLatency}ms (target: <500ms)`,
          recommendation: 'Consider switching to Pinecone engine or optimizing vector indexes',
        });
      }

      // Check success rate
      if (analytics.successRate < 95) {
        recommendations.push({
          type: 'accuracy',
          issue: `Search success rate is ${analytics.successRate.toFixed(1)}% (target: >95%)`,
          recommendation: 'Review failed queries and improve query preprocessing',
        });
      }

      // Check result quality
      if (analytics.averageResults < 3) {
        recommendations.push({
          type: 'quality',
          issue: `Average results per search is ${analytics.averageResults} (target: 5-10)`,
          recommendation: 'Adjust similarity threshold or expand search parameters',
        });
      }

      // Engine-specific recommendations
      if (analytics.searchByEngine['pgvector'] && analytics.averageLatency > 300) {
        recommendations.push({
          type: 'engine',
          issue: 'pgvector searches are slow',
          recommendation: 'Consider upgrading to Pinecone for better performance at scale',
        });
      }

      return recommendations;
    } catch (error) {
      logger.error('[RecipeSearchAnalytics] Failed to get recommendations', { error, orgId });
      return [];
    }
  }
}

// Export singleton instance
export const recipeSearchAnalyticsService = new RecipeSearchAnalyticsService();
