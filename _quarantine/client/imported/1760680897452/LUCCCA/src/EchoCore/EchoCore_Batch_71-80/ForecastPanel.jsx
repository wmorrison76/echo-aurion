// ForecastPanel.jsx
import React from 'react';
import useForecastHook from './useForecastHook';

/**
 * Displays forecast values from PredictiveAnalyticsEngine.
 */
const ForecastPanel = ({ data }) => {
  const forecast = useForecastHook(data);
  return (
    <div className="forecast-panel">
      <h3>Forecast</h3>
      <p>{forecast !== null ? `Next Value: ${forecast}` : 'Not enough data'}</p>
    </div>
  );
};

export default ForecastPanel;
