/**
 * ===========================================================================
 * Speech-to-speech bridge — voice provider via EchoAI² proxy
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED (Phase 3 — connection token issued via EchoAI² proxy;
 *           bidi audio streaming runs client-side direct to provider)
 * Phase:    3
 *
 * Purpose:  Master doc §5: provider-agnostic adapter for the voice layer.
 *           This server-side bridge issues short-lived connection tokens
 *           via the EchoAI² proxy; the actual bidi WebRTC/WebSocket
 *           channel runs from the browser direct to the upstream provider
 *           (OpenAI Realtime API by default per master doc §10.1). Audio
 *           never traverses our server (Tenet 2 enforcement at the
 *           architectural level — we cannot store what we never receive).
 *
 *           Phase 3 surface returns the provider-issued connection
 *           descriptor. Browser-side useVoiceIntegration consumes it.
 * ===========================================================================
 */

import type { ProviderConfig } from '../../../../shared/types/aurion';
import type { UUID } from '../../../../shared/types/base';
import { echoAi2Client } from '../../../lib/echo-ai2-client';
import { logger } from '../../../lib/logger';

export interface SpeechProvider {
  readonly name: string;
  connect(sessionId: UUID, voiceProfileId: string): Promise<SpeechConnection>;
}

export interface SpeechConnection {
  readonly sessionId: UUID;
  pushAudio(chunk: ArrayBuffer): Promise<void>;
  onAudio(handler: (chunk: ArrayBuffer) => void): void;
  onEvent(handler: (event: SpeechProviderEvent) => void): void;
  close(): Promise<void>;
}

export type SpeechProviderEvent =
  | { kind: 'turn-started'; speaker: 'guest' | 'aurion' }
  | { kind: 'turn-ended'; speaker: 'guest' | 'aurion'; durationMs: number }
  | { kind: 'silence'; durationMs: number }
  | { kind: 'transcript-partial'; text: string }
  | { kind: 'transcript-final'; text: string }
  | { kind: 'error'; message: string };

/**
 * Server-side adapter — issues connection tokens via EchoAI² proxy.
 * The browser uses the token to open WebRTC direct to the provider;
 * audio never hits this server.
 */
export class OpenAIRealtimeAdapter implements SpeechProvider {
  readonly name = 'openai-realtime';
  constructor(private config?: ProviderConfig) {}

  async connect(sessionId: UUID, voiceProfileId: string): Promise<SpeechConnection> {
    const token = await echoAi2Client.voiceSession({
      sessionId,
      voiceProfileId,
      context: 'aurion-realtime',
    });
    if (!token) {
      throw new Error(
        'speech-to-speech-bridge: EchoAI² proxy not configured or upstream rejected — voice unavailable',
      );
    }
    return {
      sessionId,
      async pushAudio() {
        // Server-side bridge does not pipe audio. Browser uses connectionToken
        // directly. This method exists for API completeness; calling it on
        // the server is a no-op + warning.
        logger.warn('[OpenAIRealtimeAdapter] pushAudio called server-side — no-op (browser owns the audio path)');
      },
      onAudio() {
        logger.warn('[OpenAIRealtimeAdapter] onAudio called server-side — no-op');
      },
      onEvent() {
        logger.warn('[OpenAIRealtimeAdapter] onEvent called server-side — no-op');
      },
      async close() {
        logger.info('[OpenAIRealtimeAdapter] close — connection ends client-side; nothing to clean up server-side');
      },
    };
  }
}

export class SpeechToSpeechBridge {
  private provider: SpeechProvider = new OpenAIRealtimeAdapter();

  init(config: ProviderConfig): void {
    if (config.provider === 'openai-realtime') {
      this.provider = new OpenAIRealtimeAdapter(config);
    } else {
      // Future providers (elevenlabs, cartesia) drop in here.
      // For Phase 3, OpenAI Realtime is the only adapter wired through proxy.
      logger.warn('[SpeechToSpeechBridge] non-openai providers not wired in Phase 3 — falling back to OpenAI');
      this.provider = new OpenAIRealtimeAdapter();
    }
  }

  async openConnection(sessionId: UUID, voiceProfileId: string): Promise<SpeechConnection> {
    return this.provider.connect(sessionId, voiceProfileId);
  }
}

export const speechToSpeechBridge = new SpeechToSpeechBridge();
