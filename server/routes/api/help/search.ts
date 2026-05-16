import { Router, Request, Response } from "express";
import { searchHelpArticles } from "../../../../shared/echo/help/echo-help-core";
import {
  setDatabaseClient,
  fetchArticlesFromDb,
} from "../../../../shared/echo/help/missions-db";
import { getDatabaseClient } from "../../../lib/database-client";

const router = Router();

// Initialize database client for missions-db module
setDatabaseClient(getDatabaseClient());

router.get("/search", async (req: Request, res: Response) => {
  try {
    const { q, module, role, route, userId } = req.query;

    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Missing 'q' query parameter" });
    }

    let articles = [];

    // Try to fetch from database first (if migration has been applied)
    try {
      articles = await fetchArticlesFromDb(20);
    } catch (dbErr) {
      console.debug(
        "[EchoHelp] Database fetch failed (migration may not be applied):",
        dbErr,
      );
      articles = [];
    }

    // Filter by module and role
    let filtered = articles;
    if (module && typeof module === "string") {
      filtered = filtered.filter((a) => a.module === module);
    }
    if (role && typeof role === "string") {
      filtered = filtered.filter(
        (a) => !a.audienceRoles?.length || a.audienceRoles.includes(role),
      );
    }

    // If database is empty or has no results, fall back to Builder.io
    if (filtered.length === 0) {
      console.log("[EchoHelp] Fetching articles from Builder.io...");
      const results = await searchHelpArticles({
        query: q,
        module: typeof module === "string" ? module : undefined,
        role: typeof role === "string" ? role : undefined,
        route: typeof route === "string" ? route : undefined,
        userId: typeof userId === "string" ? userId : undefined,
        limit: 20,
      });
      return res.status(200).json(results);
    }

    // Return database results
    const results = {
      articles: filtered.slice(0, 20),
      total: filtered.length,
    };

    return res.status(200).json(results);
  } catch (err) {
    console.error("[EchoHelp] /help/search error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
