/** * usePnLBudgetForecasting Hook * Generate budget forecasts based on trends and assumptions */ import {
  useState,
  useCallback,
  useMemo,
} from "react";
import { DetailedPnL, Period } from "@/shared/types/pnlTypes";
export interface BudgetForecast {
  id: string;
  period: Period;
  method: "linear" | "exponential" | "seasonal" | "custom";
  confidence: number;
  lineItemForecasts: {
    lineItemId: string;
    lineItemName: string;
    currentActual: number;
    forecast: number;
    variance: number;
    variancePercent: number;
    confidence: number;
  }[];
  totalRevenueForecast: number;
  totalCogsForecast: number;
  grossProfitForecast: number;
  operatingIncomeForecast: number;
  netIncomeForecast: number;
}
export interface HistoricalData {
  period: Period;
  revenue: number;
  cogs: number;
  operatingIncome: number;
}
export function usePnLBudgetForecasting(currentPnL: DetailedPnL) {
  const [forecasts, setForecasts] = useState<BudgetForecast[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const addHistoricalData = useCallback((data: HistoricalData[]) => {
    setHistoricalData(data);
  }, []);
  const generateForecast = useCallback(
    (
      period: Period,
      method: BudgetForecast["method"] = "linear",
      assumptions?: Record<string, number>,
    ) => {
      if (historicalData.length === 0) {
        console.warn("No historical data available for forecasting");
        return null;
      }
      let forecast: BudgetForecast;
      switch (method) {
        case "linear":
          forecast = generateLinearForecast(
            currentPnL,
            historicalData,
            period,
            assumptions,
          );
          break;
        case "exponential":
          forecast = generateExponentialForecast(
            currentPnL,
            historicalData,
            period,
          );
          break;
        case "seasonal":
          forecast = generateSeasonalForecast(
            currentPnL,
            historicalData,
            period,
          );
          break;
        case "custom":
          forecast = generateCustomForecast(
            currentPnL,
            period,
            assumptions || {},
          );
          break;
        default:
          forecast = generateLinearForecast(
            currentPnL,
            historicalData,
            period,
            assumptions,
          );
      }
      setForecasts((prev) => [...prev, forecast]);
      return forecast;
    },
    [currentPnL, historicalData],
  );
  const updateForecast = useCallback(
    (id: string, updates: Partial<BudgetForecast>) => {
      setForecasts((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      );
    },
    [],
  );
  const deleteForecast = useCallback((id: string) => {
    setForecasts((prev) => prev.filter((f) => f.id !== id));
  }, []);
  const compareForecastToActual = useCallback(
    (forecastId: string) => {
      const forecast = forecasts.find((f) => f.id === forecastId);
      if (!forecast) return null;
      return {
        metric: "Comparison",
        revenue: {
          forecast: forecast.totalRevenueForecast,
          actual: currentPnL.totalRevenue,
          variance: currentPnL.totalRevenue - forecast.totalRevenueForecast,
          variancePercent:
            ((currentPnL.totalRevenue - forecast.totalRevenueForecast) /
              forecast.totalRevenueForecast) *
            100,
        },
        operatingIncome: {
          forecast: forecast.operatingIncomeForecast,
          actual: currentPnL.operatingIncome,
          variance:
            currentPnL.operatingIncome - forecast.operatingIncomeForecast,
          variancePercent:
            ((currentPnL.operatingIncome - forecast.operatingIncomeForecast) /
              forecast.operatingIncomeForecast) *
            100,
        },
      };
    },
    [forecasts, currentPnL],
  );
  const getAccuracyMetrics = useMemo(() => {
    if (forecasts.length === 0) return null;
    const accuracies = forecasts
      .filter((f) => f.confidence !== undefined)
      .map((f) => f.confidence);
    return {
      average: accuracies.reduce((a, b) => a + b, 0) / accuracies.length,
      highest: Math.max(...accuracies),
      lowest: Math.min(...accuracies),
    };
  }, [forecasts]);
  return {
    forecasts,
    historicalData,
    addHistoricalData,
    generateForecast,
    updateForecast,
    deleteForecast,
    compareForecastToActual,
    accuracyMetrics: getAccuracyMetrics,
  };
}
function generateLinearForecast(
  currentPnL: DetailedPnL,
  historicalData: HistoricalData[],
  period: Period,
  assumptions?: Record<string, number>,
): BudgetForecast {
  // Calculate average growth rate const revenues = historicalData.map((d) => d.revenue); const avgRevenue = revenues.reduce((a, b) => a + b, 0) / Math.max(revenues.length, 1); const growthRate = assumptions?.growthRate || 0.02; // Default 2% growth const forecasted = { revenue: avgRevenue * (1 + growthRate), cogs: (avgRevenue * (1 + growthRate)) * 0.3, // Assume 30% COGS operatingIncome: (avgRevenue * (1 + growthRate)) * 0.25, // Assume 25% op margin }; return { id: `forecast-${Date.now()}`, period, method:"linear", confidence: 0.75, lineItemForecasts: [], totalRevenueForecast: forecasted.revenue, totalCogsForecast: forecasted.cogs, grossProfitForecast: forecasted.revenue - forecasted.cogs, operatingIncomeForecast: forecasted.operatingIncome, netIncomeForecast: forecasted.operatingIncome * 0.8, // Assume 20% tax rate };
}
function generateExponentialForecast(
  currentPnL: DetailedPnL,
  historicalData: HistoricalData[],
  period: Period,
): BudgetForecast {
  // More aggressive growth model const revenues = historicalData.map((d) => d.revenue); const avgRevenue = revenues.reduce((a, b) => a + b, 0) / Math.max(revenues.length, 1); const forecasted = { revenue: avgRevenue * 1.05, // 5% growth cogs: (avgRevenue * 1.05) * 0.3, operatingIncome: (avgRevenue * 1.05) * 0.25, }; return { id: `forecast-${Date.now()}`, period, method:"exponential", confidence: 0.65, lineItemForecasts: [], totalRevenueForecast: forecasted.revenue, totalCogsForecast: forecasted.cogs, grossProfitForecast: forecasted.revenue - forecasted.cogs, operatingIncomeForecast: forecasted.operatingIncome, netIncomeForecast: forecasted.operatingIncome * 0.8, };
}
function generateSeasonalForecast(
  currentPnL: DetailedPnL,
  historicalData: HistoricalData[],
  period: Period,
): BudgetForecast {
  // Adjust for seasonality const seasonalFactors: Record<number, number> = { 1: 0.9, // Jan - slow 2: 0.9, // Feb - slow 3: 1.0, // Mar - normal 4: 1.1, // Apr - busy 5: 1.2, // May - busy 6: 1.3, // Jun - peak 7: 1.3, // Jul - peak 8: 1.2, // Aug - busy 9: 1.1, // Sep - busy 10: 1.0, // Oct - normal 11: 1.1, // Nov - busy 12: 1.3, // Dec - peak }; const seasonalFactor = seasonalFactors[period.fiscalPeriod] || 1.0; const avgRevenue = historicalData.reduce((sum, d) => sum + d.revenue, 0) / Math.max(historicalData.length, 1); const forecasted = { revenue: avgRevenue * seasonalFactor, cogs: (avgRevenue * seasonalFactor) * 0.3, operatingIncome: (avgRevenue * seasonalFactor) * 0.25, }; return { id: `forecast-${Date.now()}`, period, method:"seasonal", confidence: 0.8, lineItemForecasts: [], totalRevenueForecast: forecasted.revenue, totalCogsForecast: forecasted.cogs, grossProfitForecast: forecasted.revenue - forecasted.cogs, operatingIncomeForecast: forecasted.operatingIncome, netIncomeForecast: forecasted.operatingIncome * 0.8, };
}
function generateCustomForecast(
  currentPnL: DetailedPnL,
  period: Period,
  assumptions: Record<string, number>,
): BudgetForecast {
  const revenue = assumptions.revenue || currentPnL.totalRevenue;
  const cogsPercent = assumptions.cogsPercent || 0.3;
  const opMarginPercent = assumptions.opMarginPercent || 0.25;
  return {
    id: `forecast-${Date.now()}`,
    period,
    method: "custom",
    confidence: assumptions.confidence || 0.7,
    lineItemForecasts: [],
    totalRevenueForecast: revenue,
    totalCogsForecast: revenue * cogsPercent,
    grossProfitForecast: revenue * (1 - cogsPercent),
    operatingIncomeForecast: revenue * opMarginPercent,
    netIncomeForecast: revenue * opMarginPercent * 0.8,
  };
}
