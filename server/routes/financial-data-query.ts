/**
 * Financial Data Query API
 * Flexible endpoint for querying EchoAurum financial metrics
 * Powers custom widgets and Echo AI^3 integration
 *
 * Supports:
 * - Multi-outlet aggregation
 * - Metric selection (revenue, COGS, labor, overhead, net income, etc.)
 * - Time period queries (daily, monthly, fiscal period)
 * - Drill-down levels (summary, departmental, cost-center, GL-account)
 * - Comparisons (budget, prior-year, prior-period)
 */

import { Router, Response } from "express";
import { jwtAuthMiddleware } from "../middleware/auth-jwt";
import { logger } from "../lib/logger";
import { AurumDatabaseService } from "../services/aurum-database-service";

// ============================================================================
// TYPES
// ============================================================================

export type MetricType =
  | "revenue"
  | "cogs"
  | "gross_profit"
  | "gross_margin_percent"
  | "labor_cost"
  | "labor_cost_percent"
  | "overhead_cost"
  | "operating_expense"
  | "operating_income"
  | "net_income"
  | "transaction_count"
  | "covers_served"
  | "average_check";

export type DrillDownLevel =
  | "summary"
  | "departmental"
  | "cost-center"
  | "gl-account";

export type TimePeriodType =
  | "daily"
  | "weekly"
  | "monthly"
  | "fiscal-period"
  | "custom";

export interface FinancialDataQuery {
  outlet_ids?: string[]; // If omitted, uses user's accessible outlets
  metrics: MetricType[];
  period: {
    type: TimePeriodType;
    start_date: string; // YYYY-MM-DD
    end_date: string; // YYYY-MM-DD
    fiscal_year?: number;
    fiscal_period?: number;
  };
  drill_down_level?: DrillDownLevel;
  include_comparisons?: {
    budget?: boolean;
    prior_year?: boolean;
    prior_period?: boolean;
  };
  group_by?: ("outlet" | "department" | "cost_center")[];
  filters?: {
    department_ids?: string[];
    cost_center_ids?: string[];
    gl_account_codes?: string[];
  };
}

export interface FinancialDataRow {
  outlet_id: string;
  outlet_name: string;
  period: string;
  department_id?: string;
  department_name?: string;
  cost_center_id?: string;
  cost_center_name?: string;
  gl_account_code?: string;
  gl_account_name?: string;
  metrics: Record<MetricType, number>;
  comparison?: {
    budget?: Record<MetricType, number>;
    prior_year?: Record<MetricType, number>;
    prior_period?: Record<MetricType, number>;
  };
  last_updated: string;
}

export interface FinancialDataQueryResponse {
  query: FinancialDataQuery;
  data: FinancialDataRow[];
  summary: {
    total_records: number;
    outlets_included: string[];
    period_label: string;
    generated_at: string;
  };
}

// ============================================================================
// API ROUTES
// ============================================================================

export const financialDataQueryRouter = Router();

financialDataQueryRouter.use(jwtAuthMiddleware);

/**
 * POST /api/financial-data-query
 * Execute a flexible financial data query
 *
 * Request body: FinancialDataQuery
 * Response: FinancialDataQueryResponse
 *
 * Examples:
 * 1. Simple revenue and COGS for an outlet
 *    { outlet_ids: ["outlet-1"], metrics: ["revenue", "cogs"], period: {...} }
 *
 * 2. Department-level labor cost analysis with budget comparison
 *    { outlet_ids: ["outlet-1"], metrics: ["labor_cost", "labor_cost_percent"],
 *      drill_down_level: "departmental", include_comparisons: { budget: true },
 *      group_by: ["department"] }
 *
 * 3. Multi-outlet consolidated P&L
 *    { outlet_ids: ["outlet-1", "outlet-2", "outlet-3"],
 *      metrics: ["revenue", "cogs", "gross_profit", "net_income"],
 *      period: {...}, group_by: ["outlet"] }
 */
