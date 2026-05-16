/**
 * Updated Forecast Engine
 * Uses modular algorithm system
 */

import {
  ForecastConfig,
  ForecastResult,
  ForecastPrediction,
  TimeSeriesData,
  HistoricalDataPoint,
  SeasonalityPattern
} from '../../../shared/types/forecasting-unified';
import { UUID } from '../../../shared/types/base';

// Import algorithms
import { movingAverage } from './algorithms/moving-average';
import { exponentialSmoothing } from './algorithms/exponential-smoothing';
import { linearRegression } from './algorithms/linear-regression';
import { ensemble } from './algorithms/ensemble';

export class ForecastEngine {
  /**
   * Generate forecast based on configuration
   */
  async forecast(
    config: ForecastConfig,
    historicalData: TimeSeriesData,
    seasonalityPatterns: SeasonalityPattern[] = []
  ): Promise<ForecastResult> {
    // 1. Prepare data
    const preparedData = this.prepareData(historicalData);
    
    // 2. Generate predictions using configured method
    const predictions = await this.generatePredictions(
      config,
      preparedData,
      seasonalityPatterns
    );
    
    // 3. Apply seasonality if configured
    const finalPredictions = config.includeSeasonality
      ? this.applySeasonality(predictions, seasonalityPatterns, config)
      : predictions;
    
    return {
      id: crypto.randomUUID() as UUID,
      configId: config.id,
      orgId: config.orgId,
      type: config.type,
      method: config.method,
      granularity: config.granularity,
      predictions: finalPredictions,
      modelVersion: '2.0.0',
      trainingDate: new Date().toISOString(),
      generatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Generate predictions using selected algorithm
   */
  private async generatePredictions(
    config: ForecastConfig,
    data: HistoricalDataPoint[],
    seasonalityPatterns: SeasonalityPattern[]
  ): Promise<ForecastPrediction[]> {
    switch (config.method) {
      case 'moving_average':
        return movingAverage(data, config);
      
      case 'exponential_smoothing':
        return exponentialSmoothing(data, config);
      
      case 'linear_regression':
        return linearRegression(data, config);
      
      case 'ensemble':
        return ensemble(data, config, seasonalityPatterns);
      
      default:
        return ensemble(data, config, seasonalityPatterns);
    }
  }
  
  /**
   * Apply seasonality patterns
   */
  private applySeasonality(
    predictions: ForecastPrediction[],
    patterns: SeasonalityPattern[],
    config: ForecastConfig
  ): ForecastPrediction[] {
    return predictions.map((pred, idx) => {
      let seasonalMultiplier = 1.0;
      
      for (const pattern of patterns) {
        if (pattern.isActive && pattern.appliesTo.includes(config.type)) {
          const patternIdx = idx % pattern.multipliers.length;
          seasonalMultiplier *= pattern.multipliers[patternIdx];
        }
      }
      
      const baseValue = pred.predicted;
      const seasonalAdjusted = baseValue * seasonalMultiplier;
      
      return {
        ...pred,
        predicted: seasonalAdjusted,
        confidenceLower: seasonalAdjusted * 0.85,
        confidenceUpper: seasonalAdjusted * 1.15,
        seasonalityContribution: seasonalAdjusted - baseValue
      };
    });
  }
  
  /**
   * Prepare and clean data
   */
  private prepareData(data: TimeSeriesData): HistoricalDataPoint[] {
    return data.dataPoints;
  }
}

export const forecastEngine = new ForecastEngine();
