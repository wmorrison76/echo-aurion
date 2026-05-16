/**
 * PHASE 1: ADVANCED KPI DASHBOARD - Week 7 Day 33
 * KPI Calculator
 * 
 * Calculates:
 * - Sales to Labor Ratio
 * - Labor %
 * - Staffing Efficiency
 * - Revenue per Labor Hour
 * - Covers per Labor Hour
 * - Overtime %
 * - No-show %
 * - Absenteeism %
 * 
 * Precision: DECIMAL(12, 5) - to .00005
 */

interface DailyMetrics {
  date: string;
  totalSales: number; // $ revenue
  laborCost: number; // $ labor cost
  laborHours: number; // Total hours worked
  scheduledStaff: number; // Number of scheduled shifts
  clockedInStaff: number; // Number who clocked in
  noShows: number; // Number who didn't show
  covers: number; // Number of customers
}

interface KPIResult {
  date: string;
  organizationId: string;
  locationId?: string;
  department?: string;
  kpis: {
    salesTotal: number;
    laborCost: number;
    laborPercent: number; // (labor_cost / sales_total) * 100
    staffingEfficiency: number; // actual_staff / scheduled_staff * 100
    revenuePerLaborHour: number;
    coversPerLaborHour: number;
    overtimePercent: number;
    noShowPercent: number;
    absenteeismPercent: number;
  };
  targets: {
    laborPercent: { min: number; max: number };
    staffingEfficiency: { target: number };
    revenuePerLaborHour: { target: number };
  };
  status: {
    laborPercent: 'on-target' | 'warning' | 'over-budget';
    staffingEfficiency: 'excellent' | 'good' | 'poor';
  };
  trends: {
    laborPercent7Day: number;
    laborPercent30Day: number;
    noShowTrend: number;
  };
}

/**
 * KPI Calculator
 * Computes business KPIs from operational data
 */
export class KPICalculator {
  /**
   * Calculate all KPIs for a day
   */
  static calculateDaily(metrics: DailyMetrics, organizationId: string, locationId?: string): KPIResult {
    // Precision: round to 5 decimal places (.00005)
    const precision = (val: number) => Math.round(val * 100000) / 100000;

    // Basic calculations
    const laborPercent = precision((metrics.laborCost / metrics.totalSales) * 100);
    const staffingEfficiency = precision(
      (metrics.clockedInStaff / metrics.scheduledStaff) * 100
    );
    const revenuePerLaborHour = precision(
      metrics.laborHours > 0 ? metrics.totalSales / metrics.laborHours : 0
    );
    const coversPerLaborHour = precision(
      metrics.laborHours > 0 ? metrics.covers / metrics.laborHours : 0
    );
    const noShowPercent = precision(
      (metrics.noShows / metrics.scheduledStaff) * 100
    );

    // Determine status
    const laborStatus = this.getLaborStatus(laborPercent);

    return {
      date: metrics.date,
      organizationId,
      locationId,
      kpis: {
        salesTotal: precision(metrics.totalSales),
        laborCost: precision(metrics.laborCost),
        laborPercent,
        staffingEfficiency,
        revenuePerLaborHour,
        coversPerLaborHour,
        overtimePercent: 0, // TODO: Calculate from time tracking
        noShowPercent,
        absenteeismPercent: noShowPercent, // Simplified
      },
      targets: {
        laborPercent: { min: 25, max: 30 },
        staffingEfficiency: { target: 95 },
        revenuePerLaborHour: { target: 45 },
      },
      status: {
        laborPercent: laborStatus,
        staffingEfficiency: this.getEfficiencyStatus(staffingEfficiency),
      },
      trends: {
        laborPercent7Day: 0, // TODO: Calculate from historical
        laborPercent30Day: 0,
        noShowTrend: 0,
      },
    };
  }

