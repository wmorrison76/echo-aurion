/**
 * Labor forecast API
 * GET /api/labor-forecast?date=... -> recommendations; GET /api/labor-forecast/overtime-sentinel -> risks.
 */

import { Router, Request, Response } from "express";
import { runLaborForecast } from "../services/laborForecast";
import { runOvertimeSentinel } from "../services/laborForecast/overtime-sentinel";
import { getOrgContext } from "../lib/org-context";
import { emitTrace } from "../lib/trace-emitter";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const result = await runLaborForecast(
      { orgId: orgContext.orgId, date },
      async (eventType, payload) => {
        const r = await emitTrace(req as any, "labor_forecast", payload.traceId ?? "labor", "labor-forecast", "labor", payload, {}, { traceId: payload.traceId });
        return r?.traceId ?? null;
      }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get("/overtime-sentinel", async (req: Request, res: Response) => {
  try {
    const risks = await runOvertimeSentinel([], async (eventType, payload) => {
      const r = await emitTrace(req as any, "overtime_sentinel", payload.traceId ?? "ot", "labor-forecast", "overtime", payload, {}, { traceId: payload.traceId });
      return r?.traceId ?? null;
    });
    res.json({ risks });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export const laborForecastRouter = router;
