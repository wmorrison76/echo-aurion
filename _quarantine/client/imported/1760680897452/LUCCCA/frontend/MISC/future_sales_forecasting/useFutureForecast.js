// File: useFutureForecast.js
// Mock forecast logic using sample data and weights

import { useMemo } from "react";

const sampleMetrics = {
  occupancy: 0.82,
  banquetCount: 5,
  transientRate: 200,
  menuDemandScore: 0.75,
  lunarInfluence: 1.02,
  historicalAvg: 7500,
};

function calculateForecast(weights) {
  return (
    sampleMetrics.occupancy * weights.occupancy +
    sampleMetrics.banquetCount * weights.banquets +
    sampleMetrics.transientRate * weights.transient +
    sampleMetrics.menuDemandScore * weights.menu +
    sampleMetrics.lunarInfluence * weights.lunar +
    sampleMetrics.historicalAvg * weights.history
  );
}

export function useFutureForecast() {
  return useMemo(() => {
    return {
      today: calculateForecast({ occupancy: 100, banquets: 150, transient: 2, menu: 500, lunar: 75, history: 0.1 }),
      next7Days: calculateForecast({ occupancy: 700, banquets: 900, transient: 10, menu: 4000, lunar: 500, history: 1 }),
      next30Days: calculateForecast({ occupancy: 2800, banquets: 3600, transient: 35, menu: 16000, lunar: 1800, history: 4 }),
      next12Months: calculateForecast({ occupancy: 36000, banquets: 45000, transient: 450, menu: 200000, lunar: 10000, history: 52 }),
    };
  }, []);
}