/**
 * Payroll Integration Service
 * ----------------------------
 * Integrates with payroll providers (Gusto, ADP, 7shifts)
 * Features: Hours export, tips export, reconciliation, reporting
 */

import { logger } from "../lib/logger";
import axios from "axios";

export interface PayrollProvider {
  id: string;
  name: string;
  type: "gusto" | "adp" | "7shifts" | "custom";
  apiKey?: string;
  apiSecret?: string;
  webhookUrl?: string;
  enabled: boolean;
}

export interface PayrollPeriod {
  id: string;
  orgId: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  status: "draft" | "processing" | "completed" | "failed";
  processedAt?: string; // ISO datetime
  processedBy?: string; // User ID
}

export interface PayrollData {
  employeeId: string;
  employeeName: string;
  regularHours: number;
  overtimeHours: number;
  regularRate: number;
  overtimeRate: number;
  regularPay: number;
  overtimePay: number;
  tips: number;
  totalPay: number;
  deductions?: Record<string, number>;
  netPay: number;
}

export interface PayrollExport {
  periodId: string;
  orgId: string;
  providerId: string;
  data: PayrollData[];
  exportedAt: string; // ISO datetime
  exportedBy: string; // User ID
  status: "success" | "failed";
  error?: string;
}

export interface PayrollReconciliation {
  periodId: string;
  orgId: string;
  scheduleHours: number; // Total hours from schedule
  payrollHours: number; // Total hours from payroll
  variance: number; // Difference
  variancePercent: number; // Percentage difference
  status: "matched" | "variance" | "error";
  details: {
    employeeId: string;
    scheduleHours: number;
    payrollHours: number;
    variance: number;
  }[];
  reconciledAt: string; // ISO datetime
}

/**
 * Payroll Integration Service
 * Handles integration with payroll providers
 */
export class PayrollIntegrationService {
  private providers: Map<string, PayrollProvider> = new Map();
  private exports: Map<string, PayrollExport> = new Map();
  private reconciliations: Map<string, PayrollReconciliation> = new Map();

  constructor() {
    this.initializeProviders();
  }

  /**
   * Register payroll provider
   */
  registerProvider(provider: PayrollProvider): void {
    this.providers.set(provider.id, provider);
    logger.info("[Payroll] Provider registered", {
      providerId: provider.id,
      name: provider.name,
      type: provider.type,
    });
  }

