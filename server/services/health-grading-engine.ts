/**
 * Health Grading Engine
 * Calculates A-F letter grades and 0-100 health scores based on P&L metrics
 * Used to provide executive-level financial health assessment
 */

import { logger } from '../lib/logger';

/**
 * P&L snapshot data required for grading
 */
export interface PnLSnapshot {
  revenue: number;
  cogs: number;
  cogs_percentage: number;
  labor_cost: number;
  labor_percentage: number;
  overhead_cost: number;
  overhead_percentage: number;
  net_profit: number;
  net_margin_percentage: number;
  variance_from_budget?: number; // percentage
  forecast_trend?: 'improving' | 'stable' | 'declining';
  prior_period_net_margin?: number;
}

/**
 * Health grade output
 */
export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Health grading result
 */
export interface HealthGradeResult {
  grade: HealthGrade;
  score: number; // 0-100
  risk_score: number; // 0-100, higher = more risk
  risks: string[];
  strengths: string[];
  scoring_breakdown: {
    cogs_score: number;
    labor_score: number;
    margin_score: number;
    variance_score: number;
    trend_score: number;
    total_base_score: number;
  };
}

/**
 * Grading thresholds
 */
const GRADING_THRESHOLDS = {
  A: { min: 90, max: 100 },
  B: { min: 80, max: 89 },
  C: { min: 70, max: 79 },
  D: { min: 60, max: 69 },
  F: { min: 0, max: 59 },
};

/**
 * Health Grading Engine
 */
export class HealthGradingEngine {
  /**
   * Calculate health grade from P&L snapshot
   */
  static calculateHealthGrade(pnl: PnLSnapshot): HealthGradeResult {
    const breakdown = this.scoreBreakdown(pnl);
    const totalScore = this.calculateTotalScore(breakdown);
    const grade = this.scoreToGrade(totalScore);
    const risks = this.identifyRisks(pnl, breakdown);
    const strengths = this.identifyStrengths(pnl, breakdown);
    const riskScore = this.calculateRiskScore(risks, pnl);

    logger.debug('[HealthGrading] Grade calculated', {
      grade,
      score: totalScore,
      riskScore,
      risks: risks.length,
      strengths: strengths.length,
    });

    return {
      grade,
      score: totalScore,
      risk_score: riskScore,
      risks,
      strengths,
      scoring_breakdown: breakdown,
    };
  }

  /**
   * Score individual components
   */
  private static scoreBreakdown(pnl: PnLSnapshot): any {
    const cogsScore = this.scoreCOGS(pnl.cogs_percentage);
    const laborScore = this.scoreLabor(pnl.labor_percentage);
    const marginScore = this.scoreNetMargin(pnl.net_margin_percentage);
    const varianceScore = this.scoreVariance(pnl.variance_from_budget || 0);
    const trendScore = this.scoreTrend(pnl.forecast_trend);

    const baseScore =
      50 +
      (cogsScore + laborScore + marginScore + varianceScore + trendScore) / 5;

    return {
      cogs_score: cogsScore,
      labor_score: laborScore,
      margin_score: marginScore,
      variance_score: varianceScore,
      trend_score: trendScore,
      total_base_score: Math.round(baseScore),
    };
  }

  /**
   * Score COGS percentage (target: < 28%)
   * Food cost is typically the largest variable cost
   */
  private static scoreCOGS(cogsPercentage: number): number {
    if (cogsPercentage < 28) return 10;
    if (cogsPercentage < 32) return 5;
    if (cogsPercentage < 38) return 0;
    if (cogsPercentage < 42) return -5;
    return -10;
  }

  /**
   * Score labor percentage (target: < 30%)
   * Labor is second largest cost; control is critical
   */
  private static scoreLabor(laborPercentage: number): number {
    if (laborPercentage < 28) return 10;
    if (laborPercentage < 32) return 5;
    if (laborPercentage < 36) return 0;
    return -10;
  }

  /**
   * Score net margin (target: > 15%)
   * Ultimate profitability metric
   */
  private static scoreNetMargin(netMarginPercentage: number): number {
    if (netMarginPercentage > 18) return 10;
    if (netMarginPercentage > 15) return 5;
    if (netMarginPercentage > 10) return 0;
    if (netMarginPercentage > 5) return -5;
    return -10;
  }

  /**
   * Score variance from budget
   * Budget variance shows planning accuracy and operational control
   */
  private static scoreVariance(variancePercentage: number): number {
    const absVariance = Math.abs(variancePercentage);
    if (absVariance < 3) return 10;
    if (absVariance < 5) return 5;
    if (absVariance < 8) return 0;
    if (absVariance < 12) return -5;
    return -10;
  }

  /**
   * Score trend direction
   * Shows momentum and operational direction
   */
  private static scoreTrend(
    trend: 'improving' | 'stable' | 'declining' | undefined
  ): number {
    if (trend === 'improving') return 10;
    if (trend === 'stable') return 0;
    if (trend === 'declining') return -10;
    return 0; // Default if not provided
  }

