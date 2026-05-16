/**
 * Exponential Smoothing Algorithm
 */

import { HistoricalDataPoint, ForecastPrediction, ForecastConfig } from '../../../../shared/types/forecasting-unified';

export function exponentialSmoothing(
  data: HistoricalDataPoint[],
  config: ForecastConfig
): ForecastPrediction[] {
  const alpha = config.parameters.alpha || 0.3; // Smoothing factor
  const predictions: ForecastPrediction[] = [];
  
  // Calculate smoothed values
  let smoothed = data[0].value;
  for (let i = 1; i < data.length; i++) {
    smoothed = alpha * data[i].value + (1 - alpha) * smoothed;
  }
  
  // Calculate trend
  const trend = (data[data.length - 1].value - data[0].value) / data.length;
  
  // Generate predictions
  const lastDate = new Date(data[data.length - 1].timestamp);
  
  for (let i = 1; i <= config.horizon; i++) {
    const predictDate = new Date(lastDate);
    
    switch (config.granularity) {
      case 'hour': predictDate.setHours(predictDate.getHours() + i); break;
      case 'day': predictDate.setDate(predictDate.getDate() + i); break;
      case 'week': predictDate.setDate(predictDate.getDate() + (i * 7)); break;
      case 'month': predictDate.setMonth(predictDate.getMonth() + i); break;
    }
    
    const predicted = smoothed + (trend * i);
    
    predictions.push({
      timestamp: predictDate.toISOString(),
      predicted,
      confidenceLower: predicted * 0.9,
      confidenceUpper: predicted * 1.1,
      confidence: 0.85,
      baselineContribution: smoothed,
      seasonalityContribution: 0,
      trendContribution: trend * i,
      externalFactorsContribution: {}
    });
  }
  
  return predictions;
}
