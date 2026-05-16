/**
 * ===========================================================================
 * Memory review — "what do you remember about me?"
 * ===========================================================================
 * Layer:    Substrate: Trust
 * Status:   IMPLEMENTED
 * Phase:    3
 *
 * Purpose:  Master doc §8.3 / Tenet 5 keystone. Plain-language list of
 *           every memory item Aurion has retained, grouped by category.
 *           Per-item "forget this" with optimistic removal.
 *
 *           Categories show in this order (master doc §8.3):
 *             preferences → occasions → allergens → amenity-affinity →
 *             service-history → communication-style
 *
 *           Source attribution is rendered as a small chip per item:
 *             stated-by-guest / observed-by-staff / inferred-by-aurion
 *
 *           Empty state: "Aurion is just getting to know you" — honest
 *           Silent Service copy, never apologetic.
 * ===========================================================================
 */

import * as React from 'react';
import type { GuestMemoryView, GuestMemoryItem } from '../../../shared/types/trust';
import { fetchMemory, forgetMemoryItem, TrustApiError } from '../../lib/trust/api';
import { cn } from '../../lib/utils';

export interface MemoryReviewProps {
  guestId: string;
  className?: string;
}

const CATEGORY_ORDER: GuestMemoryView['categories'][number]['category'][] = [
  'preferences',
  'occasions',
  'allergens',
  'amenity-affinity',
  'service-history',
  'communication-style',
];

const CATEGORY_LABELS: Record<GuestMemoryView['categories'][number]['category'], string> = {
  preferences: 'Preferences',
  occasions: 'Occasions',
  allergens: 'Allergies',
  'amenity-affinity': 'Spaces you have enjoyed',
  'service-history': 'How we have served you',
  'communication-style': 'How we speak with you',
};

const SOURCE_LABELS: Record<GuestMemoryItem['source'], string> = {
  'stated-by-guest': 'you told us',
  'observed-by-staff': 'we noticed',
  'inferred-by-aurion': 'inferred',
};

export const MemoryReview: React.FC<MemoryReviewProps> = ({ guestId, className }) => {
  const [view, setView] = React.useState<GuestMemoryView | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [forgetting, setForgetting] = React.useState<Set<string>>(new Set());

  const load = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMemory();
      setView(result);
    } catch (err) {
      setError(err instanceof TrustApiError ? err.message : 'Could not load.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load, guestId]);

  async function handleForget(itemId: string): Promise<void> {
    setForgetting((prev) => new Set(prev).add(itemId));
    try {
      await forgetMemoryItem(itemId);
      // Optimistic removal: drop the item locally
      setView((prev) =>
        prev
          ? {
              ...prev,
              categories: prev.categories.map((c) => ({
                ...c,
                items: c.items.filter((i) => i.id !== itemId),
              })).filter((c) => c.items.length > 0),
            }
          : prev,
      );
    } catch (err) {
      const message = err instanceof TrustApiError ? err.message : 'Could not forget item.';
      setError(message);
    } finally {
      setForgetting((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className={cn('flex flex-col gap-3', className)} aria-busy="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-md border border-border bg-muted/30" />
        ))}
      </div>
    );
  }

  if (error && !view) {
    return (
      <div
        className={cn(
          'flex flex-col gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300',
          className,
        )}
      >
        <span>{error}</span>
        <button
          type="button"
          onClick={() => void load()}
          className="self-start rounded-md border border-rose-500/40 px-2 py-0.5 text-xs hover:bg-rose-500/20"
        >
          Retry
        </button>
      </div>
    );
  }

  const categoriesInOrder = CATEGORY_ORDER.map((c) =>
    view?.categories.find((cat) => cat.category === c),
  ).filter((c) => c && c.items.length > 0);

  if (!view || categoriesInOrder.length === 0) {
    return (
      <div
        className={cn(
          'rounded-md border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground',
          className,
        )}
      >
        Aurion is just getting to know you. Nothing has been remembered yet.
      </div>
    );
  }

  return (
    <section className={cn('flex flex-col gap-4', className)} aria-label="Memory review">
      <header>
        <h2 className="text-lg font-semibold text-foreground">What we remember</h2>
        <p className="text-xs text-muted-foreground">
          Everything below is editable. Tap "forget" beside any item and it leaves us — across every system — within seconds.
        </p>
      </header>

      {error && (
        <p className="text-xs text-rose-700 dark:text-rose-300" role="alert">
          {error}
        </p>
      )}

      {categoriesInOrder.map((cat) => {
        if (!cat) return null;
        return (
          <section key={cat.category} aria-label={CATEGORY_LABELS[cat.category]}>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {CATEGORY_LABELS[cat.category]}
            </h3>
            <ul className="flex flex-col gap-2">
              {cat.items.map((item) => {
                const busy = forgetting.has(item.id);
                return (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-md border border-border bg-card p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="text-foreground">{item.description}</div>
                      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {SOURCE_LABELS[item.source]} · {new Date(item.capturedAt).toLocaleDateString()}
                      </div>
                    </div>
                    {item.canForget && (
                      <button
                        type="button"
                        onClick={() => void handleForget(item.id)}
                        disabled={busy}
                        className={cn(
                          'shrink-0 rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground',
                          busy && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        {busy ? 'forgetting…' : 'forget'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </section>
  );
};
