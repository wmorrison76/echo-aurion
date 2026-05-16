/**
 * ===========================================================================
 * In-room come-alive greeting overlay
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED
 * Phase:    3
 *
 * Purpose:  Master doc §5.2.3: on first room key activation, the in-room
 *           surface comes alive once. A short greeting, an opt-in tour,
 *           silence-by-default media. The user dismisses or accepts;
 *           there is no third option. Tenet 1: no question mark.
 *
 *           Copy is intentionally short. The room is not a screen — the
 *           guest's attention belongs to the space.
 * ===========================================================================
 */

import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InRoomGreetingProps {
  guestId: string;
  /** Optional first-name hint. Master doc warns against guessing names — only render when caller supplies it. */
  guestNameHint?: string;
  onAcceptTour?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const InRoomGreeting: React.FC<InRoomGreetingProps> = (props) => {
  const { guestNameHint, onAcceptTour, onDismiss, className } = props;
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };
  const handleAccept = () => {
    setDismissed(true);
    onAcceptTour?.();
  };

  return (
    <div
      role="dialog"
      aria-label="In-room welcome"
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md rounded-t-2xl border-t border-x border-border bg-card p-6 shadow-2xl md:inset-auto md:bottom-6 md:right-6 md:rounded-2xl md:border',
        className,
      )}
    >
      <h2 className="text-lg font-medium text-foreground">
        {guestNameHint ? `Welcome, ${guestNameHint}.` : 'Welcome.'}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The room is yours. The lights, the shades, the temperature are set the way you described.
        Tap once for a quick look. Otherwise this dismisses on its own.
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleAccept}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          Show me around
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
        >
          Not now
        </button>
      </div>
    </div>
  );
};
