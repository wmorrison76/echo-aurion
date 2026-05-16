/**
 * WebSocket Stats API Routes
 * 
 * Endpoints for monitoring WebSocket connection health and performance
 */

import { Router, Request, Response } from 'express';
import { websocketOptimizationService } from '../services/websocket-optimization-service';
import { requireAuth } from '../middleware/auth';
import { getUserOrgId } from '../lib/multi-tenant';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /api/websocket/stats
 * Get WebSocket service statistics
 */
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = getUserOrgId(req);

    if (!orgId) {
      return res.status(400).json({
        error: 'MISSING_ORG_ID',
        message: 'Organization ID is required',
      });
    }

    const stats = websocketOptimizationService.getStats();
    const queueStats = websocketOptimizationService.getQueueStats();
    const connectionMetrics = websocketOptimizationService.getAllConnectionMetrics();

    // Filter connections by org (if applicable)
    const orgConnections = connectionMetrics.filter((m) => {
      // If outletId contains org info, filter accordingly
      // This is a simplified check - adjust based on your org structure
      return true; // For now, return all connections
    });

    res.json({
      success: true,
      data: {
        ...stats,
        queueStats,
        connections: orgConnections.map((m) => ({
          connectionId: m.connectionId,
          userId: m.userId,
          outletId: m.outletId,
          latency: m.latency,
          isHealthy: m.isHealthy,
          connectedAt: m.connectedAt,
          messageCount: m.messageCount,
          errorCount: m.errorCount,
        })),
      },
    });
  } catch (error) {
    logger.error('[WebSocketStats] Error getting stats', { error });
    res.status(500).json({
      error: 'FETCH_FAILED',
      message: 'Failed to retrieve WebSocket statistics',
    });
  }
});

/**
 * GET /api/websocket/stats/connection/:connectionId
 * Get metrics for a specific connection
 */
router.get('/stats/connection/:connectionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const orgId = getUserOrgId(req);

    if (!orgId) {
      return res.status(400).json({
        error: 'MISSING_ORG_ID',
        message: 'Organization ID is required',
      });
    }

    const metrics = websocketOptimizationService.getConnectionMetrics(connectionId);

    if (!metrics) {
      return res.status(404).json({
        error: 'CONNECTION_NOT_FOUND',
        message: 'Connection not found',
      });
    }

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('[WebSocketStats] Error getting connection metrics', { error, connectionId: req.params.connectionId });
    res.status(500).json({
      error: 'FETCH_FAILED',
      message: 'Failed to retrieve connection metrics',
    });
  }
});

/**
 * GET /api/websocket/stats/queue
 * Get message queue statistics
 */
router.get('/stats/queue', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = getUserOrgId(req);

    if (!orgId) {
      return res.status(400).json({
        error: 'MISSING_ORG_ID',
        message: 'Organization ID is required',
      });
    }

    const queueStats = websocketOptimizationService.getQueueStats();

    res.json({
      success: true,
      data: {
        queues: queueStats,
        totalQueued: queueStats.reduce((sum, q) => sum + q.queueSize, 0),
      },
    });
  } catch (error) {
    logger.error('[WebSocketStats] Error getting queue stats', { error });
    res.status(500).json({
      error: 'FETCH_FAILED',
      message: 'Failed to retrieve queue statistics',
    });
  }
});

/**
 * POST /api/websocket/health-check
 * Trigger manual health check
 */
router.post('/health-check', requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = getUserOrgId(req);

    if (!orgId) {
      return res.status(400).json({
        error: 'MISSING_ORG_ID',
        message: 'Organization ID is required',
      });
    }

    const stats = websocketOptimizationService.getStats();
    const isHealthy = stats.healthyConnections > 0 && stats.averageLatency < 1000;

    res.json({
      success: true,
      healthy: isHealthy,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[WebSocketStats] Error performing health check', { error });
    res.status(500).json({
      error: 'HEALTH_CHECK_FAILED',
      message: 'Failed to perform health check',
    });
  }
});

export default router;
