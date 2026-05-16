/**
 * NetworkPercentileBadge.tsx
 * ----------------------------------------------------------------------------
 * Renders the "p72" badge that shows where an item's price sits within
 * the anonymized network. This is the visible surface of the network
 * intelligence layer — the "Bloomberg Terminal" hook the platform's
 * defensible moat is built on.
 *
 * Rendering rules:
 *   - When percentile is null OR sampleSize too small, render nothing
 *   - p10..p33  → "low" tone (you're priced under the market)
 *   - p34..p66  → "median" tone (in line)
 *   - p67..p89  → "high" tone (premium)
 *   - p90+      → "premium" tone (top of market)
 *
 * Hover tooltip explains the percentile in plain language.
 * ----------------------------------------------------------------------------
 */

import React, { useState } from 'react';

interface NetworkPercentileBadgeProps {
  /** 0..100, or null when sample too small */
  percentile: number | null;
  sampleSize: number;
}

export const NetworkPercentileBadge: React.FC<NetworkPercentileBadgeProps> = ({
  percentile,
  sampleSize,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (percentile === null) return null;

  const tone = toneFor(percentile);
  const label = `p${Math.round(percentile)}`;
  const description = describePercentile(percentile, sampleSize);

  return (
    <span
      className={`bmb-network-badge bmb-network-badge--${tone}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
      role="img"
      aria-label={description}
    >
      <span className="bmb-network-badge__label">{label}</span>
      {showTooltip && (
        <span className="bmb-network-badge__tooltip" role="tooltip">
          {description}
        </span>
      )}
    </span>
  );
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function toneFor(p: number): 'low' | 'median' | 'high' | 'premium' {
  if (p < 34) return 'low';
  if (p < 67) return 'median';
  if (p < 90) return 'high';
  return 'premium';
}

function describePercentile(p: number, n: number): string {
  const sample = `Based on ${n} comparable items in the network.`;
  if (p < 34) {
    return `You're priced lower than ${100 - Math.round(p)}% of comparable items. ${sample}`;
  }
  if (p < 67) {
    return `Right around the network median. ${sample}`;
  }
  if (p < 90) {
    return `Higher than ${Math.round(p)}% of comparable items. ${sample}`;
  }
  return `Top ${100 - Math.round(p)}% of the network. Premium positioning. ${sample}`;
}
