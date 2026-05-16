import { Router } from "express";
import { authenticateUser } from "../../middleware/auth";
import {
  detectLaborAnomalies,
  detectRevenueAnomalies,
  detectMaintenanceRisks,
  predictScheduleOptimization,
  getAnomalyTrend,
} from "../../services/advancedAnomalyDetection";
const router =
  Router(); /** * GET /api/advanced-ai/labor-anomalies * Detect labor cost anomalies * Query params: org_id, outlet_id, days (optional, default 30) */
router.get("/labor-anomalies", authenticateUser, async (req, res, next) => {
  try {
    const org_id = req.query.org_id as string;
    const outlet_id = req.query.outlet_id as string;
    const days = parseInt(req.query.days as string) || 30;
    if (!org_id || !outlet_id) {
      return res
        .status(400)
        .json({ error: "org_id and outlet_id query parameters are required" });
    }
    const anomalies = await detectLaborAnomalies(org_id, outlet_id, days);
    res.json({ success: true, count: anomalies.length, anomalies });
  } catch (error) {
    console.error("Error fetching labor anomalies:", error);
    next(error);
  }
}); /** * GET /api/advanced-ai/revenue-anomalies * Detect revenue anomalies * Query params: org_id, outlet_id, days (optional, default 30) */
router.get("/revenue-anomalies", authenticateUser, async (req, res, next) => {
  try {
    const org_id = req.query.org_id as string;
    const outlet_id = req.query.outlet_id as string;
    const days = parseInt(req.query.days as string) || 30;
    if (!org_id || !outlet_id) {
      return res
        .status(400)
        .json({ error: "org_id and outlet_id query parameters are required" });
    }
    const anomalies = await detectRevenueAnomalies(org_id, outlet_id, days);
    res.json({ success: true, count: anomalies.length, anomalies });
  } catch (error) {
    console.error("Error fetching revenue anomalies:", error);
    next(error);
  }
}); /** * GET /api/advanced-ai/maintenance-risks * Detect maintenance risks * Query params: org_id, days (optional, default 30) */
router.get("/maintenance-risks", authenticateUser, async (req, res, next) => {
  try {
    const org_id = req.query.org_id as string;
    const days = parseInt(req.query.days as string) || 30;
    if (!org_id) {
      return res
        .status(400)
        .json({ error: "org_id query parameter is required" });
    }
    const risks = await detectMaintenanceRisks(org_id, days);
    res.json({ success: true, count: risks.length, risks });
  } catch (error) {
    console.error("Error fetching maintenance risks:", error);
    next(error);
  }
}); /** * GET /api/advanced-ai/schedule-optimization * Get predicted schedule optimization recommendations * Query params: org_id, outlet_id, dept_id, days (optional, default 7) */
router.get(
  "/schedule-optimization",
  authenticateUser,
  async (req, res, next) => {
    try {
      const org_id = req.query.org_id as string;
      const outlet_id = req.query.outlet_id as string;
      const dept_id = req.query.dept_id as string;
      const days = parseInt(req.query.days as string) || 7;
      if (!org_id || !outlet_id || !dept_id) {
        return res.status(400).json({
          error: "org_id, outlet_id, and dept_id query parameters are required",
        });
      }
      const optimization = await predictScheduleOptimization(
        org_id,
        outlet_id,
        dept_id,
        days,
      );
      res.json({ success: true, optimization });
    } catch (error) {
      console.error("Error fetching schedule optimization:", error);
      next(error);
    }
  },
); /** * GET /api/advanced-ai/anomaly-trend * Get trend analysis for anomalies * Query params: org_id, outlet_id, type (labor|revenue|maintenance), days (optional) */
router.get("/anomaly-trend", authenticateUser, async (req, res, next) => {
  try {
    const org_id = req.query.org_id as string;
    const outlet_id = req.query.outlet_id as string;
    const type = (req.query.type as string) || "labor";
    const days = parseInt(req.query.days as string) || 30;
    if (!org_id || !outlet_id) {
      return res
        .status(400)
        .json({ error: "org_id and outlet_id query parameters are required" });
    }
    if (!["labor", "revenue", "maintenance"].includes(type)) {
      return res
        .status(400)
        .json({ error: "type must be one of: labor, revenue, maintenance" });
    }
    const trend = await getAnomalyTrend(
      org_id,
      outlet_id,
      type as "labor" | "revenue" | "maintenance",
      days,
    );
    res.json({ success: true, trend });
  } catch (error) {
    console.error("Error fetching anomaly trend:", error);
    next(error);
  }
});
export default router;
