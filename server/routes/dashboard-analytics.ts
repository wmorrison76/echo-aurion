import express, { Request, Response } from "express";

const router = express.Router();

interface ModuleMetrics {
  moduleId: string;
  moduleName: string;
  status: "healthy" | "warning" | "critical";
  keyMetrics: Record<string, number | string>;
  alerts: string[];
  lastUpdated: string;
}

// GET /api/dashboard-analytics/overview
router.get("/overview", (_req: Request, res: Response) => {
  const moduleMetrics: ModuleMetrics[] = [
    {
      moduleId: "revenue",
      moduleName: "Revenue Operations",
      status: "healthy",
      keyMetrics: {
        weeklyRevenue: 58000,
        monthlyRevenue: 95200,
        profitMargin: 42.5,
        vs_target: "+16%",
      },
      alerts: [],
      lastUpdated: new Date().toISOString(),
    },
    {
      moduleId: "costs",
      moduleName: "Cost Management",
      status: "healthy",
      keyMetrics: {
        foodCost: 31.2,
        laborCost: 28.5,
        totalCost: 62.5,
        monthlySavings: 2450,
      },
      alerts: [],
      lastUpdated: new Date().toISOString(),
    },
    {
      moduleId: "qa",
      moduleName: "Quality Assurance",
      status: "healthy",
      keyMetrics: {
        complianceScore: 96,
        healthScore: 94,
        auditPassRate: 92,
      },
      alerts: [],
      lastUpdated: new Date().toISOString(),
    },
    {
      moduleId: "guest",
      moduleName: "Guest Experience",
      status: "healthy",
      keyMetrics: {
        satisfaction: 4.6,
        retention: 78,
        churnRisk: 12,
      },
      alerts: [],
      lastUpdated: new Date().toISOString(),
    },
    {
      moduleId: "supply",
      moduleName: "Supply Chain",
      status: "healthy",
      keyMetrics: {
        onTimeDelivery: 96,
        suppliers: 287,
        wasteReduced: 8.2,
      },
      alerts: [],
      lastUpdated: new Date().toISOString(),
    },
    {
      moduleId: "voice",
      moduleName: "Voice Commands",
      status: "healthy",
      keyMetrics: {
        commandsProcessed: 1450,
        accuracy: 94.3,
        avgResponseTime: 1.2,
      },
      alerts: [],
      lastUpdated: new Date().toISOString(),
    },
    {
      moduleId: "canvas",
      moduleName: "Unified Canvas",
      status: "healthy",
      keyMetrics: {
        activeCollaborations: 12,
        teamMembers: 34,
        permissionLayersConfigured: 8,
      },
      alerts: [],
      lastUpdated: new Date().toISOString(),
    },
    {
      moduleId: "ai-chef",
      moduleName: "AI Cooking Assistant",
      status: "healthy",
      keyMetrics: {
        guidanceRequests: 342,
        problemsSolved: 156,
        userSatisfaction: 4.7,
      },
      alerts: [],
      lastUpdated: new Date().toISOString(),
    },
    {
      moduleId: "maintenance",
      moduleName: "Predictive Maintenance",
      status: "warning",
      keyMetrics: {
        equipmentAtRisk: 2,
        staffAtRisk: 1,
        customersAtRisk: 4,
      },
      alerts: ["Dishwasher failure risk: 42%", "David Chen turnover risk: 48%"],
      lastUpdated: new Date().toISOString(),
    },
    {
      moduleId: "templates",
      moduleName: "Template Marketplace",
      status: "healthy",
      keyMetrics: {
        totalTemplates: 2456,
        activeUsers: 8932,
        totalDownloads: 125643,
        avgRating: 4.72,
      },
      alerts: [],
      lastUpdated: new Date().toISOString(),
    },
    {
      moduleId: "network",
      moduleName: "Network Marketplace",
      status: "healthy",
      keyMetrics: {
        totalSavings: 45620,
        activeSuppliers: 287,
        talentPool: 1245,
        avgDeliveryTime: 1.8,
      },
      alerts: [],
      lastUpdated: new Date().toISOString(),
    },
    {
      moduleId: "benchmark",
      moduleName: "Industry Benchmarking",
      status: "healthy",
      keyMetrics: {
        overallPercentile: 70,
        exceedingMetrics: 6,
        metricsBelow: 0,
        gapToTop: -4.2,
      },
      alerts: [],
      lastUpdated: new Date().toISOString(),
    },
  ];

  const healthyCount = moduleMetrics.filter(
    (m) => m.status === "healthy",
  ).length;
  const warningCount = moduleMetrics.filter(
    (m) => m.status === "warning",
  ).length;
  const criticalCount = moduleMetrics.filter(
    (m) => m.status === "critical",
  ).length;

  res.json({
    timestamp: new Date().toISOString(),
    systemHealth: {
      healthy: healthyCount,
      warning: warningCount,
      critical: criticalCount,
      total: moduleMetrics.length,
    },
    modules: moduleMetrics,
  });
});

