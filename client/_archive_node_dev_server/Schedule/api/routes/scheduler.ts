/** * Scheduler endpoints (interval forecast, auto-generate, validate) */
import { Router } from "express";
import { buildIntervalForecast } from "../../services/intervalForecast";
import { generateSchedule } from "../../services/autoScheduler";
import { evaluateGuardrails } from "../../services/schedulerGuardrails";
const router =
  Router(); /** POST /api/scheduler/forecast-interval → Interval demand curve */
router.post("/forecast-interval", async (req, res) => {
  try {
    const p = req.body;
    const points = await buildIntervalForecast(p);
    res.json({ rows: points });
  } catch (err) {
    console.error("POST /forecast-interval error:", err);
    res.status(500).json({ error: String(err) });
  }
}); /** POST /api/scheduler/generate → Auto-generate schedule from demand + staff */
router.post("/generate", async (req, res) => {
  try {
    const result = generateSchedule(req.body);
    res.json(result);
  } catch (err) {
    console.error("POST /generate error:", err);
    res.status(500).json({ error: String(err) });
  }
}); /** POST /api/scheduler/guardrails → Evaluate a draft set of shifts */
router.post("/guardrails", async (req, res) => {
  try {
    const findings = evaluateGuardrails(req.body);
    res.json({ findings });
  } catch (err) {
    console.error("POST /guardrails error:", err);
    res.status(500).json({ error: String(err) });
  }
});
export default router;
