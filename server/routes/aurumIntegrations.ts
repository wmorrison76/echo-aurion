/**
 * EchoAurum Integrations API
 * Routes for Inventory, Scheduling, Revenue Metrics, Bank Feed, and Custom Reports
 */

import { Router, Request, Response } from "express";
import { jwtAuthMiddleware } from "../middleware/auth-jwt";
import { logger } from "../lib/logger";
import { InventoryConnector } from "../services/connectors/inventoryConnector";
import { SchedulingConnector } from "../services/connectors/schedulingConnector";
import { RevenueMetricsEngine } from "../services/revenueMetricsEngine";
import { BankFeedConnector } from "../services/connectors/bankFeedConnector";
import {
  CustomReportBuilder,
  CustomReport,
} from "../services/customReportBuilder";
import { getSupabaseClient } from "../lib/supabase";

export const aurumIntegrationsRouter = Router();
aurumIntegrationsRouter.use(jwtAuthMiddleware);

// ============================================
// INVENTORY CONNECTOR ROUTES
// ============================================

aurumIntegrationsRouter.post(
  "/inventory/sync",
  async (req: Request, res: Response) => {
    try {
      const { entityId } = req.body;
      if (!entityId)
        return res.status(400).json({ error: "entityId required" });

      const inventory = await InventoryConnector.syncInventory(entityId);
      const summary = await InventoryConnector.getInventorySummary(entityId);

      res.json({
        success: true,
        inventory,
        summary,
        syncedAt: new Date(),
      });
    } catch (error) {
      logger.error("[Inventory] Sync error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Inventory sync failed" });
    }
  },
);

aurumIntegrationsRouter.post(
  "/inventory/variance",
  async (req: Request, res: Response) => {
    try {
      const { entityId, expectedInventory, actualInventory } = req.body;
      if (!entityId)
        return res.status(400).json({ error: "entityId required" });

      const variances = await InventoryConnector.calculateVariance(
        entityId,
        expectedInventory,
        actualInventory,
      );

      const glEntries = await InventoryConnector.createVarianceEntries(
        entityId,
        variances,
      );

      res.json({
        success: true,
        variances,
        glEntriesCreated: glEntries.length,
        totalVarianceValue: variances.reduce(
          (sum, v) => sum + Math.abs(v.varianceValue),
          0,
        ),
      });
    } catch (error) {
      logger.error("[Inventory] Variance error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Variance calculation failed" });
    }
  },
);

// ============================================
// EVENT FINANCIAL SUMMARY (P&L)
// ============================================

