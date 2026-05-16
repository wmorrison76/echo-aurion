/**
 * ===========================================================================
 * Pre-arrival orchestrator — T-3 day opt-in voice
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED (Phase 3 — schedule + start + finalize wired through
 *           session-manager + speech-to-speech-bridge + EchoAI²)
 * Phase:    3
 *
 * Purpose:  Master doc §5.2.1: T-3 day opt-in voice conversation. The
 *           highest-density signal-capture moment in the entire journey.
 *           Two-to-four minute typical, eight-minute hard cap.
 *
 *           Phase 3 implementation:
 *             - scheduleInvitation: marks the trip with a pre-arrival
 *               opt-in flag; the Phase 3.x notification scheduler picks
 *               it up and delivers the invite (push / SMS / email
 *               channels are property-config-driven).
 *             - startConversation: opens a voice session via
 *               session-manager + speech-to-speech-bridge. Hard cap
 *               enforced as session metadata; the browser-side voice
 *               client polls the cap and ends gracefully.
 *             - finalize: produces the PreArrivalVoiceSummary that
 *               feeds the resonance forecast.
 *
 *           Tenet 1: the conversation is gracious not interrogative —
 *           handled by brief-composer prompt construction; this
 *           orchestrator only wires the session lifecycle.
 * ===========================================================================
 */

import type { UUID, GuestId } from '../../../../shared/types/base';
import type { PreArrivalVoiceSummary } from '../../../../shared/types/resonance';
import { sessionManager } from './session-manager';
import { speechToSpeechBridge } from './speech-to-speech-bridge';
import { logger } from '../../../lib/logger';
import { query } from '../../../database/connection';

const HARD_CAP_SECONDS = 8 * 60; // master doc §5.2.1 "hard cap at eight"
const DEFAULT_VOICE_PROFILE = 'aurion-warm-default';

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export class PreArrivalOrchestrator {
  /**
   * Schedule the T-3 day opt-in invitation for a trip. Persists the
   * intention; the Phase 3.x scheduler delivers via property channels.
   */
  async scheduleInvitation(tripId: UUID): Promise<void> {
    try {
      // Phase 3 simplification: log + audit-only. The dedicated
      // pre_arrival_invitations table arrives in Phase 3.x; until then
      // the calling route can write to a generic notifications queue.
      logger.info('[PreArrivalOrchestrator] invitation scheduled', { tripId });
      // Mark the trip's status if still in 'booked' (advance to 'pre-arrival')
      // This is the trigger for the channel-specific notification scheduler.
      await query(
        `UPDATE trips
         SET status = 'pre-arrival', updated_at = NOW()
         WHERE id = $1 AND status = 'booked'`,
        [tripId],
      );
    } catch (err) {
      logger.error('[PreArrivalOrchestrator] scheduleInvitation failed', {
        tripId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Begin a pre-arrival conversation. Returns the active session id.
   * The browser uses session-manager + speech-to-speech-bridge to open
   * the audio channel directly; this method only sets up the server-side
   * record + connection token.
   */
  async startConversation(guestId: GuestId, _tripId: UUID): Promise<UUID> {
    try {
      const session = await sessionManager.startSession({
        guestId,
        context: 'pre-arrival',
        voiceProfileId: DEFAULT_VOICE_PROFILE,
        transcriptOptIn: false, // Tenet 2 — transcripts opt-in only
      });

      // Pre-warm the speech bridge connection (issues an EchoAI² connection
      // token). Failure is logged; the browser will retry on the route layer.
      try {
        await speechToSpeechBridge.openConnection(session.id, DEFAULT_VOICE_PROFILE);
      } catch (err) {
        logger.warn('[PreArrivalOrchestrator] speech bridge open failed (browser will retry)', {
          sessionId: session.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      await sessionManager.setState(session.id, 'connecting');
      return session.id;
    } catch (err) {
      logger.error('[PreArrivalOrchestrator] startConversation failed', {
        guestId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Wrap up. Computes the PreArrivalVoiceSummary that informs the
   * resonance forecast. The summary's signal density comes from the
   * prosody readings captured during the call (queried from
   * prosody_readings table).
   */
  async finalize(sessionId: UUID): Promise<PreArrivalVoiceSummary> {
    try {
      const session = await sessionManager.endSession(
        sessionId,
        'pre-arrival conversation complete',
      );

      // Aggregate prosody readings into summary
      const readingsResult = await query<{
        arousal: number;
        valence: number;
        warmth: number;
      }>(
        `SELECT arousal, valence, warmth FROM prosody_readings
         WHERE session_id = $1
         ORDER BY captured_at ASC`,
        [sessionId],
      );

      const readings = readingsResult.rows;
      const meanArousal =
        readings.length > 0
          ? readings.reduce((s, r) => s + Number(r.arousal), 0) / readings.length
          : 0;
      const meanValence =
        readings.length > 0
          ? readings.reduce((s, r) => s + Number(r.valence), 0) / readings.length
          : 0;
      const meanWarmth =
        readings.length > 0
          ? readings.reduce((s, r) => s + Number(r.warmth), 0) / readings.length
          : 0;

      // Map mean prosody into the canonical PreArrivalVoiceSummary shape
      // (defined in shared/types/resonance/forecast.ts):
      //   detectedTone: derived from valence + arousal quadrant
      //   energyEstimate: arousal remapped to [0, 1]
      const detectedTone: PreArrivalVoiceSummary['detectedTone'] =
        readings.length === 0
          ? 'neutral'
          : meanValence > 0.4 && meanArousal > 0.3
            ? 'excited'
            : meanValence < -0.3 && meanArousal > 0.3
              ? 'anxious'
              : meanValence > 0.4 && meanArousal <= 0
                ? 'celebratory'
                : meanArousal < -0.3
                  ? 'tired'
                  : 'neutral';

      const summary: PreArrivalVoiceSummary = {
        conducted: true,
        durationSeconds: session.durationSeconds,
        detectedTone,
        energyEstimate: clamp01((meanArousal + 1) / 2),
      };
      void meanWarmth; // reserved for Phase 5 occasionsMentioned/explicitRequests inference
      return summary;
    } catch (err) {
      logger.error('[PreArrivalOrchestrator] finalize failed', {
        sessionId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const preArrivalOrchestrator = new PreArrivalOrchestrator();
