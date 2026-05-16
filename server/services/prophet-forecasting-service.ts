/**
 * Prophet Forecasting Service
 * Implements Facebook Prophet for time-series forecasting
 * 
 * Features:
 * - Prophet-based demand forecasting
 * - Historical data analysis
 * - Accuracy metrics tracking
 * - Confidence intervals
 * - Multi-seasonality support
 */

import { logger } from "../lib/logger";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Prophet Forecast Types
 */
export interface ProphetForecast {
  id: string;
  orgId: string;
  metricType: "labor_hours" | "guest_count" | "revenue" | "cost";
  forecastDate: string;
  predictedValue: number;
  lowerBound: number;
  upperBound: number;
  confidence: number; // 0-1
  seasonality?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
    yearly?: number;
  };
  trend?: {
    slope: number;
    changepoints: string[];
  };
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ProphetModelConfig {
  growth: "linear" | "logistic";
  yearlySeasonality: boolean;
  weeklySeasonality: boolean;
  dailySeasonality: boolean;
  seasonalityMode: "additive" | "multiplicative";
  changepointPriorScale: number;
  holidays?: Array<{ name: string; dates: string[] }>;
}

export interface ForecastAccuracy {
  modelId: string;
  metricType: string;
  mape: number; // Mean Absolute Percentage Error
  mae: number; // Mean Absolute Error
  rmse: number; // Root Mean Squared Error
  r2: number; // R-squared
  accuracyPercent: number; // 100 - MAPE
  evaluatedAt: string;
}

/**
 * Prophet Forecasting Service
 * Note: In production, this would use the actual Prophet library (Python)
 * This is a TypeScript wrapper that calls a Python service or uses a Node.js port
 */
export class ProphetForecastingService {
  private readonly DEFAULT_CONFIG: ProphetModelConfig = {
    growth: "linear",
    yearlySeasonality: true,
    weeklySeasonality: true,
    dailySeasonality: false,
    seasonalityMode: "additive",
    changepointPriorScale: 0.05,
  };

  /**
   * Generate forecast using Prophet
   * Note: In production, this would call a Python service running Prophet
   */
  async generateForecast(
    orgId: string,
    metricType: "labor_hours" | "guest_count" | "revenue" | "cost",
    historicalData: Array<{ date: string; value: number }>,
    forecastPeriods: number,
    config?: Partial<ProphetModelConfig>,
  ): Promise<ProphetForecast[]> {
    try {
      logger.info("[ProphetForecasting] Generating forecast", {
        orgId,
        metricType,
        dataPoints: historicalData.length,
        forecastPeriods,
      });

      // Validate historical data
      if (historicalData.length < 30) {
        throw new Error("Insufficient historical data (minimum 30 data points required)");
      }

      // Merge config
      const modelConfig = { ...this.DEFAULT_CONFIG, ...config };

      // In production, this would call a Python service with Prophet
      // For now, we'll use a simplified forecasting approach
      const forecast = await this.simplifiedForecast(historicalData, forecastPeriods, modelConfig);

      // Store forecast in database
      const forecasts: ProphetForecast[] = [];
      const startDate = new Date(historicalData[historicalData.length - 1].date);
      startDate.setDate(startDate.getDate() + 1);

      for (let i = 0; i < forecastPeriods; i++) {
        const forecastDate = new Date(startDate);
        forecastDate.setDate(forecastDate.getDate() + i);

        const forecastValue = forecast.values[i] || 0;
        const lowerBound = forecast.lowerBounds[i] || forecastValue * 0.85;
        const upperBound = forecast.upperBounds[i] || forecastValue * 1.15;
        const confidence = this.calculateConfidence(historicalData, forecastValue);

        const forecastRecord: ProphetForecast = {
          id: crypto.randomUUID(),
          orgId,
          metricType,
          forecastDate: forecastDate.toISOString(),
          predictedValue: forecastValue,
          lowerBound,
          upperBound,
          confidence,
          seasonality: forecast.seasonality,
          trend: forecast.trend,
          metadata: {
            modelConfig,
            historicalDataPoints: historicalData.length,
            forecastPeriod: i + 1,
          },
          createdAt: new Date().toISOString(),
        };

        // Store in database
        await this.storeForecast(forecastRecord);
        forecasts.push(forecastRecord);
      }

      logger.info("[ProphetForecasting] Forecast generated", {
        orgId,
        metricType,
        forecastCount: forecasts.length,
      });

      return forecasts;
    } catch (error) {
      logger.error("[ProphetForecasting] Forecast generation failed", { error, orgId, metricType });
      throw error;
    }
  }

