import { logger } from "../lib/logger";
import { safeRequire } from "../utils/safe-require";
import { prophetForecastingService } from "./prophet-forecasting-service";

type VercelPostgresModule = { sql: any };
const vercelPg = safeRequire<VercelPostgresModule>("@vercel/postgres");

export const sql =
  vercelPg?.sql ??
  ((..._args: any[]) => {
    throw new Error(
      "ML labor forecasting requires @vercel/postgres, which is not installed in this environment.",
    );
  });

export interface LaborForecast {
  id: string;
  eventId: string;
  departmentId?: string;
  predictedLaborHours: number;
  predictedStaffCount: number;
  predictedLaborCost: number;
  predictionConfidence: number;
  lowerBoundHours: number;
  upperBoundHours: number;
  lowerBoundCost: number;
  upperBoundCost: number;
  departmentBreakdown?: Record<string, { hours: number; cost: number }>;
  forecastStatus: string;
  createdAt: string;
}

export interface MLModel {
  id: string;
  modelName: string;
  modelVersion: number;
  modelType: string;
  targetMetric: string;
  trainingCount: number;
  accuracyScore: number;
  meanAbsoluteError: number;
  isActive: boolean;
  lastTrained: string;
}

export interface TrainingDataPoint {
  guestCount: number;
  eventType: string;
  platingType: string;
  prepDays: number;
  eventDurationHours: number;
  guestComplexityScore: number;
  venueSize: string;
  actualLaborHours: number;
  actualStaffCount: number;
  actualLaborCost: number;
}

class MLLaborForecastingService {
  /**
   * Generate a labor forecast for an upcoming event
   */
  async generateForecast(
    orgId: string,
    eventId: string,
    guestCount: number,
    eventType: string,
    platingType: string,
    prepDays: number = 1,
    eventDurationHours: number = 4,
    guestComplexityScore: number = 5,
    venueSize: string = "medium",
    departmentIds?: string[],
  ): Promise<LaborForecast> {
    try {
      logger.info("[MLForecasting] Generating labor forecast", {
        eventId,
        guestCount,
        eventType,
      });

      // Get the active ML model for this organization
      const activeModel = await this.getActiveModel(orgId, "estimated_hours");

      // Build feature vector for prediction
      const features = {
        guest_count: guestCount,
        event_type: eventType,
        plating_type: platingType,
        prep_days: prepDays,
        event_duration_hours: eventDurationHours,
        guest_complexity_score: guestComplexityScore,
        venue_size: venueSize,
      };

      // Generate prediction based on historical data and model
      const prediction = await this.predictLaborHours(
        orgId,
        features,
        activeModel,
      );

      // Get confidence interval (95%)
      const { lowerBound, upperBound } = await this.calculateConfidenceInterval(
        orgId,
        prediction.hours,
        eventType,
        platingType,
        guestCount,
      );

      // Calculate cost prediction
      const costPrediction = await this.predictLaborCost(
        orgId,
        prediction.hours,
        eventType,
      );

      // Generate breakdown by department if multi-department event
      let departmentBreakdown: Record<string, { hours: number; cost: number }> =
        {};
      if (departmentIds && departmentIds.length > 0) {
        departmentBreakdown = await this.generateDepartmentBreakdown(
          orgId,
          eventId,
          prediction.hours,
          eventType,
          platingType,
          departmentIds,
        );
      }

      // Calculate prediction confidence
      const confidence = await this.calculatePredictionConfidence(
        orgId,
        features,
        activeModel,
      );

      // Store forecast in database
      const forecastResult = await sql`
        INSERT INTO labor_forecasts (
          id,
          org_id,
          event_id,
          guest_count,
          event_type,
          plating_type,
          prep_days,
          event_duration_hours,
          guest_complexity_score,
          venue_size,
          predicted_labor_hours,
          predicted_staff_count,
          predicted_labor_cost,
          prediction_confidence,
          lower_bound_hours,
          upper_bound_hours,
          lower_bound_cost,
          upper_bound_cost,
          department_breakdown,
          ml_model_id,
          forecast_status
        ) VALUES (
          gen_random_uuid(),
          ${orgId}::UUID,
          ${eventId}::UUID,
          ${guestCount}::INTEGER,
          ${eventType}::VARCHAR,
          ${platingType}::VARCHAR,
          ${prepDays}::INTEGER,
          ${eventDurationHours}::NUMERIC,
          ${guestComplexityScore}::NUMERIC,
          ${venueSize}::VARCHAR,
          ${prediction.hours}::NUMERIC,
          ${prediction.staffCount}::INTEGER,
          ${costPrediction.cost}::NUMERIC,
          ${confidence}::NUMERIC,
          ${lowerBound}::NUMERIC,
          ${upperBound}::NUMERIC,
          ${costPrediction.lowerBound}::NUMERIC,
          ${costPrediction.upperBound}::NUMERIC,
          ${JSON.stringify(departmentBreakdown)}::JSONB,
          ${activeModel.id}::UUID,
          'pending'::VARCHAR
        )
        RETURNING id, event_id, predicted_labor_hours, predicted_staff_count, 
                  predicted_labor_cost, prediction_confidence, lower_bound_hours, 
                  upper_bound_hours, lower_bound_cost, upper_bound_cost, 
                  department_breakdown, forecast_status, created_at
      `;

      const row = forecastResult.rows[0];
      return {
        id: row.id,
        eventId: row.event_id,
        predictedLaborHours: parseFloat(row.predicted_labor_hours),
        predictedStaffCount: row.predicted_staff_count,
        predictedLaborCost: parseFloat(row.predicted_labor_cost),
        predictionConfidence: parseFloat(row.prediction_confidence),
        lowerBoundHours: parseFloat(row.lower_bound_hours),
        upperBoundHours: parseFloat(row.upper_bound_hours),
        lowerBoundCost: parseFloat(row.lower_bound_cost),
        upperBoundCost: parseFloat(row.upper_bound_cost),
        departmentBreakdown: row.department_breakdown,
        forecastStatus: row.forecast_status,
        createdAt: row.created_at,
      };
    } catch (error) {
      logger.error("[MLForecasting] Error generating forecast:", error);
      throw error;
    }
  }

