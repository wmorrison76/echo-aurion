/**
 * Integrations reconciliation API
 * GET /api/integrations/reconciliation/reports — list reconciliation reports for org.
 * POST /api/integrations/reconciliation/run — run reconciliation for a connector and store report.
 */

import { Router, Request, Response } from "express";
import { getOrgContext } from "../lib/org-context";
import { runReconciliation } from "../services/reconciliation-service";
import { emitTrace } from "../lib/trace-emitter";
import type { ReconciliationReportEntity } from "../services/reconciliation-service";

const router = Router();

// In-memory store for reconciliation reports (in production, use DB or trace-ledger query)
const reportsStore: ReconciliationReportEntity[] = [];

/**
 * GET /api/integrations/reconciliation/reports
 * List reconciliation reports for current org.
 */
router.get("/reports", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const orgId = orgContext.orgId;
    const connectorId = req.query.connectorId as string | undefined;
    let list = reportsStore.filter((r) => r.orgId === orgId);
    if (connectorId) list = list.filter((r) => r.connectorId === connectorId);
    list = list.sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime());
    res.json({ reports: list });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/integrations/reconciliation/run
 * Run reconciliation for a connector (stub compareFn); store report and return it.
 */
router.post("/run", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const connectorId = String(req.body?.connectorId || "default").trim();
    const report = await runReconciliation(
      {
        orgId: orgContext.orgId,
        connectorId,
        limit: 100,
        emitTrace: async (eventType, payload) => {
          const r = await emitTrace(req as any, "reconciliation", payload.reportId ?? "recon", "reconciliation", "integration", payload, {}, { traceId: payload.reportId });
          return r?.traceId ?? null;
        },
      },
      async () => ({ match: true, reasonCode: "MATCH", sourceId: "stub", at: new Date().toISOString() })
    );
    reportsStore.push(report);
    const max = 500;
    if (reportsStore.length > max) reportsStore.splice(0, reportsStore.length - max);
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Register a report (called by reconciliation service or run endpoint).
 */
export function registerReconciliationReport(report: ReconciliationReportEntity): void {
  reportsStore.push(report);
  const max = 500;
  if (reportsStore.length > max) reportsStore.splice(0, reportsStore.length - max);
}

/** For Sync Health dashboard: get latest reconciliation reports per connector for an org. */
export function getReconciliationReportsForOrg(orgId: string): ReconciliationReportEntity[] {
  return reportsStore.filter((r) => r.orgId === orgId).sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime());
}

export const integrationsReconciliationRouter = router;
