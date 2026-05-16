/**
 * ===========================================================================
 * Intervention card — the proposed action surface
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Renders one InterventionTemplate as a card with the staff
 *           context the GM needs to decide: which staff role + lead time +
 *           cost + what NOT to do, plus the historical success rate.
 *
 *           Two primary actions: Approve and Skip. Approval triggers the
 *           proposal-approval transition via useRecordApproval; the cascade
 *           bridge (Phase 1.4-ish) fans out to department-notification.
 *
 *           Master doc §4.4 / §5.2.2:
 *             - the system whispers, never broadcasts
 *             - copy reads in working voice (captain's nudge), never AI
 *               announcement
 *             - card shows DIRECTION not DIALOGUE — staff member adapts the
 *               actual words to their own register
 *
 *           Skip flow: small textarea + Cancel/Confirm. Default reason is
 *           empty; staff can record a brief why so the library learns.
 * ===========================================================================
 */

import * as React from 'react';
import type {
  InterventionExecution,
  InterventionTemplate,
} from '../../../shared/types/resonance';
import { cn } from '../../lib/utils';

export interface InterventionCardProps {
  template: InterventionTemplate;
  /** Optional execution context; if present, shows status + transitions. */
  execution?: InterventionExecution;
  onApprove: () => void;
  onSkip: (reason: string) => void;
  /** When true, all actions disable (used during in-flight mutations). */
  busy?: boolean;
  className?: string;
}

const APPROACH_LABELS: Record<InterventionTemplate['approach'], string> = {
  'active-waiting': 'Active waiting',
  'gentle-approach': 'Gentle approach',
  protective: 'Protective',
  'cascade-only': 'Cascade only',
  'voice-only': 'Voice only',
};

const EFFORT_LABELS: Record<InterventionTemplate['effort'], string> = {
  frictionless: 'Frictionless',
  light: 'Light',
  medium: 'Medium',
  heavy: 'Heavy',
};

function formatCurrency(cents: number, currency: string): string {
  if (cents === 0) return 'no marginal cost';
  try {
    const fmt = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    });
    return fmt.format(cents / 100);
  } catch {
    // Unknown currency code — fall back to a plain dollar render
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
}

function formatLeadTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min lead time`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours}h lead time` : `${hours}h ${rem}m lead time`;
}

function formatSuccessRate(rate: number, timesUsed: number): string {
  if (timesUsed === 0) return 'no track record yet';
  return `${Math.round(rate * 100)}% success across ${timesUsed} runs`;
}

export const InterventionCard: React.FC<InterventionCardProps> = ({
  template,
  execution,
  onApprove,
  onSkip,
  busy = false,
  className,
}) => {
  const [confirmingSkip, setConfirmingSkip] = React.useState(false);
  const [skipReason, setSkipReason] = React.useState('');

  const isCompleted =
    execution?.status === 'completed' || execution?.status === 'skipped';

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm',
        className,
      )}
      aria-label={`Intervention: ${template.name}`}
    >
      {/* Header */}
      <header className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{template.name}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {template.description}
          </p>
        </div>
        {execution && (
          <span
            className={cn(
              'shrink-0 rounded-md px-2 py-0.5 text-xs font-medium',
              execution.status === 'completed'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : execution.status === 'skipped'
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-amber-400/15 text-amber-700 dark:text-amber-300',
            )}
          >
            {execution.status}
          </span>
        )}
      </header>

      {/* Meta strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{APPROACH_LABELS[template.approach]}</span>
        <span aria-hidden="true">·</span>
        <span>{EFFORT_LABELS[template.effort]}</span>
        <span aria-hidden="true">·</span>
        <span>{formatLeadTime(template.leadTimeMinutes)}</span>
        <span aria-hidden="true">·</span>
        <span>{formatCurrency(template.estimatedCostCents, template.estimatedCostCurrency)}</span>
        <span aria-hidden="true">·</span>
        <span>{formatSuccessRate(template.successRate, template.timesUsed)}</span>
      </div>

      {/* Departments */}
      {template.departmentsRequired.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {template.departmentsRequired.map((dept) => (
            <span
              key={dept}
              className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              {dept}
            </span>
          ))}
        </div>
      )}

      {/* Direction (not dialogue) + proxemic guidance */}
      {(template.scriptedDirection || template.proxemicGuidance) && (
        <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
          {template.scriptedDirection && (
            <div className="text-foreground">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Direction
              </span>
              <p className="mt-1 italic">{template.scriptedDirection}</p>
            </div>
          )}
          {template.proxemicGuidance && (
            <div className={cn('text-foreground', template.scriptedDirection && 'mt-2')}>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Approach
              </span>
              <p className="mt-1">{template.proxemicGuidance}</p>
            </div>
          )}
        </div>
      )}

      {/* Do-nots */}
      {template.doNots.length > 0 && (
        <div className="rounded-md border border-rose-500/20 bg-rose-500/5 p-3 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-rose-700 dark:text-rose-300">
            Do not
          </span>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-rose-900 dark:text-rose-200">
            {template.doNots.map((dn) => (
              <li key={dn}>{dn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {!isCompleted && (
        <footer className="mt-1 flex flex-wrap items-center gap-2">
          {!confirmingSkip ? (
            <>
              <button
                type="button"
                onClick={onApprove}
                disabled={busy}
                className={cn(
                  'rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors',
                  busy ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90',
                )}
              >
                {execution ? 'Approve' : 'Propose & approve'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingSkip(true)}
                disabled={busy}
                className={cn(
                  'rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors',
                  busy ? 'opacity-50 cursor-not-allowed' : 'hover:text-foreground',
                )}
              >
                Skip
              </button>
            </>
          ) : (
            <div className="flex w-full flex-col gap-2">
              <textarea
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                placeholder="Optional — why are you skipping? (helps the library learn)"
                rows={2}
                className="resize-none rounded-md border border-border bg-background p-2 text-sm"
                aria-label="Skip reason"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSkip(skipReason.trim());
                    setConfirmingSkip(false);
                    setSkipReason('');
                  }}
                  disabled={busy}
                  className={cn(
                    'rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-foreground transition-colors',
                    busy ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/80',
                  )}
                >
                  Confirm skip
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingSkip(false);
                    setSkipReason('');
                  }}
                  disabled={busy}
                  className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </footer>
      )}
    </article>
  );
};
