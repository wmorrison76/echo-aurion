/**
 * PHASE 1: CORE AI FOUNDATION - Week 3 Day 11
 * Demand Forecasting Model (Prophet Time-Series)
 * 
 * Predicts:
 * - Customer covers (demand)
 * - Revenue forecast
 * - Confidence intervals
 * 
 * Uses 12 months historical data
 * Retrains weekly
 * 10-day lookahead
 */

interface HistoricalData {
  date: string;
  covers: number;
  revenue: number;
  day_of_week: number;
}

interface ForecastResult {
  date: string;
  predicted_covers: number;
  predicted_revenue: number;
  confidence_lower: number;
  confidence_upper: number;
  confidence_pct: number;
  trend: 'up' | 'stable' | 'down';
}

/**
 * Simple demand forecasting using statistical methods
 * In production, this would use Prophet or similar ML library
 */
export class DemandForecaster {
  private orgId: string;
  private locationId: string;

  constructor(orgId: string, locationId: string) {
    this.orgId = orgId;
    this.locationId = locationId;
  }

  /**
   * Forecast demand for next 10 days
   * Uses historical data + seasonality + trends
   */
  async forecast(historicalData: HistoricalData[]): Promise<ForecastResult[]> {
    // TODO: In production, use Prophet library
    // import { Prophet } from '@facebook/prophet';
    // const model = new Prophet();
    // model.fit(historicalData);
    // const future = model.makeRuture(periods=10);
    // const forecast = model.predict(future);

    if (!historicalData || historicalData.length === 0) {
      throw new Error('No historical data provided');
    }

    // Calculate simple statistics
    const coversArray = historicalData.map((d) => d.covers);
    const revenueArray = historicalData.map((d) => d.revenue);

    const avgCovers = coversArray.reduce((a, b) => a + b, 0) / coversArray.length;
    const avgRevenue = revenueArray.reduce((a, b) => a + b, 0) / revenueArray.length;

    const stdDevCovers = this.calculateStdDev(coversArray, avgCovers);
    const stdDevRevenue = this.calculateStdDev(revenueArray, avgRevenue);

    // Calculate day-of-week seasonality
    const dayOfWeekSeasonality = this.calculateSeasonality(historicalData);

    // Calculate trend
    const trend = this.calculateTrend(coversArray);

    // Generate 10-day forecast
    const forecasts: ForecastResult[] = [];
    const today = new Date();

    for (let i = 1; i <= 10; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(forecastDate.getDate() + i);

      const dayOfWeek = forecastDate.getDay();
      const seasonalFactor = dayOfWeekSeasonality[dayOfWeek] || 1.0;
      const trendFactor = 1 + (trend * i) / 100; // Linear trend

      // Apply seasonality and trend to average
      const predictedCovers = Math.round(avgCovers * seasonalFactor * trendFactor);
      const predictedRevenue = avgRevenue * seasonalFactor * trendFactor;

      // Confidence intervals (95% confidence = ±1.96 * std dev)
      const coversCI = 1.96 * stdDevCovers * Math.sqrt(1 + 1 / historicalData.length);
      const revenueCI = 1.96 * stdDevRevenue * Math.sqrt(1 + 1 / historicalData.length);

      // Confidence percentage (lower is higher confidence)
      const confidencePct = Math.max(70, Math.min(99, 95 - i * 2)); // Decreases with lookahead

      forecasts.push({
        date: forecastDate.toISOString().split('T')[0],
        predicted_covers: Math.max(0, predictedCovers),
        predicted_revenue: Math.max(0, predictedRevenue),
        confidence_lower: Math.max(0, predictedCovers - coversCI),
        confidence_upper: predictedCovers + coversCI,
        confidence_pct: confidencePct,
        trend: trend > 2 ? 'up' : trend < -2 ? 'down' : 'stable',
      });
    }

    return forecasts;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[], mean: number): number {
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Calculate day-of-week seasonality
   * Returns multiplier for each day (0=Sunday, 6=Saturday)
   */
  private calculateSeasonality(data: HistoricalData[]): Record<number, number> {
    const dayAverages: Record<number, number[]> = {};

    // Group by day of week
    data.forEach((d) => {
      const date = new Date(d.date);
      const dayOfWeek = date.getDay();

      if (!dayAverages[dayOfWeek]) {
        dayAverages[dayOfWeek] = [];
      }
      dayAverages[dayOfWeek].push(d.covers);
    });

    // Calculate average for each day
    const overallAvg = data.reduce((a, d) => a + d.covers, 0) / data.length;
    const seasonality: Record<number, number> = {};

    for (let day = 0; day < 7; day++) {
      if (dayAverages[day] && dayAverages[day].length > 0) {
        const dayAvg = dayAverages[day].reduce((a, b) => a + b, 0) / dayAverages[day].length;
        seasonality[day] = dayAvg / overallAvg;
      } else {
        seasonality[day] = 1.0;
      }
    }

    return seasonality;
  }

  /**
   * Calculate trend (% change per day)
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    // Simple linear regression
    const n = values.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const xSum = xValues.reduce((a, b) => a + b, 0);
    const ySum = values.reduce((a, b) => a + b, 0);
    const xySum = xValues.reduce((a, b, i) => a + b * values[i], 0);
    const x2Sum = xValues.reduce((a, b) => a + b * b, 0);

    const numerator = n * xySum - xSum * ySum;
    const denominator = n * x2Sum - xSum * xSum;

    if (denominator === 0) return 0;

    const slope = numerator / denominator;
    const avgY = ySum / n;

    // Return percentage change per period
    return (slope / avgY) * 100;
  }

  /**
   * Get forecast accuracy metrics
   * Compares predicted vs actual
   */
  getAccuracy(predicted: number[], actual: number[]): {
    mae: number;
    rmse: number;
    mape: number;
  } {
    if (predicted.length !== actual.length) {
      throw new Error('Predicted and actual arrays must be same length');
    }

    let mae = 0;
    let rmse = 0;
    let mape = 0;

    for (let i = 0; i < predicted.length; i++) {
      const error = actual[i] - predicted[i];
      mae += Math.abs(error);
      rmse += error * error;
      mape += Math.abs(error) / (actual[i] || 1);
    }

    mae /= predicted.length;
    rmse = Math.sqrt(rmse / predicted.length);
    mape = (mape / predicted.length) * 100;

    return { mae, rmse, mape };
  }
}

export default DemandForecaster;
