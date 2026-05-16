/**
 * ===========================================================================
 * In-room come-alive orchestrator
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED (Phase 3 — session + greeting + silence default;
 *           PMS room-key trigger wired by Phase 3.x routes)
 * Phase:    3
 *
 * Purpose:  Master doc §5.2.3: triggered on first room-key activation.
 *           Greeting + offer + silence default. NOT a tour. After the
 *           offer, Aurion never speaks unprompted in-room.
 *
 *           Phase 3 implementation:
 *             - onFirstRoomActivation: opens an in-room session, returns
 *               the session id. Browser/speaker plays the greeting via
 *               speech-to-speech-bridge.
 *             - runTour: optional 90-second tour for guests who accept.
 *               Defaults off.
 * ===========================================================================
 */

import type { UUID, GuestId } from '../../../../shared/types/base';
import { sessionManager } from './session-manager';
import { speechToSpeechBridge } from './speech-to-speech-bridge';
import { logger } from '../../../lib/logger';

const DEFAULT_VOICE_PROFILE = 'aurion-warm-default';

export class InRoomOrchestrator {
  /**
   * Triggered when the room key is first activated. Opens an in-room
   * voice session. The room device plays the greeting; if the guest
   * does not engage, Aurion stays silent for the rest of the stay.
   */
  async onFirstRoomActivation(guestId: GuestId, roomId: string): Promise<UUID> {
    try {
      const session = await sessionManager.startSession({
        guestId,
        context: 'in-room-come-alive',
        voiceProfileId: DEFAULT_VOICE_PROFILE,
        transcriptOptIn: false,
      });

      // Pre-warm the bridge so the room device's greeting starts fast
      try {
        await speechToSpeechBridge.openConnection(session.id, DEFAULT_VOICE_PROFILE);
      } catch (err) {
        logger.warn('[InRoomOrchestrator] bridge open failed (room device will retry)', {
          sessionId: session.id,
          roomId,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      await sessionManager.setState(session.id, 'connecting');
      logger.info('[InRoomOrchestrator] room activated', {
        sessionId: session.id,
        roomId,
        guestId,
      });
      return session.id;
    } catch (err) {
      logger.error('[InRoomOrchestrator] onFirstRoomActivation failed', {
        guestId,
        roomId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Optional 90-second tour if guest accepts the offer. Default is silent;
   * tour only runs when guest explicitly says yes (per master doc §5.2.3
   * "tour exists for guests who want it. Most do not").
   */
  async runTour(sessionId: UUID): Promise<void> {
    try {
      // Phase 3: log the choice; the actual tour audio is played by the
      // room device via the speech-bridge connection. This server-side
      // handler just records that the guest opted in (so post-stay
      // analytics can track tour-acceptance rate without storing audio).
      logger.info('[InRoomOrchestrator] tour accepted', { sessionId });
      await sessionManager.setState(sessionId, 'active');
    } catch (err) {
      logger.error('[InRoomOrchestrator] runTour failed', {
        sessionId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const inRoomOrchestrator = new InRoomOrchestrator();
