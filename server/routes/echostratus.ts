/**
 * EchoStratus API Routes
 * 
 * Director/Executive Financial Brain endpoints
 * 
 * All text is i18n-ready with translation keys
 */

import express, { Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/auth-jwt.js';
import { eventIngestionService } from '../services/echostratus/event-ingestion-service.js';
import { simulationEngine } from '../services/echostratus/simulation-engine.js';
import { decisionRegistryService } from '../services/echostratus/decision-registry.js';
import { outcomeMeasurementService } from '../services/echostratus/outcome-measurement-service.js';
import { patternRecognitionEngine } from '../services/echostratus/pattern-recognition-engine.js';
import { supabase } from '../lib/supabase.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// ============================================================================
// EVENT INGESTION
// ============================================================================

/**
 * POST /api/stratus/v1/events/ingest
 * Ingest a single signed event
 */
router.post('/v1/events/ingest', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const tenantId = (req as any).user?.orgId || req.body.tenant_id;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Missing tenant_id',
        message: 'Tenant ID is required',
      });
    }

    event.tenant_id = tenantId;

    const ingested = await eventIngestionService.ingestEvent(event);

    res.status(201).json({
      success: true,
      data: ingested,
      message: 'Event ingested successfully',
      messageKey: 'stratus.api.success.event.ingested',
    });
  } catch (error: any) {
    logger.error('[Stratus] Event ingestion error:', error);
    res.status(400).json({
      error: error.message || 'Failed to ingest event',
      errorKey: 'stratus.api.error.event.ingestion',
    });
  }
});

/**
 * POST /api/stratus/v1/events/batch
 * Ingest a batch of signed events
 */
router.post('/v1/events/batch', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { events } = req.body;
    const tenantId = (req as any).user?.orgId;

    if (!tenantId || !events || !Array.isArray(events)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Events array and tenant ID are required',
      });
    }

    // Set tenant_id for all events
    events.forEach((event: any) => {
      event.tenant_id = tenantId;
    });

    const ingested = await eventIngestionService.ingestBatch(events);

    res.status(201).json({
      success: true,
      data: { ingested, count: ingested.length },
      message: `Batch ingested: ${ingested.length} events`,
      messageKey: 'stratus.api.success.batch.ingested',
    });
  } catch (error: any) {
    logger.error('[Stratus] Batch ingestion error:', error);
    res.status(400).json({
      error: error.message || 'Failed to ingest batch',
      errorKey: 'stratus.api.error.batch.ingestion',
    });
  }
});

// ============================================================================
// TWIN STATE
// ============================================================================

/**
 * GET /api/stratus/v1/twin/state
 * Get digital twin state at a point in time
 */
router.get('/v1/twin/state', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.orgId;
    const at = req.query.at as string | undefined;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Missing tenant_id',
      });
    }

    // Get latest snapshot or snapshot at specific time
    let query = supabase
      .from('stratus_twin_state_snapshots')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('snapshot_time', { ascending: false })
      .limit(1);

    if (at) {
      query = query.lte('snapshot_time', at);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      // Return empty state if no snapshot exists
      return res.json({
        success: true,
        data: { state: {} },
        message: 'No snapshot found, returning empty state',
      });
    }

    res.json({
      success: true,
      data: { state: data.state, snapshotTime: data.snapshot_time },
      message: 'Twin state retrieved',
    });
  } catch (error: any) {
    logger.error('[Stratus] Twin state error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get twin state',
    });
  }
});

/**
 * POST /api/stratus/v1/twin/snapshot
 * Create a twin snapshot
 */
router.post('/v1/twin/snapshot', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.orgId;
    const { state, snapshotTime } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        error: 'Missing tenant_id',
      });
    }

    const hash = require('crypto')
      .createHash('sha256')
      .update(JSON.stringify(state))
      .digest('hex');

    const { data, error } = await supabase
      .from('stratus_twin_state_snapshots')
      .insert({
        tenant_id: tenantId,
        snapshot_time: snapshotTime || new Date().toISOString(),
        state,
        hash,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data,
      message: 'Snapshot created',
    });
  } catch (error: any) {
    logger.error('[Stratus] Snapshot creation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to create snapshot',
    });
  }
});

// ============================================================================
// DECISIONS
// ============================================================================

