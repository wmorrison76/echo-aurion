/**
 * Adjust forecast model coefficients based on optimization results.
 */

import type { ForecastDataPoint } from "../../../shared/types/forecast-sources";
import type { OptimizedCoefficients } from "./optimization-engine";

export interface ForecastModel {
  outletId: string;
  coefficients: OptimizedCoefficients;
  updatedAt: string;
}

export interface CoefficientAdjustment {
  mealPeriod?: string;
  guestCountMultiplier: number;
  revenueMultiplier?: number;
}

/**
 * Apply coefficient adjustments to a forecast model.
 */
export function adjustForecastModel(
  model: ForecastModel,
  adjustments: CoefficientAdjustment[],
): ForecastModel {
  const byPeriod = new Map(adjustments.map((a) => [a.mealPeriod ?? "all", a]));
  const byMealPeriod: Record<string, number> = {};
  for (const [period, adj] of byPeriod) {
    byMealPeriod[period] = adj.guestCountMultiplier;
  }
  const defaultMult = adjustments[0]?.guestCountMultiplier ?? 1;
  return {
    ...model,
    coefficients: {
      ...model.coefficients,
      guestCountMultiplier: defaultMult,
      byMealPeriod: Object.keys(byMealPeriod).length > 0 ? byMealPeriod : model.coefficients.byMealPeriod,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Apply coefficients to a single forecast point.
 */
export function applyCoefficientsToPoint(
  point: ForecastDataPoint,
  coeff: OptimizedCoefficients,
): ForecastDataPoint {
  const mult = coeff.byMealPeriod?.[point.mealPeriod] ?? coeff.guestCountMultiplier ?? 1;
  return {
    ...point,
    guestCount: Math.round(point.guestCount * mult),
    revenue: point.revenue != null && coeff.revenueMultiplier != null
      ? point.revenue * coeff.revenueMultiplier
      : point.revenue,
  };
}
