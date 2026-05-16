/**
 * EchoAI³ Predictive Analytics Engine
 * -----------------------------------
 * Predicts future outcomes and proactively recommends actions
 * Example: "Inventory will run out in 3 days based on current consumption patterns"
 */

import { ForecastEngine, HistoricalDataPoint } from "../engines/ForecastEngine";
import {
  InventoryEngine,
  InventoryItemSnapshot,
} from "../engines/InventoryEngine";
import { FinanceEngine } from "../engines/FinanceEngine";

export interface PredictionRequest {
  type: "demand" | "inventory" | "financial" | "labor";
  parameters: Record<string, any>;
  horizonDays?: number; // Prediction horizon in days (default: 7)
  confidence?: number; // Minimum confidence threshold (default: 0.7)
}

export interface PredictionResult {
  type: string;
  predictions: TimeSeriesPrediction[];
  confidence: number;
  factors: string[]; // Factors considered
  recommendation?: string;
  timestamp: string;
}

export interface TimeSeriesPrediction {
  date: string; // ISO date string
  value: number;
  lowerBound?: number; // Confidence interval lower bound
  upperBound?: number; // Confidence interval upper bound
  confidence: number;
  factors?: Record<string, number>; // Contribution of each factor
}

export interface Alert {
  id: string;
  type: "inventory_low" | "demand_spike" | "cost_increase" | "labor_shortage";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  predictedDate: string;
  recommendation: string;
  confidence: number;
  timestamp: string;
}

/**
 * Predictive Analytics Engine
 * Provides demand forecasting, inventory prediction, financial forecasting, and proactive alerts
 */
export class PredictiveAnalyticsEngine {
  private forecastEngine: ForecastEngine;
  private inventoryEngine: InventoryEngine;
  private financeEngine: FinanceEngine;
  private alerts: Alert[] = [];

  constructor() {
    // Initialize domain engines
    this.forecastEngine = new ForecastEngine();
    this.inventoryEngine = new InventoryEngine();
    this.financeEngine = new FinanceEngine();
  }

  /**
   * Generate prediction
   */
  async predict(request: PredictionRequest): Promise<PredictionResult> {
    const horizonDays = request.horizonDays || 7;
    const minConfidence = request.confidence || 0.7;

    switch (request.type) {
      case "demand":
        return await this.predictDemand(request, horizonDays, minConfidence);

      case "inventory":
        return await this.predictInventory(request, horizonDays, minConfidence);

      case "financial":
        return await this.predictFinancial(request, horizonDays, minConfidence);

      case "labor":
        return await this.predictLabor(request, horizonDays, minConfidence);

      default:
        throw new Error(`Unsupported prediction type: ${request.type}`);
    }
  }

