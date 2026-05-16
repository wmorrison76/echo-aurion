/**
 * Post-Event Evaluations API Routes
 * 
 * Endpoints for:
 * - Creating evaluations
 * - Retrieving evaluations (with encryption/decryption)
 * - Employee history access
 * - EchoAI^3 training integration
 */

import { Router, Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/auth-jwt.js';
import { postEventEvaluationService } from '../services/post-event-evaluation.js';
import { employeeHistoryService } from '../services/employee-history.js';
import { echoAI3LearningService } from '../services/echo-ai3-learning.js';
import type { StaffEvaluation } from '../services/post-event-evaluation.js';

const router = Router();

/**
 * POST /api/performance/evaluations
 * Create a new post-event evaluation
 */
router.post('/evaluations', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { eventId, beoId, employeeId, evaluation, status } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;
    const evaluatedBy = req.user?.id || req.body.evaluatedBy;

    if (!orgId || !eventId || !employeeId || !evaluation) {
      return res.status(400).json({
        success: false,
        error: 'orgId, eventId, employeeId, and evaluation are required',
      });
    }

    // Create evaluation
    const created = await postEventEvaluationService.createEvaluation({
      eventId,
      beoId,
      employeeId,
      evaluatedBy,
      evaluationDate: new Date().toISOString(),
      performance: evaluation.performance,
      roleSpecific: evaluation.roleSpecific || {
        roleCode: evaluation.roleCode || 'unknown',
        roleName: evaluation.roleName || 'Unknown',
        metrics: {},
      },
      strengths: evaluation.strengths || [],
      areasForImprovement: evaluation.areasForImprovement || [],
      managerNotes: evaluation.managerNotes || '',
      sensitiveData: evaluation.sensitiveData || {},
      aiTrainingData: {
        eventType: evaluation.eventContext?.eventType || 'unknown',
        guestCount: evaluation.eventContext?.guestCount || 0,
        serviceType: evaluation.eventContext?.serviceType || 'plated',
        difficulty: evaluation.eventContext?.difficulty || 'medium',
        workload: evaluation.eventContext?.workload || 'moderate',
        teamSize: evaluation.eventContext?.teamSize || 0,
        performanceContext: evaluation.eventContext?.performanceContext || '',
      },
      status: status || 'draft',
    });

    // Add to employee history
    await employeeHistoryService.addEvaluationToHistory(created);

    // Process for EchoAI^3 learning
    await echoAI3LearningService.processEvaluationForLearning(created);

    res.json({ success: true, data: created });
  } catch (error: any) {
    console.error('[EvaluationsAPI] Error creating evaluation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/performance/evaluations/:evaluationId
 * Get evaluation by ID (with decryption for authorized users)
 */
router.get('/evaluations/:evaluationId', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { evaluationId } = req.params;
    const requesterId = req.user?.id || req.query.requesterId as string;
    const includeSensitive = req.query.includeSensitive === 'true';

    if (!requesterId) {
      return res.status(400).json({ success: false, error: 'requesterId required' });
    }

    const evaluation = await postEventEvaluationService.getEvaluation(evaluationId, requesterId);

    if (!evaluation) {
      return res.status(404).json({ success: false, error: 'Evaluation not found' });
    }

    // Remove sensitive data if not authorized
    if (!includeSensitive) {
      evaluation.sensitiveData = {};
      evaluation.managerNotes = '[Encrypted]';
    }

    res.json({ success: true, data: evaluation });
  } catch (error: any) {
    console.error('[EvaluationsAPI] Error fetching evaluation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/performance/evaluations/employee/:employeeId
 * Get all evaluations for an employee
 */
router.get('/evaluations/employee/:employeeId', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const requesterId = req.user?.id || req.query.requesterId as string;
    const includeSensitive = req.query.includeSensitive === 'true';

    if (!requesterId) {
      return res.status(400).json({ success: false, error: 'requesterId required' });
    }

    const evaluations = await postEventEvaluationService.getEmployeeEvaluations(
      employeeId,
      requesterId,
      includeSensitive
    );

    res.json({ success: true, data: evaluations });
  } catch (error: any) {
    console.error('[EvaluationsAPI] Error fetching employee evaluations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/performance/evaluations/event/:eventId
 * Get all evaluations for an event
 */
router.get('/evaluations/event/:eventId', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const includeSensitive = req.query.includeSensitive === 'true';

    const evaluations = await postEventEvaluationService.getEventEvaluations(eventId);

    // Remove sensitive data if not authorized
    if (!includeSensitive) {
      evaluations.forEach(e => {
        e.sensitiveData = {};
        e.managerNotes = '[Encrypted]';
      });
    }

    res.json({ success: true, data: evaluations });
  } catch (error: any) {
    console.error('[EvaluationsAPI] Error fetching event evaluations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/performance/evaluations/employee/:employeeId/summary
 * Get evaluation summary for an employee
 */
router.get('/evaluations/employee/:employeeId/summary', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    const summary = await postEventEvaluationService.getEvaluationSummary(employeeId);

    if (!summary) {
      return res.status(404).json({ success: false, error: 'No evaluations found' });
    }

    res.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('[EvaluationsAPI] Error fetching summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/performance/evaluations/:evaluationId
 * Update evaluation (only by evaluator)
 */
router.put('/evaluations/:evaluationId', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { evaluationId } = req.params;
    const { updates } = req.body;
    const requesterId = req.user?.id || req.body.requesterId;

    if (!requesterId) {
      return res.status(400).json({ success: false, error: 'requesterId required' });
    }

    const updated = await postEventEvaluationService.updateEvaluation(
      evaluationId,
      updates,
      requesterId
    );

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[EvaluationsAPI] Error updating evaluation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/performance/history/:employeeId
 * Get employee history (with encryption/decryption)
 */
router.get('/history/:employeeId', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const requesterId = req.user?.id || req.query.requesterId as string;
    const includeSensitive = req.query.includeSensitive === 'true';

    if (!requesterId) {
      return res.status(400).json({ success: false, error: 'requesterId required' });
    }

    const history = await employeeHistoryService.getEmployeeHistory(
      employeeId,
      requesterId,
      includeSensitive
    );

    res.json({ success: true, data: history });
  } catch (error: any) {
    console.error('[EvaluationsAPI] Error fetching history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/performance/history/:employeeId/summary
 * Get employee history summary
 */
router.get('/history/:employeeId/summary', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    const summary = await employeeHistoryService.getHistorySummary(employeeId);

    if (!summary) {
      return res.status(404).json({ success: false, error: 'No history found' });
    }

    res.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('[EvaluationsAPI] Error fetching history summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/performance/learning/patterns/:employeeId
 * Get EchoAI^3 learning patterns for an employee
 */
router.get('/learning/patterns/:employeeId', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    const patterns = echoAI3LearningService.getLearningPatterns(employeeId);

    res.json({ success: true, data: patterns });
  } catch (error: any) {
    console.error('[EvaluationsAPI] Error fetching learning patterns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/performance/learning/accuracy
 * Get EchoAI^3 prediction accuracy metrics
 */
router.get('/learning/accuracy', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const accuracy = echoAI3LearningService.getPredictionAccuracy();

    res.json({ success: true, data: accuracy });
  } catch (error: any) {
    console.error('[EvaluationsAPI] Error fetching accuracy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
