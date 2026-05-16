/**
 * API: Manual forecast refinement.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { getOrgId } from "../lib/org-resolver";
import { calculateRefinementAdjustments, applyRefinementToFutureDates } from "../services/forecast/refinement-engine";
import type { ForecastVariance } from "../services/forecast/comparison-engine";
import { createInMemoryAccuracyStore } from "../services/forecast/accuracy-tracking";
import type { AccuracyMetrics } from "../services/forecast/variance-analysis";

const router = Router();
router.use(requireAuth);

const BodySchema = z.object({
  outletId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealPeriod: z.string().optional(),
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const body = BodySchema.parse(req.body);
    const store = createInMemoryAccuracyStore();
    const dateRange = { start: body.date, end: body.date };
    const variances = await store.getVariances(orgId, body.outletId, dateRange);
    const metrics: AccuracyMetrics = { mape: 0, rmse: 0, bias: 0, sampleCount: 0 };
    const adjustments = variances.flatMap((v: ForecastVariance) =>
      calculateRefinementAdjustments(v, metrics),
    );
    const futureDates: string[] = [];
    await applyRefinementToFutureDates(adjustments, futureDates);
    return res.json({
      success: true,
      data: { adjustments, applied: true },
    });
  } catch (error: any) {
    res.status(error?.name === "ZodError" ? 400 : 500).json({
      success: false,
      error: error?.message ?? "Internal server error",
    });
  }
});

export default router;
