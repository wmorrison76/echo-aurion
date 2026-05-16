import { Router, Request, Response } from "express";
import {
  analyticsEngine,
  ExecutiveDashboardData,
  PredictiveInsight,
  BenchmarkData,
  CustomReport,
} from "../../cognition/phases/phase-7-analytics";
import { requireRole } from "../middleware/auth";
import { validateOrgContext } from "../middleware/org-context";

const router = Router();

router.use(validateOrgContext);

/**
 * Executive Dashboard
 * GET /api/analytics/executive?period=2024-01
 */
router.get("/executive", async (req: Request, res: Response) => {
  try {
    const period =
      (req.query.period as string) || new Date().toISOString().slice(0, 7);
    const dashboard = await analyticsEngine.getExecutiveDashboard(period);
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch executive dashboard" });
  }
});

/**
 * Predictive Insights
 * GET /api/analytics/predictions
 */
router.get("/predictions", async (req: Request, res: Response) => {
  try {
    const insights = await analyticsEngine.getPredictiveInsights();
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch predictions" });
  }
});

/**
 * Benchmark Analysis
 * GET /api/analytics/benchmark/:outletId
 */
router.get("/benchmark/:outletId", async (req: Request, res: Response) => {
  try {
    const { outletId } = req.params;
    const benchmarks = await analyticsEngine.getBenchmarkAnalysis(outletId);
    res.json(benchmarks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch benchmark data" });
  }
});

/**
 * Custom Reports
 * GET /api/analytics/reports
 */
router.get("/reports", async (req: Request, res: Response) => {
  try {
    const reports = await analyticsEngine.getCustomReports();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

/**
 * Create Custom Report
 * POST /api/analytics/reports
 */
router.post(
  "/reports",
  requireRole("admin", "analyst"),
  async (req: Request, res: Response) => {
    try {
      const report: CustomReport = req.body;
      const id = await analyticsEngine.createCustomReport(report);
      res.status(201).json({ id, message: "Report created successfully" });
    } catch (error) {
      res.status(400).json({ error: "Failed to create report" });
    }
  },
);

/**
 * Schedule Report Delivery
 * POST /api/analytics/reports/:reportId/schedule
 */
router.post(
  "/reports/:reportId/schedule",
  requireRole("admin", "analyst"),
  async (req: Request, res: Response) => {
    try {
      const { reportId } = req.params;
      const { schedule } = req.body;
      await analyticsEngine.scheduleReportDelivery(reportId, schedule);
      res.json({ message: "Report scheduled successfully" });
    } catch (error) {
      res.status(400).json({ error: "Failed to schedule report" });
    }
  },
);

/**
 * Export Analytics Data
 * POST /api/analytics/export
 */
router.post("/export", async (req: Request, res: Response) => {
  try {
    const { format, metrics } = req.body;

    // Emit trace before export
    const { emitTrace } = await import("../lib/trace-emitter");
    emitTrace(
      req,
      "analytics-export",
      `export-${Date.now()}`,
      "phase-7-analytics",
      "export",
      {
        format,
        metrics: metrics || [],
      },
      {
        success: false, // Will be updated after export
      }
    ).catch(() => {
      // Ignore trace errors - graceful degradation
    });

    const buffer = await analyticsEngine.exportAnalyticsData(format, metrics);
    res.setHeader("Content-Type", `application/${format}`);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="analytics.${format}"`,
    );
    res.send(buffer);

    // Update trace with success
    emitTrace(
      req,
      "analytics-export",
      `export-${Date.now()}`,
      "phase-7-analytics",
      "export",
      {
        format,
        metrics: metrics || [],
      },
      {
        success: true,
        fileSize: buffer.length,
        recordCount: metrics?.length || 0,
      }
    ).catch(() => {
      // Ignore trace errors - graceful degradation
    });
  } catch (error) {
    res.status(400).json({ error: "Failed to export data" });
  }
});

/**
 * Acknowledge Alert
 * POST /api/analytics/alerts/:alertId/acknowledge
 */
router.post(
  "/alerts/:alertId/acknowledge",
  async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      await analyticsEngine.acknowledgeAlert(alertId);
      res.json({ message: "Alert acknowledged" });
    } catch (error) {
      res.status(400).json({ error: "Failed to acknowledge alert" });
    }
  },
);

/**
 * Comparison Analysis
 * POST /api/analytics/compare
 */
router.post("/compare", async (req: Request, res: Response) => {
  try {
    const { outletIds, metric, period } = req.body;
    const analysis = await analyticsEngine.getComparisonAnalysis(
      outletIds,
      metric,
      period,
    );
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ error: "Failed to fetch comparison" });
  }
});

/**
 * Cross-module dashboards: aggregate KPIs from Schedule, Culinary, Aurum
 * GET /api/analytics/cross-module?orgId=&period=
 */
router.get("/cross-module", async (req: Request, res: Response) => {
  try {
    const orgId = (req.query.orgId as string) || "";
    const period = (req.query.period as string) || new Date().toISOString().slice(0, 7);
    // Stub: in production aggregate from schedule, culinary, aurum using semantic layer
    res.json({
      orgId,
      period,
      schedule: { laborHours: 0, shiftsFilled: 0, openShifts: 0 },
      culinary: { covers: 0, revenue: 0, wasteCost: 0 },
      aurum: { revenue: 0, cost: 0, margin: 0 },
      meta: { source: "cross_module", semanticLayer: true },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch cross-module KPIs" });
  }
});

export default router;
