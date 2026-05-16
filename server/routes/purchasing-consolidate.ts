/**
 * Multi-BEO Consolidated Purchasing — HTTP surface (A4 + A4.5)
 *
 *   POST /api/purchasing/consolidate
 *     Body: {
 *       lookaheadDays?: number,         // default 14
 *       includeStatuses?: string[],     // default ["approved","active"]
 *       dryRun?: boolean,               // default false
 *       trigger?: "manual"|"scheduled"|"beo_approved",
 *       idempotencyKey?: string         // recommended for UI buttons
 *     }
 *     Returns: ConsolidationResult — the plan plus poIds/posCreated and
 *     a runStatus of completed | partial | failed | dry_run.
 *
 *   POST /api/purchasing/consolidate/preview
 *     Always dryRun=true. Returns the plan only; no POs are created.
 *
 *   POST /api/purchasing/consolidate/:id/resume
 *     Re-tries the unfinished work for a partial/failed run. Idempotent:
 *     a unique index on (consolidation_id, supplier_name, product_name)
 *     prevents duplicate POs from a re-attempt that races with a slow
 *     earlier insert.
 *
 *   GET  /api/purchasing/consolidate/recent
 *     Returns the last N runs (default 20) for the caller's org.
 *
 *   GET  /api/purchasing/consolidate/stuck
 *     Returns runs whose process likely died (run_status='running' AND
 *     last_heartbeat_at older than 10 minutes). Operator visibility.
 *
 * All mutating endpoints require auth via basicAuthMiddleware (the
 * platform's standard pattern); read endpoints accept the optional
 * auth path so dashboards without an active session can still poll.
 */

import express, { Request, Response } from "express";
import { getOrgContext } from "../lib/org-context";
import { supabase } from "../lib/supabase";
import { logger } from "../lib/logger";
import { basicAuthMiddleware } from "../middleware/auth";
import {
  consolidatePurchasing,
  buildConsolidationPlan,
  resumeConsolidation,
  listStuckConsolidations,
} from "../services/purchase-consolidation-service";

const router = express.Router();

router.post("/consolidate", basicAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const userId = (req as any).user?.id;
    const { lookaheadDays, includeStatuses, dryRun, trigger, idempotencyKey } = req.body ?? {};

    const result = await consolidatePurchasing({
      orgId: orgContext.orgId,
      lookaheadDays: typeof lookaheadDays === "number" ? lookaheadDays : undefined,
      includeStatuses: Array.isArray(includeStatuses) ? includeStatuses : undefined,
      dryRun: dryRun === true,
      trigger:
        trigger === "scheduled" || trigger === "beo_approved" ? trigger : "manual",
      runBy: userId,
      idempotencyKey: typeof idempotencyKey === "string" && idempotencyKey.length > 0 ? idempotencyKey : undefined,
    });
    res.json({ success: true, result });
  } catch (err) {
    logger.error("[PurchasingConsolidate] error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Consolidation failed",
    });
  }
});

router.post("/consolidate/preview", basicAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const { lookaheadDays, includeStatuses } = req.body ?? {};
    const plan = await buildConsolidationPlan({
      orgId: orgContext.orgId,
      lookaheadDays: typeof lookaheadDays === "number" ? lookaheadDays : undefined,
      includeStatuses: Array.isArray(includeStatuses) ? includeStatuses : undefined,
      dryRun: true,
      trigger: "manual",
    });
    res.json({ success: true, plan });
  } catch (err) {
    logger.error("[PurchasingConsolidate] preview error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Preview failed",
    });
  }
});

router.post("/consolidate/:id/resume", basicAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const result = await resumeConsolidation(req.params.id, { runBy: userId });
    res.json({ success: true, result });
  } catch (err) {
    logger.error("[PurchasingConsolidate] resume error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Resume failed",
    });
  }
});

router.get("/consolidate/recent", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const { data, error } = await supabase
      .from("purchase_consolidations")
      .select("*")
      .eq("org_id", orgContext.orgId)
      .order("run_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message ?? String(error));
    res.json({ success: true, runs: data ?? [] });
  } catch (err) {
    logger.error("[PurchasingConsolidate] recent error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Recent fetch failed",
    });
  }
});

router.get("/consolidate/stuck", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const runs = await listStuckConsolidations(orgContext.orgId);
    res.json({ success: true, runs });
  } catch (err) {
    logger.error("[PurchasingConsolidate] stuck error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Stuck fetch failed",
    });
  }
});

export { router as purchasingConsolidateRouter };
export default router;
