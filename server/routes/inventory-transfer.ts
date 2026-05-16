/**
 * LUCCCA Inventory Framework - Transfer Route
 * POST /api/inventory/transfer - Move inventory between locations
 * Used for inter-outlet, storeroom, and production transfers
 */

import { Router, Request, Response } from "express";
import { validateBody } from "../middleware/validation";
import { inventoryTransferSchema } from "../middleware/validation";
import { getOrgContext } from "../lib/multi-tenant";
import { logger } from "../lib/logger";
import { processInventoryTransfer } from "../lib/inventory-service";
import { AppError, ProductNotFoundError, LocationNotFoundError, InsufficientStockError } from "../lib/errorHandler";
import type { InventoryTransferRequest, InventoryTransferResponse } from "@shared/inventory-types";

const router = Router();

/**
 * POST /api/inventory/transfer
 * Move inventory between locations (storeroom → outlet, kitchen → bar, etc.)
 *
 * Body:
 * {
 *   "lines": [
 *     {
 *       "product_id": "uuid",
 *       "from_location_id": "CENTRAL_STOREROOM",
 *       "to_location_id": "POOL_BAR",
 *       "qty": 2
 *     }
 *   ],
 *   "user_id": "uuid (optional)",
 *   "notes": "string (optional)"
 * }
 *
 * Response (200):
 * {
 *   "success": true,
 *   "transfer_ids": ["uuid1", "uuid2"],  // 2 per line: TRANSFER_OUT + TRANSFER_IN
 *   "lines_processed": 1,
 *   "total_qty_transferred": 2
 * }
 *
 * Errors:
 * - 400: Invalid request body (missing fields, negative qty, etc.)
 * - 404: Product or location not found
 * - 409: Insufficient stock in source location
 * - 500: Database error
 */
router.post(
  "/inventory/transfer",
  validateBody(inventoryTransferSchema),
  async (req: any, res: Response) => {
    try {
      const orgContext = getOrgContext(req);
      const body = req.body as InventoryTransferRequest;

      logger.info("Processing inventory transfer", {
        requestId: req.id,
        orgId: orgContext.orgId,
        lineCount: body.lines.length,
      });

      // Process transfer
      const result = await processInventoryTransfer(
        orgContext.orgId,
        body.lines,
        body.user_id || req.user?.id
      );

      if (!result.success) {
        logger.warn("Inventory transfer processing failed", {
          requestId: req.id,
          orgId: orgContext.orgId,
        });

        return res.status(400).json({
          success: false,
          error: "TRANSFER_PROCESSING_FAILED",
          details: "Failed to process one or more transfer lines",
        });
      }

      logger.info("Inventory transfer processed successfully", {
        requestId: req.id,
        orgId: orgContext.orgId,
        transferCount: result.transfer_ids.length / 2, // 2 transactions per line
        totalQty: result.total_qty_transferred,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Inventory transfer error", {
        requestId: req.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      if (error instanceof ProductNotFoundError || error instanceof LocationNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.code,
          message: error.message,
        });
      }

      if (error instanceof InsufficientStockError) {
        return res.status(409).json({
          success: false,
          error: error.code,
          message: error.message,
          details: error.context,
        });
      }

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.code,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      });
    }
  }
);

export const inventoryTransferRouter = router;
