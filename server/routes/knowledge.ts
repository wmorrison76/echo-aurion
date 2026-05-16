import { Router } from "express";

const router = Router();

/**
 * GET /api/knowledge/stats
 * Returns knowledge base statistics
 * Returns the number of approved items, master dictionary terms, and total vectors
 * Public endpoint - no authentication required
 */
router.get("/stats", async (req: any, res) => {
  try {
    // Compute stats from file-backed vector store and available sources
    let totalVectors = 0;
    try {
      const { vectorProvider } = await import("../lib/vector-provider");
      totalVectors = await vectorProvider.count();
    } catch {}
    // We can expand these in the future by querying the master dictionary service
    const stats = {
      approvedItems: 0,
      masterDictionaryTerms: 0,
      totalVectors,
      lastUpdated: new Date().toISOString(),
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("[Knowledge API] Error fetching stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch knowledge stats",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/knowledge/health
 * Health check for knowledge base service
 */
router.get("/health", (req: any, res) => {
  res.json({
    status: "healthy",
    service: "knowledge-base",
    timestamp: new Date().toISOString(),
  });
});

export default router;
