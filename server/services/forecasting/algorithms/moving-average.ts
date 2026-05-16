/**
 * Moving Average Algorithm
 */

import { HistoricalDataPoint, ForecastPrediction, ForecastConfig } from '../../../../shared/types/forecasting-unified';

export function movingAverage(
  data: HistoricalDataPoint[],
  config: ForecastConfig
): ForecastPrediction[] {
  const window = config.parameters.window || 7;
  const predictions: ForecastPrediction[] = [];
  
  // Calculate moving average from last N points
  const lastNPoints = data.slice(-window);
  const avg = lastNPoints.reduce((sum, p) => sum + p.value, 0) / lastNPoints.length;
  
  // Standard deviation for confidence interval
  const variance = lastNPoints.reduce((sum, p) => sum + Math.pow(p.value - avg, 2), 0) / lastNPoints.length;
  const stdDev = Math.sqrt(variance);
  
  // Generate predictions for horizon
  const lastDate = new Date(data[data.length - 1].timestamp);
  
  for (let i = 1; i <= config.horizon; i++) {
    const predictDate = new Date(lastDate);
    
    // Adjust based on granularity
    switch (config.granularity) {
      case 'hour': predictDate.setHours(predictDate.getHours() + i); break;
      case 'day': predictDate.setDate(predictDate.getDate() + i); break;
      case 'week': predictDate.setDate(predictDate.getDate() + (i * 7)); break;
      case 'month': predictDate.setMonth(predictDate.getMonth() + i); break;
    }
    
    predictions.push({
      timestamp: predictDate.toISOString(),
      predicted: avg,
      confidenceLower: avg - (1.96 * stdDev), // 95% CI
      confidenceUpper: avg + (1.96 * stdDev),
      confidence: 0.8,
      baselineContribution: avg,
      seasonalityContribution: 0,
      trendContribution: 0,
      externalFactorsContribution: {}
    });
  }
  
  return predictions;
}
