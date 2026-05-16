// useForecastHook.js
import { useState, useEffect } from 'react';
import PredictiveAnalyticsEngine from './PredictiveAnalyticsEngine';

/**
 * Hook for running forecast calculations.
 */
export default function useForecastHook(data) {
  const [forecast, setForecast] = useState(null);

  useEffect(() => {
    const engine = new PredictiveAnalyticsEngine(data);
    setForecast(engine.forecastNextValue());
  }, [data]);

  return forecast;
}
