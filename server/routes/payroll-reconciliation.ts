/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 4 Day 20
 * Payroll Reconciliation API
 *
 * Endpoints:
 * - POST /api/v1/payroll/sync (manual trigger)
 * - GET /api/v1/payroll/status (check payroll status)
 * - POST /api/v1/payroll/approve (manager approval)
 * - GET /api/v1/payroll/history (past payroll runs)
 * - GET /api/v1/payroll/reconcile (reconciliation report)
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  validateBody,
  validateQuery,
  CommonSchemas,
} from "../middleware/validation";
import { getOrgContext, enforceOrgId } from "../lib/multi-tenant";
import { logger } from "../lib/logger";
import { emitPayrollRunPostedEvent } from "../lib/financial-event-emitter";
import { runPayrollSyncJobForOutlet } from "../jobs/payrollSyncJob";
import { PayrollEchoAurumPoster } from "../services/payroll-echoaurum-poster";
import { AurumDatabaseService } from "../services/aurum-database-service";

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const syncPayrollSchema = z.object({
  org_id: CommonSchemas.orgId,
  outlet_id: z.string().min(1),
  period: z.string().regex(/^\d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}$/),
  currency: z.enum(["USD", "CAD", "GBP", "EUR"]).optional().default("USD"),
  tz: z.string().optional().default("UTC"),
  integrationProvider: z.enum(["rippling", "gusto"]).optional(),
  dryRun: z.boolean().optional().default(false),
});

const approvePayrollSchema = z.object({
  org_id: CommonSchemas.orgId,
  payrollRunId: z.string().min(1),
  approverEmail: z.string().email(),
  notes: z.string().optional(),
});

const payrollHistorySchema = z.object({
  org_id: CommonSchemas.orgId,
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  status: z
    .enum(["pending", "approved", "submitted", "completed", "failed"])
    .optional(),
});

const reconcileSchema = z.object({
  org_id: CommonSchemas.orgId,
  period: z.string().regex(/^\d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}$/),
});

const postPayrollRunSchema = z.object({
  org_id: CommonSchemas.orgId,
  outlet_id: z.string().min(1),
  payroll_run_id: z.string().min(1),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  wages: z.number().finite().nonnegative(),
  taxes: z.number().finite().nonnegative(),
  benefits: z.number().finite().nonnegative(),
  deductions: z.number().finite().nonnegative().optional().default(0),
  employee_count: z.number().int().nonnegative().optional(),
  provider: z.string().optional(),
});

// ============================================================================
// POST /api/v1/payroll/sync - MANUAL PAYROLL SYNC TRIGGER
// ============================================================================

