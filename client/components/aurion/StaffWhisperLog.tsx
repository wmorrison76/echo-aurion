/**
 * ===========================================================================
 * Staff whisper log — the transparency surface (Tenet 6)
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED
 * Phase:    4
 *
 * Purpose:  Master doc §10.5: every whisper Aurion sent the staff member
 *           appears here, reverse-chronological, with a flag-as-wrong
 *           control. The log is the contract — no off-record whispers.
 *
 *           Filters: urgency band + flagged-only + free-text guest hint.
 *           No bulk delete: Tenet 6 says the staff member sees what was
 *           whispered, full stop. They can flag, never erase.
 * ===========================================================================
 */

import * as React from 'react';
import { cn } from '../../lib/utils';
import { useAurionWhispers } from '../../lib/aurion/use-aurion';
import type { StaffWhisper, WhisperUrgency } from '../../../shared/types/aurion';

export interface StaffWhisperLogProps {
  staffId: string;
  className?: string;
}

const URGENCY_LABEL: Record<WhisperUrgency, string> = {
  background: 'Background',
  noticed: 'Noticed',
  priority: 'Priority',
  urgent: 'Urgent',
};

const URGENCY_BADGE: Record<WhisperUrgency, string> = {
  background: 'bg-muted text-muted-foreground',
  noticed: 'bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-100',
  priority: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
  urgent: 'bg-rose-100 text-rose-900 dark:bg-rose-900 dark:text-rose-100',
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export const StaffWhisperLog: React.FC<StaffWhisperLogProps> = ({ staffId, className }) => {
  const { whispers, loading, error, refresh, flag } = useAurionWhispers({ autoRefresh: true });
  const [urgencyFilter, setUrgencyFilter] = React.useState<WhisperUrgency | 'all'>('all');
  const [flaggedOnly, setFlaggedOnly] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [noteFor, setNoteFor] = React.useState<string | null>(null);
  const [noteText, setNoteText] = React.useState('');

  const visible: StaffWhisper[] = React.useMemo(() => {
    return whispers
      .filter((w) => w.staffId === staffId)
      .filter((w) => urgencyFilter === 'all' || w.urgency === urgencyFilter)
      .filter((w) => !flaggedOnly || w.flaggedAsWrong);
  }, [whispers, staffId, urgencyFilter, flaggedOnly]);

  const handleFlag = async (whisperId: string, kind: 'wrong' | 'helpful') => {
    setBusy(whisperId);
    try {
      await flag(whisperId, kind, kind === 'wrong' ? noteText.trim() || undefined : undefined);
      setNoteFor(null);
      setNoteText('');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className={cn('flex flex-col gap-3', className)} aria-label="Whispers Aurion sent you">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-medium text-foreground">Whispers</h2>
        <div className="flex items-center gap-2 text-xs">
          <select
            aria-label="Filter by urgency"
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value as WhisperUrgency | 'all')}
            className="rounded-md border border-border bg-background px-2 py-1"
          >
            <option value="all">All urgencies</option>
            <option value="background">Background</option>
            <option value="noticed">Noticed</option>
            <option value="priority">Priority</option>
            <option value="urgent">Urgent</option>
          </select>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={flaggedOnly}
              onChange={(e) => setFlaggedOnly(e.target.checked)}
            />
            Flagged only
          </label>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="rounded-md border border-border px-2 py-1 hover:bg-accent disabled:opacity-50"
          >
            {loading ? 'Loading' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && (
        <p className="rounded-md bg-rose-50 p-2 text-xs text-rose-900 dark:bg-rose-950 dark:text-rose-200" role="alert">
          {error}
        </p>
      )}

      {visible.length === 0 && !loading ? (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          No whispers in view.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {visible.map((w) => (
            <li
              key={w.id}
              className={cn(
                'rounded-md border bg-card p-3',
                w.flaggedAsWrong ? 'border-rose-300 dark:border-rose-800' : 'border-border',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className={cn('rounded-full px-2 py-0.5', URGENCY_BADGE[w.urgency])}>
                  {URGENCY_LABEL[w.urgency]}
                </span>
                <time dateTime={w.triggeredAt}>{formatTime(w.triggeredAt)}</time>
              </div>
              <p className="mt-1 text-sm text-foreground">{w.text}</p>
              {w.doNots && w.doNots.length > 0 && (
                <ul className="mt-1 text-xs text-muted-foreground">
                  {w.doNots.map((dn, idx) => (
                    <li key={idx}>· don't: {dn}</li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {w.flaggedAsWrong ? (
                  <span className="rounded-md bg-rose-100 px-2 py-0.5 text-rose-900 dark:bg-rose-950 dark:text-rose-200">
                    Flagged as wrong
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleFlag(w.id, 'helpful')}
                      disabled={busy === w.id}
                      className="rounded-md border border-border px-2 py-0.5 hover:bg-accent disabled:opacity-50"
                    >
                      Helpful
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteFor(w.id)}
                      disabled={busy === w.id}
                      className="rounded-md border border-rose-300 px-2 py-0.5 text-rose-900 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-200"
                    >
                      Flag as wrong
                    </button>
                  </>
                )}
                {w.staffNote && (
                  <span className="text-muted-foreground">Note: {w.staffNote}</span>
                )}
              </div>
              {noteFor === w.id && (
                <div className="mt-2 flex flex-col gap-2">
                  <textarea
                    aria-label="Reason this whisper was wrong"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Optional note: what was wrong"
                    className="rounded-md border border-border bg-background p-2 text-xs"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleFlag(w.id, 'wrong')}
                      disabled={busy === w.id}
                      className="rounded-md bg-rose-700 px-3 py-1 text-xs text-white hover:bg-rose-800 disabled:opacity-50"
                    >
                      Submit flag
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNoteFor(null);
                        setNoteText('');
                      }}
                      className="rounded-md border border-border px-3 py-1 text-xs hover:bg-accent"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
