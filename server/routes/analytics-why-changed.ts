/**
 * Why Changed — delta explainer API
 * GET /api/analytics/why-changed?periodA=...&periodB=...
 * Compare two periods; attribute changes to trace-backed causes (price, yield, guarantee, waste).
 * Returns causal breakdown + confidence.
 */

import { Router, Request, Response } from "express";
import { getOrgContext } from "../lib/org-context";

const router = Router();

export interface WhyChangedBreakdownItem {
  cause: string;
  delta: number;
  confidence: number;
  traceIds: string[];
}

/**
 * GET /api/analytics/why-changed?periodA=YYYY-MM-DD&periodB=YYYY-MM-DD
 */
router.get("/why-changed", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const periodA = String(req.query.periodA || "").trim();
    const periodB = String(req.query.periodB || "").trim();
    if (!periodA || !periodB) {
      return res.status(400).json({ error: "periodA and periodB required (YYYY-MM-DD)", breakdown: [] });
    }
    // Stub: in production, compute deltas from ledger/P&L and attribute to causes with trace links
    const breakdown: WhyChangedBreakdownItem[] = [
      { cause: "price", delta: 0, confidence: 0.8, traceIds: [] },
      { cause: "yield", delta: 0, confidence: 0.7, traceIds: [] },
      { cause: "guarantee", delta: 0, confidence: 0.6, traceIds: [] },
      { cause: "waste", delta: 0, confidence: 0.75, traceIds: [] },
    ];
    res.json({ periodA, periodB, orgId: orgContext.orgId, breakdown });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message, breakdown: [] });
  }
});

export const analyticsWhyChangedRouter = router;
