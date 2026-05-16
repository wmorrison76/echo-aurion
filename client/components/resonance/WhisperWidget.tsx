/**
 * ===========================================================================
 * Whisper widget — staff capture surface (tap-first MVP)
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  The single most-used UI in the platform per master doc §4.3.
 *           Two-to-five-second async capture for staff to record a faint
 *           signal after leaving a table — never during a guest interaction.
 *
 *           Phase 1 MVP is TAP ONLY:
 *             - 1-tap quadrant (high-pos / high-neg / low-pos / low-neg)
 *             - 1-tap score (1-10)
 *             - optional free-text note
 *             - submit
 *
 *           Voice mode (Aurion) is Phase 3. Master doc §4.3:
 *             "Voice-to-structure parsing converts the spoken whisper into
 *             a Resonance Reading."
 *           When Phase 3 lands, voice replaces the quadrant/score taps for
 *           operators in private contexts; the tap-first UI remains for
 *           noisy rooms.
 *
 *           Floating position by default (bottom-right), inline option
 *           when embedded in a screen (e.g., the dashboard's drill-down
 *           panel for a selected guest).
 *
 *  Silent Service Principle (§5.2.2 of doctrine):
 *    - The widget never demands attention during a guest interaction
 *    - Submission is async; the staff member moves on while the system
 *      catches up
 *    - The capture format is operator-natural: numbers + a phrase
 * ===========================================================================
 */

import * as React from 'react';
import type {
  AffectQuadrant,
  NewResonanceReading,
  ResonanceChannel,
} from '../../../shared/types/resonance';
import { useSubmitReading } from '../../lib/resonance/use-resonance';
import { cn } from '../../lib/utils';

export interface WhisperWidgetProps {
  /** The visit the staff member is whispering about. */
  activeVisitId: string | null;
  /** The guest the visit belongs to. */
  activeGuestId: string;
  /** Staff member id from auth context — captured-by field. */
  staffId: string;
  /** Where to render. Default: floating bottom-right. */
  position?: 'bottom-right' | 'bottom-left' | 'inline';
  /** Capture channel; defaults to 'observation' (a staff observation). */
  channel?: ResonanceChannel;
  /** Optional callback fired after a successful submit. */
  onSubmitted?: (reading: { id: string; resonance: number }) => void;
  className?: string;
}

interface QuadrantOption {
  value: AffectQuadrant;
  label: string;
  hint: string;
  // Default arousal/valence values for this quadrant. Staff can adjust the
  // score (1-10) which slides the resonance value; quadrant defaults set
  // the affect coordinates that get persisted to the reading row.
  arousal: number;
  valence: number;
}

const QUADRANTS: QuadrantOption[] = [
  { value: 'high-pos', label: 'Lit up', hint: 'energized, delighted', arousal: 0.7, valence: 0.7 },
  { value: 'high-neg', label: 'Tense', hint: 'frustrated, anxious', arousal: 0.7, valence: -0.7 },
  { value: 'low-pos', label: 'Settled', hint: 'content, peaceful', arousal: -0.5, valence: 0.6 },
  { value: 'low-neg', label: 'Withdrawn', hint: 'sad, exhausted', arousal: -0.5, valence: -0.6 },
];

const POSITION_CLASSES: Record<NonNullable<WhisperWidgetProps['position']>, string> = {
  'bottom-right': 'fixed bottom-4 right-4 z-40',
  'bottom-left': 'fixed bottom-4 left-4 z-40',
  inline: 'relative w-full',
};

