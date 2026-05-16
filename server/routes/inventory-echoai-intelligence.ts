/**
 * Inventory EchoAI Intelligence API Routes
 * ----------------------------------------
 * API endpoints for EchoAI-powered inventory ordering decisions
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { basicAuthMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";
import { getInventoryEchoAIIntelligenceService } from "../services/inventory-echoai-intelligence";

const router = Router();
router.use(basicAuthMiddleware);

const MakeOrderDecisionSchema = z.object({
  item: z.object({
    id: z.string().uuid(),
    name: z.string(),
    category: z.string(),
    currentStock: z.number().min(0),
    parLevel: z.number().min(0),
    unit: z.string(),
    avgCost: z.number().min(0),
    leadTimeDays: z.number().int().min(0),
    requiredBy: z.string().datetime().optional(),
    requiredFor: z.enum(["beo", "prep", "inventory", "general"]).optional(),
    specificProductRequired: z.boolean().optional(),
    chefNotes: z.string().optional(),
  }),
  supplierOptions: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      itemId: z.string().uuid(),
      itemName: z.string(),
      price: z.number().min(0),
      unit: z.string(),
      availability: z.enum(["in_stock", "limited", "out_of_stock", "pre_order"]),
      deliveryDays: z.number().int().min(0),
      minOrderQty: z.number().min(0),
      quality: z.enum(["high", "medium", "standard"]),
      reliability: z.number().min(0).max(1),
      deliverySchedule: z
        .object({
          earliest: z.string().datetime(),
          latest: z.string().datetime(),
          frequency: z.enum(["daily", "weekly", "bi_weekly", "monthly"]),
        })
        .optional(),
    })
  ),
  context: z.object({
    orgId: z.string().uuid(),
    outletId: z.string().uuid().optional(),
    chefId: z.string().uuid().optional(),
    beoId: z.string().uuid().optional(),
    prepNeededBy: z.string().datetime().optional(),
    budget: z.number().min(0).optional(),
    priority: z.enum(["critical", "high", "medium", "low"]),
    approvalThreshold: z.number().min(0).optional(),
  }),
  useAI: z.boolean().optional().default(false),
});

/**
 * POST /api/inventory-echoai/order-decision
 * Make intelligent ordering decision using EchoAI
 */
router.post("/order-decision", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validated = MakeOrderDecisionSchema.parse(req.body);
    const intelligenceService = getInventoryEchoAIIntelligenceService();

    // Make decision
    let decision = await intelligenceService.makeOrderDecision(
      validated.item,
      validated.supplierOptions,
      {
        ...validated.context,
        orgId: validated.context.orgId || orgId,
      }
    );

    // Optionally enhance with AI
    if (validated.useAI) {
      decision = await intelligenceService.enhanceDecisionWithAI(
        decision,
        validated.item,
        {
          ...validated.context,
          orgId: validated.context.orgId || orgId,
        }
      );
    }

    logger.info("[InventoryEchoAI] Order decision made", {
      orgId,
      itemId: validated.item.id,
      itemName: validated.item.name,
      recommendation: decision.recommendation,
      priority: decision.priority,
      requiresApproval: decision.requiresApproval,
    });

    res.json({
      success: true,
      decision,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }

    logger.error("[InventoryEchoAI] Order decision error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default router;
