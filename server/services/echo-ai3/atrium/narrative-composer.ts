/**
 * ===========================================================================
 * Narrative composer — per-guest venue page text
 * ===========================================================================
 * Layer:    Atrium
 * Status:   IMPLEMENTED (Phase 5 — EchoAI² LLM compose with deterministic fallback)
 * Phase:    5
 *
 * Purpose:  Master doc §7.2 (Atrium narrative): "Two to three sentences in
 *           Aurion's voice explaining what this venue is *for this guest
 *           specifically* — not a generic blurb."
 *
 *           Phase 5 strategy: same shape as brief-composer. Try EchoAI²
 *           LLM first; fall back to a deterministic templater on
 *           proxy unavailability or output that violates Tenet 1.
 *
 *           Phase 5.x extension: cache per (guestId, venueId, day) to
 *           avoid re-composition. Phase 5 ships without cache; the
 *           per-call cost is bounded by the LLM compose timeout.
 * ===========================================================================
 */

import type { UUID, GuestId } from '../../../../shared/types/base';
import { echoAi2Client } from '../../../lib/echo-ai2-client';
import { logger } from '../../../lib/logger';
import { conversationMemory } from '../aurion/conversation-memory';
import { query } from '../../../database/connection';

interface VenueRow {
  id: string;
  name: string;
  kind: string;
  short_description: string;
}

/**
 * Pure helper: deterministic templater for the venue narrative when the
 * LLM is unavailable or returns unsafe output. Exported for testing.
 *
 * Constraint: never asks a question. Two sentences. Aurion-warm register.
 */
export function composeNarrativeFallback(args: {
  venueName: string;
  venueKind: string;
  shortDescription: string;
  hasMemorySummary: boolean;
}): string {
  const kindNote =
    args.venueKind === 'spa'
      ? 'a slower, lower-light room'
      : args.venueKind === 'restaurant'
        ? 'kitchen the chef trusts'
        : args.venueKind === 'bar'
          ? 'considered list, careful pour'
          : args.venueKind === 'gym' || args.venueKind === 'pool'
            ? 'space that holds the morning quietly'
            : 'a corner of the property worth your time';
  const opener = `${args.venueName}: ${kindNote}.`;
  const followup = args.hasMemorySummary
    ? args.shortDescription
    : `${args.shortDescription}`;
  return `${opener} ${followup}`;
}

export class NarrativeComposer {
  async composeForGuest(venueId: UUID, guestId: GuestId): Promise<string> {
    try {
      const venueResult = await query<VenueRow>(
        'SELECT id, name, kind, short_description FROM venues WHERE id = $1',
        [venueId],
      );
      if (venueResult.rows.length === 0) {
        throw new Error(`narrative-composer: venue ${venueId} not found`);
      }
      const venue = venueResult.rows[0];

      // Memory summary (paraphrased; never raw notes)
      let memorySummary: string | undefined;
      try {
        const memory = await conversationMemory.renderForGuest(guestId);
        const items = memory.categories.flatMap((c) => c.items);
        if (items.length > 0) {
          memorySummary = items
            .slice(0, 6)
            .map((i) => i.description)
            .join('; ');
        }
      } catch (err) {
        logger.debug('[NarrativeComposer] memory unavailable; continuing without', {
          guestId,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      const prompt = [
        'You are Aurion. Voice register: warm, plain-spoken, V&A-standard.',
        `Compose a 2-3 sentence venue narrative for the guest, second-person.`,
        `Venue: ${venue.name} (${venue.kind}). Description: ${venue.short_description}.`,
        memorySummary ? `Memory context (paraphrase only): ${memorySummary}` : '',
        'Constraints: (1) No questions. (2) No exclamations. (3) Two to three sentences max. (4) No marketing copy.',
      ]
        .filter(Boolean)
        .join('\n');

      const composed = await echoAi2Client.composeText(prompt, {
        targetLength: 280,
        voiceTone: 'aurion-warm',
      });

      if (!composed || composed.includes('?')) {
        if (composed) {
          logger.warn('[NarrativeComposer] upstream output had a question; falling back');
        }
        return composeNarrativeFallback({
          venueName: venue.name,
          venueKind: venue.kind,
          shortDescription: venue.short_description,
          hasMemorySummary: Boolean(memorySummary),
        });
      }
      return composed.trim();
    } catch (err) {
      logger.error('[NarrativeComposer] composeForGuest failed', {
        venueId,
        guestId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async refresh(venueId: UUID, guestId: GuestId): Promise<string> {
    return this.composeForGuest(venueId, guestId);
  }
}

export const narrativeComposer = new NarrativeComposer();