aurumIntegrationsRouter.get(
  "/events/:eventId/financial-summary",
  async (req: Request, res: Response) => {
    try {
      const { eventId } = req.params;
      const orgId = req.user?.org_id;

      if (!orgId) {
        return res.status(400).json({ error: "orgId required" });
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        return res.status(500).json({ error: "Database connection unavailable" });
      }

      const { data: event, error: eventError } = await supabase
        .from("calendar_events")
        .select("id, outlet_id, beo_id, revenue, guest_count")
        .eq("id", eventId)
        .eq("org_id", orgId)
        .single();

      if (eventError || !event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const { data: allocations, error: allocError } = await supabase
        .from("event_cost_allocations")
        .select("total_cost")
        .eq("event_id", eventId)
        .eq("organization_id", orgId);

      if (allocError) {
        logger.warn("[Aurum] Failed to fetch cost allocations", {
          error: allocError.message,
        });
      }

      const cogsTotal = (allocations || []).reduce(
        (sum: number, row: any) => sum + Number(row.total_cost || 0),
        0,
      );
      const forecastRevenueTotal = Number(event.revenue || 0);
      const billedRevenueTotal = Number(event.revenue || 0);
      const amountPaidTotal = 0;
      const outstandingBalance = billedRevenueTotal - amountPaidTotal;
      const guestCount = Number(event.guest_count || 0);
      const cogsPerCover = guestCount > 0 ? cogsTotal / guestCount : 0;
      const grossMargin = billedRevenueTotal - cogsTotal;

      res.json({
        eventId,
        beoId: event.beo_id,
        outletId: event.outlet_id,
        currency: "USD",
        forecastRevenueTotal,
        billedRevenueTotal,
        amountPaidTotal,
        outstandingBalance,
        cogsTotal,
        cogsPerCover,
        grossMargin,
        lastCostUpdatedAt: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[Aurum] Event financial summary error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to fetch event financial summary" });
    }
  },
);

// ============================================
// SCHEDULING CONNECTOR ROUTES
// ============================================

aurumIntegrationsRouter.post(
  "/scheduling/sync",
  async (req: Request, res: Response) => {
    try {
      const { entityId, startDate, endDate } = req.body;
      if (!entityId)
        return res.status(400).json({ error: "entityId required" });

      const dateRange = {
        start: new Date(startDate || Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(endDate || Date.now()),
      };

      const schedule = await SchedulingConnector.syncSchedule(
        entityId,
        dateRange,
      );
      const actuals = await SchedulingConnector.syncLaborActuals(
        entityId,
        dateRange,
      );
      const summary = await SchedulingConnector.getLaborSummary(entityId);

      res.json({
        success: true,
        schedule,
        actuals,
        summary,
        syncedAt: new Date(),
      });
    } catch (error) {
      logger.error("[Scheduling] Sync error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Scheduling sync failed" });
    }
  },
);

aurumIntegrationsRouter.post(
  "/scheduling/variance",
  async (req: Request, res: Response) => {
    try {
      const { entityId, schedule, actuals } = req.body;
      if (!entityId)
        return res.status(400).json({ error: "entityId required" });

      const variances = await SchedulingConnector.calculateVariance(
        entityId,
        schedule,
        actuals,
      );
      const forecast = await SchedulingConnector.forecastImpact(
        entityId,
        variances,
      );

      res.json({
        success: true,
        variances,
        forecast,
        totalVarianceCost: variances.reduce(
          (sum, v) => sum + v.varianceCost,
          0,
        ),
      });
    } catch (error) {
      logger.error("[Scheduling] Variance error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Variance calculation failed" });
    }
  },
);

// ============================================
// REVENUE METRICS ROUTES
// ============================================

aurumIntegrationsRouter.get(
  "/revenue/daily",
  async (req: Request, res: Response) => {
    try {
      const { entityId, date } = req.query;
      if (!entityId)
        return res.status(400).json({ error: "entityId required" });

      const metrics = await RevenueMetricsEngine.calculateDailyMetrics(
        String(entityId),
        new Date(date as string),
      );

      res.json({
        success: true,
        metrics,
        glMapping: await RevenueMetricsEngine.mapToGL(
          String(entityId),
          metrics,
        ),
      });
    } catch (error) {
      logger.error("[Revenue] Daily metrics error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to calculate daily metrics" });
    }
  },
);

aurumIntegrationsRouter.get(
  "/revenue/monthly",
  async (req: Request, res: Response) => {
    try {
      const { entityId, year, month } = req.query;
      if (!entityId)
        return res.status(400).json({ error: "entityId required" });

      const metrics = await RevenueMetricsEngine.calculateMonthlyMetrics(
        String(entityId),
        Number(year),
        Number(month),
      );

      res.json({
        success: true,
        metrics,
      });
    } catch (error) {
      logger.error("[Revenue] Monthly metrics error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to calculate monthly metrics" });
    }
  },
);

aurumIntegrationsRouter.post(
  "/revenue/forecast",
  async (req: Request, res: Response) => {
    try {
      const { entityId, startDate, days = 30 } = req.body;
      if (!entityId)
        return res.status(400).json({ error: "entityId required" });

      const forecasts = await RevenueMetricsEngine.forecastMetrics(
        entityId,
        new Date(startDate),
        days,
      );

      res.json({
        success: true,
        forecasts,
        count: forecasts.length,
      });
    } catch (error) {
      logger.error("[Revenue] Forecast error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to generate forecast" });
    }
  },
);

// ============================================
// BANK FEED CONNECTOR ROUTES
// ============================================

