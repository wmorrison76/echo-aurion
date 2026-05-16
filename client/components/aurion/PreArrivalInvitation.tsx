/**
 * ===========================================================================
 * Pre-arrival invitation card
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED
 * Phase:    3
 *
 * Purpose:  Master doc §5.2.1: at T-3 days the guest app surfaces an
 *           invitation to an opt-in voice conversation. Two buttons:
 *           accept (calls onAccept which routes to the live voice screen),
 *           dismiss (silent removal, no follow-up). Tenet 1: never asks
 *           a question — frames the offer as a courtesy, not a query.
 * ===========================================================================
 */

import * as React from 'react';
import { cn } from '../../lib/utils';
import { startPreArrivalConversation, dismissPreArrivalInvitation, AurionApiError } from '../../lib/aurion/api';

export interface PreArrivalInvitationProps {
  tripId: string;
  /** Called with the new sessionId after a successful start. */
  onAccept?: (sessionId: string) => void;
  onDismiss?: () => void;
  className?: string;
}

export const PreArrivalInvitation: React.FC<PreArrivalInvitationProps> = (props) => {
  const { tripId, onAccept, onDismiss, className } = props;
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState(false);

  if (hidden) return null;

  const handleAccept = async () => {
    setBusy(true);
    setError(null);
    try {
      const { sessionId } = await startPreArrivalConversation(tripId);
      setHidden(true);
      onAccept?.(sessionId);
    } catch (err) {
      setError(err instanceof AurionApiError ? err.message : 'Could not start the conversation.');
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = async () => {
    setBusy(true);
    try {
      await dismissPreArrivalInvitation(tripId).catch(() => {
        /* dismiss is fire-and-forget; UI hides regardless */
      });
      setHidden(true);
      onDismiss?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm',
        className,
      )}
      aria-label="Pre-arrival voice invitation"
    >
      <div>
        <h2 className="text-base font-medium text-foreground">A short call before you arrive.</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Two to four minutes with Aurion. We talk about the trip in your own words. Anything you
          mention shapes the stay. Anything you'd rather skip stays unmentioned.
        </p>
      </div>
      {error && (
        <p className="text-xs text-rose-700 dark:text-rose-300" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void handleAccept()}
          disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Start the call
        </button>
        <button
          type="button"
          onClick={() => void handleDismiss()}
          disabled={busy}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
        >
          Not this time
        </button>
      </div>
    </article>
  );
};
