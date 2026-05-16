/**
 * ===========================================================================
 * Voice state machine pure tests
 * ===========================================================================
 * Layer:    Aurion (client)
 * Status:   IMPLEMENTED
 * Phase:    3
 * ===========================================================================
 */

import { describe, expect, it } from 'vitest';
import { transition, INITIAL_VOICE_STATE } from '../../../client/lib/aurion/voice-state-machine';

describe('voice-state-machine', () => {
  it('happy path: idle → connecting → listening → thinking → speaking → listening', () => {
    let s = INITIAL_VOICE_STATE;
    expect(s).toBe('idle');
    s = transition(s, { kind: 'connect' });
    expect(s).toBe('connecting');
    s = transition(s, { kind: 'connected' });
    expect(s).toBe('listening');
    s = transition(s, { kind: 'user-speech-start' });
    expect(s).toBe('listening');
    s = transition(s, { kind: 'user-speech-end' });
    expect(s).toBe('thinking');
    s = transition(s, { kind: 'tts-start' });
    expect(s).toBe('speaking');
    s = transition(s, { kind: 'tts-end' });
    expect(s).toBe('listening');
  });

  it('any state + error → error', () => {
    expect(transition('listening', { kind: 'error', message: 'x' })).toBe('error');
    expect(transition('speaking', { kind: 'error', message: 'x' })).toBe('error');
    expect(transition('idle', { kind: 'error', message: 'x' })).toBe('error');
  });

  it('any state + disconnect → idle', () => {
    expect(transition('listening', { kind: 'disconnect' })).toBe('idle');
    expect(transition('speaking', { kind: 'disconnect' })).toBe('idle');
    expect(transition('error', { kind: 'disconnect' })).toBe('idle');
  });

  it('pause from non-idle → paused; resume → listening', () => {
    expect(transition('listening', { kind: 'pause' })).toBe('paused');
    expect(transition('paused', { kind: 'resume' })).toBe('listening');
  });

  it('pause from idle stays idle', () => {
    expect(transition('idle', { kind: 'pause' })).toBe('idle');
  });

  it('error state can re-connect', () => {
    expect(transition('error', { kind: 'connect' })).toBe('connecting');
  });

  it('listening + tts-start jumps directly to speaking (Aurion takes turn)', () => {
    expect(transition('listening', { kind: 'tts-start' })).toBe('speaking');
  });

  it('does not transition on irrelevant events', () => {
    expect(transition('idle', { kind: 'tts-start' })).toBe('idle');
    expect(transition('connecting', { kind: 'tts-start' })).toBe('connecting');
  });
});
