/**
 * Reports API using semantic layer
 * GET /api/reports - list report definitions
 * GET /api/reports/:id/run - run report by id (best-in-class: semantic layer + report builder)
 */

import { Router, Request, Response } from "express";
import type { ReportDefinition, SemanticQuery } from "../../shared/types/semantic-layer";

const router = Router();

const stubReports: ReportDefinition[] = [
  {
    id: "revenue-by-outlet",
    name: "Revenue by Outlet",
    query: {
      dimensions: ["outlet_id", "date"],
      measures: ["revenue"],
      granularity: "day",
    },
    schedule: "weekly",
    delivery: "in_app",
  },
  {
    id: "labor-costs",
    name: "Labor Costs",
    query: {
      dimensions: ["department", "date"],
      measures: ["labor_cost", "hours"],
      granularity: "week",
    },
  },
];

router.get("/", (req: Request, res: Response) => {
  res.json({ reports: stubReports });
});

router.get("/:id/run", (req: Request, res: Response) => {
  const report = stubReports.find((r) => r.id === req.params.id);
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }
  res.json({
    reportId: report.id,
    name: report.name,
    query: report.query,
    rows: [],
    meta: { resolvedAt: new Date().toISOString(), source: "semantic_layer" },
  });
});

/** Resolve semantic query to tables/columns (stub: returns mapping + mock rows) */
router.post("/resolve", (req: Request, res: Response) => {
  const query = req.body as SemanticQuery;
  if (!query || !query.dimensions?.length || !query.measures?.length) {
    return res.status(400).json({ error: "query.dimensions and query.measures required" });
  }
  res.json({
    resolved: {
      dimensions: query.dimensions.map((d) => ({ dimension: d, table: "fact_daily", column: d })),
      measures: query.measures.map((m) => ({ measure: m, expression: `SUM(${m})`, table: "fact_daily" })),
      timeRange: query.timeRange ?? { start: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0], end: new Date().toISOString().split("T")[0] },
    },
    rows: [],
    meta: { source: "semantic_layer", delegate: "dashboard/aurum" },
  });
});

/** Scheduled delivery stub: list scheduled report jobs */
router.get("/scheduled/list", (req: Request, res: Response) => {
  res.json({
    jobs: [],
    message: "Stub: wire to queue or cron; schedule report X to email every Monday",
  });
});

/** Scheduled delivery stub: create scheduled job */
router.post("/scheduled", (req: Request, res: Response) => {
  const { reportId, schedule, delivery, recipients } = req.body;
  if (!reportId) return res.status(400).json({ error: "reportId required" });
  res.status(201).json({
    jobId: `sched_${Date.now()}`,
    reportId,
    schedule: schedule ?? "weekly",
    delivery: delivery ?? "email",
    recipients: recipients ?? [],
    message: "Stub: add to queue or cron entry point",
  });
});

export default router;
