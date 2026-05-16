/**
 * Performance Tracking AI API Routes
 * 
 * Endpoints for:
 * - Employee performance analysis
 * - Skills matrix management
 * - Staff matching
 * - Schedule generation
 */

import { Router, Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/auth-jwt.js';
import { echoAI3PerformanceAnalyzer } from '../services/echo-ai3-performance-analyzer.js';
import { beoREOStaffingAnalyzer } from '../services/beo-reo-staffing-analyzer.js';
import { aiScheduleGenerator } from '../services/ai-schedule-generator.js';

const router = Router();

/**
 * GET /api/performance/employee/:employeeId
 * Get comprehensive performance analysis for an employee
 */
router.get('/employee/:employeeId', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const includeAI = req.query.includeAI === 'true';
    const metrics = await echoAI3PerformanceAnalyzer.analyzeEmployee(
      employeeId,
      orgId,
      includeAI
    );

    if (!metrics) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    res.json({ success: true, data: metrics });
  } catch (error: any) {
    console.error('[PerformanceAPI] Error analyzing employee:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/performance/match-role
 * Match employees to a role requirement
 */
router.post('/match-role', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { roleRequirement, filters } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !roleRequirement) {
      return res.status(400).json({ success: false, error: 'orgId and roleRequirement required' });
    }

    const matches = await echoAI3PerformanceAnalyzer.matchEmployeesToRole(
      roleRequirement,
      orgId,
      filters
    );

    res.json({ success: true, data: matches });
  } catch (error: any) {
    console.error('[PerformanceAPI] Error matching employees:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/performance/beo-analyze
 * Analyze BEO/REO for staffing requirements
 */
router.post('/beo-analyze', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { eventId, beoId } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !eventId) {
      return res.status(400).json({ success: false, error: 'orgId and eventId required' });
    }

    const analysis = await beoREOStaffingAnalyzer.analyzeEvent(eventId, beoId, orgId);

    res.json({ success: true, data: analysis });
  } catch (error: any) {
    console.error('[PerformanceAPI] Error analyzing BEO:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/performance/generate-schedule
 * Generate AI-powered schedule for an event
 */
router.post('/generate-schedule', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { eventId, beoId, options } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !eventId) {
      return res.status(400).json({ success: false, error: 'orgId and eventId required' });
    }

    const schedule = await aiScheduleGenerator.generateSchedule(
      eventId,
      beoId,
      orgId,
      options
    );

    res.json({ success: true, data: schedule });
  } catch (error: any) {
    console.error('[PerformanceAPI] Error generating schedule:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/performance/department/:deptId
 * Get performance metrics for all employees in a department
 */
router.get('/department/:deptId', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { deptId } = req.params;
    const orgId = req.user?.orgId || req.body.orgId;
    const start = req.query.start as string;
    const end = req.query.end as string;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    // In production, fetch all employees in department and analyze each
    // For now, return empty array
    res.json({ success: true, data: [] });
  } catch (error: any) {
    console.error('[PerformanceAPI] Error fetching department performance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/performance/skills-matrix
 * Get skills matrix for organization
 */
router.get('/skills-matrix', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId || req.query.orgId as string;
    const departmentId = req.query.departmentId as string | undefined;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    // In production, query skills matrix from database
    // For now, return mock structure
    res.json({
      success: true,
      data: {
        employees: [],
        skills: [],
        matrix: {},
      },
    });
  } catch (error: any) {
    console.error('[PerformanceAPI] Error fetching skills matrix:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
