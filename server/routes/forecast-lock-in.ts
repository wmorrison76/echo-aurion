/**
 * API: Forecast lock-in management.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { getOrgId } from "../lib/org-resolver";
import { lockInForecast } from "../services/forecast/lock-in-engine";
import type { ForecastDataPoint } from "../../../shared/types/forecast-sources";

const router = Router();
router.use(requireAuth);

const BodySchema = z.object({
  outletId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  forecast: z.array(
    z.object({
      date: z.string(),
      outletId: z.string().nullable(),
      mealPeriod: z.string(),
      guestCount: z.number(),
      revenue: z.number().optional(),
      source: z.string(),
      confidence: z.number(),
    }),
  ),
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const body = BodySchema.parse(req.body);
    const forecast = body.forecast as ForecastDataPoint[];
    const locked = await lockInForecast(orgId, body.outletId, body.date, forecast);
    return res.json({
      success: true,
      data: { locked, count: locked.length },
    });
  } catch (error: any) {
    res.status(error?.name === "ZodError" ? 400 : 500).json({
      success: false,
      error: error?.message ?? "Internal server error",
    });
  }
});

export default router;
