/**
 * components/Workflow/StageTransitionModal.tsx
 * ----------------------------------------------------------------------------
 * Confirmation dialog for stage transitions. Shows:
 *   - The transition (from → to)
 *   - Gate status (pass/fail) for the target stage
 *   - Optional note field for audit log
 *   - Reject path (when transitioning forward, optional reject button)
 *
 * If gates fail, the Confirm button is disabled and the failed gates are
 * listed with explanations.
 * ----------------------------------------------------------------------------
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { WorkflowStage, StageTransitionResult } from '../../BanquetMenuBuilder.p5.types';
import type { CompositionSnapshot } from '../../hooks/useMenuComposition';
import type { useWorkflow } from '../../hooks/useWorkflow';
import { STAGE_LABELS, STAGE_DESCRIPTIONS } from '../../services/workflowService';

interface StageTransitionModalProps {
  fromStage: WorkflowStage;
  toStage: WorkflowStage;
  composition: CompositionSnapshot;
  workflow: ReturnType<typeof useWorkflow>;
  onClose: () => void;
  onConfirmed: (toStage: WorkflowStage) => Promise<StageTransitionResult>;
}

export const StageTransitionModal: React.FC<StageTransitionModalProps> = ({
  fromStage,
  toStage,
  composition,
  workflow,
  onClose,
  onConfirmed,
}) => {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Esc to close
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onClose]);

  // Initial focus
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>(
        '[data-autofocus="true"]',
      );
      target?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const gateCheck = useMemo(
    () => workflow.checkTransition(toStage, composition),
    [workflow, toStage, composition],
  );

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await onConfirmed(toStage);
      if (!result.success) {
        setError(result.blockedReason ?? 'Transition blocked.');
        setIsSubmitting(false);
      }
      // success path: parent handles closing
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsSubmitting(false);
    }
  };

  const handleReject = () => {
    if (!note.trim()) {
      setError('Please provide a reason for rejection.');
      return;
    }
    workflow.reject(note);
    onClose();
  };

  // For approvals (review → approved), show approve button
  const isApprovalTransition = fromStage === 'review' && toStage === 'approved';

  return (
    <div
      className="bmb-stage-modal__backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="bmb-stage-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stage-modal-title"
      >
        <header className="bmb-stage-modal__header">
          <h3 id="stage-modal-title" className="bmb-stage-modal__title">
            {isApprovalTransition ? 'Approve menu' : 'Move to next stage'}
          </h3>
          <button
            type="button"
            className="bmb-stage-modal__close"
            onClick={onClose}
            aria-label="Close transition dialog"
          >
            ×
          </button>
        </header>

        <div className="bmb-stage-modal__transition">
          <span className="bmb-stage-modal__stage bmb-stage-modal__stage--from">
            {STAGE_LABELS[fromStage]}
          </span>
          <span className="bmb-stage-modal__arrow" aria-hidden="true">
            →
          </span>
          <span
            className={[
              'bmb-stage-modal__stage bmb-stage-modal__stage--to',
              gateCheck.passed
                ? 'bmb-stage-modal__stage--ok'
                : 'bmb-stage-modal__stage--blocked',
            ].join(' ')}
          >
            {STAGE_LABELS[toStage]}
          </span>
        </div>

        <p className="bmb-stage-modal__description">
          {STAGE_DESCRIPTIONS[toStage]}
        </p>

        {/* Gate display */}
        {gateCheck.failedGates.length > 0 && (
          <div className="bmb-stage-modal__gates">
            <h4 className="bmb-stage-modal__gates-title">
              Resolve before proceeding:
            </h4>
            <ul className="bmb-stage-modal__gates-list">
              {gateCheck.failedGates.map((g) => (
                <li key={g.id} className="bmb-stage-modal__gate-fail">
                  <span className="bmb-stage-modal__gate-icon" aria-hidden="true">
                    ⚠
                  </span>
                  {g.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {gateCheck.passed && (
          <div className="bmb-stage-modal__gates bmb-stage-modal__gates--ok">
            <span className="bmb-stage-modal__gate-pass-icon" aria-hidden="true">
              ✓
            </span>
            All requirements met.
          </div>
        )}

        {/* Note */}
        <label className="bmb-stage-modal__note-field">
          <span className="bmb-stage-modal__note-label">
            Note (optional, recorded in audit log)
          </span>
          <textarea
            className="bmb-stage-modal__note-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={
              isApprovalTransition
                ? 'Approval note — e.g., "GM approved, save for printing tomorrow"'
                : 'Optional context for the audit trail'
            }
            data-autofocus="true"
          />
        </label>

        {error && (
          <div className="bmb-stage-modal__error" role="alert">
            {error}
          </div>
        )}

        <footer className="bmb-stage-modal__actions">
          {/* Forward path: confirm button */}
          <button
            type="button"
            className="bmb-stage-modal__confirm"
            onClick={handleConfirm}
            disabled={!gateCheck.passed || isSubmitting}
          >
            {isSubmitting
              ? 'Working…'
              : isApprovalTransition
                ? 'Approve & advance'
                : `Move to ${STAGE_LABELS[toStage]}`}
          </button>

          {/* Reject path — only on review → approved */}
          {isApprovalTransition && (
            <button
              type="button"
              className="bmb-stage-modal__reject"
              onClick={handleReject}
              disabled={isSubmitting}
            >
              Reject
            </button>
          )}

          <button
            type="button"
            className="bmb-stage-modal__cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
};
