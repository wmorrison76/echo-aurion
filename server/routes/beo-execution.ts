/**
 * BEO Execution API Routes
 * 
 * Endpoints for day-of event execution, real-time updates,
 * checklist management, timeline tracking, and post-event analysis
 */

import { Router, Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/auth-jwt.js';
import { beoExecutionService } from '../services/beo-execution.js';

const router = Router();

/**
 * GET /api/beo-execution/:beoId/status
 * Get execution status for a BEO
 */
router.get('/:beoId/status', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const orgId = req.user?.orgId || req.query.orgId as string;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const status = await beoExecutionService.getExecutionStatus(beoId, orgId);

    res.json({ success: true, data: status });
  } catch (error: any) {
    console.error('[BEOExecution] Error fetching status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/beo-execution/:beoId/checklist
 * Get checklist items for a BEO
 */
router.get('/:beoId/checklist', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const orgId = req.user?.orgId || req.query.orgId as string;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const checklist = await beoExecutionService.getChecklist(beoId, orgId);

    res.json({ success: true, data: checklist });
  } catch (error: any) {
    console.error('[BEOExecution] Error fetching checklist:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/beo-execution/:beoId/checklist/:itemId
 * Update checklist item
 */
router.patch('/:beoId/checklist/:itemId', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { beoId, itemId } = req.params;
    const updates = req.body;
    const userId = req.user?.sub;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !userId) {
      return res.status(400).json({ success: false, error: 'orgId and userId required' });
    }

    const item = await beoExecutionService.updateChecklistItem(itemId, updates, userId, orgId);

    res.json({ success: true, data: item });
  } catch (error: any) {
    console.error('[BEOExecution] Error updating checklist item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/beo-execution/:beoId/timeline
 * Get timeline events for a BEO
 */
router.get('/:beoId/timeline', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const orgId = req.user?.orgId || req.query.orgId as string;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const timeline = await beoExecutionService.getTimeline(beoId, orgId);

    res.json({ success: true, data: timeline });
  } catch (error: any) {
    console.error('[BEOExecution] Error fetching timeline:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/beo-execution/:beoId/timeline/:eventId
 * Update timeline event
 */
router.patch('/:beoId/timeline/:eventId', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { beoId, eventId } = req.params;
    const updates = req.body;
    const userId = req.user?.sub;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !userId) {
      return res.status(400).json({ success: false, error: 'orgId and userId required' });
    }

    const event = await beoExecutionService.updateTimelineEvent(eventId, updates, userId, orgId);

    res.json({ success: true, data: event });
  } catch (error: any) {
    console.error('[BEOExecution] Error updating timeline event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/beo-execution/:beoId/updates
 * Get real-time updates for a BEO
 */
router.get('/:beoId/updates', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const orgId = req.user?.orgId || req.query.orgId as string;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const updates = await beoExecutionService.getUpdates(beoId, orgId);

    res.json({ success: true, data: updates });
  } catch (error: any) {
    console.error('[BEOExecution] Error fetching updates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/beo-execution/:beoId/updates
 * Add a real-time update
 */
router.post('/:beoId/updates', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const { type, message, category, attachments } = req.body;
    const userId = req.user?.sub;
    const userName = req.user?.name || 'Unknown User';
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !userId) {
      return res.status(400).json({ success: false, error: 'orgId and userId required' });
    }

    if (!type || !message) {
      return res.status(400).json({ success: false, error: 'type and message required' });
    }

    const update = await beoExecutionService.addUpdate(
      beoId,
      {
        type,
        message,
        author: userName,
        authorId: userId,
        category: category || 'General',
        attachments: attachments || [],
      },
      orgId
    );

    res.json({ success: true, data: update });
  } catch (error: any) {
    console.error('[BEOExecution] Error adding update:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/beo-execution/:beoId/updates/:updateId/resolve
 * Resolve an issue
 */
router.post('/:beoId/updates/:updateId/resolve', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { beoId, updateId } = req.params;
    const userId = req.user?.sub;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !userId) {
      return res.status(400).json({ success: false, error: 'orgId and userId required' });
    }

    const update = await beoExecutionService.resolveIssue(updateId, userId, orgId);

    res.json({ success: true, data: update });
  } catch (error: any) {
    console.error('[BEOExecution] Error resolving issue:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/beo-execution/:beoId/guest-count
 * Update guest count
 */
router.patch('/:beoId/guest-count', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const { actualCount } = req.body;
    const userId = req.user?.sub;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !userId) {
      return res.status(400).json({ success: false, error: 'orgId and userId required' });
    }

    if (typeof actualCount !== 'number') {
      return res.status(400).json({ success: false, error: 'actualCount must be a number' });
    }

    await beoExecutionService.updateGuestCount(beoId, actualCount, userId, orgId);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[BEOExecution] Error updating guest count:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/beo-execution/:beoId/metrics
 * Get post-event metrics
 */
router.get('/:beoId/metrics', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const orgId = req.user?.orgId || req.query.orgId as string;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const metrics = await beoExecutionService.getPostEventMetrics(beoId, orgId);

    res.json({ success: true, data: metrics });
  } catch (error: any) {
    console.error('[BEOExecution] Error fetching metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/beo-execution/:beoId/start
 * Start event execution
 */
router.post('/:beoId/start', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const userId = req.user?.sub;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !userId) {
      return res.status(400).json({ success: false, error: 'orgId and userId required' });
    }

    await beoExecutionService.startEvent(beoId, userId, orgId);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[BEOExecution] Error starting event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/beo-execution/:beoId/end
 * End event execution
 */
router.post('/:beoId/end', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const userId = req.user?.sub;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !userId) {
      return res.status(400).json({ success: false, error: 'orgId and userId required' });
    }

    await beoExecutionService.endEvent(beoId, userId, orgId);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[BEOExecution] Error ending event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
