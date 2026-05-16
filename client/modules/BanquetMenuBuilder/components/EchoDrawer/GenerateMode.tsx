/**
 * GenerateMode.tsx
 * ----------------------------------------------------------------------------
 * Generate mode: Echo composes an entire menu from a brief.
 *
 * Use case:
 *   The chef sits down to start a new event. They type "Late summer
 *   wedding, 180 guests, $125pp budget, vibe is rustic Italian, bride is
 *   gluten-free." Echo proposes a complete menu — sections, items,
 *   pricing, dietary balance.
 *
 * Output is a full menu draft preview. The chef can:
 *   - Accept (replaces current menu via composition.replace)
 *   - Merge (adds non-duplicate items into current menu)
 *   - Refine (re-runs with a tweak)
 *   - Discard
 *
 * The replace path triggers a confirmation if the current menu has > 0
 * items — we don't want to nuke an in-progress menu by misclick.
 * ----------------------------------------------------------------------------
 */

import React, { useState, useCallback } from 'react';
import { useMenuComposition } from '../../hooks/useMenuComposition';
import { useEchoOrb } from '../../hooks/useEchoOrb';
import { runEchoGenerate, type GeneratedMenu } from '../../services/echoGenerateService';
import { logEchoInteraction } from '../../services/echoAuditLogger';

interface GenerateModeProps {
  context: unknown;
}

const SAMPLE_PROMPTS = [
  'Late summer wedding, 180 guests, $125 per guest, rustic Italian',
  'Corporate retreat dinner for 60, $75 per guest, plant-forward, no shellfish',
  'Holiday cocktail reception, 200 guests, $85 per guest, festive but light',
];

export const GenerateMode: React.FC<GenerateModeProps> = () => {
  const composition = useMenuComposition();
  const setOrbState = useEchoOrb((s) => s.setOrbState);
  const closeDrawer = useEchoOrb((s) => s.closeDrawer);

  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedMenu | null>(null);

  const runGenerate = useCallback(
    async (briefText: string) => {
      setLoading(true);
      setError(null);
      setOrbState('thinking');
      try {
        const result = await runEchoGenerate({ brief: briefText });
        setGenerated(result);
        logEchoInteraction({
          mode: 'generate',
          inputSummary: briefText.slice(0, 80),
          outputCount: result.sections.reduce((sum, s) => sum + s.items.length, 0),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setLoading(false);
        setOrbState('idle');
      }
    },
    [setOrbState],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (brief.trim()) void runGenerate(brief.trim());
    },
    [brief, runGenerate],
  );

  const handleAccept = useCallback(() => {
    if (!generated) return;
    const currentItemCount = composition.snapshot().itemCount;
    if (currentItemCount > 0) {
      const confirmed = window.confirm(
        `Replace the current menu with Echo's generated menu? You have ${currentItemCount} item${
          currentItemCount === 1 ? '' : 's'
        } that will be removed.`,
      );
      if (!confirmed) return;
    }
    composition.replaceWithGenerated(generated);
    closeDrawer();
    logEchoInteraction({ mode: 'generate', inputSummary: 'accept', outputCount: 1 });
  }, [generated, composition, closeDrawer]);

  const handleMerge = useCallback(() => {
    if (!generated) return;
    composition.mergeGenerated(generated);
    closeDrawer();
    logEchoInteraction({ mode: 'generate', inputSummary: 'merge', outputCount: 1 });
  }, [generated, composition, closeDrawer]);

  const handleDiscard = useCallback(() => {
    setGenerated(null);
  }, []);

  return (
    <div className="bmb-echo-mode bmb-echo-mode--generate">
      {!generated && !loading && (
        <>
          <p className="bmb-echo-mode__summary">
            Tell Echo about the event — guest count, budget, style, constraints.
            The more specific, the better the result.
          </p>

          <form className="bmb-echo-mode__brief-form" onSubmit={handleSubmit}>
            <textarea
              className="bmb-echo-mode__brief-input"
              placeholder="Describe the event…"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={5}
              data-autofocus="true"
            />
            <button
              type="submit"
              className="bmb-echo-btn bmb-echo-btn--primary bmb-echo-btn--full"
              disabled={!brief.trim()}
            >
              Generate menu
            </button>
          </form>

          <div className="bmb-echo-mode__samples">
            <p className="bmb-echo-mode__samples-label">Try one of these:</p>
            <ul className="bmb-echo-mode__samples-list">
              {SAMPLE_PROMPTS.map((p, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="bmb-echo-mode__sample"
                    onClick={() => setBrief(p)}
                  >
                    {p}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {loading && (
        <div className="bmb-echo-loading" aria-live="polite">
          <div className="bmb-echo-loading__shimmer" />
          <div className="bmb-echo-loading__shimmer bmb-echo-loading__shimmer--narrow" />
          <div className="bmb-echo-loading__shimmer" />
          <p className="bmb-echo-loading__text">Echo is composing a full menu…</p>
        </div>
      )}

      {error && (
        <div className="bmb-echo-mode__error" role="alert">
          {error}
          <button
            type="button"
            className="bmb-echo-mode__retry"
            onClick={() => void runGenerate(brief)}
          >
            Retry
          </button>
        </div>
      )}

      {generated && !loading && (
        <div className="bmb-echo-generated">
          <header className="bmb-echo-generated__header">
            <h3 className="bmb-echo-generated__title">{generated.title}</h3>
            <p className="bmb-echo-generated__meta">
              {generated.eventType} · ~{generated.estimatedPerGuest.toFixed(2)}/guest ·{' '}
              {generated.sections.reduce((n, s) => n + s.items.length, 0)} items
            </p>
            {generated.rationale && (
              <p className="bmb-echo-generated__rationale">{generated.rationale}</p>
            )}
          </header>

          <ul className="bmb-echo-generated__sections">
            {generated.sections.map((section) => (
              <li key={section.kind} className="bmb-echo-generated__section">
                <h4 className="bmb-echo-generated__section-title">{section.label}</h4>
                <ul className="bmb-echo-generated__items">
                  {section.items.map((item, idx) => (
                    <li key={`${section.kind}-${idx}`}>
                      <span className="bmb-echo-generated__item-name">{item.name}</span>
                      {item.shortDescription && (
                        <span className="bmb-echo-generated__item-desc">
                          {' — '}
                          {item.shortDescription}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <div className="bmb-echo-generated__actions">
            <button
              type="button"
              className="bmb-echo-btn bmb-echo-btn--primary"
              onClick={handleAccept}
            >
              Use as menu
            </button>
            <button
              type="button"
              className="bmb-echo-btn bmb-echo-btn--secondary"
              onClick={handleMerge}
            >
              Merge into current
            </button>
            <button
              type="button"
              className="bmb-echo-btn bmb-echo-btn--ghost"
              onClick={handleDiscard}
            >
              Start over
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
