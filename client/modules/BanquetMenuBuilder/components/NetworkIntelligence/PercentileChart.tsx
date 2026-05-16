/**
 * components/NetworkIntelligence/PercentileChart.tsx
 * ----------------------------------------------------------------------------
 * Visualizes a percentile position. A horizontal bar showing the network
 * distribution, with a tick mark indicating where this property's value
 * falls.
 *
 * Quartiles are color-banded:
 *   0-25  bottom quartile  red-ish
 *   25-50 second quartile  amber
 *   50-75 third quartile   gold (sweet spot for most metrics)
 *   75-100 top quartile    blue/green
 *
 * The ideal percentile depends on the metric:
 *   - price_per_guest: 50th is the median; very low or very high warrants
 *     a story
 *   - usage_frequency: higher = your peers use this more (could be a gap)
 *   - guest_satisfaction: higher = better
 * ----------------------------------------------------------------------------
 */

import React from 'react';
import type { NetworkPercentileData } from '../../BanquetMenuBuilder.p5.types';

interface PercentileChartProps {
  data: NetworkPercentileData;
  /** When false, hides labels for compact display */
  showLabels?: boolean;
  /** Optional custom interpretation hint */
  interpretationHint?: string;
}

export const PercentileChart: React.FC<PercentileChartProps> = ({
  data,
  showLabels = true,
  interpretationHint,
}) => {
  const interpretation = interpretationHint ?? interpretMetric(data);

  return (
    <div className="bmb-percentile">
      {showLabels && (
        <div className="bmb-percentile__header">
          <span className="bmb-percentile__metric">
            {formatMetricLabel(data.metric)}
          </span>
          <span className="bmb-percentile__sample">
            n = {data.sampleSize}
          </span>
        </div>
      )}

      <div className="bmb-percentile__bar-wrap">
        <div className="bmb-percentile__bar" aria-hidden="true">
          <div className="bmb-percentile__quartile bmb-percentile__quartile--q1" />
          <div className="bmb-percentile__quartile bmb-percentile__quartile--q2" />
          <div className="bmb-percentile__quartile bmb-percentile__quartile--q3" />
          <div className="bmb-percentile__quartile bmb-percentile__quartile--q4" />
          <div
            className="bmb-percentile__marker"
            style={{ left: `${data.percentile}%` }}
            role="img"
            aria-label={`${Math.round(data.percentile)}th percentile`}
          />
        </div>
        {showLabels && (
          <div className="bmb-percentile__scale">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        )}
      </div>

      <div className="bmb-percentile__values">
        <div>
          <span className="bmb-percentile__value-label">You</span>
          <span className="bmb-percentile__value">
            {formatValue(data.metric, data.yourValue)}
          </span>
        </div>
        <div>
          <span className="bmb-percentile__value-label">Network median</span>
          <span className="bmb-percentile__value">
            {formatValue(data.metric, data.networkMedian)}
          </span>
        </div>
        <div>
          <span className="bmb-percentile__value-label">Percentile</span>
          <span className="bmb-percentile__value bmb-percentile__value--pct">
            {Math.round(data.percentile)}
          </span>
        </div>
      </div>

      {interpretation && (
        <p className="bmb-percentile__interpretation">{interpretation}</p>
      )}

      <p className="bmb-percentile__context">{data.comparisonContext}</p>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function formatMetricLabel(metric: NetworkPercentileData['metric']): string {
  switch (metric) {
    case 'price_per_guest':
      return 'Price per guest';
    case 'usage_frequency':
      return 'Usage frequency';
    case 'guest_satisfaction':
      return 'Guest satisfaction';
  }
}

function formatValue(metric: NetworkPercentileData['metric'], v: number): string {
  switch (metric) {
    case 'price_per_guest':
      return `$${v.toFixed(2)}`;
    case 'usage_frequency':
      return `${(v * 100).toFixed(0)}%`;
    case 'guest_satisfaction':
      return v.toFixed(1);
  }
}

function interpretMetric(data: NetworkPercentileData): string {
  const { metric, percentile } = data;
  if (metric === 'price_per_guest') {
    if (percentile < 20) return 'You are pricing well below the network — verify margin.';
    if (percentile > 85) return 'You are pricing well above the network — the value should be evident.';
    return '';
  }
  if (metric === 'usage_frequency') {
    if (percentile > 80) return 'A staple across the network. Gap-filling opportunity if missing.';
    if (percentile < 20) return 'Rarely used by peers. Likely property-specific.';
    return '';
  }
  return '';
}
