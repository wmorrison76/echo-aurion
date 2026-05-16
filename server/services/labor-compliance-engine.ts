/**
 * Labor Compliance Engine
 * ------------------------
 * Automated compliance checking for labor laws (FLSA, state, local)
 * Features: Real-time schedule validation, violation detection, automatic alerts
 */

import { logger } from "../lib/logger";

export interface ComplianceRule {
  id: string;
  type: "federal" | "state" | "local";
  jurisdiction: string; // e.g., "US", "CA", "NYC"
  ruleType:
    | "overtime"
    | "break"
    | "minors"
    | "meal"
    | "consecutive_days"
    | "rest_period"
    | "max_hours";
  conditions: Record<string, any>; // Rule-specific conditions
  threshold: number; // Threshold value (hours, minutes, etc.)
  unit: "hours" | "minutes" | "days" | "percentage";
}

export interface Schedule {
  id: string;
  orgId: string;
  outletId: string;
  deptId: string;
  employeeId: string;
  positionId: string;
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  breakMinutes: number;
  weekStart: string; // ISO date
}

export interface ComplianceViolation {
  id: string;
  orgId: string;
  employeeId: string;
  scheduleId?: string;
  ruleId: string;
  ruleType: ComplianceRule["ruleType"];
  violationType: "warning" | "error" | "critical";
  message: string;
  details: Record<string, any>;
  detectedAt: string; // ISO datetime
  resolved: boolean;
  resolvedAt?: string; // ISO datetime
  resolvedBy?: string; // User ID
}

export interface ComplianceCheckResult {
  valid: boolean;
  violations: ComplianceViolation[];
  warnings: ComplianceViolation[];
  score: number; // 0-100, compliance score
  checkedAt: string; // ISO datetime
}

/**
 * Labor Compliance Engine
 * Checks schedules against labor law rules and detects violations
 */
export class LaborComplianceEngine {
  private rules: Map<string, ComplianceRule> = new Map();
  private violations: Map<string, ComplianceViolation> = new Map();

  constructor() {
    this.initializeRules();
  }

  /**
   * Check schedule for compliance violations
   */
  async checkSchedule(
    schedule: Schedule,
    employeeShifts: Schedule[], // All shifts for this employee in the period
    jurisdiction: string = "US"
  ): Promise<ComplianceCheckResult> {
    const violations: ComplianceViolation[] = [];
    const warnings: ComplianceViolation[] = [];

    // Get applicable rules for jurisdiction
    const applicableRules = this.getApplicableRules(jurisdiction);

    // Check each rule
    for (const rule of applicableRules) {
      const violation = await this.checkRule(rule, schedule, employeeShifts);

      if (violation) {
        if (violation.violationType === "error" || violation.violationType === "critical") {
          violations.push(violation);
        } else {
          warnings.push(violation);
        }
      }
    }

    // Calculate compliance score
    const score = this.calculateComplianceScore(applicableRules.length, violations.length, warnings.length);

    const result: ComplianceCheckResult = {
      valid: violations.length === 0,
      violations,
      warnings,
      score,
      checkedAt: new Date().toISOString(),
    };

    // Store violations
    violations.forEach((v) => this.violations.set(v.id, v));
    warnings.forEach((v) => this.violations.set(v.id, v));

    logger.info("[Compliance] Schedule checked", {
      scheduleId: schedule.id,
      employeeId: schedule.employeeId,
      violations: violations.length,
      warnings: warnings.length,
      score,
    });

    return result;
  }

