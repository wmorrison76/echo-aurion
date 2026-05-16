/**
 * ===========================================================================
 * Trip Brief - personalized narrative
 * ===========================================================================
 * Layer:    Voyage
 * Status:   STUB
 * Phase:    2
 *
 * Purpose:  The 2-3 paragraph narrative shown at the top of the Voyage app.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { UUID, ISODateTime } from '../base';

export interface TripBrief {
  id: UUID;
  tripId: UUID;
  composedAt: ISODateTime;
  composedBy: 'echo-deep';
  paragraphs: string[];
  callToAction?: string;
  voicePlaybackAvailable: boolean;
  supersededAt?: ISODateTime;
  supersededReason?: string;
}
