/**
 * Final adjustments before 24h lock-in (reservations, cancellations).
 */

import type { ForecastDataPoint } from "../../../shared/types/forecast-sources";
import type { LatestDataPoint } from "./lock-in-engine";

export interface FinalForecast extends ForecastDataPoint {
  adjustedAt?: string;
}

/**
 * Apply final adjustments to forecast using latest data.
 */
export async function makeFinalAdjustments(
  forecast: ForecastDataPoint,
  latestData: LatestDataPoint[],
): Promise<FinalForecast> {
  let guestCount = forecast.guestCount;
  for (const d of latestData) {
    if (d.date === forecast.date && d.mealPeriod === forecast.mealPeriod) {
      guestCount = Math.round((guestCount + d.guestCount) / 2);
    }
  }
  return {
    ...forecast,
    guestCount,
    adjustedAt: new Date().toISOString(),
  };
}
