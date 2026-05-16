/**
 * API: Outlet-specific 5-day forecast.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { getOrgId } from "../lib/org-resolver";
import { createOutletForecastEngine } from "../services/forecast/outlet-forecast-engine";

const router = Router();
router.use(requireAuth);

const ParamsSchema = z.object({ outletId: z.string().uuid() });
const QuerySchema = z.object({ days: z.coerce.number().min(1).max(21).default(5) });

router.get("/:outletId", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { outletId } = ParamsSchema.parse(req.params);
    const { days } = QuerySchema.parse(req.query);
    const engine = await createOutletForecastEngine(orgId, outletId);
    const matrix = await engine.getSalesMatrix(days);
    return res.json({ success: true, data: matrix });
  } catch (error: any) {
    res.status(error?.name === "ZodError" ? 400 : 500).json({
      success: false,
      error: error?.message ?? "Internal server error",
    });
  }
});

export default router;
