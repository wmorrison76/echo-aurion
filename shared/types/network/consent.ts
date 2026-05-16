/**
 * ===========================================================================
 * Cross-property consent types
 * ===========================================================================
 * Layer:    Substrate: Network
 * Status:   STUB
 * Phase:    6
 *
 * Purpose:  Explicit guest consent scope for cross-property memory and aggregation.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { GuestId, ISODateTime, PropertyId } from '../base';

export type CrossPropertyScope =
  | 'this-property-only'
  | 'this-brand-only'
  | 'all-network-properties';

export interface CrossPropertyConsent {
  guestId: GuestId;
  scope: CrossPropertyScope;
  grantedAt: ISODateTime;
  revokedAt?: ISODateTime;
  permittedPropertyIds?: PropertyId[];
}