/**
 * POST /api/stratus/v1/decisions
 * Create a decision proposal
 */
router.post('/v1/decisions', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.orgId;
    const userId = (req as any).user?.id;
    const {
      decision_type,
      title,
      description,
      assumptions,
      constraints,
      scenario_count = 10000,
      time_horizon_days = 30,
      target_entity_ids = [],
      trigger_event_ids = [],
    } = req.body;

    if (!tenantId || !decision_type || !title) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    // Create assumption set
    const assumptionSetHash = require('crypto')
      .createHash('sha256')
      .update(JSON.stringify({ assumptions, constraints }))
      .digest('hex');

    const { data: assumptionSet, error: assumptionError } = await supabase
      .from('stratus_decision_assumption_sets')
      .insert({
        tenant_id: tenantId,
        assumptions,
        constraints,
        scenario_count,
        time_horizon_days,
        hash: assumptionSetHash,
      })
      .select()
      .single();

    if (assumptionError) {
      throw assumptionError;
    }

    // Create decision
    const { data: decision, error: decisionError } = await supabase
      .from('stratus_decisions')
      .insert({
        tenant_id: tenantId,
        decision_type,
        title,
        description,
        proposed_by_user_id: userId,
        proposed_by_system: false,
        trigger_event_ids,
        assumption_set_id: assumptionSet.id,
        target_entity_ids,
        status: 'proposed',
      })
      .select()
      .single();

    if (decisionError) {
      throw decisionError;
    }

    res.status(201).json({
      success: true,
      data: decision,
      message: 'Decision created',
    });
  } catch (error: any) {
    logger.error('[Stratus] Decision creation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to create decision',
    });
  }
});

/**
 * POST /api/stratus/v1/decisions/:id/simulate
 * Queue simulation run for a decision
 */
router.post('/v1/decisions/:id/simulate', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.orgId;
    const decisionId = req.params.id;
    const { model_version_id, scenarios, time_slice_minutes, horizon_days } = req.body;

    // Get decision
    const { data: decision, error: decisionError } = await supabase
      .from('stratus_decisions')
      .select('*, assumption_set:stratus_decision_assumption_sets(*)')
      .eq('id', decisionId)
      .eq('tenant_id', tenantId)
      .single();

    if (decisionError || !decision) {
      return res.status(404).json({
        error: 'Decision not found',
      });
    }

    // Get twin state
    const { data: snapshot } = await supabase
      .from('stratus_twin_state_snapshots')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .single();

    const twinState = snapshot?.state || {};

    // Create decision run
    const { data: run, error: runError } = await supabase
      .from('stratus_decision_runs')
      .insert({
        tenant_id: tenantId,
        decision_id: decisionId,
        run_status: 'queued',
        model_version_id,
      })
      .select()
      .single();

    if (runError) {
      throw runError;
    }

    // Run simulation (in production, this would be queued to a worker)
    const proposal = {
      type: decision.decision_type,
      ...decision.target_entity_ids.reduce((acc: any, id: string) => {
        acc[id] = id;
        return acc;
      }, {}),
    };

    const assumptions = {
      horizonDays: horizon_days || decision.assumption_set.time_horizon_days,
      scenarios: scenarios || decision.assumption_set.scenario_count,
      timeSliceMinutes: time_slice_minutes || 5,
      demandUncertainty: { sigma: 0.1 },
      laborConstraints: {},
      kitchenConstraints: {},
      guestExperienceWeights: { wait: 0.4, ticket: 0.4, noise: 0.2 },
    };

    const result = await simulationEngine.simulate(proposal as any, assumptions, twinState);

    // Update run with results
    const runHash = require('crypto')
      .createHash('sha256')
      .update(JSON.stringify(result))
      .digest('hex');

    await supabase
      .from('stratus_decision_runs')
      .update({
        run_status: 'done',
        summary: result.metrics,
        sensitivity: result.sensitivity,
        bottlenecks: result.bottlenecks,
        artifacts: { confidence: result.confidence },
        finished_at: new Date().toISOString(),
        hash: runHash,
      })
      .eq('id', run.id);

    res.status(202).json({
      success: true,
      data: { runId: run.id, result },
      message: 'Simulation completed',
    });
  } catch (error: any) {
    logger.error('[Stratus] Simulation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to run simulation',
    });
  }
});