  /**
   * Simplified forecast implementation
   * In production, this would call Prophet (Python) service
   */
  private async simplifiedForecast(
    historicalData: Array<{ date: string; value: number }>,
    periods: number,
    config: ProphetModelConfig,
  ): Promise<{
    values: number[];
    lowerBounds: number[];
    upperBounds: number[];
    seasonality?: ProphetForecast["seasonality"];
    trend?: ProphetForecast["trend"];
  }> {
    // Calculate trend (simple linear regression)
    const n = historicalData.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = historicalData.reduce((sum, d) => sum + d.value, 0);
    const sumXY = historicalData.reduce((sum, d, i) => sum + i * d.value, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate seasonality (if enabled)
    let seasonality: ProphetForecast["seasonality"] | undefined;
    if (config.weeklySeasonality) {
      seasonality = { weekly: this.calculateWeeklySeasonality(historicalData) };
    }
    if (config.monthlySeasonality) {
      seasonality = { ...seasonality, monthly: this.calculateMonthlySeasonality(historicalData) };
    }

    // Generate forecasts
    const values: number[] = [];
    const lowerBounds: number[] = [];
    const upperBounds: number[] = [];

    const lastValue = historicalData[historicalData.length - 1].value;
    const lastIndex = n - 1;

    for (let i = 0; i < periods; i++) {
      // Trend component
      const trendValue = intercept + slope * (lastIndex + i + 1);

      // Seasonality component
      let seasonalAdjustment = 0;
      if (config.weeklySeasonality && seasonality?.weekly) {
        const dayOfWeek = (new Date(historicalData[historicalData.length - 1].date).getDay() + i + 1) % 7;
        seasonalAdjustment += (seasonality.weekly[dayOfWeek] || 0);
      }

      // Combine components
      const forecastValue = config.growth === "logistic"
        ? lastValue * Math.exp(slope * (i + 1))
        : trendValue + seasonalAdjustment;

      // Calculate confidence interval (simplified)
      const stdDev = this.calculateStandardDeviation(historicalData);
      const lowerBound = forecastValue - 1.96 * stdDev; // 95% CI
      const upperBound = forecastValue + 1.96 * stdDev;

      values.push(Math.max(0, forecastValue)); // Ensure non-negative
      lowerBounds.push(Math.max(0, lowerBound));
      upperBounds.push(Math.max(0, upperBound));
    }

    return {
      values,
      lowerBounds,
      upperBounds,
      seasonality,
      trend: {
        slope,
        changepoints: [], // Would be calculated by Prophet
      },
    };
  }

  /**
   * Calculate weekly seasonality
   */
  private calculateWeeklySeasonality(data: Array<{ date: string; value: number }>): number[] {
    const dayValues: number[][] = [[], [], [], [], [], [], []];

    for (const point of data) {
      const date = new Date(point.date);
      const dayOfWeek = date.getDay();
      dayValues[dayOfWeek].push(point.value);
    }

    return dayValues.map((values) => {
      if (values.length === 0) return 0;
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      const overallAvg = data.reduce((sum, d) => sum + d.value, 0) / data.length;
      return avg - overallAvg; // Deviation from overall average
    });
  }

  /**
   * Calculate monthly seasonality
   */
  private calculateMonthlySeasonality(data: Array<{ date: string; value: number }>): number {
    // Simplified - would need more data for accurate monthly seasonality
    return 0;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(data: Array<{ date: string; value: number }>): number {
    const mean = data.reduce((sum, d) => sum + d.value, 0) / data.length;
    const variance = data.reduce((sum, d) => sum + Math.pow(d.value - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    historicalData: Array<{ date: string; value: number }>,
    forecastValue: number,
  ): number {
    // Confidence based on historical variance
    const stdDev = this.calculateStandardDeviation(historicalData);
    const mean = historicalData.reduce((sum, d) => sum + d.value, 0) / historicalData.length;
    const cv = stdDev / mean; // Coefficient of variation

    // Higher CV = lower confidence
    const confidence = Math.max(0, Math.min(1, 1 - cv / 2));
    return confidence;
  }

  /**
   * Store forecast in database
   */
  private async storeForecast(forecast: ProphetForecast): Promise<void> {
    try {
      await supabase.from("prophet_forecasts").insert({
        id: forecast.id,
        org_id: forecast.orgId,
        metric_type: forecast.metricType,
        forecast_date: forecast.forecastDate,
        predicted_value: forecast.predictedValue,
        lower_bound: forecast.lowerBound,
        upper_bound: forecast.upperBound,
        confidence: forecast.confidence,
        seasonality: forecast.seasonality || null,
        trend: forecast.trend || null,
        metadata: forecast.metadata || null,
        created_at: forecast.createdAt,
      });
    } catch (error) {
      logger.warn("[ProphetForecasting] Failed to store forecast", { error, forecastId: forecast.id });
      // Don't throw - forecast can still be returned
    }
  }

  /**
   * Evaluate forecast accuracy
   */
  async evaluateAccuracy(
    modelId: string,
    actuals: Array<{ date: string; value: number }>,
    forecasts: ProphetForecast[],
  ): Promise<ForecastAccuracy> {
    try {
      // Match actuals with forecasts by date
      const matched: Array<{ actual: number; forecast: number }> = [];

      for (const actual of actuals) {
        const forecast = forecasts.find(
          (f) => new Date(f.forecastDate).toDateString() === new Date(actual.date).toDateString(),
        );
        if (forecast) {
          matched.push({ actual: actual.value, forecast: forecast.predictedValue });
        }
      }

      if (matched.length === 0) {
        throw new Error("No matching actuals and forecasts found");
      }

      // Calculate metrics
      const n = matched.length;
      const errors = matched.map((m) => Math.abs(m.actual - m.forecast));
      const percentageErrors = matched.map((m) => Math.abs((m.actual - m.forecast) / m.actual) * 100);

      const mae = errors.reduce((sum, e) => sum + e, 0) / n;
      const mape = percentageErrors.reduce((sum, e) => sum + e, 0) / n;
      const rmse = Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / n);

      // Calculate R-squared
      const actualMean = matched.reduce((sum, m) => sum + m.actual, 0) / n;
      const ssRes = errors.reduce((sum, e) => sum + e * e, 0);
      const ssTot = matched.reduce((sum, m) => sum + Math.pow(m.actual - actualMean, 2), 0);
      const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

      const accuracy: ForecastAccuracy = {
        modelId,
        metricType: forecasts[0].metricType,
        mape,
        mae,
        rmse,
        r2,
        accuracyPercent: 100 - mape,
        evaluatedAt: new Date().toISOString(),
      };

      // Store accuracy metrics
      await supabase.from("prophet_forecast_accuracy").insert({
        model_id: modelId,
        metric_type: accuracy.metricType,
        mape: accuracy.mape,
        mae: accuracy.mae,
        rmse: accuracy.rmse,
        r2: accuracy.r2,
        accuracy_percent: accuracy.accuracyPercent,
        evaluated_at: accuracy.evaluatedAt,
      });

      logger.info("[ProphetForecasting] Accuracy evaluated", {
        modelId,
        mape: accuracy.mape.toFixed(2),
        accuracyPercent: accuracy.accuracyPercent.toFixed(2),
      });

      return accuracy;
    } catch (error) {
      logger.error("[ProphetForecasting] Accuracy evaluation failed", { error, modelId });
      throw error;
    }
  }

  /**
   * Get historical data for forecasting
   */
  async getHistoricalData(
    orgId: string,
    metricType: "labor_hours" | "guest_count" | "revenue" | "cost",
    startDate: string,
    endDate: string,
  ): Promise<Array<{ date: string; value: number }>> {
    try {
      // Fetch historical data based on metric type
      let table: string;
      let dateColumn: string;
      let valueColumn: string;

      switch (metricType) {
        case "labor_hours":
          table = "labor_forecasts";
          dateColumn = "forecast_date";
          valueColumn = "predicted_labor_hours";
          break;
        case "guest_count":
          table = "beo_banquet_orders";
          dateColumn = "event_date";
          valueColumn = "guest_count";
          break;
        case "revenue":
          table = "pos_checks";
          dateColumn = "created_at";
          valueColumn = "amount";
          break;
        case "cost":
          table = "purchase_orders";
          dateColumn = "created_at";
          valueColumn = "total_cost";
          break;
        default:
          throw new Error(`Unsupported metric type: ${metricType}`);
      }

      const { data, error } = await supabase
        .from(table)
        .select(`${dateColumn}, ${valueColumn}`)
        .eq("org_id", orgId)
        .gte(dateColumn, startDate)
        .lte(dateColumn, endDate)
        .order(dateColumn, { ascending: true });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        date: row[dateColumn],
        value: parseFloat(row[valueColumn] || 0),
      }));
    } catch (error) {
      logger.error("[ProphetForecasting] Failed to get historical data", { error, orgId, metricType });
      return [];
    }
  }
}

// Export singleton instance
export const prophetForecastingService = new ProphetForecastingService();
