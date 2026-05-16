/**
 * EchoHintCard.tsx
 * ----------------------------------------------------------------------------
 * The "ambient suggestion" floating card that surfaces a single CompositionSignal
 * from useLiveCalculations (Pkg 3). It's the lightest-weight Echo affordance —
 * no drawer, no API call, just a quick observation.
 *
 * Placement:
 *   Anchored to the upper-left of the orb. Multi-card stacks step up
 *   vertically. The host hook (useEchoHints) controls which one is current.
 *
 * Tone:
 *   info     → neutral gold edge
 *   warning  → amber edge
 *   critical → red edge
 *
 * Interaction:
 *   - Click "Show me" → callback opens the drawer in critique mode focused
 *     on this signal
 *   - Click "Dismiss" → suppresses this hint for the session
 * ----------------------------------------------------------------------------
 */

import React from 'react';

export interface EchoHint {
  id: string;
  tone: 'info' | 'warning' | 'critical';
  /** Short headline (5–8 words) */
  headline: string;
  /** Body, 1–2 sentences */
  body: string;
  /** Optional action label — defaults to "Show me" */
  actionLabel?: string;
  /** Origin signal id (for routing into critique mode) */
  signalId?: string;
}

interface EchoHintCardProps {
  hint: EchoHint;
  onAction: (hint: EchoHint) => void;
  onDismiss: (hintId: string) => void;
}

export const EchoHintCard: React.FC<EchoHintCardProps> = ({ hint, onAction, onDismiss }) => {
  return (
    <div
      className={`bmb-echo-hint bmb-echo-hint--${hint.tone}`}
      role="status"
      aria-live="polite"
    >
      <div className="bmb-echo-hint__body">
        <h4 className="bmb-echo-hint__headline">{hint.headline}</h4>
        <p className="bmb-echo-hint__text">{hint.body}</p>
      </div>
      <div className="bmb-echo-hint__actions">
        <button
          type="button"
          className="bmb-echo-hint__action bmb-echo-hint__action--primary"
          onClick={() => onAction(hint)}
        >
          {hint.actionLabel ?? 'Show me'}
        </button>
        <button
          type="button"
          className="bmb-echo-hint__action bmb-echo-hint__action--ghost"
          onClick={() => onDismiss(hint.id)}
          aria-label="Dismiss hint"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