/**
 * GET /api/stratus/v1/decisions
 * List decisions
 */
router.get('/v1/decisions', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.orgId;
    const { status, type, outlet } = req.query;

    let query = supabase
      .from('stratus_decisions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('decision_type', type);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: data || [],
      message: 'Decisions retrieved',
    });
  } catch (error: any) {
    logger.error('[Stratus] Get decisions error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get decisions',
    });
  }
});

/**
 * GET /api/stratus/v1/decisions/:id
 * Get decision by ID
 */
router.get('/v1/decisions/:id', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.orgId;
    const decisionId = req.params.id;

    const { data, error } = await supabase
      .from('stratus_decisions')
      .select('*, assumption_set:stratus_decision_assumption_sets(*), runs:stratus_decision_runs(*)')
      .eq('id', decisionId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'Decision not found',
      });
    }

    res.json({
      success: true,
      data,
      message: 'Decision retrieved',
    });
  } catch (error: any) {
    logger.error('[Stratus] Get decision error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get decision',
    });
  }
});

// ============================================================================
// DECISIONS WITH STATS
// ============================================================================

/**
 * GET /api/stratus/decisions
 * Get decisions with statistics
 */
router.get('/decisions', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.orgId;
    const { status, decisionType, outletId, from, to, limit } = req.query;

    const decisions = await decisionRegistryService.getDecisions(tenantId, {
      status: status as any,
      decisionType: decisionType as any,
      outletId: outletId as string,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    // Get stats
    const stats = await decisionRegistryService.getDecisionStats(tenantId);

    // Get outcomes for each decision
    const decisionsWithOutcomes = await Promise.all(
      decisions.map(async (decision) => {
        const aggregation = await outcomeMeasurementService.aggregateOutcomes(decision.id);
        return {
          ...decision,
          outcome: aggregation.overall_status !== 'draw' ? {
            status: aggregation.overall_status,
            delta_percentage: aggregation.avg_delta_percentage,
            metric_type: aggregation.best_metric,
          } : undefined,
        };
      })
    );

    res.json({
      success: true,
      decisions: decisionsWithOutcomes,
      stats,
    });
  } catch (error: any) {
    logger.error('[Stratus] Get decisions error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get decisions',
    });
  }
});

// ============================================================================
// OUTCOMES
// ============================================================================

/**
 * GET /api/stratus/outcomes/:decisionId
 * Get outcomes for a decision
 */
router.get('/outcomes/:decisionId', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const decisionId = req.params.decisionId;
    const aggregation = await outcomeMeasurementService.aggregateOutcomes(decisionId);

    res.json({
      success: true,
      data: aggregation,
    });
  } catch (error: any) {
    logger.error('[Stratus] Get outcomes error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get outcomes',
    });
  }
});

/**
 * GET /api/stratus/stats/decisions
 * Get decision statistics over time
 */
router.get('/stats/decisions', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.orgId;
    const { from, to } = req.query;

    const stats = await outcomeMeasurementService.getDecisionStatsOverTime(
      tenantId,
      from ? new Date(from as string) : undefined,
      to ? new Date(to as string) : undefined
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('[Stratus] Get decision stats error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get decision stats',
    });
  }
});

// ============================================================================
// ANOMALIES
// ============================================================================

/**
 * GET /api/stratus/anomalies
 * Get anomalies for outlet
 */
router.get('/anomalies', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.orgId;
    const outletId = (req.query.outletId as string) || 'default';

    const anomalies = await patternRecognitionEngine.detectAnomalies(
      tenantId,
      outletId
    );

    res.json({
      success: true,
      data: anomalies,
    });
  } catch (error: any) {
    logger.error('[Stratus] Get anomalies error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get anomalies',
    });
  }
});

// Import patterns, metrics, analytics, and scenarios routers
import patternsRouter from './echostratus-patterns.js';
import metricsRouter from './echostratus-metrics.js';
import analyticsRouter from './echostratus-analytics.js';
import scenariosRouter from './echostratus-scenarios.js';
router.use('/', patternsRouter);
router.use('/', metricsRouter);
router.use('/', analyticsRouter);
router.use('/', scenariosRouter);

export default router;