financialDataQueryRouter.post(
  "/",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = (req as any).userId || "unknown-user";
      const orgId = (req as any).orgId || "default-org";
      const query: FinancialDataQuery = req.body;

      // Validate required fields
      if (!query.metrics || query.metrics.length === 0) {
        res
          .status(400)
          .json({ error: "At least one metric must be specified" });
        return;
      }

      if (!query.period || !query.period.start_date || !query.period.end_date) {
        res
          .status(400)
          .json({ error: "Period with start_date and end_date is required" });
        return;
      }

      // Get user's accessible outlets if not specified
      let outletIds = query.outlet_ids || [];
      if (outletIds.length === 0) {
        // TODO: Fetch from user outlet assignments
        outletIds = ["default-outlet"];
      }

      // Execute query
      const data = await executeFinancialDataQuery(outletIds, query, orgId);

      const periodLabel = formatPeriodLabel(query.period);

      const response: FinancialDataQueryResponse = {
        query,
        data,
        summary: {
          total_records: data.length,
          outlets_included: outletIds,
          period_label: periodLabel,
          generated_at: new Date().toISOString(),
        },
      };

      res.json(response);
    } catch (error) {
      logger.error("[FinancialDataQuery] Query failed", {
        error: error instanceof Error ? error.message : String(error),
        userId: (req as any).userId,
      });
      res.status(500).json({ error: "Query execution failed" });
    }
  },
);

/**
 * GET /api/financial-data-query/available-metrics
 * Returns the list of available metrics that can be queried
 */
financialDataQueryRouter.get(
  "/available-metrics",
  (req: AuthenticatedRequest, res: Response) => {
    const metrics: MetricType[] = [
      "revenue",
      "cogs",
      "gross_profit",
      "gross_margin_percent",
      "labor_cost",
      "labor_cost_percent",
      "overhead_cost",
      "operating_expense",
      "operating_income",
      "net_income",
      "transaction_count",
      "covers_served",
      "average_check",
    ];

    res.json({
      metrics: metrics.map((m) => ({
        id: m,
        label: formatMetricLabel(m),
        type: getMetricType(m),
        category: getMetricCategory(m),
        description: getMetricDescription(m),
      })),
    });
  },
);

/**
 * GET /api/financial-data-query/available-outlets
 * Returns outlets accessible by the user
 */
financialDataQueryRouter.get(
  "/available-outlets",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // TODO: Fetch from database based on user permissions
      const outlets = [
        {
          id: "default-outlet",
          name: "Default Outlet",
          type: "restaurant",
        },
      ];

      res.json({ outlets });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch outlets" });
    }
  },
);

/**
 * GET /api/financial-data-query/available-periods
 * Returns available fiscal/calendar periods
 */
financialDataQueryRouter.get(
  "/available-periods",
  (req: AuthenticatedRequest, res: Response) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const periods = [];

    // Current and last 12 months
    for (let i = 0; i < 13; i++) {
      let month = currentMonth - i;
      let year = currentYear;

      if (month <= 0) {
        month += 12;
        year -= 1;
      }

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      periods.push({
        type: "monthly",
        fiscal_year: year,
        fiscal_period: month,
        label: startDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
      });
    }

    res.json({ periods });
  },
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Execute the financial data query against the database
 */
async function executeFinancialDataQuery(
  outletIds: string[],
  query: FinancialDataQuery,
  orgId: string,
): Promise<FinancialDataRow[]> {
  const results: FinancialDataRow[] = [];

  // For now, return mock data
  // In production, this would query AurumDatabaseService or the GL
  // based on the specified metrics and period

  for (const outletId of outletIds) {
    const row: FinancialDataRow = {
      outlet_id: outletId,
      outlet_name: `Outlet: ${outletId}`,
      period: `${query.period.start_date} to ${query.period.end_date}`,
      metrics: {},
      last_updated: new Date().toISOString(),
    };

    const revenueMock = query.metrics.includes("revenue")
      ? generateMockMetricValue("revenue")
      : 0;

    const needsLabor =
      query.metrics.includes("labor_cost") || query.metrics.includes("labor_cost_percent");
    const laborCost = needsLabor
      ? await AurumDatabaseService.sumPayrollLaborCost({
          org_id: orgId,
          outlet_id: outletId,
          start_date: query.period.start_date,
          end_date: query.period.end_date,
        })
      : 0;

    for (const metric of query.metrics) {
      if (metric === "revenue") {
        row.metrics[metric] = revenueMock;
        continue;
      }

      if (metric === "labor_cost") {
        row.metrics[metric] = laborCost;
        continue;
      }

      if (metric === "labor_cost_percent") {
        const revenue = row.metrics.revenue ?? revenueMock;
        const percent = revenue > 0 ? (laborCost / revenue) * 100 : 0;
        row.metrics[metric] = Math.round(percent * 100) / 100;
        continue;
      }

      row.metrics[metric] = generateMockMetricValue(metric);
    }

    // Add comparisons if requested
    if (query.include_comparisons) {
      row.comparison = {};

      if (query.include_comparisons.budget) {
        row.comparison.budget = {};
        for (const metric of query.metrics) {
          if (metric === "labor_cost") {
            row.comparison.budget[metric] = laborCost * 0.95;
            continue;
          }
          if (metric === "labor_cost_percent") {
            const revenue = row.metrics.revenue ?? 0;
            row.comparison.budget[metric] = revenue > 0 ? ((laborCost * 0.95) / revenue) * 100 : 0;
            continue;
          }
          row.comparison.budget[metric] = generateMockMetricValue(metric) * 0.95;
        }
      }

      if (query.include_comparisons.prior_year) {
        row.comparison.prior_year = {};
        for (const metric of query.metrics) {
          if (metric === "labor_cost") {
            row.comparison.prior_year[metric] = laborCost * 0.92;
            continue;
          }
          if (metric === "labor_cost_percent") {
            const revenue = row.metrics.revenue ?? 0;
            row.comparison.prior_year[metric] = revenue > 0 ? ((laborCost * 0.92) / revenue) * 100 : 0;
            continue;
          }
          row.comparison.prior_year[metric] = generateMockMetricValue(metric) * 0.92;
        }
      }
    }

    results.push(row);
  }

  return results;
}

