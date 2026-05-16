/**
 * ===========================================================================
 * Resonance HTTP routes — TICKET_004 (Phase 1.4)
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  HTTP surface for the seven Phase 1 backend services. Every route
 *           validates input via Zod at the boundary, calls the appropriate
 *           service method, and returns canonical domain shapes.
 *
 *           The route layer is the validator. Services trust typed input and
 *           do their own DB-level safety checks. This separation matches the
 *           pass-staged answer: validation at the boundary, never in services.
 *
 * Endpoints:
 *   Reading lifecycle:
 *     POST /api/echo-resonance/readings
 *     GET  /api/echo-resonance/guests/:guestId/readings
 *
 *   Trajectory dashboard:
 *     GET  /api/echo-resonance/floor/:propertyId
 *     GET  /api/echo-resonance/visits/:visitId/trajectory
 *
 *   Intervention library:
 *     POST /api/echo-resonance/interventions/candidates
 *     POST /api/echo-resonance/interventions/proposals
 *     POST /api/echo-resonance/interventions/:executionId/approve
 *     POST /api/echo-resonance/interventions/:executionId/execute
 *     POST /api/echo-resonance/interventions/:executionId/skip
 *     POST /api/echo-resonance/interventions/:executionId/outcome
 *     GET  /api/echo-resonance/interventions/templates
 *
 * Auth: every route uses requireAuth (the existing LUCCCA convention).
 *       req.user is populated by the time route handlers run.
 *
 * Tenet enforcement at this layer:
 *   - Tenet 5 (privacy spine): server-only routes; no guest surface here.
 *     Guest-facing trust controls live in server/routes/trust.ts (Phase 3).
 *   - Tenet 8 (forbidden): outcomeScore range [0, 1] enforced by Zod;
 *     range overflow returns 400 before the service is touched.
 *
 * Error responses follow the LUCCCA convention:
 *   { success: false, error: "<short code>", message?: "<detail>" }
 *
 * Mounted in server/index.ts at "/api/echo-resonance".
 *
 * WARNING: This is the canonical Phase 1 route surface. The frontend
 * (WhisperWidget, TrajectoryDashboard, InterventionCard) hits these exact
 * paths with these exact shapes. Do NOT change paths without updating
 * client/lib/resonance/api.ts in lockstep.
 * ===========================================================================
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import {
  idempotencyCheckMiddleware,
  storeIdempotencyResult,
  type IdempotencyRequest,
} from '../middleware/idempotency-check';
import { logger } from '../lib/logger';
import { resonanceEngine } from '../services/echo-ai3/resonance/resonance-engine';
import { trajectoryEngine } from '../services/echo-ai3/resonance/trajectory-engine';
import { interventionLibrary } from '../services/echo-ai3/resonance/intervention-library';
import { cascadeBridge } from '../services/echo-ai3/resonance/cascade-bridge';
import { inc as metricsInc } from '../lib/echo-resonance-metrics';

// ---------------------------------------------------------------------------
// Zod schemas — boundary validation
// ---------------------------------------------------------------------------

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuid = z.string().regex(UUID_RE, 'must be a UUID');

const SignalTagSchema = z.object({
  kind: z.string().min(1).max(64),
  value: z.string().min(1).max(256),
});

const ReadingChannelSchema = z.enum([
  'observation',
  'voice',
  'inferred',
  'self-reported',
]);

const NewReadingSchema = z.object({
  guestId: uuid,
  visitId: uuid.nullable(),
  capturedBy: z.union([uuid, z.literal('aurion')]),
  channel: ReadingChannelSchema,
  arousal: z.number().min(-1).max(1),
  valence: z.number().min(-1).max(1),
  resonance: z.number().min(1).max(10),
  signals: z.array(SignalTagSchema).max(64),
  confidence: z.number().min(0).max(1),
  note: z.string().max(2000).optional(),
});

const FindCandidatesSchema = z.object({
  affect: z.object({
    arousal: z.number().min(-1).max(1),
    valence: z.number().min(-1).max(1),
  }),
  presentSignals: z.array(z.string().min(1).max(128)).max(64),
  guestId: uuid,
  visitId: uuid,
});

const ProposalSchema = z.object({
  templateId: uuid,
  guestId: uuid,
  visitId: uuid,
  proposedBy: z.enum(['echo-fast', 'echo-deep', 'staff']),
  cascadeId: uuid.nullable(),
  preReading: z.number().finite().optional(),
  notes: z.string().max(2000).optional(),
});

const ApprovalSchema = z.object({
  approvedBy: uuid,
});

const ExecutionSchema = z.object({
  preReading: z.number().finite().optional(),
});

const SkipSchema = z.object({
  notes: z.string().max(2000).optional(),
});

const OutcomeSchema = z.object({
  outcomeScore: z.number().min(0).max(1),
  postReading: z.number().finite(),
});

const LimitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function badRequest(res: Response, error: z.ZodError): Response {
  metricsInc('routes.client_error_total');
  return res.status(400).json({
    success: false,
    error: 'VALIDATION_FAILED',
    message: error.issues
      .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('; '),
  });
}

function serverError(res: Response, err: unknown, context: string): Response {
  metricsInc('routes.server_error_total');
  logger.error(`[resonance route] ${context}`, {
    error: err instanceof Error ? err.message : String(err),
  });
  return res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'An internal error occurred. The incident has been logged.',
  });
}

/**
 * State-guard errors from the intervention-library map to 409 Conflict —
 * the request was structurally valid, but the row is in a state that does
 * not permit the requested transition. Other errors propagate to 500.
 */
