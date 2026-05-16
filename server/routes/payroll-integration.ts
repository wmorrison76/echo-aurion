/**
 * Payroll Integration API Routes
 * ------------------------------
 * API endpoints for payroll integration
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { basicAuthMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";
import { getPayrollIntegrationService } from "../services/payroll-integration-service";

const router = Router();
router.use(basicAuthMiddleware);

const ExportHoursSchema = z.object({
  periodId: z.string().uuid(),
  orgId: z.string().uuid(),
  providerId: z.string(),
  data: z.array(
    z.object({
      employeeId: z.string().uuid(),
      employeeName: z.string(),
      regularHours: z.number().min(0),
      overtimeHours: z.number().min(0),
      regularRate: z.number().min(0),
      overtimeRate: z.number().min(0),
      regularPay: z.number().min(0),
      overtimePay: z.number().min(0),
      tips: z.number().min(0),
      totalPay: z.number().min(0),
      deductions: z.record(z.number()).optional(),
      netPay: z.number().min(0),
    })
  ),
});

const ReconcilePayrollSchema = z.object({
  periodId: z.string().uuid(),
  orgId: z.string().uuid(),
  scheduleHours: z.record(z.number()),
  payrollHours: z.record(z.number()),
});

/**
 * POST /api/payroll/export
 * Export hours to payroll provider
 */
router.post("/export", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    const userId = (req as any).user?.id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validated = ExportHoursSchema.parse(req.body);
    const payrollService = getPayrollIntegrationService();

    const exportRecord = await payrollService.exportHours(
      validated.periodId,
      validated.orgId,
      validated.providerId,
      validated.data,
      userId || "system"
    );

    logger.info("[Payroll] Hours exported", {
      orgId: validated.orgId,
      periodId: validated.periodId,
      providerId: validated.providerId,
      employeeCount: validated.data.length,
    });

    res.json({
      success: true,
      export: exportRecord,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }

    logger.error("[Payroll] Export error", { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message || "Internal server error",
    });
  }
});

/**
 * POST /api/payroll/reconcile
 * Reconcile payroll with schedule
 */
router.post("/reconcile", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validated = ReconcilePayrollSchema.parse(req.body);
    const payrollService = getPayrollIntegrationService();

    const reconciliation = await payrollService.reconcilePayroll(
      validated.periodId,
      validated.orgId,
      validated.scheduleHours,
      validated.payrollHours
    );

    logger.info("[Payroll] Reconciliation completed", {
      orgId: validated.orgId,
      periodId: validated.periodId,
      variance: reconciliation.variance,
      status: reconciliation.status,
    });

    res.json({
      success: true,
      reconciliation,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }

    logger.error("[Payroll] Reconcile error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/payroll/report/:periodId
 * Get payroll report
 */
router.get("/report/:periodId", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { periodId } = req.params;
    const payrollService = getPayrollIntegrationService();

    const report = await payrollService.generatePayrollReport(periodId, orgId);

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    logger.error("[Payroll] Get report error", { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message || "Internal server error",
    });
  }
});

/**
 * GET /api/payroll/reconciliation/:periodId
 * Get payroll reconciliation
 */
router.get("/reconciliation/:periodId", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { periodId } = req.params;
    const payrollService = getPayrollIntegrationService();

    const reconciliation = payrollService.getReconciliation(periodId);

    if (!reconciliation) {
      return res.status(404).json({
        success: false,
        error: "Reconciliation not found",
      });
    }

    res.json({
      success: true,
      reconciliation,
    });
  } catch (error) {
    logger.error("[Payroll] Get reconciliation error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default router;
