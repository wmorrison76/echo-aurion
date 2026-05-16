/**
 * CritiqueMode.tsx
 * ----------------------------------------------------------------------------
 * Critique mode: Echo reviews the current menu and surfaces issues
 * organized by category (pricing, dietary, operational, balance).
 *
 * Key behavior:
 *   - When opened from a hint card, `context` carries `{ focusSignalId }`
 *     and we scroll to / highlight that issue first.
 *   - Each finding has an action: "Show items", "Open detail", or
 *     "Suggest fix" (which switches drawer to compose mode prefilled).
 *
 * The findings come from echoCritiqueService, which combines:
 *   - Pkg 3 deterministic signals (already structured)
 *   - LLM-augmented narrative for the "why this matters" prose
 * ----------------------------------------------------------------------------
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMenuComposition } from '../../hooks/useMenuComposition';
import { useEchoOrb } from '../../hooks/useEchoOrb';
import { runEchoCritique, type CritiqueFinding } from '../../services/echoCritiqueService';
import { logEchoInteraction } from '../../services/echoAuditLogger';

interface CritiqueModeProps {
  context: unknown;
}

const CATEGORY_LABELS: Record<CritiqueFinding['category'], string> = {
  pricing: 'Pricing',
  dietary: 'Dietary',
  operational: 'Kitchen',
  balance: 'Balance',
  other: 'Other',
};

export const CritiqueMode: React.FC<CritiqueModeProps> = ({ context }) => {
  const composition = useMenuComposition();
  const setOrbState = useEchoOrb((s) => s.setOrbState);
  const setDrawerMode = useEchoOrb((s) => s.setDrawerMode);
  const openDrawer = useEchoOrb((s) => s.openDrawer);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState<CritiqueFinding[]>([]);
  const [headline, setHeadline] = useState<string>('');

  const focusSignalId = (context as { focusSignalId?: string } | null)?.focusSignalId;
  const focusedRef = useRef<HTMLLIElement | null>(null);

  const runCritique = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOrbState('thinking');
    try {
      const result = await runEchoCritique({
        composition: composition.snapshot(),
      });
      setFindings(result.findings);
      setHeadline(result.headline);
      logEchoInteraction({
        mode: 'critique',
        inputSummary: '(menu state)',
        outputCount: result.findings.length,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
      setOrbState('idle');
    }
  }, [composition, setOrbState]);

  useEffect(() => {
    void runCritique();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to focused signal when findings load
  useEffect(() => {
    if (!focusSignalId || findings.length === 0) return;
    const id = requestAnimationFrame(() => {
      focusedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(id);
  }, [findings, focusSignalId]);

  const grouped = groupFindings(findings);

  const handleSuggestFix = useCallback(
    (finding: CritiqueFinding) => {
      // Switch to compose mode with this finding as context
      openDrawer('compose', { fixForFinding: finding });
    },
    [openDrawer],
  );

  return (
    <div className="bmb-echo-mode bmb-echo-mode--critique">
      {headline && !loading && (
        <p className="bmb-echo-mode__summary">{headline}</p>
      )}

      {loading && (
        <div className="bmb-echo-loading" aria-live="polite">
          <div className="bmb-echo-loading__shimmer" />
          <p className="bmb-echo-loading__text">Echo is reviewing…</p>
        </div>
      )}

      {error && (
        <div className="bmb-echo-mode__error" role="alert">
          {error}
          <button
            type="button"
            className="bmb-echo-mode__retry"
            onClick={() => void runCritique()}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && findings.length === 0 && (
        <div className="bmb-echo-mode__empty-success">
          <p>No issues detected. The menu looks balanced.</p>
        </div>
      )}

      {!loading &&
        !error &&
        Object.entries(grouped).map(([category, items]) => (
          <section key={category} className="bmb-echo-critique__group">
            <h3 className="bmb-echo-critique__group-title">
              {CATEGORY_LABELS[category as CritiqueFinding['category']]}
              <span className="bmb-echo-critique__group-count">{items.length}</span>
            </h3>
            <ul className="bmb-echo-critique__list">
              {items.map((f) => (
                <li
                  key={f.id}
                  ref={f.id === focusSignalId ? focusedRef : undefined}
                  className={[
                    'bmb-echo-critique__finding',
                    `bmb-echo-critique__finding--${f.severity}`,
                    f.id === focusSignalId
                      ? 'bmb-echo-critique__finding--focused'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="bmb-echo-critique__row1">
                    <h4 className="bmb-echo-critique__title">{f.title}</h4>
                    <span
                      className={`bmb-echo-critique__severity bmb-echo-critique__severity--${f.severity}`}
                    >
                      {f.severity}
                    </span>
                  </div>
                  <p className="bmb-echo-critique__body">{f.body}</p>
                  {f.affectedItemNames && f.affectedItemNames.length > 0 && (
                    <p className="bmb-echo-critique__affected">
                      Affects: {f.affectedItemNames.join(', ')}
                    </p>
                  )}
                  {f.canSuggestFix && (
                    <div className="bmb-echo-critique__actions">
                      <button
                        type="button"
                        className="bmb-echo-btn bmb-echo-btn--ghost"
                        onClick={() => handleSuggestFix(f)}
                      >
                        Suggest fix
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

      {!loading && !error && findings.length > 0 && (
        <div className="bmb-echo-mode__refresh-row">
          <button
            type="button"
            className="bmb-echo-btn bmb-echo-btn--ghost"
            onClick={() => void runCritique()}
          >
            Re-review
          </button>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function groupFindings(findings: CritiqueFinding[]): Record<string, CritiqueFinding[]> {
  const out: Record<string, CritiqueFinding[]> = {};
  // Order categories deterministically
  const order: CritiqueFinding['category'][] = [
    'pricing',
    'dietary',
    'operational',
    'balance',
    'other',
  ];
  for (const cat of order) out[cat] = [];
  for (const f of findings) {
    if (!out[f.category]) out[f.category] = [];
    out[f.category].push(f);
  }
  // Drop empty
  for (const k of Object.keys(out)) {
    if (out[k].length === 0) delete out[k];
  }
  return out;
}