  /**
   * Analyze historical forecast accuracy
   */
  async analyzeHistoricalAccuracy(
    orgId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    overallAccuracy: number;
    mape: number;
    mae: number;
    rmse: number;
    periodAccuracy: Array<{
      period: string;
      forecastCount: number;
      accuracy: number;
      mape: number;
    }>;
    modelPerformance: Array<{
      modelId: string;
      modelName: string;
      accuracy: number;
      forecastCount: number;
    }>;
  }> {
    try {
      const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const end = endDate || new Date().toISOString();

      // Get completed forecasts with actuals
      const forecastsResult = await sql`
        SELECT 
          lf.id,
          lf.event_id,
          lf.predicted_labor_hours,
          lf.predicted_labor_cost,
          lf.prediction_confidence,
          lf.ml_model_id,
          lf.created_at,
          beo.actual_labor_hours,
          beo.actual_labor_cost,
          m.model_name
        FROM labor_forecasts lf
        LEFT JOIN beo_execution_status bes ON lf.event_id = bes.beo_id
        LEFT JOIN beo_banquet_orders beo ON lf.event_id = beo.id
        LEFT JOIN ml_labor_forecast_models m ON lf.ml_model_id = m.id
        WHERE lf.org_id = ${orgId}::UUID
          AND lf.forecast_status = 'completed'
          AND lf.created_at >= ${start}::TIMESTAMP
          AND lf.created_at <= ${end}::TIMESTAMP
          AND beo.actual_labor_hours IS NOT NULL
        ORDER BY lf.created_at DESC
      `;

      if (forecastsResult.rows.length === 0) {
        return {
          overallAccuracy: 0,
          mape: 0,
          mae: 0,
          rmse: 0,
          periodAccuracy: [],
          modelPerformance: [],
        };
      }

      // Calculate accuracy metrics
      const errors: number[] = [];
      const percentageErrors: number[] = [];
      const periodMap = new Map<string, { forecasts: number; totalError: number; totalPctError: number }>();

      for (const row of forecastsResult.rows) {
        const predicted = parseFloat(row.predicted_labor_hours || 0);
        const actual = parseFloat(row.actual_labor_hours || 0);

        if (actual > 0) {
          const error = Math.abs(predicted - actual);
          const pctError = (error / actual) * 100;

          errors.push(error);
          percentageErrors.push(pctError);

          // Group by month for period analysis
          const period = new Date(row.created_at).toISOString().slice(0, 7); // YYYY-MM
          if (!periodMap.has(period)) {
            periodMap.set(period, { forecasts: 0, totalError: 0, totalPctError: 0 });
          }
          const periodData = periodMap.get(period)!;
          periodData.forecasts++;
          periodData.totalError += error;
          periodData.totalPctError += pctError;
        }
      }

      // Calculate overall metrics
      const n = errors.length;
      const mae = n > 0 ? errors.reduce((sum, e) => sum + e, 0) / n : 0;
      const mape = n > 0 ? percentageErrors.reduce((sum, e) => sum + e, 0) / n : 0;
      const rmse = n > 0 ? Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / n) : 0;
      const overallAccuracy = Math.max(0, 100 - mape);

      // Period accuracy
      const periodAccuracy = Array.from(periodMap.entries()).map(([period, data]) => ({
        period,
        forecastCount: data.forecasts,
        accuracy: Math.max(0, 100 - (data.totalPctError / data.forecasts)),
        mape: data.totalPctError / data.forecasts,
      })).sort((a, b) => b.period.localeCompare(a.period));

      // Model performance
      const modelMap = new Map<string, { name: string; forecasts: number; totalPctError: number }>();
      for (const row of forecastsResult.rows) {
        const modelId = row.ml_model_id || 'unknown';
        const modelName = row.model_name || 'Unknown Model';
        if (!modelMap.has(modelId)) {
          modelMap.set(modelId, { name: modelName, forecasts: 0, totalPctError: 0 });
        }
        const modelData = modelMap.get(modelId)!;
        modelData.forecasts++;
        const predicted = parseFloat(row.predicted_labor_hours || 0);
        const actual = parseFloat(row.actual_labor_hours || 0);
        if (actual > 0) {
          const pctError = (Math.abs(predicted - actual) / actual) * 100;
          modelData.totalPctError += pctError;
        }
      }

      const modelPerformance = Array.from(modelMap.entries()).map(([modelId, data]) => ({
        modelId,
        modelName: data.name,
        accuracy: Math.max(0, 100 - (data.totalPctError / data.forecasts)),
        forecastCount: data.forecasts,
      })).sort((a, b) => b.accuracy - a.accuracy);

      // Store accuracy metrics
      await sql`
        INSERT INTO ml_forecast_accuracy_metrics (
          id, org_id, metric_type, mape, mae, rmse, accuracy_percent,
          evaluation_period_start, evaluation_period_end, evaluated_at
        ) VALUES (
          gen_random_uuid(),
          ${orgId}::UUID,
          'labor_hours'::VARCHAR,
          ${mape}::NUMERIC,
          ${mae}::NUMERIC,
          ${rmse}::NUMERIC,
          ${overallAccuracy}::NUMERIC,
          ${start}::TIMESTAMP,
          ${end}::TIMESTAMP,
          NOW()
        )
      `;

      logger.info("[MLForecasting] Historical accuracy analyzed", {
        orgId,
        forecastCount: n,
        overallAccuracy: overallAccuracy.toFixed(2),
        mape: mape.toFixed(2),
      });

      return {
        overallAccuracy,
        mape,
        mae,
        rmse,
        periodAccuracy,
        modelPerformance,
      };
    } catch (error) {
      logger.error("[MLForecasting] Error analyzing historical accuracy:", error);
      throw error;
    }
  }

  /**
   * Get historical forecast vs actual comparison
   */
  async getHistoricalComparison(
    orgId: string,
    limit: number = 50,
  ): Promise<Array<{
    forecastId: string;
    eventId: string;
    predictedHours: number;
    actualHours: number;
    error: number;
    errorPercent: number;
    predictedCost: number;
    actualCost: number;
    forecastDate: string;
    actualDate: string;
    modelId: string;
  }>> {
    try {
      const result = await sql`
        SELECT 
          lf.id as forecast_id,
          lf.event_id,
          lf.predicted_labor_hours,
          beo.actual_labor_hours,
          lf.predicted_labor_cost,
          beo.actual_labor_cost,
          lf.created_at as forecast_date,
          beo.event_date as actual_date,
          lf.ml_model_id
        FROM labor_forecasts lf
        LEFT JOIN beo_banquet_orders beo ON lf.event_id = beo.id
        WHERE lf.org_id = ${orgId}::UUID
          AND beo.actual_labor_hours IS NOT NULL
        ORDER BY lf.created_at DESC
        LIMIT ${limit}::INTEGER
      `;

      return result.rows.map((row: any) => {
        const predicted = parseFloat(row.predicted_labor_hours || 0);
        const actual = parseFloat(row.actual_labor_hours || 0);
        const error = Math.abs(predicted - actual);
        const errorPercent = actual > 0 ? (error / actual) * 100 : 0;

        return {
          forecastId: row.forecast_id,
          eventId: row.event_id,
          predictedHours: predicted,
          actualHours: actual,
          error,
          errorPercent,
          predictedCost: parseFloat(row.predicted_labor_cost || 0),
          actualCost: parseFloat(row.actual_labor_cost || 0),
          forecastDate: row.forecast_date,
          actualDate: row.actual_date,
          modelId: row.ml_model_id,
        };
      });
    } catch (error) {
      logger.error("[MLForecasting] Error getting historical comparison:", error);
      throw error;
    }
  }

  /**
   * Get the active ML model for a specific target metric
   */
  private async getActiveModel(
    orgId: string,
    targetMetric: string,
  ): Promise<MLModel> {
    try {
      const result = await sql`
        SELECT id, model_name, model_version, model_type, target_metric, 
               training_samples_count, accuracy_score, mean_absolute_error, 
               is_active, last_trained_date
        FROM ml_labor_forecast_models
        WHERE org_id = ${orgId}::UUID 
          AND is_active = TRUE 
          AND target_metric = ${targetMetric}::VARCHAR
        ORDER BY last_trained_date DESC
        LIMIT 1
      `;

      if (result.rows.length === 0) {
        // Create a default model if none exists
        return await this.initializeDefaultModel(orgId, targetMetric);
      }

      const row = result.rows[0];
      return {
        id: row.id,
        modelName: row.model_name,
        modelVersion: row.model_version,
        modelType: row.model_type,
        targetMetric: row.target_metric,
        trainingCount: row.training_samples_count,
        accuracyScore: parseFloat(row.accuracy_score),
        meanAbsoluteError: parseFloat(row.mean_absolute_error),
        isActive: row.is_active,
        lastTrained: row.last_trained_date,
      };
    } catch (error) {
      logger.error("[MLForecasting] Error retrieving model:", error);
      throw error;
    }
  }

  /**
   * Initialize a default ML model for the organization
   */
  private async initializeDefaultModel(
    orgId: string,
    targetMetric: string,
  ): Promise<MLModel> {
    try {
      const modelName = `labor_forecast_${targetMetric}_v1`;

      const result = await sql`
        INSERT INTO ml_labor_forecast_models (
          id,
          org_id,
          model_name,
          model_version,
          model_type,
          target_metric,
          training_samples_count,
          accuracy_score,
          mean_absolute_error,
          model_parameters,
          is_active,
          deployment_date
        ) VALUES (
          gen_random_uuid(),
          ${orgId}::UUID,
          ${modelName}::VARCHAR,
          1::INTEGER,
          'linear_regression'::VARCHAR,
          ${targetMetric}::VARCHAR,
          0::INTEGER,
          0.85::NUMERIC,
          2.5::NUMERIC,
          '{"method":"linear_regression","features":["guest_count","event_type","plating_type","prep_days"]}'::JSONB,
          TRUE::BOOLEAN,
          NOW()::TIMESTAMP
        )
        RETURNING id, model_name, model_version, model_type, target_metric, 
                  training_samples_count, accuracy_score, mean_absolute_error, 
                  is_active, last_trained_date
      `;

      const row = result.rows[0];
      return {
        id: row.id,
        modelName: row.model_name,
        modelVersion: row.model_version,
        modelType: row.model_type,
        targetMetric: row.target_metric,
        trainingCount: row.training_samples_count,
        accuracyScore: parseFloat(row.accuracy_score),
        meanAbsoluteError: parseFloat(row.mean_absolute_error),
        isActive: row.is_active,
        lastTrained: row.last_trained_date,
      };
    } catch (error) {
      logger.error("[MLForecasting] Error initializing default model:", error);
      throw error;
    }
  }

  /**
   * Predict labor hours using simple linear regression based on historical data
   */
  private async predictLaborHours(
    orgId: string,
    features: Record<string, any>,
    model: MLModel,
  ): Promise<{ hours: number; staffCount: number }> {
    try {
      // Get historical data for similar events
      const result = await sql`
        SELECT 
          AVG(CASE WHEN guest_count > 0 THEN actual_labor_hours / guest_count ELSE 0 END) as hours_per_guest,
          AVG(CASE WHEN guest_count > 0 THEN actual_staff_count / NULLIF(guest_count, 0) ELSE 0 END) as staff_per_guest,
          AVG(actual_labor_hours) as avg_hours,
          AVG(actual_staff_count) as avg_staff,
          STDDEV(actual_labor_hours) as stddev_hours
        FROM ml_training_dataset
        WHERE org_id = ${orgId}::UUID
          AND event_type = ${features.event_type}::VARCHAR
          AND plating_type = ${features.plating_type}::VARCHAR
          AND guest_count BETWEEN ${features.guest_count - 25}::INTEGER 
                              AND ${features.guest_count + 25}::INTEGER
          AND data_quality_score > 0.7
          AND is_outlier = FALSE
          AND created_at > NOW() - INTERVAL '180 days'
      `;

      if (result.rows.length === 0 || !result.rows[0].avg_hours) {
        // Use fallback calculation
        return this.fallbackLaborPrediction(features);
      }

      const row = result.rows[0];
      let predictedHours = parseFloat(row.avg_hours) || 0;

      // Apply prep day multiplier
      if (features.prep_days > 1) {
        predictedHours = predictedHours * (1 + (features.prep_days - 1) * 0.15);
      }

      // Apply event duration multiplier if different from standard 4 hours
      if (
        features.event_duration_hours &&
        features.event_duration_hours !== 4
      ) {
        predictedHours = predictedHours * (features.event_duration_hours / 4);
      }

      // Apply complexity multiplier
      if (
        features.guest_complexity_score &&
        features.guest_complexity_score > 5
      ) {
        const complexityMultiplier =
          1 + (features.guest_complexity_score - 5) * 0.08;
        predictedHours = predictedHours * complexityMultiplier;
      }

      // Staff count calculation: 1 staff per 10 guests typically
      const predictedStaffCount = Math.ceil(
        (features.guest_count / 10) *
          (1 + (features.guest_complexity_score - 5) * 0.05),
      );

      return {
        hours: Math.round(predictedHours * 100) / 100,
        staffCount: Math.max(2, predictedStaffCount),
      };
    } catch (error) {
      logger.error("[MLForecasting] Error predicting labor hours:", error);
      return this.fallbackLaborPrediction(features);
    }
  }

  /**
   * Fallback prediction when historical data is insufficient
   */
  private fallbackLaborPrediction(features: Record<string, any>): {
    hours: number;
    staffCount: number;
  } {
    let baseHours = (features.guest_count / 50) * 4;

    // Apply plating type multiplier
    const platingMultiplier: Record<string, number> = {
      buffet: 0.8,
      plated: 1.0,
      family_style: 0.9,
      cocktail: 0.6,
    };

    baseHours = baseHours * (platingMultiplier[features.plating_type] || 1.0);

    // Apply prep day multiplier
    if (features.prep_days > 1) {
      baseHours = baseHours * (1 + (features.prep_days - 1) * 0.15);
    }

    // Apply event duration multiplier
    if (features.event_duration_hours) {
      baseHours = baseHours * (features.event_duration_hours / 4);
    }

    // Apply complexity multiplier
    if (
      features.guest_complexity_score &&
      features.guest_complexity_score > 5
    ) {
      const complexityMultiplier =
        1 + (features.guest_complexity_score - 5) * 0.08;
      baseHours = baseHours * complexityMultiplier;
    }

    const staffCount = Math.ceil(
      (features.guest_count / 10) *
        (1 + (features.guest_complexity_score - 5) * 0.05),
    );

    return {
      hours: Math.round(baseHours * 100) / 100,
      staffCount: Math.max(2, staffCount),
    };
  }

  /**
   * Calculate 95% confidence interval for the prediction
   */
  private async calculateConfidenceInterval(
    orgId: string,
    predictedHours: number,
    eventType: string,
    platingType: string,
    guestCount: number,
  ): Promise<{ lowerBound: number; upperBound: number }> {
    try {
      const result = await sql`
        SELECT 
          STDDEV(actual_labor_hours) as stddev_hours,
          COUNT(*) as sample_count
        FROM ml_training_dataset
        WHERE org_id = ${orgId}::UUID
          AND event_type = ${eventType}::VARCHAR
          AND plating_type = ${platingType}::VARCHAR
          AND guest_count BETWEEN ${guestCount - 25}::INTEGER 
                              AND ${guestCount + 25}::INTEGER
          AND is_outlier = FALSE
          AND created_at > NOW() - INTERVAL '180 days'
      `;

      if (!result.rows[0] || !result.rows[0].stddev_hours) {
        // Default 15% margin if no data
        return {
          lowerBound: predictedHours * 0.85,
          upperBound: predictedHours * 1.15,
        };
      }

      const row = result.rows[0];
      const stdDev = parseFloat(row.stddev_hours);
      const sampleCount = parseInt(row.sample_count);

      // 95% confidence interval: mean ± 1.96 * (stddev / sqrt(n))
      const marginOfError =
        1.96 * (stdDev / Math.sqrt(Math.max(sampleCount, 1)));

      return {
        lowerBound: Math.max(0, predictedHours - marginOfError),
        upperBound: predictedHours + marginOfError,
      };
    } catch (error) {
      logger.error(
        "[MLForecasting] Error calculating confidence interval:",
        error,
      );
      return {
        lowerBound: predictedHours * 0.85,
        upperBound: predictedHours * 1.15,
      };
    }
  }

  /**
   * Predict labor cost based on predicted hours and historical rates
   */
  private async predictLaborCost(
    orgId: string,
    predictedHours: number,
    eventType: string,
  ): Promise<{ cost: number; lowerBound: number; upperBound: number }> {
    try {
      const result = await sql`
        SELECT 
          AVG(actual_labor_cost / actual_hours_worked) as avg_hourly_rate,
          STDDEV(actual_labor_cost / actual_hours_worked) as stddev_rate
        FROM labor_performance_analytics
        WHERE org_id = ${orgId}::UUID
          AND event_type = ${eventType}::VARCHAR
          AND actual_hours_worked > 0
          AND created_at > NOW() - INTERVAL '180 days'
      `;

      const hourlyRate = result.rows[0]?.avg_hourly_rate
        ? parseFloat(result.rows[0].avg_hourly_rate)
        : 30;

      const cost = predictedHours * hourlyRate;
      const lowerBound = cost * 0.85;
      const upperBound = cost * 1.15;

      return { cost: Math.round(cost * 100) / 100, lowerBound, upperBound };
    } catch (error) {
      logger.error("[MLForecasting] Error predicting labor cost:", error);
      const defaultCost = predictedHours * 30;
      return {
        cost: Math.round(defaultCost * 100) / 100,
        lowerBound: defaultCost * 0.85,
        upperBound: defaultCost * 1.15,
      };
    }
  }

  /**
   * Calculate the confidence level of the prediction
   */
  private async calculatePredictionConfidence(
    orgId: string,
    features: Record<string, any>,
    model: MLModel,
  ): Promise<number> {
    try {
      // Find similar historical events
      const result = await sql`
        SELECT COUNT(*) as matching_events
        FROM ml_training_dataset
        WHERE org_id = ${orgId}::UUID
          AND event_type = ${features.event_type}::VARCHAR
          AND plating_type = ${features.plating_type}::VARCHAR
          AND guest_count BETWEEN ${features.guest_count - 25}::INTEGER 
                              AND ${features.guest_count + 25}::INTEGER
          AND data_quality_score > 0.7
          AND created_at > NOW() - INTERVAL '180 days'
      `;

      const matchingEvents = parseInt(result.rows[0]?.matching_events || "0");

      // Confidence increases with more similar historical events (up to 95%)
      // Formula: base_accuracy + (min(matching_events, 50) / 50) * (95% - base_accuracy)
      const baseAccuracy = model.accuracyScore || 0.85;
      const confidence =
        baseAccuracy +
        (Math.min(matchingEvents, 50) / 50) * (0.95 - baseAccuracy);

      return Math.min(0.95, Math.max(0.6, confidence));
    } catch (error) {
      logger.error(
        "[MLForecasting] Error calculating prediction confidence:",
        error,
      );
      return 0.75;
    }
  }

  /**
   * Generate department-specific labor breakdown for multi-department events
   */
  private async generateDepartmentBreakdown(
    orgId: string,
    eventId: string,
    totalHours: number,
    eventType: string,
    platingType: string,
    departmentIds: string[],
  ): Promise<Record<string, { hours: number; cost: number }>> {
    try {
      const breakdown: Record<string, { hours: number; cost: number }> = {};

      for (const deptId of departmentIds) {
        // Get historical department allocation percentage
        const result = await sql`
          SELECT 
            SUM(estimated_hours) as total_dept_hours,
            SUM(estimated_labor_cost) as total_dept_cost
          FROM production_task_labor_hours ptlh
          JOIN maestro_production_tasks mpt ON mpt.id = ptlh.production_task_id
          WHERE mpt.department_id = ${deptId}::UUID
            AND mpt.org_id = ${orgId}::UUID
            AND mpt.created_at > NOW() - INTERVAL '90 days'
        `;

        if (result.rows[0] && result.rows[0].total_dept_hours) {
          // Allocate proportional to historical department load
          const deptHours = Math.round(((totalHours * 0.6) / 3) * 100) / 100; // Simplified allocation

          breakdown[deptId] = {
            hours: deptHours,
            cost: deptHours * 30, // Assuming $30/hour average
          };
        }
      }

      return breakdown;
    } catch (error) {
      logger.error(
        "[MLForecasting] Error generating department breakdown:",
        error,
      );
      return {};
    }
  }

  /**
   * Get forecast for a specific event
   */
  async getForecast(forecastId: string): Promise<LaborForecast | null> {
    try {
      const result = await sql`
        SELECT id, event_id, predicted_labor_hours, predicted_staff_count,
               predicted_labor_cost, prediction_confidence, lower_bound_hours,
               upper_bound_hours, lower_bound_cost, upper_bound_cost,
               department_breakdown, forecast_status, created_at
        FROM labor_forecasts
        WHERE id = ${forecastId}::UUID
      `;

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        eventId: row.event_id,
        predictedLaborHours: parseFloat(row.predicted_labor_hours),
        predictedStaffCount: row.predicted_staff_count,
        predictedLaborCost: parseFloat(row.predicted_labor_cost),
        predictionConfidence: parseFloat(row.prediction_confidence),
        lowerBoundHours: parseFloat(row.lower_bound_hours),
        upperBoundHours: parseFloat(row.upper_bound_hours),
        lowerBoundCost: parseFloat(row.lower_bound_cost),
        upperBoundCost: parseFloat(row.upper_bound_cost),
        departmentBreakdown: row.department_breakdown,
        forecastStatus: row.forecast_status,
        createdAt: row.created_at,
      };
    } catch (error) {
      logger.error("[MLForecasting] Error retrieving forecast:", error);
      return null;
    }
  }

  /**
   * Update forecast status
   */
  async updateForecastStatus(
    forecastId: string,
    status: string,
  ): Promise<boolean> {
    try {
      const result = await sql`
        UPDATE labor_forecasts
        SET forecast_status = ${status}::VARCHAR,
            updated_at = NOW()
        WHERE id = ${forecastId}::UUID
        RETURNING id
      `;

      return result.rows.length > 0;
    } catch (error) {
      logger.error("[MLForecasting] Error updating forecast status:", error);
      return false;
    }
  }

  /**
   * Record training data from a completed event for model improvement
   */
  async recordTrainingData(
    orgId: string,
    trainingData: TrainingDataPoint,
    eventId: string,
  ): Promise<boolean> {
    try {
      // Calculate data quality score
      const dataQualityScore = this.calculateDataQuality(trainingData);

      const isOutlier = this.detectOutlier(trainingData);

      await sql`
        INSERT INTO ml_training_dataset (
          id,
          org_id,
          guest_count,
          event_type,
          plating_type,
          prep_days,
          event_duration_hours,
          guest_complexity_score,
          venue_size,
          actual_labor_hours,
          actual_staff_count,
          actual_labor_cost,
          data_quality_score,
          is_outlier,
          created_from_event_id
        ) VALUES (
          gen_random_uuid(),
          ${orgId}::UUID,
          ${trainingData.guestCount}::INTEGER,
          ${trainingData.eventType}::VARCHAR,
          ${trainingData.platingType}::VARCHAR,
          ${trainingData.prepDays}::INTEGER,
          ${trainingData.eventDurationHours}::NUMERIC,
          ${trainingData.guestComplexityScore}::NUMERIC,
          ${trainingData.venueSize}::VARCHAR,
          ${trainingData.actualLaborHours}::NUMERIC,
          ${trainingData.actualStaffCount}::INTEGER,
          ${trainingData.actualLaborCost}::NUMERIC,
          ${dataQualityScore}::NUMERIC,
          ${isOutlier}::BOOLEAN,
          ${eventId}::UUID
        )
      `;

      return true;
    } catch (error) {
      logger.error("[MLForecasting] Error recording training data:", error);
      return false;
    }
  }

  /**
   * Adjust Prophet forecast based on event-specific features
   */
  private async adjustProphetForecast(
    prophetHours: number,
    features: Record<string, any>,
    orgId: string,
  ): Promise<number> {
    try {
      // Get adjustment factors from historical data for similar events
      const result = await sql`
        SELECT 
          AVG(CASE WHEN actual_labor_hours > 0 AND predicted_labor_hours > 0 
            THEN actual_labor_hours / predicted_labor_hours 
            ELSE 1.0 END) as adjustment_factor
        FROM labor_forecasts
        WHERE org_id = ${orgId}::UUID
          AND event_type = ${features.event_type}::VARCHAR
          AND plating_type = ${features.plating_type}::VARCHAR
          AND guest_count BETWEEN ${features.guest_count - 25}::INTEGER 
                              AND ${features.guest_count + 25}::INTEGER
          AND actual_hours IS NOT NULL
          AND predicted_labor_hours > 0
          AND created_at > NOW() - INTERVAL '180 days'
      `;

      const adjustmentFactor = result.rows[0]?.adjustment_factor || 1.0;

      // Apply adjustment with smoothing
      const adjustedHours = prophetHours * (0.7 + 0.3 * adjustmentFactor);

      // Apply feature-based adjustments
      let finalHours = adjustedHours;

      // Adjust for event complexity
      if (features.guest_complexity_score > 7) {
        finalHours *= 1.2; // 20% increase for high complexity
      } else if (features.guest_complexity_score > 5) {
        finalHours *= 1.1; // 10% increase for medium complexity
      }

      // Adjust for prep days
      if (features.prep_days < 1) {
        finalHours *= 1.15; // 15% increase for rushed prep
      }

      // Adjust for venue size
      if (features.venue_size === "large") {
        finalHours *= 1.1; // 10% increase for large venues
      }

      return Math.max(0, finalHours);
    } catch (error) {
      logger.warn("[MLForecasting] Prophet adjustment failed, using base forecast", { error });
      return prophetHours;
    }
  }

  /**
   * Calculate data quality score for training data
   */
  private calculateDataQuality(data: TrainingDataPoint): number {
    let score = 1.0;

    // Penalize missing fields
    if (!data.guestCount || !data.actualLaborHours || !data.actualStaffCount) {
      score -= 0.2;
    }

    // Penalize if hours per guest is extreme
    const hoursPerGuest = data.actualLaborHours / data.guestCount;
    if (hoursPerGuest < 0.05 || hoursPerGuest > 1.0) {
      score -= 0.15;
    }

    // Penalize if cost per hour is extreme
    const costPerHour =
      data.actualLaborHours > 0
        ? data.actualLaborCost / data.actualLaborHours
        : 0;
    if (costPerHour < 10 || costPerHour > 100) {
      score -= 0.15;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Detect if a data point is an outlier
   */
  private detectOutlier(data: TrainingDataPoint): boolean {
    const hoursPerGuest = data.actualLaborHours / (data.guestCount || 1);

    // Flag as outlier if hours per guest is extreme
    if (hoursPerGuest < 0.02 || hoursPerGuest > 1.5) {
      return true;
    }

    // Flag if staff per hour is extreme
    const staffPerHour =
      (data.actualStaffCount || 0) / Math.max(data.actualLaborHours, 1);
    if (staffPerHour > 1.5 || staffPerHour < 0.1) {
      return true;
    }

    return false;
  }

  /**
   * Get forecast accuracy metrics by comparing predictions to actuals
   */
  async getForecastAccuracy(
    orgId: string,
    daysBack: number = 30,
  ): Promise<{
    meanAbsolutePercentageError: number;
    rootMeanSquaredError: number;
    totalForecasts: number;
    accurateForecasts: number;
  }> {
    try {
      const result = await sql`
        SELECT 
          COUNT(*) as total_forecasts,
          COUNT(CASE WHEN ABS(forecast_accuracy_percentage) < 10 THEN 1 END) as accurate_forecasts,
          AVG(ABS(forecast_accuracy_percentage)) as mean_error,
          SQRT(AVG(POW(forecast_accuracy_percentage, 2))) as rmse
        FROM labor_forecasts
        WHERE org_id = ${orgId}::UUID
          AND actual_hours IS NOT NULL
          AND created_at > NOW() - INTERVAL '${daysBack} days'
      `;

      const row = result.rows[0];
      return {
        meanAbsolutePercentageError: parseFloat(row.mean_error) || 0,
        rootMeanSquaredError: parseFloat(row.rmse) || 0,
        totalForecasts: parseInt(row.total_forecasts),
        accurateForecasts: parseInt(row.accurate_forecasts),
      };
    } catch (error) {
      logger.error(
        "[MLForecasting] Error calculating forecast accuracy:",
        error,
      );
      return {
        meanAbsolutePercentageError: 0,
        rootMeanSquaredError: 0,
        totalForecasts: 0,
        accurateForecasts: 0,
      };
    }
  }
}

export const mlLaborForecasting = new MLLaborForecastingService();
