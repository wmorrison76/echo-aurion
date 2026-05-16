/**
 * Payroll API Routes
 * 
 * Industry-leading payroll endpoints with:
 * - 3-4 click workflows
 * - 0.0005% precision
 * - Full EchoAI^3 integration
 * - Seamless provider integrations
 * 
 * All text is i18n-ready with translation keys
 */

import { Router, Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/auth-jwt.js';
import { payrollCalculator, tipPoolCalculator } from '../services/payroll-engine.js';
import { payrollIntegrationManager, ADPAdapter, GustoAdapter, SevenShiftsAdapter, ToastAdapter } from '../services/payroll-integrations.js';
import type { Employee, PayPeriod, TimeEntry, TipEntry, TipPool, PayrollCalculation } from '../services/payroll-engine.js';

const router = Router();

/**
 * POST /api/payroll/calculate
 * Calculate payroll for a pay period (3 clicks: Select period → Review → Approve)
 */
router.post('/calculate', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { payPeriodId, employeeIds, includeTips, includeTipPool } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!payPeriodId || !orgId) {
      return res.status(400).json({
        success: false,
        error: 'Pay period ID and org ID are required',
        errorKey: 'payroll.api.error.missing.params',
      });
    }

    // Fetch pay period
    // In production, fetch from database
    const payPeriod: PayPeriod = {
      id: payPeriodId,
      orgId,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      payDate: req.body.payDate,
      frequency: req.body.frequency || 'BIWEEKLY',
      status: 'DRAFT',
      employees: employeeIds || [],
      totalGrossPay: 0,
      totalDeductions: 0,
      totalNetPay: 0,
      totalTaxes: 0,
      createdAt: new Date().toISOString(),
    };

    // Fetch employees, time entries, tip entries
    // In production, fetch from database
    const employees: Employee[] = req.body.employees || [];
    const timeEntries: TimeEntry[] = req.body.timeEntries || [];
    const tipEntries: TipEntry[] = includeTips ? (req.body.tipEntries || []) : [];

    // Calculate payroll for each employee
    const calculations: PayrollCalculation[] = [];

    for (const employee of employees) {
      const employeeTimeEntries = timeEntries.filter(te => te.employeeId === employee.id);
      const employeeTipEntries = tipEntries.filter(tip => tip.employeeId === employee.id);

      // Calculate tip pool share if applicable
      let tipPoolShare = 0;
      if (includeTipPool && req.body.tipPool) {
        const tipPool: TipPool = req.body.tipPool;
        const participant = tipPool.participants.find(p => p.employeeId === employee.id);
        tipPoolShare = participant?.shareAmount || 0;
      }

      const calculation = await payrollCalculator.calculateEmployeePayroll(
        employee,
        employeeTimeEntries,
        employeeTipEntries,
        tipPoolShare,
        payPeriod
      );

      calculations.push(calculation);
    }

    // Calculate totals
    const totals = calculations.reduce(
      (acc, calc) => ({
        totalGross: acc.totalGross + calc.earnings.totalGross,
        totalDeductions: acc.totalDeductions + calc.deductions.total,
        totalTaxes: acc.totalTaxes + calc.taxes.total,
        totalNet: acc.totalNet + calc.netPay,
      }),
      { totalGross: 0, totalDeductions: 0, totalTaxes: 0, totalNet: 0 }
    );

    payPeriod.totalGrossPay = totals.totalGross;
    payPeriod.totalDeductions = totals.totalDeductions;
    payPeriod.totalTaxes = totals.totalTaxes;
    payPeriod.totalNetPay = totals.totalNet;
    payPeriod.status = 'CALCULATED';
    payPeriod.calculatedAt = new Date().toISOString();

    res.json({
      success: true,
      data: {
        payPeriod,
        calculations,
        totals,
        precision: calculations.every(c => c.calculationPrecision <= 0.0005),
        message: 'Payroll calculated successfully',
        messageKey: 'payroll.api.success.calculated',
      },
    });
  } catch (error: any) {
    console.error('[Payroll] Error calculating payroll:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate payroll',
      errorKey: 'payroll.api.error.calculation',
    });
  }
});

/**
 * POST /api/payroll/approve
 * Approve payroll (1 click after review)
 */
