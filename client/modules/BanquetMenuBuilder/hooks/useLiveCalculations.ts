/**
 * useLiveCalculations.ts
 * ----------------------------------------------------------------------------
 * Convenience hook that bundles every live computed surface the canvas
 * exposes — pricing, dietary, operational, network percentile — into a
 * single object. Mostly used by the Echo hint engine and any UI that
 * needs to react to multiple signals at once.
 *
 * Each individual signal is also available standalone via its own hook
 * (useLivePricing, useDietaryAggregation, useOperationalLoad,
 * useNetworkPercentile). Prefer the standalone hooks when only one
 * signal is needed — they re-render less.
 * ----------------------------------------------------------------------------
 */

import { useMemo } from 'react';
import { useLivePricing } from './useLivePricing';
import { useDietaryAggregation } from './useDietaryAggregation';
import { useOperationalLoad } from './useOperationalLoad';
import type { MenuPricingTotals } from '../services/pricingEngine';
import type { DietaryAnalysis } from '../services/dietaryEngine';
import type { OperationalAnalysis } from '../services/operationalEngine';

export interface LiveCalculations {
  pricing: MenuPricingTotals;
  dietary: DietaryAnalysis;
  operational: OperationalAnalysis;
}

export function useLiveCalculations(): LiveCalculations {
  const pricing = useLivePricing();
  const dietary = useDietaryAggregation();
  const operational = useOperationalLoad();

  return useMemo(
    () => ({ pricing, dietary, operational }),
    [pricing, dietary, operational],
  );
}
