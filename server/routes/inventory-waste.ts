/**
 * LUCCCA Inventory Framework - Waste Route
 * POST /api/inventory/waste - Log inventory waste/disposal
 * Used by waste sheets (desktop + mobile) and production waste tracking
 */

import { Router, Request, Response } from "express";
import { validateBody } from "../middleware/validation";
import { inventoryWasteSchema } from "../middleware/validation";
import { getOrgContext } from "../lib/multi-tenant";
import { logger } from "../lib/logger";
import { processInventoryWaste } from "../lib/inventory-service";
import { AppError, ProductNotFoundError, LocationNotFoundError } from "../lib/errorHandler";
import type { InventoryWasteRequest, InventoryWasteResponse } from "@shared/inventory-types";
import { emitInventoryWaste, emitInventoryReceipt } from "../services/financial-module-connectors";

const router = Router();

/**
 * POST /api/inventory/waste
 * Log inventory waste/disposal
 *
 * Body:
 * {
 *   "lines": [
 *     {
 *       "product_id": "uuid",
 *       "location_id": "MAIN_KITCHEN",
 *       "qty": 5,
 *       "category": "spoilage",
 *       "reason": "Expiration date exceeded"
 *     }
 *   ],
 *   "user_id": "uuid (optional)",
 *   "batch_reason": "End of day spoilage check (optional)"
 * }
 *
 * Response (200):
 * {
 *   "success": true,
 *   "transaction_ids": ["uuid1", "uuid2"],
 *   "lines_processed": 2,
 *   "total_qty_wasted": 5,
 *   "total_cost_impact": -45.50  // Negative (cost of wasted items)
 * }
 *
 * Errors:
 * - 400: Invalid request body (missing fields, negative qty, etc.)
 * - 404: Product or location not found
 * - 409: Requested waste qty exceeds available inventory
 * - 500: Database error
 */
router.post(
  "/inventory/waste",
  validateBody(inventoryWasteSchema),
  async (req: any, res: Response) => {
    try {
      const orgContext = getOrgContext(req);
      const body = req.body as InventoryWasteRequest;

      logger.info("Processing inventory waste", {
        requestId: req.id,
        orgId: orgContext.orgId,
        lineCount: body.lines.length,
      });

      // Process waste
      const result = await processInventoryWaste(
        orgContext.orgId,
        body.lines,
        body.user_id || req.user?.id,
        body.batch_reason
      );

      if (!result.success) {
        logger.warn("Inventory waste processing failed", {
          requestId: req.id,
          orgId: orgContext.orgId,
        });

        return res.status(400).json({
          success: false,
          error: "WASTE_PROCESSING_FAILED",
          details: "Failed to process one or more waste lines",
        });
      }

      logger.info("Inventory waste processed successfully", {
        requestId: req.id,
        orgId: orgContext.orgId,
        wasteTransactionCount: result.transaction_ids.length,
        totalQtyWasted: result.total_qty_wasted,
        costImpact: result.total_cost_impact,
      });

      // Emit financial events for each wasted item (Phase 5: Module Connectors)
      // This feeds the central P&L engine with waste cost data
      const outletId = "default-outlet"; // In production, this would be extracted from request context
      for (const line of body.lines) {
        try {
          // Calculate unit cost from the waste cost impact
          // The service calculates total_cost_impact as the sum of waste costs
          const unitCost = line.qty > 0 ? Math.abs(result.total_cost_impact) / result.total_qty_wasted : 0;
          const lineCost = Math.abs(result.total_cost_impact) * (line.qty / result.total_qty_wasted);

          emitInventoryWaste(
            orgContext.orgId,
            outletId,
            {
              product_id: line.product_id,
              location_id: line.location_id,
              qty: line.qty,
              unit_cost: unitCost,
              total_cost: lineCost,
              transaction_type: "WASTE",
              waste_category: line.category || "other",
            }
          );
        } catch (eventError) {
          logger.error("Failed to emit inventory waste event", {
            requestId: req.id,
            error: eventError instanceof Error ? eventError.message : String(eventError),
          });
          // Don't fail the waste log if event emission fails, but log it
        }
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Inventory waste error", {
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

export const inventoryWasteRouter = router;
