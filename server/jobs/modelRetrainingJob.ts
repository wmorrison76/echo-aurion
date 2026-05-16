/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 3 Day 14
 * Model Retraining Job (Weekly Task)
 * 
 * Runs weekly on Sunday at 2 AM:
 * - Fetch forecast decisions from last month
 * - Compare predicted vs actual results
 * - Calculate error metrics (MAE, RMSE, accuracy)
 * - Retrain Prophet model with latest data
 * - Retrain Random Forest for overtime prediction
 * - A/B test new model vs old (10% of locations)
 * - Gradual rollout if performance improves >5%
 */

import { logger } from '../lib/logger';

interface PredictionAccuracy {
  decisionId: string;
  forecastedDemand: number;
  actualDemand: number;
  error: number;
  percentError: number;
  date: string;
}

interface ModelPerformance {
  mae: number; // Mean Absolute Error
  rmse: number; // Root Mean Squared Error
  mape: number; // Mean Absolute Percentage Error
  accuracy: number; // Percentage of predictions within 10% of actual
}

interface ModelVersion {
  id: string;
  version: number;
  type: 'prophet' | 'random-forest';
  accuracy: ModelPerformance;
  createdAt: Date;
  status: 'active' | 'testing' | 'deprecated';
  testLocations: number;
  rolloutPercentage: number;
}

