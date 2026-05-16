/**
 * Analyze forecast variance and accuracy metrics.
 */

import type { ForecastVariance } from "./comparison-engine";

export interface AccuracyMetrics {
  mape: number; // mean absolute percentage error
  rmse: number;
  bias: number; // avg(actual - forecast)
  sampleCount: number;
}

export interface SystematicError {
  outletId: string | null;
  mealPeriod: string;
  direction: "over" | "under";
  avgVariance: number;
  count: number;
}

/**
 * Calculate accuracy metrics from variances.
 */
export function calculateAccuracyMetrics(variances: ForecastVariance[]): AccuracyMetrics {
  if (variances.length === 0) {
    return { mape: 0, rmse: 0, bias: 0, sampleCount: 0 };
  }
  const errors = variances.map((v) => v.varianceGuest);
  const actuals = variances.map((v) => v.actualGuestCount);
  const bias = errors.reduce((s, e) => s + e, 0) / variances.length;
  const squared = errors.map((e) => e * e);
  const rmse = Math.sqrt(squared.reduce((s, v) => s + v, 0) / variances.length);
  let mapeSum = 0;
  let mapeN = 0;
  for (let i = 0; i < variances.length; i++) {
    const a = actuals[i];
    if (a > 0) {
      mapeSum += Math.abs(errors[i]) / a;
      mapeN++;
    }
  }
  const mape = mapeN > 0 ? (mapeSum / mapeN) * 100 : 0;
  return { mape, rmse, bias, sampleCount: variances.length };
}

/**
 * Identify systematic errors (e.g. consistently over-forecasting dinner).
 */
export function identifySystematicErrors(variances: ForecastVariance[]): SystematicError[] {
  const byKey = new Map<string, { sum: number; count: number }>();
  for (const v of variances) {
    const key = `${v.outletId ?? ""}|${v.mealPeriod}`;
    const cur = byKey.get(key) ?? { sum: 0, count: 0 };
    cur.sum += v.varianceGuest;
    cur.count += 1;
    byKey.set(key, cur);
  }
  const out: SystematicError[] = [];
  for (const [key, { sum, count }] of byKey.entries()) {
    if (count < 3) continue;
    const avg = sum / count;
    if (Math.abs(avg) < 2) continue;
    const [outletId, mealPeriod] = key.split("|");
    out.push({
      outletId: outletId || null,
      mealPeriod,
      direction: avg > 0 ? "under" : "over",
      avgVariance: avg,
      count,
    });
  }
  return out;
}
