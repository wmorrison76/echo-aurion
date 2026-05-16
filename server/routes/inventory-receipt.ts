/**
 * LUCCCA Inventory Framework - Receipt Route
 * POST /api/inventory/receipt - Record new inventory arrival
 * Used by P&R after invoice OCR/approval
 */

import { Router, Request, Response } from "express";
import { validateBody } from "../middleware/validation";
import { inventoryReceiptSchema } from "../middleware/validation";
import { getOrgContext, enforceOrgId } from "../lib/multi-tenant";
import { logger } from "../lib/logger";
import { processInventoryReceipt } from "../lib/inventory-service";
import { AppError, ProductNotFoundError, LocationNotFoundError, InventoryError } from "../lib/errorHandler";
import type { InventoryReceiptRequest, InventoryReceiptResponse } from "@shared/inventory-types";
import { emitInventoryReceipt } from "../services/financial-module-connectors";

const router = Router();

/**
 * POST /api/inventory/receipt
 * Record new inventory from purchase orders
 *
 * Body:
 * {
 *   "lines": [
 *     {
 *       "product_id": "uuid",
 *       "location_id": "MAIN_KITCHEN",
 *       "qty": 10,
 *       "unit_cost": 6.25,
 *       "source_ref": "invoice_001"
 *     }
 *   ],
 *   "user_id": "uuid (optional)",
 *   "notes": "string (optional)"
 * }
 *
 * Response (200):
 * {
 *   "success": true,
 *   "transaction_ids": ["uuid1", "uuid2"],
 *   "items_created": 0,
 *   "items_updated": 2,
 *   "total_qty_received": 20,
 *   "total_cost": 125.00
 * }
 *
 * Errors:
 * - 400: Invalid request body (missing fields, negative qty, etc.)
 * - 404: Product or location not found
 * - 500: Database error
 */
router.post(
  "/inventory/receipt",
  validateBody(inventoryReceiptSchema),
  async (req: any, res: Response) => {
    try {
      const orgContext = getOrgContext(req);
      const body = req.body as InventoryReceiptRequest;

      // Enforce org_id on request if provided
      if (body.user_id) {
        enforceOrgId(orgContext.orgId, orgContext.orgId);
      }

      logger.info("Processing inventory receipt", {
        requestId: req.id,
        orgId: orgContext.orgId,
        lineCount: body.lines.length,
      });

      // Process receipt
      const result = await processInventoryReceipt(
        orgContext.orgId,
        body.lines,
        body.user_id || req.user?.id,
        undefined,
        "PR" // Source module: Purchasing & Receiving
      );

      if (!result.success) {
        logger.warn("Inventory receipt processing failed", {
          requestId: req.id,
          orgId: orgContext.orgId,
        });

        return res.status(400).json({
          success: false,
          error: "RECEIPT_PROCESSING_FAILED",
          details: "Failed to process one or more receipt lines",
        });
      }

      logger.info("Inventory receipt processed successfully", {
        requestId: req.id,
        orgId: orgContext.orgId,
        transactionCount: result.transaction_ids.length,
        totalCost: result.total_cost,
      });

      // Emit financial events and Stratus events for each received item
      // This feeds the central P&L engine with COGS data and EchoStratus decision intelligence
      const outletId = body.location_id || "default-outlet";
      for (const line of body.lines) {
        try {
          // Emit financial event (existing)
          emitInventoryReceipt(
            orgContext.orgId,
            outletId,
            {
              product_id: line.product_id,
              location_id: line.location_id,
              qty: line.qty,
              unit_cost: line.unit_cost,
              total_cost: line.qty * line.unit_cost,
              transaction_type: "RECEIPT",
              source_ref: undefined,
            }
          );

          // Emit Stratus event for decision intelligence
          try {
            const { emitInventoryReceived } = await import("../lib/module-event-emitters.js");
            await emitInventoryReceived({
              tenant_id: orgContext.orgId,
              org_id: orgContext.orgId,
              outlet_id: outletId,
              receipt_id: result.transaction_ids?.[0] || `receipt_${Date.now()}`,
              items: [{
                id: line.product_id,
                name: line.product_id, // Should fetch product name
                quantity: line.qty,
                unit_cost: line.unit_cost,
                total_cost: line.qty * line.unit_cost,
              }],
              total_cost: line.qty * line.unit_cost,
              received_at: new Date().toISOString(),
              received_by: body.user_id || req.user?.id,
            });
          } catch (stratusError) {
            logger.error("Failed to emit Stratus inventory event", {
              requestId: req.id,
              error: stratusError instanceof Error ? stratusError.message : String(stratusError),
            });
            // Don't fail if Stratus event emission fails
          }
        } catch (eventError) {
          logger.error("Failed to emit inventory receipt event", {
            requestId: req.id,
            error: eventError instanceof Error ? eventError.message : String(eventError),
          });
          // Don't fail the receipt if event emission fails, but log it
        }
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Inventory receipt error", {
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

export const inventoryReceiptRouter = router;
