/**
 * ===========================================================================
 * Aurion service - public exports
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED
 * Phase:    3/4
 *
 * Purpose:  Re-exports for the voice and conversational backend.
 *           Underlying services are wired through EchoAI² for LLM
 *           composition and the OpenAI Realtime API for voice.
 * ===========================================================================
 */

export * from './session-manager';
export * from './speech-to-speech-bridge';
export * from './prosody-analyzer';
export * from './whisper-engine';
export * from './brief-composer';
export * from './conversation-memory';
export * from './pre-arrival-orchestrator';
export * from './in-room-orchestrator';
