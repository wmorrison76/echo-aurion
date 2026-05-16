/**
 * Pre-Shift Briefing System
 * 
 * Helps managers get the most from their team
 * Provides insights for assembled shift groups
 * 
 * Features:
 * - Team composition analysis
 * - Shift-specific insights
 * - Performance predictions
 * - Team dynamics analysis
 * - Focus areas for the shift
 */

import { logger } from '../utils/logger.js';
import { echoAI3PerformanceAnalyzer } from './echo-ai3-performance-analyzer.js';

export interface ShiftTeam {
  shiftId: string;
  date: string;
  shiftStart: string;
  shiftEnd: string;
  outletId?: string;
  eventId?: string;
  teamMembers: Array<{
    employeeId: string;
    employeeName: string;
    role: string;
    roleCode: string;
    startTime: string;
    endTime: string;
  }>;
}

export interface PreShiftBriefing {
  shiftId: string;
  date: string;
  shiftTime: string;
  teamSize: number;
  teamComposition: {
    roles: Record<string, number>; // role -> count
    experienceLevel: {
      expert: number;
      advanced: number;
      intermediate: number;
      beginner: number;
    };
    averageRating: number;
    teamStrengths: string[];
    potentialGaps: string[];
  };
  teamDynamics: {
    collaborationScore: number; // 0-100
    communicationScore: number; // 0-100
    leadershipPresence: boolean;
    identifiedLeaders: string[];
    potentialChallenges: string[];
  };
  shiftContext: {
    eventType?: string;
    guestCount?: number;
    serviceType?: string;
    difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    workload: 'light' | 'moderate' | 'heavy' | 'extreme';
  };
  focusAreas: Array<{
    area: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    recommendedActions: string[];
  }>;
  performancePrediction: {
    expectedRating: number; // 1-5
    confidence: number; // 0-100
    riskFactors: string[];
    successFactors: string[];
  };
  managerTips: string[];
  aiInsights: {
    teamSynergy: string; // How well the team works together
    optimalDeployment: string; // Best way to deploy this team
    watchPoints: string[]; // Things to watch during shift
    motivationStrategies: string[]; // How to motivate this specific team
  };
}

class PreShiftBriefingService {
  /**
   * Generate pre-shift briefing for a team
   */
  async generateBriefing(
    shift: ShiftTeam,
    orgId: string
  ): Promise<PreShiftBriefing> {
    try {
      logger.info(`[PreShiftBriefing] Generating briefing for shift ${shift.shiftId}`);

      // Analyze each team member
      const teamAnalyses = await Promise.all(
        shift.teamMembers.map(member =>
          echoAI3PerformanceAnalyzer.analyzeEmployee(member.employeeId, orgId, true)
        )
      );

      // Analyze team composition
      const teamComposition = this.analyzeTeamComposition(shift.teamMembers, teamAnalyses);

      // Analyze team dynamics
      const teamDynamics = this.analyzeTeamDynamics(teamAnalyses);

      // Get shift context
      const shiftContext = await this.getShiftContext(shift, orgId);

      // Identify focus areas
      const focusAreas = this.identifyFocusAreas(teamAnalyses, shiftContext);

      // Predict performance
      const performancePrediction = this.predictPerformance(teamAnalyses, shiftContext);

      // Generate manager tips
      const managerTips = this.generateManagerTips(teamAnalyses, teamDynamics, shiftContext);

      // Get AI insights
      const aiInsights = await this.generateAIBriefingInsights(
        teamAnalyses,
        teamDynamics,
        shiftContext
      );

      return {
        shiftId: shift.shiftId,
        date: shift.date,
        shiftTime: `${shift.shiftStart} - ${shift.shiftEnd}`,
        teamSize: shift.teamMembers.length,
        teamComposition,
        teamDynamics,
        shiftContext,
        focusAreas,
        performancePrediction,
        managerTips,
        aiInsights,
      };
    } catch (error) {
      logger.error('[PreShiftBriefing] Error generating briefing:', error);
      throw error;
    }
  }

