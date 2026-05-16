/**
 * ===========================================================================
 * Prosody readings - voice tone analysis output
 * ===========================================================================
 * Layer:    Aurion
 * Status:   STUB
 * Phase:    3
 *
 * Purpose:  Structured output of voice tone analysis. Score persists, audio does not (Tenet 2).
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { UUID, ISODateTime } from '../base';
import type { AffectCoordinate } from '../resonance/reading';

export interface ProsodyReading {
  id: UUID;
  sessionId: UUID;
  capturedAt: ISODateTime;
  affect: AffectCoordinate;
  features: ProsodyFeatures;
  confidence: number;
}

export interface ProsodyFeatures {
  energyLevel: number;
  warmth: number;
  hesitation: number;
  pitchVariability: number;
  speakingRate: number;
  detectedSighs: number;
  detectedLaughs: number;
}
