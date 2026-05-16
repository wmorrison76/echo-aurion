/**
 * ===========================================================================
 * ResonanceErrorBoundary — keeps a single tile's crash from killing the floor
 * ===========================================================================
 * Layer:    Resonance (UI)
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  React error boundary for the resonance frontend surface. Without
 *           one, a thrown error inside a SparklineTile, an InterventionCard,
 *           or any descendant kills the entire dashboard with a white-screen
 *           "Something went wrong" — the GM cannot do their job.
 *
 *           Wrap each tile, each card, and the dashboard root. A crash in one
 *           tile becomes a small "couldn't render this guest" placeholder;
 *           the rest of the floor stays live.
 *
 *           Doctrine alignment (Silent Service §5.2.2):
 *             - the system speaks honestly when something goes wrong
 *             - operator-facing copy in working voice, not "Error 500"
 *             - retry is offered without forcing a page reload
 *
 *           Logs the error to console + Sentry-shaped console.error so the
 *           existing Sentry handler picks it up. The component does not
 *           import Sentry directly to keep the bundle lean and the test
 *           harness simple.
 * ===========================================================================
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

interface ResonanceErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional fallback render fn; receives the error and a reset() helper. */
  fallback?: (args: { error: Error; reset: () => void }) => React.ReactNode;
  /** Optional name used in console logs and the default fallback heading. */
  label?: string;
  /** Called when an error is caught. Useful for telemetry hooks in tests. */
  onError?: (error: Error, info: React.ErrorInfo) => void;
  className?: string;
}

interface ResonanceErrorBoundaryState {
  error: Error | null;
}

export class ResonanceErrorBoundary extends React.Component<
  ResonanceErrorBoundaryProps,
  ResonanceErrorBoundaryState
> {
  state: ResonanceErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ResonanceErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const label = this.props.label ?? 'ResonanceErrorBoundary';
    // eslint-disable-next-line no-console -- intentional structured log for Sentry pickup
    console.error(`[${label}] caught error`, {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const fallback = this.props.fallback;
    if (fallback) return fallback({ error, reset: this.reset });

    const label = this.props.label ?? 'this view';
    return (
      <div
        role="alert"
        className={cn(
          'flex flex-col items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300',
          this.props.className,
        )}
      >
        <span>Couldn't render {label}.</span>
        <span className="text-xs text-rose-700/80 dark:text-rose-300/80">
          {error.message}
        </span>
        <button
          type="button"
          onClick={this.reset}
          className="mt-1 rounded-md border border-rose-500/40 px-2 py-0.5 text-xs hover:bg-rose-500/20"
        >
          Retry
        </button>
      </div>
    );
  }
}
