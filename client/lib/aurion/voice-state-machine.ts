/**
 * ===========================================================================
 * Voice state machine — UI state for the orb / mic
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED
 * Phase:    3
 *
 * Purpose:  Pure reducer that drives the AurionVoiceButton + MicState orb.
 *           Decoupled from transport so tests stay fast and the same
 *           transitions hold whether the audio path is WebRTC, WebSocket,
 *           or the silent fallback.
 *
 *           States and transitions follow the master doc §5.3 voice
 *           lifecycle. From any state a hard 'error' or 'disconnect'
 *           returns to the appropriate terminal state — the UI never
 *           gets wedged.
 * ===========================================================================
 */

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'paused' | 'error';

export type VoiceEvent =
  | { kind: 'connect' }
  | { kind: 'connected' }
  | { kind: 'tts-start' }
  | { kind: 'tts-end' }
  | { kind: 'user-speech-start' }
  | { kind: 'user-speech-end' }
  | { kind: 'pause' }
  | { kind: 'resume' }
  | { kind: 'disconnect' }
  | { kind: 'error'; message: string };

export function transition(state: VoiceState, event: VoiceEvent): VoiceState {
  if (event.kind === 'error') return 'error';
  if (event.kind === 'disconnect') return 'idle';
  if (event.kind === 'pause') return state === 'idle' ? 'idle' : 'paused';
  if (event.kind === 'resume') return state === 'paused' ? 'listening' : state;

  switch (state) {
    case 'idle':
      return event.kind === 'connect' ? 'connecting' : state;
    case 'connecting':
      return event.kind === 'connected' ? 'listening' : state;
    case 'listening':
      if (event.kind === 'user-speech-start') return 'listening';
      if (event.kind === 'user-speech-end') return 'thinking';
      if (event.kind === 'tts-start') return 'speaking';
      return state;
    case 'thinking':
      return event.kind === 'tts-start' ? 'speaking' : state;
    case 'speaking':
      return event.kind === 'tts-end' ? 'listening' : state;
    case 'paused':
      return state;
    case 'error':
      return event.kind === 'connect' ? 'connecting' : state;
    default:
      return state;
  }
}

export const INITIAL_VOICE_STATE: VoiceState = 'idle';
