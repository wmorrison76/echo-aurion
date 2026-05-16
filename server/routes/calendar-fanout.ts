/**
 * Calendar Fan-out — HTTP surface (A7)
 *
 *   POST /api/calendar-fanout/sync/:lifecycleEventId
 *     Force a calendar resync for a single lifecycle event. Useful when
 *     the bus subscription missed a signal (process restart) or when
 *     the operator wants to verify a specific event is on the calendar.
 *     Auth required.
 *
 *   GET  /api/calendar-fanout/emissions
 *     Returns the last N emissions for the caller's org with their
 *     action (insert/update/noop/error) and fields changed. Operator
 *     visibility into whether the global calendar is converging on
 *     lifecycle truth.
 */

import express, { Request, Response } from "express";
import { logger } from "../lib/logger";
import { getOrgContext } from "../lib/org-context";
import { basicAuthMiddleware } from "../middleware/auth";
import {
  syncCalendarFromLifecycle,
  listRecentEmissions,
} from "../services/calendar-fanout-service";

const router = express.Router();

router.post("/sync/:lifecycleEventId", basicAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await syncCalendarFromLifecycle(req.params.lifecycleEventId, {
      trigger: "manual",
      fetch: true,
    });
    res.json({ success: true, result });
  } catch (err) {
    logger.error("[CalendarFanout] manual sync error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Sync failed",
    });
  }
});

router.get("/emissions", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const limit = Number(req.query.limit) || 50;
    const emissions = await listRecentEmissions(orgContext.orgId ?? null, limit);
    res.json({ success: true, emissions });
  } catch (err) {
    logger.error("[CalendarFanout] emissions error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to list emissions",
    });
  }
});

export { router as calendarFanoutRouter };
export default router;
