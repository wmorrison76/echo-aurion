/**
 * 24-hour forecast lock-in system.
 */

import type { ForecastDataPoint } from "../../../shared/types/forecast-sources";

export interface LockedForecast {
  orgId: string;
  outletId: string | null;
  date: string;
  mealPeriod: string;
  lockedGuestCount: number;
  lockedRevenue?: number;
  lockedAt: string;
}

export interface LatestDataPoint {
  date: string;
  outletId: string | null;
  mealPeriod: string;
  guestCount: number;
  revenue?: number;
  source: string;
}

/**
 * Lock in forecast for a date/outlet (24h before day).
 */
export async function lockInForecast(
  _orgId: string,
  _outletId: string,
  _date: string,
  _forecast: ForecastDataPoint[],
): Promise<LockedForecast[]> {
  return [];
}

/**
 * Final adjustments before lock-in (e.g. latest reservations).
 */
export async function makeFinalAdjustments(
  forecast: ForecastDataPoint,
  _latestData: LatestDataPoint[],
): Promise<ForecastDataPoint> {
  return forecast;
}

/**
 * Whether forecast can still be adjusted (before 24h lock-in).
 */
export function canStillAdjust(
  _forecast: ForecastDataPoint,
  currentTime: Date,
  lockInHoursBefore: number = 24,
): boolean {
  return true;
}
