import { Router, Request, Response } from "express";
import { advancedAnalyticsEngine } from "../lib/advanced-analytics-engine";
import { logger } from "../lib/logger";
const router = Router(); // Get dashboard metrics
router.get(
  "/dashboard/:organizationId",
  async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.params;
      const { outletId } = req.query;
      const metrics = await advancedAnalyticsEngine.getDashboardMetrics(
        organizationId,
        outletId as string,
      );
      logger.info("Dashboard metrics retrieved", { organizationId });
      res.json(metrics);
    } catch (error) {
      logger.error("Failed to get dashboard metrics", error);
      res.status(500).json({ error: "Failed to get dashboard metrics" });
    }
  },
); // Get trend data
router.get("/trends/:organizationId", async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { daysBack } = req.query;
    const trends = await advancedAnalyticsEngine.getTrendData(
      organizationId,
      parseInt(daysBack as string) || 30,
    );
    res.json(trends);
  } catch (error) {
    logger.error("Failed to get trend data", error);
    res.status(500).json({ error: "Failed to get trend data" });
  }
}); // Get vendor performance
router.get(
  "/vendor-performance/:organizationId",
  async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.params;
      const performance =
        await advancedAnalyticsEngine.getVendorPerformance(organizationId);
      res.json(performance);
    } catch (error) {
      logger.error("Failed to get vendor performance", error);
      res.status(500).json({ error: "Failed to get vendor performance" });
    }
  },
); // Get inventory analytics
router.get(
  "/inventory/:organizationId/:outletId",
  async (req: Request, res: Response) => {
    try {
      const { organizationId, outletId } = req.params;
      const analytics = await advancedAnalyticsEngine.getInventoryAnalytics(
        organizationId,
        outletId,
      );
      res.json(analytics);
    } catch (error) {
      logger.error("Failed to get inventory analytics", error);
      res.status(500).json({ error: "Failed to get inventory analytics" });
    }
  },
); // Get AP metrics
router.get(
  "/ap-metrics/:organizationId",
  async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.params;
      const metrics =
        await advancedAnalyticsEngine.getAPMetrics(organizationId);
      res.json(metrics);
    } catch (error) {
      logger.error("Failed to get AP metrics", error);
      res.status(500).json({ error: "Failed to get AP metrics" });
    }
  },
);
export const analyticsRouter = router;