  /**
   * Check batch of schedules
   */
  async checkBatchSchedules(
    schedules: Schedule[],
    employeeShiftsMap: Map<string, Schedule[]>, // employeeId -> shifts[]
    jurisdiction: string = "US"
  ): Promise<ComplianceCheckResult> {
    const allViolations: ComplianceViolation[] = [];
    const allWarnings: ComplianceViolation[] = [];
    let totalChecks = 0;

    for (const schedule of schedules) {
      const employeeShifts = employeeShiftsMap.get(schedule.employeeId) || [];
      const result = await this.checkSchedule(schedule, employeeShifts, jurisdiction);

      allViolations.push(...result.violations);
      allWarnings.push(...result.warnings);
      totalChecks++;
    }

    // Calculate overall compliance score
    const applicableRules = this.getApplicableRules(jurisdiction);
    const score = this.calculateComplianceScore(
      applicableRules.length * totalChecks,
      allViolations.length,
      allWarnings.length
    );

    return {
      valid: allViolations.length === 0,
      violations: allViolations,
      warnings: allWarnings,
      score,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Check specific rule
   */
  private async checkRule(
    rule: ComplianceRule,
    schedule: Schedule,
    employeeShifts: Schedule[]
  ): Promise<ComplianceViolation | null> {
    switch (rule.ruleType) {
      case "overtime":
        return await this.checkOvertimeRule(rule, schedule, employeeShifts);

      case "break":
        return await this.checkBreakRule(rule, schedule, employeeShifts);

      case "meal":
        return await this.checkMealRule(rule, schedule, employeeShifts);

      case "consecutive_days":
        return await this.checkConsecutiveDaysRule(rule, schedule, employeeShifts);

      case "rest_period":
        return await this.checkRestPeriodRule(rule, schedule, employeeShifts);

      case "max_hours":
        return await this.checkMaxHoursRule(rule, schedule, employeeShifts);

      default:
        return null;
    }
  }

  /**
   * Check overtime rule (FLSA: >40 hours/week = OT)
   */
  private async checkOvertimeRule(
    rule: ComplianceRule,
    schedule: Schedule,
    employeeShifts: Schedule[]
  ): Promise<ComplianceViolation | null> {
    const threshold = rule.threshold; // Default: 40 hours
    const weekStart = new Date(schedule.weekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Calculate total hours in week
    const weekShifts = employeeShifts.filter(
      (s) => new Date(s.startTime) >= weekStart && new Date(s.startTime) < weekEnd
    );

    const totalMinutes = weekShifts.reduce((sum, s) => {
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime).getTime();
      const duration = (end - start) / (1000 * 60); // minutes
      return sum + duration - (s.breakMinutes || 0);
    }, 0);

    const totalHours = totalMinutes / 60;

    if (totalHours > threshold) {
      const overtimeHours = totalHours - threshold;

      return {
        id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        orgId: schedule.orgId,
        employeeId: schedule.employeeId,
        scheduleId: schedule.id,
        ruleId: rule.id,
        ruleType: "overtime",
        violationType: overtimeHours > 10 ? "critical" : "error",
        message: `Overtime violation: ${totalHours.toFixed(1)} hours worked (threshold: ${threshold} hours). ${overtimeHours.toFixed(1)} hours of overtime.`,
        details: {
          totalHours,
          overtimeHours,
          threshold,
          weekStart: schedule.weekStart,
        },
        detectedAt: new Date().toISOString(),
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Check break rule (e.g., 10-minute break per 4 hours)
   */
  private async checkBreakRule(
    rule: ComplianceRule,
    schedule: Schedule,
    employeeShifts: Schedule[]
  ): Promise<ComplianceViolation | null> {
    const requiredBreakMinutes = rule.conditions.requiredBreakMinutes || 10;
    const breakIntervalHours = rule.conditions.breakIntervalHours || 4;

    const start = new Date(schedule.startTime).getTime();
    const end = new Date(schedule.endTime).getTime();
    const durationHours = (end - start) / (1000 * 60 * 60);
    const requiredBreaks = Math.floor(durationHours / breakIntervalHours);
    const requiredBreakMinutesTotal = requiredBreaks * requiredBreakMinutes;

    const actualBreakMinutes = schedule.breakMinutes || 0;

    if (actualBreakMinutes < requiredBreakMinutesTotal) {
      const missingMinutes = requiredBreakMinutesTotal - actualBreakMinutes;

      return {
        id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        orgId: schedule.orgId,
        employeeId: schedule.employeeId,
        scheduleId: schedule.id,
        ruleId: rule.id,
        ruleType: "break",
        violationType: missingMinutes > 30 ? "error" : "warning",
        message: `Break violation: ${actualBreakMinutes} minutes taken, ${requiredBreakMinutesTotal} minutes required. Missing ${missingMinutes} minutes.`,
        details: {
          actualBreakMinutes,
          requiredBreakMinutesTotal,
          missingMinutes,
          durationHours,
        },
        detectedAt: new Date().toISOString(),
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Check meal rule (e.g., 30-minute meal break for >5 hours)
   */
  private async checkMealRule(
    rule: ComplianceRule,
    schedule: Schedule,
    employeeShifts: Schedule[]
  ): Promise<ComplianceViolation | null> {
    const requiredMealMinutes = rule.conditions.requiredMealMinutes || 30;
    const mealThresholdHours = rule.conditions.mealThresholdHours || 5;

    const start = new Date(schedule.startTime).getTime();
    const end = new Date(schedule.endTime).getTime();
    const durationHours = (end - start) / (1000 * 60 * 60);

    if (durationHours > mealThresholdHours) {
      const mealBreakMinutes = rule.conditions.mealBreakMinutes || 0; // Would come from schedule
      const actualMealMinutes = mealBreakMinutes;

      if (actualMealMinutes < requiredMealMinutes) {
        const missingMinutes = requiredMealMinutes - actualMealMinutes;

        return {
          id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          orgId: schedule.orgId,
          employeeId: schedule.employeeId,
          scheduleId: schedule.id,
          ruleId: rule.id,
          ruleType: "meal",
          violationType: "error",
          message: `Meal break violation: ${actualMealMinutes} minutes taken, ${requiredMealMinutes} minutes required for shifts >${mealThresholdHours} hours. Missing ${missingMinutes} minutes.`,
          details: {
            actualMealMinutes,
            requiredMealMinutes,
            missingMinutes,
            durationHours,
          },
          detectedAt: new Date().toISOString(),
          resolved: false,
        };
      }
    }

    return null;
  }

  /**
   * Check consecutive days rule (e.g., max 6 consecutive days)
   */
  private async checkConsecutiveDaysRule(
    rule: ComplianceRule,
    schedule: Schedule,
    employeeShifts: Schedule[]
  ): Promise<ComplianceViolation | null> {
    const maxConsecutiveDays = rule.threshold; // Default: 6 days

    // Group shifts by date
    const shiftsByDate = new Map<string, Schedule[]>();
    employeeShifts.forEach((s) => {
      const date = new Date(s.startTime).toISOString().split("T")[0];
      if (!shiftsByDate.has(date)) {
        shiftsByDate.set(date, []);
      }
      shiftsByDate.get(date)!.push(s);
    });

    // Find longest consecutive sequence
    const dates = Array.from(shiftsByDate.keys()).sort();
    let maxConsecutive = 1;
    let currentConsecutive = 1;

    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
      }
    }

    if (maxConsecutive > maxConsecutiveDays) {
      return {
        id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        orgId: schedule.orgId,
        employeeId: schedule.employeeId,
        scheduleId: schedule.id,
        ruleId: rule.id,
        ruleType: "consecutive_days",
        violationType: maxConsecutive > maxConsecutiveDays + 1 ? "critical" : "error",
        message: `Consecutive days violation: ${maxConsecutive} consecutive days worked (threshold: ${maxConsecutiveDays} days).`,
        details: {
          maxConsecutive,
          threshold: maxConsecutiveDays,
        },
        detectedAt: new Date().toISOString(),
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Check rest period rule (e.g., 10 hours between shifts)
   */
  private async checkRestPeriodRule(
    rule: ComplianceRule,
    schedule: Schedule,
    employeeShifts: Schedule[]
  ): Promise<ComplianceViolation | null> {
    const requiredRestHours = rule.threshold; // Default: 10 hours

    // Find previous shift
    const scheduleStart = new Date(schedule.startTime).getTime();
    const previousShifts = employeeShifts
      .filter((s) => new Date(s.endTime).getTime() < scheduleStart)
      .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

    if (previousShifts.length > 0) {
      const lastShift = previousShifts[0];
      const lastShiftEnd = new Date(lastShift.endTime).getTime();
      const restHours = (scheduleStart - lastShiftEnd) / (1000 * 60 * 60);

      if (restHours < requiredRestHours) {
        const missingHours = requiredRestHours - restHours;

        return {
          id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          orgId: schedule.orgId,
          employeeId: schedule.employeeId,
          scheduleId: schedule.id,
          ruleId: rule.id,
          ruleType: "rest_period",
          violationType: missingHours > 2 ? "critical" : "error",
          message: `Rest period violation: ${restHours.toFixed(1)} hours rest between shifts (required: ${requiredRestHours} hours). Missing ${missingHours.toFixed(1)} hours.`,
          details: {
            restHours,
            requiredRestHours,
            missingHours,
            lastShiftEnd: lastShift.endTime,
            currentShiftStart: schedule.startTime,
          },
          detectedAt: new Date().toISOString(),
          resolved: false,
        };
      }
    }

    return null;
  }

  /**
   * Check max hours rule (e.g., max 12 hours per day)
   */
  private async checkMaxHoursRule(
    rule: ComplianceRule,
    schedule: Schedule,
    employeeShifts: Schedule[]
  ): Promise<ComplianceViolation | null> {
    const maxHours = rule.threshold; // Default: 12 hours

    const start = new Date(schedule.startTime).getTime();
    const end = new Date(schedule.endTime).getTime();
    const durationHours = (end - start) / (1000 * 60 * 60) - (schedule.breakMinutes || 0) / 60;

    if (durationHours > maxHours) {
      const excessHours = durationHours - maxHours;

      return {
        id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        orgId: schedule.orgId,
        employeeId: schedule.employeeId,
        scheduleId: schedule.id,
        ruleId: rule.id,
        ruleType: "max_hours",
        violationType: excessHours > 2 ? "critical" : "error",
        message: `Max hours violation: ${durationHours.toFixed(1)} hours worked (threshold: ${maxHours} hours). Excess: ${excessHours.toFixed(1)} hours.`,
        details: {
          durationHours,
          maxHours,
          excessHours,
        },
        detectedAt: new Date().toISOString(),
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Get applicable rules for jurisdiction
   */
  private getApplicableRules(jurisdiction: string): ComplianceRule[] {
    const rules: ComplianceRule[] = [];

    // Always include federal rules
    Array.from(this.rules.values())
      .filter((r) => r.type === "federal")
      .forEach((r) => rules.push(r));

    // Include state rules if jurisdiction is a state
    if (jurisdiction !== "US") {
      Array.from(this.rules.values())
        .filter((r) => r.type === "state" && r.jurisdiction === jurisdiction)
        .forEach((r) => rules.push(r));
    }

    return rules;
  }

  /**
   * Calculate compliance score
   */
  private calculateComplianceScore(
    totalRules: number,
    violations: number,
    warnings: number
  ): number {
    if (totalRules === 0) return 100;

    const violationWeight = 2; // Violations count double
    const weightedViolations = violations * violationWeight + warnings;
    const score = Math.max(0, 100 - (weightedViolations / totalRules) * 100);

    return Math.round(score);
  }

  /**
   * Initialize labor law rules
   */
  private initializeRules(): void {
    // Federal FLSA Rules
    this.rules.set("flsa_overtime", {
      id: "flsa_overtime",
      type: "federal",
      jurisdiction: "US",
      ruleType: "overtime",
      conditions: {},
      threshold: 40,
      unit: "hours",
    });

    this.rules.set("flsa_break", {
      id: "flsa_break",
      type: "federal",
      jurisdiction: "US",
      ruleType: "break",
      conditions: {
        requiredBreakMinutes: 10,
        breakIntervalHours: 4,
      },
      threshold: 10,
      unit: "minutes",
    });

    // State-specific rules (examples)
    // California
    this.rules.set("ca_meal", {
      id: "ca_meal",
      type: "state",
      jurisdiction: "CA",
      ruleType: "meal",
      conditions: {
        requiredMealMinutes: 30,
        mealThresholdHours: 5,
      },
      threshold: 30,
      unit: "minutes",
    });

    this.rules.set("ca_rest", {
      id: "ca_rest",
      type: "state",
      jurisdiction: "CA",
      ruleType: "rest_period",
      conditions: {},
      threshold: 10,
      unit: "hours",
    });

    // New York
    this.rules.set("ny_meal", {
      id: "ny_meal",
      type: "state",
      jurisdiction: "NY",
      ruleType: "meal",
      conditions: {
        requiredMealMinutes: 30,
        mealThresholdHours: 6,
      },
      threshold: 30,
      unit: "minutes",
    });

    // Generic rules
    this.rules.set("max_hours_per_day", {
      id: "max_hours_per_day",
      type: "federal",
      jurisdiction: "US",
      ruleType: "max_hours",
      conditions: {},
      threshold: 12,
      unit: "hours",
    });

    this.rules.set("consecutive_days", {
      id: "consecutive_days",
      type: "federal",
      jurisdiction: "US",
      ruleType: "consecutive_days",
      conditions: {},
      threshold: 6,
      unit: "days",
    });
  }

  /**
   * Get violations
   */
  getViolations(
    orgId?: string,
    employeeId?: string,
    resolved?: boolean
  ): ComplianceViolation[] {
    let violations = Array.from(this.violations.values());

    if (orgId) {
      violations = violations.filter((v) => v.orgId === orgId);
    }
    if (employeeId) {
      violations = violations.filter((v) => v.employeeId === employeeId);
    }
    if (resolved !== undefined) {
      violations = violations.filter((v) => v.resolved === resolved);
    }

    return violations.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  }

  /**
   * Resolve violation
   */
  resolveViolation(
    violationId: string,
    resolvedBy: string
  ): void {
    const violation = this.violations.get(violationId);

    if (!violation) {
      throw new Error(`Violation not found: ${violationId}`);
    }

    violation.resolved = true;
    violation.resolvedAt = new Date().toISOString();
    violation.resolvedBy = resolvedBy;

    this.violations.set(violationId, violation);

    logger.info("[Compliance] Violation resolved", {
      violationId,
      resolvedBy,
    });
  }
}

// Singleton instance
let complianceEngineInstance: LaborComplianceEngine | null = null;

export function getLaborComplianceEngine(): LaborComplianceEngine {
  if (!complianceEngineInstance) {
    complianceEngineInstance = new LaborComplianceEngine();
  }
  return complianceEngineInstance;
}

export default LaborComplianceEngine;
