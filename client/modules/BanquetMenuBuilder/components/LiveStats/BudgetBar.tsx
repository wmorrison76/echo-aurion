/**
 * BudgetBar.tsx
 * ----------------------------------------------------------------------------
 * The visual budget tracker. Renders a horizontal bar with a fill that
 * grows as the menu approaches budget. When over budget, the overflow is
 * rendered as a red "spike" extending past the bar's nominal width.
 *
 * Visual logic:
 *   utilization 0..0.5    → fill is gold/safe
 *   utilization 0.5..0.9  → fill stays gold
 *   utilization 0.9..1.0  → fill amber (caution zone)
 *   utilization > 1.0     → bar fills completely, overflow spike appears
 *
 * Accessibility:
 *   - role="progressbar" with aria-valuenow/min/max
 *   - aria-valuetext with human-readable summary
 * ----------------------------------------------------------------------------
 */

import React from 'react';
import { clamp } from '../../utils/compositionMath';

interface BudgetBarProps {
  /** 0..1+ — fraction of budget consumed */
  utilization: number;
  overBudget: boolean;
}

export const BudgetBar: React.FC<BudgetBarProps> = ({ utilization, overBudget }) => {
  const fillPct = clamp(utilization, 0, 1) * 100;
  const overflowPct = overBudget ? Math.min((utilization - 1) * 100, 50) : 0;

  let toneClass = 'bmb-budget-bar__fill--safe';
  if (utilization > 1) toneClass = 'bmb-budget-bar__fill--over';
  else if (utilization > 0.9) toneClass = 'bmb-budget-bar__fill--caution';

  return (
    <div
      className="bmb-budget-bar"
      role="progressbar"
      aria-valuenow={Math.round(utilization * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${Math.round(utilization * 100)}% of budget used${
        overBudget ? ' — over budget' : ''
      }`}
    >
      <div className="bmb-budget-bar__track">
        <div
          className={`bmb-budget-bar__fill ${toneClass}`}
          style={{ width: `${fillPct}%` }}
        />
        {overflowPct > 0 && (
          <div
            className="bmb-budget-bar__overflow"
            style={{ width: `${overflowPct}%` }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
};
