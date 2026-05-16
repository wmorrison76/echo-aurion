/**
 * components/NetworkIntelligence/CompetitiveBenchmark.tsx
 * ----------------------------------------------------------------------------
 * Whole-menu benchmark view. Shows:
 *   - Menu price percentile (with chart)
 *   - Dietary coverage delta vs network median
 *   - Common pairings (what items often go together in peer menus)
 *   - Common gaps (items peers use that this menu doesn't)
 *
 * Surfaces in a sidebar drawer or tab. Heavy data, so we render only on
 * demand — the parent component lazy-mounts.
 * ----------------------------------------------------------------------------
 */

import React from 'react';
import { PercentileChart } from './PercentileChart';
import type {
  NetworkBenchmark,
  NetworkPercentileData,
  MenuItemId,
} from '../../BanquetMenuBuilder.p5.types';

interface CompetitiveBenchmarkProps {
  benchmark: NetworkBenchmark | null;
  isLoading: boolean;
  error?: string | null;
  /** Callback when user wants to add a "common gap" item to the menu */
  onFillGap?: (itemId: MenuItemId, itemName: string) => void;
}

export const CompetitiveBenchmark: React.FC<CompetitiveBenchmarkProps> = ({
  benchmark,
  isLoading,
  error,
  onFillGap,
}) => {
  if (isLoading) {
    return (
      <div className="bmb-benchmark__loading">
        <div className="bmb-benchmark__shimmer" />
        <div className="bmb-benchmark__shimmer bmb-benchmark__shimmer--narrow" />
        <p className="bmb-benchmark__loading-text">Loading network data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bmb-benchmark__error" role="alert">
        Couldn't load network benchmark: {error}
      </div>
    );
  }

  if (!benchmark) {
    return (
      <div className="bmb-benchmark__empty">
        <p>Network benchmark unavailable.</p>
        <p className="bmb-benchmark__empty-detail">
          This typically means the comparison set has fewer than 20 peer
          properties — not enough for a statistically meaningful comparison.
          The benchmark will appear once your network has enough comparable
          data.
        </p>
      </div>
    );
  }

  // Synthesize a price-percentile data shape from the benchmark for the chart
  const priceData: NetworkPercentileData = {
    itemId: '__menu__',
    metric: 'price_per_guest',
    percentile: benchmark.perGuestCostPercentile,
    yourValue: 0, // we don't have explicit values from the benchmark; chart hides them
    networkMedian: 0,
    sampleSize: benchmark.sampleSize,
    comparisonContext: benchmark.comparisonContext,
    isStatisticallySignificant: benchmark.sampleSize >= 20,
    updatedAt: benchmark.updatedAt,
  };

  return (
    <div className="bmb-benchmark">
      <header className="bmb-benchmark__header">
        <h3 className="bmb-benchmark__title">Network position</h3>
        <p className="bmb-benchmark__sample">
          Compared against {benchmark.sampleSize} peer properties
        </p>
      </header>

      {/* Price percentile chart */}
      <section className="bmb-benchmark__section">
        <PercentileChart data={priceData} />
      </section>

      {/* Dietary coverage delta */}
      {Object.keys(benchmark.dietaryCoverageDelta).length > 0 && (
        <section className="bmb-benchmark__section">
          <h4 className="bmb-benchmark__section-title">Dietary coverage</h4>
          <ul className="bmb-benchmark__dietary-list">
            {Object.entries(benchmark.dietaryCoverageDelta).map(([tag, delta]) => (
              <li key={tag} className="bmb-benchmark__dietary-row">
                <span className="bmb-benchmark__dietary-tag">{tag}</span>
                <span
                  className={[
                    'bmb-benchmark__dietary-delta',
                    delta > 0
                      ? 'bmb-benchmark__dietary-delta--above'
                      : delta < 0
                        ? 'bmb-benchmark__dietary-delta--below'
                        : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {delta > 0 ? '+' : ''}
                  {Math.round(delta * 100)}% vs network
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Common gaps */}
      {benchmark.commonGaps.length > 0 && (
        <section className="bmb-benchmark__section">
          <h4 className="bmb-benchmark__section-title">
            Common in network, missing here
          </h4>
          <ul className="bmb-benchmark__gap-list">
            {benchmark.commonGaps.map((gap) => (
              <li key={gap.itemId} className="bmb-benchmark__gap">
                <div className="bmb-benchmark__gap-content">
                  <span className="bmb-benchmark__gap-name">{gap.itemName}</span>
                  <span className="bmb-benchmark__gap-rate">
                    Used by {Math.round(gap.networkUsageRate * 100)}% of peers
                  </span>
                </div>
                {onFillGap && (
                  <button
                    type="button"
                    className="bmb-benchmark__gap-action"
                    onClick={() => onFillGap(gap.itemId, gap.itemName)}
                  >
                    Add
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Common pairings */}
      {benchmark.commonPairings.length > 0 && (
        <section className="bmb-benchmark__section">
          <h4 className="bmb-benchmark__section-title">Common pairings</h4>
          <p className="bmb-benchmark__section-detail">
            Items peer properties frequently combine. Consider these as
            potential menu additions.
          </p>
          <ul className="bmb-benchmark__pairing-list">
            {benchmark.commonPairings.map((pairing) => (
              <li key={pairing.pairId} className="bmb-benchmark__pairing">
                <span className="bmb-benchmark__pairing-id">{pairing.pairId}</span>
                <span className="bmb-benchmark__pairing-rate">
                  {Math.round(pairing.coOccurrenceRate * 100)}% co-occurrence
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="bmb-benchmark__footer">
        Data updated {formatRelativeTime(benchmark.updatedAt)}. Aggregate
        only — no peer-property data is identifying.
      </footer>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}