router.post(
  "/sync",
  validateBody(syncPayrollSchema),
  async (req: Request, res: Response) => {
    try {
      const orgContext = getOrgContext(req);
      const {
        org_id,
        outlet_id,
        period,
        currency,
        tz,
        integrationProvider,
        dryRun,
      } = req.body;

      enforceOrgId(org_id, orgContext.orgId);

      logger.info("Payroll sync triggered", {
        orgId: org_id,
        outlet_id,
        period,
        integrationProvider,
        dryRun,
      });

      if (!dryRun) {
        return res.status(501).json({
          success: false,
          error: "NOT_IMPLEMENTED",
          message:
            "Live provider submission is phased. Use dryRun=true for now, or configure the provider integration in Phase 3.",
        });
      }

      const result = await runPayrollSyncJobForOutlet(org_id, outlet_id, {
        period,
        currency,
        tz,
        provider: integrationProvider || "dryRun",
        dryRun: true,
        userId: orgContext.userId,
      });

      res.json({
        success: true,
        payrollRunId: result.payrollRunId,
        status: "simulated",
        message: "Payroll sync simulated and posted to financial engine",
        period: result.period,
        outlet_id: result.outlet_id,
        currency: result.currency,
        totals: {
          wages: result.wages,
          taxes: result.taxes,
          benefits: result.benefits,
          total: result.totalPayroll,
          employeeCount: result.employeeCount,
        },
        timestamp: result.timestamp.toISOString(),
      });
    } catch (error) {
      logger.error("Payroll sync failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: "Payroll sync failed",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

// ============================================================================
// POST /api/v1/payroll/post-run - POST PAYROLL ACTUALS INTO FINANCIAL ENGINE
// ============================================================================

router.post(
  "/post-run",
  validateBody(postPayrollRunSchema),
  async (req: Request, res: Response) => {
    try {
      const orgContext = getOrgContext(req);
      const {
        org_id,
        outlet_id,
        payroll_run_id,
        period_start,
        period_end,
        wages,
        taxes,
        benefits,
        deductions,
        employee_count,
        provider,
      } = req.body;

      enforceOrgId(org_id, orgContext.orgId);

      const timestamp = new Date(`${period_end}T23:59:59.999Z`).getTime();

      emitPayrollRunPostedEvent(
        outlet_id,
        org_id,
        {
          payroll_run_id,
          period_start,
          period_end,
          wages,
          taxes,
          benefits,
          deductions,
          employee_count,
          provider,
        },
        orgContext.userId,
        timestamp,
      );

      const posting = PayrollEchoAurumPoster.getPosting(
        org_id,
        outlet_id,
        payroll_run_id,
      );

      res.json({
        success: true,
        message: "Payroll run posted to financial engine",
        outlet_id,
        payroll_run_id,
        period_start,
        period_end,
        echoAurumPosting: posting,
      });
    } catch (error) {
      logger.error("Failed to post payroll run to financial engine", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: "Failed to post payroll run",
      });
    }
  },
);

// ============================================================================
// GET /api/v1/payroll/echoaurum/postings - PAYROLL → ECHOAURUM POSTING STATUS
// ============================================================================

router.get(
  "/echoaurum/postings",
  validateQuery(
    z.object({
      org_id: CommonSchemas.orgId,
      outlet_id: z.string().min(1).optional(),
      limit: z.coerce.number().min(1).max(100).optional().default(50),
      offset: z.coerce.number().min(0).optional().default(0),
    }),
  ),
  async (req: Request, res: Response) => {
    try {
      const orgContext = getOrgContext(req);
      const { org_id, outlet_id, limit, offset } = req.query;

      enforceOrgId(org_id as string, orgContext.orgId);

      const postings = await AurumDatabaseService.listPayrollPostings({
        org_id: org_id as string,
        outlet_id: typeof outlet_id === "string" ? outlet_id : undefined,
        limit: Number(limit),
        offset: Number(offset),
      });

      res.json({
        success: true,
        org_id,
        outlet_id: outlet_id ?? null,
        limit,
        offset,
        total: postings.length,
        postings,
      });
    } catch (error) {
      logger.error("Failed to list EchoAurum payroll postings", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: "Failed to list payroll postings",
      });
    }
  },
);

router.get(
  "/echoaurum/postings/:payroll_run_id",
  validateQuery(
    z.object({
      org_id: CommonSchemas.orgId,
      outlet_id: z.string().min(1),
    }),
  ),
  async (req: Request, res: Response) => {
    try {
      const orgContext = getOrgContext(req);
      const { payroll_run_id } = req.params;
      const { org_id, outlet_id } = req.query;

      enforceOrgId(org_id as string, orgContext.orgId);

      const posting = await AurumDatabaseService.getPayrollPosting({
        org_id: org_id as string,
        outlet_id: outlet_id as string,
        payroll_run_id,
      });

      if (!posting) {
        return res.status(404).json({
          success: false,
          error: "NOT_FOUND",
          message: "No EchoAurum posting found for payroll run",
        });
      }

      return res.json({
        success: true,
        posting,
      });
    } catch (error) {
      logger.error("Failed to fetch EchoAurum payroll posting", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: "Failed to fetch payroll posting",
      });
    }
  },
);

// ============================================================================
// GET /api/v1/payroll/status - CHECK PAYROLL STATUS
// ============================================================================

router.get(
  "/status",
  validateQuery(
    z.object({
      org_id: CommonSchemas.orgId,
      payrollRunId: z.string().min(1),
    }),
  ),
  async (req: Request, res: Response) => {
    try {
      const orgContext = getOrgContext(req);
      const { org_id, payrollRunId } = req.query;

      enforceOrgId(org_id as string, orgContext.orgId);

      logger.debug("Checking payroll status", { payrollRunId });

      // TODO: In production, query payroll_runs table
      // const payrollRun = await db.query(
      //   'SELECT * FROM payroll_runs WHERE id = ? AND org_id = ?',
      //   [payrollRunId, org_id]
      // );

      const mockStatus = {
        payrollRunId,
        status: "submitted",
        period: "2024-01-01 to 2024-01-07",
        employeeCount: 8,
        totalPayroll: 5500,
        submittedAt: new Date(Date.now() - 60000).toISOString(),
        approvedAt: null,
        ripplingRunId: "rpl-12345",
        integrationProvider: "rippling",
      };

      res.json({
        success: true,
        status: mockStatus,
      });
    } catch (error) {
      logger.error("Failed to fetch payroll status", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: "Failed to fetch payroll status",
      });
    }
  },
);

