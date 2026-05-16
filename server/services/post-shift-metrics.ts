/**
 * Post-Shift Metrics and Team Motivation
 * 
 * Tracks shift performance and provides motivation
 * Team-based metrics to drive improvement
 * 
 * Features:
 * - Shift performance tracking
 * - Team metrics
 * - Individual contributions
 * - Motivation and recognition
 * - Goal tracking
 */

import { logger } from '../utils/logger.js';
import { preShiftBriefingService, type ShiftTeam } from './pre-shift-briefing.js';

export interface PostShiftMetrics {
  shiftId: string;
  date: string;
  shiftTime: string;
  teamSize: number;
  performance: {
    overallRating: number; // 1-5
    punctuality: number; // percentage on-time
    quality: number; // 1-5 average
    teamwork: number; // 1-5 average
    guestSatisfaction?: number; // 1-5 (if available)
    efficiency: number; // 0-100
  };
  goals: {
    set: Array<{
      goal: string;
      target: number;
      achieved: number;
      status: 'exceeded' | 'met' | 'missed';
    }>;
    overallAchievement: number; // percentage
  };
  individualContributions: Array<{
    employeeId: string;
    employeeName: string;
    role: string;
    rating: number;
    highlights: string[];
    recognition: string[];
  }>;
  teamHighlights: Array<{
    type: 'excellence' | 'improvement' | 'collaboration' | 'problem_solving';
    description: string;
    contributors: string[];
  }>;
  motivation: {
    achievements: string[];
    recognition: string[];
    encouragement: string[];
    nextShiftGoals: string[];
  };
  comparison: {
    vsPreShiftPrediction: {
      predicted: number;
      actual: number;
      variance: number; // percentage
    };
    vsPreviousShift: {
      previous: number;
      current: number;
      change: number; // percentage
    };
    vsTeamAverage: {
      teamAverage: number;
      shiftRating: number;
      rank: number; // among recent shifts
    };
  };
  insights: string[];
}

