/**
 * LiveStatsFooter.tsx
 * ----------------------------------------------------------------------------
 * The persistent bottom strip of the composition canvas. Shows the live
 * computed state of the menu in three regions:
 *
 *   LEFT:    Per-guest price + total + budget delta + visual budget bar
 *   CENTER:  Dietary distribution chips
 *   RIGHT:   Operational load badge + section count
 *
 * This is the primary "is the menu coming together?" surface. It updates
 * on every store change. Goal is < 16ms render budget so the footer never
 * stutters during drag.
 * ----------------------------------------------------------------------------
 */

import React from 'react';
import { useCompositionStore, selectMenuItemCount } from '../../hooks/useCompositionStore';
import { useLivePricing } from '../../hooks/useLivePricing';
import { useDietaryAggregation } from '../../hooks/useDietaryAggregation';
import { useOperationalLoad } from '../../hooks/useOperationalLoad';
import {
  formatCurrency,
  formatPerGuest,
  formatPercent,
} from '../../services/pricingEngine';
import { BudgetBar } from './BudgetBar';
import { DietaryDistribution } from './DietaryDistribution';
import { OperationalLoadBadge } from './OperationalLoadBadge';

export const LiveStatsFooter: React.FC = () => {
  const itemCount = useCompositionStore(selectMenuItemCount);
  const guestCount = useCompositionStore((s) => s.meta.guestCount);
  const currency = useCompositionStore((s) => s.meta.currency);
  const budgetTotal = useCompositionStore((s) => s.meta.budgetTotal);
  const isDirty = useCompositionStore((s) => s.meta.isDirty);
  const lastSyncedAt = useCompositionStore((s) => s.meta.lastSyncedAt);

  const pricing = useLivePricing();
  const dietary = useDietaryAggregation();
  const operational = useOperationalLoad();

  if (itemCount === 0) {
    return (
      <footer className="bmb-stats-footer bmb-stats-footer--idle">
        <p className="bmb-stats-footer__idle-text">
          {guestCount > 0
            ? `Composing for ${guestCount} guests · Budget ${formatPerGuest(
                budgetTotal / Math.max(guestCount, 1),
                currency,
              )}`
            : 'Set guest count to begin'}
        </p>
      </footer>
    );
  }

  const overBudget = pricing.budgetDelta < 0;
  const deltaLabel = overBudget
    ? `${formatCurrency(Math.abs(pricing.budgetDelta), currency)} over`
    : `${formatCurrency(pricing.budgetDelta, currency)} under`;

  return (
    <footer
      className={[
        'bmb-stats-footer',
        overBudget ? 'bmb-stats-footer--over-budget' : '',
        pricing.hasMarketPriceItems ? 'bmb-stats-footer--has-market' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-live="polite"
    >
      {/* ============== LEFT: Pricing + Budget ============== */}
      <div className="bmb-stats-footer__region bmb-stats-footer__region--pricing">
        <div className="bmb-stats-footer__primary">
          <span className="bmb-stats-footer__per-guest">
            {formatPerGuest(pricing.perGuestCost, currency)}
          </span>
          <span className="bmb-stats-footer__divider" aria-hidden="true">
            ·
          </span>
          <span className="bmb-stats-footer__total">
            {formatCurrency(pricing.totalCost, currency)} total
          </span>
        </div>
        <div className="bmb-stats-footer__secondary">
          <span
            className={[
              'bmb-stats-footer__delta',
              overBudget ? 'bmb-stats-footer__delta--negative' : 'bmb-stats-footer__delta--positive',
            ].join(' ')}
          >
            {deltaLabel}
          </span>
          <span className="bmb-stats-footer__utilization">
            {formatPercent(pricing.budgetUtilization)} of budget
          </span>
        </div>
        <BudgetBar utilization={pricing.budgetUtilization} overBudget={overBudget} />
      </div>

      {/* ============== CENTER: Dietary ============== */}
      <div className="bmb-stats-footer__region bmb-stats-footer__region--dietary">
        <DietaryDistribution analysis={dietary} />
      </div>

      {/* ============== RIGHT: Operational + Sync ============== */}
      <div className="bmb-stats-footer__region bmb-stats-footer__region--operational">
        <OperationalLoadBadge analysis={operational} />
        <SyncIndicator isDirty={isDirty} lastSyncedAt={lastSyncedAt} />
      </div>
    </footer>
  );
};

// ----------------------------------------------------------------------------
// Sync indicator
// ----------------------------------------------------------------------------

interface SyncIndicatorProps {
  isDirty: boolean;
  lastSyncedAt: number | null;
}

const SyncIndicator: React.FC<SyncIndicatorProps> = ({ isDirty, lastSyncedAt }) => {
  if (isDirty) {
    return (
      <div className="bmb-sync-indicator bmb-sync-indicator--saving" title="Saving…">
        <span className="bmb-sync-indicator__dot" aria-hidden="true" />
        <span className="bmb-sync-indicator__label">Saving…</span>
      </div>
    );
  }
  if (!lastSyncedAt) {
    return (
      <div className="bmb-sync-indicator bmb-sync-indicator--pending">
        <span className="bmb-sync-indicator__dot" aria-hidden="true" />
        <span className="bmb-sync-indicator__label">Not saved</span>
      </div>
    );
  }
  return (
    <div className="bmb-sync-indicator bmb-sync-indicator--saved" title={new Date(lastSyncedAt).toLocaleTimeString()}>
      <span className="bmb-sync-indicator__dot" aria-hidden="true" />
      <span className="bmb-sync-indicator__label">Saved</span>
    </div>
  );
};