// GET /api/dashboard-analytics/key-metrics
router.get("/key-metrics", (_req: Request, res: Response) => {
  res.json({
    financial: {
      monthlyRevenue: 95200,
      monthlyCosts: 62500,
      monthlyProfit: 32700,
      profitMargin: 34.4,
    },
    operations: {
      staffUtilization: 78,
      equipmentHealth: 74,
      qualityScore: 96,
      costSavings: 45620,
    },
    customer: {
      satisfaction: 4.6,
      retention: 78,
      churnRisk: 12,
      nps: 52,
    },
    benchmarks: {
      percentile: 70,
      foodCostPercentile: 65,
      laborCostPercentile: 72,
      customerSatPercentile: 78,
    },
  });
});

// GET /api/dashboard-analytics/alerts
router.get("/alerts", (_req: Request, res: Response) => {
  res.json({
    critical: [
      {
        id: "alert-1",
        module: "Predictive Maintenance",
        title: "Dishwasher Failure Imminent",
        description: "Health at 58%, estimated failure within 120 hours",
        severity: "critical",
        actionRequired: "Schedule maintenance within 48 hours",
      },
    ],
    warning: [
      {
        id: "alert-2",
        module: "Predictive Maintenance",
        title: "High Turnover Risk: David Chen",
        description: "Line cook showing 48% turnover risk",
        severity: "high",
        actionRequired: "Schedule 1:1 meeting to discuss needs",
      },
      {
        id: "alert-3",
        module: "Predictive Maintenance",
        title: "At-Risk Customer Account",
        description: "Corporate Events: no visits in 53 days, churn risk 88%",
        severity: "high",
        actionRequired: "Immediate outreach required",
      },
      {
        id: "alert-4",
        module: "Cost Management",
        title: "Food Cost Trending Up",
        description: "1.2% increase vs last month, industry flat",
        severity: "medium",
        actionRequired: "Review pricing strategy",
      },
    ],
    info: [
      {
        id: "info-1",
        module: "Template Marketplace",
        title: "Top Performing Template",
        description: "Bartender Certification Program: 3,456 downloads",
        severity: "info",
      },
      {
        id: "info-2",
        module: "Network Marketplace",
        title: "Network Savings Achievement",
        description: "$45,620 saved this year through bulk purchasing",
        severity: "info",
      },
    ],
  });
});

// POST /api/dashboard-analytics/export
router.post("/export", (req: Request, res: Response) => {
  try {
    const { format } = req.body as { format: "pdf" | "excel" | "csv" };

    res.json({
      success: true,
      format,
      filename: `dashboard-export-${new Date().toISOString().split("T")[0]}.${format === "pdf" ? "pdf" : format === "excel" ? "xlsx" : "csv"}`,
      url: "/api/dashboard-analytics/export/download",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[DASHBOARD] Export error:", error);
    res.status(500).json({ error: "Failed to export dashboard" });
  }
});

// GET /api/dashboard-analytics/health-check
router.get("/health-check", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    modulesHealthy: 11,
    modulesWarning: 1,
    modulesCritical: 0,
    lastSync: new Date(Date.now() - 30000).toISOString(),
    nextSync: new Date(Date.now() + 30000).toISOString(),
  });
});

export default router;