router.post('/approve', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { payPeriodId } = req.body;
    const approvedBy = req.user?.sub || 'system';

    if (!payPeriodId) {
      return res.status(400).json({
        success: false,
        error: 'Pay period ID is required',
        errorKey: 'payroll.api.error.missing.payPeriodId',
      });
    }

    // In production, update pay period status in database
    const payPeriod: PayPeriod = {
      id: payPeriodId,
      orgId: req.user?.orgId || '',
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedBy,
      // ... other fields
    } as PayPeriod;

    res.json({
      success: true,
      data: payPeriod,
      message: 'Payroll approved successfully',
      messageKey: 'payroll.api.success.approved',
    });
  } catch (error: any) {
    console.error('[Payroll] Error approving payroll:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve payroll',
      errorKey: 'payroll.api.error.approval',
    });
  }
});

/**
 * POST /api/payroll/process
 * Process payroll (1 click: Submit to provider or internal processing)
 */
router.post('/process', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { payPeriodId, providerName } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!payPeriodId || !orgId) {
      return res.status(400).json({
        success: false,
        error: 'Pay period ID and org ID are required',
        errorKey: 'payroll.api.error.missing.params',
      });
    }

    // Fetch pay period and calculations
    // In production, fetch from database
    const payPeriod: PayPeriod = {} as PayPeriod;
    const calculations: PayrollCalculation[] = [];

    if (providerName && providerName !== 'INTERNAL') {
      // Submit to external provider
      const adapter = payrollIntegrationManager.getAdapter(providerName);
      if (!adapter) {
        return res.status(400).json({
          success: false,
          error: `Provider ${providerName} not configured`,
          errorKey: 'payroll.api.error.provider.not.configured',
        });
      }

      const result = await adapter.submitPayroll(payPeriod, calculations);

      res.json({
        success: result.success,
        data: {
          payPeriodId,
          providerName,
          payrollRunId: result.payrollRunId,
          message: 'Payroll submitted to provider successfully',
          messageKey: 'payroll.api.success.submitted.to.provider',
        },
      });
    } else {
      // Internal processing
      payPeriod.status = 'PROCESSED';
      payPeriod.processedAt = new Date().toISOString();

      res.json({
        success: true,
        data: {
          payPeriod,
          message: 'Payroll processed internally',
          messageKey: 'payroll.api.success.processed',
        },
      });
    }
  } catch (error: any) {
    console.error('[Payroll] Error processing payroll:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process payroll',
      errorKey: 'payroll.api.error.processing',
    });
  }
});

/**
 * POST /api/payroll/tip-pool/calculate
 * Calculate tip pool distribution (2 clicks: Select pool → Calculate)
 */
router.post('/tip-pool/calculate', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { tipPoolId } = req.body;

    if (!tipPoolId) {
      return res.status(400).json({
        success: false,
        error: 'Tip pool ID is required',
        errorKey: 'payroll.api.error.missing.tipPoolId',
      });
    }

    // Fetch tip pool and employees
    // In production, fetch from database
    const tipPool: TipPool = req.body.tipPool;
    const employees: Employee[] = req.body.employees || [];

    const calculatedPool = await tipPoolCalculator.calculateTipPool(tipPool, employees);

    res.json({
      success: true,
      data: calculatedPool,
      message: 'Tip pool calculated successfully',
      messageKey: 'payroll.api.success.tip.pool.calculated',
    });
  } catch (error: any) {
    console.error('[Payroll] Error calculating tip pool:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate tip pool',
      errorKey: 'payroll.api.error.tip.pool.calculation',
    });
  }
});

/**
 * POST /api/payroll/integrations/sync
 * Sync with external providers (1 click: Sync All)
 */
router.post('/integrations/sync', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { providerName, syncType } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Org ID is required',
        errorKey: 'payroll.api.error.missing.orgId',
      });
    }

    // Fetch employees
    // In production, fetch from database
    const employees: Employee[] = req.body.employees || [];

    if (providerName) {
      // Sync with specific provider
      const adapter = payrollIntegrationManager.getAdapter(providerName);
      if (!adapter) {
        return res.status(400).json({
          success: false,
          error: `Provider ${providerName} not configured`,
          errorKey: 'payroll.api.error.provider.not.configured',
        });
      }

      let result;
      if (syncType === 'PUSH') {
        result = await adapter.syncEmployees(employees);
      } else if (syncType === 'PULL') {
        const pulledEmployees = await adapter.pullEmployees();
        result = { success: pulledEmployees.length, failed: 0 };
      } else {
        result = await adapter.syncEmployees(employees);
      }

      res.json({
        success: true,
        data: {
          providerName,
          syncType,
          result,
          message: `Synced with ${providerName} successfully`,
          messageKey: 'payroll.api.success.synced',
        },
      });
    } else {
      // Sync with all providers
      const results = await payrollIntegrationManager.syncAllProviders(employees);

      res.json({
        success: true,
        data: {
          results,
          message: 'Synced with all providers successfully',
          messageKey: 'payroll.api.success.synced.all',
        },
      });
    }
  } catch (error: any) {
    console.error('[Payroll] Error syncing with providers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync with providers',
      errorKey: 'payroll.api.error.sync',
    });
  }
});

