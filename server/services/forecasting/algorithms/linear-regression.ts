/**
 * Linear Regression Algorithm
 */

import { HistoricalDataPoint, ForecastPrediction, ForecastConfig } from '../../../../shared/types/forecasting-unified';

export function linearRegression(
  data: HistoricalDataPoint[],
  config: ForecastConfig
): ForecastPrediction[] {
  const n = data.length;
  const xValues = data.map((_, i) => i);
  const yValues = data.map(p => p.value);
  
  // Calculate slope (m) and intercept (b): y = mx + b
  const xSum = xValues.reduce((a, b) => a + b, 0);
  const ySum = yValues.reduce((a, b) => a + b, 0);
  const xySum = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const x2Sum = xValues.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
  const intercept = (ySum - slope * xSum) / n;
  
  // Calculate R-squared for confidence
  const yMean = ySum / n;
  const ssTot = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const ssRes = yValues.reduce((sum, y, i) => sum + Math.pow(y - (slope * i + intercept), 2), 0);
  const r2 = 1 - (ssRes / ssTot);
  
  // Generate predictions
  const predictions: ForecastPrediction[] = [];
  const lastDate = new Date(data[data.length - 1].timestamp);
  
  for (let i = 1; i <= config.horizon; i++) {
    const predictDate = new Date(lastDate);
    
    switch (config.granularity) {
      case 'hour': predictDate.setHours(predictDate.getHours() + i); break;
      case 'day': predictDate.setDate(predictDate.getDate() + i); break;
      case 'week': predictDate.setDate(predictDate.getDate() + (i * 7)); break;
      case 'month': predictDate.setMonth(predictDate.getMonth() + i); break;
    }
    
    const x = n + i - 1;
    const predicted = slope * x + intercept;
    
    predictions.push({
      timestamp: predictDate.toISOString(),
      predicted,
      confidenceLower: predicted * 0.85,
      confidenceUpper: predicted * 1.15,
      confidence: Math.min(0.95, r2),
      baselineContribution: intercept,
      seasonalityContribution: 0,
      trendContribution: slope * x,
      externalFactorsContribution: {}
    });
  }
  
  return predictions;
}
