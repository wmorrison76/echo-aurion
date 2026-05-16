/**
 * ===========================================================================
 * Whisper engine — staff earpiece briefs
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED
 * Phase:    4
 *
 * Purpose:  Master doc §5.2.2: when a guest checks in (or trajectory
 *           inflects), Aurion whispers context to staff via earpiece.
 *           5-10 seconds. Direction NOT dialogue.
 *
 *           Phase 4 strategy: deterministic templater that composes
 *           whisper text from arrival context + recent guest signals.
 *           Persists to staff_whispers (master doc §10.5 transparency log
 *           per Tenet 6).
 *
 *           Phase 5+ extension: Echo-Deep LLM composer replaces the
 *           templater body for richer per-guest copy. Same surface.
 *
 * Tenet 6 (staff transparency): every whisper persists to staff_whispers
 * with the doNots, urgency, and any suggestedInterventionId. Staff can
 * flag flaggedAsWrong via the route layer (Phase 4.x).
 * ===========================================================================
 */

import type { StaffWhisper, WhisperUrgency } from '../../../../shared/types/aurion';
import type { UUID, GuestId, StaffId } from '../../../../shared/types/base';
import { query } from '../../../database/connection';
import { logger } from '../../../lib/logger';
import { signalQuery } from '../../signals/signal-query';

export interface ComposeArrivalArgs {
  staffId: StaffId;
  guestId: GuestId;
  arrivalContext: 'check-in' | 'tableside' | 'pre-meeting';
  /** Optional pre-fetched signals; omit to query inside. */
  recentSignalsHint?: number;
}

interface WhisperRow {
  id: string;
  staff_id: string;
  guest_id: string;
  triggered_at: Date | string;
  urgency: string;
  duration_seconds: number;
  text: string;
  do_nots: string[] | null;
  suggested_intervention_id: string | null;
  flagged_as_wrong: boolean;
  staff_note: string | null;
}

function dateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  throw new Error(`whisper-engine: unexpected date value: ${typeof value}`);
}

function rowToWhisper(row: WhisperRow): StaffWhisper {
  return {
    id: row.id,
    staffId: row.staff_id,
    guestId: row.guest_id,
    triggeredAt: dateToIso(row.triggered_at),
    urgency: row.urgency as WhisperUrgency,
    durationSeconds: row.duration_seconds,
    text: row.text,
    doNots: row.do_nots ?? undefined,
    suggestedInterventionId: row.suggested_intervention_id ?? undefined,
    flaggedAsWrong: row.flagged_as_wrong,
    staffNote: row.staff_note ?? undefined,
  };
}

/**
 * Pure helper: compose whisper text from arrival context + signal-derived
 * tags. Direction not dialogue. Exported for testing.
 *
 * Master doc §5.2.2 register: "be warm, no flight small-talk" not "say
 * 'how was your trip?'" The staff member uses their own warmth and
 * judgment; the whisper is back-pocket context.
 */
export function composeArrivalWhisperText(args: {
  context: 'check-in' | 'tableside' | 'pre-meeting';
  signalTags: string[];
}): { text: string; doNots: string[]; durationSeconds: number; urgency: WhisperUrgency } {
  // Tags arrive as either 'kind:value' or just 'value'. Match on either form
  // so callers can pass the raw signal tag list without normalization.
  const tagSet = new Set<string>();
  for (const raw of args.signalTags) {
    const lower = raw.toLowerCase();
    tagSet.add(lower);
    const colon = lower.indexOf(':');
    if (colon > 0) tagSet.add(lower.slice(colon + 1));
  }
  const doNots: string[] = [];
  const lines: string[] = [];

  // Universal opener by context
  if (args.context === 'check-in') {
    lines.push('Returning guest at the desk');
  } else if (args.context === 'tableside') {
    lines.push('Tableside in 30 seconds');
  } else {
    lines.push('Joining the meeting shortly');
  }

  // Signal-derived directions
  if (tagSet.has('delayed-flight') || tagSet.has('late-arrival')) {
    lines.push('travel was hard — be warm, skip the trip questions');
    doNots.push('do not ask about the flight');
  }
  if (tagSet.has('anniversary') || tagSet.has('anniversary-7')) {
    lines.push('anniversary noted; quiet acknowledgment, no announcement');
    doNots.push('no song, no sparkler, no public toast');
  }
  if (tagSet.has('memorial-context') || tagSet.has('returning-after-loss')) {
    lines.push('warmth not celebration; their old table held');
    doNots.push('do not bring up old memories first');
  }
  if (tagSet.has('shellfish-allergy')) {
    lines.push('shellfish allergy on file — kitchen has been notified');
    doNots.push('do not feature shellfish in any tableside narration');
  }
  if (tagSet.has('wine-drinker')) {
    lines.push('prefers wine over cocktails');
  }

  // Track whether any signal-derived line was added BEFORE the fallback —
  // urgency depends on real signals, not on the fallback prose.
  const hasSignalDirection = lines.length > 1;

  // Default fallback if no signals matched
  if (!hasSignalDirection) {
    lines.push('no flagged context — read the room and proceed normally');
  }

  // Compose
  const text = lines.join(' · ');
  const wordCount = text.split(/\s+/).length;
  const durationSeconds = Math.max(3, Math.min(10, Math.round(wordCount / 2)));

  // Urgency: real signal-derived directions raise from background → noticed.
  // Allergy raises further to priority.
  let urgency: WhisperUrgency = 'background';
  if (hasSignalDirection) urgency = 'noticed';
  if (tagSet.has('shellfish-allergy') || tagSet.has('peanut-allergy')) urgency = 'priority';

  return { text, doNots, durationSeconds, urgency };
}

