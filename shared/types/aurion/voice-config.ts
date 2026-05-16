/**
 * ===========================================================================
 * Voice configuration - house voices
 * ===========================================================================
 * Layer:    Aurion
 * Status:   STUB
 * Phase:    3
 *
 * Purpose:  Configuration for the four-to-six house voice options.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

export interface VoiceProfile {
  id: string;
  displayName: string;
  description: string;
  characteristic: 'warm' | 'crisp' | 'gentle' | 'energetic' | 'measured';
  defaultLanguage: string;
  providerVoiceId: string;
}

export const HOUSE_VOICES: VoiceProfile[] = [
  // TODO Phase 3: populate with 4-6 voices after studio recording
];

export interface ProviderConfig {
  provider: 'openai-realtime' | 'elevenlabs' | 'cartesia';
  apiKey: string;
  endpoint: string;
}
