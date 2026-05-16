import type { RequestHandler } from "express";

interface PropertyMetrics {
  propertyId: string;
  propertyName: string;
  location: string;
  type: "restaurant" | "bar" | "banquet" | "spa";
  metrics: {
    revenue: number;
    covers: number;
    avgCheck: number;
    laborCost: number;
    laborPercent: number;
    foodCost: number;
    foodCostPercent: number;
    occupancyRate: number;
    staffingLevel: number;
    demandForecast: number;
  };
  performance: {
    rank: number;
    trend: "up" | "down" | "stable";
    percentChange: number;
  };
  alerts: string[];
}

interface MultiPropertyAnalysis {
  properties: PropertyMetrics[];
  totalProperties: number;
  consolidatedMetrics: {
    totalRevenue: number;
    totalCovers: number;
    avgLaborPercent: number;
    avgFoodCostPercent: number;
    topPerformer: string;
    needsAttention: string[];
  };
  insights: string[];
  recommendations: string[];
}

const generateMultiPropertyAnalyticsHandler: RequestHandler = async (
  req,
  res,
) => {
  try {
    const { companyId, timeframe = "week" } = req.body;

    const mockProperties: PropertyMetrics[] = [
      {
        propertyId: "prop-001",
        propertyName: "Downtown Restaurant",
        location: "123 Main St, Miami, FL",
        type: "restaurant",
        metrics: {
          revenue: 28500,
          covers: 450,
          avgCheck: 63.33,
          laborCost: 7125,
          laborPercent: 25,
          foodCost: 8550,
          foodCostPercent: 30,
          occupancyRate: 85,
          staffingLevel: 12,
          demandForecast: 95,
        },
        performance: {
          rank: 1,
          trend: "up",
          percentChange: 12.5,
        },
        alerts: [],
      },
      {
        propertyId: "prop-002",
        propertyName: "Beachside Bar & Grill",
        location: "456 Ocean Ave, Miami Beach, FL",
        type: "bar",
        metrics: {
          revenue: 19200,
          covers: 320,
          avgCheck: 60,
          laborCost: 5760,
          laborPercent: 30,
          foodCost: 5376,
          foodCostPercent: 28,
          occupancyRate: 72,
          staffingLevel: 8,
          demandForecast: 78,
        },
        performance: {
          rank: 2,
          trend: "stable",
          percentChange: 2.1,
        },
        alerts: ["Labor percentage above optimal"],
      },
      {
        propertyId: "prop-003",
        propertyName: "Banquet Hall",
        location: "789 Event Blvd, Coral Gables, FL",
        type: "banquet",
        metrics: {
          revenue: 35400,
          covers: 480,
          avgCheck: 73.75,
          laborCost: 7080,
          laborPercent: 20,
          foodCost: 9450,
          foodCostPercent: 26.7,
          occupancyRate: 78,
          staffingLevel: 14,
          demandForecast: 120,
        },
        performance: {
          rank: 3,
          trend: "down",
          percentChange: -4.2,
        },
        alerts: ["Demand forecast below capacity"],
      },
      {
        propertyId: "prop-004",
        propertyName: "Spa & Lounge",
        location: "321 Wellness Way, Aventura, FL",
        type: "spa",
        metrics: {
          revenue: 14500,
          covers: 180,
          avgCheck: 80.56,
          laborCost: 3335,
          laborPercent: 23,
          foodCost: 2900,
          foodCostPercent: 20,
          occupancyRate: 65,
          staffingLevel: 6,
          demandForecast: 55,
        },
        performance: {
          rank: 4,
          trend: "up",
          percentChange: 8.3,
        },
        alerts: ["Low occupancy rate", "Staffing underutilized"],
      },
    ];

    const totalRevenue = mockProperties.reduce(
      (sum, p) => sum + p.metrics.revenue,
      0,
    );
    const totalCovers = mockProperties.reduce(
      (sum, p) => sum + p.metrics.covers,
      0,
    );
    const avgLaborPercent =
      mockProperties.reduce((sum, p) => sum + p.metrics.laborPercent, 0) /
      mockProperties.length;
    const avgFoodCostPercent =
      mockProperties.reduce((sum, p) => sum + p.metrics.foodCostPercent, 0) /
      mockProperties.length;

    const topPerformer = mockProperties.reduce((prev, current) =>
      prev.metrics.revenue > current.metrics.revenue ? prev : current,
    );

    const needsAttention = mockProperties
      .filter((p) => p.alerts.length > 0)
      .map((p) => `${p.propertyName}: ${p.alerts[0]}`);

    const insights: string[] = [
      `Total portfolio revenue: $${totalRevenue.toLocaleString()} across ${mockProperties.length} locations`,
      `Average check size: $${(totalRevenue / totalCovers).toFixed(2)} - High for portfolio`,
      `Labor optimization opportunity: Target ${avgLaborPercent - 2}% across all properties`,
      `${topPerformer.propertyName} leads with $${topPerformer.metrics.revenue.toLocaleString()} revenue`,
      `Combined occupancy rate: ${Math.round(mockProperties.reduce((sum, p) => sum + p.metrics.occupancyRate, 0) / mockProperties.length)}% - Room for growth`,
    ];

    const recommendations: string[] = [
      "Redistribute peak-hour staffing from #2 (Beachside Bar) to #1 (Downtown) for labor optimization",
      "Investigate #3 (Banquet Hall) demand decline - consider marketing push",
      "Cross-train staff from high-performing locations to assist underperforming properties",
      "Implement dynamic pricing at #4 (Spa & Lounge) to drive occupancy",
      "Consolidate food purchasing across locations for better cost negotiation",
      `Focus on standardizing processes: ${topPerformer.propertyName}'s model can be replicated`,
    ];

    const analysis: MultiPropertyAnalysis = {
      properties: mockProperties,
      totalProperties: mockProperties.length,
      consolidatedMetrics: {
        totalRevenue,
        totalCovers,
        avgLaborPercent: Math.round(avgLaborPercent * 10) / 10,
        avgFoodCostPercent: Math.round(avgFoodCostPercent * 10) / 10,
        topPerformer: topPerformer.propertyName,
        needsAttention,
      },
      insights,
      recommendations,
    };

    res.json(analysis);
  } catch (error) {
    console.error("[MULTI-PROPERTY] Analytics error:", error);
    res.status(500).json({
      error: "Multi-property analytics generation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export default generateMultiPropertyAnalyticsHandler;
