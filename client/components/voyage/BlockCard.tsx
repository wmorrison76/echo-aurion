/**
 * ===========================================================================
 * Plan block card - one row in the timeline
 * ===========================================================================
 * Layer:    Voyage
 * Status:   STUB
 * Phase:    2
 *
 * Purpose:  Single block render. Shows venue, time, party members, source, suggestion copy.
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import * as React from 'react';
import type { PlanBlock } from '../../../shared/types/voyage';

export interface BlockCardProps {
  block: PlanBlock;
  onTap?: () => void;
  onConfirm?: () => void;
  onDismiss?: () => void;
}

export const BlockCard: React.FC<BlockCardProps> = (props) => {
  return null;
};
