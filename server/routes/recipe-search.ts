/**
 * Recipe Search API Routes
 * 
 * Provides optimized recipe search endpoints with vector and keyword search
 */

import { Router, Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/auth-jwt.js';
import { recipeSearchOptimizer } from '../services/recipe-search-optimizer.js';
import { recipeSearchAnalyticsService } from '../services/recipe-search-analytics-service.js';
import { logger } from '../lib/logger.js';

const router = Router();

/**
 * POST /api/recipe-search/search
 * Search recipes with optimized vector + keyword search
 */
router.post('/search', jwtAuthMiddleware, async (req: Request, res: Response) => {
  const startTime = Date.now();
  let searchId: string | undefined;

  try {
    const { query, filters, searchType, limit, minSimilarity } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;
    const userId = req.user?.id || req.body.userId;

    if (!orgId || !query) {
      return res.status(400).json({
        success: false,
        error: 'orgId and query are required',
      });
    }

    const results = await recipeSearchOptimizer.searchRecipes({
      orgId,
      query,
      filters,
      searchType: searchType || 'hybrid',
      limit: limit || 20,
      minSimilarity: minSimilarity || 0.6,
    });

    const latencyMs = Date.now() - startTime;

    // Track search analytics (non-blocking)
    recipeSearchAnalyticsService
      .trackSearch({
        orgId,
        userId,
        query,
        queryType: searchType || 'semantic',
        resultsCount: results.length,
        latencyMs,
        engine: 'pgvector', // TODO: Get actual engine from optimizer
        filters,
        success: results.length > 0,
      })
      .catch((error) => {
        logger.error('[RecipeSearch] Failed to track analytics', { error });
      });

    res.json({
      success: true,
      data: results,
      count: results.length,
      searchId, // Return search ID for click tracking
      latency: latencyMs,
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;

    // Track failed search
    const orgId = req.user?.orgId || req.body.orgId;
    const userId = req.user?.id || req.body.userId;
    const query = req.body.query || '';

    recipeSearchAnalyticsService
      .trackSearch({
        orgId: orgId || 'unknown',
        userId,
        query,
        queryType: req.body.searchType || 'semantic',
        resultsCount: 0,
        latencyMs,
        engine: 'pgvector',
        success: false,
        error: error.message || 'Search failed',
      })
      .catch((err) => {
        logger.error('[RecipeSearch] Failed to track failed search', { error: err });
      });

    logger.error('[RecipeSearch] Search failed', { error });
    res.status(500).json({
      success: false,
      error: error.message || 'Search failed',
    });
  }
});

/**
 * POST /api/recipe-search/click
 * Track when a user clicks on a search result
 */
router.post('/click', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { searchId, recipeId, position } = req.body;

    if (!searchId || !recipeId || !position) {
      return res.status(400).json({
        success: false,
        error: 'searchId, recipeId, and position are required',
      });
    }

    await recipeSearchAnalyticsService.trackClick(searchId, recipeId, position);

    res.json({
      success: true,
      message: 'Click tracked',
    });
  } catch (error: any) {
    logger.error('[RecipeSearch] Failed to track click', { error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to track click',
    });
  }
});

/**
 * GET /api/recipe-search/analytics
 * Get search analytics for organization
 */
router.get('/analytics', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId || req.body.orgId;
    const { startDate, endDate } = req.query;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'orgId is required',
      });
    }

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const analytics = await recipeSearchAnalyticsService.getAnalytics(orgId, start, end);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    logger.error('[RecipeSearch] Failed to get analytics', { error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get analytics',
    });
  }
});

/**
 * GET /api/recipe-search/performance-issues
 * Get search performance issues (slow searches)
 */
router.get('/performance-issues', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId || req.body.orgId;
    const thresholdLatency = req.query.threshold ? parseInt(req.query.threshold as string) : 1000;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'orgId is required',
      });
    }

    const issues = await recipeSearchAnalyticsService.getPerformanceIssues(orgId, thresholdLatency);

    res.json({
      success: true,
      data: issues,
      count: issues.length,
    });
  } catch (error: any) {
    logger.error('[RecipeSearch] Failed to get performance issues', { error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get performance issues',
    });
  }
});

/**
 * GET /api/recipe-search/optimization-recommendations
 * Get optimization recommendations based on analytics
 */
router.get('/optimization-recommendations', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'orgId is required',
      });
    }

    const recommendations = await recipeSearchAnalyticsService.getOptimizationRecommendations(orgId);

    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
    });
  } catch (error: any) {
    logger.error('[RecipeSearch] Failed to get recommendations', { error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get recommendations',
    });
  }
});

/**
 * POST /api/recipe-search/clear-cache
 * Clear search cache
 */
router.post('/clear-cache', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    recipeSearchOptimizer.clearCache();
    
    res.json({
      success: true,
      message: 'Search cache cleared',
    });
  } catch (error: any) {
    logger.error('[RecipeSearch] Failed to clear cache', { error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear cache',
    });
  }
});

export default router;
