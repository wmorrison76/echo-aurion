/**
 * ===========================================================================
 * Trajectory dashboard — the GM floor view
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Grid of SparklineTiles for all active visits at a property. The
 *           single screen the GM walks the floor with. Phase 1 demo target.
 *
 *           Master doc §10.2 demo: "a real shift at the pilot property where
 *           the GM uses the trajectory dashboard live."
 *
 *           Filters: status (all / red / amber / green). Sort: red first,
 *           then amber, then green; within a band, by lift gap descending so
 *           the most-at-risk surfaces first.
 *
 *           Polled every 5 seconds via useFloorView. The hook handles the
 *           refetch; this component renders.
 *
 * Empty / loading / error states are explicit rather than spinners-only.
 * The Silent Service Principle (§5.2.2): the system speaks honestly when
 * it has nothing to say, in the staff member's working voice.
 * ===========================================================================
 */

import * as React from 'react';
import { SparklineTile } from './SparklineTile';
import type { TrajectoryStatus, TrajectoryTile } from '../../../shared/types/resonance';
import { useFloorView } from '../../lib/resonance/use-resonance';
import { cn } from '../../lib/utils';

type FilterValue = 'all' | TrajectoryStatus;

export interface TrajectoryDashboardProps {
  /** Property to display. Required — the GM is always working at one. */
  propertyId: string;
  /** Filter to apply on first render. */
  defaultFilter?: FilterValue;
  /** Tap handler, e.g. opens a drill-down panel. */
  onSelectTile?: (tile: TrajectoryTile) => void;
  className?: string;
}

const STATUS_ORDER: Record<TrajectoryStatus, number> = {
  red: 0,
  amber: 1,
  green: 2,
};

const FILTER_OPTIONS: Array<{ value: FilterValue; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'red', label: 'Needs care' },
  { value: 'amber', label: 'At risk' },
  { value: 'green', label: 'On track' },
];

export const TrajectoryDashboard: React.FC<TrajectoryDashboardProps> = ({
  propertyId,
  defaultFilter = 'all',
  onSelectTile,
  className,
}) => {
  const [filter, setFilter] = React.useState<FilterValue>(defaultFilter);
  const { data, isLoading, isError, error, refetch } = useFloorView(propertyId);

  const visible = React.useMemo(() => {
    const tiles = data ?? [];
    const filtered =
      filter === 'all' ? tiles : tiles.filter((t) => t.status === filter);
    return [...filtered].sort((a, b) => {
      const ord = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (ord !== 0) return ord;
      return b.liftGap - a.liftGap;
    });
  }, [data, filter]);

  return (
    <section
      aria-label="Trajectory dashboard"
      className={cn('flex flex-col gap-4', className)}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">Floor</h2>
        <div className="ml-auto flex items-center gap-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                filter === opt.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={filter === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {isLoading && <DashboardSkeleton />}

      {isError && (
        <div className="flex flex-col gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
          <span>Could not load floor view: {error instanceof Error ? error.message : 'unknown error'}</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="self-start rounded-md border border-rose-500/40 px-2 py-0.5 text-xs hover:bg-rose-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && visible.length === 0 && (
        <EmptyState filter={filter} hasAny={(data ?? []).length > 0} />
      )}

      {!isLoading && !isError && visible.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((tile) => (
            <SparklineTile
              key={tile.visitId}
              tile={tile}
              onTap={onSelectTile}
            />
          ))}
        </div>
      )}
    </section>
  );
};

const DashboardSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className="h-[88px] animate-pulse rounded-lg border border-border bg-muted/40"
      />
    ))}
  </div>
);

const EmptyState: React.FC<{ filter: FilterValue; hasAny: boolean }> = ({
  filter,
  hasAny,
}) => {
  // Honest copy — no fake reassurance. Silent Service register.
  if (filter !== 'all' && hasAny) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
        No active visits in this band right now.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
      No active visits at this property yet. The dashboard will fill in as guests check in.
    </div>
  );
};
