/**
 * ===========================================================================
 * Delete everything — profile wipe
 * ===========================================================================
 * Layer:    Substrate: Trust
 * Status:   IMPLEMENTED
 * Phase:    3
 *
 * Purpose:  Master doc §8.3 / Tenet 5: full profile delete. Two-step
 *           confirmation pattern: the first tap reveals the consequences;
 *           the second tap commits.
 *
 *           Per Tenet 5: "The system reverts to first-visit posture.
 *           Fully reversible only by re-entering preferences."
 *
 *           Master doc operating consequence: this is the only Tenet 5
 *           control that needs friction. The other three (review,
 *           pause, export) flow without confirmation. Delete-everything
 *           is irreversible-in-system; the friction is the doctrine.
 * ===========================================================================
 */

import * as React from 'react';
import { deleteEverything, type DeleteEverythingResult, TrustApiError } from '../../lib/trust/api';
import { cn } from '../../lib/utils';

export interface DeleteEverythingProps {
  className?: string;
  /** Optional callback after a successful wipe. */
  onComplete?: (result: DeleteEverythingResult) => void;
}

export const DeleteEverything: React.FC<DeleteEverythingProps> = ({ className, onComplete }) => {
  const [stage, setStage] = React.useState<'idle' | 'confirming' | 'busy' | 'done'>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<DeleteEverythingResult | null>(null);

  async function handleConfirm(): Promise<void> {
    setStage('busy');
    setError(null);
    try {
      const r = await deleteEverything();
      setResult(r);
      setStage('done');
      onComplete?.(r);
    } catch (err) {
      setError(err instanceof TrustApiError ? err.message : 'Could not complete the delete.');
      setStage('confirming'); // back to the confirm view so they can retry
    }
  }

  if (stage === 'done' && result) {
    const total =
      result.deletedSignals +
      result.deletedReadings +
      result.deletedSessions +
      result.deletedWhispers;
    return (
      <div
        className={cn(
          'flex flex-col gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200',
          className,
        )}
        role="alert"
      >
        <h3 className="font-semibold">Everything is gone.</h3>
        <p className="text-xs">
          {total.toLocaleString()} records removed across signals, readings, sessions, and whispers.
          On your next visit you'll appear as a first-time guest.
        </p>
      </div>
    );
  }

  if (stage === 'confirming' || stage === 'busy') {
    return (
      <div
        className={cn(
          'flex flex-col gap-3 rounded-md border border-rose-500/30 bg-rose-500/10 p-4 text-sm',
          className,
        )}
      >
        <div>
          <h3 className="font-semibold text-rose-800 dark:text-rose-200">Are you sure?</h3>
          <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
            This wipes your full profile across every Aurion subsystem — signals, voice sessions, observations,
            whispers, intervention history, trajectories. We will appear to you as if we are meeting for the first time.
            This action cannot be undone.
          </p>
        </div>
        {error && (
          <p className="text-xs text-rose-900 dark:text-rose-100" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={stage === 'busy'}
            className={cn(
              'rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition-colors',
              stage === 'busy' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-rose-700',
            )}
          >
            {stage === 'busy' ? 'Deleting…' : 'Yes, delete everything'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStage('idle');
              setError(null);
            }}
            disabled={stage === 'busy'}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-md border border-border bg-card p-4',
        className,
      )}
    >
      <div>
        <h3 className="text-sm font-medium text-foreground">Delete everything</h3>
        <p className="text-xs text-muted-foreground">
          Wipe your profile entirely. We will appear to you as a first-time guest on your next visit.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setStage('confirming')}
        className="self-start rounded-md border border-rose-500/40 px-3 py-1.5 text-sm text-rose-700 dark:text-rose-300 hover:bg-rose-500/10"
      >
        Delete my profile…
      </button>
    </div>
  );
};
