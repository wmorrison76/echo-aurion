/** * Auto-Repair API Route * GET /api/auto-repair - Get repair suggestions */ import { Router } from "express";
import { z } from "zod";
import { autoRepairAnalyze, suggestFix } from "../../services/autoRepair";
import { requireRole } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validate";
const router =
  Router(); /** * GET /api/auto-repair * Analyze logs and return repair suggestions */
router.get("/", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const suggestions = await autoRepairAnalyze();
    res.json({
      timestamp: new Date().toISOString(),
      suggestions,
      count: suggestions.length,
    });
  } catch (err) {
    next(err);
  }
}); /** * POST /api/auto-repair/suggest * Get fix suggestion for specific error */
router.post(
  "/suggest",
  requireRole("ADMIN"),
  validateQuery(z.object({ error: z.string() })),
  async (req, res, next) => {
    try {
      const { error } = req.query as any;
      const suggestion = await suggestFix(error);
      res.json({ error, suggestion });
    } catch (err) {
      next(err);
    }
  },
);
export default router;
