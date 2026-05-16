/**
 * ===========================================================================
 * Voice session - guest-Aurion conversation
 * ===========================================================================
 * Layer:    Aurion
 * Status:   STUB
 * Phase:    3
 *
 * Purpose:  Pre-arrival, in-room, in-app, or staff-whisper conversational unit.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { UUID, ISODateTime, GuestId, StaffId } from '../base';
import type { ProsodyReading } from './prosody';

export type SessionContext =
  | 'pre-arrival' | 'arrival-handoff' | 'in-room-come-alive'
  | 'in-stay-ambient' | 'departure' | 'post-stay-followup' | 'staff-whisper';

export type SessionState = 'initiating' | 'connecting' | 'active' | 'paused' | 'completed' | 'failed';

export interface VoiceSession {
  id: UUID;
  guestId?: GuestId;
  staffId?: StaffId;
  context: SessionContext;
  state: SessionState;
  startedAt: ISODateTime;
  endedAt?: ISODateTime;
  durationSeconds?: number;
  voiceProfile: string;
  prosodyReadings: ProsodyReading[];
  transcript?: string;
  transcriptExpiresAt?: ISODateTime;
  outcomeSummary?: string;
}