  /**
   * Analyze team composition
   */
  private analyzeTeamComposition(
    members: ShiftTeam['teamMembers'],
    analyses: any[]
  ): PreShiftBriefing['teamComposition'] {
    const roles: Record<string, number> = {};
    const experienceLevel = { expert: 0, advanced: 0, intermediate: 0, beginner: 0 };
    let totalRating = 0;
    const strengths = new Set<string>();
    const gaps = new Set<string>();

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const analysis = analyses[i];

      // Count roles
      roles[member.role] = (roles[member.role] || 0) + 1;

      // Count experience
      if (analysis) {
        const skills = analysis.skills || [];
        const maxLevel = skills.length > 0
          ? Math.max(...skills.map((s: any) => {
              const levelMap = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
              return levelMap[s.proficiencyLevel] || 1;
            }))
          : 1;

        if (maxLevel >= 4) experienceLevel.expert++;
        else if (maxLevel >= 3) experienceLevel.advanced++;
        else if (maxLevel >= 2) experienceLevel.intermediate++;
        else experienceLevel.beginner++;

        totalRating += analysis.overallRating || 0;

        // Collect strengths and gaps
        analysis.strengths?.forEach((s: string) => strengths.add(s));
        analysis.developmentAreas?.forEach((a: string) => gaps.add(a));
      }
    }

    const averageRating = members.length > 0 ? totalRating / members.length : 0;

