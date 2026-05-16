/**
 * ===========================================================================
 * Signal - unified log entry
 * ===========================================================================
 * Layer:    Substrate: Signal Graph
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Atomic record in platform memory. Every guest interaction across every layer becomes a typed signal.
 *
 * Aligned to: server/database/migrations/012_signals.sql
 *
 * WARNING: This is the canonical type contract for the unified signal log entry.
 * Modifications require TICKET-level authorization. See ARCHITECTURE.md.
 * ===========================================================================
 */

import type { UUID, ISODate } from '../base';
import type { SignalTag } from './tag';
import type { SensitivityLevel } from './sensitivity';

export type SignalSource =
  | 'staff-whisper' | 'aurion-voice-prosody' | 'aurion-voice-content' | 'aurion-voice-tone'
  | 'voyage-tap' | 'voyage-dwell' | 'voyage-dismiss' | 'voyage-edit'
  | 'voyage-search' | 'voyage-add-to-itinerary'
  | 'atrium-video-watched' | 'atrium-action-tap'
  | 'flight-tracker' | 'weather-api' | 'calendar-import' | 'pos-event' | 'pms-event';

export type SignalConversion = 'converted' | 'considered' | 'dismissed';

export type SignalSubject =
  | { kind: 'venue'; venueId: UUID }
  | { kind: 'amenity'; amenityId: UUID }
  | { kind: 'time-slot'; start: ISODate; end: ISODate }
  | { kind: 'occasion'; occasionType: string }
  | { kind: 'menu-item'; menuItemId: UUID }
  | { kind: 'staff-member'; staffId: UUID }
  | { kind: 'free-text'; text: string };

export interface Signal {
  id: UUID;
  guestId: UUID;
  visitId: UUID | null;                  // by-design: signals can be visit-less (weather-api, flight-tracker)
  timestamp: ISODate;
  source: SignalSource;
  subject: SignalSubject;
  tags: SignalTag[];
  conversion: SignalConversion | null;   // by-design: most signals never convert
  note?: string;                         // sometimes-not-yet: optional free-text
  sensitivity: SensitivityLevel;
  expiresAt: ISODate;
  createdAt: ISODate;
}
