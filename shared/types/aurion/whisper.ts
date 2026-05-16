/**
 * ===========================================================================
 * Staff whisper - back-channel coaching
 * ===========================================================================
 * Layer:    Aurion
 * Status:   STUB
 * Phase:    4
 *
 * Purpose:  Earpiece protocol. Aurion whispers context to staff during guest interactions.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { UUID, ISODateTime, GuestId, StaffId } from '../base';

export type WhisperUrgency = 'background' | 'noticed' | 'priority' | 'urgent';

export interface StaffWhisper {
  id: UUID;
  staffId: StaffId;
  guestId: GuestId;
  triggeredAt: ISODateTime;
  urgency: WhisperUrgency;
  durationSeconds: number;
  text: string;                  // direction NOT dialogue
  doNots?: string[];
  suggestedInterventionId?: UUID;
  flaggedAsWrong?: boolean;
  staffNote?: string;
}

export interface WhisperFeedback {
  whisperId: UUID;
  staffId: StaffId;
  flag: 'helpful' | 'wrong' | 'too-late' | 'too-much';
  note?: string;
  flaggedAt: ISODateTime;
}
