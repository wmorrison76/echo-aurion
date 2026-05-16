/**
 * Track forecast accuracy over time (store/retrieve variance and metrics).
 */

import type { ForecastVariance } from "./comparison-engine";
import type { AccuracyMetrics } from "./variance-analysis";

export interface AccuracyTrackingStore {
  appendVariances(orgId: string, outletId: string | null, variances: ForecastVariance[]): Promise<void>;
  getVariances(orgId: string, outletId: string | null, dateRange: { start: string; end: string }): Promise<ForecastVariance[]>;
  getAccuracyMetrics(orgId: string, outletId: string | null, dateRange: { start: string; end: string }): Promise<AccuracyMetrics | null>;
}

/**
 * In-memory stub; replace with DB (forecast_variances table).
 */
export function createInMemoryAccuracyStore(): AccuracyTrackingStore {
  const variancesByOrg = new Map<string, ForecastVariance[]>();
  return {
    async appendVariances(orgId, _outletId, variances) {
      const key = orgId;
      const list = variancesByOrg.get(key) ?? [];
      list.push(...variances);
      variancesByOrg.set(key, list);
    },
    async getVariances(orgId, _outletId, dateRange) {
      const list = variancesByOrg.get(orgId) ?? [];
      return list.filter((v) => v.date >= dateRange.start && v.date <= dateRange.end);
    },
    async getAccuracyMetrics() {
      return null;
    },
  };
}
