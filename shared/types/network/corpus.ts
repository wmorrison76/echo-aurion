/**
 * ===========================================================================
 * Training corpus types - the moat
 * ===========================================================================
 * Layer:    Substrate: Network
 * Status:   STUB
 * Phase:    6
 *
 * Purpose:  Episode traces - state, action, outcome - that train future Echo-Fast and Echo-Deep models.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { UUID, ISODateTime } from '../base';

export interface TrainingEpisode {
  id: UUID;
  capturedAt: ISODateTime;
  /** Anonymized - no PII. */
  segmentKey: string;
  preState: any;        // sanitized affect coordinate + signal context
  action: any;          // intervention template id + parameters
  postState: any;       // post-affect + outcome score
  outcomeQuality: number; // 0-1
}
