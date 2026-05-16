/**
 * ===========================================================================
 * Brief engine — manages Trip Brief lifecycle
 * ===========================================================================
 * Layer:    Voyage
 * Status:   IMPLEMENTED (Phase 2 deterministic templater; LLM is Phase 3 extension point)
 * Phase:    2
 *
 * Purpose:  Per master doc §6.1.1: "Two to three paragraphs of personalized
 *           narrative — the visit as Aurion sees it through the guest's eyes
 *           specifically. Refreshed whenever a meaningful new signal arrives.
 *           Optional voice playback. The Brief always ends with a single
 *           soft call to action that fits the guest's energy."
 *
 *           Phase 2 strategy: deterministic templater with the LLM call as
 *           a Phase 3 extension point. Today's prose is fluent enough for a
 *           pilot demo; richer Echo-Deep composition swaps the body of
 *           composeFromTemplate() when Aurion lands.
 *
 *           Versioning: each refresh marks the prior current brief as
 *           superseded (append-only history). The trip's current_brief_id
 *           pointer is updated in the same transaction.
 *
 * Aligned to: server/database/migrations/017_trip_briefs.sql
 *             shared/types/voyage/brief.ts
 *             server/services/echo-ai3/voyage/trip-engine.ts
 *
 * Tenet alignment:
 *   - Tenet 1 (capture by observation, not interrogation): the brief never
 *     asks the guest a question. It states what we know.
 *   - Silent Service register: copy reads as the guest's concierge, not as
 *     an AI announcement.
 * ===========================================================================
 */

import type { TripBrief } from '../../../../shared/types/voyage';
import type { UUID, ISODateTime } from '../../../../shared/types/base';
import { query, transaction } from '../../../database/connection';
import { logger } from '../../../lib/logger';
import { tripEngine } from './trip-engine';

interface BriefRow {
  id: string;
  trip_id: string;
  composed_at: Date | string;
  composed_by: string;
  paragraphs: string[];
  call_to_action: string | null;
  voice_playback_available: boolean;
  superseded_at: Date | string | null;
  superseded_reason: string | null;
}

function dateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  throw new Error(`brief-engine: unexpected date value type: ${typeof value}`);
}

function rowToBrief(row: BriefRow): TripBrief {
  return {
    id: row.id,
    tripId: row.trip_id,
    composedAt: dateToIso(row.composed_at),
    composedBy: row.composed_by as TripBrief['composedBy'],
    paragraphs: row.paragraphs ?? [],
    callToAction: row.call_to_action ?? undefined,
    voicePlaybackAvailable: row.voice_playback_available,
    supersededAt: row.superseded_at ? dateToIso(row.superseded_at) : undefined,
    supersededReason: row.superseded_reason ?? undefined,
  };
}

/**
 * Phase 2 deterministic templater — exported for testing. Pure function.
 * Phase 3 swaps the body for an LLM call; the surface stays.
 */
export function composeFromTemplate(args: {
  guestNameHint?: string;
  arrivalIso: ISODateTime;
  departureIso: ISODateTime;
  partySize: number;
  purpose: string;
  callToAction?: string;
}): { paragraphs: string[]; callToAction: string } {
  const arrival = new Date(args.arrivalIso);
  const departure = new Date(args.departureIso);
  const nights = Math.max(
    1,
    Math.round((departure.getTime() - arrival.getTime()) / 86_400_000),
  );
  const arrivalDate = arrival.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const arrivalTime = arrival.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  const partyDescriptor =
    args.partySize === 1
      ? 'a stay for one'
      : args.partySize === 2
        ? 'a stay for two'
        : `a stay for ${args.partySize}`;
  const purposeNote =
    args.purpose === 'corporate'
      ? 'around the conference schedule'
      : args.purpose === 'celebration'
        ? 'with the celebration at the centre'
        : args.purpose === 'wellness'
          ? 'with the days set up to slow down'
          : args.purpose === 'family-reunion'
            ? 'with the family time held intact'
            : 'with the days held loosely';

  const greeting = args.guestNameHint
    ? `Welcome, ${args.guestNameHint}.`
    : 'Welcome.';

  const paragraphs = [
    `${greeting} You'll arrive ${arrivalDate} at ${arrivalTime}. We have ${partyDescriptor} prepared, ${purposeNote}.`,
    `Your ${nights}-night plan has space in it. Things you've told us before are already noted; the rest of the time, you write the days yourself. If you want a hand, ask — and if you want quiet, that's the default.`,
  ];

  const cta =
    args.callToAction ??
    "When you're ready, I'll have one or two suggestions for the first evening — only if you want them.";

  return { paragraphs, callToAction: cta };
}

