/**
 * ===========================================================================
 * Trust engine - INTERNAL fraud detection
 * ===========================================================================
 * Layer:    Substrate: Trust
 * Status:   SCAFFOLD
 * Phase:    3
 *
 * Purpose:  Computes the bidirectional trust score. Output drives what Echo decides NOT to do.
 *
 * Pending implementation:
 *   - [ ] Implement compute() across the three axes
 *   - [ ] Lint enforcement: this module never imports from guest-facing route handlers
 *   - [ ] Test that score is never serialized in any guest-bound response
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { TrustScore } from '../../../shared/types/trust';
import type { GuestId } from '../../../shared/types/base';

/**
 * WARNING - TENET 4: This score is INVISIBLE to guests.
 * Never serialize in any API response to a guest-facing client.
 * Triggers what Echo decides NOT to do, never a confrontation.
 */
export class TrustEngine {
  async compute(guestId: GuestId): Promise<TrustScore> {
    // TODO Phase 3
    throw new Error('Not implemented (Phase 3)');
  }
}

export const trustEngine = new TrustEngine();
