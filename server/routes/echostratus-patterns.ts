/**
 * EchoStratus Patterns API Routes
 * 
 * Pattern detection and implicit decision endpoints
 * 
 * All text is i18n-ready
 */

import express, { Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/auth-jwt.js';
import { patternRecognitionEngine } from '../services/echostratus/pattern-recognition-engine.js';
import { supabase } from '../lib/supabase.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/stratus/patterns
 * Get detected patterns
 */
router.get('/patterns', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.orgId;
    const outletId = (req.query.outletId as string) || 'default';

    // Get patterns from database
    const { data: patterns } = await supabase
      .from('stratus_operational_patterns')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('outlet_id', outletId)
      .order('detected_at', { ascending: false })
      .limit(100);

    res.json({
      success: true,
      patterns: patterns || [],
    });
  } catch (error: any) {
    logger.error('[Stratus] Get patterns error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get patterns',
    });
  }
});

/**
 * POST /api/stratus/patterns/:id/approve
 * Approve a detected pattern
 */
router.post('/patterns/:id/approve', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const patternId = req.params.id;
    const tenantId = (req as any).user?.orgId;

    await supabase
      .from('stratus_operational_patterns')
      .update({ status: 'approved' })
      .eq('id', patternId)
      .eq('tenant_id', tenantId);

    res.json({
      success: true,
      message: 'Pattern approved',
    });
  } catch (error: any) {
    logger.error('[Stratus] Approve pattern error:', error);
    res.status(500).json({
      error: error.message || 'Failed to approve pattern',
    });
  }
});

/**
 * POST /api/stratus/patterns/:id/reject
 * Reject a detected pattern
 */
router.post('/patterns/:id/reject', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const patternId = req.params.id;
    const tenantId = (req as any).user?.orgId;

    await supabase
      .from('stratus_operational_patterns')
      .update({ status: 'rejected' })
      .eq('id', patternId)
      .eq('tenant_id', tenantId);

    res.json({
      success: true,
      message: 'Pattern rejected',
    });
  } catch (error: any) {
    logger.error('[Stratus] Reject pattern error:', error);
    res.status(500).json({
      error: error.message || 'Failed to reject pattern',
    });
  }
});

export default router;
