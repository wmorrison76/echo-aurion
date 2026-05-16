import type { RequestHandler } from "express";

interface MenuItem {
  name: string;
  cost: number;
  price: number;
  demandForecast: number;
  seasonality?: number;
}

interface ForecastRequest {
  menuItems: MenuItem[];
  laborCost: number;
  fixedCosts: number;
  timeframe: string;
}

interface FinancialForecast {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  grossMargin: number;
  costPercentage: number;
  breakEvenCovers: number;
  profitPerCover: number;
  recommendations: string[];
  riskFactors: string[];
  opportunitiesFlags: string[];
  nextWeekForecast: Array<{
    revenue: number;
    cost: number;
    profit: number;
  }>;
}

const forecastFinancialHandler: RequestHandler = async (req, res) => {
  try {
    const { menuItems, laborCost, fixedCosts } = req.body as ForecastRequest;

    // Calculate base metrics
    let totalRevenue = 0;
    let totalItemCost = 0;

    const menuAnalysis = menuItems.map((item) => {
      const itemRevenue = item.price * item.demandForecast;
      const itemCost = item.cost * item.demandForecast;
      const profit = itemRevenue - itemCost;
      const margin = profit / itemRevenue;

      totalRevenue += itemRevenue;
      totalItemCost += itemCost;

      return {
        name: item.name,
        revenue: itemRevenue,
        cost: itemCost,
        profit,
        margin,
        demandForecast: item.demandForecast,
      };
    });

    const totalCovers = menuItems.reduce(
      (sum, item) => sum + item.demandForecast,
      0
    );
    const totalCost = totalItemCost + laborCost + fixedCosts;
    const grossProfit = totalRevenue - totalCost;
    const grossMargin = (grossProfit / totalRevenue) * 100;
    const costPercentage = (totalCost / totalRevenue) * 100;
    const breakEvenCovers = Math.ceil(totalCost / (totalRevenue / totalCovers || 1));
    const profitPerCover = totalCovers > 0 ? grossProfit / totalCovers : 0;

    // Identify risks
    const riskFactors: string[] = [];
    if (costPercentage > 65) {
      riskFactors.push(
        "High cost percentage - consider menu engineering"
      );
    }
    if (laborCost > totalRevenue * 0.3) {
      riskFactors.push(
        "Labor costs exceed 30% of revenue - optimize scheduling"
      );
    }
    if (menuAnalysis.some((m) => m.margin < 0.3)) {
      riskFactors.push(
        "Some items have low margins - review pricing strategy"
      );
    }

    // Identify opportunities
    const opportunitiesFlags: string[] = [];
    const topMarginItems = menuAnalysis
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 2);
    if (topMarginItems.length > 0) {
      opportunitiesFlags.push(
        `Promote ${topMarginItems[0].name} - highest margin item`
      );
    }
    if (grossMargin > 60) {
      opportunitiesFlags.push(
        "Strong margin performance - opportunity for premium positioning"
      );
    }

    // Generate recommendations
    const recommendations: string[] = [];
    recommendations.push(
      `Focus on high-demand items: ${menuAnalysis
        .sort((a, b) => b.demandForecast - a.demandForecast)
        .slice(0, 2)
        .map((m) => m.name)
        .join(", ")}`
    );
    recommendations.push(
      `Review pricing for items with < 35% margin`
    );
    if (laborCost > totalRevenue * 0.25) {
      recommendations.push(
        "Consider cross-training staff to improve labor efficiency"
      );
    }
    recommendations.push(
      `Break-even point: ${breakEvenCovers} covers per week`
    );

    // Generate weekly forecast
    const nextWeekForecast = Array.from({ length: 7 }, (_, day) => {
      const dayMultiplier = 0.8 + Math.random() * 0.4; // Varies by ±20%
      return {
        revenue: totalRevenue * (dayMultiplier / 7),
        cost: totalCost * (dayMultiplier / 7),
        profit: grossProfit * (dayMultiplier / 7),
      };
    });

    const forecast: FinancialForecast = {
      totalRevenue,
      totalCost,
      grossProfit,
      grossMargin,
      costPercentage,
      breakEvenCovers,
      profitPerCover,
      recommendations,
      riskFactors,
      opportunitiesFlags,
      nextWeekForecast,
    };

    res.json(forecast);
  } catch (error) {
    console.error("Financial forecast error:", error);

    res.status(500).json({
      error: "Financial forecast generation failed",
    });
  }
};

export default forecastFinancialHandler;
