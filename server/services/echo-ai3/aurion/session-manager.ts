/**
 * ===========================================================================
 * Voice session manager — lifecycle for guest-Aurion conversations
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED
 * Phase:    3
 *
 * Purpose:  CRUD + state machine for voice_sessions per master doc §5.
 *           Transcript opt-in only; expires 24h after creation per Tenet 2.
 *
 * State machine (forward-only):
 *   initiating → connecting → active → completed
 *                                  ↘ paused → active (resume) | completed
 *                                  ↘ failed
 *
 * Tenet 2: transcript_expires_at = startedAt + 24h on creation. The
 * audio-decay cron (Phase 3 extension) sweeps expired transcripts.
 *
 * Tenet 5: pauseForGuest sets state='paused' on every active session
 * for the guest. Resume requires a fresh session start (paused is
 * effectively terminal for that conversation).
 * ===========================================================================
 */

import type {
  VoiceSession,
  SessionContext,
  SessionState,
  ProsodyReading,
} from '../../../../shared/types/aurion';
import type { UUID, GuestId, StaffId } from '../../../../shared/types/base';
import { query, transaction } from '../../../database/connection';
import { logger } from '../../../lib/logger';

export interface StartSessionArgs {
  guestId?: GuestId;
  staffId?: StaffId;
  context: SessionContext;
  voiceProfileId: string;
  /** Default false. When true, transcript persists for 24h per Tenet 2. */
  transcriptOptIn?: boolean;
}

interface SessionRow {
  id: string;
  guest_id: string | null;
  staff_id: string | null;
  context: string;
  state: string;
  started_at: Date | string;
  ended_at: Date | string | null;
  duration_seconds: number | null;
  voice_profile: string;
  outcome_summary: string | null;
  transcript: string | null;
  transcript_expires_at: Date | string | null;
}

const ALLOWED_TRANSITIONS: Record<SessionState, SessionState[]> = {
  initiating: ['connecting', 'failed'],
  connecting: ['active', 'failed'],
  active: ['paused', 'completed', 'failed'],
  paused: ['completed'],
  completed: [],
  failed: [],
};

const TRANSCRIPT_TTL_MS = 24 * 3_600_000;

function dateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  throw new Error(`session-manager: unexpected date value: ${typeof value}`);
}

function maybeIso(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  return dateToIso(value);
}

function rowToSession(row: SessionRow, prosody: ProsodyReading[] = []): VoiceSession {
  return {
    id: row.id,
    guestId: row.guest_id ?? undefined,
    staffId: row.staff_id ?? undefined,
    context: row.context as SessionContext,
    state: row.state as SessionState,
    startedAt: dateToIso(row.started_at),
    endedAt: maybeIso(row.ended_at),
    durationSeconds: row.duration_seconds ?? undefined,
    voiceProfile: row.voice_profile,
    prosodyReadings: prosody,
    transcript: row.transcript ?? undefined,
    transcriptExpiresAt: maybeIso(row.transcript_expires_at),
    outcomeSummary: row.outcome_summary ?? undefined,
  };
}

