/**
 * BEO AI Orders Routes
 *
 * REST API for managing AI-generated orders:
 * - Edit order quantities/units
 * - Approve/reject orders
 * - Submit chef feedback for AI training
 * - Get order statistics
 */

import express, { Request, Response } from "express";
import { getOrgContext } from "../lib/org-context";
import { beoAIOrdersService } from "../lib/beo-ai-orders-service";
import { logger } from "../lib/logger";

const router = express.Router();

/**
 * PATCH /beo/:beoId/ai-orders/:orderId
 * Update an AI order (quantity, unit, feedback, etc.)
 */
router.patch("/:beoId/ai-orders/:orderId", async (req: Request, res: Response) => {
  try {
    const { beoId, orderId } = req.params;
    const { quantity, unit, feedback } = req.body;
    const orgContext = getOrgContext(req);
    const userId = (req as any).user?.id;

    const result = await beoAIOrdersService.updateAIOrder(
      beoId,
      orderId,
      orgContext.orgId,
      { quantity, unit, feedback },
      userId,
    );

    res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error("[BEO-AI-ORDERS-ROUTE] PATCH error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to update order",
    });
  }
});

/**
 * POST /beo/:beoId/ai-orders/:orderId/approve
 * Approve an AI order
 */
router.post(
  "/:beoId/ai-orders/:orderId/approve",
  async (req: Request, res: Response) => {
    try {
      const { beoId, orderId } = req.params;
      const orgContext = getOrgContext(req);
      const userId = (req as any).user?.id;

      const result = await beoAIOrdersService.approveAIOrder(
        beoId,
        orderId,
        orgContext.orgId,
        userId,
      );

      res.json({ success: true, data: result.data });
    } catch (err) {
      logger.error("[BEO-AI-ORDERS-ROUTE] Approve error:", err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : "Failed to approve order",
      });
    }
  },
);

/**
 * POST /beo/:beoId/ai-orders/:orderId/reject
 * Reject an AI order
 */
router.post(
  "/:beoId/ai-orders/:orderId/reject",
  async (req: Request, res: Response) => {
    try {
      const { beoId, orderId } = req.params;
      const orgContext = getOrgContext(req);
      const userId = (req as any).user?.id;

      const result = await beoAIOrdersService.rejectAIOrder(
        beoId,
        orderId,
        orgContext.orgId,
        userId,
      );

      res.json({ success: true, data: result.data });
    } catch (err) {
      logger.error("[BEO-AI-ORDERS-ROUTE] Reject error:", err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : "Failed to reject order",
      });
    }
  },
);

/**
 * POST /beo/:beoId/ai-feedback
 * Submit chef feedback for AI learning
 */
router.post("/:beoId/ai-feedback", async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const {
      feedback,
      approvedOrders,
      rejectedOrders,
      adjustedOrders,
    } = req.body;
    const orgContext = getOrgContext(req);
    const userId = (req as any).user?.id;

    const result = await beoAIOrdersService.submitChefFeedback(
      beoId,
      orgContext.orgId,
      {
        notes: feedback,
        approvedOrderIds: approvedOrders?.map((o: any) => o.id) || [],
        rejectedOrderIds: rejectedOrders?.map((o: any) => o.id) || [],
        adjustedOrders: adjustedOrders || [],
      },
      userId,
    );

    res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error("[BEO-AI-ORDERS-ROUTE] Feedback error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to submit feedback",
    });
  }
});

/**
 * GET /beo/:beoId/ai-orders/statistics
 * Get AI order statistics for a BEO
 */
router.get(
  "/:beoId/ai-orders/statistics",
  async (req: Request, res: Response) => {
    try {
      const { beoId } = req.params;
      const orgContext = getOrgContext(req);

      const stats = await beoAIOrdersService.getAIOrderStatistics(
        beoId,
        orgContext.orgId,
      );

      res.json({ success: true, data: stats });
    } catch (err) {
      logger.error("[BEO-AI-ORDERS-ROUTE] Statistics error:", err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : "Failed to get statistics",
      });
    }
  },
);

export { router };
