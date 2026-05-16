/**
 * ===========================================================================
 * Speech-to-speech client - browser/mobile audio plumbing
 * ===========================================================================
 * Layer:    Aurion
 * Status:   STUB
 * Phase:    3
 *
 * Purpose:  WebRTC + WebSocket bridge between guest microphone and the server-side speech bridge.
 *
 * Depends on:
 *   - shared/types/aurion/session.ts
 *
 * Consumed by:
 *   - client/components/aurion/AurionVoiceButton.tsx
 *   - client/modules/EchoAurion/index.tsx
 *
 * Integrates with existing LUCCCA modules:
 *   - client/lib/echo-ai3/hooks/useVoiceIntegration.ts
 *   - client/modules/VoiceCommands/
 *
 * Pending implementation:
 *   - [ ] Reuse existing MediaRecorder/SpeechRecognition scaffolding
 *   - [ ] WebRTC peer connection to /api/echo-resonance/aurion/sessions/:id/stream
 *   - [ ] Audio output: route to default or chosen device (in-room vs headset)
 *   - [ ] VAD coordination: never speak while user is mid-sentence
 *   - [ ] Latency budget: <300ms guest-perceived
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

export interface SpeechClientOptions {
  sessionId: string;
  voiceProfileId: string;
  onTurnStart?: (speaker: 'guest' | 'aurion') => void;
  onTurnEnd?: (speaker: 'guest' | 'aurion') => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (msg: string) => void;
}

export class SpeechToSpeechClient {
  constructor(private opts: SpeechClientOptions) {}

  async connect(): Promise<void> {
    throw new Error('Not implemented (Phase 3)');
  }

  async disconnect(): Promise<void> {
    throw new Error('Not implemented (Phase 3)');
  }

  /** Mute the microphone without ending the session. */
  setMuted(muted: boolean): void {
    throw new Error('Not implemented (Phase 3)');
  }

  /** Audio output target: 'speaker' | 'earpiece' | 'in-room-device'. */
  setOutput(target: string): void {
    throw new Error('Not implemented (Phase 3)');
  }
}
