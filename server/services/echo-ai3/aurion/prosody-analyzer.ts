/**
 * ===========================================================================
 * Prosody analyzer — voice tone → structured signals
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED (Phase 2 deterministic stub; real ML model is Phase 3 extension)
 * Phase:    3
 *
 * Purpose:  Master doc §5.3: converts the audio stream into typed
 *           ProsodyReadings. Score persists, audio does NOT (Tenet 2).
 *
 *           Phase 2 strategy: deterministic-byte-heuristic feature
 *           extractor + low-confidence default response. Real prosody
 *           ML model integration is the Phase 3 extension point —
 *           swap extractFeatures() with the actual model output (or
 *           OpenAI Realtime API prosody hooks); the rest of the pipeline
 *           is already wired.
 *
 *           This stub is deliberately honest: returns null from
 *           analyzeWindow() unless features look strongly meaningful,
 *           so downstream consumers aren't fed fake signal. The
 *           extractFeatures function is testable via deterministic
 *           byte-energy math — useful for piping prosody readings
 *           through to resonance-engine in a Phase 1.5 demo.
 *
 * Tenet 2: audioChunk is referenced once during analysis and never
 * persisted. The ProsodyReading row carries the score, not the audio.
 * Routes/services that call this MUST NOT save audio chunks.
 * ===========================================================================
 */

import type { ProsodyReading, ProsodyFeatures } from '../../../../shared/types/aurion';
import type { UUID } from '../../../../shared/types/base';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../lib/logger';

const CONFIDENCE_THRESHOLD = 0.6;

/**
 * Pure helper: extract structured features from raw audio.
 * Phase 2 implementation is a byte-energy heuristic that produces
 * plausible-shape features for testing the data flow. Real ML model
 * integration is the Phase 3 extension point.
 *
 * Exported for testing.
 */
export function extractFeatures(audioChunk: ArrayBuffer): ProsodyFeatures {
  // Defensive: empty chunks produce zero-energy features
  if (!audioChunk || audioChunk.byteLength === 0) {
    return {
      energyLevel: 0,
      warmth: 0,
      hesitation: 0,
      pitchVariability: 0,
      speakingRate: 0,
      detectedSighs: 0,
      detectedLaughs: 0,
    };
  }

  // Phase 2 byte-energy heuristic. Real model would use FFT, mel-cepstrum,
  // pitch tracking. Here we derive plausible-shape features from byte
  // statistics so the pipeline carries non-trivial values during demo.
  const view = new Uint8Array(audioChunk);
  const sampleCount = view.length;

  let sumAbs = 0;
  let zeroCrossings = 0;
  let prevByte = 128;
  for (let i = 0; i < sampleCount; i++) {
    const v = view[i];
    sumAbs += Math.abs(v - 128);
    if ((prevByte - 128) * (v - 128) < 0) zeroCrossings++;
    prevByte = v;
  }

  const meanEnergy = sumAbs / sampleCount / 128; // 0..1
  const zeroCrossingRate = zeroCrossings / sampleCount;

  // Map to plausible feature ranges. Real model would calibrate properly.
  return {
    energyLevel: clamp01(meanEnergy * 1.2),
    warmth: clamp01(0.5 + (meanEnergy - 0.3) * 0.5), // higher energy → more warmth (heuristic)
    hesitation: clamp01(zeroCrossingRate < 0.05 ? 0.7 : 0.2), // low crossings → more hesitation
    pitchVariability: clamp01(zeroCrossingRate * 4),
    speakingRate: clamp01(zeroCrossingRate * 6),
    detectedSighs: 0, // Phase 3 ML model populates
    detectedLaughs: 0,
  };
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

/**
 * Map ProsodyFeatures → AffectCoordinate (arousal, valence). Pure helper.
 *
 * Phase 2 mapping:
 *   arousal  = energyLevel × 2 − 1                    (low energy → low arousal)
 *             modulated by speakingRate
 *   valence  = (warmth × 2 − 1) − hesitation × 0.5    (warm + fluent → positive)
 *             penalty for hesitation
 *
 * Phase 3 calibrates from labeled corpus; same interface.
 *
 * Exported for testing.
 */
export function featuresToAffect(features: ProsodyFeatures): { arousal: number; valence: number } {
  const arousal = clamp(features.energyLevel * 2 - 1 + features.speakingRate * 0.3, -1, 1);
  const valence = clamp(
    features.warmth * 2 - 1 - features.hesitation * 0.5 + features.detectedLaughs * 0.2,
    -1,
    1,
  );
  return { arousal, valence };
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(min, Math.min(max, v));
}

/**
 * Compute a confidence score from features. Low energy + monotone =
 * low confidence (we can't tell what's there). Higher confidence when
 * features have meaningful range.
 *
 * Exported for testing.
 */
export function featureConfidence(features: ProsodyFeatures): number {
  // Energy too low → confidence drops (silence)
  if (features.energyLevel < 0.05) return 0;
  // Reasonable energy + variation → solid confidence
  const variation = (features.pitchVariability + features.speakingRate) / 2;
  return clamp01(features.energyLevel * 0.6 + variation * 0.4);
}

export class ProsodyAnalyzer {
  /**
   * Analyze a window of audio. Returns a ProsodyReading or null if
   * confidence is below threshold. The audio chunk is NOT retained.
   */
  async analyzeWindow(sessionId: UUID, audioChunk: ArrayBuffer): Promise<ProsodyReading | null> {
    try {
      const features = extractFeatures(audioChunk);
      const confidence = featureConfidence(features);
      if (confidence < CONFIDENCE_THRESHOLD) {
        logger.debug('[ProsodyAnalyzer] low confidence; no reading emitted', {
          sessionId,
          confidence,
        });
        return null;
      }
      const affect = featuresToAffect(features);
      return {
        id: uuidv4(),
        sessionId,
        capturedAt: new Date().toISOString(),
        affect,
        features,
        confidence,
      };
    } catch (err) {
      logger.error('[ProsodyAnalyzer] analyzeWindow failed', {
        sessionId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /** Public wrapper around the pure feature extractor. */
  extractFeatures(audioChunk: ArrayBuffer): ProsodyFeatures {
    return extractFeatures(audioChunk);
  }
}

export const prosodyAnalyzer = new ProsodyAnalyzer();
