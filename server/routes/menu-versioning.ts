/**
 * Menu Versioning API Routes
 * 
 * Endpoints for menu version management and comparison
 * All text is i18n-ready with translation keys
 */

import { Router, Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/auth-jwt.js';
import { menuVersioningService } from '../services/menu-versioning.js';

const router = Router();

/**
 * GET /api/menu-versioning/:menuId/versions
 * Get all versions for a menu
 */
router.get('/:menuId/versions', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { menuId } = req.params;
    const orgId = req.user?.orgId || req.query.orgId as string;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const versions = await menuVersioningService.getMenuVersions(menuId, orgId);

    res.json({ success: true, data: versions });
  } catch (error: any) {
    console.error('[MenuVersioning] Error fetching versions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/menu-versioning/:menuId/versions/:versionNumber
 * Get specific version
 */
router.get('/:menuId/versions/:versionNumber', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { menuId, versionNumber } = req.params;
    const orgId = req.user?.orgId || req.query.orgId as string;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const version = await menuVersioningService.getVersion(menuId, parseInt(versionNumber), orgId);

    if (!version) {
      return res.status(404).json({ success: false, error: 'Version not found' });
    }

    res.json({ success: true, data: version });
  } catch (error: any) {
    console.error('[MenuVersioning] Error fetching version:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/menu-versioning/:menuId/versions
 * Create new version
 */
router.post('/:menuId/versions', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { menuId } = req.params;
    const { menuState, changeLog, changeLogKey } = req.body;
    const userId = req.user?.sub;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !userId) {
      return res.status(400).json({ success: false, error: 'orgId and userId required' });
    }

    if (!menuState) {
      return res.status(400).json({ success: false, error: 'menuState required' });
    }

    const version = await menuVersioningService.createVersion(
      menuId,
      menuState,
      userId,
      orgId,
      changeLog,
      changeLogKey
    );

    res.json({ success: true, data: version });
  } catch (error: any) {
    console.error('[MenuVersioning] Error creating version:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/menu-versioning/:menuId/compare/:version1/:version2
 * Compare two versions
 */
router.get('/:menuId/compare/:version1/:version2', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { menuId, version1, version2 } = req.params;
    const orgId = req.user?.orgId || req.query.orgId as string;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const comparison = await menuVersioningService.compareVersions(
      menuId,
      parseInt(version1),
      parseInt(version2),
      orgId
    );

    res.json({ success: true, data: comparison });
  } catch (error: any) {
    console.error('[MenuVersioning] Error comparing versions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/menu-versioning/:menuId/restore/:versionNumber
 * Restore menu to specific version
 */
router.post('/:menuId/restore/:versionNumber', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { menuId, versionNumber } = req.params;
    const userId = req.user?.sub;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !userId) {
      return res.status(400).json({ success: false, error: 'orgId and userId required' });
    }

    const restoredVersion = await menuVersioningService.restoreToVersion(
      menuId,
      parseInt(versionNumber),
      userId,
      orgId
    );

    res.json({ success: true, data: restoredVersion });
  } catch (error: any) {
    console.error('[MenuVersioning] Error restoring version:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/menu-versioning/:menuId/history
 * Get version history timeline
 */
router.get('/:menuId/history', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { menuId } = req.params;
    const orgId = req.user?.orgId || req.query.orgId as string;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const history = await menuVersioningService.getVersionHistory(menuId, orgId);

    res.json({ success: true, data: history });
  } catch (error: any) {
    console.error('[MenuVersioning] Error fetching history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/menu-versioning/:menuId/impact-analysis
 * Get comprehensive impact analysis for version comparison
 */
router.get('/:menuId/impact-analysis', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { menuId } = req.params;
    const { version1, version2 } = req.query;
    const orgId = req.user?.orgId || req.query.orgId as string;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    if (!version1 || !version2) {
      return res.status(400).json({ 
        success: false, 
        error: 'version1 and version2 query parameters required' 
      });
    }

    const v1 = await menuVersioningService.getVersion(menuId, parseInt(version1 as string), orgId);
    const v2 = await menuVersioningService.getVersion(menuId, parseInt(version2 as string), orgId);

    if (!v1 || !v2) {
      return res.status(404).json({ 
        success: false, 
        error: 'One or both versions not found' 
      });
    }

    const comparison = await menuVersioningService.compareVersions(
      menuId,
      parseInt(version1 as string),
      parseInt(version2 as string),
      orgId
    );

    // Use enhanced impact analysis service if available
    let enhancedImpactAnalysis = null;
    try {
      const { menuImpactAnalysisService } = await import('../services/menu-impact-analysis-service.js');
      enhancedImpactAnalysis = await menuImpactAnalysisService.analyzeMenuImpact(
        menuId,
        v1,
        v2,
        comparison.differences,
        orgId
      );
    } catch (error) {
      // Fallback to built-in impact analysis if separate service not available
      logger.warn('[MenuVersioning] Enhanced impact analysis service not available, using built-in', { error });
      enhancedImpactAnalysis = comparison.impactAnalysis;
    }

    res.json({ 
      success: true, 
      data: {
        comparison,
        impactAnalysis: enhancedImpactAnalysis || comparison.impactAnalysis,
      }
    });
  } catch (error: any) {
    console.error('[MenuVersioning] Error getting impact analysis:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
