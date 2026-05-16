/**
 * EchoAi^3 Daily Digest
 * ---------------------
 * Generates daily forecast digest with 2-day heads-up, exceptions, and actions
 */

import type { RequestHandler } from "express";
import { getEchoAi3ForecastingEngine } from "../../client/lib/echo-ai3/forecasting-engine";

export interface DailyDigest {
  date: string;
  twoDayForecast: {
    prepList: any;
    inventory: any;
    labor: any;
    revenue: any;
  };
  exceptions: Array<{
    type: "risk" | "opportunity" | "warning";
    message: string;
    action: string;
    confidence: number;
  }>;
  suggestedActions: Array<{
    category: "prep" | "ordering" | "staffing" | "inventory";
    action: string;
    priority: "high" | "medium" | "low";
    impact: string;
  }>;
  generatedAt: string;
}

/**
 * Generate daily digest
 */
export const generateDailyDigest: RequestHandler = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split("T")[0];
    
    const engine = getEchoAi3ForecastingEngine();
    
    // Get 2-day forecast
    const twoDayForecasts = engine.getForecast(undefined, 2);
    
    // Group by type
    const prepList = twoDayForecasts.find(f => f.type === "prep_list");
    const inventory = twoDayForecasts.find(f => f.type === "inventory");
    const labor = twoDayForecasts.find(f => f.type === "labor");
    const revenue = twoDayForecasts.find(f => f.type === "revenue");
    
    // Identify exceptions (low confidence, high variance, etc.)
    const exceptions: DailyDigest["exceptions"] = [];
    
    twoDayForecasts.forEach(forecast => {
      if (forecast.confidence < 0.6) {
        exceptions.push({
          type: "warning",
          message: `Low confidence (${Math.round(forecast.confidence * 100)}%) for ${forecast.type} on ${forecast.date}`,
          action: "Review assumptions and data sources",
          confidence: forecast.confidence,
        });
      }
      
      // Add risk flags based on predictions
      if (forecast.type === "inventory" && forecast.prediction?.items?.some((item: any) => item.level < item.reorderPoint)) {
        exceptions.push({
          type: "risk",
          message: `Low inventory levels detected for ${forecast.prediction.items.filter((i: any) => i.level < i.reorderPoint).length} items`,
          action: "Review reorder points and place orders",
          confidence: 0.8,
        });
      }
    });
    
    // Generate suggested actions
    const suggestedActions: DailyDigest["suggestedActions"] = [];
    
    if (prepList) {
      suggestedActions.push({
        category: "prep",
        action: `Prepare ${prepList.prediction?.items?.length || 0} items for ${prepList.date}`,
        priority: "high",
        impact: "Ensures smooth service",
      });
    }
    
    if (inventory && inventory.prediction?.items?.some((item: any) => item.level < item.reorderPoint)) {
      suggestedActions.push({
        category: "ordering",
        action: "Place purchase orders for low inventory items",
        priority: "high",
        impact: "Prevents stockouts",
      });
    }
    
    if (labor && labor.prediction?.scheduledHours) {
      const totalHours = Object.values(labor.prediction.scheduledHours).reduce((sum: number, hours: any) => sum + hours, 0);
      if (totalHours < 100) {
        suggestedActions.push({
          category: "staffing",
          action: "Review staffing levels - may need additional coverage",
          priority: "medium",
          impact: "Ensures adequate coverage",
        });
      }
    }
    
    const digest: DailyDigest = {
      date: targetDate,
      twoDayForecast: {
        prepList: prepList?.prediction || null,
        inventory: inventory?.prediction || null,
        labor: labor?.prediction || null,
        revenue: revenue?.prediction || null,
      },
      exceptions,
      suggestedActions,
      generatedAt: new Date().toISOString(),
    };
    
    res.json({ ok: true, digest });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to generate digest",
    });
  }
};

/**
 * Get digest for alerts/approvals
 */
export const getDigestForAlerts: RequestHandler = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split("T")[0];
    
    // Generate digest
    const mockReq = { query: { date: targetDate } } as any;
    const mockRes = {
      json: (data: any) => data,
    } as any;
    
    const result = await generateDailyDigest(mockReq, mockRes);
    
    // Format for alerts/approvals
    const alerts = result.digest.exceptions
      .filter(e => e.type === "risk" || e.type === "warning")
      .map(e => ({
        type: "forecast_exception",
        severity: e.type === "risk" ? "high" : "medium",
        message: e.message,
        action: e.action,
        date: targetDate,
      }));
    
    res.json({ ok: true, alerts });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to get alerts",
    });
  }
};
