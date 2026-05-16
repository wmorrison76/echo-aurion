/**
 * ===========================================================================
 * Sparkline tile — per-guest dashboard tile
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Single trajectory tile. Compact, color-coded by status, sparkline
 *           rendered inline. The dashboard's atomic visual unit.
 *
 *           Master doc §4.2:  "Color coding is consistent and quiet: green
 *           when trajectory is positive and lift goal will be hit, amber
 *           when neutral, red when intervention is required. The tile shows
 *           the trajectory shape, not the absolute number, because the
 *           absolute number can mislead and the shape cannot."
 *
 *           Tap-to-expand handler is wired via onTap; the dashboard owns
 *           the drill-down panel.
 *
 * Tenet 5 (privacy spine) at this layer:
 *   - Uses guestName from the tile when present. Master doc §8.3 expects
 *     guest-facing surfaces to never show the guest the system. Operator
 *     surfaces (which this is) DO show the guest's name to the operator —
 *     that's the operational point. Pseudonymization to "Table 14" is the
 *     fallback rendered if guestName is empty (Phase 1.5 integration
 *     boundary).
 * ===========================================================================
 */

import * as React from 'react';
import type { TrajectoryTile } from '../../../shared/types/resonance';
import { cn } from '../../lib/utils';
import { sparklinePoints, statusClasses, statusLabel } from '../../lib/resonance/trajectory';

export interface SparklineTileProps {
  tile: TrajectoryTile;
  onTap?: (tile: TrajectoryTile) => void;
  className?: string;
}

const SPARKLINE_BOX = { width: 96, height: 28 };

export const SparklineTile: React.FC<SparklineTileProps> = ({ tile, onTap, className }) => {
  const sc = statusClasses(tile.status);
  const label = statusLabel(tile.status);

  // Guest identifier: prefer name, fall back to table/room, fall back to a
  // pseudonymous "Visit XXXX" using the last 4 of the visit id.
  const heading =
    tile.guestName ||
    tile.tableOrRoom ||
    `Visit ${tile.visitId.slice(-4).toUpperCase()}`;

  const partyDescriptor =
    tile.tableOrRoom && tile.partySize
      ? `${tile.tableOrRoom} · party of ${tile.partySize}`
      : tile.tableOrRoom || (tile.partySize ? `Party of ${tile.partySize}` : '');

  const liftGapStr =
    tile.liftGap > 0 ? `+${tile.liftGap.toFixed(1)} to goal` : 'goal met';

  const points = sparklinePoints(tile.sparkline, SPARKLINE_BOX);
  const isInteractive = Boolean(onTap);

  return (
    <button
      type="button"
      onClick={isInteractive ? () => onTap!(tile) : undefined}
      disabled={!isInteractive}
      className={cn(
        'relative flex flex-col items-stretch gap-2 rounded-lg border bg-card p-3 text-left ring-1 transition-shadow',
        sc.ring,
        sc.bg,
        isInteractive && 'hover:shadow-md active:scale-[0.99] cursor-pointer',
        !isInteractive && 'cursor-default',
        className,
      )}
      aria-label={`${heading}, ${label}${partyDescriptor ? `, ${partyDescriptor}` : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{heading}</div>
          {partyDescriptor && (
            <div className="truncate text-xs text-muted-foreground">{partyDescriptor}</div>
          )}
        </div>
        <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium', sc.text, sc.bg)}>
          {label}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Sparkline */}
        <svg
          viewBox={`0 0 ${SPARKLINE_BOX.width} ${SPARKLINE_BOX.height}`}
          width={SPARKLINE_BOX.width}
          height={SPARKLINE_BOX.height}
          className="shrink-0"
          aria-hidden="true"
        >
          {tile.sparkline.length > 0 ? (
            <polyline
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              className={sc.stroke}
              points={points}
            />
          ) : (
            <text
              x="50%"
              y="65%"
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              no readings yet
            </text>
          )}
        </svg>

        <div className="ml-auto text-right">
          <div className={cn('text-xs font-medium tabular-nums', sc.text)}>{liftGapStr}</div>
          {tile.hasOpenIntervention && (
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              intervention open
            </div>
          )}
        </div>
      </div>
    </button>
  );
};
