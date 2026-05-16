/**
 * BEO Automation Routes
 * 
 * API routes for complete BEO automation workflow
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { beoAutomationOrchestrator } from '../services/beo-automation-orchestrator';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * POST /api/beo-automation/execute
 * Execute complete BEO automation workflow
 */
router.post('/execute', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      prospect_id,
      menu_document_id,
      event_date,
      guest_count,
      outlet_id,
      department_id,
      selected_menu_items,
      additional_data,
    } = req.body;

    const tenantId = req.user?.tenant_id || req.user?.org_id;
    const orgId = req.user?.org_id;
    const userId = req.user?.id;

    if (!tenantId || !orgId || !userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!event_date || !guest_count || !department_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: event_date, guest_count, department_id',
      });
    }

    const result = await beoAutomationOrchestrator.executeBEOAutomation({
      tenant_id: tenantId,
      org_id: orgId,
      prospect_id,
      menu_document_id,
      event_date,
      guest_count,
      outlet_id,
      department_id,
      created_by: userId,
      selected_menu_items,
      additional_data,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('[BEOAutomation] Route error', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute BEO automation',
    });
  }
});

export default router;