const REFRESH_THRESHOLD_SIGNAL_COUNT = 3;

export class BriefEngine {
  /**
   * Get the current (non-superseded) brief for a trip. Returns null when
   * no brief has been composed yet.
   */
  async current(tripId: UUID): Promise<TripBrief | null> {
    try {
      const result = await query<BriefRow>(
        `SELECT * FROM trip_briefs
         WHERE trip_id = $1 AND superseded_at IS NULL
         ORDER BY composed_at DESC
         LIMIT 1`,
        [tripId],
      );
      if (result.rows.length === 0) return null;
      return rowToBrief(result.rows[0]);
    } catch (err) {
      logger.error('[BriefEngine] current failed', {
        tripId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Decide whether the current brief is stale and a refresh is due.
   * Phase 2 heuristic: refresh if no current brief exists OR if the
   * count of meaningful signals since the brief's composedAt crosses
   * the threshold (3 by default).
   *
   * Phase 3 extension: this becomes a richer relevance check (weather
   * change > threshold, flight delay detected, occasion newly inferred).
   */
  async shouldRefresh(tripId: UUID, recentSignalCount: number): Promise<boolean> {
    const current = await this.current(tripId);
    if (!current) return true;
    if (recentSignalCount >= REFRESH_THRESHOLD_SIGNAL_COUNT) return true;
    return false;
  }

  /**
   * Generate a voice playback URL on demand. URL is short-lived; nothing
   * is stored. Phase 2 returns a placeholder URL the route layer rejects
   * with 501 Not Implemented; Phase 3 wires it to OpenAI Realtime API
   * TTS or the chosen voice provider.
   */
  async voicePlaybackUrl(briefId: UUID, voiceProfileId: string): Promise<string> {
    logger.warn('[BriefEngine] voicePlaybackUrl called pre-Aurion (Phase 3)', {
      briefId,
      voiceProfileId,
    });
    // Sentinel URL — route layer should treat this as 501 / 503 today
    return `data:text/plain,phase-3-required-${briefId}`;
  }

  /**
   * Compose (or recompose) the trip brief. Marks any prior current brief
   * as superseded and inserts a new row. Updates trips.current_brief_id
   * pointer in the same transaction.
   */
  async composeBrief(
    tripId: UUID,
    options: {
      guestNameHint?: string;
      callToAction?: string;
      supersedeReason?: string;
    } = {},
  ): Promise<TripBrief> {
    const trip = await tripEngine.get(tripId);
    if (!trip) {
      throw new Error(`brief-engine: trip ${tripId} not found`);
    }

    const composed = composeFromTemplate({
      guestNameHint: options.guestNameHint,
      arrivalIso: trip.expectedArrival,
      departureIso: trip.expectedDeparture,
      partySize: trip.partyMemberIds.length || 1,
      purpose: trip.purpose,
      callToAction: options.callToAction,
    });

    try {
      return await transaction(async (client) => {
        await client.query(
          `UPDATE trip_briefs
           SET superseded_at = NOW(), superseded_reason = $2
           WHERE trip_id = $1 AND superseded_at IS NULL`,
          [tripId, options.supersedeReason ?? 'recomposed'],
        );
        const inserted = await client.query<BriefRow>(
          `INSERT INTO trip_briefs (
             id, trip_id, composed_at, composed_by,
             paragraphs, call_to_action, voice_playback_available
           ) VALUES (
             gen_random_uuid(), $1, NOW(), 'echo-deep',
             $2::text[], $3, true
           )
           RETURNING *`,
          [tripId, composed.paragraphs, composed.callToAction],
        );
        if (inserted.rows.length === 0) {
          throw new Error('brief-engine: insert returned no rows');
        }
        const briefRow = inserted.rows[0];
        await client.query(
          `UPDATE trips SET current_brief_id = $1, updated_at = NOW() WHERE id = $2`,
          [briefRow.id, tripId],
        );
        return rowToBrief(briefRow);
      });
    } catch (err) {
      logger.error('[BriefEngine] composeBrief failed', {
        tripId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /** Mark the current brief as superseded without composing a new one. */
  async supersedeCurrent(tripId: UUID, reason: string): Promise<void> {
    try {
      await query(
        `UPDATE trip_briefs
         SET superseded_at = NOW(), superseded_reason = $2
         WHERE trip_id = $1 AND superseded_at IS NULL`,
        [tripId, reason],
      );
    } catch (err) {
      logger.error('[BriefEngine] supersedeCurrent failed', {
        tripId,
        reason,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const briefEngine = new BriefEngine();
