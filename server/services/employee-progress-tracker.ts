/**
 * Employee Progress Tracker
 * 
 * Tracks and charts employee progress over time
 * Provides insights for individual development
 * 
 * Features:
 * - Progress charting over time
 * - Trend analysis
 * - Milestone tracking
 * - Performance trajectory
 */

import { logger } from '../utils/logger.js';
import { postEventEvaluationService } from './post-event-evaluation.js';

export interface ProgressDataPoint {
  date: string;
  overallRating: number;
  punctuality: number;
  quality: number;
  teamwork: number;
  communication: number;
  problemSolving: number;
  guestInteraction?: number;
  eventType?: string;
  role?: string;
}

export interface EmployeeProgressChart {
  employeeId: string;
  employeeName: string;
  period: {
    start: string;
    end: string;
  };
  dataPoints: ProgressDataPoint[];
  trends: {
    overallRating: 'improving' | 'stable' | 'declining';
    punctuality: 'improving' | 'stable' | 'declining';
    quality: 'improving' | 'stable' | 'declining';
    teamwork: 'improving' | 'stable' | 'declining';
    communication: 'improving' | 'stable' | 'declining';
    problemSolving: 'improving' | 'stable' | 'declining';
  };
  milestones: Array<{
    date: string;
    type: 'rating_improvement' | 'skill_milestone' | 'consistency_achievement' | 'role_expansion';
    description: string;
    value: number;
  }>;
  trajectory: {
    currentLevel: number; // 0-100
    projectedLevel: number; // 0-100 (30 days out)
    growthRate: number; // percentage per month
    confidence: number; // 0-100
  };
  insights: string[];
}

