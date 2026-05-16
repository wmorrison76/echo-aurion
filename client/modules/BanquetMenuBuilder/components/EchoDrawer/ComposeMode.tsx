/**
 * ComposeMode.tsx
 * ----------------------------------------------------------------------------
 * Compose mode: Echo proposes additions to the menu based on the current
 * composition state. Output is always actionable — each suggestion is a
 * specific item the chef can accept (which calls addItem from Pkg 3) or
 * dismiss.
 *
 * Inputs Echo considers:
 *   - Current section structure
 *   - Items already on menu
 *   - Event type, guest count, budget per guest, dietary distribution
 *   - Network percentile signals (if available)
 *
 * Output shape (from echoComposeService):
 *   {
 *     suggestions: [
 *       { itemId, itemName, sectionKind, reasoning, expectedImpact: {...} }
 *     ],
 *     summary: string
 *   }
 *
 * Loading & error UX:
 *   - First open: auto-suggest based on current state (no user input needed)
 *   - User can type "more like this", "fewer carbs", etc. for refinement
 * ----------------------------------------------------------------------------
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useMenuComposition } from '../../hooks/useMenuComposition';
import { useEchoOrb } from '../../hooks/useEchoOrb';
import { runEchoCompose, type ComposeSuggestion } from '../../services/echoComposeService';
import { logEchoInteraction } from '../../services/echoAuditLogger';

interface ComposeModeProps {
  context: unknown;
}

export const ComposeMode: React.FC<ComposeModeProps> = ({ context }) => {
  const composition = useMenuComposition();
  const setOrbState = useEchoOrb((s) => s.setOrbState);

  const [refinement, setRefinement] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ComposeSuggestion[]>([]);
  const [summary, setSummary] = useState<string>('');

  const runCompose = useCallback(
    async (refinementText?: string) => {
      setLoading(true);
      setError(null);
      setOrbState('thinking');
      try {
        const result = await runEchoCompose({
          composition: composition.snapshot(),
          refinement: refinementText,
          context,
        });
        setSuggestions(result.suggestions);
        setSummary(result.summary);
        logEchoInteraction({
          mode: 'compose',
          inputSummary: refinementText ?? '(auto)',
          outputCount: result.suggestions.length,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setLoading(false);
        setOrbState('idle');
      }
    },
    [composition, context, setOrbState],
  );

  // First-open auto-suggest
  useEffect(() => {
    void runCompose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefine = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (refinement.trim()) {
        void runCompose(refinement.trim());
      }
    },
    [refinement, runCompose],
  );

  const handleAccept = useCallback(
    (suggestion: ComposeSuggestion) => {
      // Find the section to add into. If a sectionId is provided, use it;
      // otherwise let composition.addItem auto-route by section kind.
      composition.addItem(suggestion.item, suggestion.targetSectionId);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
      logEchoInteraction({
        mode: 'compose',
        inputSummary: 'accept',
        outputCount: 1,
        acceptedItemId: suggestion.item.id,
      });
    },
    [composition],
  );

  const handleDismiss = useCallback((suggestion: ComposeSuggestion) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
  }, []);

  return (
    <div className="bmb-echo-mode bmb-echo-mode--compose">
      {summary && !loading && (
        <p className="bmb-echo-mode__summary">{summary}</p>
      )}

      {loading && <ComposeLoadingState />}

      {error && (
        <div className="bmb-echo-mode__error" role="alert">
          {error}
          <button
            type="button"
            className="bmb-echo-mode__retry"
            onClick={() => void runCompose(refinement || undefined)}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && suggestions.length > 0 && (
        <ul className="bmb-echo-suggestions">
          {suggestions.map((s) => (
            <li key={s.id} className="bmb-echo-suggestion">
              <div className="bmb-echo-suggestion__header">
                <h4 className="bmb-echo-suggestion__name">{s.item.name}</h4>
                <span className="bmb-echo-suggestion__section">
                  → {s.targetSectionLabel}
                </span>
              </div>
              {s.item.description && (
                <p className="bmb-echo-suggestion__desc">{s.item.description}</p>
              )}
              <p className="bmb-echo-suggestion__reasoning">{s.reasoning}</p>
              {s.expectedImpact && (
                <ul className="bmb-echo-suggestion__impact">
                  {s.expectedImpact.priceDeltaPerGuest !== undefined && (
                    <li>
                      Price impact:{' '}
                      {s.expectedImpact.priceDeltaPerGuest >= 0 ? '+' : ''}
                      {s.expectedImpact.priceDeltaPerGuest.toFixed(2)}/guest
                    </li>
                  )}
                  {s.expectedImpact.fillsGap && (
                    <li>Fills gap: {s.expectedImpact.fillsGap}</li>
                  )}
                </ul>
              )}
              <div className="bmb-echo-suggestion__actions">
                <button
                  type="button"
                  className="bmb-echo-btn bmb-echo-btn--primary"
                  onClick={() => handleAccept(s)}
                >
                  Add to menu
                </button>
                <button
                  type="button"
                  className="bmb-echo-btn bmb-echo-btn--ghost"
                  onClick={() => handleDismiss(s)}
                >
                  Skip
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && suggestions.length === 0 && (
        <p className="bmb-echo-mode__empty">
          No new suggestions right now. Try refining below — e.g. &quot;heavier
          on plant-forward&quot; or &quot;keep total under $85/guest&quot;.
        </p>
      )}

      <form className="bmb-echo-mode__refine" onSubmit={handleRefine}>
        <label className="bmb-echo-mode__refine-label" htmlFor="echo-refine-compose">
          Refine
        </label>
        <input
          id="echo-refine-compose"
          type="text"
          className="bmb-echo-mode__refine-input"
          placeholder="What direction should I take?"
          value={refinement}
          onChange={(e) => setRefinement(e.target.value)}
          data-autofocus="true"
        />
        <button
          type="submit"
          className="bmb-echo-btn bmb-echo-btn--primary"
          disabled={loading || !refinement.trim()}
        >
          Suggest
        </button>
      </form>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Loading state
// ----------------------------------------------------------------------------

const ComposeLoadingState: React.FC = () => (
  <div className="bmb-echo-loading" aria-live="polite">
    <div className="bmb-echo-loading__shimmer" />
    <div className="bmb-echo-loading__shimmer bmb-echo-loading__shimmer--narrow" />
    <p className="bmb-echo-loading__text">Echo is composing…</p>
  </div>
);
