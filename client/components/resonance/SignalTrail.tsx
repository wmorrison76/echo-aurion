/**
 * ===========================================================================
 * Signal trail — drill-down audit view
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Time-ordered list of signals supporting a guest's trajectory or
 *           intervention. The "show your work" surface — staff trust the
 *           system because they can see what it noticed.
 *
 *           Master doc §8.4 (staff controls): every staff member has access
 *           to a log of what Aurion whispered to them today; they can flag
 *           any whisper as "wrong" — the flag is a training signal back to
 *           Echo-Deep. This component is the read surface for that contract.
 *
 *           Renders most-recent-first. Each signal shows:
 *             - timestamp (relative: "2 min ago" / "yesterday 9:14p")
 *             - source (humanized: "staff whisper" not "staff-whisper")
 *             - sensitivity badge (color-coded)
 *             - subject summary
 *             - tags as chips
 *             - free-text note (if present)
 *
 *           Empty state honest: "No signals captured yet for this guest."
 *           Loading state: skeleton rows. Error state: explicit + retry.
 *
 *  Tenet 7/8 enforcement: this view receives signals from the API which
 *  already filters expired rows server-side. Forbidden-sensitivity rows
 *  never reach this component.
 * ===========================================================================
 */

import * as React from 'react';
import type { Signal, SignalSource } from '../../../shared/types/signals';
import type { SensitivityLevel } from '../../../shared/types/signals/sensitivity';
import { cn } from '../../lib/utils';

export interface SignalTrailProps {
  /**
   * Signals to display, most-recent-first ordering preferred but the
   * component re-sorts by timestamp DESC defensively.
   */
  signals: Signal[];
  /** When true, renders skeleton placeholders instead of the list. */
  loading?: boolean;
  /** When set, renders an error block with a retry CTA. */
  error?: { message: string; onRetry?: () => void };
  className?: string;
  /**
   * Optional flag handler — Master doc §8.4 staff controls. Calling this
   * with a signal id sends a "this read was wrong" signal back upstream.
   * If omitted, the flag button is not rendered.
   */
  onFlag?: (signalId: string) => void;
}

const SOURCE_LABELS: Record<SignalSource, string> = {
  'staff-whisper': 'staff whisper',
  'aurion-voice-prosody': 'voice tone',
  'aurion-voice-content': 'voice content',
  'aurion-voice-tone': 'voice register',
  'voyage-tap': 'voyage tap',
  'voyage-dwell': 'voyage dwell',
  'voyage-dismiss': 'voyage dismiss',
  'voyage-edit': 'voyage edit',
  'voyage-search': 'voyage search',
  'voyage-add-to-itinerary': 'added to itinerary',
  'atrium-video-watched': 'video watched',
  'atrium-action-tap': 'venue action',
  'flight-tracker': 'flight tracker',
  'weather-api': 'weather',
  'calendar-import': 'calendar',
  'pos-event': 'POS',
  'pms-event': 'PMS',
};

const SENSITIVITY_CLASSES: Record<SensitivityLevel, string> = {
  public: 'bg-muted text-muted-foreground',
  preference: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  behavioral: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  emotional: 'bg-amber-400/15 text-amber-700 dark:text-amber-300',
  sensitive: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  forbidden: 'bg-rose-700/20 text-rose-900 dark:text-rose-200', // shown only in admin contexts
};

const RELATIVE_TIME_BUCKETS: Array<{ ms: number; format: (ms: number) => string }> = [
  { ms: 60_000, format: () => 'just now' },
  { ms: 3_600_000, format: (m) => `${Math.floor(m / 60_000)}m ago` },
  { ms: 86_400_000, format: (m) => `${Math.floor(m / 3_600_000)}h ago` },
  { ms: 7 * 86_400_000, format: (m) => `${Math.floor(m / 86_400_000)}d ago` },
];

function formatRelativeTime(timestamp: string): string {
  const ms = Date.now() - new Date(timestamp).getTime();
  if (ms < 0) return 'just now'; // clock skew; don't lie with "in the future"
  for (const bucket of RELATIVE_TIME_BUCKETS) {
    if (ms < bucket.ms) return bucket.format(ms);
  }
  // Older than a week — show absolute date
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function summarizeSubject(subject: Signal['subject']): string {
  switch (subject.kind) {
    case 'venue':
      return `venue ${subject.venueId.slice(-6)}`;
    case 'amenity':
      return `amenity ${subject.amenityId.slice(-6)}`;
    case 'time-slot':
      return `slot ${new Date(subject.start).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      })}`;
    case 'occasion':
      return subject.occasionType;
    case 'menu-item':
      return `menu item ${subject.menuItemId.slice(-6)}`;
    case 'staff-member':
      return `staff ${subject.staffId.slice(-6)}`;
    case 'free-text':
      return subject.text;
  }
}

function humanSource(source: SignalSource): string {
  return SOURCE_LABELS[source] ?? source;
}

export const SignalTrail: React.FC<SignalTrailProps> = ({
  signals,
  loading = false,
  error,
  onFlag,
  className,
}) => {
  // Defensive sort: newest first regardless of input ordering
  const sorted = React.useMemo(() => {
    return [...signals].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [signals]);

  if (loading) {
    return (
      <div
        className={cn('flex flex-col gap-2', className)}
        aria-busy="true"
        aria-label="Loading signals"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-md border border-border bg-muted/30"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          'flex flex-col gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300',
          className,
        )}
      >
        <span>Could not load signals: {error.message}</span>
        {error.onRetry && (
          <button
            type="button"
            onClick={error.onRetry}
            className="self-start rounded-md border border-rose-500/40 px-2 py-0.5 text-xs hover:bg-rose-500/20"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div
        className={cn(
          'rounded-md border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground',
          className,
        )}
      >
        No signals captured yet for this guest.
      </div>
    );
  }

  return (
    <ol
      className={cn('flex flex-col gap-2', className)}
      aria-label="Signal trail"
    >
      {sorted.map((signal) => (
        <li
          key={signal.id}
          className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3 text-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{humanSource(signal.source)}</span>
            <span className="text-xs text-muted-foreground" title={signal.timestamp}>
              {formatRelativeTime(signal.timestamp)}
            </span>
            <span
              className={cn(
                'ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                SENSITIVITY_CLASSES[signal.sensitivity],
              )}
              aria-label={`sensitivity: ${signal.sensitivity}`}
            >
              {signal.sensitivity}
            </span>
            {onFlag && (
              <button
                type="button"
                onClick={() => onFlag(signal.id)}
                className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                aria-label="Flag this signal as misread"
                title="Flag as misread"
              >
                flag
              </button>
            )}
          </div>

          <div className="text-foreground">{summarizeSubject(signal.subject)}</div>

          {signal.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {signal.tags.map((tag, idx) => (
                <span
                  key={`${tag.kind}-${tag.value}-${idx}`}
                  className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {tag.kind}: {tag.value}
                </span>
              ))}
            </div>
          )}

          {signal.note && (
            <div className="mt-0.5 italic text-muted-foreground">"{signal.note}"</div>
          )}

          {signal.conversion && (
            <div className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              outcome: {signal.conversion}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
};