/**
 * Generate mock metric value for demonstration
 */
function generateMockMetricValue(metric: MetricType): number {
  const baseValues: Record<MetricType, number> = {
    revenue: 45000,
    cogs: 13500,
    gross_profit: 31500,
    gross_margin_percent: 70,
    labor_cost: 9000,
    labor_cost_percent: 20,
    overhead_cost: 6000,
    operating_expense: 15000,
    operating_income: 16500,
    net_income: 14000,
    transaction_count: 850,
    covers_served: 340,
    average_check: 132.35,
  };

  const base = baseValues[metric] || 0;
  const variance = (Math.random() - 0.5) * base * 0.1; // ±5% variance
  return Math.round((base + variance) * 100) / 100;
}

/**
 * Format metric label for UI
 */
function formatMetricLabel(metric: MetricType): string {
  const labels: Record<MetricType, string> = {
    revenue: "Revenue",
    cogs: "Cost of Goods Sold",
    gross_profit: "Gross Profit",
    gross_margin_percent: "Gross Margin %",
    labor_cost: "Labor Cost",
    labor_cost_percent: "Labor Cost %",
    overhead_cost: "Overhead Cost",
    operating_expense: "Operating Expense",
    operating_income: "Operating Income",
    net_income: "Net Income",
    transaction_count: "Transaction Count",
    covers_served: "Covers Served",
    average_check: "Average Check",
  };

  return labels[metric];
}

/**
 * Get metric type (currency, percentage, count, etc.)
 */
function getMetricType(metric: MetricType): string {
  const percentMetrics = ["gross_margin_percent", "labor_cost_percent"];
  const countMetrics = ["transaction_count", "covers_served"];

  if (percentMetrics.includes(metric)) return "percentage";
  if (countMetrics.includes(metric)) return "count";
  return "currency";
}

/**
 * Get metric category for grouping
 */
function getMetricCategory(metric: MetricType): string {
  const categories: Record<MetricType, string> = {
    revenue: "P&L",
    cogs: "P&L",
    gross_profit: "P&L",
    gross_margin_percent: "P&L",
    labor_cost: "Costs",
    labor_cost_percent: "Costs",
    overhead_cost: "Costs",
    operating_expense: "Costs",
    operating_income: "P&L",
    net_income: "P&L",
    transaction_count: "Operations",
    covers_served: "Operations",
    average_check: "Operations",
  };

  return categories[metric];
}

/**
 * Get metric description
 */
function getMetricDescription(metric: MetricType): string {
  const descriptions: Record<MetricType, string> = {
    revenue: "Total revenue for the period",
    cogs: "Cost of goods sold",
    gross_profit: "Revenue minus COGS",
    gross_margin_percent: "Gross profit as percentage of revenue",
    labor_cost: "Total labor/payroll costs",
    labor_cost_percent: "Labor cost as percentage of revenue",
    overhead_cost: "Overhead and occupancy costs",
    operating_expense: "Total operating expenses",
    operating_income: "Gross profit minus operating expenses",
    net_income: "Final net income",
    transaction_count: "Total financial transactions",
    covers_served: "Number of covers served",
    average_check: "Average revenue per cover",
  };

  return descriptions[metric];
}

/**
 * Format period label
 */
function formatPeriodLabel(period: FinancialDataQuery["period"]): string {
  if (period.type === "monthly" && period.fiscal_period) {
    const date = new Date(
      period.fiscal_year || new Date().getFullYear(),
      (period.fiscal_period || 1) - 1,
      1,
    );
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  return `${period.start_date} to ${period.end_date}`;
}

export default financialDataQueryRouter;
