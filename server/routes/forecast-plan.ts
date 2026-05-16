import express from "express";
import { z } from "zod";
import { loadForecastPlan, saveForecastPlan } from "../services/forecast-plan-service";
import { getOrgContext } from "../lib/org-resolver";

const router = express.Router();

const forecastDaySchema = z.object({
  date: z.string().min(1),
  forecast: z.number(),
  override: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const forecastPlanSchema = z.object({
  orgId: z.string().min(1),
  startDate: z.string().min(1),
  days: z.array(forecastDaySchema),
  updatedAt: z.string().optional(),
});

router.get("/forecast-plan", async (req, res) => {
  const orgId = (req.query.orgId as string) || "demo-org";
  try {
    const plan = await loadForecastPlan(orgId);
    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

router.put("/forecast-plan", async (req, res) => {
  try {
    const payload = forecastPlanSchema.parse(req.body);
    const orgContext = getOrgContext(req);
    const result = await saveForecastPlan(payload.orgId, payload, {
      userId: orgContext.userId,
      role: orgContext.userRole,
      system: "forecast-hub",
    });
    res.json({ success: true, plan: result.plan, traceId: result.traceId, deltas: result.deltas });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save plan";
    res.status(400).json({ success: false, error: message });
  }
});

export default router;