function transitionError(res: Response, err: unknown, context: string): Response {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('not in') || msg.includes('not found')) {
    metricsInc('routes.client_error_total');
    logger.warn(`[resonance route] ${context} — invalid transition`, { msg });
    return res.status(409).json({
      success: false,
      error: 'INVALID_TRANSITION',
      message: msg,
    });
  }
  return serverError(res, err, context);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();
router.use(requireAuth);

// ─── Reading lifecycle ────────────────────────────────────────────────────

/**
 * POST /api/echo-resonance/readings
 * Create a new resonance reading. The whisper widget posts here; voice layer
 * (Phase 3) will too. Transactionally writes the reading + signal +
 * trajectory update.
 *
 * Idempotency: Idempotency-Key header (or X-Idempotency-Key) is honored by
 * the middleware; without it, a key is generated from request shape. A
 * network-blip retry within 24h returns the original result instead of
 * creating a duplicate reading.
 */
router.post(
  '/readings',
  idempotencyCheckMiddleware,
  async (req: IdempotencyRequest, res: Response) => {
    const parsed = NewReadingSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error);

    try {
      const reading = await resonanceEngine.createReading(parsed.data);
      const body = { success: true, data: reading };
      await storeIdempotencyResult(req, body);
      metricsInc('readings.recorded');
      metricsInc('signals.recorded'); // every reading emits a signal too
      metricsInc('routes.success_total');
      return res.status(201).json(body);
    } catch (err) {
      return serverError(res, err, 'POST /readings');
    }
  },
);

/**
 * GET /api/echo-resonance/guests/:guestId/readings?limit=10
 * Recent readings for a guest. Filters expired rows server-side (Tenet 2 d-in-d).
 */
router.get('/guests/:guestId/readings', async (req: Request, res: Response) => {
  const idCheck = uuid.safeParse(req.params.guestId);
  if (!idCheck.success) return badRequest(res, idCheck.error);

  const queryCheck = LimitQuerySchema.safeParse(req.query);
  if (!queryCheck.success) return badRequest(res, queryCheck.error);

  try {
    const readings = await resonanceEngine.getRecentReadings(
      idCheck.data,
      queryCheck.data.limit ?? 10,
    );
    return res.json({ success: true, data: readings });
  } catch (err) {
    return serverError(res, err, 'GET /guests/:id/readings');
  }
});

// ─── Trajectory dashboard ─────────────────────────────────────────────────

