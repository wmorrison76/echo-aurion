/**
 * Forecasting domain types
 * Revenue forecasts, demand predictions, Prophet models
 */
import {
  StandardEntity,
  UUID,
  Money,
  ISODate,
  Percentage
} from './base';

/**
 * Forecast model configuration
 */
export interface ForecastModel extends StandardEntity {
  name: string;
  modelType: 'prophet' | 'arima' | 'linear_regression' | 'ensemble' | 'ml';

  // Target metric
  targetMetric: 'revenue' | 'covers' | 'labor_hours' | 'food_cost' | 'custom';

  // Granularity
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';

  // Parameters
  parameters: Record<string, any>;

  // Training
  trainedAt?: ISODate;
  trainingDataStart?: ISODate;
  trainingDataEnd?: ISODate;
  trainingDataPoints?: number;

  // Performance
  accuracy?: Percentage;
  mae?: number; // Mean Absolute Error
  rmse?: number; // Root Mean Square Error
  mape?: Percentage; // Mean Absolute Percentage Error

  // Status
  isActive: boolean;
  lastUsedAt?: ISODate;
}

/**
 * Revenue forecast
 */
export interface RevenueForecast extends StandardEntity {
  modelId?: UUID;
  locationId?: UUID;

  // Period
  forecastDate: ISODate;
  forecastPeriod: 'day' | 'week' | 'month' | 'quarter' | 'year';

  // Prediction
  predictedRevenue: Money;
  confidenceIntervalLow: Money;
  confidenceIntervalHigh: Money;
  confidenceLevel: Percentage; // e.g., 95%

  // Actual (once known)
  actualRevenue?: Money;
  variance?: Money;
  variancePercentage?: Percentage;

  // Contributing factors
  factors?: {
    factor: string;
    impact: number;
    description?: string;
  }[];

  // Generation
  generatedAt: ISODate;
  generatedBy: UUID;
}

/**
 * Demand forecast (covers/guests)
 */
export interface DemandForecast extends StandardEntity {
  modelId?: UUID;
  locationId?: UUID;

  // Period
  forecastDate: ISODate;
  forecastPeriod: 'day' | 'week' | 'month';
  dayOfWeek?: number; // 0-6
  timeOfDay?: string; // "lunch", "dinner"

  // Prediction
  predictedCovers: number;
  confidenceIntervalLow: number;
  confidenceIntervalHigh: number;

  // Actual
  actualCovers?: number;
  variance?: number;

  // Segmentation
  segmentBreakdown?: {
    segment: string; // "walk-in", "reservation", "delivery"
    predictedCovers: number;
  }[];

  generatedAt: ISODate;
}

/**
 * Labor forecast
 */
export interface LaborForecast extends StandardEntity {
  locationId?: UUID;

  // Period
  forecastDate: ISODate;
  forecastPeriod: 'day' | 'week' | 'month';

  // Labor needs
  predictedLaborHours: number;

  // By position
  positionBreakdown?: {
    positionId: UUID;
    hoursNeeded: number;
    staffNeeded: number;
  }[];

  // Cost
  predictedLaborCost: Money;
  predictedRevenuePerLaborHour: Money;

  // Actual
  actualLaborHours?: number;
  actualLaborCost?: Money;

  generatedAt: ISODate;
}

/**
 * Forecast accuracy tracking
 */
export interface ForecastAccuracy extends StandardEntity {
  modelId: UUID;

  // Period
  periodStart: ISODate;
  periodEnd: ISODate;

  // Metrics
  totalForecasts: number;
  accuracyRate: Percentage;
  averageVariance: Percentage;
  mae: number;
  rmse: number;
  mape: Percentage;

  // By metric type
  metricAccuracy?: {
    metric: string;
    accuracy: Percentage;
    mae: number;
  }[];

  // Recommendations
  needsRetraining: boolean;
  improvementSuggestions?: string[];

  calculatedAt: ISODate;
}

/**
 * Seasonality pattern
 */
export interface SeasonalityPattern extends StandardEntity {
  name: string;
  patternType: 'weekly' | 'monthly' | 'yearly' | 'holiday' | 'custom';

  // Pattern data
  pattern: {
    period: string; // "Monday", "January", "Christmas week"
    multiplier: number; // 1.2 = 20% above baseline
    description?: string;
  }[];

  // Affected metrics
  affectsRevenue: boolean;
  affectsCovers: boolean;
  affectsLaborNeeds: boolean;

  // Validity
  effectiveDate: ISODate;
  expirationDate?: ISODate;
  isActive: boolean;
}

/**
 * External factor (events, weather, etc.)
 */
export interface ExternalFactor extends StandardEntity {
  factorType: 'weather' | 'holiday' | 'local_event' | 'construction' | 'competition' | 'other';
  factorName: string;

  // Impact
  impactDate: ISODate;
  impactEndDate?: ISODate;
  expectedImpact: number; // -1.0 to 1.0 (percentage)
  actualImpact?: number;

  // Details
  description?: string;
  source?: string;

  // Forecasting
  includeInForecast: boolean;
}

/**
 * Forecast scenario (what-if analysis)
 */
export interface ForecastScenario extends StandardEntity {
  name: string;
  scenarioType: 'optimistic' | 'pessimistic' | 'realistic' | 'custom';

  // Assumptions
  assumptions: {
    variable: string;
    baseValue: number;
    scenarioValue: number;
    unit?: string;
  }[];

  // Results
  predictedRevenue?: Money;
  predictedCovers?: number;
  predictedLaborCost?: Money;

  // Probability
  probabilityOfOccurrence?: Percentage;

  createdBy: UUID;
}
