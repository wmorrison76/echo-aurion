/**
 * Enhanced Forecasting Service
 * -----------------------------
 * Enhanced demand forecasting with external data integration
 * Features: Weather API, Event calendar, Prophet models, confidence intervals
 */

import { logger } from "../lib/logger";
import axios from "axios";

export interface ForecastRequest {
  orgId: string;
  outletId?: string;
  deptId?: string;
  startDate: string; // ISO date
  horizonDays: number; // Forecast horizon (default: 7)
  includeConfidence?: boolean; // Include confidence intervals
  externalFactors?: {
    weather?: boolean;
    events?: boolean;
    holidays?: boolean;
  };
}

export interface ForecastResult {
  orgId: string;
  outletId?: string;
  deptId?: string;
  startDate: string;
  horizonDays: number;
  forecasts: ForecastPoint[];
  confidence: number; // Overall confidence 0-1
  factors: string[]; // Factors considered
  generatedAt: string; // ISO datetime
  modelVersion: string;
}

export interface ForecastPoint {
  date: string; // ISO date
  value: number; // Forecasted demand/hours
  lowerBound?: number; // Confidence interval lower bound
  upperBound?: number; // Confidence interval upper bound
  confidence: number; // Point-specific confidence 0-1
  factors?: {
    weather?: number;
    events?: number;
    holidays?: number;
    base?: number;
  };
}

export interface ExternalData {
  weather?: WeatherData;
  events?: EventData[];
  holidays?: HolidayData[];
}

export interface WeatherData {
  date: string;
  temperature: number;
  conditions: string; // "sunny", "rainy", "snowy", etc.
  impact: number; // 0-1, impact on demand
}

export interface EventData {
  id: string;
  name: string;
  date: string;
  type: string; // "sports", "concert", "conference", etc.
  expectedAttendance?: number;
  impact: number; // 0-1, impact on demand
}

export interface HolidayData {
  name: string;
  date: string;
  type: string; // "national", "regional", "local"
  impact: number; // 0-1, impact on demand
}

/**
 * Enhanced Forecasting Service
 * Provides demand forecasting with external data integration
 */
export class EnhancedForecastingService {
  private weatherApiKey?: string;
  private calendarApiKey?: string;
  private modelVersion = "1.0.0";

  constructor() {
    this.weatherApiKey = process.env.WEATHER_API_KEY;
    this.calendarApiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  }

  /**
   * Generate forecast
   */
  async generateForecast(request: ForecastRequest): Promise<ForecastResult> {
    // Get historical data (mock - in production, query from database)
    const historicalData = await this.getHistoricalData(
      request.orgId,
      request.outletId,
      request.deptId
    );

    // Get external data if requested
    const externalData: ExternalData = {};
    if (request.externalFactors?.weather) {
      externalData.weather = await this.getWeatherData(request.startDate, request.horizonDays);
    }
    if (request.externalFactors?.events) {
      externalData.events = await this.getEventData(request.orgId, request.startDate, request.horizonDays);
    }
    if (request.externalFactors?.holidays) {
      externalData.holidays = await this.getHolidayData(request.startDate, request.horizonDays);
    }

    // Generate forecast using Prophet model
    const forecasts = await this.generateProphetForecast(
      historicalData,
      request.horizonDays,
      request.startDate,
      externalData,
      request.includeConfidence || false
    );

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(forecasts);

    // Determine factors used
    const factors: string[] = ["historical", "trend"];
    if (externalData.weather) factors.push("weather");
    if (externalData.events && externalData.events.length > 0) factors.push("events");
    if (externalData.holidays && externalData.holidays.length > 0) factors.push("holidays");

    const result: ForecastResult = {
      orgId: request.orgId,
      outletId: request.outletId,
      deptId: request.deptId,
      startDate: request.startDate,
      horizonDays: request.horizonDays,
      forecasts,
      confidence,
      factors,
      generatedAt: new Date().toISOString(),
      modelVersion: this.modelVersion,
    };

    logger.info("[Forecast] Forecast generated", {
      orgId: request.orgId,
      horizonDays: request.horizonDays,
      confidence,
      factors,
    });

    return result;
  }

  /**
   * Get historical data
   */
  private async getHistoricalData(
    orgId: string,
    outletId?: string,
    deptId?: string
  ): Promise<Array<{ date: string; value: number }>> {
    // Mock implementation - in production, query from database
    const historicalData: Array<{ date: string; value: number }> = [];

    // Generate mock historical data (last 90 days)
    for (let i = 90; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const value = 100 + Math.sin((i / 90) * Math.PI * 2) * 30 + (Math.random() - 0.5) * 20;

      historicalData.push({
        date: date.toISOString().split("T")[0],
        value: Math.max(0, value),
      });
    }

    return historicalData;
  }

  /**
   * Get weather data
   */
  private async getWeatherData(startDate: string, horizonDays: number): Promise<WeatherData | undefined> {
    if (!this.weatherApiKey) {
      logger.warn("[Forecast] Weather API key not configured");
      return undefined;
    }

    try {
      // Mock implementation - in production, use actual weather API (OpenWeatherMap, etc.)
      // const response = await axios.get(`https://api.openweathermap.org/data/2.5/forecast`, {
      //   params: {
      //     q: location,
      //     appid: this.weatherApiKey,
      //   },
      // });

      // Mock weather data
      return {
        date: startDate,
        temperature: 72,
        conditions: "sunny",
        impact: 0.1, // Sunny weather increases demand slightly
      };
    } catch (error) {
      logger.error("[Forecast] Weather data fetch error", { error });
      return undefined;
    }
  }

