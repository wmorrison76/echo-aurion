/**
 * ===========================================================================
 * ResonanceReading - atomic unit of emotional intelligence
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  A single observation of a guest affective state at a point in time. The fundamental data type of the platform.
 *
 * Aligned to: server/database/migrations/008_resonance_readings.sql
 *
 * Consumed by:
 *   - server/services/echo-ai3/resonance/resonance-engine.ts
 *   - client/components/resonance/WhisperWidget.tsx
 *
 * WARNING: This is the canonical type contract for ResonanceReading - the atomic unit of emotional intelligence.
 * Modifications require TICKET-level authorization. See ARCHITECTURE.md.
 * ===========================================================================
 */

import type { UUID, ISODate } from '../base';
import type { SignalTag } from '../signals/tag';

export type ResonanceChannel = 'observation' | 'voice' | 'inferred' | 'self-reported';

/**
 * Arousal-valence circumplex of affect. Both axes -1.0 to +1.0.
 *   ( +arousal, +valence ) -> delighted, excited
 *   ( +arousal, -valence ) -> frustrated, anxious
 *   ( -arousal, +valence ) -> content, peaceful
 *   ( -arousal, -valence ) -> sad, withdrawn
 *
 * Standalone helper type. Maps 1:1 to the (arousal, valence) pair stored on
 * the resonance_readings row as two flat REAL columns. Used by score.ts for
 * affect-math signatures; not itself a row shape.
 */
export interface AffectCoordinate {
  arousal: number;   // -1.0 to +1.0
  valence: number;   // -1.0 to +1.0
}

export interface ResonanceReading {
  id: UUID;
  guestId: UUID;
  visitId: UUID | null;             // by-design: readings can occur pre-arrival
  timestamp: ISODate;
  capturedBy: UUID | 'aurion';      // SQL: TEXT NOT NULL ("staff UUID or 'aurion'")
  channel: ResonanceChannel;

  arousal: number;                  // -1.0 to +1.0; SQL: REAL NOT NULL
  valence: number;                  // -1.0 to +1.0; SQL: REAL NOT NULL
  resonance: number;                // 1-10 computed; SQL: REAL NOT NULL

  signals: SignalTag[];             // SQL: JSONB NOT NULL DEFAULT '[]'
  confidence: number;               // 0.0 to 1.0; SQL: REAL NOT NULL
  note?: string;                    // sometimes-not-yet

  expiresAt: ISODate;               // SQL: TIMESTAMPTZ NOT NULL (Tenet 2)
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type NewResonanceReading = Omit<
  ResonanceReading,
  'id' | 'timestamp' | 'expiresAt' | 'createdAt' | 'updatedAt'
>;
