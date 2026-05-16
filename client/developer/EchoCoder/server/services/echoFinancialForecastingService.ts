import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

let supabase: any = null;
let openai: any = null;

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials:", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
      });
      throw new Error("Supabase credentials not configured");
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.ECHO_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "CRITICAL: ECHO_OPENAI_API_KEY environment variable not set. " +
          "Cannot initialize OpenAI client. Set the environment variable and restart the server.",
      );
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

interface FinancialData {
  revenue: number;
  cogs: number; // Cost of goods sold
  operatingExpenses: number;
  laborCosts: number;
  rent: number;
  utilities: number;
  otherExpenses: number;
  period: "daily" | "weekly" | "monthly" | "annual";
  historicalData?: Array<{
    date: string;
    revenue: number;
    expenses: number;
  }>;
}

interface ForecastResult {
  currentMetrics: {
    revenue: number;
    totalExpenses: number;
    grossProfit: number;
    grossMargin: number;
    netProfit: number;
    netMarginPercent: number;
  };
  forecast: {
    period: string;
    projectedRevenue: number;
    projectedExpenses: number;
    projectedProfit: number;
    confidence: number;
  }[];
  recommendations: Array<{
    category: string;
    insight: string;
    potentialSavings: number;
    implementation: string;
  }>;
  costBreakdown: Record<string, number>;
  seasonalPatterns: string[];
  riskFactors: string[];
}

interface DemandForecast {
  dish: string;
  currentMonthlyOrders: number;
  forecastedOrders: number;
  confidence: number;
  reasoning: string;
  seasonalAdjustment: number;
}

/**
 * EchoAI Financial Forecasting Service
 * CPA/Statistician persona for hospitality financial analysis
 * Provides: P&L analysis, revenue forecasting, cost optimization, demand predictions
 */
export class EchoFinancialForecastingService {
  /**
   * Analyze P&L Statement with detailed breakdown
   */
  async analyzePnL(data: FinancialData): Promise<ForecastResult> {
    try {
      // Calculate current metrics
      const totalExpenses =
        data.operatingExpenses ||
        data.laborCosts + data.rent + data.utilities + data.otherExpenses;
      const cogs = data.cogs || 0;
      const grossProfit = data.revenue - cogs;
      const grossMargin = (grossProfit / data.revenue) * 100;
      const netProfit = data.revenue - totalExpenses - cogs;
      const netMarginPercent = (netProfit / data.revenue) * 100;

      // Build cost breakdown
      const costBreakdown: Record<string, number> = {
        COGS: cogs,
        Labor: data.laborCosts || 0,
        Rent: data.rent || 0,
        Utilities: data.utilities || 0,
        Other: data.otherExpenses || 0,
      };

      // Generate forecasts for next 4 periods
      const forecasts = this.generateForecasts(data, netProfit);

      // Generate recommendations using AI
      const recommendations = await this.generateCostRecommendations(
        data,
        totalExpenses,
        grossMargin,
      );

      // Identify seasonal patterns
      const seasonalPatterns = this.analyzeSeasonalPatterns(
        data.historicalData || [],
      );

      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(
        grossMargin,
        netMarginPercent,
      );

      return {
        currentMetrics: {
          revenue: data.revenue,
          totalExpenses,
          grossProfit,
          grossMargin,
          netProfit,
          netMarginPercent,
        },
        forecast: forecasts,
        recommendations,
        costBreakdown,
        seasonalPatterns,
        riskFactors,
      };
    } catch (error) {
      console.error("Error analyzing P&L:", error);
      throw error;
    }
  }

  /**
   * Forecast revenue for upcoming periods
   */
  private generateForecasts(
    data: FinancialData,
    currentProfit: number,
  ): Array<{
    period: string;
    projectedRevenue: number;
    projectedExpenses: number;
    projectedProfit: number;
    confidence: number;
  }> {
    const forecasts = [];
    const growthRate = 0.05; // Conservative 5% growth

    for (let i = 1; i <= 4; i++) {
      const projectedRevenue = data.revenue * Math.pow(1 + growthRate, i);
      const projectedExpenses =
        (data.operatingExpenses || 0) * Math.pow(1 + 0.03, i); // Expenses grow at 3%
      const projectedProfit =
        projectedRevenue - projectedExpenses - (data.cogs || 0);
      const confidence = Math.max(0.5, 0.95 - i * 0.05); // Confidence decreases with time

      const periodNames = [
        "Next Month",
        "In 2 Months",
        "In 3 Months",
        "In 4 Months",
      ];

      forecasts.push({
        period: periodNames[i - 1],
        projectedRevenue: Math.round(projectedRevenue),
        projectedExpenses: Math.round(projectedExpenses),
        projectedProfit: Math.round(projectedProfit),
        confidence,
      });
    }

    return forecasts;
  }