  /**
   * Export hours to payroll provider
   */
  async exportHours(
    periodId: string,
    orgId: string,
    providerId: string,
    data: PayrollData[],
    exportedBy: string
  ): Promise<PayrollExport> {
    const provider = this.providers.get(providerId);

    if (!provider) {
      throw new Error(`Payroll provider not found: ${providerId}`);
    }

    if (!provider.enabled) {
      throw new Error(`Payroll provider not enabled: ${providerId}`);
    }

    try {
      // Export to provider based on type
      let exportResult: any;

      switch (provider.type) {
        case "gusto":
          exportResult = await this.exportToGusto(provider, data);
          break;

        case "adp":
          exportResult = await this.exportToADP(provider, data);
          break;

        case "7shifts":
          exportResult = await this.exportTo7Shifts(provider, data);
          break;

        default:
          throw new Error(`Unsupported provider type: ${provider.type}`);
      }

      const exportRecord: PayrollExport = {
        periodId,
        orgId,
        providerId,
        data,
        exportedAt: new Date().toISOString(),
        exportedBy,
        status: "success",
      };

      this.exports.set(periodId, exportRecord);

      logger.info("[Payroll] Hours exported", {
        periodId,
        providerId,
        employeeCount: data.length,
        totalHours: data.reduce((sum, d) => sum + d.regularHours + d.overtimeHours, 0),
      });

      return exportRecord;
    } catch (error) {
      const exportRecord: PayrollExport = {
        periodId,
        orgId,
        providerId,
        data,
        exportedAt: new Date().toISOString(),
        exportedBy,
        status: "failed",
        error: (error as Error).message,
      };

      this.exports.set(periodId, exportRecord);

      logger.error("[Payroll] Export failed", {
        periodId,
        providerId,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Export to Gusto
   */
  private async exportToGusto(provider: PayrollProvider, data: PayrollData[]): Promise<any> {
    // Mock implementation - in production, use Gusto API
    // const gustoClient = new GustoClient(provider.apiKey!, provider.apiSecret!);
    // return await gustoClient.createPayrollPeriod(data);

    logger.info("[Payroll] Exporting to Gusto", {
      employeeCount: data.length,
    });

    // Mock response
    return {
      success: true,
      payrollPeriodId: `gusto_${Date.now()}`,
      message: "Payroll data exported to Gusto successfully",
    };
  }

  /**
   * Export to ADP
   */
  private async exportToADP(provider: PayrollProvider, data: PayrollData[]): Promise<any> {
    // Mock implementation - in production, use ADP API
    logger.info("[Payroll] Exporting to ADP", {
      employeeCount: data.length,
    });

    return {
      success: true,
      payrollPeriodId: `adp_${Date.now()}`,
      message: "Payroll data exported to ADP successfully",
    };
  }

  /**
   * Export to 7shifts
   */
  private async exportTo7Shifts(provider: PayrollProvider, data: PayrollData[]): Promise<any> {
    // Mock implementation - in production, use 7shifts API
    logger.info("[Payroll] Exporting to 7shifts", {
      employeeCount: data.length,
    });

    return {
      success: true,
      payrollPeriodId: `7shifts_${Date.now()}`,
      message: "Payroll data exported to 7shifts successfully",
    };
  }

  /**
   * Reconcile payroll with schedule
   */
  async reconcilePayroll(
    periodId: string,
    orgId: string,
    scheduleHours: Record<string, number>, // employeeId -> hours
    payrollHours: Record<string, number> // employeeId -> hours
  ): Promise<PayrollReconciliation> {
    const details: PayrollReconciliation["details"] = [];
    let totalScheduleHours = 0;
    let totalPayrollHours = 0;

    // Reconcile each employee
    const allEmployeeIds = new Set([
      ...Object.keys(scheduleHours),
      ...Object.keys(payrollHours),
    ]);

    for (const employeeId of allEmployeeIds) {
      const schedule = scheduleHours[employeeId] || 0;
      const payroll = payrollHours[employeeId] || 0;
      const variance = payroll - schedule;

      details.push({
        employeeId,
        scheduleHours: schedule,
        payrollHours: payroll,
        variance,
      });

      totalScheduleHours += schedule;
      totalPayrollHours += payroll;
    }

    const variance = totalPayrollHours - totalScheduleHours;
    const variancePercent = totalScheduleHours > 0 ? (variance / totalScheduleHours) * 100 : 0;

    // Determine status
    let status: PayrollReconciliation["status"] = "matched";
    if (Math.abs(variancePercent) > 5) {
      status = "error";
    } else if (Math.abs(variancePercent) > 1) {
      status = "variance";
    }

    const reconciliation: PayrollReconciliation = {
      periodId,
      orgId,
      scheduleHours: totalScheduleHours,
      payrollHours: totalPayrollHours,
      variance,
      variancePercent,
      status,
      details,
      reconciledAt: new Date().toISOString(),
    };

    this.reconciliations.set(periodId, reconciliation);

    logger.info("[Payroll] Reconciliation completed", {
      periodId,
      orgId,
      scheduleHours: totalScheduleHours,
      payrollHours: totalPayrollHours,
      variance,
      variancePercent,
      status,
    });

    return reconciliation;
  }

  /**
   * Get payroll export
   */
  getExport(periodId: string): PayrollExport | undefined {
    return this.exports.get(periodId);
  }

  /**
   * Get reconciliation
   */
  getReconciliation(periodId: string): PayrollReconciliation | undefined {
    return this.reconciliations.get(periodId);
  }

  /**
   * Generate payroll report
   */
  async generatePayrollReport(
    periodId: string,
    orgId: string
  ): Promise<{
    period: PayrollPeriod;
    summary: {
      totalEmployees: number;
      totalHours: number;
      totalPay: number;
      totalTips: number;
      totalNetPay: number;
    };
    data: PayrollData[];
    reconciliation?: PayrollReconciliation;
  }> {
    const exportRecord = this.exports.get(periodId);

    if (!exportRecord) {
      throw new Error(`Payroll export not found: ${periodId}`);
    }

    const reconciliation = this.reconciliations.get(periodId);

    const summary = {
      totalEmployees: exportRecord.data.length,
      totalHours: exportRecord.data.reduce(
        (sum, d) => sum + d.regularHours + d.overtimeHours,
        0
      ),
      totalPay: exportRecord.data.reduce((sum, d) => sum + d.totalPay, 0),
      totalTips: exportRecord.data.reduce((sum, d) => sum + d.tips, 0),
      totalNetPay: exportRecord.data.reduce((sum, d) => sum + d.netPay, 0),
    };

    const period: PayrollPeriod = {
      id: periodId,
      orgId,
      startDate: "", // Would come from period data
      endDate: "",
      status: "completed",
      processedAt: exportRecord.exportedAt,
      processedBy: exportRecord.exportedBy,
    };

    return {
      period,
      summary,
      data: exportRecord.data,
      reconciliation,
    };
  }

  /**
   * Initialize default providers
   */
  private initializeProviders(): void {
    // Gusto (recommended)
    this.registerProvider({
      id: "gusto_default",
      name: "Gusto",
      type: "gusto",
      enabled: false, // Enable when API keys are configured
    });

    // ADP
    this.registerProvider({
      id: "adp_default",
      name: "ADP",
      type: "adp",
      enabled: false,
    });

    // 7shifts
    this.registerProvider({
      id: "7shifts_default",
      name: "7shifts",
      type: "7shifts",
      enabled: false,
    });
  }
}

// Singleton instance
let payrollIntegrationInstance: PayrollIntegrationService | null = null;

export function getPayrollIntegrationService(): PayrollIntegrationService {
  if (!payrollIntegrationInstance) {
    payrollIntegrationInstance = new PayrollIntegrationService();
  }
  return payrollIntegrationInstance;
}

export default PayrollIntegrationService;
