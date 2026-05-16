/**
 * ===========================================================================
 * Echo Resonance health endpoint — operational visibility
 * ===========================================================================
 * Layer:    Resonance + Substrate (operational)
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  GET /api/echo-resonance/health returns a JSON snapshot:
 *
 *             {
 *               status: 'ok' | 'degraded',
 *               uptimeMs: number,
 *               startedAt: ISO8601,
 *               metrics: { ... see echo-resonance-metrics.ts ... }
 *             }
 *
 *           "degraded" surfaces when the server-side error rate over the
 *           process lifetime is high enough to flag (>= 5% server errors
 *           out of total responses). For Phase 1 demo, this is a coarse
 *           signal — real SLO calculation lands with prom-client / OTel.
 *
 *           Auth: NOT gated by requireAuth. Health probes (k8s readiness,
 *           load balancer checks, Sentry uptime) need to call this without
 *           a JWT. The response carries no sensitive data.
 *
 *           Mounted in server/index.ts at "/api/echo-resonance/health".
 *
 * WARNING: Do NOT add fields to the response that could leak PII or guest
 * data. The endpoint is unauthenticated; everything in the response is
 * effectively public.
 * ===========================================================================
 */

import { Router, type Request, type Response } from 'express';
import { snapshot } from '../lib/echo-resonance-metrics';

const DEGRADED_ERROR_RATE_THRESHOLD = 0.05; // 5%

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const snap = snapshot();
  const totalResponses =
    snap.routes.successTotal +
    snap.routes.clientErrorTotal +
    snap.routes.serverErrorTotal;
  const errorRate =
    totalResponses > 0 ? snap.routes.serverErrorTotal / totalResponses : 0;
  const status: 'ok' | 'degraded' =
    errorRate >= DEGRADED_ERROR_RATE_THRESHOLD ? 'degraded' : 'ok';

  res.json({
    status,
    startedAt: snap.startedAt,
    uptimeMs: snap.uptimeMs,
    errorRate,
    metrics: snap,
  });
});

export default router;