aurumIntegrationsRouter.post(
  "/bank-feed/sync",
  async (req: Request, res: Response) => {
    try {
      const { entityId, accountId, startDate, endDate } = req.body;
      if (!entityId)
        return res.status(400).json({ error: "entityId required" });

      const dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };

      const transactions = await BankFeedConnector.downloadTransactions(
        entityId,
        accountId,
        dateRange,
      );

      res.json({
        success: true,
        transactions,
        count: transactions.length,
        syncedAt: new Date(),
      });
    } catch (error) {
      logger.error("[BankFeed] Sync error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Bank feed sync failed" });
    }
  },
);

aurumIntegrationsRouter.post(
  "/bank-feed/match",
  async (req: Request, res: Response) => {
    try {
      const { entityId, bankTransactions, glEntries } = req.body;
      if (!entityId)
        return res.status(400).json({ error: "entityId required" });

      const matches = await BankFeedConnector.matchTransactions(
        entityId,
        bankTransactions,
        glEntries,
      );
      const glCreated = await BankFeedConnector.createEntriesForUnmatched(
        entityId,
        bankTransactions,
        matches,
      );

      res.json({
        success: true,
        matches,
        glEntriesCreated: glCreated.length,
        matchRate: `${((matches.length / bankTransactions.length) * 100).toFixed(1)}%`,
      });
    } catch (error) {
      logger.error("[BankFeed] Match error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Bank matching failed" });
    }
  },
);

aurumIntegrationsRouter.post(
  "/bank-feed/reconcile",
  async (req: Request, res: Response) => {
    try {
      const { entityId, accountId, bankTransactions, glBalance, bankBalance } =
        req.body;
      if (!entityId)
        return res.status(400).json({ error: "entityId required" });

      const reconciliation = await BankFeedConnector.reconcile(
        entityId,
        accountId,
        bankTransactions,
        glBalance,
        bankBalance,
      );

      res.json({
        success: true,
        reconciliation,
      });
    } catch (error) {
      logger.error("[BankFeed] Reconciliation error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Bank reconciliation failed" });
    }
  },
);

// ============================================
// CUSTOM REPORT BUILDER ROUTES
// ============================================

aurumIntegrationsRouter.post(
  "/reports",
  async (req: Request, res: Response) => {
    try {
      const report = await CustomReportBuilder.createReport({
        ...req.body,
        createdBy: req.user?.id || "unknown",
      });

      res.json({
        success: true,
        report,
      });
    } catch (error) {
      logger.error("[Reports] Create error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to create report" });
    }
  },
);

aurumIntegrationsRouter.get("/reports", async (req: Request, res: Response) => {
  try {
    const reports = await CustomReportBuilder.listReports();

    res.json({
      success: true,
      reports,
      count: reports.length,
    });
  } catch (error) {
    logger.error("[Reports] List error", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Failed to list reports" });
  }
});

aurumIntegrationsRouter.get(
  "/reports/:reportId",
  async (req: Request, res: Response) => {
    try {
      const report = await CustomReportBuilder.getReport(req.params.reportId);

      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      res.json({
        success: true,
        report,
      });
    } catch (error) {
      logger.error("[Reports] Get error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to get report" });
    }
  },
);

aurumIntegrationsRouter.post(
  "/reports/:reportId/execute",
  async (req: Request, res: Response) => {
    try {
      const { entityId } = req.body;
      if (!entityId)
        return res.status(400).json({ error: "entityId required" });

      const execution = await CustomReportBuilder.executeReport(
        req.params.reportId,
        entityId,
      );

      res.json({
        success: true,
        execution,
      });
    } catch (error) {
      logger.error("[Reports] Execute error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to execute report" });
    }
  },
);

aurumIntegrationsRouter.delete(
  "/reports/:reportId",
  async (req: Request, res: Response) => {
    try {
      const deleted = await CustomReportBuilder.deleteReport(
        req.params.reportId,
      );

      if (!deleted) {
        return res.status(404).json({ error: "Report not found" });
      }

      res.json({
        success: true,
        deletedReportId: req.params.reportId,
      });
    } catch (error) {
      logger.error("[Reports] Delete error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to delete report" });
    }
  },
);

