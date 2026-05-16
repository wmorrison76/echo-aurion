/**
 * ===========================================================================
 * Plan editor - drag/dismiss/confirm interaction logic
 * ===========================================================================
 * Layer:    Voyage
 * Status:   STUB
 * Phase:    2
 *
 * Purpose:  Pure logic for editing the Living Plan timeline. No UI - just state transitions.
 *
 * Pending implementation:
 *   - [ ] Conflict detection on overlapping blocks
 *   - [ ] Travel time computation between consecutive blocks
 *   - [ ] Optimistic update with rollback on server failure
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { LivingPlan, PlanBlock } from '../../../shared/types/voyage';

export interface PlanEditState {
  plan: LivingPlan;
  optimistic: Map<string, PlanBlock>;
  errors: Array<{ blockId: string; message: string }>;
}

export function applyAdd(state: PlanEditState, block: PlanBlock): PlanEditState {
  throw new Error('Not implemented (Phase 2)');
}

export function applyDismiss(state: PlanEditState, blockId: string): PlanEditState {
  throw new Error('Not implemented (Phase 2)');
}

export function applyEdit(state: PlanEditState, blockId: string, patch: Partial<PlanBlock>): PlanEditState {
  throw new Error('Not implemented (Phase 2)');
}

export function detectConflicts(plan: LivingPlan): Array<{ a: string; b: string }> {
  throw new Error('Not implemented (Phase 2)');
}
