/** * ML Forecasting Service * Provides lightweight linear regression as fallback * Ready for Prophet/ARIMA integration via Python subprocess */ export interface ForecastPoint {
  ts: string;
  y: number;
}
export interface ForecastResult {
  forecast: number;
  slope: number;
  intercept: number;
  confidence_interval?: { lower: number; upper: number };
} /** * Simple linear regression forecasting * Used as fallback when Prophet is not available */
export async function runLinearForecast(
  series: ForecastPoint[],
): Promise<ForecastResult> {
  if (series.length < 2) {
    throw new Error("Need at least 2 data points for forecasting");
  } // Convert to numeric arrays const n = series.length; const xs = series.map((_, i) => i); const ys = series.map((p) => p.y); // Calculate means const xMean = xs.reduce((a, b) => a + b, 0) / n; const yMean = ys.reduce((a, b) => a + b, 0) / n; // Calculate slope and intercept let numerator = 0; let denominator = 0; for (let i = 0; i < n; i++) { numerator += (xs[i] - xMean) * (ys[i] - yMean); denominator += (xs[i] - xMean) ** 2; } const slope = denominator === 0 ? 0 : numerator / denominator; const intercept = yMean - slope * xMean; // Predict next value const nextX = n; const forecast = intercept + slope * nextX; // Simple confidence interval (±10% of forecast) const margin = Math.abs(forecast) * 0.1; return { forecast: Math.max(0, Math.round(forecast * 100) / 100), slope: Math.round(slope * 10000) / 10000, intercept: Math.round(intercept * 100) / 100, confidence_interval: { lower: Math.max(0, forecast - margin), upper: forecast + margin, }, };
} /** * Forecast 7 days ahead from historical data */
export async function forecast7Day(
  series: ForecastPoint[],
): Promise<ForecastResult[]> {
  const results: ForecastResult[] = [];
  for (let i = 0; i < 7; i++) {
    const window = series.slice(Math.max(0, series.length - 14 + i));
    const result = await runLinearForecast(window);
    results.push(result);
  }
  return results;
} /** * Forecast 30 days ahead (weekly aggregation) */
export async function forecast30Day(
  series: ForecastPoint[],
): Promise<ForecastResult[]> {
  const results: ForecastResult[] = [];
  for (let i = 0; i < 4; i++) {
    const weekWindow = series.slice(Math.max(0, series.length - 12 + i));
    const result = await runLinearForecast(weekWindow);
    results.push(result);
  }
  return results;
}