  /**
   * Calculate KPIs for a custom date range
   */
  static calculatePeriod(
    metricsList: DailyMetrics[],
    organizationId: string,
    locationId?: string
  ): {
    daily: KPIResult[];
    summary: KPIResult;
  } {
    const daily = metricsList.map((metrics) =>
      this.calculateDaily(metrics, organizationId, locationId)
    );

    // Calculate period summary (averages)
    const avgSales = metricsList.reduce((sum, m) => sum + m.totalSales, 0) / metricsList.length;
    const avgLaborCost = metricsList.reduce((sum, m) => sum + m.laborCost, 0) / metricsList.length;
    const avgLaborHours = metricsList.reduce((sum, m) => sum + m.laborHours, 0) / metricsList.length;
    const totalCovers = metricsList.reduce((sum, m) => sum + m.covers, 0);

    const summaryMetrics: DailyMetrics = {
      date: `${metricsList[0].date} to ${metricsList[metricsList.length - 1].date}`,
      totalSales: avgSales,
      laborCost: avgLaborCost,
      laborHours: avgLaborHours,
      scheduledStaff: metricsList.reduce((sum, m) => sum + m.scheduledStaff, 0),
      clockedInStaff: metricsList.reduce((sum, m) => sum + m.clockedInStaff, 0),
      noShows: metricsList.reduce((sum, m) => sum + m.noShows, 0),
      covers: totalCovers,
    };

    const summary = this.calculateDaily(summaryMetrics, organizationId, locationId);

    return { daily, summary };
  }

  /**
   * Get labor % status
   */
  private static getLaborStatus(
    laborPercent: number
  ): 'on-target' | 'warning' | 'over-budget' {
    if (laborPercent >= 25 && laborPercent <= 30) return 'on-target';
    if (laborPercent > 30 && laborPercent <= 35) return 'warning';
    return 'over-budget';
  }

  /**
   * Get staffing efficiency status
   */
  private static getEfficiencyStatus(efficiency: number): 'excellent' | 'good' | 'poor' {
    if (efficiency >= 95) return 'excellent';
    if (efficiency >= 85) return 'good';
    return 'poor';
  }

  /**
   * Compare to target and generate variance report
   */
  static generateVarianceReport(actual: KPIResult, target: Partial<KPIResult>) {
    const laborVariance = actual.kpis.laborPercent - (target.targets?.laborPercent?.max || 30);
    const efficiencyVariance = actual.kpis.staffingEfficiency - (target.targets?.staffingEfficiency?.target || 95);

    return {
      laborCostVariance: {
        value: laborVariance,
        percentageVariance: (laborVariance / (target.targets?.laborPercent?.max || 30)) * 100,
        status: laborVariance <= 0 ? 'favorable' : 'unfavorable',
      },
      staffingEfficiencyVariance: {
        value: efficiencyVariance,
        status: efficiencyVariance >= 0 ? 'favorable' : 'unfavorable',
      },
      recommendation: this.generateRecommendation(laborVariance, efficiencyVariance),
    };
  }

  /**
   * Generate actionable recommendation
   */
  private static generateRecommendation(laborVariance: number, efficiencyVariance: number): string {
    if (laborVariance > 5) {
      return 'Labor cost is over budget. Consider reducing shift hours or improving productivity.';
    }
    if (efficiencyVariance < -10) {
      return 'Staffing efficiency is low. Review scheduling or employee performance.';
    }
    return 'KPIs are within acceptable ranges.';
  }

  /**
   * Calculate trend comparison
   */
  static calculateTrendComparison(
    current: KPIResult[],
    previous: KPIResult[]
  ): {
    laborPercentChange: number;
    efficiencyChange: number;
    noShowChange: number;
    trend: 'improving' | 'declining' | 'stable';
  } {
    const avgCurrentLabor = current.reduce((sum, k) => sum + k.kpis.laborPercent, 0) / current.length;
    const avgPreviousLabor = previous.reduce((sum, k) => sum + k.kpis.laborPercent, 0) / previous.length;

    const laborChange = avgCurrentLabor - avgPreviousLabor;
    const efficiencyChange = 0; // TODO: Calculate
    const noShowChange = 0; // TODO: Calculate

    let trend: 'improving' | 'declining' | 'stable';
    if (laborChange < -2) {
      trend = 'improving';
    } else if (laborChange > 2) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    return {
      laborPercentChange: laborChange,
      efficiencyChange,
      noShowChange,
      trend,
    };
  }
}

export default KPICalculator;
