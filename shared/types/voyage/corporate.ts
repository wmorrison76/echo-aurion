/**
 * ===========================================================================
 * Corporate-event auto-builder types
 * ===========================================================================
 * Layer:    Voyage
 * Status:   STUB
 * Phase:    5
 *
 * Purpose:  Calendar import and conference-aware scheduling for corporate guests.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { UUID, ISODateTime, GuestId } from '../base';

export interface CorporateBlock {
  id: UUID;
  conferenceName: string;
  organizerName: string;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  attendeeGuestIds: GuestId[];
}

export interface ConferenceSession {
  id: UUID;
  blockId: UUID;
  title: string;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  isMandatory: boolean;
  cateringProvided: boolean;
}

export interface CorporateLeisureSeed {
  guestId: GuestId;
  seededAt: ISODateTime;
  recommendedReturnDates: { start: ISODateTime; end: ISODateTime }[];
  rationale: string;
  channeledTo: 'departing-message' | 'app-card' | 'post-stay-email';
}