// ============================================================================
// POST /api/v1/payroll/approve - MANAGER APPROVAL
// ============================================================================

router.post(
  "/approve",
  validateBody(approvePayrollSchema),
  async (req: Request, res: Response) => {
    try {
      const orgContext = getOrgContext(req);
      const { org_id, payrollRunId, approverEmail, notes } = req.body;

      enforceOrgId(org_id, orgContext.orgId);

      logger.info("Payroll approval submitted", {
        orgId: org_id,
        payrollRunId,
        approverEmail,
      });

      // TODO: In production, update payroll_runs table
      // await db.update('payroll_runs').set({
      //   status: 'approved',
      //   approved_at: new Date(),
      //   approver_email: approverEmail,
      //   notes,
      // }).where({ id: payrollRunId, org_id });

      // TODO: Create audit log
      // await db.insert('audit_logs').values({
      //   org_id,
      //   action: 'payroll_approved',
      //   details: { payrollRunId, approverEmail },
      //   timestamp: new Date(),
      // });

      res.json({
        success: true,
        message: "Payroll approved successfully",
        payrollRunId,
        approvedAt: new Date().toISOString(),
        approverEmail,
      });
    } catch (error) {
      logger.error("Payroll approval failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: "Payroll approval failed",
      });
    }
  },
);

// ============================================================================
// GET /api/v1/payroll/history - PAYROLL HISTORY
// ============================================================================

router.get(
  "/history",
  validateQuery(payrollHistorySchema),
  async (req: Request, res: Response) => {
    try {
      const orgContext = getOrgContext(req);
      const { org_id, limit, offset, status } = req.query;

      enforceOrgId(org_id as string, orgContext.orgId);

      logger.debug("Fetching payroll history", {
        org_id,
        limit,
        offset,
        status,
      });

      // TODO: In production, query payroll_runs table
      // const history = await db.query(
      //   'SELECT * FROM payroll_runs WHERE org_id = ? AND status LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      //   [org_id, status ? `%${status}%` : '%', limit, offset]
      // );

      const mockHistory = generateMockPayrollHistory(10);

      res.json({
        success: true,
        runs: mockHistory,
        total: mockHistory.length,
        limit,
        offset,
      });
    } catch (error) {
      logger.error("Failed to fetch payroll history", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: "Failed to fetch payroll history",
      });
    }
  },
);

// ============================================================================
// GET /api/v1/payroll/reconcile - RECONCILIATION REPORT
// ============================================================================

router.get(
  "/reconcile",
  validateQuery(reconcileSchema),
  async (req: Request, res: Response) => {
    try {
      const orgContext = getOrgContext(req);
      const { org_id, period } = req.query;

      enforceOrgId(org_id as string, orgContext.orgId);

      const [startDate, endDate] = (period as string).split(" to ");

      logger.info("Reconciliation report requested", {
        org_id,
        period,
      });

      // TODO: In production, query time_tracking and payroll_runs
      // Calculate differences between time entries and submitted payroll

      const reconciliation = {
        period: period as string,
        status: "reconciled",
        timeEntries: {
          total: 150,
          regularHours: 120,
          overtimeHours: 30,
          totalCost: 4200,
        },
        payrollSubmitted: {
          total: 8,
          regularHours: 120,
          overtimeHours: 30,
          totalCost: 4200,
        },
        differences: {
          hoursVariance: 0,
          costVariance: 0,
          discrepancies: [],
        },
        accuracy: 100,
        approvedAt: new Date().toISOString(),
      };

      res.json({
        success: true,
        reconciliation,
      });
    } catch (error) {
      logger.error("Reconciliation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: "Reconciliation failed",
      });
    }
  },
);

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

function generateMockPayrollHistory(count: number) {
  const statuses = ["pending", "approved", "submitted", "completed", "failed"];
  const runs = [];

  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i * 7);

    runs.push({
      id: `payroll-${i}`,
      period: `${new Date(date.getTime() - 604800000).toISOString().split("T")[0]} to ${date.toISOString().split("T")[0]}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      employeeCount: 8,
      totalPayroll: 4500 + Math.floor(Math.random() * 2000),
      createdAt: date.toISOString(),
      approvedAt:
        Math.random() > 0.3
          ? new Date(date.getTime() + 3600000).toISOString()
          : null,
      submittedAt:
        Math.random() > 0.2
          ? new Date(date.getTime() + 7200000).toISOString()
          : null,
    });
  }

  return runs;
}

export default router;
