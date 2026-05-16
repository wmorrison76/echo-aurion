/**
 * ===========================================================================
 * Trust score - INTERNAL only
 * ===========================================================================
 * Layer:    Substrate: Trust
 * Status:   STUB
 * Phase:    3
 *
 * Purpose:  Bidirectional trust score for fraud detection. INVISIBLE to guests per Tenet 4.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { GuestId, ISODateTime } from '../base';

/**
 * WARNING TENET 4: This score is INVISIBLE to guests.
 * Never serialize in any API response to a guest-facing client.
 * Triggers what Echo decides NOT to do, never a confrontation.
 */
export interface TrustScore {
  guestId: GuestId;
  computedAt: ISODateTime;
  identityCoherence: number;
  behavioralConsistency: number;
  contextualPlausibility: number;
  composite: number;
  flags: TrustFlag[];
  history: TrustScoreHistory[];
}

export interface TrustFlag {
  type: TrustFlagType;
  observedAt: ISODateTime;
  evidence: string;
  weight: number;
}

export type TrustFlagType =
  | 'inconsistent-identity-fact'
  | 'inconsistent-stated-vs-actual-preference'
  | 'pattern-outlier-suspicious'
  | 'unusual-loyalty-velocity';

export interface TrustScoreHistory {
  at: ISODateTime;
  composite: number;
  reason: string;
}
