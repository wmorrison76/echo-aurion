import type { RequestHandler } from "express";

interface CustomMetric {
  metricId: string;
  name: string;
  calculation: string;
  value: number;
  target: number;
  variance: number;
  trend: "up" | "down" | "stable";
  unit: string;
}

interface DashboardWidget {
  widgetId: string;
  title: string;
  type: "gauge" | "chart" | "table" | "kpi" | "sparkline";
  metrics: CustomMetric[];
  refreshInterval: number;
  alerts: Array<{
    condition: string;
    severity: "info" | "warning" | "critical";
    message: string;
  }>;
}

interface RealTimeDashboard {
  dashboardId: string;
  name: string;
  widgets: DashboardWidget[];
  lastUpdated: string;
  refreshInterval: number;
  insights: string[];
  alerts: Array<{
    title: string;
    severity: "info" | "warning" | "critical";
    message: string;
    timestamp: string;
  }>;
}

const generateCustomAnalyticsHandler: RequestHandler = async (req, res) => {
  try {
    const { dashboardType = "executive", timeframe = "realtime" } = req.body;

    const widgets: DashboardWidget[] = [
      {
        widgetId: "widget-001",
        title: "Revenue Performance",
        type: "gauge",
        metrics: [
          {
            metricId: "metric-001",
            name: "Daily Revenue",
            calculation: "SUM(transactions.amount)",
            value: 42500,
            target: 40000,
            variance: 6.25,
            trend: "up",
            unit: "USD",
          },
          {
            metricId: "metric-002",
            name: "Average Check Size",
            calculation: "AVG(transactions.amount)",
            value: 67.8,
            target: 65,
            variance: 4.31,
            trend: "up",
            unit: "USD",
          },
          {
            metricId: "metric-003",
            name: "Revenue per Labor Hour",
            calculation: "daily_revenue / labor_hours",
            value: 312.5,
            target: 300,
            variance: 4.17,
            trend: "up",
            unit: "USD/hr",
          },
        ],
        refreshInterval: 300,
        alerts: [
          {
            condition: "variance > 5%",
            severity: "info",
            message: "Revenue exceeding target by 6.25%",
          },
        ],
      },
      {
        widgetId: "widget-002",
        title: "Labor Efficiency",
        type: "chart",
        metrics: [
          {
            metricId: "metric-004",
            name: "Labor Cost %",
            calculation: "labor_cost / revenue * 100",
            value: 24.5,
            target: 28,
            variance: -12.5,
            trend: "down",
            unit: "%",
          },
          {
            metricId: "metric-005",
            name: "Covers per Labor Hour",
            calculation: "covers / labor_hours",
            value: 6.8,
            target: 6.5,
            variance: 4.62,
            trend: "up",
            unit: "covers/hr",
          },
          {
            metricId: "metric-006",
            name: "Staff Utilization",
            calculation: "scheduled_hours / available_hours * 100",
            value: 91.2,
            target: 85,
            variance: 7.29,
            trend: "up",
            unit: "%",
          },
        ],
        refreshInterval: 600,
        alerts: [
          {
            condition: "labor_cost_pct < target",
            severity: "info",
            message: "Labor cost 12.5% below target - excellent efficiency",
          },
        ],
      },
      {
        widgetId: "widget-003",
        title: "Menu Performance",
        type: "table",
        metrics: [
          {
            metricId: "metric-007",
            name: "Top Item: Filet Mignon",
            calculation: "COUNT(*) WHERE item='Filet'",
            value: 156,
            target: 140,
            variance: 11.43,
            trend: "up",
            unit: "covers",
          },
          {
            metricId: "metric-008",
            name: "Food Cost %",
            calculation: "food_cost / revenue * 100",
            value: 28.3,
            target: 30,
            variance: -5.67,
            trend: "down",
            unit: "%",
          },
          {
            metricId: "metric-009",
            name: "Item Variance",
            calculation: "items_sold vs forecast",
            value: 3.2,
            target: 5,
            variance: -36,
            trend: "down",
            unit: "%",
          },
        ],
        refreshInterval: 900,
        alerts: [
          {
            condition: "top_item > target",
            severity: "info",
            message:
              "Filet Mignon 11.43% above forecast - consider portion analysis",
          },
        ],
      },
      {
        widgetId: "widget-004",
        title: "Guest Experience",
        type: "kpi",
        metrics: [
          {
            metricId: "metric-010",
            name: "Customer Satisfaction",
            calculation: "AVG(rating) WHERE period=today",
            value: 4.65,
            target: 4.5,
            variance: 3.33,
            trend: "up",
            unit: "/5.0",
          },
          {
            metricId: "metric-011",
            name: "Table Turn Time",
            calculation: "AVG(seated_time - departure_time)",
            value: 87,
            target: 90,
            variance: -3.33,
            trend: "up",
            unit: "min",
          },
          {
            metricId: "metric-012",
            name: "Repeat Customer %",
            calculation: "repeat_visits / total_visits * 100",
            value: 38.5,
            target: 35,
            variance: 10,
            trend: "up",
            unit: "%",
          },
        ],
        refreshInterval: 1800,
        alerts: [],
      },
    ];

    const alerts = [
      {
        title: "Revenue Target Exceeded",
        severity: "info" as const,
        message: "Daily revenue $42,500 exceeds target by $2,500 (6.25%)",
        timestamp: new Date().toISOString(),
      },
      {
        title: "Labor Efficiency Alert",
        severity: "info" as const,
        message:
          "Labor cost 12.5% below budget - consider staff retention initiatives",
        timestamp: new Date(Date.now() - 600000).toISOString(),
      },
      {
        title: "Menu Item Alert",
        severity: "info" as const,
        message:
          "Filet Mignon sales 11.43% above forecast - verify portion consistency",
        timestamp: new Date(Date.now() - 1200000).toISOString(),
      },
    ];

    const insights = [
      "🎯 Revenue Performance: $42,500 daily revenue exceeds target by 6.25% - strong demand",
      "👥 Labor Optimization: 24.5% labor cost is 12.5% below target - excellent scheduling efficiency",
      "🍽️ Menu Insight: Filet Mignon driving 11.43% above forecast - consider premium positioning",
      "⏱️ Service Speed: Table turn time 87 minutes - 3.33% faster than target",
      "💯 Guest Satisfaction: 4.65/5.0 rating - 3.33% above target with 38.5% repeat rate",
    ];

    const dashboard: RealTimeDashboard = {
      dashboardId: "dashboard-executive-001",
      name: "Executive Real-Time Dashboard",
      widgets,
      lastUpdated: new Date().toISOString(),
      refreshInterval: 300,
      insights,
      alerts,
    };

    res.json(dashboard);
  } catch (error) {
    console.error("[ANALYTICS] Engine error:", error);
    res.status(500).json({
      error: "Custom analytics generation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export default generateCustomAnalyticsHandler;
