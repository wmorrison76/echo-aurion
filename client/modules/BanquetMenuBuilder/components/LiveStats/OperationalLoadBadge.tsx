/**
 * OperationalLoadBadge.tsx
 * ----------------------------------------------------------------------------
 * Compact indicator of kitchen load. Hover/tap reveals detailed station
 * breakdown and equipment requirements.
 *
 * The badge tone reflects load level:
 *   light    → calm gold
 *   moderate → standard gold (default)
 *   heavy    → amber (caution)
 *   extreme  → red (warning)
 * ----------------------------------------------------------------------------
 */

import React, { useState, useRef, useEffect } from 'react';
import type { OperationalAnalysis } from '../../services/operationalEngine';
import {
  loadLevelLabel,
  loadLevelTone,
  STATION_LABELS,
  EQUIPMENT_LABELS,
} from '../../services/operationalEngine';

interface OperationalLoadBadgeProps {
  analysis: OperationalAnalysis;
}

export const OperationalLoadBadge: React.FC<OperationalLoadBadgeProps> = ({
  analysis,
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const tone = loadLevelTone(analysis.loadLevel);

  return (
    <div className="bmb-op-load" ref={wrapperRef}>
      <button
        type="button"
        className={`bmb-op-load__badge bmb-op-load__badge--${tone}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Kitchen load details"
      >
        <span className="bmb-op-load__indicator" aria-hidden="true">
          {tone === 'critical' || tone === 'caution' ? '!' : '•'}
        </span>
        <span className="bmb-op-load__label">
          {loadLevelLabel(analysis.loadLevel)}
        </span>
        <span className="bmb-op-load__hours">
          ~{analysis.estimatedPrepHours}h prep
        </span>
      </button>

      {open && (
        <div className="bmb-op-load__popover" role="dialog" aria-label="Kitchen load detail">
          <div className="bmb-op-load__section">
            <h5 className="bmb-op-load__heading">Stations</h5>
            {analysis.stationLoads.length === 0 ? (
              <p className="bmb-op-load__empty">No station data yet</p>
            ) : (
              <ul className="bmb-op-load__list">
                {analysis.stationLoads.map((sl) => {
                  const isBottleneck = analysis.bottleneckStations.includes(sl.station);
                  return (
                    <li
                      key={sl.station}
                      className={[
                        'bmb-op-load__list-item',
                        isBottleneck ? 'bmb-op-load__list-item--bottleneck' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <span className="bmb-op-load__list-name">
                        {STATION_LABELS[sl.station]}
                        {isBottleneck && (
                          <span className="bmb-op-load__bottleneck-flag">⚠</span>
                        )}
                      </span>
                      <span className="bmb-op-load__list-value">
                        {sl.itemCount} items · {sl.totalComplexity.toFixed(1)} cx
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {analysis.equipmentRequirements.length > 0 && (
            <div className="bmb-op-load__section">
              <h5 className="bmb-op-load__heading">Equipment</h5>
              <ul className="bmb-op-load__list">
                {analysis.equipmentRequirements.map((eq) => (
                  <li key={eq.category} className="bmb-op-load__list-item">
                    <span className="bmb-op-load__list-name">
                      {EQUIPMENT_LABELS[eq.category]}
                    </span>
                    <span className="bmb-op-load__list-value">
                      ×{eq.suggestedUnits} suggested
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bmb-op-load__section">
            <h5 className="bmb-op-load__heading">Summary</h5>
            <dl className="bmb-op-load__summary">
              <div>
                <dt>Total complexity</dt>
                <dd>{analysis.totalComplexity}</dd>
              </div>
              <div>
                <dt>Estimated prep</dt>
                <dd>~{analysis.estimatedPrepHours} hours</dd>
              </div>
              {analysis.highComplexityItems.length > 0 && (
                <div>
                  <dt>High-complexity items</dt>
                  <dd>{analysis.highComplexityItems.length}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
};
