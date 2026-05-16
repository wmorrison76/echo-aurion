/**
 * Finance GL mapping viewer API
 * GET /api/finance/gl-mapping-view?outletId=...
 * Recipe costs -> GL codes -> outlet P&L; budget vs actual; trace-backed deltas.
 */

import { Router, Request, Response } from "express";
import { getOrgContext } from "../lib/org-context";

const router = Router();

export interface GLDeltaItem {
  glCode: string;
  delta: number;
  traceId: string;
}

/**
 * GET /api/finance/gl-mapping-view?outletId=...
 */
router.get("/gl-mapping-view", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const outletId = String(req.query.outletId || "default").trim();
    // Stub: in production, query P&L/ledger for outlet and return trace-backed deltas
    const deltas: GLDeltaItem[] = [
      { glCode: "5000-COGS", delta: 0, traceId: `gl-${orgContext.orgId}-5000-${Date.now()}` },
      { glCode: "5100-Labor", delta: 0, traceId: `gl-${orgContext.orgId}-5100-${Date.now()}` },
    ];
    res.json({ outletId, orgId: orgContext.orgId, deltas });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message, deltas: [] });
  }
});

export const financeGLMappingRouter = router;
