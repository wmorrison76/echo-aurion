/**
 * Dashboard Financial Routes
 * REST endpoints for financial dashboard widgets
 * Implements role-based access control for sensitive data
 */

import { Router, Request, Response } from "express";
import { logger } from "../lib/logger";
import { jwtAuthMiddleware, validateOrgAccess } from "../middleware/auth-jwt";
import { getOrgContext, getUserId, getUserRole } from "../lib/org-resolver";
import { PnLCalculatorRealtime } from "../services/pnl-calculator-realtime";
import {
  FinancialRBACService,
  FinancialPermission,
  UserContext,
} from "../services/financial-rbac-service";

const router = Router();

/**
 * Create user context from request
 */
function getUserContext(req: any): UserContext {
  const orgContext = getOrgContext(req);
  return {
    id: getUserId(req) || "unknown",
    org_id: orgContext.orgId,
    role: getUserRole(req),
    outlet_ids: req.query.outlet_ids
      ? (req.query.outlet_ids as string).split(",")
      : [],
  };
}

/**
 * Get financial health (A-F grade + metrics)
 * GET /api/dashboard/financial/health?outlet_id=X&period=YYYY-MM
 */
router.get(
  "/health",
  jwtAuthMiddleware,
  validateOrgAccess,
  async (req: Request, res: Response) => {
    try {
      const user = getUserContext(req);
      const outletId = req.query.outlet_id as string;
      const period = (req.query.period as string) || getCurrentPeriod();

      // Check permission
      const canView = await FinancialRBACService.hasPermission(
        user,
        FinancialPermission.VIEW_SUMMARY,
        outletId,
      );

      if (!canView) {
        logger.warn("[DashboardFinancial] Health access denied", {
          userId: user.id,
          outlet_id: outletId,
        });
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "You do not have permission to view financial data",
        });
      }

      // Get P&L state
      const state = PnLCalculatorRealtime.getPnLState(outletId, period);

      if (!state.health_grade) {
        return res.status(200).json({
          grade: "N/A",
          score: 0,
          revenue: state.revenue,
          cogs_percentage:
            state.revenue > 0 ? (state.cogs / state.revenue) * 100 : 0,
          labor_percentage:
            state.revenue > 0 ? (state.labor_cost / state.revenue) * 100 : 0,
          net_margin:
            state.revenue > 0 ? (state.net_profit / state.revenue) * 100 : 0,
          trend: "stable",
          last_updated: state.last_updated,
          risks: [],
        });
      }

      // Return high-level metrics (summary access for all roles)
      const orgContext = getOrgContext(req);
      const response = {
        success: true,
        grade: state.health_grade.grade,
        score: state.health_grade.score,
        revenue: state.revenue,
        cogs_percentage: (state.cogs / state.revenue) * 100,
        labor_percentage: (state.labor_cost / state.revenue) * 100,
        net_margin: (state.net_profit / state.revenue) * 100,
        trend:
          state.health_grade.scoring_breakdown.trend_score > 0
            ? "improving"
            : "declining",
        last_updated: state.last_updated,
        risks: state.health_grade.risks.slice(0, 3), // Top 3 risks only for summary
        orgId: orgContext.orgId,
      };

      res.json(response);
    } catch (error) {
      logger.error("[DashboardFinancial] Health endpoint error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch financial health",
      });
    }
  },
);

/**
 * Get detailed P&L (full report with GL codes)
 * GET /api/dashboard/financial/pnl?outlet_id=X&period=YYYY-MM
 */
