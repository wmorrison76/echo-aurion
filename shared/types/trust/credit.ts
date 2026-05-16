/**
 * ===========================================================================
 * Service credit and reward redemption
 * ===========================================================================
 * Layer:    Substrate: Trust
 * Status:   STUB
 * Phase:    5
 *
 * Purpose:  Recovery currency and dormant-balance redemption logic.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { GuestId, ISODateTime, Money, UUID } from '../base';

export type CreditOrigin = 'service-recovery' | 'manual-gm-grant' | 'loyalty-redemption' | 'celebration-offer';

export interface ServiceCredit {
  id: UUID;
  guestId: GuestId;
  amount: Money;
  origin: CreditOrigin;
  reason: string;
  issuedAt: ISODateTime;
  expiresAt?: ISODateTime;
  consumedAt?: ISODateTime;
  consumedFor?: string;
}

export interface LoyaltyBalance {
  guestId: GuestId;
  pointsBalance: number;
  pointsValue: Money;
  dormantSince?: ISODateTime;
  programName: string;
}

export interface RedemptionSuggestion {
  guestId: GuestId;
  forRequest: string;
  costAmount: Money;
  pointsRequired: number;
  pointsAvailable: number;
  fullyCovered: boolean;
  partialCoverageDelta?: Money;
  copyForGuest: string;
}