export class WhisperEngine {
  /**
   * Compose an arrival whisper from recent guest signals + arrival context.
   * Persists to staff_whispers and returns the row.
   */
  async composeArrivalWhisper(args: ComposeArrivalArgs): Promise<StaffWhisper> {
    try {
      const limit = args.recentSignalsHint ?? 30;
      const recentSignals = await signalQuery.getSignalsForGuest(args.guestId, limit);
      const signalTags = recentSignals.flatMap((s) =>
        (s.tags ?? []).map((t) => `${t.kind}:${t.value}`),
      );
      const composed = composeArrivalWhisperText({
        context: args.arrivalContext,
        signalTags,
      });

      const result = await query<WhisperRow>(
        `INSERT INTO staff_whispers
           (id, staff_id, guest_id, triggered_at, urgency, duration_seconds, text, do_nots)
         VALUES (gen_random_uuid(), $1, $2, NOW(), $3, $4, $5, $6::text[])
         RETURNING *`,
        [
          args.staffId,
          args.guestId,
          composed.urgency,
          composed.durationSeconds,
          composed.text,
          composed.doNots,
        ],
      );
      return rowToWhisper(result.rows[0]);
    } catch (err) {
      logger.error('[WhisperEngine] composeArrivalWhisper failed', {
        staffId: args.staffId,
        guestId: args.guestId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Mid-stay whisper triggered by trajectory inflection or signal pattern.
   * Phase 4 takes urgency from caller (resonance-engine inflection
   * detection lands in Phase 4.x).
   */
  async composeFollowupWhisper(
    staffId: StaffId,
    guestId: GuestId,
    urgency: WhisperUrgency,
  ): Promise<StaffWhisper> {
    try {
      const text =
        urgency === 'urgent'
          ? 'trajectory bent red — review the intervention card now'
          : urgency === 'priority'
            ? 'amber — visit-and-listen, do not over-correct'
            : 'no immediate action; check back in a few minutes';
      const result = await query<WhisperRow>(
        `INSERT INTO staff_whispers
           (id, staff_id, guest_id, triggered_at, urgency, duration_seconds, text)
         VALUES (gen_random_uuid(), $1, $2, NOW(), $3, $4, $5)
         RETURNING *`,
        [staffId, guestId, urgency, 4, text],
      );
      return rowToWhisper(result.rows[0]);
    } catch (err) {
      logger.error('[WhisperEngine] composeFollowupWhisper failed', {
        staffId,
        guestId,
        urgency,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Recent whispers for a staff member — powers the transparency log
   * (Tenet 6). Default 50.
   */
  async recentForStaff(staffId: StaffId, limit = 50): Promise<StaffWhisper[]> {
    try {
      const result = await query<WhisperRow>(
        `SELECT * FROM staff_whispers
         WHERE staff_id = $1
         ORDER BY triggered_at DESC
         LIMIT $2`,
        [staffId, limit],
      );
      return result.rows.map(rowToWhisper);
    } catch (err) {
      logger.error('[WhisperEngine] recentForStaff failed', {
        staffId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Flag a whisper as misread. Tenet 6: staff feedback flows back to
   * Echo-Deep as a training signal. Phase 4 stores the flag; Phase 5+
   * pipes flagged whispers into the training corpus.
   */
  async flagAsWrong(whisperId: UUID, staffNote?: string): Promise<StaffWhisper> {
    try {
      const result = await query<WhisperRow>(
        `UPDATE staff_whispers
         SET flagged_as_wrong = true, staff_note = $2
         WHERE id = $1
         RETURNING *`,
        [whisperId, staffNote ?? null],
      );
      if (result.rows.length === 0) {
        throw new Error(`whisper-engine: whisper ${whisperId} not found`);
      }
      return rowToWhisper(result.rows[0]);
    } catch (err) {
      logger.error('[WhisperEngine] flagAsWrong failed', {
        whisperId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const whisperEngine = new WhisperEngine();
