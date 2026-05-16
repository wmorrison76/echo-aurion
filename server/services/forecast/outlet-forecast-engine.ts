/**
 * Outlet-specific forecast engine (uses engine-builder and sales-matrix).
 */

import type { ForecastDataPoint } from "../../../shared/types/forecast-sources";
import type { ForecastEngine } from "./engine-builder";
import type { SalesMatrix } from "./sales-matrix";

export interface OutletForecastEngine {
  engine: ForecastEngine;
  generateForecast(days: number): Promise<ForecastDataPoint[]>;
  getSalesMatrix(days: number): Promise<SalesMatrix>;
}

/**
 * Create outlet forecast engine instance (stub).
 */
export async function createOutletForecastEngine(
  _orgId: string,
  outletId: string,
): Promise<OutletForecastEngine> {
  const engine: ForecastEngine = {
    outletId,
    algorithm: "weighted_sources",
    parameters: {},
  };
  return {
    engine,
    async generateForecast(days: number) {
      return [];
    },
    async getSalesMatrix(days: number): Promise<SalesMatrix> {
      return {
        outletId,
        days: [],
        generatedAt: new Date().toISOString(),
      };
    },
  };
}