  /**
   * Calculate total score from component scores
   */
  private static calculateTotalScore(breakdown: any): number {
    const score = breakdown.total_base_score;
    return Math.max(0, Math.min(100, score)); // Clamp 0-100
  }

  /**
   * Convert score to letter grade
   */
  private static scoreToGrade(score: number): HealthGrade {
    if (score >= GRADING_THRESHOLDS.A.min) return 'A';
    if (score >= GRADING_THRESHOLDS.B.min) return 'B';
    if (score >= GRADING_THRESHOLDS.C.min) return 'C';
    if (score >= GRADING_THRESHOLDS.D.min) return 'D';
    return 'F';
  }

  /**
   * Identify specific risks
   */
  private static identifyRisks(pnl: PnLSnapshot, breakdown: any): string[] {
    const risks: string[] = [];

    // COGS risks
    if (pnl.cogs_percentage > 38) {
      risks.push(`High food cost: ${pnl.cogs_percentage.toFixed(1)}% (target: <28%)`);
    }

    // Labor risks
    if (pnl.labor_percentage > 36) {
      risks.push(`High labor cost: ${pnl.labor_percentage.toFixed(1)}% (target: <30%)`);
    }

    // Margin risks
    if (pnl.net_margin_percentage < 10) {
      risks.push(`Low net margin: ${pnl.net_margin_percentage.toFixed(1)}% (target: >15%)`);
    }

    // Variance risks
    if (pnl.variance_from_budget && Math.abs(pnl.variance_from_budget) > 8) {
      const direction = pnl.variance_from_budget > 0 ? 'above' : 'below';
      risks.push(
        `Significant budget variance: ${Math.abs(pnl.variance_from_budget).toFixed(1)}% ${direction} budget`
      );
    }

    // Trend risks
    if (pnl.forecast_trend === 'declining') {
      risks.push('Declining trend detected - profitability worsening');
    }

    return risks;
  }

  /**
   * Identify strengths
   */
  private static identifyStrengths(pnl: PnLSnapshot, breakdown: any): string[] {
    const strengths: string[] = [];

    // COGS strengths
    if (pnl.cogs_percentage < 28) {
      strengths.push(`Excellent food cost control: ${pnl.cogs_percentage.toFixed(1)}%`);
    }

    // Labor strengths
    if (pnl.labor_percentage < 28) {
      strengths.push(`Strong labor efficiency: ${pnl.labor_percentage.toFixed(1)}%`);
    }

    // Margin strengths
    if (pnl.net_margin_percentage > 18) {
      strengths.push(`Exceptional profitability: ${pnl.net_margin_percentage.toFixed(1)}% net margin`);
    }

    // Budget control
    if (pnl.variance_from_budget && Math.abs(pnl.variance_from_budget) < 3) {
      strengths.push('Excellent budget variance control');
    }

    // Trend strength
    if (pnl.forecast_trend === 'improving') {
      strengths.push('Improving financial trend - momentum is positive');
    }

    return strengths;
  }

  /**
   * Calculate overall risk score (0-100, higher = more risk)
   */
  private static calculateRiskScore(risks: string[], pnl: PnLSnapshot): number {
    let riskScore = 0;

    // Each risk adds to risk score
    riskScore += risks.length * 15;

    // High COGS adds to risk
    if (pnl.cogs_percentage > 35) {
      riskScore += 15;
    }

    // High labor adds to risk
    if (pnl.labor_percentage > 35) {
      riskScore += 15;
    }

    // Low margin adds to risk
    if (pnl.net_margin_percentage < 8) {
      riskScore += 20;
    }

    // High variance adds to risk
    if (pnl.variance_from_budget && Math.abs(pnl.variance_from_budget) > 10) {
      riskScore += 15;
    }

    return Math.min(100, riskScore);
  }

  /**
   * Generate human-readable summary of health
   */
  static getSummary(result: HealthGradeResult): string {
    let summary = `Grade: ${result.grade} (${result.score.toFixed(1)}/100)\n`;

    if (result.strengths.length > 0) {
      summary += `\nStrengths:\n${result.strengths.map((s) => `• ${s}`).join('\n')}\n`;
    }

    if (result.risks.length > 0) {
      summary += `\nRisks:\n${result.risks.map((r) => `• ${r}`).join('\n')}\n`;
    }

    return summary;
  }

  /**
   * Compare health between two periods
   */
  static comparePeriods(
    previous: HealthGradeResult,
    current: HealthGradeResult
  ): {
    improved: boolean;
    grade_changed: boolean;
    score_delta: number;
    trend: 'improving' | 'stable' | 'declining';
  } {
    const scoreDelta = current.score - previous.score;
    const improved = scoreDelta > 0;
    const gradeChanged = previous.grade !== current.grade;
    const trend =
      scoreDelta > 2 ? 'improving' : scoreDelta < -2 ? 'declining' : 'stable';

    return {
      improved,
      grade_changed: gradeChanged,
      score_delta: scoreDelta,
      trend,
    };
  }
}