    return {
      roles,
      experienceLevel,
      averageRating,
      teamStrengths: Array.from(strengths).slice(0, 5),
      potentialGaps: Array.from(gaps).slice(0, 5),
    };
  }

  /**
   * Analyze team dynamics
   */
  private analyzeTeamDynamics(analyses: any[]): PreShiftBriefing['teamDynamics'] {
    const validAnalyses = analyses.filter(a => a);

    if (validAnalyses.length === 0) {
      return {
        collaborationScore: 50,
        communicationScore: 50,
        leadershipPresence: false,
        identifiedLeaders: [],
        potentialChallenges: [],
      };
    }

    // Calculate collaboration score (based on teamwork ratings)
    const teamworkScores = validAnalyses.map(a => a.teamworkScore || 0);
    const collaborationScore = teamworkScores.reduce((a, b) => a + b, 0) / teamworkScores.length;

    // Calculate communication score
    const communicationScores = validAnalyses.map(a => a.performance?.communication || a.communicationScore || 0);
    const communicationScore = communicationScores.reduce((a, b) => a + b, 0) / communicationScores.length;

    // Identify leaders (high readiness scores, leadership skills)
    const identifiedLeaders = validAnalyses
      .filter(a => a.readinessScores?.promotion >= 80 || a.skills?.some((s: any) => s.skillCode.includes('lead')))
      .map(a => a.employeeName)
      .slice(0, 3);

    const leadershipPresence = identifiedLeaders.length > 0;

    // Identify potential challenges
    const challenges: string[] = [];
    const lowPerformers = validAnalyses.filter(a => a.overallRating < 70);
    if (lowPerformers.length > 0) {
      challenges.push(`${lowPerformers.length} team member(s) below target performance`);
    }

    const lowCommunication = validAnalyses.filter(a => (a.performance?.communication || 0) < 70);
    if (lowCommunication.length > validAnalyses.length / 2) {
      challenges.push('Communication may be a challenge - focus on clear instructions');
    }

    return {
      collaborationScore,
      communicationScore,
      leadershipPresence,
      identifiedLeaders,
      potentialChallenges: challenges,
    };
  }

  /**
   * Get shift context
   */
  private async getShiftContext(
    shift: ShiftTeam,
    orgId: string
  ): Promise<PreShiftBriefing['shiftContext']> {
    // In production, fetch event/BEO data
    // For now, return default
    return {
      difficulty: 'medium',
      workload: 'moderate',
    };
  }

  /**
   * Identify focus areas for the shift
   */
  private identifyFocusAreas(
    analyses: any[],
    context: PreShiftBriefing['shiftContext']
  ): PreShiftBriefing['focusAreas'] {
    const focusAreas: PreShiftBriefing['focusAreas'] = [];

    // Check for communication gaps
    const lowComm = analyses.filter(a => (a.performance?.communication || a.communicationScore || 0) < 70);
    if (lowComm.length > 0) {
      focusAreas.push({
        area: 'Communication',
        priority: lowComm.length > analyses.length / 2 ? 'critical' : 'high',
        description: `${lowComm.length} team member(s) have communication challenges`,
        recommendedActions: [
          'Hold brief pre-shift huddle to align on communication',
          'Assign clear roles and responsibilities',
          'Use visual cues and check-ins throughout shift',
        ],
      });
    }

    // Check for quality concerns
    const lowQuality = analyses.filter(a => (a.performance?.quality || a.qualityScore || 0) < 70);
    if (lowQuality.length > 0) {
      focusAreas.push({
        area: 'Quality',
        priority: 'high',
        description: `${lowQuality.length} team member(s) need quality focus`,
        recommendedActions: [
          'Review quality standards at shift start',
          'Provide real-time feedback during shift',
          'Pair with high performers for mentoring',
        ],
      });
    }

    // Context-specific focus areas
    if (context.difficulty === 'hard' || context.difficulty === 'expert') {
      focusAreas.push({
        area: 'High-Pressure Management',
        priority: 'critical',
        description: 'Complex shift requires extra coordination',
        recommendedActions: [
          'Increase communication frequency',
          'Designate shift leader for coordination',
          'Plan for potential bottlenecks',
        ],
      });
    }

    return focusAreas;
  }

  /**
   * Predict shift performance
   */
  private predictPerformance(
    analyses: any[],
    context: PreShiftBriefing['shiftContext']
  ): PreShiftBriefing['performancePrediction'] {
    const validAnalyses = analyses.filter(a => a);
    if (validAnalyses.length === 0) {
      return {
        expectedRating: 3.0,
        confidence: 0,
        riskFactors: [],
        successFactors: [],
      };
    }

    // Calculate expected rating
    const avgRating = validAnalyses.reduce((sum, a) => sum + (a.overallRating || 0), 0) / validAnalyses.length;
    const expectedRating = avgRating / 20; // Convert from 0-100 to 1-5 scale

    // Adjust for context
    let adjustedRating = expectedRating;
    if (context.difficulty === 'expert') adjustedRating *= 0.9;
    if (context.difficulty === 'hard') adjustedRating *= 0.95;
    if (context.workload === 'extreme') adjustedRating *= 0.9;

    // Identify risk factors
    const riskFactors: string[] = [];
    const lowPerformers = validAnalyses.filter(a => (a.overallRating || 0) < 70);
    if (lowPerformers.length > validAnalyses.length / 3) {
      riskFactors.push('Significant number of team members below target performance');
    }

    if (context.difficulty === 'expert' && validAnalyses.filter(a => (a.overallRating || 0) < 85).length > 0) {
      riskFactors.push('Complex shift with team members not at expert level');
    }

    // Identify success factors
    const successFactors: string[] = [];
    const highPerformers = validAnalyses.filter(a => (a.overallRating || 0) >= 85);
    if (highPerformers.length > 0) {
      successFactors.push(`${highPerformers.length} high-performing team member(s) can lead by example`);
    }

    const leaders = validAnalyses.filter(a => a.readinessScores?.promotion >= 80);
    if (leaders.length > 0) {
      successFactors.push('Strong leadership presence in team');
    }

    const confidence = Math.min(100, 60 + (validAnalyses.length * 5));

    return {
      expectedRating: Math.max(1, Math.min(5, adjustedRating)),
      confidence,
      riskFactors,
      successFactors,
    };
  }

  /**
   * Generate manager tips
   */
  private generateManagerTips(
    analyses: any[],
    dynamics: PreShiftBriefing['teamDynamics'],
    context: PreShiftBriefing['shiftContext']
  ): string[] {
    const tips: string[] = [];

    // Team composition tips
    if (dynamics.leadershipPresence) {
      tips.push(`Leverage ${dynamics.identifiedLeaders.join(' and ')} as shift leaders`);
    } else {
      tips.push('No clear leaders identified - manager should provide extra guidance');
    }

    // Communication tips
    if (dynamics.communicationScore < 70) {
      tips.push('Start shift with clear communication expectations and check-in schedule');
    }

    // Context-specific tips
    if (context.difficulty === 'expert' || context.workload === 'extreme') {
      tips.push('High-pressure shift - increase check-ins and provide extra support');
    }

    // Performance tips
    const avgRating = analyses.filter(a => a).reduce((sum, a) => sum + (a.overallRating || 0), 0) / analyses.filter(a => a).length;
    if (avgRating >= 85) {
      tips.push('Strong team - empower them to take initiative and excel');
    } else if (avgRating < 70) {
      tips.push('Team needs extra support - be available and provide frequent feedback');
    }

    return tips;
  }

  /**
   * Generate AI insights for briefing
   */
  private async generateAIBriefingInsights(
    analyses: any[],
    dynamics: PreShiftBriefing['teamDynamics'],
    context: PreShiftBriefing['shiftContext']
  ): Promise<PreShiftBriefing['aiInsights']> {
    const validAnalyses = analyses.filter(a => a);

    // Analyze team synergy
    const avgRating = validAnalyses.reduce((sum, a) => sum + (a.overallRating || 0), 0) / validAnalyses.length;
    const avgTeamwork = validAnalyses.reduce((sum, a) => sum + (a.teamworkScore || 0), 0) / validAnalyses.length;

    let teamSynergy = '';
    if (avgRating >= 85 && avgTeamwork >= 85) {
      teamSynergy = 'Excellent team synergy - high performers who work well together';
    } else if (avgRating >= 75 && avgTeamwork >= 75) {
      teamSynergy = 'Good team synergy - solid performers with decent collaboration';
    } else {
      teamSynergy = 'Team synergy needs attention - focus on communication and collaboration';
    }

    // Optimal deployment
    const leaders = dynamics.identifiedLeaders;
    let optimalDeployment = '';
    if (leaders.length > 0) {
      optimalDeployment = `Deploy ${leaders[0]} as shift coordinator, distribute other leaders across key stations`;
    } else {
      optimalDeployment = 'Manager should take active coordination role, assign clear responsibilities';
    }

    // Watch points
    const watchPoints: string[] = [];
    const lowPerformers = validAnalyses.filter(a => (a.overallRating || 0) < 70);
    if (lowPerformers.length > 0) {
      watchPoints.push(`Monitor ${lowPerformers.map(a => a.employeeName).join(', ')} for performance support`);
    }

    if (dynamics.communicationScore < 70) {
      watchPoints.push('Watch for communication breakdowns - intervene early');
    }

    if (context.difficulty === 'expert') {
      watchPoints.push('High complexity - watch for bottlenecks and stress points');
    }

    // Motivation strategies
    const motivationStrategies: string[] = [];
    const highPerformers = validAnalyses.filter(a => (a.overallRating || 0) >= 85);
    if (highPerformers.length > 0) {
      motivationStrategies.push(`Recognize ${highPerformers[0].employeeName} and other high performers publicly`);
    }

    if (context.workload === 'heavy' || context.workload === 'extreme') {
      motivationStrategies.push('Acknowledge the challenging workload and celebrate small wins');
    }

    motivationStrategies.push('Set clear goals for the shift and track progress');

    return {
      teamSynergy,
      optimalDeployment,
      watchPoints,
      motivationStrategies,
    };
  }
}

export const preShiftBriefingService = new PreShiftBriefingService();
