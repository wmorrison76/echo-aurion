/**
 * ===========================================================================
 * Living Plan timeline - the editable calendar view
 * ===========================================================================
 * Layer:    Voyage
 * Status:   STUB
 * Phase:    2
 *
 * Purpose:  Vertical timeline of blocks. Three classes color-coded. Drag to reschedule, swipe to dismiss, tap to confirm.
 *
 * Pending implementation:
 *   - [ ] Vertical timeline layout
 *   - [ ] Block class color: solid (confirmed) / outlined (held) / dashed (suggested)
 *   - [ ] Drag-to-move with conflict detection
 *   - [ ] Swipe-to-dismiss
 *   - [ ] Tap-to-detail flyout
 *   - [ ] Every interaction emits a signal via voyageSignalRecorder
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import * as React from 'react';
import type { LivingPlan } from '../../../shared/types/voyage';

export interface LivingPlanTimelineProps {
  plan: LivingPlan;
  onBlockTap?: (blockId: string) => void;
}

export const LivingPlanTimeline: React.FC<LivingPlanTimelineProps> = (props) => {
  return null;
};
