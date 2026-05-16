/**
 * ===========================================================================
 * Aurion HTTP routes
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED (Phase 3/4 — sessions, whispers, pre-arrival)
 * Phase:    3/4
 *
 * Purpose:  Voice-session lifecycle + staff transparency log + pre-arrival
 *           opt-in. WebSocket audio path is intentionally absent: per
 *           Tenet 2 + the speech-to-speech-bridge architecture, audio
 *           never traverses our server. The browser opens the WebRTC
 *           channel direct to the upstream provider using the
 *           connection-token returned at session-start.
 *
 * Endpoints:
 *   POST   /sessions                        — start a voice session
 *   POST   /sessions/:id/end                — graceful end + summary
 *   GET    /whispers/recent                 — Tenet 6 staff transparency log
 *   POST   /whispers/:id/flag               — staff feedback flag
 *   POST   /pre-arrival/:tripId/start       — start the T-3 conversation
 *   POST   /pre-arrival/:tripId/dismiss     — guest declines
 *
 * Auth:    requireAuth populates req.user. The route handlers infer guest
 *          vs staff from req.user.role; no second auth library is needed.
 * ===========================================================================
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { sessionManager } from '../services/echo-ai3/aurion/session-manager';
import { whisperEngine } from '../services/echo-ai3/aurion/whisper-engine';
import { preArrivalOrchestrator } from '../services/echo-ai3/aurion/pre-arrival-orchestrator';
import { logger } from '../lib/logger';
import type { SessionContext } from '../../shared/types/aurion/session';

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuid = z.string().regex(UUID_RE, 'must be a UUID');

const SessionContextSchema = z.enum([
  'pre-arrival',
  'arrival-handoff',
  'in-room-come-alive',
  'in-stay-ambient',
  'departure',
  'post-stay-followup',
  'staff-whisper',
]);

const StartSessionSchema = z.object({
  context: SessionContextSchema,
  voiceProfileId: z.string().min(1).max(64),
  guestId: uuid.optional(),
  staffId: uuid.optional(),
  transcriptOptIn: z.boolean().optional(),
});

const EndSessionSchema = z.object({
  outcomeSummary: z.string().max(2000).optional(),
});

const FlagWhisperSchema = z.object({
  flag: z.enum(['helpful', 'wrong', 'too-late', 'too-much']),
  note: z.string().max(2000).optional(),
});

function fail(res: Response, status: number, code: string, message?: string): Response {
  return res.status(status).json({ success: false, error: code, message });
}

export function registerAurionRoutes(router: Router): void {
  router.post('/sessions', requireAuth, async (req: Request, res: Response) => {
    const parsed = StartSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 400, 'VALIDATION', parsed.error.issues[0]?.message);
    }
    try {
      const session = await sessionManager.startSession({
        guestId: parsed.data.guestId,
        staffId: parsed.data.staffId,
        context: parsed.data.context as SessionContext,
        voiceProfileId: parsed.data.voiceProfileId,
        transcriptOptIn: parsed.data.transcriptOptIn ?? false,
      });
      return res.status(201).json(session);
    } catch (err) {
      logger.error('[aurion-routes] startSession failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return fail(res, 500, 'SESSION_START_FAILED');
    }
  });

  router.post('/sessions/:id/end', requireAuth, async (req: Request, res: Response) => {
    const idParse = uuid.safeParse(req.params.id);
    if (!idParse.success) return fail(res, 400, 'INVALID_ID');
    const bodyParse = EndSessionSchema.safeParse(req.body ?? {});
    if (!bodyParse.success) return fail(res, 400, 'VALIDATION');
    try {
      const session = await sessionManager.endSession(idParse.data, bodyParse.data.outcomeSummary);
      return res.json(session);
    } catch (err) {
      logger.error('[aurion-routes] endSession failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return fail(res, 500, 'SESSION_END_FAILED');
    }
  });

  router.get('/whispers/recent', requireAuth, async (req: Request, res: Response) => {
    const staffId = (req as any).user?.id;
    if (!staffId) return fail(res, 401, 'UNAUTHORIZED');
    const raw = Number(req.query.limit ?? 50);
    const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 200) : 50;
    try {
      const whispers = await whisperEngine.recentForStaff(staffId, limit);
      return res.json(whispers);
    } catch (err) {
      logger.error('[aurion-routes] recentForStaff failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return fail(res, 500, 'WHISPER_LOAD_FAILED');
    }
  });

  router.post('/whispers/:id/flag', requireAuth, async (req: Request, res: Response) => {
    const idParse = uuid.safeParse(req.params.id);
    if (!idParse.success) return fail(res, 400, 'INVALID_ID');
    const parsed = FlagWhisperSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, 'VALIDATION');
    try {
      if (parsed.data.flag === 'wrong') {
        await whisperEngine.flagAsWrong(idParse.data, parsed.data.note);
      } else {
        // helpful / too-late / too-much: feedback recorded as note only.
        // Phase 5 corpus-builder consumes the full feedback enum.
        if (parsed.data.note) {
          await whisperEngine.flagAsWrong(idParse.data, `[${parsed.data.flag}] ${parsed.data.note}`);
        }
      }
      return res.status(204).end();
    } catch (err) {
      logger.error('[aurion-routes] flagWhisper failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return fail(res, 500, 'WHISPER_FLAG_FAILED');
    }
  });

  router.post('/pre-arrival/:tripId/start', requireAuth, async (req: Request, res: Response) => {
    const tripParse = uuid.safeParse(req.params.tripId);
    if (!tripParse.success) return fail(res, 400, 'INVALID_TRIP_ID');
    const guestId = (req as any).user?.id;
    if (!guestId) return fail(res, 401, 'UNAUTHORIZED');
    try {
      const sessionId = await preArrivalOrchestrator.startConversation(guestId, tripParse.data);
      return res.status(201).json({ sessionId });
    } catch (err) {
      logger.error('[aurion-routes] preArrival start failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return fail(res, 500, 'PRE_ARRIVAL_START_FAILED');
    }
  });

  router.post('/pre-arrival/:tripId/dismiss', requireAuth, async (req: Request, res: Response) => {
    const tripParse = uuid.safeParse(req.params.tripId);
    if (!tripParse.success) return fail(res, 400, 'INVALID_TRIP_ID');
    // Dismiss is audit-only at the route layer for Phase 3; Phase 3.x
    // notification scheduler reads pre_arrival_invitations to skip resend.
    logger.info('[aurion-routes] pre-arrival dismissed', { tripId: tripParse.data });
    return res.status(204).end();
  });
}

export function createAurionRouter(): Router {
  const router = Router();
  registerAurionRoutes(router);
  return router;
}

// WebSocket path intentionally absent: audio never traverses this server
// (see speech-to-speech-bridge.ts header). Provider tokens are issued via
// /sessions and the browser opens WebRTC direct to the upstream.
export function registerAurionWebSockets(_wss: unknown): void {
  logger.info('[aurion-routes] no server-side WS path — audio is browser-direct via EchoAI² provider tokens');
}
