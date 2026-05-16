/**
 * Custom Report Builder
 * Allows users to create dynamic reports with custom metrics and scheduling
 */

import { logger } from "../lib/logger";

export interface ReportField {
  name: string;
  label: string;
  type: "amount" | "percentage" | "count" | "text";
  source: "gl" | "ap" | "revenue" | "labor" | "inventory";
  aggregation?: "sum" | "avg" | "min" | "max" | "count";
}

export interface ReportFilter {
  field: string;
  operator: "equals" | "gt" | "lt" | "contains" | "between";
  value: any;
}

export interface CustomReport {
  id: string;
  name: string;
  description: string;
  fields: ReportField[];
  filters: ReportFilter[];
  groupBy?: string;
  sortBy?: string;
  isScheduled: boolean;
  scheduleFrequency?: "daily" | "weekly" | "monthly";
  recipients?: string[];
  createdBy: string;
  createdAt: Date;
  lastRunAt?: Date;
}

export interface ReportExecution {
  reportId: string;
  executedAt: Date;
  rowCount: number;
  executionTimeMs: number;
  status: "success" | "failed" | "pending";
  dataUrl?: string;
}

export class CustomReportBuilder {
  private static reports = new Map<string, CustomReport>();
  private static executions = new Map<string, ReportExecution[]>();

  /**
   * Create a custom report
   */
  static async createReport(
    report: Omit<CustomReport, "id" | "createdAt">,
  ): Promise<CustomReport> {
    try {
      const reportId = `rpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newReport: CustomReport = {
        ...report,
        id: reportId,
        createdAt: new Date(),
      };

      this.reports.set(reportId, newReport);

      logger.info("[CustomReportBuilder] Report created", {
        reportId,
        reportName: report.name,
        fieldCount: report.fields.length,
        isScheduled: report.isScheduled,
      });

      return newReport;
    } catch (error) {
      logger.error("[CustomReportBuilder] Report creation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get report by ID
   */
  static async getReport(reportId: string): Promise<CustomReport | null> {
    return this.reports.get(reportId) || null;
  }

  /**
   * List all reports
   */
  static async listReports(createdBy?: string): Promise<CustomReport[]> {
    const all = Array.from(this.reports.values());
    return createdBy ? all.filter((r) => r.createdBy === createdBy) : all;
  }

  /**
   * Execute a report (query builder)
   */
  static async executeReport(
    reportId: string,
    entityId: string,
  ): Promise<ReportExecution> {
    const startTime = Date.now();

    try {
      const report = this.reports.get(reportId);
      if (!report) {
        throw new Error(`Report ${reportId} not found`);
      }

      logger.info("[CustomReportBuilder] Executing report", {
        reportId,
        reportName: report.name,
        entityId,
      });

      // In production: build and execute SQL query based on fields/filters
      // Mock: simulate report generation
      const rowCount = Math.floor(Math.random() * 1000) + 10;
      const executionTimeMs = Date.now() - startTime;

      const execution: ReportExecution = {
        reportId,
        executedAt: new Date(),
        rowCount,
        executionTimeMs,
        status: "success",
        dataUrl: `/api/reports/${reportId}/data`,
      };

      // Store execution history
      if (!this.executions.has(reportId)) {
        this.executions.set(reportId, []);
      }
      this.executions.get(reportId)?.push(execution);

      // Update last run time
      const report_ = this.reports.get(reportId);
      if (report_) {
        report_.lastRunAt = new Date();
      }

      logger.info("[CustomReportBuilder] Report executed", {
        reportId,
        rowCount,
        executionTimeMs,
      });

      return execution;
    } catch (error) {
      logger.error("[CustomReportBuilder] Execution failed", {
        reportId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        reportId,
        executedAt: new Date(),
        rowCount: 0,
        executionTimeMs: Date.now() - startTime,
        status: "failed",
      };
    }
  }

  /**
   * Delete a report
   */
  static async deleteReport(reportId: string): Promise<boolean> {
    const deleted = this.reports.delete(reportId);
    if (deleted) {
      this.executions.delete(reportId);
      logger.info("[CustomReportBuilder] Report deleted", { reportId });
    }
    return deleted;
  }

  /**
   * Update report
   */
  static async updateReport(
    reportId: string,
    updates: Partial<CustomReport>,
  ): Promise<CustomReport | null> {
    const report = this.reports.get(reportId);
    if (!report) return null;

    const updated = { ...report, ...updates };
    this.reports.set(reportId, updated);

    logger.info("[CustomReportBuilder] Report updated", { reportId });
    return updated;
  }

  /**
   * Schedule report delivery
   */
  static async scheduleReport(
    reportId: string,
    frequency: "daily" | "weekly" | "monthly",
    recipients: string[],
  ): Promise<boolean> {
    try {
      const report = this.reports.get(reportId);
      if (!report) return false;

      report.isScheduled = true;
      report.scheduleFrequency = frequency;
      report.recipients = recipients;

      logger.info("[CustomReportBuilder] Report scheduled", {
        reportId,
        frequency,
        recipientCount: recipients.length,
      });

      return true;
    } catch (error) {
      logger.error("[CustomReportBuilder] Schedule failed", {
        reportId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get report execution history
   */
  static async getExecutionHistory(
    reportId: string,
    limit: number = 50,
  ): Promise<ReportExecution[]> {
    const executions = this.executions.get(reportId) || [];
    return executions.slice(-limit).reverse();
  }

  /**
   * Get available report templates
   */
  static getAvailableTemplates(): CustomReport[] {
    return [
      {
        id: "tmpl-daily-revenue",
        name: "Daily Revenue Summary",
        description: "Daily room revenue, F&B, and other revenue by source",
        fields: [
          {
            name: "roomRevenue",
            label: "Room Revenue",
            type: "amount",
            source: "revenue",
          },
          {
            name: "fbRevenue",
            label: "Food & Beverage",
            type: "amount",
            source: "revenue",
          },
          {
            name: "otherRevenue",
            label: "Other Revenue",
            type: "amount",
            source: "revenue",
          },
          {
            name: "occupancy",
            label: "Occupancy %",
            type: "percentage",
            source: "revenue",
          },
        ],
        filters: [],
        groupBy: "date",
        isScheduled: false,
        createdBy: "system",
      },
      {
        id: "tmpl-monthly-pl",
        name: "Monthly P&L",
        description: "Full income statement with YoY comparison",
        fields: [
          {
            name: "revenue",
            label: "Total Revenue",
            type: "amount",
            source: "revenue",
          },
          {
            name: "cogs",
            label: "Cost of Sales",
            type: "amount",
            source: "gl",
          },
          {
            name: "laborCost",
            label: "Labor Cost",
            type: "amount",
            source: "labor",
          },
          {
            name: "operatingExpense",
            label: "Operating Expense",
            type: "amount",
            source: "gl",
          },
          {
            name: "netIncome",
            label: "Net Income",
            type: "amount",
            source: "gl",
          },
        ],
        filters: [],
        groupBy: "month",
        isScheduled: false,
        createdBy: "system",
      },
    ];
  }
}
