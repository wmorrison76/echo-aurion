/**
 * Staff Needs API — Decision makers and Schedule consume operational mapping.
 * GET /api/staff-needs/operational-mapping returns latest ONM (staff layers, pinch points).
 * POST /api/staff-needs/run-pipeline triggers the pipeline job (for cron or on-demand).
 */

import express, { Request, Response } from "express";
import { getLatestOperationalNeedsMapping } from "../services/staff-needs-pipeline/onm-store.js";
import { executeStaffNeedsPipelineJob } from "../jobs/staffNeedsPipelineJob.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

/**
 * GET /api/staff-needs/operational-mapping
 * Returns latest Operational Needs Mapping for decision makers and Schedule module.
 */
router.get("/operational-mapping", async (req: Request, res: Response) => {
  try {
    const onm = getLatestOperationalNeedsMapping();
    if (!onm) {
      return res.status(404).json({
        success: false,
        error:
          "No operational needs mapping available. Run staff-needs pipeline or pass smoke at max difficulty.",
      });
    }
    res.json({ success: true, data: onm });
  } catch (error: unknown) {
    logger.error("[Staff Needs] Operational mapping fetch error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch operational mapping",
    });
  }
});

/**
 * POST /api/staff-needs/run-pipeline
 * Runs the staff needs pipeline job (publish ONM to Stratus/Aurum, optional write to disk).
 * Call from a scheduler (e.g. daily) or on-demand.
 */
router.post("/run-pipeline", async (req: Request, res: Response) => {
  try {
    const { tenantId, periodDays, writeToDisk, pushToAurum } = req.body || {};
    await executeStaffNeedsPipelineJob({
      tenantId: tenantId ?? "default",
      periodDays: periodDays ?? 7,
      writeToDisk: writeToDisk !== false,
      pushToAurum: pushToAurum !== false,
    });
    res.json({ success: true, message: "Staff needs pipeline job completed" });
  } catch (error: unknown) {
    logger.error("[Staff Needs] Pipeline job error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Pipeline job failed",
    });
  }
});

export default router;
