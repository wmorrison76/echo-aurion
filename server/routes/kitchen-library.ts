/**
 * Kitchen Library API Routes
 * 
 * Endpoints for content management, search, and organization
 */

import { Router, Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/auth-jwt.js';
import { kitchenLibraryCMS } from '../services/kitchen-library-cms.js';
import { logger } from '../lib/logger.js';

const router = Router();

/**
 * GET /api/kitchen-library/search
 * Search kitchen library content
 */
router.get('/search', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { q, category, type, difficulty, tags, masteryLevel } = req.query;
    const orgId = req.user?.orgId || req.query.orgId as string;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Search query (q) parameter is required',
      });
    }

    const filters: any = {};
    if (category) filters.category = category as string;
    if (type) filters.type = type as any;
    if (difficulty) filters.difficulty = difficulty as any;
    if (masteryLevel) filters.masteryLevel = parseInt(masteryLevel as string);
    if (tags) {
      filters.tags = Array.isArray(tags) ? tags : [tags];
    }

    const results = await kitchenLibraryCMS.searchContent(
      q,
      orgId,
      filters,
      parseInt(req.query.limit as string) || 20
    );

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error: any) {
    logger.error('[KitchenLibrary] Search failed', { error });
    res.status(500).json({
      success: false,
      error: error.message || 'Search failed',
    });
  }
});

/**
 * GET /api/kitchen-library/content/:contentId
 * Get specific content by ID
 */
router.get('/content/:contentId', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const orgId = req.user?.orgId || req.query.orgId as string;

    const content = await kitchenLibraryCMS.getContent(contentId, orgId);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found',
      });
    }

    res.json({
      success: true,
      data: content,
    });
  } catch (error: any) {
    logger.error('[KitchenLibrary] Failed to get content', { error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get content',
    });
  }
});

/**
 * GET /api/kitchen-library/list
 * List content by category
 */
router.get('/list', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const orgId = req.user?.orgId || req.query.orgId as string;
    const limit = parseInt(req.query.limit as string) || 50;

    const content = await kitchenLibraryCMS.listContent(
      category as string | undefined,
      orgId,
      limit
    );

    res.json({
      success: true,
      data: content,
      count: content.length,
    });
  } catch (error: any) {
    logger.error('[KitchenLibrary] Failed to list content', { error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list content',
    });
  }
});

/**
 * POST /api/kitchen-library/content
 * Create or update content
 */
router.post('/content', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const content = req.body;
    const orgId = req.user?.orgId || content.orgId;

    if (!content.title || !content.category || !content.type) {
      return res.status(400).json({
        success: false,
        error: 'title, category, and type are required',
      });
    }

    const createdContent = await kitchenLibraryCMS.upsertContent({
      ...content,
      orgId,
    });

    res.json({
      success: true,
      data: createdContent,
    });
  } catch (error: any) {
    logger.error('[KitchenLibrary] Failed to create content', { error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create content',
    });
  }
});

/**
 * POST /api/kitchen-library/populate
 * Populate library with default content
 */
router.post('/populate', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId || req.body.orgId;

    const createdCount = await kitchenLibraryCMS.populateDefaultContent(orgId);

    res.json({
      success: true,
      data: {
        createdCount,
        message: `Successfully populated ${createdCount} content items`,
      },
    });
  } catch (error: any) {
    logger.error('[KitchenLibrary] Failed to populate content', { error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to populate content',
    });
  }
});

/**
 * GET /api/kitchen-library/statistics
 * Get content library statistics
 */
router.get('/statistics', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId || req.query.orgId as string;

    const stats = await kitchenLibraryCMS.getContentStatistics(orgId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('[KitchenLibrary] Failed to get statistics', { error });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get statistics',
    });
  }
});

export default router;