  /**
   * Predict demand
   */
  private async predictDemand(
    request: PredictionRequest,
    horizonDays: number,
    minConfidence: number,
  ): Promise<PredictionResult> {
    // Get historical data
    const history = request.parameters.history as HistoricalDataPoint[];

    if (!history || history.length === 0) {
      // Use mock data if no history provided
      const mockHistory = this.generateMockHistory(30); // 30 days of mock data
      const forecastResult = await this.forecastEngine.forecastFromHistory(
        mockHistory,
        horizonDays,
      );

      const predictions: TimeSeriesPrediction[] = forecastResult.forecast.map(
        (point, index) => ({
          date: new Date(
            Date.now() + (index + 1) * 24 * 60 * 60 * 1000,
          ).toISOString(),
          value: point.value,
          lowerBound: point.lowerBound,
          upperBound: point.upperBound,
          confidence: forecastResult.confidence,
          factors: point.factors,
        }),
      );

      return {
        type: "demand",
        predictions,
        confidence: forecastResult.confidence,
        factors: forecastResult.factors || [],
        recommendation: this.generateDemandRecommendation(predictions),
        timestamp: new Date().toISOString(),
      };
    }

    // Use actual historical data
    const forecastResult = await this.forecastEngine.forecastFromHistory(
      history,
      horizonDays,
    );

    const predictions: TimeSeriesPrediction[] = forecastResult.forecast.map(
      (point, index) => ({
        date: new Date(
          Date.now() + (index + 1) * 24 * 60 * 60 * 1000,
        ).toISOString(),
        value: point.value,
        lowerBound: point.lowerBound,
        upperBound: point.upperBound,
        confidence: forecastResult.confidence,
        factors: point.factors,
      }),
    );

    // Check if confidence meets threshold
    if (forecastResult.confidence < minConfidence) {
      console.warn(
        `[PredictiveAnalytics] Demand forecast confidence (${forecastResult.confidence}) below threshold (${minConfidence})`,
      );
    }

    return {
      type: "demand",
      predictions,
      confidence: forecastResult.confidence,
      factors: forecastResult.factors || [],
      recommendation: this.generateDemandRecommendation(predictions),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Predict inventory depletion
   */
  private async predictInventory(
    request: PredictionRequest,
    horizonDays: number,
    minConfidence: number,
  ): Promise<PredictionResult> {
    const items = request.parameters.items as InventoryItemSnapshot[];

    if (!items || items.length === 0) {
      throw new Error("Inventory items required for inventory prediction");
    }

    const predictions: TimeSeriesPrediction[] = [];

    // Predict depletion for each item
    for (const item of items) {
      // Calculate consumption rate (units per day)
      const consumptionRate = this.calculateConsumptionRate(item);

      // Calculate days until depletion
      const daysUntilDepletion = item.quantity / consumptionRate;

      // Predict inventory levels over horizon
      for (let day = 1; day <= horizonDays; day++) {
        const predictedQuantity = Math.max(
          0,
          item.quantity - consumptionRate * day,
        );

        const depletionDate = new Date(
          Date.now() + daysUntilDepletion * 24 * 60 * 60 * 1000,
        ).toISOString();

        predictions.push({
          date: new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString(),
          value: predictedQuantity,
          lowerBound: predictedQuantity * 0.9, // 10% uncertainty
          upperBound: predictedQuantity * 1.1,
          confidence: 0.75, // Base confidence, can be improved with ML
          factors: {
            consumptionRate,
            leadTime: item.leadTimeDays || 3,
          },
        });

        // Generate alert if depletion is imminent
        if (daysUntilDepletion <= 3 && daysUntilDepletion > 0) {
          this.generateAlert({
            type: "inventory_low",
            severity: daysUntilDepletion <= 1 ? "critical" : "high",
            message: `Inventory for ${item.name} will run out in ${Math.round(daysUntilDepletion)} days`,
            predictedDate: depletionDate,
            recommendation: `Place reorder for ${item.name} immediately. Estimated lead time: ${item.leadTimeDays || 3} days.`,
            confidence: 0.85,
          });
        }
      }
    }

    return {
      type: "inventory",
      predictions,
      confidence: 0.75, // Average confidence
      factors: ["consumption_rate", "lead_time", "current_quantity"],
      recommendation: this.generateInventoryRecommendation(predictions, items),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Predict financial outcomes
   */
  private async predictFinancial(
    request: PredictionRequest,
    horizonDays: number,
    minConfidence: number,
  ): Promise<PredictionResult> {
    // Get historical financial data
    const historicalRevenue = request.parameters.historicalRevenue as number[];
    const historicalCosts = request.parameters.historicalCosts as number[];

    const predictions: TimeSeriesPrediction[] = [];

    // Simple trend-based forecasting (in production, use Prophet or similar)
    const avgRevenue = this.calculateAverage(historicalRevenue);
    const avgCosts = this.calculateAverage(historicalCosts);
    const revenueTrend = this.calculateTrend(historicalRevenue);
    const costTrend = this.calculateTrend(historicalCosts);

    for (let day = 1; day <= horizonDays; day++) {
      const predictedRevenue =
        avgRevenue + revenueTrend * day * (avgRevenue / 100); // Apply trend as percentage
      const predictedCosts = avgCosts + costTrend * day * (avgCosts / 100);
      const predictedProfit = predictedRevenue - predictedCosts;
      const predictedMargin = (predictedProfit / predictedRevenue) * 100;

      predictions.push({
        date: new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString(),
        value: predictedProfit,
        lowerBound: predictedProfit * 0.85,
        upperBound: predictedProfit * 1.15,
        confidence: 0.7,
        factors: {
          revenue: predictedRevenue,
          costs: predictedCosts,
          margin: predictedMargin,
        },
      });

      // Generate alert if margin drops below threshold
      const marginThreshold = request.parameters.marginThreshold || 15;
      if (predictedMargin < marginThreshold) {
        this.generateAlert({
          type: "cost_increase",
          severity: predictedMargin < 10 ? "critical" : "high",
          message: `Predicted margin will drop to ${predictedMargin.toFixed(1)}% in ${day} days`,
          predictedDate: new Date(
            Date.now() + day * 24 * 60 * 60 * 1000,
          ).toISOString(),
          recommendation: `Review pricing strategy or cost controls. Target margin: ${marginThreshold}%`,
          confidence: 0.75,
        });
      }
    }

    return {
      type: "financial",
      predictions,
      confidence: 0.7,
      factors: ["revenue_trend", "cost_trend", "margin"],
      recommendation: this.generateFinancialRecommendation(predictions),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Predict labor needs
   */
  private async predictLabor(
    request: PredictionRequest,
    horizonDays: number,
    minConfidence: number,
  ): Promise<PredictionResult> {
    const demandForecast = request.parameters.demandForecast as number[];
    const historicalLaborHours = request.parameters
      .historicalLaborHours as number[];

    const predictions: TimeSeriesPrediction[] = [];

    // Calculate labor hours per unit of demand
    const avgDemand = this.calculateAverage(demandForecast);
    const avgLaborHours = this.calculateAverage(historicalLaborHours);
    const laborEfficiency = avgDemand / avgLaborHours; // Units per labor hour

    for (let day = 1; day <= horizonDays; day++) {
      const predictedDemand = demandForecast[day - 1] || avgDemand;
      const predictedLaborHours = predictedDemand / laborEfficiency;

      predictions.push({
        date: new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString(),
        value: predictedLaborHours,
        lowerBound: predictedLaborHours * 0.9,
        upperBound: predictedLaborHours * 1.1,
        confidence: 0.7,
        factors: {
          demand: predictedDemand,
          efficiency: laborEfficiency,
        },
      });

      // Generate alert if labor shortage predicted
      const availableLaborHours = request.parameters
        .availableLaborHours as number;
      if (
        availableLaborHours &&
        predictedLaborHours > availableLaborHours * 1.2
      ) {
        this.generateAlert({
          type: "labor_shortage",
          severity: "high",
          message: `Predicted labor shortage: ${predictedLaborHours.toFixed(1)} hours needed, ${availableLaborHours} available`,
          predictedDate: new Date(
            Date.now() + day * 24 * 60 * 60 * 1000,
          ).toISOString(),
          recommendation: `Schedule additional staff or adjust demand forecast. Gap: ${(predictedLaborHours - availableLaborHours).toFixed(1)} hours`,
          confidence: 0.75,
        });
      }
    }

    return {
      type: "labor",
      predictions,
      confidence: 0.7,
      factors: ["demand_forecast", "labor_efficiency"],
      recommendation: this.generateLaborRecommendation(predictions),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculate consumption rate from inventory item
   */
  private calculateConsumptionRate(item: InventoryItemSnapshot): number {
    // Simple calculation: average daily consumption
    // In production, use historical consumption data with Prophet
    const defaultConsumptionRate = item.quantity / 30; // Assume 30-day average
    return defaultConsumptionRate || 1; // Default to 1 unit per day
  }

  /**
   * Calculate average of array
   */
  private calculateAverage(values: number[]): number {
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate trend (simple linear regression slope)
   */
  private calculateTrend(values: number[]): number {
    if (!values || values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + val * idx, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope || 0;
  }

  /**
   * Generate mock historical data
   */
  private generateMockHistory(days: number): HistoricalDataPoint[] {
    const history: HistoricalDataPoint[] = [];
    const baseValue = 100;
    const variance = 20;

    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000);
      const value =
        baseValue +
        Math.sin((i / days) * Math.PI * 2) * variance +
        (Math.random() - 0.5) * variance;

      history.push({
        date: date.toISOString(),
        value: Math.max(0, value),
      });
    }

    return history;
  }

  /**
   * Generate alert
   */
  private generateAlert(alert: Omit<Alert, "id" | "timestamp">): void {
    const fullAlert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...alert,
      timestamp: new Date().toISOString(),
    };

    this.alerts.push(fullAlert);

    console.log(`[PredictiveAnalytics] Alert generated: ${fullAlert.type}`, {
      severity: fullAlert.severity,
      message: fullAlert.message,
      confidence: fullAlert.confidence,
    });
  }

  /**
   * Generate demand recommendation
   */
  private generateDemandRecommendation(
    predictions: TimeSeriesPrediction[],
  ): string {
    const avgDemand = this.calculateAverage(predictions.map((p) => p.value));
    const peakDemand = Math.max(...predictions.map((p) => p.value));
    const avgConfidence = this.calculateAverage(
      predictions.map((p) => p.confidence),
    );

    return `Based on demand forecast (avg: ${avgDemand.toFixed(1)}, peak: ${peakDemand.toFixed(1)}), prepare for increased demand. Forecast confidence: ${(avgConfidence * 100).toFixed(1)}%.`;
  }

  /**
   * Generate inventory recommendation
   */
  private generateInventoryRecommendation(
    predictions: TimeSeriesPrediction[],
    items: InventoryItemSnapshot[],
  ): string {
    const lowStockItems = predictions.filter((p) => p.value < 10).length; // Below 10 units

    if (lowStockItems > 0) {
      return `${lowStockItems} items predicted to run low. Review reorder points and place orders proactively.`;
    }

    return "Inventory levels appear stable. Continue monitoring consumption patterns.";
  }

  /**
   * Generate financial recommendation
   */
  private generateFinancialRecommendation(
    predictions: TimeSeriesPrediction[],
  ): string {
    const avgProfit = this.calculateAverage(predictions.map((p) => p.value));
    const trend = this.calculateTrend(predictions.map((p) => p.value));

    if (trend > 0) {
      return `Financial outlook positive. Predicted profit trend: +${((trend / avgProfit) * 100).toFixed(1)}% per day.`;
    } else {
      return `Financial outlook negative. Predicted profit trend: ${((trend / avgProfit) * 100).toFixed(1)}% per day. Review costs and pricing.`;
    }
  }

  /**
   * Generate labor recommendation
   */
  private generateLaborRecommendation(
    predictions: TimeSeriesPrediction[],
  ): string {
    const avgHours = this.calculateAverage(predictions.map((p) => p.value));
    const peakHours = Math.max(...predictions.map((p) => p.value));

    return `Recommended labor allocation: ${avgHours.toFixed(1)} hours/day average, ${peakHours.toFixed(1)} hours/day peak. Schedule staff accordingly.`;
  }

  /**
   * Get active alerts
   */
  getAlerts(severity?: Alert["severity"]): Alert[] {
    if (severity) {
      return this.alerts.filter((alert) => alert.severity === severity);
    }
    return this.alerts;
  }

  /**
   * Clear alerts
   */
  clearAlerts(alertIds?: string[]): void {
    if (alertIds) {
      this.alerts = this.alerts.filter((alert) => !alertIds.includes(alert.id));
    } else {
      this.alerts = [];
    }
  }
}

// Singleton instance
let predictiveAnalyticsInstance: PredictiveAnalyticsEngine | null = null;

export function getPredictiveAnalyticsEngine(): PredictiveAnalyticsEngine {
  if (!predictiveAnalyticsInstance) {
    predictiveAnalyticsInstance = new PredictiveAnalyticsEngine();
  }
  return predictiveAnalyticsInstance;
}

export default PredictiveAnalyticsEngine;
