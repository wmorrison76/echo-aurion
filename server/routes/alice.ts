/**
 * ALICE Integration Routes
 * Facilities Management System API endpoints
 */

import express, { Request, Response } from 'express';
import { aliceClient, ALICEMaintenanceRequest } from '../integrations/alice';

const router = express.Router();

/**
 * Check availability for maintenance in a space during a time window
 */
router.post('/check-availability', async (req: Request, res: Response) => {
  try {
    const { space, startTime, endTime, bufferMinutes } = req.body;

    if (!space || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Missing required fields: space, startTime, endTime',
      });
    }

    const availability = await aliceClient.checkAvailability(
      space,
      startTime,
      endTime,
      bufferMinutes || 90
    );

    res.json(availability);
  } catch (error) {
    console.error('[ALICE] Error checking availability:', error);
    res.status(500).json({
      error: 'Failed to check availability',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get all assets in a space
 */
router.get('/assets/:space', async (req: Request, res: Response) => {
  try {
    const { space } = req.params;

    if (!space) {
      return res.status(400).json({
        error: 'Missing required parameter: space',
      });
    }

    const assets = await aliceClient.getAssetsInSpace(space);

    res.json({
      space,
      assets,
      count: assets.length,
    });
  } catch (error) {
    console.error('[ALICE] Error getting assets:', error);
    res.status(500).json({
      error: 'Failed to get assets',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Submit a maintenance work order
 */
router.post('/work-orders', async (req: Request, res: Response) => {
  try {
    const { space, workType, description, startTime, endTime, priority, externalCompany } = req.body;

    if (!space || !workType || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Missing required fields: space, workType, startTime, endTime',
      });
    }

    const request: ALICEMaintenanceRequest = {
      space,
      workType,
      description,
      startTime,
      endTime,
      priority: priority || 'medium',
      externalCompany,
    };

    const result = await aliceClient.submitWorkOrder(request);

    if (result.success) {
      return res.status(201).json(result);
    } else {
      return res.status(409).json(result);
    }
  } catch (error) {
    console.error('[ALICE] Error submitting work order:', error);
    res.status(500).json({
      error: 'Failed to submit work order',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get work orders for a space
 */
router.get('/work-orders/:space', async (req: Request, res: Response) => {
  try {
    const { space } = req.params;

    if (!space) {
      return res.status(400).json({
        error: 'Missing required parameter: space',
      });
    }

    const workOrders = await aliceClient.getWorkOrders(space);

    res.json({
      space,
      workOrders,
      count: workOrders.length,
      active: workOrders.filter(wo => wo.status !== 'completed' && wo.status !== 'cancelled').length,
    });
  } catch (error) {
    console.error('[ALICE] Error getting work orders:', error);
    res.status(500).json({
      error: 'Failed to get work orders',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get specific work order status
 */
router.get('/work-orders/:space/:workOrderId', async (req: Request, res: Response) => {
  try {
    const { workOrderId } = req.params;

    if (!workOrderId) {
      return res.status(400).json({
        error: 'Missing required parameter: workOrderId',
      });
    }

    const workOrder = await aliceClient.getWorkOrderStatus(workOrderId);

    if (!workOrder) {
      return res.status(404).json({
        error: 'Work order not found',
      });
    }

    res.json(workOrder);
  } catch (error) {
    console.error('[ALICE] Error getting work order status:', error);
    res.status(500).json({
      error: 'Failed to get work order status',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Cancel a work order
 */
router.post('/work-orders/:workOrderId/cancel', async (req: Request, res: Response) => {
  try {
    const { workOrderId } = req.params;
    const { reason } = req.body;

    if (!workOrderId) {
      return res.status(400).json({
        error: 'Missing required parameter: workOrderId',
      });
    }

    const result = await aliceClient.cancelWorkOrder(workOrderId, reason || 'No reason provided');

    res.json(result);
  } catch (error) {
    console.error('[ALICE] Error cancelling work order:', error);
    res.status(500).json({
      error: 'Failed to cancel work order',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get maintenance history for an asset
 */
router.get('/assets/:assetId/history', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.params;

    if (!assetId) {
      return res.status(400).json({
        error: 'Missing required parameter: assetId',
      });
    }

    const history = await aliceClient.getAssetHistory(assetId);

    res.json({
      assetId,
      history,
      count: history.length,
    });
  } catch (error) {
    console.error('[ALICE] Error getting asset history:', error);
    res.status(500).json({
      error: 'Failed to get asset history',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Health check for ALICE integration
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await aliceClient.healthCheck();
    res.status(health.status === 'ok' ? 200 : 503).json(health);
  } catch (error) {
    console.error('[ALICE] Health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