const SCORE_BUCKETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const WhisperWidget: React.FC<WhisperWidgetProps> = ({
  activeVisitId,
  activeGuestId,
  staffId,
  position = 'bottom-right',
  channel = 'observation',
  onSubmitted,
  className,
}) => {
  const [open, setOpen] = React.useState(position === 'inline');
  const [quadrant, setQuadrant] = React.useState<QuadrantOption | null>(null);
  const [score, setScore] = React.useState<number | null>(null);
  const [note, setNote] = React.useState('');
  const [confirmation, setConfirmation] = React.useState<string | null>(null);

  const submitMutation = useSubmitReading();
  const isFloating = position !== 'inline';

  const canSubmit = quadrant !== null && score !== null && !submitMutation.isPending;

  function reset(): void {
    setQuadrant(null);
    setScore(null);
    setNote('');
  }

  async function handleSubmit(): Promise<void> {
    if (!quadrant || !score) return;

    const reading: NewResonanceReading = {
      guestId: activeGuestId,
      visitId: activeVisitId,
      capturedBy: staffId,
      channel,
      arousal: quadrant.arousal,
      valence: quadrant.valence,
      resonance: score,
      signals: [],
      confidence: 0.7, // staff observation default; Aurion voice will overwrite
      note: note.trim() || undefined,
    };

    try {
      const result = await submitMutation.mutateAsync(reading);
      onSubmitted?.({ id: result.id, resonance: result.resonance });
      setConfirmation('Recorded.');
      reset();
      // Auto-close floating widget after submit
      if (isFloating) {
        window.setTimeout(() => {
          setOpen(false);
          setConfirmation(null);
        }, 1_500);
      } else {
        window.setTimeout(() => setConfirmation(null), 2_500);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not record.';
      setConfirmation(message);
    }
  }

  // Floating closed → render trigger button only
  if (isFloating && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open whisper widget"
        className={cn(
          POSITION_CLASSES[position],
          'flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-lg ring-1 ring-border/50 hover:shadow-xl transition-shadow',
          className,
        )}
      >
        <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
        Whisper
      </button>
    );
  }

  return (
    <div
      className={cn(
        POSITION_CLASSES[position],
        isFloating && 'w-[320px]',
        'flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-xl ring-1 ring-border/50',
        className,
      )}
      role="dialog"
      aria-label="Whisper widget"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Whisper</h3>
          <p className="text-xs text-muted-foreground">
            How are they, in two seconds?
          </p>
        </div>
        {isFloating && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              reset();
            }}
            aria-label="Close whisper widget"
            className="text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        )}
      </div>

      {/* Quadrant picker */}
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="sr-only">Mood quadrant</legend>
        {QUADRANTS.map((q) => (
          <button
            key={q.value}
            type="button"
            onClick={() => setQuadrant(q)}
            aria-pressed={quadrant?.value === q.value}
            className={cn(
              'flex flex-col items-start rounded-md border p-2 text-left text-xs transition-colors',
              quadrant?.value === q.value
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-background text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="font-medium">{q.label}</span>
            <span className="text-[11px] opacity-70">{q.hint}</span>
          </button>
        ))}
      </fieldset>

      {/* Score picker */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">Score (1–10)</label>
          {score !== null && (
            <span className="text-xs tabular-nums text-foreground">{score}</span>
          )}
        </div>
        <div className="grid grid-cols-10 gap-1">
          {SCORE_BUCKETS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScore(s)}
              aria-pressed={score === s}
              aria-label={`Score ${s}`}
              className={cn(
                'h-7 rounded text-[11px] font-medium tabular-nums transition-colors',
                score === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional — what did you notice? (e.g., 'wife seems tense, ordered the cocktail fast')"
        rows={2}
        maxLength={500}
        className="resize-none rounded-md border border-border bg-background p-2 text-sm placeholder:text-muted-foreground/70"
        aria-label="Whisper note"
      />

      {/* Submit row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            'flex-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors',
            canSubmit ? 'hover:bg-primary/90' : 'opacity-50 cursor-not-allowed',
          )}
        >
          {submitMutation.isPending ? 'Recording…' : 'Whisper'}
        </button>
        {confirmation && (
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {confirmation}
          </span>
        )}
      </div>
    </div>
  );
};
