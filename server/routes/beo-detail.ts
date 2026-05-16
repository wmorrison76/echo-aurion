/**
 * BEO Detail Routes
 *
 * Endpoints for fetching complete BEO details including:
 * - BEO header information
 * - Timestamped changelog
 * - AI-generated orders
 * - Production schedule
 * - Inventory status
 */

import express, { Request, Response } from "express";
import { beoDetailService } from "../lib/beo-detail-service";
import { getOrgContext } from "../lib/org-resolver";
import { logger } from "../lib/logger";

const router = express.Router();

/**
 * GET /api/beo/:beoId/detail
 * Fetch complete BEO detail data
 */
router.get("/:beoId/detail", async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const orgContext = getOrgContext(req);

    logger.info("[BEO-DETAIL-ROUTE] GET detail", {
      beoId,
      orgId: orgContext.orgId,
    });

    if (!beoId) {
      return res.status(400).json({
        success: false,
        error: "BEO ID is required",
      });
    }

    const data = await beoDetailService.fetchBEODetail(beoId, orgContext.orgId);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    logger.error("[BEO-DETAIL-ROUTE] GET detail error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch BEO details",
    });
  }
});

/**
 * GET /api/beo/:beoId/changelog
 * Fetch BEO changelog (timestamped changes)
 */
router.get("/:beoId/changelog", async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const orgContext = getOrgContext(req);

    const data = await beoDetailService.fetchBEODetail(beoId, orgContext.orgId);

    res.json({
      success: true,
      changelog: data.changelog,
    });
  } catch (err) {
    logger.error("[BEO-DETAIL-ROUTE] GET changelog error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch changelog",
    });
  }
});

/**
 * GET /api/beo/:beoId/ai-orders
 * Fetch AI-generated orders for BEO
 */
router.get("/:beoId/ai-orders", async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const orgContext = getOrgContext(req);

    const data = await beoDetailService.fetchBEODetail(beoId, orgContext.orgId);

    res.json({
      success: true,
      aiOrders: data.aiOrders,
    });
  } catch (err) {
    logger.error("[BEO-DETAIL-ROUTE] GET ai-orders error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch AI orders",
    });
  }
});

/**
 * GET /api/beo/:beoId/production-schedule
 * Fetch production schedule for BEO
 */
router.get(
  "/:beoId/production-schedule",
  async (req: Request, res: Response) => {
    try {
      const { beoId } = req.params;
      const orgContext = getOrgContext(req);

      const data = await beoDetailService.fetchBEODetail(
        beoId,
        orgContext.orgId,
      );

      res.json({
        success: true,
        productionSchedule: data.productionSchedule,
      });
    } catch (err) {
      logger.error("[BEO-DETAIL-ROUTE] GET production-schedule error:", err);
      res.status(500).json({
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch production schedule",
      });
    }
  },
);

/**
 * GET /api/beo/:beoId/inventory-status
 * Fetch inventory status for BEO
 */
router.get("/:beoId/inventory-status", async (req: Request, res: Response) => {
  try {
    const { beoId } = req.params;
    const orgContext = getOrgContext(req);

    const data = await beoDetailService.fetchBEODetail(beoId, orgContext.orgId);

    res.json({
      success: true,
      inventory: data.inventory,
    });
  } catch (err) {
    logger.error("[BEO-DETAIL-ROUTE] GET inventory-status error:", err);
    res.status(500).json({
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to fetch inventory status",
    });
  }
});

export { router };
export default router;
