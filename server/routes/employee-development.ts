/**
 * Employee Development API Routes
 * 
 * Endpoints for:
 * - Employee progress tracking
 * - Personalized training recommendations
 * - Pre-shift briefings
 * - Post-shift metrics
 */

import { Router, Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/auth-jwt.js';
import { employeeProgressTracker } from '../services/employee-progress-tracker.js';
import { personalizedTrainingRecommender } from '../services/personalized-training-recommender.js';
import { preShiftBriefingService } from '../services/pre-shift-briefing.js';
import { postShiftMetricsService } from '../services/post-shift-metrics.js';

const router = Router();

/**
 * GET /api/development/progress/:employeeId
 * Get progress chart for an employee
 */
router.get('/progress/:employeeId', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;
    const orgId = req.user?.orgId || req.query.orgId as string;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const start = startDate as string || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate as string || new Date().toISOString().split('T')[0];

    const chart = await employeeProgressTracker.getProgressChart(employeeId, start, end, orgId);

    res.json({ success: true, data: chart });
  } catch (error: any) {
    console.error('[EmployeeDevelopment] Error fetching progress:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/development/progress/:employeeId/compare
 * Compare employee progress to peers
 */
router.get('/progress/:employeeId/compare', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate, department } = req.query;
    const orgId = req.user?.orgId || req.query.orgId as string;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const start = startDate as string || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate as string || new Date().toISOString().split('T')[0];

    const comparison = await employeeProgressTracker.compareToPeers(
      employeeId,
      { start, end },
      orgId,
      department as string | undefined
    );

    res.json({ success: true, data: comparison });
  } catch (error: any) {
    console.error('[EmployeeDevelopment] Error comparing progress:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/development/training-plan
 * Generate personalized training plan
 */
router.post('/training-plan', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId, focusAreas } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !employeeId) {
      return res.status(400).json({ success: false, error: 'orgId and employeeId required' });
    }

    const plan = await personalizedTrainingRecommender.generateTrainingPlan(
      employeeId,
      orgId,
      focusAreas
    );

    res.json({ success: true, data: plan });
  } catch (error: any) {
    console.error('[EmployeeDevelopment] Error generating training plan:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/development/training-progress
 * Track training progress
 */
router.post('/training-progress', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId, moduleId, progress } = req.body;

    if (!employeeId || !moduleId) {
      return res.status(400).json({ success: false, error: 'employeeId and moduleId required' });
    }

    const tracked = await personalizedTrainingRecommender.trackTrainingProgress(
      employeeId,
      moduleId,
      progress
    );

    res.json({ success: true, data: tracked });
  } catch (error: any) {
    console.error('[EmployeeDevelopment] Error tracking training:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/development/pre-shift-briefing
 * Generate pre-shift briefing
 */
router.post('/pre-shift-briefing', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { shift } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !shift) {
      return res.status(400).json({ success: false, error: 'orgId and shift required' });
    }

    const briefing = await preShiftBriefingService.generateBriefing(shift, orgId);

    res.json({ success: true, data: briefing });
  } catch (error: any) {
    console.error('[EmployeeDevelopment] Error generating briefing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/development/post-shift-metrics
 * Generate post-shift metrics
 */
router.post('/post-shift-metrics', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { shift, evaluations, goals } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !shift) {
      return res.status(400).json({ success: false, error: 'orgId and shift required' });
    }

    const metrics = await postShiftMetricsService.generateMetrics(
      shift,
      evaluations || [],
      goals,
      orgId
    );

    res.json({ success: true, data: metrics });
  } catch (error: any) {
    console.error('[EmployeeDevelopment] Error generating metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/development/shift-goals
 * Set shift goals
 */
router.post('/shift-goals', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { shiftId, goals, setBy } = req.body;

    if (!shiftId || !goals || !setBy) {
      return res.status(400).json({ success: false, error: 'shiftId, goals, and setBy required' });
    }

    // In production, save to database
    const shiftGoal = {
      shiftId,
      goals,
      setBy,
      setAt: new Date().toISOString(),
    };

    res.json({ success: true, data: shiftGoal });
  } catch (error: any) {
    console.error('[EmployeeDevelopment] Error setting goals:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
