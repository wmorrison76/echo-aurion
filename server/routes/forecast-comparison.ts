/**
 * API: Forecast vs actual comparison.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { getOrgId } from "../lib/org-resolver";
import { calculateAccuracyMetrics, identifySystematicErrors } from "../services/forecast/variance-analysis";
import { createInMemoryAccuracyStore } from "../services/forecast/accuracy-tracking";

const router = Router();
router.use(requireAuth);

const QuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const accuracyStore = createInMemoryAccuracyStore();

// Helper function to handle comparison query
async function handleComparisonQuery(orgId: string, outletId: string | undefined, query: any, res: Response) {
  try {
    const parsed = QuerySchema.safeParse(query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: "start and end (YYYY-MM-DD) required" });
    }
    const { start, end } = parsed.data;
    const outId = outletId ?? undefined;
    const dateRange = { start, end };
    const variances = await accuracyStore.getVariances(orgId, outId ?? null, dateRange);
    const metrics = await accuracyStore.getAccuracyMetrics(orgId, outId ?? null, dateRange);
    const computed = calculateAccuracyMetrics(variances);
    const systematic = identifySystematicErrors(variances);
    return res.json({
      success: true,
      data: {
        variances,
        metrics: metrics ?? computed,
        systematicErrors: systematic,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message ?? "Internal server error",
    });
  }
}

// Route without outletId parameter
router.get("/", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const outletId = (req.query.outletId as string) || undefined;
  return handleComparisonQuery(orgId, outletId, req.query, res);
});

// Route with outletId parameter
router.get("/:outletId", async (req: Request, res: Response) => {
  const orgId = getOrgId(req);
  const outletId = req.params.outletId;
  return handleComparisonQuery(orgId, outletId, req.query, res);
});

export default router;
