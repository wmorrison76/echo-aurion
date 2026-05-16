/**
 * components/Workflow/WorkflowStageBar.tsx
 * ----------------------------------------------------------------------------
 * Horizontal progression bar showing the current stage and available
 * transitions. Each stage is a step indicator. Clicking an available
 * transition opens StageTransitionModal for confirmation.
 *
 * Disabled stages (transitions not currently allowed) are visually muted.
 * Failed-gate stages show a small ⚠ icon with the reason in a tooltip.
 *
 * The bar is purely presentational — all decisions go through useWorkflow.
 * ----------------------------------------------------------------------------
 */

import React, { useState, useMemo } from 'react';
import type { WorkflowStage } from '../../BanquetMenuBuilder.p5.types';
import type { CompositionSnapshot } from '../../hooks/useMenuComposition';
import { useWorkflow } from '../../hooks/useWorkflow';
import { STAGE_LABELS, STAGE_DESCRIPTIONS } from '../../services/workflowService';
import { StageTransitionModal } from './StageTransitionModal';

interface WorkflowStageBarProps {
  workflow: ReturnType<typeof useWorkflow>;
  composition: CompositionSnapshot;
  /** Optional callback when published — used to chain into PublishPipeline */
  onPublishRequested?: () => void;
}

const STAGE_DISPLAY_ORDER: WorkflowStage[] = [
  'draft',
  'review',
  'approved',
  'published',
];

export const WorkflowStageBar: React.FC<WorkflowStageBarProps> = ({
  workflow,
  composition,
  onPublishRequested,
}) => {
  const [pendingTransition, setPendingTransition] = useState<WorkflowStage | null>(null);

  const currentStage = workflow.stage;
  const currentIndex = STAGE_DISPLAY_ORDER.indexOf(currentStage);

  // Pre-compute gate status for each potentially-reachable stage so we can
  // disable buttons and show warnings without modal interaction
  const stageStatuses = useMemo(() => {
    const result: Record<WorkflowStage, { reachable: boolean; gatesPass: boolean; firstFailedReason?: string }> = {
      draft: { reachable: false, gatesPass: true },
      review: { reachable: false, gatesPass: true },
      approved: { reachable: false, gatesPass: true },
      published: { reachable: false, gatesPass: true },
      archived: { reachable: false, gatesPass: true },
    };
    for (const stage of workflow.availableTransitions) {
      const check = workflow.checkTransition(stage, composition);
      result[stage] = {
        reachable: true,
        gatesPass: check.passed,
        firstFailedReason: check.failedGates[0]?.message,
      };
    }
    return result;
  }, [workflow, composition]);

  return (
    <div className="bmb-workflow-bar">
      <div className="bmb-workflow-bar__steps" role="list">
        {STAGE_DISPLAY_ORDER.map((stage, idx) => {
          const isCurrent = stage === currentStage;
          const isPast = idx < currentIndex && currentStage !== 'archived';
          const status = stageStatuses[stage];
          const isClickable = status.reachable;

          return (
            <React.Fragment key={stage}>
              <button
                type="button"
                role="listitem"
                className={[
                  'bmb-workflow-bar__step',
                  isCurrent ? 'bmb-workflow-bar__step--current' : '',
                  isPast ? 'bmb-workflow-bar__step--past' : '',
                  isClickable ? 'bmb-workflow-bar__step--clickable' : '',
                  status.reachable && !status.gatesPass
                    ? 'bmb-workflow-bar__step--blocked'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={!isClickable}
                onClick={() => isClickable && setPendingTransition(stage)}
                title={
                  status.reachable && !status.gatesPass
                    ? status.firstFailedReason
                    : STAGE_DESCRIPTIONS[stage]
                }
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span className="bmb-workflow-bar__step-marker">
                  {isPast ? '✓' : idx + 1}
                </span>
                <span className="bmb-workflow-bar__step-label">
                  {STAGE_LABELS[stage]}
                </span>
                {status.reachable && !status.gatesPass && (
                  <span
                    className="bmb-workflow-bar__step-warning"
                    aria-hidden="true"
                  >
                    ⚠
                  </span>
                )}
              </button>
              {idx < STAGE_DISPLAY_ORDER.length - 1 && (
                <div
                  className={[
                    'bmb-workflow-bar__connector',
                    idx < currentIndex
                      ? 'bmb-workflow-bar__connector--past'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Archived state shows separately — not in the linear flow */}
      {currentStage === 'archived' && (
        <div className="bmb-workflow-bar__archived-banner">
          This menu is archived (read-only).
          <button
            type="button"
            className="bmb-workflow-bar__archived-restore"
            onClick={() => setPendingTransition('draft')}
          >
            Restore to draft
          </button>
        </div>
      )}

      {/* Workflow note — pendingApprovers, recent rejection */}
      {workflow.state.rejections && workflow.state.rejections.length > 0 && (
        <div className="bmb-workflow-bar__rejection">
          <strong>Rejected:</strong>{' '}
          {workflow.state.rejections[workflow.state.rejections.length - 1].reason}
        </div>
      )}

      {pendingTransition && (
        <StageTransitionModal
          fromStage={currentStage}
          toStage={pendingTransition}
          composition={composition}
          workflow={workflow}
          onClose={() => setPendingTransition(null)}
          onConfirmed={async (toStage) => {
            const result = await workflow.transition(toStage, composition);
            setPendingTransition(null);
            // If publishing, chain into PublishPipeline
            if (result.success && toStage === 'published' && onPublishRequested) {
              onPublishRequested();
            }
            return result;
          }}
        />
      )}
    </div>
  );
};