/**
 * GET /api/echo-resonance/floor/:propertyId
 * The GM's floor view. One TrajectoryTile per active visit.
 */
router.get('/floor/:propertyId', async (req: Request, res: Response) => {
  const idCheck = uuid.safeParse(req.params.propertyId);
  if (!idCheck.success) return badRequest(res, idCheck.error);

  try {
    const tiles = await trajectoryEngine.getFloorView(idCheck.data);
    return res.json({ success: true, data: tiles });
  } catch (err) {
    return serverError(res, err, 'GET /floor/:propertyId');
  }
});

/**
 * GET /api/echo-resonance/visits/:visitId/trajectory
 * Single trajectory by visit. Returns 404 if no trajectory exists.
 */
router.get('/visits/:visitId/trajectory', async (req: Request, res: Response) => {
  const idCheck = uuid.safeParse(req.params.visitId);
  if (!idCheck.success) return badRequest(res, idCheck.error);

  try {
    const trajectory = await trajectoryEngine.getTrajectory(idCheck.data);
    if (trajectory === null) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `No trajectory exists for visit ${idCheck.data}`,
      });
    }
    return res.json({ success: true, data: trajectory });
  } catch (err) {
    return serverError(res, err, 'GET /visits/:id/trajectory');
  }
});

// ─── Intervention library ─────────────────────────────────────────────────

/**
 * POST /api/echo-resonance/interventions/candidates
 * Returns ranked intervention templates for the current affect + signals.
 * POST (not GET) because the body carries the affect coordinate and signal
 * list — too rich for query params, and the request is not cacheable.
 */
router.post('/interventions/candidates', async (req: Request, res: Response) => {
  const parsed = FindCandidatesSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);

  try {
    const candidates = await interventionLibrary.findCandidates(parsed.data);
    metricsInc('interventions.candidates_listed');
    metricsInc('routes.success_total');
    return res.json({ success: true, data: candidates });
  } catch (err) {
    return serverError(res, err, 'POST /interventions/candidates');
  }
});

/**
 * POST /api/echo-resonance/interventions/proposals
 * Record that an intervention was proposed. Status starts at 'proposed'.
 *
 * Idempotency: same pattern as POST /readings. A retry returns the same
 * proposed-row id rather than creating a second proposal for the same
 * (template, guest, visit) tuple within the 24h window.
 */
router.post(
  '/interventions/proposals',
  idempotencyCheckMiddleware,
  async (req: IdempotencyRequest, res: Response) => {
    const parsed = ProposalSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error);

    try {
      const execution = await interventionLibrary.recordProposal(parsed.data);
      const body = { success: true, data: execution };
      await storeIdempotencyResult(req, body);
      metricsInc('interventions.proposed');
      metricsInc('routes.success_total');
      return res.status(201).json(body);
    } catch (err) {
      return serverError(res, err, 'POST /interventions/proposals');
    }
  },
);

/**
 * POST /api/echo-resonance/interventions/:executionId/approve
 * Transition: proposed → approved.
 */
router.post('/interventions/:executionId/approve', async (req: Request, res: Response) => {
  const idCheck = uuid.safeParse(req.params.executionId);
  if (!idCheck.success) return badRequest(res, idCheck.error);

  const bodyCheck = ApprovalSchema.safeParse(req.body);
  if (!bodyCheck.success) return badRequest(res, bodyCheck.error);

  try {
    const execution = await interventionLibrary.recordApproval(
      idCheck.data,
      bodyCheck.data.approvedBy,
    );
    metricsInc('interventions.approved');
    metricsInc('routes.success_total');

    // Phase 1 cascade: log + metric. The cascade id is included in the
    // response so the intervention card can surface "cascade fired" UI.
    // Real LUCCCA cascader integration is the Phase 1.4+ extension point
    // documented in cascade-bridge.ts.
    const cascade = await cascadeBridge
      .triggerCascade(execution)
      .catch((cascadeErr) => {
        // Cascade failure is logged but does NOT roll back the approval —
        // the approval state transition is the system of record.
        logger.warn('[resonance route] cascade failed after approval', {
          executionId: execution.id,
          error: cascadeErr instanceof Error ? cascadeErr.message : String(cascadeErr),
        });
        return null;
      });

    return res.json({
      success: true,
      data: execution,
      cascade: cascade ?? undefined,
    });
  } catch (err) {
    return transitionError(res, err, 'POST /interventions/:id/approve');
  }
});

