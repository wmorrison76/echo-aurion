import { Router, Request, Response } from "express";
import { getHelpMissions } from "../../../../shared/echo/help/echo-help-core";
import {
  setDatabaseClient,
  fetchMissionsFromDb,
} from "../../../../shared/echo/help/missions-db";
import { getDatabaseClient } from "../../../lib/database-client";

const router = Router();

// Initialize database client for missions-db module
setDatabaseClient(getDatabaseClient());

router.get("/mission", async (req: Request, res: Response) => {
  try {
    const { module, role, route, userId } = req.query;

    let missions = [];

    // Try to fetch from database first (if migration has been applied)
    try {
      missions = await fetchMissionsFromDb(50);
    } catch (dbErr) {
      console.debug(
        "[EchoHelp] Database fetch failed (migration may not be applied):",
        dbErr,
      );
      missions = [];
    }

    // If database is empty or unavailable, fall back to Builder.io API
    if (missions.length === 0) {
      console.log("[EchoHelp] Fetching missions from Builder.io...");
      missions = await getHelpMissions({
        module: typeof module === "string" ? module : undefined,
        role: typeof role === "string" ? role : undefined,
        route: typeof route === "string" ? route : undefined,
        userId: typeof userId === "string" ? userId : undefined,
      });
    } else {
      // Filter by role if needed
      const roleToFilter = typeof role === "string" ? role : undefined;
      if (roleToFilter) {
        missions = missions.filter(
          (m) => !m.roles?.length || m.roles.includes(roleToFilter),
        );
      }
    }

    return res.status(200).json({ missions });
  } catch (err) {
    console.error("[EchoHelp] /help/mission error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
