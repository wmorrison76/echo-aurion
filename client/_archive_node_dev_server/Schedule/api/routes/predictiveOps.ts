import { Router } from "express";
import {
  analyzeOperations,
  getRecentAnomalies,
  checkCriticalAlerts,
} from "../../services/predictiveOps";
import { authenticateUser } from "../../middleware/auth";
const router =
  Router(); /** * GET /api/predictive-ops * Get predictive operations insights for an organization * Query params: org_id (required) */
router.get("/", authenticateUser, async (req, res, next) => {
  try {
    const org_id = req.query.org_id as string;
    if (!org_id) {
      return res.status(400).json({ error: "org_id query parameter required" });
    }
    const insights = await analyzeOperations(org_id);
    res.json({ success: true, insights });
  } catch (error) {
    console.error("Error fetching predictive ops:", error);
    next(error);
  }
}); /** * GET /api/predictive-ops/recent * Get recent anomalies only * Query params: org_id (required), limit (optional, default 5) */
router.get("/recent", authenticateUser, async (req, res, next) => {
  try {
    const org_id = req.query.org_id as string;
    const limit = parseInt(req.query.limit as string) || 5;
    if (!org_id) {
      return res.status(400).json({ error: "org_id query parameter required" });
    }
    const anomalies = await getRecentAnomalies(org_id, limit);
    res.json({ success: true, anomalies });
  } catch (error) {
    console.error("Error fetching recent anomalies:", error);
    next(error);
  }
}); /** * GET /api/predictive-ops/critical-check * Check if there are critical alerts * Query params: org_id (required) */
router.get("/critical-check", authenticateUser, async (req, res, next) => {
  try {
    const org_id = req.query.org_id as string;
    if (!org_id) {
      return res.status(400).json({ error: "org_id query parameter required" });
    }
    const hasCritical = await checkCriticalAlerts(org_id);
    res.json({ success: true, hasCritical, alert: hasCritical });
  } catch (error) {
    console.error("Error checking critical alerts:", error);
    next(error);
  }
});
export default router;
