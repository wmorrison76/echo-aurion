/**
 * Simplex/optimization methods for forecast coefficient adjustment.
 */

export interface HistoricalForecastData {
  date: string;
  outletId: string | null;
  mealPeriod: string;
  forecastGuestCount: number;
  forecastRevenue?: number;
}

export interface ActualData {
  date: string;
  outletId: string | null;
  mealPeriod: string;
  actualGuestCount: number;
  actualRevenue?: number;
}

export interface OptimizedCoefficients {
  guestCountMultiplier: number;
  revenueMultiplier?: number;
  byMealPeriod?: Record<string, number>;
}

export interface ObjectiveFunction {
  (params: number[]): number;
}

export interface Constraint {
  type: "eq" | "lte" | "gte";
  fn: (params: number[]) => number;
  value: number;
}

export interface Solution {
  params: number[];
  value: number;
  feasible: boolean;
}

/**
 * Simple linear adjustment: minimize mean squared error of (actual - coeff * forecast).
 */
export function optimizeForecastCoefficients(
  historicalData: HistoricalForecastData[],
  actualData: ActualData[],
): OptimizedCoefficients {
  const byKey = new Map<string, { forecast: number; actual: number }>();
  for (let i = 0; i < historicalData.length; i++) {
    const f = historicalData[i];
    const a = actualData[i];
    if (!a) continue;
    const key = `${f.date}|${f.outletId ?? ""}|${f.mealPeriod}`;
    byKey.set(key, { forecast: f.forecastGuestCount, actual: a.actualGuestCount });
  }
  let sumF = 0;
  let sumA = 0;
  let sumF2 = 0;
  let sumFA = 0;
  for (const { forecast, actual } of byKey.values()) {
    sumF += forecast;
    sumA += actual;
    sumF2 += forecast * forecast;
    sumFA += forecast * actual;
  }
  const n = byKey.size;
  if (n === 0) return { guestCountMultiplier: 1 };
  const denom = sumF2 - (sumF * sumF) / n;
  const coeff = denom !== 0 ? (sumFA - (sumF * sumA) / n) / denom : 1;
  return {
    guestCountMultiplier: Math.max(0.1, Math.min(2, coeff)),
  };
}

/**
 * Placeholder for Simplex/linear programming; returns trivial solution.
 */
export function applySimplexMethod(
  _objective: ObjectiveFunction,
  _constraints: Constraint[],
): Solution {
  return {
    params: [1],
    value: 0,
    feasible: true,
  };
}