  /**
   * Generate AI-powered cost recommendations
   */
  private async generateCostRecommendations(
    data: FinancialData,
    totalExpenses: number,
    grossMargin: number,
  ): Promise<
    Array<{
      category: string;
      insight: string;
      potentialSavings: number;
      implementation: string;
    }>
  > {
    try {
      const prompt = `You are a CPA analyzing financial data for a hospitality business.
      
Revenue: $${data.revenue.toLocaleString()}
COGS: $${(data.cogs || 0).toLocaleString()}
Labor Costs: $${(data.laborCosts || 0).toLocaleString()}
Rent: $${(data.rent || 0).toLocaleString()}
Utilities: $${(data.utilities || 0).toLocaleString()}
Other Expenses: $${(data.otherExpenses || 0).toLocaleString()}
Gross Margin: ${grossMargin.toFixed(1)}%

Provide 3-5 specific, actionable cost-saving recommendations with potential annual savings for each.
Return as JSON array with: [{category, insight, potentialSavings (number), implementation}]`;

      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content || "[]";
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Error generating recommendations:", error);
      return [];
    }
  }

  /**
   * Analyze seasonal patterns from historical data
   */
  private analyzeSeasonalPatterns(
    historicalData: Array<{ date: string; revenue: number; expenses: number }>,
  ): string[] {
    if (historicalData.length < 3) return [];

    const patterns = [];
    const months = historicalData.map((d) => new Date(d.date).getMonth());

    // Detect if specific months have lower/higher revenue
    const avgRevenue =
      historicalData.reduce((sum, d) => sum + d.revenue, 0) /
      historicalData.length;

    const lowMonths = new Set<number>();
    const highMonths = new Set<number>();

    historicalData.forEach((d) => {
      const month = new Date(d.date).getMonth();
      if (d.revenue < avgRevenue * 0.8) {
        lowMonths.add(month);
      }
      if (d.revenue > avgRevenue * 1.2) {
        highMonths.add(month);
      }
    });

    if (lowMonths.size > 0) {
      const monthNames = Array.from(lowMonths)
        .map((m) => new Date(0, m).toLocaleString("default", { month: "long" }))
        .join(", ");
      patterns.push(`Slower season: ${monthNames}`);
    }

    if (highMonths.size > 0) {
      const monthNames = Array.from(highMonths)
        .map((m) => new Date(0, m).toLocaleString("default", { month: "long" }))
        .join(", ");
      patterns.push(`Peak season: ${monthNames}`);
    }

    return patterns;
  }

  /**
   * Identify financial risk factors
   */
  private identifyRiskFactors(
    grossMargin: number,
    netMarginPercent: number,
  ): string[] {
    const risks = [];

    if (grossMargin < 30) {
      risks.push(
        "CRITICAL: Gross margin below 30% - review menu pricing and COGS",
      );
    }
    if (netMarginPercent < 5) {
      risks.push("WARNING: Net margin below 5% - optimize operating expenses");
    }
    if (netMarginPercent < 0) {
      risks.push("CRITICAL: Negative profit - unsustainable operations");
    }

    return risks;
  }

  /**
   * Forecast dish demand for inventory planning
   * Hospitality specialty: "You should prep 22 orders of this dish"
   */
  async forecastDishDemand(
    dishName: string,
    historicalOrders: number[],
    currentMonth: number,
    eventInfo?: { eventCount?: number; guestCount?: number },
  ): Promise<DemandForecast> {
    try {
      const avgOrders =
        historicalOrders.reduce((a, b) => a + b, 0) / historicalOrders.length;
      const trend = this.calculateTrend(historicalOrders);
      const seasonalAdjustment = this.getSeasonalAdjustment(currentMonth);

      // AI-powered demand prediction
      const prompt = `You are a master chef and food cost analyst for a high-end hospitality venue.

Dish: ${dishName}
Average monthly orders: ${avgOrders}
Historical data: ${historicalOrders.join(", ")}
Trend: ${trend > 0 ? "increasing" : trend < 0 ? "decreasing" : "stable"}
${eventInfo?.guestCount ? `Expected guests this month: ${eventInfo.guestCount}` : ""}

Forecast orders for next month with confidence level (0-1).
Consider seasonality, trends, and any event information.
Return JSON: {forecast: number, confidence: number, reasoning: string}`;

      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
      });