export class ModelRetrainingJob {
  /**
   * Main job execution - runs weekly at 2 AM
   */
  async execute(orgId: string): Promise<{ success: boolean; report: any }> {
    const startTime = Date.now();
    logger.info('Model retraining job started', { orgId });

    try {
      // Step 1: Fetch forecast decisions from last 30 days
      const decisions = await this.fetchRecentDecisions(orgId, 30);
      logger.debug('Recent decisions fetched', {
        orgId,
        count: decisions.length,
      });

      if (decisions.length < 10) {
        logger.warn('Insufficient decisions for retraining', { orgId, count: decisions.length });
        return { success: false, report: { reason: 'Insufficient data' } };
      }

      // Step 2: Calculate prediction accuracy
      const accuracies = await this.calculateAccuracy(decisions);
      logger.debug('Accuracy calculated', {
        orgId,
        count: accuracies.length,
      });

      // Step 3: Calculate performance metrics
      const currentMetrics = this.calculateMetrics(accuracies);
      const previousMetrics = await this.getPreviousMetrics(orgId);

      logger.info('Current model performance', {
        orgId,
        mae: currentMetrics.mae.toFixed(2),
        rmse: currentMetrics.rmse.toFixed(2),
        accuracy: currentMetrics.accuracy.toFixed(1),
      });

      // Step 4: Retrain models
      const newProphetModel = await this.retrainProphetModel(orgId, accuracies);
      const newForestModel = await this.retrainRandomForest(orgId, accuracies);

      logger.info('Models retrained', {
        orgId,
        prophetVersion: newProphetModel.version,
        forestVersion: newForestModel.version,
      });

      // Step 5: A/B test new model
      const testResult = await this.performABTest(orgId, newProphetModel);

      logger.info('A/B test completed', {
        orgId,
        improvement: testResult.improvementPct.toFixed(2),
        testLocations: testResult.testLocations,
      });

      // Step 6: Gradual rollout if improvement > 5%
      if (testResult.improvementPct > 5) {
        await this.rolloutModel(orgId, newProphetModel, testResult);
        logger.info('Model rollout initiated', {
          orgId,
          modelVersion: newProphetModel.version,
          initialRollout: '50%',
        });
      } else {
        logger.info('Model improvement insufficient for rollout', {
          orgId,
          improvement: testResult.improvementPct.toFixed(2),
          threshold: 5,
        });
      }

      // Step 7: Generate report
      const report = {
        orgId,
        period: `Last 30 days`,
        decisionsAnalyzed: decisions.length,
        previousMetrics,
        currentMetrics,
        improvement: testResult.improvementPct,
        action: testResult.improvementPct > 5 ? 'rollout' : 'maintain',
        timestamp: new Date().toISOString(),
      };

      const duration = Date.now() - startTime;
      logger.info('Model retraining completed', {
        orgId,
        duration,
        improvement: testResult.improvementPct.toFixed(2),
      });

      return { success: true, report };
    } catch (error) {
      logger.error('Model retraining failed', {
        orgId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        report: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Fetch forecast decisions from last N days
   */
  private async fetchRecentDecisions(orgId: string, days: number): Promise<any[]> {
    // Mock implementation - in production, query from forecast_decisions table
    const decisions = [];
    const today = new Date();

    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      decisions.push({
        id: `forecast-${i}`,
        date: date.toISOString().split('T')[0],
        forecastedDemand: 120 + Math.random() * 60,
        actualDemand: 120 + Math.random() * 60, // Simulated actual
      });
    }

    return decisions;
  }

  /**
   * Calculate prediction accuracy for each decision
   */
  private async calculateAccuracy(decisions: any[]): Promise<PredictionAccuracy[]> {
    return decisions.map((d) => {
      const error = Math.abs(d.forecastedDemand - d.actualDemand);
      const percentError = (error / d.actualDemand) * 100;

      return {
        decisionId: d.id,
        forecastedDemand: d.forecastedDemand,
        actualDemand: d.actualDemand,
        error,
        percentError,
        date: d.date,
      };
    });
  }

  /**
   * Calculate performance metrics
   */
  private calculateMetrics(accuracies: PredictionAccuracy[]): ModelPerformance {
    const errors = accuracies.map((a) => a.error);
    const percentErrors = accuracies.map((a) => a.percentError);
    const withinThreshold = accuracies.filter((a) => a.percentError <= 10).length;

    // Mean Absolute Error
    const mae = errors.reduce((a, b) => a + b, 0) / errors.length;

    // Root Mean Squared Error
    const rmse = Math.sqrt(
      errors.reduce((a, b) => a + b * b, 0) / errors.length
    );

    // Mean Absolute Percentage Error
    const mape = percentErrors.reduce((a, b) => a + b, 0) / percentErrors.length;

    // Accuracy (% within 10% of actual)
    const accuracy = (withinThreshold / accuracies.length) * 100;

    return { mae, rmse, mape, accuracy };
  }

  /**
   * Get previous model metrics for comparison
   */
  private async getPreviousMetrics(orgId: string): Promise<ModelPerformance> {
    // Mock implementation - in production, query from model_versions table
    return {
      mae: 12.5,
      rmse: 15.8,
      mape: 8.5,
      accuracy: 82,
    };
  }

  /**
   * Retrain Prophet model with latest data
   */
  private async retrainProphetModel(orgId: string, accuracies: PredictionAccuracy[]): Promise<ModelVersion> {
    logger.debug('Retraining Prophet model', { orgId });

    // Mock Prophet retraining
    const newMetrics = this.calculateMetrics(accuracies);

    // Simulate minor improvement
    const improvedMetrics: ModelPerformance = {
      mae: newMetrics.mae * 0.95,
      rmse: newMetrics.rmse * 0.95,
      mape: newMetrics.mape * 0.95,
      accuracy: Math.min(100, newMetrics.accuracy * 1.03),
    };

    return {
      id: 'prophet-' + Date.now(),
      version: 2,
      type: 'prophet',
      accuracy: improvedMetrics,
      createdAt: new Date(),
      status: 'testing',
      testLocations: 0,
      rolloutPercentage: 0,
    };
  }

  /**
   * Retrain Random Forest for overtime prediction
   */
  private async retrainRandomForest(orgId: string, accuracies: PredictionAccuracy[]): Promise<ModelVersion> {
    logger.debug('Retraining Random Forest model', { orgId });

    const newMetrics = this.calculateMetrics(accuracies);

    // Simulate minor improvement
    const improvedMetrics: ModelPerformance = {
      mae: newMetrics.mae * 0.96,
      rmse: newMetrics.rmse * 0.96,
      mape: newMetrics.mape * 0.96,
      accuracy: Math.min(100, newMetrics.accuracy * 1.02),
    };

    return {
      id: 'forest-' + Date.now(),
      version: 2,
      type: 'random-forest',
      accuracy: improvedMetrics,
      createdAt: new Date(),
      status: 'testing',
      testLocations: 0,
      rolloutPercentage: 0,
    };
  }

  /**
   * Perform A/B test on new model
   */
  private async performABTest(
    orgId: string,
    newModel: ModelVersion
  ): Promise<{ testLocations: number; improvementPct: number }> {
    logger.debug('Performing A/B test', { orgId, modelId: newModel.id });

    // Mock: 10% of locations test new model
    const testLocations = 2; // Assuming 20 locations

    // Simulate test results
    // In production, run parallel tests and measure actual improvement
    const improvementPct = 6.2; // Example: 6.2% improvement

    logger.info('A/B test results', {
      orgId,
      testLocations,
      improvement: improvementPct.toFixed(2),
    });

    return { testLocations, improvementPct };
  }

  /**
   * Rollout new model gradually
   */
  private async rolloutModel(
    orgId: string,
    model: ModelVersion,
    testResult: { testLocations: number; improvementPct: number }
  ): Promise<void> {
    logger.info('Rolling out new model', {
      orgId,
      modelId: model.id,
      improvement: testResult.improvementPct.toFixed(2),
    });

    // Phase 1: 50% of locations (gradual rollout)
    // Phase 2: 100% if no issues (24 hours later)

    // TODO: In production, implement gradual rollout logic
    // - Update model_versions table with rollout status
    // - Store rollout schedule
    // - Monitor performance during rollout
    // - Automatic rollback if error rate increases >10%

    logger.info('Rollout initiated', {
      orgId,
      phase: '50% rollout',
      nextPhase: '24 hours',
    });
  }
}

/**
 * Export job runner for scheduling
 */
export const runModelRetrainingJob = async (orgId: string) => {
  const job = new ModelRetrainingJob();
  return job.execute(orgId);
};

/**
 * Schedule model retraining job to run weekly on Sunday at 2 AM
 */
export const scheduleJob = () => {
  // In production, integrate with job scheduler
  // Example with node-schedule:
  // const schedule = require('node-schedule');
  // schedule.scheduleJob('0 2 * * 0', async () => {
  //   const orgs = await getOrganizations();
  //   for (const org of orgs) {
  //     await runModelRetrainingJob(org.id);
  //   }
  // });

  logger.info('Model retraining job scheduler initialized (weekly Sunday 2 AM)');
};
