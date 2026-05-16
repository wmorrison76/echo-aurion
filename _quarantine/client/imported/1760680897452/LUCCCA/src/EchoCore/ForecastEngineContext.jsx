// ForecastEngineContext.jsx
// React context for ForecastEngine.

import React, { createContext, useContext } from 'react';
export const ForecastEngineContext = createContext(null);
export const useForecastEngineContext = () => useContext(ForecastEngineContext);
