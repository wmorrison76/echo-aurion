import { Router } from "express";
import { authenticateUser } from "../../middleware/auth";
import {
  checkPredictiveOpsHealth,
  checkDataPipelineHealth,
  checkAdvancedAIHealth,
  checkEchoHealth,
  runComprehensiveHealthCheck,
  getHealingHistory,
  getCurrentHealthStatus,
  applyHealingAction,
} from "../../services/autoHealingOrchestrator";
const router =
  Router(); /** * GET /api/auto-healing/health * Get current health status of all endpoints */
router.get("/health", authenticateUser, async (req, res, next) => {
  try {
    const status = getCurrentHealthStatus();
    res.json({ success: true, status });
  } catch (error) {
    console.error("Error fetching health status:", error);
    next(error);
  }
}); /** * GET /api/auto-healing/check-all * Run comprehensive health check * Query params: org_id, outlet_id */
router.get("/check-all", authenticateUser, async (req, res, next) => {
  try {
    const org_id = req.query.org_id as string;
    const outlet_id = req.query.outlet_id as string;
    if (!org_id || !outlet_id) {
      return res
        .status(400)
        .json({ error: "org_id and outlet_id query parameters are required" });
    }
    const result = await runComprehensiveHealthCheck(org_id, outlet_id);
    res.json({ success: true, result });
  } catch (error) {
    console.error("Error running health check:", error);
    next(error);
  }
}); /** * GET /api/auto-healing/check/predictiveops * Check health of predictiveOps endpoint * Query params: org_id */
router.get("/check/predictiveops", authenticateUser, async (req, res, next) => {
  try {
    const org_id = req.query.org_id as string;
    if (!org_id) {
      return res
        .status(400)
        .json({ error: "org_id query parameter is required" });
    }
    const check = await checkPredictiveOpsHealth(org_id);
    if (!check.healthy) {
      const action = await applyHealingAction("predictiveOps", check);
      return res.json({ success: true, check, healingAction: action });
    }
    res.json({ success: true, check });
  } catch (error) {
    console.error("Error checking predictiveOps health:", error);
    next(error);
  }
}); /** * GET /api/auto-healing/check/datapipeline * Check health of dataPipeline endpoint */
router.get("/check/datapipeline", authenticateUser, async (req, res, next) => {
  try {
    const check = await checkDataPipelineHealth();
    if (!check.healthy) {
      const action = await applyHealingAction("dataPipeline", check);
      return res.json({ success: true, check, healingAction: action });
    }
    res.json({ success: true, check });
  } catch (error) {
    console.error("Error checking dataPipeline health:", error);
    next(error);
  }
}); /** * GET /api/auto-healing/check/advancedai * Check health of advancedAI endpoint * Query params: org_id, outlet_id */
router.get("/check/advancedai", authenticateUser, async (req, res, next) => {
  try {
    const org_id = req.query.org_id as string;
    const outlet_id = req.query.outlet_id as string;
    if (!org_id || !outlet_id) {
      return res
        .status(400)
        .json({ error: "org_id and outlet_id query parameters are required" });
    }
    const check = await checkAdvancedAIHealth(org_id, outlet_id);
    if (!check.healthy) {
      const action = await applyHealingAction("advancedAI", check);
      return res.json({ success: true, check, healingAction: action });
    }
    res.json({ success: true, check });
  } catch (error) {
    console.error("Error checking advancedAI health:", error);
    next(error);
  }
}); /** * GET /api/auto-healing/check/echo * Check health of Echo endpoint */
router.get("/check/echo", authenticateUser, async (req, res, next) => {
  try {
    const check = await checkEchoHealth();
    if (!check.healthy) {
      const action = await applyHealingAction("echo", check);
      return res.json({ success: true, check, healingAction: action });
    }
    res.json({ success: true, check });
  } catch (error) {
    console.error("Error checking echo health:", error);
    next(error);
  }
}); /** * GET /api/auto-healing/history * Get healing action history * Query params: limit (optional, default 50) */
router.get("/history", authenticateUser, (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = getHealingHistory(limit);
    res.json({ success: true, count: history.length, history });
  } catch (error) {
    console.error("Error fetching healing history:", error);
    res.status(500).json({ error: "Failed to fetch healing history" });
  }
});
export default router;
