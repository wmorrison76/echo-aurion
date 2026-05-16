/**
 * ===========================================================================
 * Trip - unit of guest engagement
 * ===========================================================================
 * Layer:    Voyage
 * Status:   STUB
 * Phase:    2
 *
 * Purpose:  A single visit, from booking through departure.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { UUID, ISODateTime, GuestId, PropertyId } from '../base';

export type TripStatus = 'booked' | 'pre-arrival' | 'arriving' | 'in-stay' | 'departing' | 'post-stay' | 'cancelled';

export type TripPurpose = 'leisure' | 'corporate' | 'celebration' | 'wellness' | 'family-reunion' | 'mixed';

export interface Trip {
  id: UUID;
  guestId: GuestId;
  propertyId: PropertyId;
  status: TripStatus;
  purpose: TripPurpose;
  bookedAt: ISODateTime;
  expectedArrival: ISODateTime;
  expectedDeparture: ISODateTime;
  partyMemberIds: GuestId[];
  primaryGuestId: GuestId;
  corporateBlockId?: UUID;
  currentBriefId?: UUID;
  livingPlanId?: UUID;
}
