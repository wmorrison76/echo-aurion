/**
 * hooks/useWorkflow.ts
 * ----------------------------------------------------------------------------
 * Manages the menu's workflow state and exposes transition actions.
 *
 * State persistence:
 *   The workflow state lives alongside the menu document. The hook
 *   accepts an initial state (from the persisted menu) and an onChange
 *   callback to write updates back to the menu.
 *
 * Why a hook (not zustand):
 *   Workflow state is per-menu, not global. A user editing menu A and
 *   menu B in different tabs has different workflow states. Component-
 *   local state (with persistence callback) is the right shape.
 * ----------------------------------------------------------------------------
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  WorkflowState,
  WorkflowStage,
  StageTransitionResult,
} from '../BanquetMenuBuilder.p5.types';
import type { CompositionSnapshot } from '../hooks/useMenuComposition';
import {
  attemptTransition,
  checkGates,
  recordApproval,
  recordRejection,
  createInitialWorkflowState,
} from '../services/workflowService';

interface UseWorkflowOptions {
  /** Initial state from persisted menu */
  initial?: WorkflowState;
  /** Identifier for who's making changes (audit trail) */
  currentUserId: string;
  /** Persistence callback — fires after successful transition */
  onChange?: (state: WorkflowState) => void;
}

interface UseWorkflowResult {
  state: WorkflowState;
  /** Quick access to current stage */
  stage: WorkflowStage;
  /** Stages reachable from current — filtered by allowed transitions only */
  availableTransitions: WorkflowStage[];
  /** Transition request — returns full result */
  transition: (
    toStage: WorkflowStage,
    composition: CompositionSnapshot,
    note?: string,
  ) => Promise<StageTransitionResult>;
  /** Check gates without transitioning */
  checkTransition: (toStage: WorkflowStage, composition: CompositionSnapshot) => GateCheck;
  /** Approve current stage (typically used in 'review') */
  approve: (note?: string) => void;
  /** Reject current stage with reason */
  reject: (reason: string) => void;
  /** Reset to a fresh draft state — used on new menu */
  reset: () => void;
}

interface GateCheck {
  passed: boolean;
  failedGates: Array<{ id: string; message: string }>;
}

const STAGE_GRAPH: Record<WorkflowStage, WorkflowStage[]> = {
  draft: ['review', 'archived'],
  review: ['draft', 'approved', 'archived'],
  approved: ['review', 'published', 'archived'],
  published: ['archived'],
  archived: ['draft'],
};

export function useWorkflow(options: UseWorkflowOptions): UseWorkflowResult {
  const [state, setState] = useState<WorkflowState>(
    () => options.initial ?? createInitialWorkflowState(options.currentUserId),
  );

  const persistedSetState = useCallback(
    (next: WorkflowState) => {
      setState(next);
      options.onChange?.(next);
    },
    [options],
  );

  const availableTransitions = useMemo(
    () => STAGE_GRAPH[state.currentStage] ?? [],
    [state.currentStage],
  );

  const transition = useCallback(
    async (
      toStage: WorkflowStage,
      composition: CompositionSnapshot,
      note?: string,
    ): Promise<StageTransitionResult> => {
      const result = await attemptTransition(
        state,
        {
          fromStage: state.currentStage,
          toStage,
          initiatedBy: options.currentUserId,
          note,
        },
        composition,
      );
      if (result.success && result.newState) {
        persistedSetState(result.newState);
      }
      return result;
    },
    [state, options.currentUserId, persistedSetState],
  );

  const checkTransition = useCallback(
    (toStage: WorkflowStage, composition: CompositionSnapshot): GateCheck => {
      const gates = checkGates(toStage, composition);
      const failed = gates.filter((g) => !g.passed);
      return {
        passed: failed.length === 0,
        failedGates: failed.map((g) => ({ id: g.id, message: g.message })),
      };
    },
    [],
  );

  const approve = useCallback(
    (note?: string) => {
      const next = recordApproval(state, options.currentUserId, note);
      persistedSetState(next);
    },
    [state, options.currentUserId, persistedSetState],
  );

  const reject = useCallback(
    (reason: string) => {
      const next = recordRejection(state, options.currentUserId, reason);
      persistedSetState(next);
    },
    [state, options.currentUserId, persistedSetState],
  );

  const reset = useCallback(() => {
    persistedSetState(createInitialWorkflowState(options.currentUserId));
  }, [options.currentUserId, persistedSetState]);

  return {
    state,
    stage: state.currentStage,
    availableTransitions,
    transition,
    checkTransition,
    approve,
    reject,
    reset,
  };
}