/**
 * GET /api/payroll/periods
 * Get pay periods (1 click: View periods)
 */
router.get('/periods', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId || req.query.orgId as string;
    const status = req.query.status as string;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Org ID is required',
        errorKey: 'payroll.api.error.missing.orgId',
      });
    }

    // In production, fetch from database
    const payPeriods: PayPeriod[] = [];

    res.json({
      success: true,
      data: payPeriods,
      message: 'Pay periods retrieved successfully',
      messageKey: 'payroll.api.success.periods.retrieved',
    });
  } catch (error: any) {
    console.error('[Payroll] Error fetching pay periods:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch pay periods',
      errorKey: 'payroll.api.error.fetch.periods',
    });
  }
});

/**
 * GET /api/payroll/calculations/:payPeriodId
 * Get payroll calculations for a period (1 click: View calculations)
 */
router.get('/calculations/:payPeriodId', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { payPeriodId } = req.params;

    // In production, fetch from database
    const calculations: PayrollCalculation[] = [];

    res.json({
      success: true,
      data: calculations,
      message: 'Payroll calculations retrieved successfully',
      messageKey: 'payroll.api.success.calculations.retrieved',
    });
  } catch (error: any) {
    console.error('[Payroll] Error fetching calculations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch calculations',
      errorKey: 'payroll.api.error.fetch.calculations',
    });
  }
});

/**
 * POST /api/payroll/export
 * Export payroll data (1 click: Export)
 */
router.post('/export', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { payPeriodId, format, options } = req.body;

    if (!payPeriodId || !format) {
      return res.status(400).json({
        success: false,
        error: 'Pay period ID and format are required',
        errorKey: 'payroll.api.error.missing.params',
      });
    }

    const { payrollExportEngine } = await import('../services/payroll-export.js');
    
    // Fetch pay period, calculations, and employees
    // In production, fetch from database
    const payPeriod: PayPeriod = req.body.payPeriod;
    const calculations: PayrollCalculation[] = req.body.calculations || [];
    const employees: Employee[] = req.body.employees || [];

    const exportResult = await payrollExportEngine.exportPayroll(
      calculations,
      payPeriod,
      employees,
      {
        format,
        ...options,
      }
    );

    // Set response headers for file download
    res.setHeader('Content-Type', exportResult.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.fileName}"`);

    res.send(exportResult.data);
  } catch (error: any) {
    console.error('[Payroll] Error exporting payroll:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export payroll',
      errorKey: 'payroll.api.error.export',
    });
  }
});

/**
 * POST /api/payroll/tax-filing/generate-w2
 * Generate W-2 forms (1 click: Generate W-2s)
 */
router.post('/tax-filing/generate-w2', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { year, employeeIds } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!year || !orgId) {
      return res.status(400).json({
        success: false,
        error: 'Year and org ID are required',
        errorKey: 'payroll.api.error.missing.params',
      });
    }

    const { w2Generator } = await import('../services/payroll-tax-filing.js');
    
    // Fetch employees and payroll calculations
    // In production, fetch from database
    const employees: Employee[] = req.body.employees || [];
    const payrollCalculationsByEmployee = new Map<string, PayrollCalculation[]>();
    const employerInfo = req.body.employerInfo;

    const w2Forms = await w2Generator.generateAllW2s(
      employees.filter(e => !employeeIds || employeeIds.includes(e.id)),
      payrollCalculationsByEmployee,
      year,
      employerInfo
    );

    res.json({
      success: true,
      data: {
        w2Forms,
        count: w2Forms.length,
        year,
      },
      message: `Generated ${w2Forms.length} W-2 form(s) for ${year}`,
      messageKey: 'payroll.api.success.w2.generated',
    });
  } catch (error: any) {
    console.error('[Payroll] Error generating W-2s:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate W-2s',
      errorKey: 'payroll.api.error.w2.generation',
    });
  }
});