export interface ShiftGoal {
  shiftId: string;
  goals: Array<{
    id: string;
    goal: string;
    target: number;
    metric: string; // e.g., 'quality', 'efficiency', 'guest_satisfaction'
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
  setBy: string;
  setAt: string;
}

class PostShiftMetricsService {
  /**
   * Generate post-shift metrics
   */
  async generateMetrics(
    shift: ShiftTeam,
    evaluations: any[], // Post-shift evaluations
    goals?: ShiftGoal,
    orgId: string
  ): Promise<PostShiftMetrics> {
    try {
      logger.info(`[PostShiftMetrics] Generating metrics for shift ${shift.shiftId}`);

      // Calculate performance metrics
      const performance = this.calculatePerformance(evaluations);

      // Evaluate goals
      const goalEvaluation = this.evaluateGoals(goals, evaluations, performance);

      // Analyze individual contributions
      const individualContributions = this.analyzeIndividualContributions(shift.teamMembers, evaluations);

      // Identify team highlights
      const teamHighlights = this.identifyTeamHighlights(evaluations, performance);

      // Generate motivation content
      const motivation = this.generateMotivation(performance, goalEvaluation, teamHighlights);

      // Compare to predictions and previous shifts
      const comparison = await this.generateComparison(shift, performance, orgId);

      // Generate insights
      const insights = this.generateInsights(performance, goalEvaluation, comparison);

      return {
        shiftId: shift.shiftId,
        date: shift.date,
        shiftTime: `${shift.shiftStart} - ${shift.shiftEnd}`,
        teamSize: shift.teamMembers.length,
        performance,
        goals: goalEvaluation,
        individualContributions,
        teamHighlights,
        motivation,
        comparison,
        insights,
      };
    } catch (error) {
      logger.error('[PostShiftMetrics] Error generating metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformance(evaluations: any[]): PostShiftMetrics['performance'] {
    if (evaluations.length === 0) {
      return {
        overallRating: 0,
        punctuality: 0,
        quality: 0,
        teamwork: 0,
        efficiency: 0,
      };
    }

    const overallRating = evaluations.reduce((sum, e) => sum + (e.performance.overallRating || 0), 0) / evaluations.length;
    const punctuality = evaluations.filter(e => (e.performance.punctuality || 0) >= 4).length / evaluations.length * 100;
    const quality = evaluations.reduce((sum, e) => sum + (e.performance.quality || 0), 0) / evaluations.length;
    const teamwork = evaluations.reduce((sum, e) => sum + (e.performance.teamwork || 0), 0) / evaluations.length;
    const guestSatisfaction = evaluations.some(e => e.performance.guestInteraction)
      ? evaluations.filter(e => e.performance.guestInteraction).reduce((sum, e) => sum + (e.performance.guestInteraction || 0), 0) / evaluations.filter(e => e.performance.guestInteraction).length
      : undefined;

    // Calculate efficiency (combination of metrics)
    const efficiency = (
      (overallRating / 5) * 30 +
      (punctuality / 100) * 20 +
      (quality / 5) * 25 +
      (teamwork / 5) * 25
    );

    return {
      overallRating,
      punctuality,
      quality,
      teamwork,
      guestSatisfaction,
      efficiency,
    };
  }

  /**
   * Evaluate goals
   */
  private evaluateGoals(
    goals: ShiftGoal | undefined,
    evaluations: any[],
    performance: PostShiftMetrics['performance']
  ): PostShiftMetrics['goals'] {
    if (!goals || !goals.goals || goals.goals.length === 0) {
      return {
        set: [],
        overallAchievement: 0,
      };
    }

    const evaluatedGoals = goals.goals.map(goal => {
      let achieved = 0;

      // Map goal metric to performance metric
      switch (goal.metric) {
        case 'quality':
          achieved = performance.quality;
          break;
        case 'efficiency':
          achieved = performance.efficiency;
          break;
        case 'guest_satisfaction':
          achieved = performance.guestSatisfaction || 0;
          break;
        case 'teamwork':
          achieved = performance.teamwork;
          break;
        default:
          achieved = performance.overallRating;
      }

      const status = achieved >= goal.target * 1.1 ? 'exceeded' :
                     achieved >= goal.target ? 'met' : 'missed';

      return {
        goal: goal.goal,
        target: goal.target,
        achieved,
        status,
      };
    });

    const overallAchievement = evaluatedGoals.length > 0
      ? (evaluatedGoals.filter(g => g.status !== 'missed').length / evaluatedGoals.length) * 100
      : 0;

    return {
      set: evaluatedGoals,
      overallAchievement,
    };
  }

  /**
   * Analyze individual contributions
   */
  private analyzeIndividualContributions(
    members: ShiftTeam['teamMembers'],
    evaluations: any[]
  ): PostShiftMetrics['individualContributions'] {
    return members.map(member => {
      const evaluation = evaluations.find(e => e.employeeId === member.employeeId);

      if (!evaluation) {
        return {
          employeeId: member.employeeId,
          employeeName: member.employeeName,
          role: member.role,
          rating: 0,
          highlights: [],
          recognition: [],
        };
      }

      const highlights: string[] = [];
      const recognition: string[] = [];

      // Identify highlights from strengths
      if (evaluation.strengths && evaluation.strengths.length > 0) {
        highlights.push(...evaluation.strengths.slice(0, 3));
      }

      // Generate recognition
      if (evaluation.performance.overallRating >= 4.5) {
        recognition.push('Outstanding performance - exceeded expectations');
      } else if (evaluation.performance.overallRating >= 4.0) {
        recognition.push('Excellent work - consistently high quality');
      }

      if (evaluation.performance.teamwork >= 4.5) {
        recognition.push('Great teamwork - supported the team effectively');
      }

      return {
        employeeId: member.employeeId,
        employeeName: member.employeeName,
        role: member.role,
        rating: evaluation.performance.overallRating,
        highlights,
        recognition,
      };
    });
  }

  /**
   * Identify team highlights
   */
  private identifyTeamHighlights(
    evaluations: any[],
    performance: PostShiftMetrics['performance']
  ): PostShiftMetrics['teamHighlights'] {
    const highlights: PostShiftMetrics['teamHighlights'] = [];

    // Excellence highlight
    if (performance.overallRating >= 4.5) {
      highlights.push({
        type: 'excellence',
        description: 'Team achieved exceptional overall performance',
        contributors: evaluations.filter(e => e.performance.overallRating >= 4.5).map(e => e.employeeName),
      });
    }

    // Collaboration highlight
    if (performance.teamwork >= 4.5) {
      highlights.push({
        type: 'collaboration',
        description: 'Excellent teamwork and collaboration throughout shift',
        contributors: evaluations.filter(e => e.performance.teamwork >= 4.5).map(e => e.employeeName),
      });
    }

    // Quality highlight
    if (performance.quality >= 4.5) {
      highlights.push({
        type: 'excellence',
        description: 'Consistently high quality standards maintained',
        contributors: evaluations.filter(e => e.performance.quality >= 4.5).map(e => e.employeeName),
      });
    }

    // Improvement highlight (if significant improvement from previous)
    // This would require previous shift data

    return highlights;
  }

  /**
   * Generate motivation content
   */
  private generateMotivation(
    performance: PostShiftMetrics['performance'],
    goals: PostShiftMetrics['goals'],
    highlights: PostShiftMetrics['teamHighlights']
  ): PostShiftMetrics['motivation'] {
    const achievements: string[] = [];
    const recognition: string[] = [];
    const encouragement: string[] = [];
    const nextShiftGoals: string[] = [];

    // Achievements
    if (performance.overallRating >= 4.5) {
      achievements.push('Outstanding shift performance - team exceeded expectations!');
    } else if (performance.overallRating >= 4.0) {
      achievements.push('Excellent shift - team performed at a high level');
    }

    if (goals.overallAchievement >= 100) {
      achievements.push('All shift goals achieved or exceeded!');
    } else if (goals.overallAchievement >= 80) {
      achievements.push('Most shift goals achieved - great work!');
    }

    // Recognition
    if (highlights.length > 0) {
      recognition.push(`${highlights.length} team highlight(s) - celebrate these wins!`);
    }

    if (performance.teamwork >= 4.5) {
      recognition.push('Team collaboration was exceptional - this is what great teams do!');
    }

    // Encouragement
    if (performance.overallRating < 3.5) {
      encouragement.push('Every shift is a learning opportunity - focus on the improvements made');
      encouragement.push('Team showed resilience - keep building on today\'s experience');
    } else if (performance.overallRating < 4.0) {
      encouragement.push('Solid performance - continue building on today\'s foundation');
    } else {
      encouragement.push('Outstanding work - this is the standard to maintain!');
    }

    // Next shift goals
    if (performance.quality < 4.0) {
      nextShiftGoals.push('Focus on quality consistency in next shift');
    }
    if (performance.teamwork < 4.0) {
      nextShiftGoals.push('Enhance team communication and collaboration');
    }
    if (performance.efficiency < 80) {
      nextShiftGoals.push('Improve operational efficiency');
    }

    if (nextShiftGoals.length === 0) {
      nextShiftGoals.push('Maintain current high performance standards');
    }

    return {
      achievements,
      recognition,
      encouragement,
      nextShiftGoals,
    };
  }

  /**
   * Generate comparison metrics
   */
  private async generateComparison(
    shift: ShiftTeam,
    performance: PostShiftMetrics['performance'],
    orgId: string
  ): Promise<PostShiftMetrics['comparison']> {
    // Get pre-shift prediction
    const briefing = await preShiftBriefingService.generateBriefing(shift, orgId);
    const predicted = briefing.performancePrediction.expectedRating;
    const actual = performance.overallRating;
    const variance = predicted > 0 ? ((actual - predicted) / predicted) * 100 : 0;

    // Get previous shift (in production, fetch from database)
    const previousShift = await this.getPreviousShift(shift, orgId);
    const previous = previousShift ? previousShift.performance.overallRating : 0;
    const change = previous > 0 ? ((actual - previous) / previous) * 100 : 0;

    // Get team average (in production, calculate from recent shifts)
    const teamAverage = await this.getTeamAverage(shift, orgId);
    const rank = await this.getShiftRank(shift, performance.overallRating, orgId);

    return {
      vsPreShiftPrediction: {
        predicted,
        actual,
        variance,
      },
      vsPreviousShift: {
        previous,
        current: actual,
        change,
      },
      vsTeamAverage: {
        teamAverage,
        shiftRating: actual,
        rank,
      },
    };
  }

  /**
   * Generate insights
   */
  private generateInsights(
    performance: PostShiftMetrics['performance'],
    goals: PostShiftMetrics['goals'],
    comparison: PostShiftMetrics['comparison']
  ): string[] {
    const insights: string[] = [];

    // Performance insights
    if (comparison.vsPreShiftPrediction.variance > 10) {
      insights.push(`Exceeded prediction by ${comparison.vsPreShiftPrediction.variance.toFixed(1)}% - team performed better than expected!`);
    } else if (comparison.vsPreShiftPrediction.variance < -10) {
      insights.push(`Below prediction by ${Math.abs(comparison.vsPreShiftPrediction.variance).toFixed(1)}% - review what could be improved`);
    }

    // Trend insights
    if (comparison.vsPreviousShift.change > 5) {
      insights.push(`Improved ${comparison.vsPreviousShift.change.toFixed(1)}% from previous shift - positive trend!`);
    } else if (comparison.vsPreviousShift.change < -5) {
      insights.push(`Declined ${Math.abs(comparison.vsPreviousShift.change).toFixed(1)}% from previous shift - identify improvement areas`);
    }

    // Goal insights
    if (goals.overallAchievement >= 100) {
      insights.push('All goals achieved - excellent goal-setting and execution!');
    } else if (goals.overallAchievement < 70) {
      insights.push('Some goals missed - review goal setting and team capabilities');
    }

    return insights;
  }

  /**
   * Helper methods
   */

  private async getPreviousShift(shift: ShiftTeam, orgId: string): Promise<PostShiftMetrics | null> {
    // In production, query previous shift metrics
    return null;
  }

  private async getTeamAverage(shift: ShiftTeam, orgId: string): Promise<number> {
    // In production, calculate average from recent shifts
    return 4.0;
  }

  private async getShiftRank(shift: ShiftTeam, rating: number, orgId: string): Promise<number> {
    // In production, rank among recent shifts
    return 1;
  }
}

export const postShiftMetricsService = new PostShiftMetricsService();
