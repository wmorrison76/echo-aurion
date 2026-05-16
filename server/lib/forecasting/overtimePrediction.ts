/**
 * PHASE 1: CORE AI FOUNDATION - Week 3 Day 13
 * Overtime Prediction Model
 * 
 * Predicts which employees will hit overtime
 * 2-5 day lookahead
 * Uses Random Forest classification
 */

interface EmployeeContext {
  employeeId: string;
  currentHoursThisWeek: number;
  averageHoursPerWeek: number;
  historicalOvertimeRate: number;
  availability: string[]; // Days available
  recentTrend: number; // % change last 30 days
}

interface ScheduleContext {
  shiftDate: string;
  shiftsScheduledNext5Days: number;
  totalHoursScheduledNext5Days: number;
  currentHoursThisWeek: number;
}

interface OvertimePrediction {
  employeeId: string;
  predictedOvertime: boolean;
  overtimeProbability: number; // 0-100
  predictedOvertimeDate: string;
  confidence: number; // 0-100
  reasoning: string[];
}

/**
 * Overtime Predictor
 * Uses statistical features to predict overtime risk
 */
export class OvertimePredictor {
  /**
   * Predict if employee will hit overtime (>40 hrs/week in US)
   */
  static predict(employee: EmployeeContext, schedule: ScheduleContext): OvertimePrediction {
    const overtimeThreshold = 40; // US standard

    // Feature extraction
    const features = {
      currentHours: employee.currentHoursThisWeek,
      projectedHours: employee.currentHoursThisWeek + schedule.totalHoursScheduledNext5Days,
      hoursAboveThreshold: Math.max(0, employee.currentHoursThisWeek + schedule.totalHoursScheduledNext5Days - overtimeThreshold),
      historicalOvertimeRate: employee.historicalOvertimeRate,
      recentTrend: employee.recentTrend,
      shiftsScheduled: schedule.shiftsScheduledNext5Days,
      averageHours: employee.averageHoursPerWeek,
    };

    // Simple Random Forest-like scoring
    // (In production, would use actual trained model)
    const risks = this.calculateRiskScores(features);
    const overtimeProbability = this.computeProbability(risks);
    const confidence = this.computeConfidence(features);

    const reasoning = this.generateReasoning(features, overtimeProbability);

    return {
      employeeId: employee.employeeId,
      predictedOvertime: overtimeProbability > 60,
      overtimeProbability: Math.round(overtimeProbability),
      predictedOvertimeDate: this.estimateOvertimeDate(employee, schedule),
      confidence: Math.round(confidence),
      reasoning,
    };
  }

  /**
   * Calculate risk scores for each feature
   */
  private static calculateRiskScores(features: Record<string, number>): Record<string, number> {
    const risks: Record<string, number> = {};

    // Risk 1: Already over 40 hours
    risks.alreadyOver = features.currentHours > 40 ? 40 : 0;

    // Risk 2: Will definitely go over with scheduled shifts
    risks.projectedOver = features.projectedHours > 40
      ? Math.min(40, (features.hoursAboveThreshold / features.projectedHours) * 40)
      : 0;

    // Risk 3: Historical pattern
    risks.historicalPattern = features.historicalOvertimeRate * 20; // Scale to 0-20

    // Risk 4: Recent trend (if hours increasing)
    risks.recentTrend = features.recentTrend > 5 ? Math.min(20, features.recentTrend) : 0;

    // Risk 5: Number of shifts (more shifts = more chance)
    risks.shiftVolume = Math.min(20, features.shiftsScheduled * 3);

    return risks;
  }

  /**
   * Compute overtime probability from risk scores
   */
  private static computeProbability(risks: Record<string, number>): number {
    const totalRisk = Object.values(risks).reduce((a, b) => a + b, 0);
    // Scale risk (max 120) to probability (0-100)
    return Math.min(100, (totalRisk / 120) * 100);
  }

  /**
   * Compute confidence in prediction
   * Higher confidence when we have clear signals
   */
  private static computeConfidence(features: Record<string, number>): number {
    let confidence = 50; // Base confidence

    // More confident if already over threshold
    if (features.currentHours > 35) {
      confidence += 20;
    }

    // More confident with historical overtime pattern
    if (features.historicalOvertimeRate > 0.3) {
      confidence += 15;
    }

    // More confident if clear trend
    if (Math.abs(features.recentTrend) > 10) {
      confidence += 15;
    }

    // Cap at 95
    return Math.min(95, confidence);
  }

  /**
   * Generate human-readable reasoning
   */
  private static generateReasoning(features: Record<string, number>, probability: number): string[] {
    const reasons: string[] = [];

    if (features.currentHours > 40) {
      reasons.push(`Already ${features.currentHours.toFixed(1)}h this week (over 40h limit)`);
    }

    if (features.projectedHours > 40) {
      reasons.push(`Projected ${features.projectedHours.toFixed(1)}h with scheduled shifts`);
    }

    if (features.historicalOvertimeRate > 0.3) {
      reasons.push(`Historical overtime rate: ${(features.historicalOvertimeRate * 100).toFixed(0)}%`);
    }

    if (features.recentTrend > 5) {
      reasons.push(`Hours trending up (+${features.recentTrend.toFixed(1)}% last 30 days)`);
    }

    if (features.shiftsScheduled > 5) {
      reasons.push(`${features.shiftsScheduled} shifts scheduled in next 5 days`);
    }

    if (reasons.length === 0) {
      reasons.push('Low overtime risk based on current schedule');
    }

    return reasons;
  }

  /**
   * Estimate when overtime would likely occur
   */
  private static estimateOvertimeDate(employee: EmployeeContext, schedule: ScheduleContext): string {
    // Simple heuristic: estimate based on hours already worked
    const remainingHours = Math.max(0, 40 - employee.currentHoursThisWeek);
    const daysInWeek = 5; // Remaining work days

    if (remainingHours < 5) {
      // Will likely hit overtime tomorrow or next day
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // Estimate based on average hours per day
    const hoursPerDay = schedule.totalHoursScheduledNext5Days / daysInWeek;
    const daysUntilOvertime = Math.ceil(remainingHours / hoursPerDay);

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + daysUntilOvertime);
    return estimatedDate.toISOString().split('T')[0];
  }

  /**
   * Batch predict for multiple employees
   */
  static predictBatch(
    employees: EmployeeContext[],
    schedule: ScheduleContext
  ): OvertimePrediction[] {
    return employees.map((emp) => this.predict(emp, schedule));
  }

  /**
   * Alert threshold: return only high-risk predictions
   */
  static getHighRiskPredictions(predictions: OvertimePrediction[], threshold = 75): OvertimePrediction[] {
    return predictions.filter((p) => p.overtimeProbability >= threshold);
  }
}

export default OvertimePredictor;
