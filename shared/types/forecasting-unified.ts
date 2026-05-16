/**
 * Unified Forecasting System Types
 * Consolidates revenue, demand, and labor forecasting
 */

import { UUID, ISODate } from './base';

// ============================================================================
// FORECAST CONFIGURATION
// ============================================================================

/**
 * Forecast types
 */
export type ForecastType = 'revenue' | 'demand' | 'labor' | 'inventory' | 'cost';

/**
 * Forecast method/algorithm
 */
export type ForecastMethod = 
  | 'moving_average'
  | 'exponential_smoothing'
  | 'linear_regression'
  | 'prophet'
  | 'arima'
  | 'neural_network'
  | 'ensemble';

/**
 * Time granularity
 */
export type TimeGranularity = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

/**
 * Forecast configuration
 */
export interface ForecastConfig {
  id: UUID;
  orgId: UUID;
  name: string;
  type: ForecastType;
  
  // Algorithm
  method: ForecastMethod;
  parameters: Record<string, any>;
  
  // Time settings
  granularity: TimeGranularity;
  horizon: number; // How many periods ahead
  
  // Data sources
  historicalDataDays: number;
  includeSeasonality: boolean;
  includeHolidays: boolean;
  includeWeather: boolean;
  includeEvents: boolean;
  
  // External factors
  externalFactors: {
    name: string;
    weight: number;
  }[];
  
  // Accuracy thresholds
  minAccuracy: number; // 0-1 (e.g., 0.85 = 85%)
  
  // Active/Inactive
  isActive: boolean;
  
  // Metadata
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ============================================================================
// FORECAST INPUT DATA
// ============================================================================

/**
 * Historical data point
 */
export interface HistoricalDataPoint {
  timestamp: ISODate;
  value: number;
  
  // Context
  dayOfWeek: number;
  isHoliday: boolean;
  isWeekend: boolean;
  weather?: {
    temperature: number;
    conditions: string;
  };
  events?: string[];
  
  // Additional factors
  metadata?: Record<string, any>;
}

/**
 * Time series data
 */
export interface TimeSeriesData {
  type: ForecastType;
  granularity: TimeGranularity;
  dataPoints: HistoricalDataPoint[];
  startDate: ISODate;
  endDate: ISODate;
}

// ============================================================================
// FORECAST OUTPUT
// ============================================================================

/**
 * Forecast prediction for a single point
 */
export interface ForecastPrediction {
  timestamp: ISODate;
  
  // Prediction
  predicted: number;
  
  // Confidence interval
  confidenceLower: number; // Lower bound (e.g., 10th percentile)
  confidenceUpper: number; // Upper bound (e.g., 90th percentile)
  confidence: number; // 0-1
  
  // Contribution factors
  baselineContribution: number;
  seasonalityContribution: number;
  trendContribution: number;
  externalFactorsContribution: Record<string, number>;
}

/**
 * Complete forecast result
 */
export interface ForecastResult {
  id: UUID;
  configId: UUID;
  orgId: UUID;
  
  // Forecast details
  type: ForecastType;
  method: ForecastMethod;
  granularity: TimeGranularity;
  
  // Predictions
  predictions: ForecastPrediction[];
  
  // Accuracy metrics (if validation data available)
  accuracy?: {
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
    mae: number; // Mean Absolute Error
    r2: number; // R-squared
  };
  
  // Model info
  modelVersion: string;
  trainingDate: ISODate;
  
  // Metadata
  generatedAt: ISODate;
  expiresAt?: ISODate;
}

// ============================================================================
// SEASONALITY & PATTERNS
// ============================================================================

/**
 * Seasonality pattern
 */
export interface SeasonalityPattern {
  id: UUID;
  orgId: UUID;
  name: string;
  
  // Pattern type
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  
  // Pattern data (e.g., [1.2, 0.8, 1.0, ...] for multipliers)
  multipliers: number[];
  
  // Confidence
  strength: number; // 0-1 (how strong the pattern is)
  
  // Applicable to
  appliesTo: ForecastType[];
  
  // Active period
  validFrom?: ISODate;
  validUntil?: ISODate;
  
  isActive: boolean;
}

/**
 * External factor/event
 */
export interface ExternalFactor {
  id: UUID;
  orgId: UUID;
  
  // Factor details
  name: string;
  description?: string;
  type: 'holiday' | 'event' | 'weather' | 'marketing' | 'competition' | 'custom';
  
  // Impact
  expectedImpact: number; // Multiplier (e.g., 1.3 = 30% increase)
  historicalImpact?: number; // Actual observed impact
  
  // Timing
  startDate: ISODate;
  endDate?: ISODate;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  
  // Scope
  affectsRevenue: boolean;
  affectsDemand: boolean;
  affectsLabor: boolean;
  
  isActive: boolean;
}

// ============================================================================
// FORECAST COMPARISON & ALERTS
// ============================================================================

/**
 * Actual vs Forecast comparison
 */
export interface ForecastComparison {
  id: UUID;
  forecastId: UUID;
  
  // Time period
  period: ISODate;
  
  // Values
  forecasted: number;
  actual: number;
  variance: number; // actual - forecasted
  variancePercent: number; // (actual - forecasted) / forecasted
  
  // Status
  isSignificantVariance: boolean; // > threshold
  
  // Metadata
  comparedAt: ISODate;
}

/**
 * Forecast alert
 */
export interface ForecastAlert {
  id: UUID;
  forecastId: UUID;
  
  // Alert details
  type: 'accuracy_degraded' | 'significant_variance' | 'trend_change' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  
  // Data
  expectedValue: number;
  actualValue?: number;
  variance?: number;
  
  // Actions
  requiresRetraining: boolean;
  suggestedActions: string[];
  
  // Status
  acknowledged: boolean;
  acknowledgedBy?: UUID;
  acknowledgedAt?: ISODate;
  
  createdAt: ISODate;
}