export class SessionManager {
  /**
   * Start a new voice session. Idempotent on (guestId, context) for
   * already-active sessions: returns the existing session if one exists
   * for the same guest in the same context.
   */
  async startSession(args: StartSessionArgs): Promise<VoiceSession> {
    if (!args.guestId && !args.staffId) {
      throw new Error('session-manager: startSession requires guestId or staffId');
    }
    try {
      // Check for an existing active session
      if (args.guestId) {
        const existing = await query<SessionRow>(
          `SELECT * FROM voice_sessions
           WHERE guest_id = $1 AND context = $2 AND state IN ('initiating','connecting','active')
           LIMIT 1`,
          [args.guestId, args.context],
        );
        if (existing.rows.length > 0) {
          return rowToSession(existing.rows[0]);
        }
      }

      const transcriptExpiresAt = args.transcriptOptIn
        ? new Date(Date.now() + TRANSCRIPT_TTL_MS).toISOString()
        : null;

      const result = await query<SessionRow>(
        `INSERT INTO voice_sessions
           (id, guest_id, staff_id, context, state,
            started_at, voice_profile, transcript_expires_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'initiating',
                 NOW(), $4, $5)
         RETURNING *`,
        [
          args.guestId ?? null,
          args.staffId ?? null,
          args.context,
          args.voiceProfileId,
          transcriptExpiresAt,
        ],
      );
      return rowToSession(result.rows[0]);
    } catch (err) {
      logger.error('[SessionManager] startSession failed', {
        context: args.context,
        guestId: args.guestId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /** Update state. Forward-only per ALLOWED_TRANSITIONS. */
  async setState(sessionId: UUID, state: SessionState): Promise<VoiceSession> {
    try {
      const existing = await query<SessionRow>(
        'SELECT state FROM voice_sessions WHERE id = $1',
        [sessionId],
      );
      if (existing.rows.length === 0) {
        throw new Error(`session-manager: session ${sessionId} not found`);
      }
      const current = existing.rows[0].state as SessionState;
      const allowed = ALLOWED_TRANSITIONS[current] ?? [];
      if (!allowed.includes(state)) {
        throw new Error(
          `session-manager: invalid transition ${current} → ${state} (allowed: ${allowed.join(', ') || 'none'})`,
        );
      }
      const result = await query<SessionRow>(
        `UPDATE voice_sessions
         SET state = $2, updated_at = NOW()
         WHERE id = $1 AND state = $3
         RETURNING *`,
        [sessionId, state, current],
      );
      if (result.rows.length === 0) {
        throw new Error(`session-manager: concurrent transition on ${sessionId}`);
      }
      return rowToSession(result.rows[0]);
    } catch (err) {
      logger.error('[SessionManager] setState failed', {
        sessionId,
        state,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * End a session with optional outcome summary. Sets state='completed',
   * ended_at=now, computes duration_seconds.
   */
  async endSession(sessionId: UUID, outcomeSummary?: string): Promise<VoiceSession> {
    try {
      const result = await transaction(async (client) => {
        const existing = await client.query<SessionRow>(
          'SELECT state, started_at FROM voice_sessions WHERE id = $1',
          [sessionId],
        );
        if (existing.rows.length === 0) {
          throw new Error(`session-manager: session ${sessionId} not found`);
        }
        const current = existing.rows[0].state as SessionState;
        if (current === 'completed' || current === 'failed') {
          throw new Error(`session-manager: session ${sessionId} already terminal (${current})`);
        }
        const startedMs = new Date(dateToIso(existing.rows[0].started_at)).getTime();
        const durationSeconds = Math.floor((Date.now() - startedMs) / 1000);
        const updated = await client.query<SessionRow>(
          `UPDATE voice_sessions
           SET state = 'completed',
               ended_at = NOW(),
               duration_seconds = $2,
               outcome_summary = $3,
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [sessionId, durationSeconds, outcomeSummary ?? null],
        );
        return updated.rows[0];
      });
      return rowToSession(result);
    } catch (err) {
      logger.error('[SessionManager] endSession failed', {
        sessionId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Tenet 5: pause Aurion for a guest. Sets state='paused' on every
   * non-terminal session for that guest. Returns the count paused.
   */
  async pauseForGuest(guestId: GuestId): Promise<void> {
    try {
      await query(
        `UPDATE voice_sessions
         SET state = 'paused', updated_at = NOW()
         WHERE guest_id = $1
           AND state IN ('initiating','connecting','active')`,
        [guestId],
      );
    } catch (err) {
      logger.error('[SessionManager] pauseForGuest failed', {
        guestId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /** Most recent active session for a guest, or null. */
  async getActiveForGuest(guestId: GuestId): Promise<VoiceSession | null> {
    try {
      const result = await query<SessionRow>(
        `SELECT * FROM voice_sessions
         WHERE guest_id = $1 AND state = 'active'
         ORDER BY started_at DESC
         LIMIT 1`,
        [guestId],
      );
      if (result.rows.length === 0) return null;
      return rowToSession(result.rows[0]);
    } catch (err) {
      logger.error('[SessionManager] getActiveForGuest failed', {
        guestId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const sessionManager = new SessionManager();
