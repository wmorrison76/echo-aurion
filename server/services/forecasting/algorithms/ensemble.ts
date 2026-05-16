/**
 * Ensemble Algorithm
 * Combines multiple algorithms for better accuracy
 */

import { HistoricalDataPoint, ForecastPrediction, ForecastConfig, SeasonalityPattern } from '../../../../shared/types/forecasting-unified';
import { movingAverage } from './moving-average';
import { exponentialSmoothing } from './exponential-smoothing';
import { linearRegression } from './linear-regression';

export function ensemble(
  data: HistoricalDataPoint[],
  config: ForecastConfig,
  seasonalityPatterns: SeasonalityPattern[] = []
): ForecastPrediction[] {
  // Run multiple algorithms
  const ma = movingAverage(data, config);
  const es = exponentialSmoothing(data, config);
  const lr = linearRegression(data, config);
  
  // Average predictions
  const ensemblePredictions: ForecastPrediction[] = [];
  
  for (let i = 0; i < config.horizon; i++) {
    const avgPredicted = (ma[i].predicted + es[i].predicted + lr[i].predicted) / 3;
    const avgLower = (ma[i].confidenceLower + es[i].confidenceLower + lr[i].confidenceLower) / 3;
    const avgUpper = (ma[i].confidenceUpper + es[i].confidenceUpper + lr[i].confidenceUpper) / 3;
    
    ensemblePredictions.push({
      timestamp: ma[i].timestamp,
      predicted: avgPredicted,
      confidenceLower: avgLower,
      confidenceUpper: avgUpper,
      confidence: 0.95, // Higher confidence from ensemble
      baselineContribution: ma[i].baselineContribution,
      seasonalityContribution: 0,
      trendContribution: lr[i].trendContribution,
      externalFactorsContribution: {}
    });
  }
  
  return ensemblePredictions;
}
