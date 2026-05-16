import { Router, Request, Response } from "express";
import { syncMissionsWithBuilder } from "../../../../shared/echo/help/sync-missions";
import { setDatabaseClient } from "../../../../shared/echo/help/missions-db";
import { getDatabaseClient } from "../../../lib/database-client";

const router = Router();

// Initialize database client for missions-db module
setDatabaseClient(getDatabaseClient());

/**
 * POST /api/help/sync
 * Trigger immediate sync of missions and articles from Builder.io to database
 * Admin only or background task
 */
router.post("/sync", async (req: Request, res: Response) => {
  try {
    const result = await syncMissionsWithBuilder();

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Sync completed successfully",
        data: {
          missionsCount: result.missionsCount,
          articlesCount: result.articlesCount,
          timestamp: result.timestamp,
        },
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "Sync failed",
        timestamp: result.timestamp,
      });
    }
  } catch (err) {
    console.error("[EchoHelp] /help/sync error:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