/**
 * POST /api/echo-resonance/interventions/:executionId/execute
 * Transition: approved → executed. Optionally records preReading.
 */
router.post('/interventions/:executionId/execute', async (req: Request, res: Response) => {
  const idCheck = uuid.safeParse(req.params.executionId);
  if (!idCheck.success) return badRequest(res, idCheck.error);

  const bodyCheck = ExecutionSchema.safeParse(req.body);
  if (!bodyCheck.success) return badRequest(res, bodyCheck.error);

  try {
    const execution = await interventionLibrary.recordExecution(
      idCheck.data,
      bodyCheck.data.preReading,
    );
    metricsInc('interventions.executed');
    metricsInc('routes.success_total');
    return res.json({ success: true, data: execution });
  } catch (err) {
    return transitionError(res, err, 'POST /interventions/:id/execute');
  }
});

/**
 * POST /api/echo-resonance/interventions/:executionId/skip
 * Transition: proposed | approved → skipped. successRate not updated.
 */
router.post('/interventions/:executionId/skip', async (req: Request, res: Response) => {
  const idCheck = uuid.safeParse(req.params.executionId);
  if (!idCheck.success) return badRequest(res, idCheck.error);

  const bodyCheck = SkipSchema.safeParse(req.body);
  if (!bodyCheck.success) return badRequest(res, bodyCheck.error);

  try {
    const execution = await interventionLibrary.recordSkip(
      idCheck.data,
      bodyCheck.data.notes,
    );
    metricsInc('interventions.skipped');
    metricsInc('routes.success_total');
    return res.json({ success: true, data: execution });
  } catch (err) {
    return transitionError(res, err, 'POST /interventions/:id/skip');
  }
});

/**
 * POST /api/echo-resonance/interventions/:executionId/outcome
 * Transition: executed → completed. Updates template successRate via running mean.
 */
router.post('/interventions/:executionId/outcome', async (req: Request, res: Response) => {
  const idCheck = uuid.safeParse(req.params.executionId);
  if (!idCheck.success) return badRequest(res, idCheck.error);

  const bodyCheck = OutcomeSchema.safeParse(req.body);
  if (!bodyCheck.success) return badRequest(res, bodyCheck.error);

  try {
    await interventionLibrary.recordOutcome(
      idCheck.data,
      bodyCheck.data.outcomeScore,
      bodyCheck.data.postReading,
    );
    metricsInc('interventions.completed');
    metricsInc('routes.success_total');
    return res.status(204).end();
  } catch (err) {
    return transitionError(res, err, 'POST /interventions/:id/outcome');
  }
});

/**
 * GET /api/echo-resonance/interventions/templates
 * Admin-style read of all templates, including inactive. Phase 1.5 admin UI.
 */
router.get('/interventions/templates', async (req: Request, res: Response) => {
  const queryCheck = LimitQuerySchema.safeParse(req.query);
  if (!queryCheck.success) return badRequest(res, queryCheck.error);

  try {
    const templates = await interventionLibrary.listTemplates(
      queryCheck.data.limit ?? 200,
    );
    return res.json({ success: true, data: templates });
  } catch (err) {
    return serverError(res, err, 'GET /interventions/templates');
  }
});

export default router;

/**
 * Legacy register-style export for backward compat with the old scaffold.
 * New code should `import resonanceRouter from '../routes/resonance'` and
 * `app.use('/api/echo-resonance', resonanceRouter)`.
 */
export function registerResonanceRoutes(app: { use: (path: string, router: typeof router) => void }): void {
  app.use('/api/echo-resonance', router);
}
