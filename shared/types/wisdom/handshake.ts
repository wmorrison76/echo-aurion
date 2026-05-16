/**
 * ===========================================================================
 * Fast/Deep handshake protocol
 * ===========================================================================
 * Layer:    Substrate: Wisdom Engine
 * Status:   STUB
 * Phase:    1
 *
 * Purpose:  Event protocol by which Echo-Fast escalates to Echo-Deep.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { UUID, ISODateTime } from '../base';
import type { FastOutput } from './fast';
import type { DeepOutput } from './deep';

export type HandshakeReason =
  | 'lift-gap-detected' | 'voice-tone-inflected-negative'
  | 'high-vip-without-confident-playbook' | 'flagged-term-in-whisper'
  | 'novel-signal-pattern' | 'multi-department-coordination-needed';

export interface HandshakeRequest {
  id: UUID;
  fastOutput: FastOutput;
  reason: HandshakeReason;
  requestedAt: ISODateTime;
  deadlineMs: number;
}

export interface HandshakeResponse {
  requestId: UUID;
  deepOutput: DeepOutput;
  respondedAt: ISODateTime;
}