aurumIntegrationsRouter.get(
  "/reports/templates/all",
  async (req: Request, res: Response) => {
    try {
      const templates = CustomReportBuilder.getAvailableTemplates();

      res.json({
        success: true,
        templates,
        count: templates.length,
      });
    } catch (error) {
      logger.error("[Reports] Templates error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to get templates" });
    }
  },
);

// ============================================
// AR (Accounts Receivable) – minimal stub
// ============================================
aurumIntegrationsRouter.get("/ar/receivables", async (req: Request, res: Response) => {
  try {
    const { entityId, status } = req.query;
    if (!entityId) return res.status(400).json({ error: "entityId required" });
    res.json({
      receivables: [],
      total: 0,
      summary: { outstanding: 0, overdue: 0 },
      message: "AR data from EchoAurum; use full EchoAurum server for aging/dunning",
    });
  } catch (error) {
    logger.error("[AR] List receivables error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Failed to list receivables" });
  }
});
aurumIntegrationsRouter.post("/ar/receivables/:id/record-payment", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, paymentDate, reference } = req.body;
    if (!id) return res.status(400).json({ error: "receivable id required" });
    res.status(201).json({
      receivableId: id,
      recorded: true,
      amount: amount ?? 0,
      paymentDate: paymentDate ?? new Date().toISOString().split("T")[0],
      reference,
      message: "Stub: wire to EchoAurum AR for persistence",
    });
  } catch (error) {
    logger.error("[AR] Record payment error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Failed to record payment" });
  }
});

// ============================================
// Bank reconciliation – stub (match bank tx to GL)
// ============================================
aurumIntegrationsRouter.get("/reconciliation/status", async (req: Request, res: Response) => {
  try {
    const { entityId } = req.query;
    if (!entityId) return res.status(400).json({ error: "entityId required" });
    res.json({
      entityId,
      status: "no_data",
      matchedCount: 0,
      unmatchedBankCount: 0,
      unmatchedGLCount: 0,
      message: "Use EchoAurum reconciliation routes for full bank rec",
    });
  } catch (error) {
    logger.error("[Reconciliation] Status error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Failed to get reconciliation status" });
  }
});
aurumIntegrationsRouter.post("/reconciliation/match", async (req: Request, res: Response) => {
  try {
    const { entityId, bankTransactionId, glEntryId } = req.body;
    if (!entityId || !bankTransactionId) return res.status(400).json({ error: "entityId and bankTransactionId required" });
    res.json({
      matched: true,
      bankTransactionId,
      glEntryId: glEntryId ?? null,
      message: "Stub: wire to reconciliation-service or EchoAurum for persistence",
    });
  } catch (error) {
    logger.error("[Reconciliation] Match error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Failed to match transaction" });
  }
});

// ============================================
// Tax integration stub (jurisdiction + export for CPA/TurboTax)
// ============================================
aurumIntegrationsRouter.get("/tax/config", async (req: Request, res: Response) => {
  try {
    const { entityId } = req.query;
    if (!entityId) return res.status(400).json({ error: "entityId required" });
    res.json({
      entityId,
      jurisdiction: "US",
      taxYear: new Date().getFullYear(),
      exportFormats: ["turbo_tax", "cpa_csv"],
      message: "Stub: configure Avalara or tax prep partner per deployment",
    });
  } catch (error) {
    logger.error("[Tax] Config error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Failed to get tax config" });
  }
});
aurumIntegrationsRouter.get("/tax/export", async (req: Request, res: Response) => {
  try {
    const { entityId, period } = req.query;
    if (!entityId) return res.status(400).json({ error: "entityId required" });
    res.json({
      entityId,
      period: period ?? "ytd",
      format: "stub",
      url: null,
      message: "Stub: integrate with TurboTax/CPA export",
    });
  } catch (error) {
    logger.error("[Tax] Export error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Failed to export tax data" });
  }
});
