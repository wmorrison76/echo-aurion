/**
 * ===========================================================================
 * Credit engine - service credit and dormant-balance redemption
 * ===========================================================================
 * Layer:    Substrate: Trust
 * Status:   STUB
 * Phase:    5
 *
 * Purpose:  Auto-mints recovery credits. Suggests dormant-loyalty redemptions as ambient delight, not sales.
 *
 * Pending implementation:
 *   - [ ] mintRecoveryCredit() with auto-issue on triggering events (delay, broken AC, etc.)
 *   - [ ] getLoyaltyBalance() integrating with existing loyalty programs (Marriott, Hilton, etc.)
 *   - [ ] suggestRedemption() when proposed expense matches dormant balance
 *   - [ ] GM dashboard summary: credits issued today, this week
 *   - [ ] Spike detection: rate of credit issuance signals upstream operational issue
 *   - [ ] Definition of Done: a delayed arrival auto-issues a credit; guest sees a thank-you-not-an-apology; credit is consumed at spa, P&L impact tracked
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type {
  ServiceCredit,
  LoyaltyBalance,
  RedemptionSuggestion,
  CreditOrigin,
} from '../../../shared/types/trust';
import type { GuestId, Money } from '../../../shared/types/base';

export interface MintArgs {
  guestId: GuestId;
  amount: Money;
  origin: CreditOrigin;
  reason: string;
  expiresAfterDays?: number;
}

export class CreditEngine {
  /** Issue a credit to a guest. Auto-triggered by service-recovery events. */
  async mintRecoveryCredit(args: MintArgs): Promise<ServiceCredit> {
    throw new Error('Not implemented (Phase 5)');
  }

  /** Pull current loyalty balance from the integrated loyalty program. */
  async getLoyaltyBalance(guestId: GuestId): Promise<LoyaltyBalance | null> {
    throw new Error('Not implemented (Phase 5)');
  }

  /** Should this guest see a "your points cover this" suggestion right now? */
  async suggestRedemption(guestId: GuestId, forRequest: string, costAmount: Money): Promise<RedemptionSuggestion | null> {
    throw new Error('Not implemented (Phase 5)');
  }

  /** Daily summary for the GM dashboard. */
  async dailySummary(propertyId: string): Promise<{ creditsIssued: number; totalAmount: Money; spikeAlert?: string }> {
    throw new Error('Not implemented (Phase 5)');
  }
}

export const creditEngine = new CreditEngine();
