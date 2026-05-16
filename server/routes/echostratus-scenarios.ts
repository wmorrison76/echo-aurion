/**
 * EchoStratus Scenarios API Routes
 * 
 * Scenario planning endpoints
 * 
 * All text is i18n-ready
 */

import express, { Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/auth-jwt.js';
import { scenarioPlanner } from '../services/echostratus/scenario-planner.js';
import { supabase } from '../lib/supabase.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/stratus/scenarios
 * Create scenario
 */
router.post('/scenarios', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.orgId;
    const { name, description, decisions, assumptions } = req.body;

    const scenario = await scenarioPlanner.createScenario(
      tenantId,
      name,
      description,
      decisions,
      assumptions
    );

    res.json({
      success: true,
      data: scenario,
    });
  } catch (error: any) {
    logger.error('[Stratus] Create scenario error:', error);
    res.status(500).json({
      error: error.message || 'Failed to create scenario',
    });
  }
});

/**
 * POST /api/stratus/scenarios/:id/simulate
 * Simulate scenario
 */
router.post('/scenarios/:id/simulate', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const scenarioId = req.params.id;
    const tenantId = (req as any).user?.orgId;

    // Get scenario
    const { data: scenarioData } = await supabase
      .from('stratus_scenarios')
      .select('*')
      .eq('id', scenarioId)
      .eq('tenant_id', tenantId)
      .single();

    if (!scenarioData) {
      return res.status(404).json({
        error: 'Scenario not found',
      });
    }

    const scenario = {
      id: scenarioData.id,
      tenant_id: scenarioData.tenant_id,
      name: scenarioData.name,
      description: scenarioData.description,
      decisions: scenarioData.decisions || [],
      assumptions: scenarioData.assumptions || {},
      created_at: new Date(scenarioData.created_at),
      status: scenarioData.status,
    };

    const simulated = await scenarioPlanner.simulateScenario(scenario);

    res.json({
      success: true,
      data: simulated,
    });
  } catch (error: any) {
    logger.error('[Stratus] Simulate scenario error:', error);
    res.status(500).json({
      error: error.message || 'Failed to simulate scenario',
    });
  }
});

/**
 * POST /api/stratus/scenarios/compare
 * Compare scenarios
 */
router.post('/scenarios/compare', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { scenarioIds } = req.body;

    if (!Array.isArray(scenarioIds) || scenarioIds.length < 2) {
      return res.status(400).json({
        error: 'At least 2 scenario IDs required',
      });
    }

    const comparison = await scenarioPlanner.compareScenarios(scenarioIds);

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error: any) {
    logger.error('[Stratus] Compare scenarios error:', error);
    res.status(500).json({
      error: error.message || 'Failed to compare scenarios',
    });
  }
});

/**
 * GET /api/stratus/scenarios/templates
 * Get scenario templates
 */
router.get('/scenarios/templates', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const templates = await scenarioPlanner.getTemplates();

    res.json({
      success: true,
      data: templates,
    });
  } catch (error: any) {
    logger.error('[Stratus] Get templates error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get templates',
    });
  }
});

export default router;
