/**
 * ===========================================================================
 * Signals HTTP routes — TICKET_004 (Phase 1.4)
 * ===========================================================================
 * Layer:    Substrate: Signal Graph
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Read-side query endpoints over the unified signal graph. Three
 *           filtered query methods covering the Phase 1.3 consumer needs.
 *
 *           Write side intentionally NOT exposed at this route layer:
 *           every signal-emitting flow (whisper → resonance reading,
 *           voice prosody → reading, integration webhooks) routes through
 *           the appropriate domain endpoint, which calls signalRecorder
 *           transactionally. Direct signal POSTs are an integration-layer
 *           concern and will be a separate route file when that layer
 *           lands. This keeps the Tenet 2/7 invariants enforced by the
 *           single canonical write path.
 *
 * Endpoints:
 *   GET /api/echo-resonance/signals/guest/:guestId
 *   GET /api/echo-resonance/signals/visit/:visitId
 *   GET /api/echo-resonance/signals/source/:source?since=<ISO>
 *
 * Auth: every route uses requireAuth.
 *
 * Tenet 7 / 8 enforcement: signal-query already filters expired rows in
 * its SQL (`expires_at >= NOW()`), so forbidden-sensitivity rows
 * (expired-on-creation per Tenet 8) NEVER appear in any of these
 * responses. The route layer does not need to re-filter.
 *
 * Mounted in server/index.ts at "/api/echo-resonance/signals".
 * ===========================================================================
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { logger } from '../lib/logger';
import { signalQuery } from '../services/signals/signal-query';
import type { SignalSource } from '../../shared/types/signals/signal';

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuid = z.string().regex(UUID_RE, 'must be a UUID');

// Signal source whitelist — exact union from shared/types/signals/signal.ts.
// Inline here as a Zod enum so a typo in the URL fails at the route boundary,
// not deeper in the SQL.
const SignalSourceSchema = z.enum([
  'staff-whisper',
  'aurion-voice-prosody',
  'aurion-voice-content',
  'aurion-voice-tone',
  'voyage-tap',
  'voyage-dwell',
  'voyage-dismiss',
  'voyage-edit',
  'voyage-search',
  'voyage-add-to-itinerary',
  'atrium-video-watched',
  'atrium-action-tap',
  'flight-tracker',
  'weather-api',
  'calendar-import',
  'pos-event',
  'pms-event',
]);

const LimitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

const SinceQuerySchema = z.object({
  since: z
    .string()
    .datetime({ offset: true })
    .or(z.string().datetime())
    .optional(),
});

function badRequest(res: Response, error: z.ZodError): Response {
  return res.status(400).json({
    success: false,
    error: 'VALIDATION_FAILED',
    message: error.issues
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; '),
  });
}

function serverError(res: Response, err: unknown, context: string): Response {
  logger.error(`[signals route] ${context}`, {
    error: err instanceof Error ? err.message : String(err),
  });
  return res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'An internal error occurred. The incident has been logged.',
  });
}

const router = Router();
router.use(requireAuth);

/**
 * GET /api/echo-resonance/signals/guest/:guestId?limit=50
 */
router.get('/guest/:guestId', async (req: Request, res: Response) => {
  const idCheck = uuid.safeParse(req.params.guestId);
  if (!idCheck.success) return badRequest(res, idCheck.error);

  const queryCheck = LimitQuerySchema.safeParse(req.query);
  if (!queryCheck.success) return badRequest(res, queryCheck.error);

  try {
    const signals = await signalQuery.getSignalsForGuest(
      idCheck.data,
      queryCheck.data.limit,
    );
    return res.json({ success: true, data: signals });
  } catch (err) {
    return serverError(res, err, 'GET /guest/:id');
  }
});

/**
 * GET /api/echo-resonance/signals/visit/:visitId
 */
router.get('/visit/:visitId', async (req: Request, res: Response) => {
  const idCheck = uuid.safeParse(req.params.visitId);
  if (!idCheck.success) return badRequest(res, idCheck.error);

  try {
    const signals = await signalQuery.getSignalsForVisit(idCheck.data);
    return res.json({ success: true, data: signals });
  } catch (err) {
    return serverError(res, err, 'GET /visit/:id');
  }
});

/**
 * GET /api/echo-resonance/signals/source/:source?since=<ISO>
 * `since` defaults to 24h ago when omitted.
 */
router.get('/source/:source', async (req: Request, res: Response) => {
  const sourceCheck = SignalSourceSchema.safeParse(req.params.source);
  if (!sourceCheck.success) return badRequest(res, sourceCheck.error);

  const queryCheck = SinceQuerySchema.safeParse(req.query);
  if (!queryCheck.success) return badRequest(res, queryCheck.error);

  const since =
    queryCheck.data.since ??
    new Date(Date.now() - 24 * 3_600_000).toISOString();

  try {
    const signals = await signalQuery.getSignalsBySource(
      sourceCheck.data as SignalSource,
      since,
    );
    return res.json({ success: true, data: signals });
  } catch (err) {
    return serverError(res, err, 'GET /source/:source');
  }
});

export default router;

/**
 * Legacy register-style export for backward compat with the old scaffold.
 */
export function registerSignalRoutes(app: { use: (path: string, router: typeof router) => void }): void {
  app.use('/api/echo-resonance/signals', router);
}
