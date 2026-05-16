/**
 * Normalize forecast data from all sources to a common structure.
 */

import type { ForecastDataPoint, ForecastSourceType } from "../../../shared/types/forecast-sources";
import type { NormalizedForecastPoint } from "../../../shared/types/forecast-aggregation";

export type ForecastSource = { type: ForecastSourceType; weight: number };

/**
 * Normalize a single forecast point with source metadata.
 */
export function normalizeForecastPoint(
  point: ForecastDataPoint,
  source: ForecastSource,
): NormalizedForecastPoint {
  return {
    ...point,
    confidence: Math.min(1, Math.max(0, point.confidence * source.weight)),
    normalizedAt: new Date().toISOString(),
  };
}

/**
 * Resolve conflicts when multiple sources contribute to same date/outlet/meal period.
 * Prefer higher-confidence and higher-weight sources.
 */
export function resolveConflicts(points: NormalizedForecastPoint[]): NormalizedForecastPoint[] {
  const key = (p: NormalizedForecastPoint) =>
    `${p.date}|${p.outletId ?? ""}|${p.mealPeriod}`;
  const byKey = new Map<string, NormalizedForecastPoint[]>();
  for (const p of points) {
    const k = key(p);
    const list = byKey.get(k) ?? [];
    list.push(p);
    byKey.set(k, list);
  }
  const out: NormalizedForecastPoint[] = [];
  for (const list of byKey.values()) {
    if (list.length === 1) {
      out.push(list[0]);
      continue;
    }
    list.sort((a, b) => b.confidence - a.confidence);
    const top = list[0];
    const guestSum = list.reduce((s, p) => s + p.guestCount, 0);
    const revenueSum = list.reduce((s, p) => s + (p.revenue ?? 0), 0);
    out.push({
      ...top,
      guestCount: Math.round(guestSum / list.length),
      revenue: revenueSum > 0 ? revenueSum : undefined,
    });
  }
  return out;
}

/**
 * Calculate source weights for aggregation (BEO > Reservations > Historical > AI).
 */
export function calculateSourceWeights(
  sources: ForecastSourceType[],
): Record<string, number> {
  const defaults: Record<ForecastSourceType, number> = {
    beo: 0.95,
    reo: 0.95,
    calendar: 0.85,
    hotel_pms: 0.88,
    reservations: 0.9,
    pos: 1.0,
    production_forecast: 0.8,
    historical: 0.75,
    ai: 0.7,
  };
  const out: Record<string, number> = {};
  for (const s of sources) {
    out[s] = defaults[s] ?? 0.5;
  }
  return out;
}
