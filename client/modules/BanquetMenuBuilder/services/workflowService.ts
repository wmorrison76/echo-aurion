/**
 * services/workflowService.ts
 * ----------------------------------------------------------------------------
 * Workflow stage management. Wraps the LUCCCA Decision Clearance Algorithm
 * (DCA) for stage transitions.
 *
 * Stages: draft → review → approved → published → archived
 *
 * Each transition is gated by DCA rules:
 *   - draft → review:    menu has at least 1 item, no critical critique findings
 *   - review → approved: required reviewers signed off
 *   - approved → publish: brand overlay configured, dietary disclosures present
 *   - any → archived:    explicit user action, no gates
 *
 * The DCA layer is provided by LUCCCA core. This service translates
 * BanquetMenuBuilder-specific gates into DCA queries.
 *
 * Why a service:
 *   The transition logic is non-trivial and shared between the workflow
 *   bar UI, the publish pipeline (which auto-triggers on publish), and
 *   the audit log. Centralizing prevents inconsistent gate enforcement.
 * ----------------------------------------------------------------------------
 */

import type {
  WorkflowState,
  WorkflowStage,
  StageTransitionRequest,
  StageTransitionResult,
} from '../BanquetMenuBuilder.p5.types';
import type { CompositionSnapshot } from '../hooks/useMenuComposition';

// ----------------------------------------------------------------------------
// Stage graph
// ----------------------------------------------------------------------------

const STAGE_ORDER: Record<WorkflowStage, number> = {
  draft: 0,
  review: 1,
  approved: 2,
  published: 3,
  archived: 4,
};

const ALLOWED_TRANSITIONS: Record<WorkflowStage, WorkflowStage[]> = {
  draft: ['review', 'archived'],
  review: ['draft', 'approved', 'archived'],
  approved: ['review', 'published', 'archived'],
  published: ['archived'],
  archived: ['draft'], // un-archive returns to draft
};

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Validate whether a transition is allowed given current menu state.
 * Returns success=true and the new state if the gates pass.
 */
export async function attemptTransition(
  current: WorkflowState,
  request: StageTransitionRequest,
  composition: CompositionSnapshot,
): Promise<StageTransitionResult> {
  // Topological allowance check
  if (!ALLOWED_TRANSITIONS[current.currentStage].includes(request.toStage)) {
    return {
      success: false,
      blockedReason: `Cannot transition from ${current.currentStage} directly to ${request.toStage}.`,
    };
  }

  // Gate evaluation
  const gates = evaluateGatesForTransition(request.toStage, composition);
  const failed = gates.filter((g) => !g.passed);

  if (failed.length > 0) {
    return {
      success: false,
      blockedReason: failed[0].message,
      failedGates: failed.map((g) => g.id),
    };
  }

  // Build new state
  const newState: WorkflowState = {
    ...current,
    currentStage: request.toStage,
    history: [
      ...current.history,
      {
        stage: request.toStage,
        enteredAt: new Date().toISOString(),
        enteredBy: request.initiatedBy,
        note: request.note,
      },
    ],
  };

  // Stage-specific state cleanup
  if (request.toStage === 'draft' && current.currentStage === 'review') {
    // Returning to draft clears pending approvals
    newState.approvals = [];
    newState.rejections = [];
    newState.pendingApprovers = undefined;
  }

  return { success: true, newState };
}

/**
 * Read-only check — what gates would block a transition without
 * attempting it. Used by the workflow bar UI to disable buttons in
 * advance.
 */
export function checkGates(
  toStage: WorkflowStage,
  composition: CompositionSnapshot,
): GateResult[] {
  return evaluateGatesForTransition(toStage, composition);
}

/**
 * Initial state for a brand-new menu.
 */
export function createInitialWorkflowState(createdBy: string): WorkflowState {
  return {
    currentStage: 'draft',
    history: [
      {
        stage: 'draft',
        enteredAt: new Date().toISOString(),
        enteredBy: createdBy,
      },
    ],
  };
}

/**
 * Record an approval. Doesn't transition the stage — just adds the
 * approval. The transition happens when all required approvers have
 * signed off (UI calls attemptTransition then).
 */
export function recordApproval(
  state: WorkflowState,
  approver: string,
  note?: string,
): WorkflowState {
  return {
    ...state,
    approvals: [
      ...(state.approvals ?? []),
      {
        reviewer: approver,
        approvedAt: new Date().toISOString(),
        note,
      },
    ],
  };
}

export function recordRejection(
  state: WorkflowState,
  rejector: string,
  reason: string,
): WorkflowState {
  return {
    ...state,
    rejections: [
      ...(state.rejections ?? []),
      {
        reviewer: rejector,
        rejectedAt: new Date().toISOString(),
        reason,
      },
    ],
  };
}

// ----------------------------------------------------------------------------
// Gate evaluation
// ----------------------------------------------------------------------------

interface GateResult {
  id: string;
  passed: boolean;
  message: string;
}

function evaluateGatesForTransition(
  toStage: WorkflowStage,
  composition: CompositionSnapshot,
): GateResult[] {
  switch (toStage) {
    case 'review':
      return gatesForReview(composition);
    case 'approved':
      return gatesForApproved(composition);
    case 'published':
      return gatesForPublished(composition);
    case 'draft':
    case 'archived':
      return []; // no gates
    default:
      return [];
  }
}

function gatesForReview(c: CompositionSnapshot): GateResult[] {
  return [
    {
      id: 'has-items',
      passed: c.itemCount > 0,
      message: 'Menu must have at least one item before review.',
    },
    {
      id: 'no-empty-sections',
      passed: c.sections.every((s) => s.items.length > 0),
      message: 'All sections must have items, or be removed.',
    },
  ];
}

function gatesForApproved(c: CompositionSnapshot): GateResult[] {
  return [
    {
      id: 'budget-defined',
      passed: c.budgetPerGuest > 0,
      message: 'Budget per guest must be set before approval.',
    },
    {
      id: 'guest-count-defined',
      passed: c.guestCount > 0,
      message: 'Guest count must be set before approval.',
    },
    {
      id: 'within-budget-tolerance',
      passed: c.budgetPerGuest === 0 || c.perGuestCost <= c.budgetPerGuest * 1.05,
      message: 'Menu cost exceeds budget by more than 5%. Adjust before approval.',
    },
  ];
}

function gatesForPublished(c: CompositionSnapshot): GateResult[] {
  return [
    {
      id: 'load-feasible',
      passed: c.loadLevel !== 'extreme',
      message: 'Operational load is extreme. Verify staffing or reduce scope before publishing.',
    },
    {
      id: 'no-unresolved-bottlenecks',
      passed: !c.bottleneckStations || c.bottleneckStations.length === 0,
      message: `Resolve station bottlenecks before publishing: ${(c.bottleneckStations ?? []).join(', ')}.`,
    },
  ];
}

// ----------------------------------------------------------------------------
// Stage display helpers
// ----------------------------------------------------------------------------

export const STAGE_LABELS: Record<WorkflowStage, string> = {
  draft: 'Draft',
  review: 'In Review',
  approved: 'Approved',
  published: 'Published',
  archived: 'Archived',
};

export const STAGE_DESCRIPTIONS: Record<WorkflowStage, string> = {
  draft: 'Working menu, freely editable.',
  review: 'Awaiting reviewer approval. Menu is locked from major edits.',
  approved: 'Approved for publishing.',
  published: 'Published to all configured surfaces.',
  archived: 'Closed and read-only.',
};

export function isStageBefore(a: WorkflowStage, b: WorkflowStage): boolean {
  return STAGE_ORDER[a] < STAGE_ORDER[b];
}
