/**
 * ===========================================================================
 * Living Plan - editable timeline
 * ===========================================================================
 * Layer:    Voyage
 * Status:   STUB
 * Phase:    2
 *
 * Purpose:  Blocks (confirmed, held, suggested) that compose a trip timeline.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { UUID, ISODateTime } from '../base';

export type BlockClass = 'confirmed' | 'held' | 'suggested';
export type BlockKind = 'travel-arrival' | 'travel-departure' | 'meal' | 'spa'
  | 'activity' | 'meeting' | 'rest' | 'free-time';

export interface PlanBlock {
  id: UUID;
  tripId: UUID;
  class: BlockClass;
  kind: BlockKind;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  title: string;
  venueId?: UUID;
  partyMemberIds?: UUID[];
  source: 'guest' | 'aurion-suggested' | 'corporate-import' | 'staff';
  proposedAt: ISODateTime;
  heldUntil?: ISODateTime;
  suggestionCopy?: string;
}

export interface LivingPlan {
  id: UUID;
  tripId: UUID;
  lastUpdatedAt: ISODateTime;
  blocks: PlanBlock[];
}