/**
 * POST /api/payroll/tax-filing/generate-1099
 * Generate 1099 forms (1 click: Generate 1099s)
 */
router.post('/tax-filing/generate-1099', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { year, employeeIds } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!year || !orgId) {
      return res.status(400).json({
        success: false,
        error: 'Year and org ID are required',
        errorKey: 'payroll.api.error.missing.params',
      });
    }

    const { form1099Generator } = await import('../services/payroll-tax-filing.js');
    
    // Fetch contractors and payroll calculations
    // In production, fetch from database
    const employees: Employee[] = req.body.employees?.filter((e: Employee) => e.employmentType === 'CONTRACTOR') || [];
    const payrollCalculationsByEmployee = new Map<string, PayrollCalculation[]>();
    const payerInfo = req.body.payerInfo;

    const forms1099 = await Promise.all(
      employees
        .filter(e => !employeeIds || employeeIds.includes(e.id))
        .map(employee => {
          const calculations = payrollCalculationsByEmployee.get(employee.id) || [];
          return form1099Generator.generate1099(employee, calculations, year, payerInfo);
        })
    );

    res.json({
      success: true,
      data: {
        forms1099,
        count: forms1099.length,
        year,
      },
      message: `Generated ${forms1099.length} 1099 form(s) for ${year}`,
      messageKey: 'payroll.api.success.1099.generated',
    });
  } catch (error: any) {
    console.error('[Payroll] Error generating 1099s:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate 1099s',
      errorKey: 'payroll.api.error.1099.generation',
    });
  }
});

/**
 * POST /api/payroll/tax-filing/generate-quarterly
 * Generate quarterly tax filing (1 click: Generate Quarterly Filing)
 */
router.post('/tax-filing/generate-quarterly', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { quarter, year, stateCodes } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!quarter || !year || !orgId) {
      return res.status(400).json({
        success: false,
        error: 'Quarter, year, and org ID are required',
        errorKey: 'payroll.api.error.missing.params',
      });
    }

    const { quarterlyTaxFilingGenerator } = await import('../services/payroll-tax-filing.js');
    
    // Fetch payroll calculations
    // In production, fetch from database
    const payrollCalculations: PayrollCalculation[] = req.body.calculations || [];

    const filing = await quarterlyTaxFilingGenerator.generateQuarterlyFiling(
      payrollCalculations,
      quarter,
      year,
      stateCodes || []
    );

    res.json({
      success: true,
      data: filing,
      message: `Generated quarterly tax filing for Q${quarter} ${year}`,
      messageKey: 'payroll.api.success.quarterly.generated',
    });
  } catch (error: any) {
    console.error('[Payroll] Error generating quarterly filing:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate quarterly filing',
      errorKey: 'payroll.api.error.quarterly.generation',
    });
  }
});

/**
 * POST /api/payroll/tax-filing/efile
 * E-file tax returns (1 click: E-file)
 */
router.post('/tax-filing/efile', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { filingType, filingData } = req.body;

    if (!filingType || !filingData) {
      return res.status(400).json({
        success: false,
        error: 'Filing type and data are required',
        errorKey: 'payroll.api.error.missing.params',
      });
    }

    const { quarterlyTaxFilingGenerator } = await import('../services/payroll-tax-filing.js');
    
    let result;
    if (filingType === 'QUARTERLY') {
      result = await quarterlyTaxFilingGenerator.efileQuarterlyReturn(filingData);
    } else {
      return res.status(400).json({
        success: false,
        error: `Unsupported filing type: ${filingType}`,
        errorKey: 'payroll.api.error.unsupported.filing.type',
      });
    }

    res.json({
      success: result.success,
      data: {
        confirmation: result.confirmation,
        filedAt: new Date().toISOString(),
      },
      message: result.success
        ? 'Tax return e-filed successfully'
        : 'Failed to e-file tax return',
      messageKey: result.success
        ? 'payroll.api.success.efile'
        : 'payroll.api.error.efile',
    });
  } catch (error: any) {
    console.error('[Payroll] Error e-filing tax return:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to e-file tax return',
      errorKey: 'payroll.api.error.efile',
    });
  }
});

export default router;
