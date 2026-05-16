// useForecastEngine.js
// Hook to consume ForecastEngine.

import { useContext } from 'react';
import { ForecastEngineContext } from './ForecastEngineContext';
export default function useForecastEngine() {
  return useContext(ForecastEngineContext);
}
