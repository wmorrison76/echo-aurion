/**
 * LUCCCA Inventory Framework - Supplementary Routes
 * GET endpoints for querying inventory data
 * Core transaction endpoints are in: inventory-receipt.ts, inventory-transfer.ts, inventory-waste.ts
 */

import { Router, Request, Response } from "express";
import { validateQuery } from "../middleware/validation";
import { inventoryHistoryQuerySchema } from "../middleware/validation";
import { getOrgContext } from "../lib/multi-tenant";
import { logger } from "../lib/logger";
import {
  getOrgInventorySnapshot,
  getTransactionAuditTrail,
} from "../lib/inventory-service";
import { AppError } from "../lib/errorHandler";

const router = Router();

/**
 * GET /api/inventory/items
 * List all inventory items for an organization
 *
 * Query params:
 * - location_id: string (optional) - Filter by location
 * - product_id: string (optional) - Filter by product
 * - active_only: boolean (default: true) - Only active items
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "items": [...],
 *     "total_qty": 500,
 *     "total_valuation": 12500.00,
 *     "as_of": "2024-01-15T10:30:00Z"
 *   }
 * }
 */
router.get("/inventory/items", async (req: any, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const locationId = req.query.location_id as string | undefined;
    const activeOnly = req.query.active_only !== "false";

    logger.info("Fetching inventory items", {
      requestId: req.id,
      orgId: orgContext.orgId,
      locationId,
    });

    const snapshot = await getOrgInventorySnapshot(orgContext.orgId, locationId);

    res.status(200).json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    logger.error("Failed to fetch inventory items", {
      requestId: req.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to fetch inventory items",
    });
  }
});

/**
 * GET /api/inventory/items/:id
 * Get a single inventory item
 *
 * Query params:
 * - product_id: string - Product ID
 * - location_id: string - Location ID
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "org_id": "uuid",
 *     "product_id": "uuid",
 *     "location_id": "MAIN_KITCHEN",
 *     "on_hand_qty": 50,
 *     "avg_cost": 25.00,
 *     ...
 *   }
 * }
 */
router.get("/inventory/items/:id", async (req: any, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const productId = req.query.product_id as string;
    const locationId = req.query.location_id as string;

    if (!productId || !locationId) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "product_id and location_id query parameters required",
      });
    }

    logger.info("Fetching inventory item", {
      requestId: req.id,
      orgId: orgContext.orgId,
      productId,
      locationId,
    });

    const snapshot = await getOrgInventorySnapshot(orgContext.orgId, locationId);
    const item = snapshot.items.find((i) => i.product_id === productId);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Inventory item not found",
      });
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    logger.error("Failed to fetch inventory item", {
      requestId: req.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to fetch inventory item",
    });
  }
});

/**
 * GET /api/inventory/transactions
 * Query transaction history (audit trail)
 *
 * Query params:
 * - product_id: string (optional)
 * - location_id: string (optional)
 * - from_location_id: string (optional)
 * - to_location_id: string (optional)
 * - transaction_type: string (optional) - RECEIPT, TRANSFER_OUT, TRANSFER_IN, WASTE, etc.
 * - source_module: string (optional) - PR, Events, EchoRecipePro, etc.
 * - date_from: ISO date (optional)
 * - date_to: ISO date (optional)
 * - limit: number (default: 100, max: 1000)
 * - offset: number (default: 0)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "transactions": [...],
 *     "total_count": 250,
 *     "limit": 100,
 *     "offset": 0
 *   }
 * }
 */
router.get(
  "/inventory/transactions",
  validateQuery(inventoryHistoryQuerySchema),
  async (req: any, res: Response) => {
    try {
      const orgContext = getOrgContext(req);

      logger.info("Fetching transaction history", {
        requestId: req.id,
        orgId: orgContext.orgId,
        productId: req.query.product_id,
        locationId: req.query.location_id,
      });

      const result = await getTransactionAuditTrail(orgContext.orgId, {
        productId: req.query.product_id,
        locationId: req.query.location_id,
        dateFrom: req.query.date_from,
        dateTo: req.query.date_to,
        sourceModule: req.query.source_module,
        limit: req.query.limit || 100,
        offset: req.query.offset || 0,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Failed to fetch transaction history", {
        requestId: req.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      res.status(500).json({
        success: false,
        error: "INTERNAL_ERROR",
        message: "Failed to fetch transaction history",
      });
    }
  }
);

/**
 * GET /api/inventory/snapshot
 * Get current inventory snapshot for organization
 *
 * Query params:
 * - location_id: string (optional) - Filter by location
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "items": [...],
 *     "total_qty": 5000,
 *     "total_valuation": 125000.00,
 *     "as_of": "2024-01-15T10:30:00Z"
 *   }
 * }
 */
router.get("/inventory/snapshot", async (req: any, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const locationId = req.query.location_id as string | undefined;

    logger.info("Fetching inventory snapshot", {
      requestId: req.id,
      orgId: orgContext.orgId,
      locationId,
    });

    const snapshot = await getOrgInventorySnapshot(orgContext.orgId, locationId);

    res.status(200).json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    logger.error("Failed to fetch inventory snapshot", {
      requestId: req.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to fetch inventory snapshot",
    });
  }
});

export default router;
export { router as inventoryRouter };
