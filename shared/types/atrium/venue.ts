/**
 * ===========================================================================
 * Venue page types
 * ===========================================================================
 * Layer:    Atrium
 * Status:   STUB
 * Phase:    5
 *
 * Purpose:  Structure of a venue page in the Aurion app.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { UUID } from '../base';

export type VenueKind = 'restaurant' | 'spa' | 'bar' | 'gym' | 'pool' | 'garden' | 'other';

export interface Venue {
  id: UUID;
  name: string;
  kind: VenueKind;
  shortDescription: string;
  hours: VenueHours;
  bookable: boolean;
}

export interface VenueHours {
  daysOfWeek: number[];
  open: string;
  close: string;
  exceptions?: VenueHoursException[];
}

export interface VenueHoursException {
  date: string;
  open?: string;
  close?: string;
  closed?: boolean;
  note?: string;
}

export interface VenuePage {
  venueId: UUID;
  heroAssetId: UUID;
  narrative: string;
  microDetail: string;
  primaryActions: VenueAction[];
  secondaryActions: VenueAction[];
}

export type VenueAction =
  | { kind: 'view-menu' } | { kind: 'book-reservation' } | { kind: 'add-to-itinerary' }
  | { kind: 'call-venue' } | { kind: 'see-hours' } | { kind: 'ask-aurion' };
