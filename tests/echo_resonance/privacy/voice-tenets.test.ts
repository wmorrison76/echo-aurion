/**
 * ===========================================================================
 * TENET enforcement - voice retention
 * ===========================================================================
 * Layer:    Aurion
 * Status:   SCAFFOLD
 * Phase:    3
 *
 * Purpose:  NON-NEGOTIABLE tests for voice-related tenets.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import { describe, it } from 'vitest';

describe('Tenet 2 - score persists, audio evaporates', () => {
  it.todo('voice_sessions row created with transcript_expires_at = now+24h');
  it.todo('audio is never written to disk during normal operation');
  it.todo('audio-decay cron purges expired audio');
  it.todo('prosody readings persist after audio is purged');
});

describe('Tenet 1 - capture by observation, not interrogation', () => {
  it.todo('pre-arrival voice prompts are gracious, never survey-style');
  it.todo('Trip Brief never contains a survey-style question');
});
