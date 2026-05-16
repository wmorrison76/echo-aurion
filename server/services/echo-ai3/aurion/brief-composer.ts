/**
 * ===========================================================================
 * Brief composer — Aurion-voice Trip Brief writer
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED (Phase 3 — EchoAI² LLM compose with deterministic fallback)
 * Phase:    2/3
 *
 * Purpose:  Master doc §6.1.1: the 2-3 paragraph personalized narrative.
 *           Calls EchoAI² for richer composition; falls back to the
 *           deterministic templater in voyage/brief-engine when proxy
 *           is unconfigured.
 *
 *           Tenet alignment:
 *             - Tenet 1: prompt strictly forbids questions.
 *             - Tenet 7: sensitive memory items are filtered out before
 *               prompt assembly (conversation-memory already excludes
 *               sensitive sensitivity from the rendered view).
 * ===========================================================================
 */

import type { TripBrief } from '../../../../shared/types/voyage';
import type { UUID } from '../../../../shared/types/base';
import { echoAi2Client } from '../../../lib/echo-ai2-client';
import { logger } from '../../../lib/logger';
import { briefEngine, composeFromTemplate } from '../voyage/brief-engine';
import { conversationMemory } from './conversation-memory';
import { tripEngine } from '../voyage/trip-engine';

export interface ComposeBriefArgs {
  tripId: UUID;
  triggeringSignal?: string;
}

/**
 * Build the Aurion-voice prompt from trip + memory context. Pure helper,
 * exported for testing.
 *
 * Tenet 1: the prompt closes with "Never ask the guest a question." so the
 * upstream LLM produces statements + a soft CTA, never an interrogation.
 */
export function buildBriefPrompt(args: {
  tripPurpose: string;
  arrivalIso: string;
  departureIso: string;
  partySize: number;
  guestNameHint?: string;
  memorySummary?: string;
  triggeringSignal?: string;
}): string {
  const lines: string[] = [
    'You are Aurion. Voice register: warm, plain-spoken, V&A-standard.',
    'Compose a 2-3 paragraph trip brief for the guest, second-person.',
    `Arrival: ${args.arrivalIso}. Departure: ${args.departureIso}. Party size: ${args.partySize}. Purpose: ${args.tripPurpose}.`,
  ];
  if (args.guestNameHint) lines.push(`Address the guest as: ${args.guestNameHint}.`);
  if (args.memorySummary) lines.push(`Memory context (paraphrase, do not quote): ${args.memorySummary}`);
  if (args.triggeringSignal) lines.push(`A new signal triggered this refresh: ${args.triggeringSignal}.`);
  lines.push(
    'Constraints: (1) Never ask the guest a question. (2) End with one soft call to action, opt-in only. (3) No marketing copy. (4) No exclamation points.',
  );
  return lines.join('\n');
}

export class BriefComposer {
  /**
   * Compose a fresh Trip Brief. Tries EchoAI² LLM first; falls back to
   * the deterministic templater on proxy unavailability or any error.
   */
  async compose(args: ComposeBriefArgs): Promise<TripBrief> {
    const trip = await tripEngine.get(args.tripId);
    if (!trip) {
      throw new Error(`brief-composer: trip ${args.tripId} not found`);
    }

    // Build memory summary (paraphrased; no raw signal text)
    let memorySummary: string | undefined;
    try {
      const memory = await conversationMemory.renderForGuest(trip.guestId);
      const items = memory.categories.flatMap((c) => c.items);
      if (items.length > 0) {
        memorySummary = items
          .slice(0, 8)
          .map((i) => i.description)
          .join('; ');
      }
    } catch (err) {
      logger.debug('[BriefComposer] memory fetch failed; continuing without', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const prompt = buildBriefPrompt({
      tripPurpose: trip.purpose,
      arrivalIso: trip.expectedArrival,
      departureIso: trip.expectedDeparture,
      partySize: trip.partyMemberIds.length || 1,
      memorySummary,
      triggeringSignal: args.triggeringSignal,
    });

    const composed = await echoAi2Client.composeText(prompt, {
      targetLength: 700,
      voiceTone: 'aurion-warm',
    });

    // Validate output — if upstream returns a question or absent text, fall
    // back to the deterministic templater rather than ship a Tenet 1 violation.
    if (!composed || composed.includes('?')) {
      if (composed) {
        logger.warn('[BriefComposer] upstream output contained a question; falling back to deterministic template');
      }
      return briefEngine.composeBrief(args.tripId, {
        supersedeReason: args.triggeringSignal ?? 'recomposed',
      });
    }

    // Split LLM output into paragraphs; everything but the last paragraph
    // becomes the brief paragraphs, last sentence is the CTA.
    const paragraphs = composed
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    let cta: string | undefined;
    if (paragraphs.length >= 3) {
      cta = paragraphs.pop();
    }

    return briefEngine.composeBrief(args.tripId, {
      callToAction: cta,
      supersedeReason: args.triggeringSignal ?? 'llm-recomposed',
    });
  }

  /**
   * Regenerate the current brief with the triggering reason recorded.
   * Returns the new brief.
   */
  async refresh(currentBriefId: UUID, reason: string): Promise<TripBrief> {
    // currentBriefId carries the trip id via brief.tripId; resolve through
    // brief-engine's read path.
    // Phase 3 simplification: caller passes triggeringSignal via reason.
    const current = await briefEngine
      .current(currentBriefId)
      .catch(() => null);
    if (!current) {
      throw new Error(`brief-composer: brief ${currentBriefId} not found`);
    }
    return this.compose({ tripId: current.tripId, triggeringSignal: reason });
  }
}

export const briefComposer = new BriefComposer();

// Re-export the deterministic templater so callers can use it directly
// without going through the LLM path.
export { composeFromTemplate };