router.get(
  "/pnl",
  jwtAuthMiddleware,
  validateOrgAccess,
  async (req: Request, res: Response) => {
    try {
      const user = getUserContext(req);
      const outletId = req.query.outlet_id as string;
      const period = (req.query.period as string) || getCurrentPeriod();
      const includePayroll = req.query.include_payroll === "true";
      const sessionVerified = req.headers["x-payroll-verified"] === "true";

      // Check permission - requires detailed P&L access
      const canView = await FinancialRBACService.hasPermission(
        user,
        FinancialPermission.VIEW_DETAILED_PNL,
        outletId,
      );

      if (!canView) {
        logger.warn("[DashboardFinancial] Detailed P&L access denied", {
          userId: user.id,
          outlet_id: outletId,
        });
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "You do not have permission to view detailed P&L",
        });
      }

      // If payroll requested, check additional permission
      if (includePayroll) {
        const hasPayrollAccess = await FinancialRBACService.canAccessPayroll(
          user,
          sessionVerified,
          outletId,
        );

        if (!hasPayrollAccess) {
          logger.warn("[DashboardFinancial] Payroll access denied", {
            userId: user.id,
            outlet_id: outletId,
          });
          return res.status(403).json({
            error: "FORBIDDEN",
            message: "Payroll access requires additional verification",
            code: "PAYROLL_ACCESS_REQUIRED",
          });
        }
      }

      // Get P&L state
      const state = PnLCalculatorRealtime.getPnLState(outletId, period);

      // Build response
      const response: any = {
        outlet_id: state.outlet_id,
        period: state.period,
        revenue: state.revenue,
        cogs: state.cogs,
        cogs_percentage:
          state.revenue > 0 ? (state.cogs / state.revenue) * 100 : 0,
        labor_cost: state.labor_cost,
        labor_percentage:
          state.revenue > 0 ? (state.labor_cost / state.revenue) * 100 : 0,
        overhead_cost: state.overhead_cost,
        overhead_percentage:
          state.revenue > 0 ? (state.overhead_cost / state.revenue) * 100 : 0,
        net_profit: state.net_profit,
        net_margin:
          state.revenue > 0 ? (state.net_profit / state.revenue) * 100 : 0,
        health_grade: state.health_grade,
        last_updated: state.last_updated,
      };

      // Include payroll data only if authorized and requested
      if (includePayroll && sessionVerified) {
        const payrollTotal =
          (state.payroll_wages || 0) +
          (state.payroll_taxes || 0) +
          (state.payroll_benefits || 0);

        response.payroll_data = {
          payroll_run_id: state.last_payroll_run_id || null,
          wages: state.payroll_wages || 0,
          taxes: state.payroll_taxes || 0,
          benefits: state.payroll_benefits || 0,
          deductions: state.payroll_deductions || 0,
          employee_count: state.payroll_employee_count || null,
          total: payrollTotal,
          source: payrollTotal > 0 ? "payroll" : "scheduled",
          scheduled_labor_cost: state.scheduled_labor_cost,
        };
      }

      res.json(response);
    } catch (error) {
      logger.error("[DashboardFinancial] P&L endpoint error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch P&L data",
      });
    }
  },
);

/**
 * Get available outlets for user
 * GET /api/dashboard/financial/available-outlets
 */
router.get(
  "/available-outlets",
  jwtAuthMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = getUserContext(req);

      // Return user's accessible outlets
      const outlets = user.outlet_ids || [];

      res.json({
        outlets: outlets.map((id) => ({
          id,
          name: `Outlet ${id}`, // In production, fetch from DB
        })),
      });
    } catch (error) {
      logger.error("[DashboardFinancial] Available outlets error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch available outlets",
      });
    }
  },
);

/**
 * Get consolidated P&L for multiple outlets
 * GET /api/dashboard/financial/pnl-consolidated?outlets=id1,id2,id3&period=YYYY-MM
 */
router.get(
  "/pnl-consolidated",
  jwtAuthMiddleware,
  validateOrgAccess,
  async (req: Request, res: Response) => {
    try {
      const user = getUserContext(req);
      const outlets = ((req.query.outlets as string) || "").split(",");
      const period = (req.query.period as string) || getCurrentPeriod();

      // Check permission for consolidated access
      const canView = await FinancialRBACService.hasPermission(
        user,
        FinancialPermission.VIEW_CONSOLIDATED,
      );

      if (!canView) {
        logger.warn("[DashboardFinancial] Consolidated access denied", {
          userId: user.id,
        });
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "You do not have permission to view consolidated P&L",
        });
      }

      // Filter to accessible outlets
      const accessibleOutlets = FinancialRBACService.filterAccessibleOutlets(
        user,
        outlets,
      );

      if (accessibleOutlets.length === 0) {
        return res.status(400).json({
          error: "BAD_REQUEST",
          message: "No accessible outlets requested",
        });
      }

      // Aggregate P&L data
      let totalRevenue = 0;
      let totalCogs = 0;
      let totalLabor = 0;
      let totalOverhead = 0;
      let totalProfit = 0;

      for (const outletId of accessibleOutlets) {
        const state = PnLCalculatorRealtime.getPnLState(outletId, period);
        totalRevenue += state.revenue;
        totalCogs += state.cogs;
        totalLabor += state.labor_cost;
        totalOverhead += state.overhead_cost;
        totalProfit += state.net_profit;
      }

      res.json({
        outlets: accessibleOutlets,
        period,
        revenue: totalRevenue,
        cogs: totalCogs,
        cogs_percentage:
          totalRevenue > 0 ? (totalCogs / totalRevenue) * 100 : 0,
        labor_cost: totalLabor,
        labor_percentage:
          totalRevenue > 0 ? (totalLabor / totalRevenue) * 100 : 0,
        overhead_cost: totalOverhead,
        overhead_percentage:
          totalRevenue > 0 ? (totalOverhead / totalRevenue) * 100 : 0,
        net_profit: totalProfit,
        net_margin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      });
    } catch (error) {
      logger.error("[DashboardFinancial] Consolidated endpoint error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch consolidated P&L",
      });
    }
  },
);

/**
 * Helper: Get current period in YYYY-MM format
 */
function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export default router;
