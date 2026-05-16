/**
 * Production Sheets — HTTP surface (A5)
 *
 *   POST /api/production-sheets/generate
 *     Body: { beoId, allowSoftFail? }
 *     Manually generate (or regenerate) the active production sheet
 *     for a BEO. Auth required.
 *
 *   GET  /api/production-sheets/by-beo/:beoId
 *     Returns the current active sheet for a BEO, or 404.
 *
 *   POST /api/production-sheets/scheduler/tick
 *     Force a scheduler pass right now. Useful for demos and operator
 *     "nudge" actions. Auth required.
 *
 *   GET  /api/production-sheets/scheduler/recent
 *     Returns the last N scheduler runs (default 20) — when it ran,
 *     how many BEOs it examined, how many sheets it created, errors.
 */

import express, { Request, Response } from "express";
import { logger } from "../lib/logger";
import { basicAuthMiddleware } from "../middleware/auth";
import { StrictModeError } from "../lib/strict-mode";
import {
  generateProductionSheet,
  runProductionSheetTick,
  getActiveProductionSheet,
  listRecentSchedulerRuns,
} from "../services/production-sheet-service";

const router = express.Router();

router.post("/generate", basicAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { beoId, allowSoftFail } = req.body ?? {};
    if (!beoId) {
      return res.status(400).json({ success: false, error: "beoId is required" });
    }
    const userId = (req as any).user?.id;
    const result = await generateProductionSheet({
      beoId,
      trigger: "manual",
      generatedBy: userId ?? "manual",
      allowSoftFail: allowSoftFail === true ? true : undefined,
    });
    res.json({ success: true, result });
  } catch (err) {
    if (err instanceof StrictModeError) {
      return res.status(422).json({
        success: false,
        error: err.message,
        strictModeArea: err.area,
        details: err.details,
      });
    }
    logger.error("[ProductionSheets] generate error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to generate production sheet",
    });
  }
});

router.get("/by-beo/:beoId", async (req: Request, res: Response) => {
  try {
    const sheet = await getActiveProductionSheet(req.params.beoId);
    if (!sheet) {
      return res.status(404).json({ success: false, error: "No active sheet for this BEO" });
    }
    res.json({ success: true, sheet });
  } catch (err) {
    logger.error("[ProductionSheets] read error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to read sheet",
    });
  }
});

router.post("/scheduler/tick", basicAuthMiddleware, async (_req: Request, res: Response) => {
  try {
    const result = await runProductionSheetTick();
    res.json({ success: true, result });
  } catch (err) {
    logger.error("[ProductionSheets] manual tick error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Tick failed",
    });
  }
});

router.get("/scheduler/recent", async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const runs = await listRecentSchedulerRuns(limit);
    res.json({ success: true, runs });
  } catch (err) {
    logger.error("[ProductionSheets] recent runs error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to list runs",
    });
  }
});

export { router as productionSheetsRouter };
export default router;
