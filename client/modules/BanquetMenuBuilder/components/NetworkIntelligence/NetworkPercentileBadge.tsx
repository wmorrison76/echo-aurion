/**
 * components/NetworkIntelligence/NetworkPercentileBadge.tsx
 * ----------------------------------------------------------------------------
 * Tiny inline badge that sits on a menu-item card showing where the item's
 * price sits in the network. Compact (text-only) — for high-density UI.
 *
 * Hidden when:
 *   - data is null (insufficient sample)
 *   - percentile is between 30-70 (the "unremarkable middle" — no story
 *     worth taking up screen real estate)
 *
 * Visible when there's something to say:
 *   - Below 30th percentile  → "Below network"  (info tone)
 *   - Above 70th percentile  → "Premium"        (gold tone)
 *   - Above 90th percentile  → "Top decile"     (alert tone if pricing matters)
 * ----------------------------------------------------------------------------
 */

import React from 'react';
import type { NetworkPercentileData } from '../../BanquetMenuBuilder.p5.types';

interface NetworkPercentileBadgeProps {
  data: NetworkPercentileData | null;
  /** When true, always render the badge regardless of percentile band */
  alwaysShow?: boolean;
}

export const NetworkPercentileBadge: React.FC<NetworkPercentileBadgeProps> = ({
  data,
  alwaysShow = false,
}) => {
  if (!data || !data.isStatisticallySignificant) return null;

  const { percentile } = data;
  const inUnremarkableMiddle = percentile >= 30 && percentile <= 70;
  if (inUnremarkableMiddle && !alwaysShow) return null;

  const tone = computeTone(percentile);
  const label = computeLabel(percentile);

  return (
    <span
      className={`bmb-network-badge bmb-network-badge--${tone}`}
      title={`${Math.round(percentile)}th percentile (n=${data.sampleSize})`}
      aria-label={`Network percentile: ${Math.round(percentile)}th, sample size ${data.sampleSize}`}
    >
      <span className="bmb-network-badge__dot" aria-hidden="true" />
      {label}
    </span>
  );
};

// ----------------------------------------------------------------------------
// Tone + label logic
// ----------------------------------------------------------------------------

type BadgeTone = 'low' | 'mid' | 'premium' | 'top';

function computeTone(percentile: number): BadgeTone {
  if (percentile >= 90) return 'top';
  if (percentile >= 70) return 'premium';
  if (percentile <= 30) return 'low';
  return 'mid';
}

function computeLabel(percentile: number): string {
  if (percentile >= 90) return 'Top decile';
  if (percentile >= 70) return 'Premium';
  if (percentile <= 10) return 'Bottom decile';
  if (percentile <= 30) return 'Below network';
  return `${Math.round(percentile)}p`;
}
