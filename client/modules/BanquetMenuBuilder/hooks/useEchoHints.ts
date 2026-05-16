/**
 * useEchoHints.ts
 * ----------------------------------------------------------------------------
 * Reads CompositionSignal[] from useLiveCalculations (Pkg 3) and turns the
 * top-priority signal into a single floating EchoHint.
 *
 * Why "single":
 *   Stacking multiple ambient cards turns into clutter. Echo's job is to
 *   surface the ONE thing the chef should notice next. If they dismiss it,
 *   we move to the next. We never show two at once.
 *
 * Throttling:
 *   - A new hint waits MIN_INTERVAL_MS after the last one was shown
 *     (prevents jarring rapid-fire on bulk drag operations)
 *   - Dismissed hint ids stay suppressed for SUPPRESS_MS so the same hint
 *     doesn't re-pop on the next signal pass
 *
 * Priority order (highest first):
 *   1. critical
 *   2. warning
 *   3. info
 *   Within a tone, signals with higher numeric `priority` win.
 * ----------------------------------------------------------------------------
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import type { EchoHint } from '../components/EchoHints/EchoHintCard';
// NOTE: useLiveCalculations is a Pkg 3 hook. After Pkg 3 install this
// resolves at the BanquetMenuBuilder/hooks/ path.
import { useLiveCalculations } from './useLiveCalculations';

const MIN_INTERVAL_MS = 1500;
const SUPPRESS_MS = 60_000;

// CompositionSignal shape (from Pkg 3) — re-declared narrowly here to
// avoid forcing a circular import. The real type lives in
// useLiveCalculations.
interface CompositionSignal {
  id: string;
  tone: 'info' | 'warning' | 'critical';
  priority: number;
  headline: string;
  body: string;
  signalKind?: string;
}

export function useEchoHints(): {
  currentHint: EchoHint | null;
  dismiss: (hintId: string) => void;
  clearAllSuppressions: () => void;
} {
  const liveCalcs = useLiveCalculations();
  const signals: CompositionSignal[] = (liveCalcs && (liveCalcs as { signals?: CompositionSignal[] }).signals) ?? [];

  const [currentHint, setCurrentHint] = useState<EchoHint | null>(null);
  const lastShownAtRef = useRef<number>(0);
  const suppressedRef = useRef<Map<string, number>>(new Map());

  // Periodic pruning of old suppressions
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      for (const [id, expires] of suppressedRef.current.entries()) {
        if (expires < now) suppressedRef.current.delete(id);
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Re-compute current hint whenever signals change
  useEffect(() => {
    const now = Date.now();
    if (now - lastShownAtRef.current < MIN_INTERVAL_MS && currentHint) {
      // Throttle: keep showing the current hint for now
      return;
    }

    const candidate = pickTopSignal(signals, suppressedRef.current);

    if (!candidate) {
      setCurrentHint(null);
      return;
    }

    // Same hint already current? skip update
    if (currentHint && currentHint.id === candidate.id) return;

    const hint: EchoHint = {
      id: candidate.id,
      tone: candidate.tone,
      headline: candidate.headline,
      body: candidate.body,
      signalId: candidate.id,
    };
    setCurrentHint(hint);
    lastShownAtRef.current = now;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signals]);

  const dismiss = useCallback((hintId: string) => {
    suppressedRef.current.set(hintId, Date.now() + SUPPRESS_MS);
    setCurrentHint((curr) => (curr?.id === hintId ? null : curr));
  }, []);

  const clearAllSuppressions = useCallback(() => {
    suppressedRef.current.clear();
  }, []);

  return { currentHint, dismiss, clearAllSuppressions };
}

// ----------------------------------------------------------------------------
// Internal — priority resolution
// ----------------------------------------------------------------------------

function pickTopSignal(
  signals: CompositionSignal[],
  suppressed: Map<string, number>,
): CompositionSignal | null {
  if (!signals || signals.length === 0) return null;

  const now = Date.now();
  const eligible = signals.filter((s) => {
    const expiresAt = suppressed.get(s.id);
    return !expiresAt || expiresAt < now;
  });
  if (eligible.length === 0) return null;

  const toneRank: Record<CompositionSignal['tone'], number> = {
    critical: 3,
    warning: 2,
    info: 1,
  };

  return [...eligible].sort((a, b) => {
    const tDiff = toneRank[b.tone] - toneRank[a.tone];
    if (tDiff !== 0) return tDiff;
    return (b.priority ?? 0) - (a.priority ?? 0);
  })[0];
}