  /**
   * Get event data
   */
  private async getEventData(
    orgId: string,
    startDate: string,
    horizonDays: number
  ): Promise<EventData[]> {
    // Mock implementation - in production, query from events/calendar database
    const events: EventData[] = [];

    // Check for events in forecast period
    // Mock: Check if there are events in the period
    const hasEvent = Math.random() > 0.7; // 30% chance of event

    if (hasEvent) {
      events.push({
        id: `event_${Date.now()}`,
        name: "Local Sports Game",
        date: startDate,
        type: "sports",
        expectedAttendance: 5000,
        impact: 0.3, // Increases demand by 30%
      });
    }

    return events;
  }

  /**
   * Get holiday data
   */
  private async getHolidayData(startDate: string, horizonDays: number): Promise<HolidayData[]> {
    // Mock implementation - in production, use holiday calendar API
    const holidays: HolidayData[] = [];

    // Check for holidays in forecast period
    // Mock: Check if there are holidays in the period
    const hasHoliday = Math.random() > 0.8; // 20% chance of holiday

    if (hasHoliday) {
      holidays.push({
        name: "Holiday",
        date: startDate,
        type: "national",
        impact: 0.5, // Increases demand by 50%
      });
    }

    return holidays;
  }

  /**
   * Generate Prophet forecast
   */
  private async generateProphetForecast(
    historicalData: Array<{ date: string; value: number }>,
    horizonDays: number,
    startDate: string,
    externalData: ExternalData,
    includeConfidence: boolean
  ): Promise<ForecastPoint[]> {
    // Mock Prophet forecast - in production, use actual Prophet library or call ML service
    const forecasts: ForecastPoint[] = [];

    // Calculate base forecast using simple trend
    const avgValue = historicalData.reduce((sum, d) => sum + d.value, 0) / historicalData.length;
    const trend = this.calculateTrend(historicalData);

    for (let day = 0; day < horizonDays; day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split("T")[0];

      // Base forecast
      let baseValue = avgValue + trend * day;

      // Apply external factors
      const factors: ForecastPoint["factors"] = {
        base: baseValue,
      };

      // Weather impact
      if (externalData.weather) {
        const weatherImpact = baseValue * externalData.weather.impact;
        baseValue += weatherImpact;
        factors.weather = weatherImpact;
      }

      // Event impact
      const event = externalData.events?.find((e) => e.date === dateStr);
      if (event) {
        const eventImpact = baseValue * event.impact;
        baseValue += eventImpact;
        factors.events = eventImpact;
      }

      // Holiday impact
      const holiday = externalData.holidays?.find((h) => h.date === dateStr);
      if (holiday) {
        const holidayImpact = baseValue * holiday.impact;
        baseValue += holidayImpact;
        factors.holidays = holidayImpact;
      }

      // Confidence decreases with horizon
      const confidence = Math.max(0.5, 1.0 - (day / horizonDays) * 0.4);

      // Confidence intervals (if requested)
      let lowerBound: number | undefined;
      let upperBound: number | undefined;

      if (includeConfidence) {
        const margin = baseValue * (1 - confidence) * 0.5;
        lowerBound = Math.max(0, baseValue - margin);
        upperBound = baseValue + margin;
      }

      forecasts.push({
        date: dateStr,
        value: Math.max(0, baseValue),
        lowerBound,
        upperBound,
        confidence,
        factors,
      });
    }

    return forecasts;
  }

  /**
   * Calculate trend from historical data
   */
  private calculateTrend(data: Array<{ date: string; value: number }>): number {
    if (data.length < 2) return 0;

    // Simple linear regression slope
    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = data.reduce((sum, d) => sum + d.value, 0);
    const sumXY = data.reduce((sum, d, idx) => sum + d.value * idx, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope || 0;
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(forecasts: ForecastPoint[]): number {
    if (forecasts.length === 0) return 0;

    const avgConfidence = forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length;

    // Penalize if confidence intervals are wide
    let intervalPenalty = 0;
    forecasts.forEach((f) => {
      if (f.lowerBound !== undefined && f.upperBound !== undefined) {
        const interval = (f.upperBound - f.lowerBound) / f.value;
        intervalPenalty += Math.min(0.2, interval * 0.1); // Max 20% penalty
      }
    });

    const penalty = intervalPenalty / forecasts.length;

    return Math.max(0, Math.min(1, avgConfidence - penalty));
  }

  /**
   * Track forecast accuracy
   */
  async trackAccuracy(
    forecastId: string,
    actualData: Array<{ date: string; value: number }>
  ): Promise<{
    forecastId: string;
    accuracy: number; // 0-1
    mae: number; // Mean Absolute Error
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Squared Error
  }> {
    // Mock implementation - in production, compare forecast with actuals
    const accuracy = 0.85; // 85% accuracy
    const mae = 5.2; // Mean absolute error
    const mape = 0.08; // 8% MAPE
    const rmse = 7.1; // Root mean squared error

    logger.info("[Forecast] Accuracy tracked", {
      forecastId,
      accuracy,
      mae,
      mape,
      rmse,
    });

    return {
      forecastId,
      accuracy,
      mae,
      mape,
      rmse,
    };
  }
}

// Singleton instance
let enhancedForecastingInstance: EnhancedForecastingService | null = null;

export function getEnhancedForecastingService(): EnhancedForecastingService {
  if (!enhancedForecastingInstance) {
    enhancedForecastingInstance = new EnhancedForecastingService();
  }
  return enhancedForecastingInstance;
}

export default EnhancedForecastingService;
