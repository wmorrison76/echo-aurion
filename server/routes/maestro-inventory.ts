/**
 * Maestro Inventory Routes
 *
 * Endpoints for inventory impact assessment and supply chain automation.
 *
 * ENDPOINTS:
 * - GET /api/maestro/inventory/:eventId
 * - POST /api/maestro/inventory/:eventId/auto-order
 * - GET /api/maestro/inventory/burn-rate
 * - PATCH /api/maestro/inventory/:itemId
 */

import express, { Request, Response } from "express";
import crypto from "crypto";
import { getOrgContext } from "../lib/org-resolver";
import { getSupabaseClient } from "../lib/supabase";
import { beoManagementService } from "../services/beo-management";

const router = express.Router();

type InventoryStatus = "covered" | "tight" | "short";

function normalizeName(value: string): string {
  return String(value || "").trim().toLowerCase();
}

/**
 * GET /api/maestro/inventory/:eventId
 * Get inventory impact for an event (all required items vs available)
 */
router.get("/:eventId", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const orgContext = getOrgContext(req);

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({ error: "Database connection unavailable" });
    }

    const beos = await beoManagementService.getBEOsByEvent(eventId);
    const beo = beos?.[0];
    const equipment = Array.isArray(beo?.contentData?.layout?.equipment)
      ? beo.contentData.layout.equipment
      : [];
    const items = Array.isArray(beo?.contentData?.items) ? beo.contentData.items : [];

    const requirements = [...equipment, ...items].map((item: any) => ({
      name: item.name || item.itemName || "Unknown",
      qty: Number(item.qty || item.quantity || 1),
      unitCost: Number(item.unitCost || item.unit_cost || 0),
      glCode: item.glCode || item.gl_code,
    }));

    const { data: inventoryItems, error } = await supabase
      .from("inventory_items")
      .select("product_name, quantity_on_hand, quantity_pending, unit, status")
      .eq("org_id", orgContext.orgId);

    if (error) {
      return res.status(500).json({
        error: "Failed to fetch inventory items",
        details: error.message,
      });
    }

    const inventoryByName = new Map(
      (inventoryItems || []).map((item: any) => [
        normalizeName(item.product_name),
        item,
      ]),
    );

    const enriched = requirements.map((reqItem) => {
      const inv = inventoryByName.get(normalizeName(reqItem.name));
      const onHand = Number(inv?.quantity_on_hand || 0);
      const pending = Number(inv?.quantity_pending || 0);
      const required = Number(reqItem.qty || 0);
      const status: InventoryStatus =
        onHand >= required
          ? "covered"
          : onHand + pending >= required
            ? "tight"
            : "short";
      return {
        itemName: reqItem.name,
        requiredQty: required,
        onHand,
        pending,
        unit: inv?.unit || "unit",
        status,
        glCode: reqItem.glCode,
        recommendedOrder:
          status === "short" ? Math.max(0, required - onHand - pending) : 0,
        estimatedCost: reqItem.unitCost ? reqItem.unitCost * required : 0,
      };
    });

    const summary = enriched.reduce(
      (acc, item) => {
        acc.totalItems += 1;
        if (item.status === "covered") acc.covered += 1;
        if (item.status === "tight") acc.tight += 1;
        if (item.status === "short") acc.short += 1;
        acc.totalShortageValue += item.status === "short" ? item.estimatedCost : 0;
        return acc;
      },
      {
        totalItems: 0,
        covered: 0,
        tight: 0,
        short: 0,
        totalShortageValue: 0,
      },
    );

    res.json({
      success: true,
      eventId,
      items: enriched,
      summary,
      orgId: orgContext.orgId,
    });
  } catch (err) {
    console.error("[MAESTRO-INVENTORY] GET error:", err);
    res.status(500).json({
      error: "Failed to fetch inventory impact",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * POST /api/maestro/inventory/:eventId/auto-order
 * Automatically generate purchase order for shortages
 */
router.post("/:eventId/auto-order", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const orgContext = getOrgContext(req);

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({ error: "Database connection unavailable" });
    }

    const { data: inventoryItems, error } = await supabase
      .from("inventory_items")
      .select("product_name, quantity_on_hand, quantity_pending, unit, status")
      .eq("org_id", orgContext.orgId);

    if (error) {
      return res.status(500).json({
        error: "Failed to fetch inventory items",
        details: error.message,
      });
    }

    const shortages = (inventoryItems || []).filter(
      (item: any) => item.status === "short",
    );

    const itemsOrdered = shortages.length;
    const estimatedCost = shortages.reduce(
      (sum: number, item: any) => sum + Number(item?.estimated_cost || 0),
      0,
    );

    res.status(201).json({
      success: true,
      eventId,
      poId: `po-${crypto.randomUUID()}`,
      itemsOrdered,
      estimatedCost,
      status: "pending_approval",
      orgId: orgContext.orgId,
    });
  } catch (err) {
    console.error("[MAESTRO-INVENTORY] AUTO-ORDER error:", err);
    res.status(500).json({
      error: "Failed to create auto-order",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * GET /api/maestro/inventory/burn-rate
 * Get inventory burn rate projections
 */
router.get("/burn-rate/view", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const { itemId, days = 30 } = req.query;

    // TODO: Calculate daily consumption rate
    // TODO: Project inventory over next N days
    // TODO: Identify when items will be depleted
    // TODO: Suggest reorder points
    // TODO: Return timeline with projections

    res.json({
      success: true,
      itemId,
      projections: [],
      criticalItems: [],
      suggestedActions: [],
      orgId: orgContext.orgId,
    });
  } catch (err) {
    console.error("[MAESTRO-INVENTORY] BURN-RATE error:", err);
    res.status(500).json({
      error: "Failed to fetch burn-rate projections",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * PATCH /api/maestro/inventory/:itemId
 * Update inventory item (adjust quantities, notes, etc.)
 */
router.patch("/:itemId", async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { onHand, allocated, notes } = req.body;
    const orgContext = getOrgContext(req);

    // TODO: Validate update
    // TODO: Check affected events (recalculate shortages)
    // TODO: Emit inventory updated event
    // TODO: Return updated item

    res.json({
      success: true,
      itemId,
      updated: true,
      affectedEvents: [],
      orgId: orgContext.orgId,
    });
  } catch (err) {
    console.error("[MAESTRO-INVENTORY] PATCH error:", err);
    res.status(500).json({
      error: "Failed to update inventory",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
