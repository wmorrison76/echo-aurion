/***
 * LUCCCA — BUILD 41
 * Predictive Risk Forecasting (7/30/90 day)
 *
 * PURPOSE:
 *  - Predict future operational instability
 *  - Use historical trends to forecast risk trajectories
 *  - Enable proactive intervention windows
 ***/

import { computeTrendline } from "./trendline-engine";

export type RiskForecast = {
  window: number;
  direction: "up" | "down" | "flat";
  slope: number;
  volatility: number;
  recommendation: string;
  dangerZones?: {
    date: string;
    riskLevel: number;
    reason: string;
  }[];
};

export function forecastRisk({
  dailyRiskScores,
}: {
  dailyRiskScores: number[];
}): {
  seven: RiskForecast;
  thirty: RiskForecast;
  ninety: RiskForecast;
} {
  function forecast(window: number): RiskForecast {
    const slice = dailyRiskScores.slice(-window);

    if (slice.length === 0) {
      return {
        window,
        direction: "flat",
        slope: 0,
        volatility: 0,
        recommendation: "Insufficient data",
        dangerZones: [],
      };
    }

    const trend = computeTrendline(slice);

    // Identify danger zones (projections where risk will spike)
    const dangerZones = identifyDangerZones(
      slice,
      trend.slope,
      trend.direction
    );

    let recommendation = "Stable - Continue monitoring";
    if (trend.direction === "up" && trend.volatility > 15) {
      recommendation =
        "⚠️ ESCALATING RISK - Immediate intervention required";
    } else if (trend.direction === "up") {
      recommendation = "📈 Risk trending upward - Increase monitoring";
    } else if (trend.direction === "down" && trend.volatility > 15) {
      recommendation = "✓ Volatility decreasing - Positive trend";
    } else if (trend.direction === "down") {
      recommendation = "📉 Risk improving - Maintain current actions";
    }

    return {
      window,
      direction: trend.direction,
      slope: trend.slope,
      volatility: trend.volatility,
      recommendation,
      dangerZones,
    };
  }

  return {
    seven: forecast(7),
    thirty: forecast(30),
    ninety: forecast(90),
  };
}

/**
 * Identify future danger zones based on current trend
 */
function identifyDangerZones(
  historicalData: number[],
  slope: number,
  direction: "up" | "down" | "flat"
): { date: string; riskLevel: number; reason: string }[] {
  const dangerZones: { date: string; riskLevel: number; reason: string }[] = [];

  if (direction === "up" && slope > 0.5) {
    // High escalation risk
    const projectedRisk = historicalData[historicalData.length - 1] + slope * 7;
    if (projectedRisk > 70) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      dangerZones.push({
        date: futureDate.toISOString().split("T")[0],
        riskLevel: Math.round(projectedRisk),
        reason: "Accelerating risk trajectory",
      });
    }
  }

  // Check for volatility spikes
  const volatility = calculateVolatility(historicalData);
  if (volatility > 20) {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    dangerZones.push({
      date: nextWeek.toISOString().split("T")[0],
      riskLevel: 65,
      reason: "High volatility period approaching",
    });
  }

  return dangerZones;
}

/**
 * Calculate standard deviation (volatility) of data
 */
function calculateVolatility(data: number[]): number {
  if (data.length < 2) return 0;

  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((a, b) => a + (b - mean) ** 2, 0) / data.length;
  return Math.sqrt(variance);
}

/**
 * Generate a natural language summary of the forecast
 */
export function generateForecastSummary(forecast: RiskForecast): string {
  const lines: string[] = [];

  lines.push(`### ${forecast.window}-Day Forecast`);
  lines.push(`**Direction:** ${forecast.direction.toUpperCase()}`);
  lines.push(`**Volatility:** ${Math.round(forecast.volatility)}%`);
  lines.push(`**Recommendation:** ${forecast.recommendation}`);

  if (forecast.dangerZones && forecast.dangerZones.length > 0) {
    lines.push("\n**Danger Zones:**");
    forecast.dangerZones.forEach((zone) => {
      lines.push(`- **${zone.date}**: Risk ${zone.riskLevel}% (${zone.reason})`);
    });
  }

  return lines.join("\n");
}
