import { Router, RequestHandler } from "express";
import { getDatabasePool } from "../lib/database-pool";
import { getCache } from "../lib/cache-layer";
import { eventOrchestrationEngine } from "../services/event-orchestration-engine";
import { getActiveOutlets, getOutletActiveConnections } from "../websocket";

const router = Router();

const metricsHandler: RequestHandler = async (req: any, res) => {
  try {
    const dbPoolStats = getDatabasePool().getStats();
    const cacheStats = getCache().getStats();
    const queueStats = await eventOrchestrationEngine.getStats();

    const activeOutlets = getActiveOutlets();
    const totalConnections = activeOutlets.reduce(
      (sum, outletId) => sum + getOutletActiveConnections(outletId),
      0,
    );

    const wsStats = {
      active_connections: totalConnections,
      active_outlets: activeOutlets.length,
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: {
        database: dbPoolStats,
        cache: cacheStats,
        queue: queueStats,
        websocket: wsStats,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

router.get("/", metricsHandler);
router.post("/", metricsHandler);

export default router;
