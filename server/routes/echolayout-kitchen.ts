/**
 * EchoLayout Kitchen-Design Routes (D5)
 *
 *   GET  /api/echolayout/kitchen/equipment-library
 *     Returns the seeded equipment catalog (kitchen_equipment_catalog).
 *     Optional filters: ?category=cooking&station=hot_line
 *
 *   POST /api/echolayout/kitchen/design
 *     Body: { workflow, room, equipment, constraints? }
 *     Runs the deterministic kitchen-design algorithm and returns the
 *     placement + thermal zones + utility runs + compliance findings.
 *     Doesn't persist — caller decides whether to save.
 *
 *   POST /api/echolayout/kitchen/designs
 *     Body: { ...design output, name, beoId?, outletId, generatedBy? }
 *     Persists a design into layout_designs with design_type='kitchen'.
 *
 *   GET  /api/echolayout/kitchen/designs/:id
 *     Returns a saved kitchen design by id.
 *
 * Auth: basicAuthMiddleware on mutating endpoints. Catalog read is open
 * (chefs browsing equipment).
 */

import express, { Request, Response } from "express";
import { logger } from "../lib/logger";
import { supabase } from "../lib/supabase";
import { basicAuthMiddleware } from "../middleware/auth";
import {
  designKitchen,
  type KitchenDesignInput,
  type KitchenEquipment,
} from "../services/echo-layout/kitchen-algorithm";

const router = express.Router();

router.get("/kitchen/equipment-library", async (req: Request, res: Response) => {
  try {
    let q = supabase.from("kitchen_equipment_catalog").select("*");
    if (req.query.category) q = q.eq("category", req.query.category as string);
    if (req.query.station) q = q.eq("station", req.query.station as string);
    const { data, error } = await q.order("category", { ascending: true });
    if (error) {
      logger.error("[EchoLayoutKitchen] catalog fetch failed", { error: error.message });
      return res.status(500).json({ error: error.message });
    }
    res.json({
      success: true,
      items: data ?? [],
      count: (data ?? []).length,
    });
  } catch (err) {
    logger.error("[EchoLayoutKitchen] catalog error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Catalog read failed" });
  }
});

router.post("/kitchen/design", basicAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const input = req.body as KitchenDesignInput;
    if (!input?.workflow || !input?.room || !Array.isArray(input?.equipment)) {
      return res.status(400).json({
        error: "workflow, room, and equipment[] are required",
      });
    }
    const design = designKitchen(input);
    res.json({ success: true, design });
  } catch (err) {
    logger.error("[EchoLayoutKitchen] design error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Design failed",
    });
  }
});

router.post("/kitchen/designs", basicAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const {
      name,
      beoId,
      outletId,
      orgId,
      lifecycleEventId,
      generatedBy,
      workflow,
      room,
      equipment,
      placements,
      thermal_zones,
      utility_runs,
      compliance,
      totals,
    } = req.body ?? {};

    if (!outletId) {
      return res.status(400).json({ error: "outletId required" });
    }

    // Persist into layout_designs with design_type='kitchen'. Re-uses the
    // existing layout_designs table (extended in migration 079) so the
    // human-approval flow (approve/reject/edited) works the same as
    // event-room designs.
    const { data, error } = await supabase
      .from("layout_designs")
      .insert({
        org_id: orgId ?? null,
        beo_id: beoId ?? null,
        lifecycle_event_id: lifecycleEventId ?? null,
        room_id: null,
        style: "custom",
        design_type: "kitchen",
        status: "pending_approval",
        guest_count: 0,
        room_spec: room ?? {},
        constraints: {},
        tables: [],
        fixtures: [],
        aisles: [],
        equipment: placements ?? equipment ?? [],
        utility_zones: utility_runs ?? [],
        thermal_zones: thermal_zones ?? [],
        compliance: {
          findings: compliance ?? [],
          totals: totals ?? {},
          workflow,
        },
        totals: totals ?? {},
        generated_by: generatedBy ?? userId ?? "manual",
        notes: name ?? null,
      })
      .select("id");

    if (error) {
      logger.error("[EchoLayoutKitchen] save failed", { error: error.message });
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, designId: data?.[0]?.id });
  } catch (err) {
    logger.error("[EchoLayoutKitchen] save error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Save failed" });
  }
});

router.get("/kitchen/designs/:id", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("layout_designs")
      .select("*")
      .eq("id", req.params.id)
      .eq("design_type", "kitchen")
      .limit(1);
    if (error || !Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ error: "Design not found" });
    }
    res.json({ success: true, design: data[0] });
  } catch (err) {
    logger.error("[EchoLayoutKitchen] read error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Read failed" });
  }
});

export { router as echolayoutKitchenRouter };
export default router;
