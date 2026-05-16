/***
 * LUCCCA — BUILD 39
 * Trendline Engine
 *
 * PURPOSE:
 *  - Compute trendlines for risk, margin, labor
 *  - Over rolling time windows
 *
 * Input: array of daily metrics
 * Output: slopes + classifications
 ***/

export function computeTrendline(data: number[]): {
  slope: number;
  direction: "up" | "down" | "flat";
  volatility: number;
} {
  if (data.length < 3) {
    return { slope: 0, direction: "flat", volatility: 0 };
  }

  let n = data.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumXX += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  let direction: "up" | "down" | "flat" = "flat";
  if (slope > 0.05) direction = "up";
  if (slope < -0.05) direction = "down";

  const mean = sumY / n;
  const variance = data.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const volatility = Math.sqrt(variance);

  return { slope, direction, volatility };
}