      const content = response.choices[0].message.content || "{}";
      const prediction = JSON.parse(content);

      return {
        dish: dishName,
        currentMonthlyOrders: Math.round(avgOrders),
        forecastedOrders: Math.round(prediction.forecast || avgOrders),
        confidence: prediction.confidence || 0.75,
        reasoning:
          prediction.reasoning ||
          `Based on historical trend and seasonal factors`,
        seasonalAdjustment,
      };
    } catch (error) {
      console.error("Error forecasting demand:", error);
      return {
        dish: dishName,
        currentMonthlyOrders: Math.round(
          historicalOrders.reduce((a, b) => a + b, 0) / historicalOrders.length,
        ),
        forecastedOrders: 0,
        confidence: 0,
        reasoning: "Forecast failed",
        seasonalAdjustment: 1,
      };
    }
  }

  /**
   * Calculate trend from historical data
   */
  private calculateTrend(data: number[]): number {
    if (data.length < 2) return 0;
    const recent = data.slice(-3);
    const older = data.slice(0, 3);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    return recentAvg - olderAvg;
  }

  /**
   * Get seasonal adjustment factor
   */
  private getSeasonalAdjustment(month: number): number {
    // Hospitality seasonal patterns
    const adjustments: Record<number, number> = {
      0: 0.85, // January - slow
      1: 0.9, // February - slow
      2: 0.95, // March
      3: 1.05, // April
      4: 1.1, // May
      5: 1.15, // June - summer peak
      6: 1.2, // July - peak
      7: 1.15, // August
      8: 1.0, // September
      9: 1.05, // October
      10: 1.1, // November - holiday
      11: 1.25, // December - holiday peak
    };
    return adjustments[month] || 1.0;
  }

  /**
   * Calculate break-even analysis
   */
  calculateBreakEven(
    fixedCosts: number,
    variableCostPercent: number,
    averageDishPrice: number,
  ): {
    breakEvenDishes: number;
    breakEvenRevenue: number;
    dailyTarget: number;
  } {
    const contributionMargin =
      averageDishPrice * (1 - variableCostPercent / 100);
    const breakEvenDishes = fixedCosts / contributionMargin;
    const breakEvenRevenue = breakEvenDishes * averageDishPrice;
    const dailyTarget = breakEvenDishes / 30;

    return {
      breakEvenDishes: Math.round(breakEvenDishes),
      breakEvenRevenue: Math.round(breakEvenRevenue),
      dailyTarget: Math.round(dailyTarget),
    };
  }

  /**
   * Analyze menu profitability
   */
  analyzeMenuProfitability(
    menuItems: Array<{
      name: string;
      price: number;
      cogs: number;
      monthlySales: number;
    }>,
  ): Array<{
    name: string;
    price: number;
    margin: number;
    marginPercent: number;
    totalContribution: number;
    recommendation: string;
  }> {
    return menuItems
      .map((item) => {
        const margin = item.price - item.cogs;
        const marginPercent = (margin / item.price) * 100;
        const totalContribution = margin * item.monthlySales;

        let recommendation = "Keep";
        if (marginPercent < 20) {
          recommendation = "Review pricing - low margin";
        }
        if (item.monthlySales < 5 && marginPercent < 30) {
          recommendation = "Consider removing - low volume & margin";
        }
        if (marginPercent > 50 && item.monthlySales > 20) {
          recommendation = "Star item - high margin & volume";
        }

        return {
          name: item.name,
          price: item.price,
          margin,
          marginPercent,
          totalContribution,
          recommendation,
        };
      })
      .sort((a, b) => b.totalContribution - a.totalContribution);
  }
}

export const echoFinancialForecastingService =
  new EchoFinancialForecastingService();
