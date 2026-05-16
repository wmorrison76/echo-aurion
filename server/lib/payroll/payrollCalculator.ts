/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 4
 * Payroll Calculator
 * 
 * Calculates:
 * - Gross pay
 * - Overtime (1.5x over 40 hrs/week)
 * - Deductions (taxes, benefits)
 * - Net pay
 * - Compliance checks
 */

interface TimeEntry {
  employeeId: string;
  date: string;
  hoursWorked: number;
  hourlyRate: number;
  tips?: number;
  notes?: string;
}

interface PayrollCalculation {
  employeeId: string;
  week: string;
  hoursWorked: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  tips: number;
  grossPay: number;
  federalTax: number;
  socialSecurityTax: number;
  medicareTax: number;
  stateIncomeTax: number;
  totalDeductions: number;
  netPay: number;
  breakdown: {
    regular: number;
    overtime: number;
    tips: number;
    deductions: number;
  };
}

/**
 * Payroll Calculator
 * Computes pay with taxes and compliance
 */
export class PayrollCalculator {
  private socialSecurityRate = 0.062; // 6.2% SS
  private medicareRate = 0.0145; // 1.45% Medicare
  private stateIncomeTaxRate = 0.05; // Varies by state, using 5% average
  private overtimeMultiplier = 1.5;
  private overtimeThreshold = 40; // Hours per week

  /**
   * Calculate payroll for employee for a week
   */
  calculate(entries: TimeEntry[]): PayrollCalculation {
    if (!entries || entries.length === 0) {
      throw new Error('No time entries provided');
    }

    // Aggregate hours for the week
    const totalHours = entries.reduce((sum, e) => sum + e.hoursWorked, 0);
    const totalTips = entries.reduce((sum, e) => sum + (e.tips || 0), 0);

    // Get hourly rate (use first entry's rate, assume same for all)
    const hourlyRate = entries[0].hourlyRate;

    // Calculate regular and overtime hours
    const regularHours = Math.min(totalHours, this.overtimeThreshold);
    const overtimeHours = Math.max(0, totalHours - this.overtimeThreshold);

    // Calculate pay
    const regularPay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * hourlyRate * this.overtimeMultiplier;
    const grossPay = regularPay + overtimePay + totalTips;

    // Calculate deductions
    const federalTax = this.calculateFederalTax(grossPay);
    const socialSecurityTax = Math.min(regularPay + overtimePay, 168600 * (1 / 52)) * this.socialSecurityRate; // SS has annual cap
    const medicareTax = (regularPay + overtimePay) * this.medicareRate;
    const stateIncomeTax = grossPay * this.stateIncomeTaxRate;

    const totalDeductions = federalTax + socialSecurityTax + medicareTax + stateIncomeTax;
    const netPay = grossPay - totalDeductions;

    // Get week string (Monday of week)
    const weekDate = this.getWeekStart(entries[0].date);

    return {
      employeeId: entries[0].employeeId,
      week: weekDate,
      hoursWorked: totalHours,
      overtimeHours,
      regularPay: Math.round(regularPay * 100) / 100,
      overtimePay: Math.round(overtimePay * 100) / 100,
      tips: totalTips,
      grossPay: Math.round(grossPay * 100) / 100,
      federalTax: Math.round(federalTax * 100) / 100,
      socialSecurityTax: Math.round(socialSecurityTax * 100) / 100,
      medicareTax: Math.round(medicareTax * 100) / 100,
      stateIncomeTax: Math.round(stateIncomeTax * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netPay: Math.round(netPay * 100) / 100,
      breakdown: {
        regular: regularHours,
        overtime: overtimeHours,
        tips: totalTips,
        deductions: totalDeductions,
      },
    };
  }

  /**
   * Calculate federal income tax (simplified)
   */
  private calculateFederalTax(grossPay: number): number {
    // Simplified 2024 tax calculation (rough approximation)
    // Assuming single filer, no dependents
    const weeklyGrossAfterStandardDeduction = Math.max(0, grossPay - 92.31); // Weekly standard deduction equivalent

    if (weeklyGrossAfterStandardDeduction <= 0) return 0;
    if (weeklyGrossAfterStandardDeduction <= 177) return weeklyGrossAfterStandardDeduction * 0.10;
    if (weeklyGrossAfterStandardDeduction <= 819) return 17.70 + (weeklyGrossAfterStandardDeduction - 177) * 0.12;

    return 17.70 + 77.04 + (weeklyGrossAfterStandardDeduction - 819) * 0.22;
  }

  /**
   * Get Monday of the week for a given date
   */
  private getWeekStart(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  /**
   * Validate payroll for compliance
   */
  validateCompliance(calculation: PayrollCalculation): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check for minimum wage (assuming US federal minimum: $7.25/hr)
    const effHourlyRate = calculation.grossPay / calculation.hoursWorked;
    if (effHourlyRate < 7.25) {
      issues.push('Hourly rate below federal minimum wage');
    }

    // Check for excessive overtime
    if (calculation.overtimeHours > 50) {
      issues.push('Unusual overtime hours (>50 hrs/week) - verify accuracy');
    }

    // Check for missing deductions
    if (calculation.totalDeductions === 0) {
      issues.push('No tax deductions calculated - verify tax withholding status');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Generate payroll summary for batch processing
   */
  generateBatchSummary(calculations: PayrollCalculation[]): {
    totalGrossPay: number;
    totalNetPay: number;
    totalDeductions: number;
    employeeCount: number;
    averageHoursPerEmployee: number;
    totalOvertimeHours: number;
  } {
    return {
      totalGrossPay: Math.round(calculations.reduce((sum, c) => sum + c.grossPay, 0) * 100) / 100,
      totalNetPay: Math.round(calculations.reduce((sum, c) => sum + c.netPay, 0) * 100) / 100,
      totalDeductions: Math.round(calculations.reduce((sum, c) => sum + c.totalDeductions, 0) * 100) / 100,
      employeeCount: calculations.length,
      averageHoursPerEmployee: calculations.reduce((sum, c) => sum + c.hoursWorked, 0) / calculations.length,
      totalOvertimeHours: calculations.reduce((sum, c) => sum + c.overtimeHours, 0),
    };
  }
}

export default PayrollCalculator;
