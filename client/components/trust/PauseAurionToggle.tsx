/**
 * ===========================================================================
 * Pause Aurion toggle — one-tap voice off
 * ===========================================================================
 * Layer:    Substrate: Trust
 * Status:   IMPLEMENTED
 * Phase:    3
 *
 * Purpose:  Master doc §8.3 / Tenet 5: single toggle. Off = no voice
 *           anywhere for this guest. Halts active sessions within the
 *           5-second target per FOUNDATION_SMOKE_TEST.md test 5.
 *
 *           Confirmation pattern: a single tap toggles. There's no
 *           multi-step modal — the master doc Silent Service register
 *           values trust over friction. If the guest changes their
 *           mind, they tap again.
 * ===========================================================================
 */

import * as React from 'react';
import { pauseAurion, resumeAurion, TrustApiError } from '../../lib/trust/api';
import { cn } from '../../lib/utils';

export interface PauseAurionToggleProps {
  /** Initial state — whether Aurion is currently paused for this guest. */
  initialPaused?: boolean;
  /** Optional callback after a successful toggle. */
  onToggled?: (paused: boolean) => void;
  className?: string;
}

export const PauseAurionToggle: React.FC<PauseAurionToggleProps> = ({
  initialPaused = false,
  onToggled,
  className,
}) => {
  const [paused, setPaused] = React.useState(initialPaused);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleToggle(): Promise<void> {
    setBusy(true);
    setError(null);
    const next = !paused;
    try {
      if (next) {
        await pauseAurion();
      } else {
        await resumeAurion();
      }
      setPaused(next);
      onToggled?.(next);
    } catch (err) {
      const message = err instanceof TrustApiError ? err.message : 'Could not change Aurion state.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-4">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-foreground">Voice</h3>
          <p className="text-xs text-muted-foreground">
            {paused
              ? 'Aurion is paused. Tap to resume voice across this stay.'
              : "Aurion's voice is on. Tap to pause everything that uses your voice."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!paused}
          aria-label={paused ? 'Resume Aurion voice' : 'Pause Aurion voice'}
          onClick={handleToggle}
          disabled={busy}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
            paused ? 'bg-muted' : 'bg-primary',
            busy && 'opacity-50 cursor-not-allowed',
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform',
              paused ? 'translate-x-0.5' : 'translate-x-5',
            )}
          />
        </button>
      </div>
      {error && (
        <p className="text-xs text-rose-700 dark:text-rose-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
