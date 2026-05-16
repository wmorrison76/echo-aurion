/**
 * Type definitions for forecast aggregation (multi-source).
 */

import type { ForecastDataPoint, MealPeriod, ForecastSourceType } from "./forecast-sources";

export interface NormalizedForecastPoint extends ForecastDataPoint {
  normalizedAt?: string;
}

export interface AggregatedForecast {
  orgId: string;
  dateRange: { start: string; end: string };
  points: NormalizedForecastPoint[];
  sourceCounts: Record<string, number>;
  generatedAt: string;
}

export interface ForecastSource {
  type: ForecastSourceType;
  weight: number; // 0-1 reliability
  label: string;
}

export function defaultSourceWeights(): Record<ForecastSourceType, number> {
  return {
    beo: 0.95,
    reo: 0.95,
    calendar: 0.85,
    hotel_pms: 0.88,
    reservations: 0.9,
    pos: 1.0, // actuals
    production_forecast: 0.8,
    historical: 0.75,
    ai: 0.7,
  };
}