export interface ProgressComparison {
  employeeId: string;
  employeeName: string;
  currentPeriod: {
    average: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  previousPeriod: {
    average: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  improvement: number; // percentage change
  rank: number; // among peers
  percentile: number; // 0-100
}

class EmployeeProgressTracker {
  /**
   * Get progress chart for an employee
   */
  async getProgressChart(
    employeeId: string,
    startDate: string,
    endDate: string,
    orgId: string
  ): Promise<EmployeeProgressChart> {
    try {
      logger.info(`[ProgressTracker] Generating progress chart for ${employeeId}`);

      // Fetch evaluations for the period
      const evaluations = await postEventEvaluationService.getEmployeeEvaluations(
        employeeId,
        'system', // System access
        true // Include all data
      );

      // Filter by date range
      const periodEvaluations = evaluations.filter(e => {
        const evalDate = new Date(e.evaluationDate);
        return evalDate >= new Date(startDate) && evalDate <= new Date(endDate);
      });

      // Build data points
      const dataPoints: ProgressDataPoint[] = periodEvaluations.map((evaluation) => ({
        date: evaluation.evaluationDate,
        overallRating: evaluation.performance.overallRating,
        punctuality: evaluation.performance.punctuality,
        quality: evaluation.performance.quality,
        teamwork: evaluation.performance.teamwork,
        communication: evaluation.performance.communication,
        problemSolving: evaluation.performance.problemSolving,
        guestInteraction: evaluation.performance.guestInteraction,
        eventType: evaluation.aiTrainingData.eventType,
        role: evaluation.roleSpecific.roleName,
      }));

      // Calculate trends
      const trends = this.calculateTrends(dataPoints);

      // Identify milestones
      const milestones = this.identifyMilestones(dataPoints, periodEvaluations);

      // Calculate trajectory
      const trajectory = this.calculateTrajectory(dataPoints);

      // Generate insights
      const insights = this.generateInsights(dataPoints, trends, milestones, trajectory);

      // Get employee name
      const employeeName = periodEvaluations.length > 0
        ? periodEvaluations[0].employeeName || 'Unknown'
        : 'Unknown';

      return {
        employeeId,
        employeeName,
        period: { start: startDate, end: endDate },
        dataPoints,
        trends,
        milestones,
        trajectory,
        insights,
      };
    } catch (error) {
      logger.error('[ProgressTracker] Error generating progress chart:', error);
      throw error;
    }
  }

  /**
   * Compare employee progress to peers
   */
  async compareToPeers(
    employeeId: string,
    period: { start: string; end: string },
    orgId: string,
    department?: string
  ): Promise<ProgressComparison> {
    try {
      // Get employee progress
      const employeeChart = await this.getProgressChart(
        employeeId,
        period.start,
        period.end,
        orgId
      );

      // Get peer data
      const peers = await this.getPeerData(orgId, department);
      const peerAverages = peers.map(p => p.averageRating);

      // Calculate current period average
      const currentAverage = employeeChart.dataPoints.length > 0
        ? employeeChart.dataPoints.reduce((sum, p) => sum + p.overallRating, 0) / employeeChart.dataPoints.length
        : 0;

      // Calculate previous period average
      const previousStart = new Date(period.start);
      previousStart.setDate(previousStart.getDate() - (new Date(period.end).getTime() - new Date(period.start).getTime()) / (1000 * 60 * 60 * 24));
      const previousChart = await this.getProgressChart(
        employeeId,
        previousStart.toISOString().split('T')[0],
        period.start,
        orgId
      );
      const previousAverage = previousChart.dataPoints.length > 0
        ? previousChart.dataPoints.reduce((sum, p) => sum + p.overallRating, 0) / previousChart.dataPoints.length
        : 0;

      // Calculate rank and percentile
      const sortedPeers = [...peerAverages, currentAverage].sort((a, b) => b - a);
      const rank = sortedPeers.indexOf(currentAverage) + 1;
      const percentile = ((peers.length - rank + 1) / peers.length) * 100;

      // Calculate improvement
      const improvement = previousAverage > 0
        ? ((currentAverage - previousAverage) / previousAverage) * 100
        : 0;

      return {
        employeeId,
        employeeName: employeeChart.employeeName,
        currentPeriod: {
          average: currentAverage,
          trend: employeeChart.trends.overallRating,
        },
        previousPeriod: {
          average: previousAverage,
          trend: previousChart.trends.overallRating,
        },
        improvement,
        rank,
        percentile,
      };
    } catch (error) {
      logger.error('[ProgressTracker] Error comparing to peers:', error);
      throw error;
    }
  }

  /**
   * Calculate trends for each metric
   */
  private calculateTrends(dataPoints: ProgressDataPoint[]): EmployeeProgressChart['trends'] {
    if (dataPoints.length < 2) {
      return {
        overallRating: 'stable',
        punctuality: 'stable',
        quality: 'stable',
        teamwork: 'stable',
        communication: 'stable',
        problemSolving: 'stable',
      };
    }

    const calculateTrend = (metric: keyof ProgressDataPoint): 'improving' | 'stable' | 'declining' => {
      const values = dataPoints.map(p => p[metric] as number).filter(v => v > 0);
      if (values.length < 2) return 'stable';

      const recent = values.slice(0, Math.ceil(values.length / 2));
      const older = values.slice(Math.ceil(values.length / 2));

      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

      if (recentAvg > olderAvg * 1.05) return 'improving';
      if (recentAvg < olderAvg * 0.95) return 'declining';
      return 'stable';
    };

    return {
      overallRating: calculateTrend('overallRating'),
      punctuality: calculateTrend('punctuality'),
      quality: calculateTrend('quality'),
      teamwork: calculateTrend('teamwork'),
      communication: calculateTrend('communication'),
      problemSolving: calculateTrend('problemSolving'),
    };
  }

  /**
   * Identify milestones
   */
  private identifyMilestones(
    dataPoints: ProgressDataPoint[],
    evaluations: any[]
  ): EmployeeProgressChart['milestones'] {
    const milestones: EmployeeProgressChart['milestones'] = [];

    if (dataPoints.length === 0) return milestones;

    // Rating improvement milestones
    const sortedByRating = [...dataPoints].sort((a, b) => b.overallRating - a.overallRating);
    const highestRating = sortedByRating[0];
    if (highestRating.overallRating >= 4.5) {
      milestones.push({
        date: highestRating.date,
        type: 'rating_improvement',
        description: `Achieved ${highestRating.overallRating.toFixed(1)}/5.0 rating`,
        value: highestRating.overallRating,
      });
    }

    // Consistency achievement
    const recentRatings = dataPoints.slice(0, 5).map(p => p.overallRating);
    if (recentRatings.length >= 5) {
      const variance = this.calculateVariance(recentRatings);
      if (variance < 0.1) { // Very consistent
        milestones.push({
          date: dataPoints[0].date,
          type: 'consistency_achievement',
          description: '5 consecutive consistent performances',
          value: variance,
        });
      }
    }

    // Skill milestones (from evaluations)
    const skillImprovements = this.identifySkillMilestones(evaluations);
    milestones.push(...skillImprovements);

    return milestones.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Calculate performance trajectory
   */
  private calculateTrajectory(dataPoints: ProgressDataPoint[]): EmployeeProgressChart['trajectory'] {
    if (dataPoints.length < 3) {
      return {
        currentLevel: dataPoints.length > 0 ? dataPoints[0].overallRating * 20 : 50,
        projectedLevel: 50,
        growthRate: 0,
        confidence: 0,
      };
    }

    // Calculate current level (average of last 3)
    const recent = dataPoints.slice(0, 3);
    const currentLevel = (recent.reduce((sum, p) => sum + p.overallRating, 0) / recent.length) * 20;

    // Calculate growth rate (linear regression)
    const sorted = [...dataPoints].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const growthRate = this.calculateGrowthRate(sorted.map(p => p.overallRating * 20));

    // Project 30 days out
    const projectedLevel = Math.min(100, Math.max(0, currentLevel + (growthRate * 30) / 30));

    // Confidence based on data points
    const confidence = Math.min(100, (dataPoints.length / 10) * 100);

    return {
      currentLevel,
      projectedLevel,
      growthRate,
      confidence,
    };
  }

  /**
   * Generate insights
   */
  private generateInsights(
    dataPoints: ProgressDataPoint[],
    trends: EmployeeProgressChart['trends'],
    milestones: EmployeeProgressChart['milestones'],
    trajectory: EmployeeProgressChart['trajectory']
  ): string[] {
    const insights: string[] = [];

    // Trend insights
    if (trends.overallRating === 'improving') {
      insights.push('Overall performance is improving - keep up the great work!');
    } else if (trends.overallRating === 'declining') {
      insights.push('Overall performance is declining - consider additional training or support');
    }

    // Milestone insights
    if (milestones.length > 0) {
      insights.push(`Recent achievement: ${milestones[0].description}`);
    }

    // Trajectory insights
    if (trajectory.growthRate > 0) {
      insights.push(`On track to reach ${trajectory.projectedLevel.toFixed(0)}/100 in 30 days`);
    }

    // Specific metric insights
    const improvingMetrics = Object.entries(trends)
      .filter(([_, trend]) => trend === 'improving')
      .map(([metric]) => metric);
    if (improvingMetrics.length > 0) {
      insights.push(`Strong improvement in: ${improvingMetrics.join(', ')}`);
    }

    const decliningMetrics = Object.entries(trends)
      .filter(([_, trend]) => trend === 'declining')
      .map(([metric]) => metric);
    if (decliningMetrics.length > 0) {
      insights.push(`Areas needing attention: ${decliningMetrics.join(', ')}`);
    }

    return insights;
  }

  /**
   * Helper methods
   */

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private identifySkillMilestones(evaluations: any[]): EmployeeProgressChart['milestones'] {
    const milestones: EmployeeProgressChart['milestones'] = [];

    // Track role expansion
    const roles = new Set(evaluations.map(e => e.roleSpecific.roleName));
    if (roles.size > 1) {
      milestones.push({
        date: evaluations[0].evaluationDate,
        type: 'role_expansion',
        description: `Expanded to ${roles.size} different roles`,
        value: roles.size,
      });
    }

    return milestones;
  }

  private calculateGrowthRate(values: number[]): number {
    if (values.length < 2) return 0;

    // Simple linear regression
    const n = values.length;
    const sumX = n * (n + 1) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + (idx + 1) * val, 0);
    const sumX2 = n * (n + 1) * (2 * n + 1) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope; // Growth per data point
  }

  private async getPeerData(orgId: string, department?: string): Promise<Array<{ employeeId: string; averageRating: number }>> {
    // In production, query peer evaluations
    return [];
  }
}

export const employeeProgressTracker = new EmployeeProgressTracker();
