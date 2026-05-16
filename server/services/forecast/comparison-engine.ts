/**
 * Compare forecast to actual (POS) data.
 */

import type { ForecastDataPoint } from "../../../shared/types/forecast-sources";

export interface ActualDataPoint {
  date: string;
  outletId: string | null;
  mealPeriod: string;
  guestCount: number;
  revenue?: number;
}

export interface ForecastVariance {
  date: string;
  outletId: string | null;
  mealPeriod: string;
  forecastGuestCount: number;
  actualGuestCount: number;
  forecastRevenue?: number;
  actualRevenue?: number;
  varianceGuest: number;
  varianceRevenue?: number;
}

/**
 * Compare a single forecast point to actual.
 */
export function compareForecastToActual(
  forecast: ForecastDataPoint,
  actual: ActualDataPoint,
): ForecastVariance {
  return {
    date: forecast.date,
    outletId: forecast.outletId,
    mealPeriod: forecast.mealPeriod,
    forecastGuestCount: forecast.guestCount,
    actualGuestCount: actual.guestCount,
    forecastRevenue: forecast.revenue,
    actualRevenue: actual.revenue,
    varianceGuest: actual.guestCount - forecast.guestCount,
    varianceRevenue:
      actual.revenue != null && forecast.revenue != null
        ? actual.revenue - forecast.revenue
        : undefined,
  };
}
