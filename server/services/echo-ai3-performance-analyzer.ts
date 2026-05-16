/**
 * EchoAI^3 Performance Analyzer
 * 
 * Deep analysis of employee performance, skills, and capabilities
 * Integrates with EchoAI^3 for comprehensive understanding
 * 
 * Features:
 * - Multi-dimensional skill analysis
 * - Performance pattern recognition
 * - Readiness scoring for roles
 * - Development recommendations
 * - Cross-training opportunities
 */

import { logger } from '../utils/logger.js';

export interface EmployeeSkill {
  skillCode: string;
  skillName: string;
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  certified: boolean;
  certifiedDate?: string;
  yearsExperience: number;
  performanceScore: number; // 0-100
  consistency: number; // 0-1
  lastAssessed: string;
}

export interface PerformanceMetrics {
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  
  // Core Metrics
  overallRating: number; // 0-100
  attendanceRate: number; // 0-100
  punctualityScore: number; // 0-100
  qualityScore: number; // 0-100
  teamworkScore: number; // 0-100
  guestFeedbackScore?: number; // 0-100 (for FOH)
  
  // Skills Matrix
  skills: EmployeeSkill[];
  primarySkills: string[]; // Top 3 skill codes
  secondarySkills: string[]; // Additional skill codes
  
  // Performance Trends
  trend: 'improving' | 'stable' | 'declining';
  trendData: Array<{ date: string; score: number }>;
  
  // Readiness Scores
  readinessScores: {
    currentRole: number; // 0-100
    promotion: number; // 0-100
    crossTraining: Record<string, number>; // role -> score
  };
  
  // Development Areas
  strengths: string[];
  developmentAreas: string[];
  recommendations: string[];
  
  // Availability & Preferences
  availability: {
    preferredDays: string[]; // ['monday', 'tuesday', ...]
    preferredTimes: string[]; // ['morning', 'afternoon', 'evening']
    unavailableDates: string[];
    maxHoursPerWeek: number;
    maxConsecutiveDays: number;
  };
  
  // AI Insights
  aiInsights: {
    workStyle: string; // e.g., "Detail-oriented, excels in high-pressure situations"
    bestFitRoles: string[]; // Roles where employee excels
    growthPotential: 'high' | 'medium' | 'low';
    riskFactors: string[]; // e.g., "May struggle with large banquet events"
    recommendations: string[];
  };
  
  lastUpdated: string;
}

export interface RoleRequirement {
  roleCode: string;
  roleName: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minimumProficiency: Record<string, 'beginner' | 'intermediate' | 'advanced' | 'expert'>;
  experienceYears?: number;
  certifications?: string[];
  physicalRequirements?: string[];
  languageRequirements?: string[];
}

export interface StaffMatch {
  employeeId: string;
  employeeName: string;
  matchScore: number; // 0-100
  roleFit: number; // 0-100
  skillFit: number; // 0-100
  performanceFit: number; // 0-100
  availabilityFit: number; // 0-100
  reasoning: string;
  gaps: string[]; // Missing skills or requirements
  strengths: string[]; // Why this employee is a good fit
}

class EchoAI3PerformanceAnalyzer {
  /**
   * Analyze employee performance with EchoAI^3
   */
  async analyzeEmployee(
    employeeId: string,
    orgId: string,
    includeAIInsights = true
  ): Promise<PerformanceMetrics | null> {
    try {
      logger.info(`[EchoAI3Performance] Analyzing employee ${employeeId}`);

      // Fetch employee data
      const employee = await this.fetchEmployeeData(employeeId, orgId);
      if (!employee) return null;

      // Fetch skills
      const skills = await this.fetchEmployeeSkills(employeeId, orgId);

      // Fetch performance ratings
      const ratings = await this.fetchRatings(employeeId, orgId);

      // Fetch attendance data
      const attendance = await this.fetchAttendance(employeeId, orgId);

      // Fetch availability constraints
      const availability = await this.fetchAvailability(employeeId, orgId);

      // Calculate core metrics
      const overallRating = this.calculateOverallRating(ratings);
      const attendanceRate = this.calculateAttendanceRate(attendance);
      const punctualityScore = this.calculatePunctualityScore(ratings);
      const qualityScore = this.calculateQualityScore(ratings);
      const teamworkScore = this.calculateTeamworkScore(ratings);
      const guestFeedbackScore = this.calculateGuestFeedbackScore(ratings);

      // Analyze trends
      const trend = this.analyzeTrend(ratings);
      const trendData = this.buildTrendData(ratings);

      // Calculate readiness scores
      const readinessScores = await this.calculateReadinessScores(
        employee,
        skills,
        ratings,
        orgId
      );

      // Identify strengths and development areas
      const { strengths, developmentAreas } = this.identifyStrengthsAndWeaknesses(
        skills,
        ratings,
        attendance
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        skills,
        ratings,
        developmentAreas,
        readinessScores
      );

      // Get AI insights if requested
      let aiInsights = {
        workStyle: '',
        bestFitRoles: [] as string[],
        growthPotential: 'medium' as const,
        riskFactors: [] as string[],
        recommendations: [] as string[],
      };

      if (includeAIInsights) {
        aiInsights = await this.getAIInsights(
          employee,
          skills,
          ratings,
          attendance,
          orgId
        );
      }

      return {
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        role: employee.role,
        overallRating,
        attendanceRate,
        punctualityScore,
        qualityScore,
        teamworkScore,
        guestFeedbackScore,
        skills,
        primarySkills: this.getPrimarySkills(skills),
        secondarySkills: this.getSecondarySkills(skills),
        trend,
        trendData,
        readinessScores,
        strengths,
        developmentAreas,
        recommendations,
        availability,
        aiInsights,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`[EchoAI3Performance] Error analyzing employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Match employees to role requirements
   */
  async matchEmployeesToRole(
    roleRequirement: RoleRequirement,
    orgId: string,
    filters?: {
      department?: string;
      excludeEmployeeIds?: string[];
      minMatchScore?: number;
    }
  ): Promise<StaffMatch[]> {
    try {
      logger.info(`[EchoAI3Performance] Matching employees to role ${roleRequirement.roleCode}`);

      // Fetch all eligible employees
      const employees = await this.fetchEligibleEmployees(orgId, filters);

      const matches: StaffMatch[] = [];

      for (const employee of employees) {
        const metrics = await this.analyzeEmployee(employee.id, orgId, false);
        if (!metrics) continue;

        // Calculate match scores
        const skillFit = this.calculateSkillFit(metrics.skills, roleRequirement);
        const performanceFit = this.calculatePerformanceFit(metrics, roleRequirement);
        const availabilityFit = this.calculateAvailabilityFit(metrics.availability, roleRequirement);
        const roleFit = (skillFit + performanceFit + availabilityFit) / 3;
        const matchScore = this.calculateOverallMatchScore(
          roleFit,
          skillFit,
          performanceFit,
          availabilityFit
        );

        // Identify gaps and strengths
        const gaps = this.identifyGaps(metrics.skills, roleRequirement);
        const strengths = this.identifyStrengths(metrics, roleRequirement);

        // Generate reasoning
        const reasoning = this.generateMatchReasoning(
          metrics,
          roleRequirement,
          matchScore,
          gaps,
          strengths
        );

        matches.push({
          employeeId: employee.id,
          employeeName: metrics.employeeName,
          matchScore,
          roleFit,
          skillFit,
          performanceFit,
          availabilityFit,
          reasoning,
          gaps,
          strengths,
        });
      }

      // Sort by match score descending
      return matches.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      logger.error(`[EchoAI3Performance] Error matching employees:`, error);
      throw error;
    }
  }

  /**
   * Get AI insights using EchoAI^3
   */
  private async getAIInsights(
    employee: any,
    skills: EmployeeSkill[],
    ratings: any[],
    attendance: any,
    orgId: string
  ): Promise<PerformanceMetrics['aiInsights']> {
    try {
      // In production, this would call EchoAI^3 API
      // For now, generate insights based on data patterns

      const topSkills = skills
        .sort((a, b) => b.performanceScore - a.performanceScore)
        .slice(0, 3);

      const workStyle = this.inferWorkStyle(skills, ratings, attendance);
      const bestFitRoles = this.inferBestFitRoles(skills, ratings);
      const growthPotential = this.inferGrowthPotential(ratings, skills);
      const riskFactors = this.identifyRiskFactors(ratings, attendance, skills);
      const recommendations = this.generateAIRecommendations(
        skills,
        ratings,
        attendance
      );

      return {
        workStyle,
        bestFitRoles,
        growthPotential,
        riskFactors,
        recommendations,
      };
    } catch (error) {
      logger.error('[EchoAI3Performance] Error getting AI insights:', error);
      return {
        workStyle: 'Analysis pending',
        bestFitRoles: [],
        growthPotential: 'medium',
        riskFactors: [],
        recommendations: [],
      };
    }
  }

  /**
   * Private helper methods
   */

  private async fetchEmployeeData(employeeId: string, orgId: string): Promise<any> {
    // In production, query database
    // For now, return mock data structure
    return {
      id: employeeId,
      firstName: 'John',
      lastName: 'Doe',
      department: 'Culinary',
      role: 'Saucier',
    };
  }

  private async fetchEmployeeSkills(employeeId: string, orgId: string): Promise<EmployeeSkill[]> {
    // In production, query staff_skills table
    return [];
  }

  private async fetchRatings(employeeId: string, orgId: string): Promise<any[]> {
    // In production, query ratings table
    return [];
  }

  private async fetchAttendance(employeeId: string, orgId: string): Promise<any> {
    // In production, query shifts and attendance data
    return { total: 0, present: 0 };
  }

  private async fetchAvailability(employeeId: string, orgId: string): Promise<PerformanceMetrics['availability']> {
    // In production, query staff_availability_constraints table
    return {
      preferredDays: [],
      preferredTimes: [],
      unavailableDates: [],
      maxHoursPerWeek: 40,
      maxConsecutiveDays: 5,
    };
  }

  private calculateOverallRating(ratings: any[]): number {
    if (ratings.length === 0) return 50;
    const total = ratings.reduce((sum, r) => sum + (r.total_score || 0), 0);
    return (total / ratings.length / 5) * 100;
  }

  private calculateAttendanceRate(attendance: any): number {
    if (attendance.total === 0) return 100;
    return (attendance.present / attendance.total) * 100;
  }

  private calculatePunctualityScore(ratings: any[]): number {
    if (ratings.length === 0) return 50;
    const punctuality = ratings.filter(r => r.punctuality && r.punctuality >= 4).length;
    return (punctuality / ratings.length) * 100;
  }

  private calculateQualityScore(ratings: any[]): number {
    if (ratings.length === 0) return 50;
    const total = ratings.reduce((sum, r) => sum + (r.quality || 0), 0);
    return (total / ratings.length / 5) * 100;
  }

  private calculateTeamworkScore(ratings: any[]): number {
    if (ratings.length === 0) return 50;
    const total = ratings.reduce((sum, r) => sum + (r.teamwork || 0), 0);
    return (total / ratings.length / 5) * 100;
  }

  private calculateGuestFeedbackScore(ratings: any[]): number | undefined {
    const withFeedback = ratings.filter(r => r.guest_feedback);
    if (withFeedback.length === 0) return undefined;
    const total = withFeedback.reduce((sum, r) => sum + (r.guest_feedback || 0), 0);
    return (total / withFeedback.length / 5) * 100;
  }

  private analyzeTrend(ratings: any[]): 'improving' | 'stable' | 'declining' {
    if (ratings.length < 4) return 'stable';
    const recent = ratings.slice(-4);
    const older = ratings.slice(0, -4);
    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, r) => sum + (r.total_score || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, r) => sum + (r.total_score || 0), 0) / older.length;

    if (recentAvg > olderAvg * 1.05) return 'improving';
    if (recentAvg < olderAvg * 0.95) return 'declining';
    return 'stable';
  }

  private buildTrendData(ratings: any[]): Array<{ date: string; score: number }> {
    return ratings
      .map(r => ({
        date: r.shift_date || r.created_at,
        score: (r.total_score || 0) / 5 * 100,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private async calculateReadinessScores(
    employee: any,
    skills: EmployeeSkill[],
    ratings: any[],
    orgId: string
  ): Promise<PerformanceMetrics['readinessScores']> {
    const currentRole = this.calculateCurrentRoleReadiness(skills, ratings);
    const promotion = this.calculatePromotionReadiness(skills, ratings);
    const crossTraining = await this.calculateCrossTrainingReadiness(skills, ratings, orgId);

    return {
      currentRole,
      promotion,
      crossTraining,
    };
  }

  private calculateCurrentRoleReadiness(skills: EmployeeSkill[], ratings: any[]): number {
    if (skills.length === 0) return 50;
    const avgSkillScore = skills.reduce((sum, s) => sum + s.performanceScore, 0) / skills.length;
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + (r.total_score || 0), 0) / ratings.length / 5 * 100
      : 50;
    return (avgSkillScore + avgRating) / 2;
  }

  private calculatePromotionReadiness(skills: EmployeeSkill[], ratings: any[]): number {
    // Higher weight on performance consistency and leadership skills
    const consistency = this.calculateConsistency(ratings);
    const leadershipSkills = skills.filter(s => 
      s.skillCode.includes('lead') || s.skillCode.includes('supervisor')
    );
    const leadershipScore = leadershipSkills.length > 0
      ? leadershipSkills.reduce((sum, s) => sum + s.performanceScore, 0) / leadershipSkills.length
      : 0;

    return (consistency * 0.6 + leadershipScore * 0.4);
  }

  private async calculateCrossTrainingReadiness(
    skills: EmployeeSkill[],
    ratings: any[],
    orgId: string
  ): Promise<Record<string, number>> {
    // In production, analyze skills against other roles
    return {};
  }

  private calculateConsistency(ratings: any[]): number {
    if (ratings.length < 2) return 50;
    const scores = ratings.map(r => r.total_score || 0);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    // Lower stdDev = higher consistency
    return Math.max(0, 100 - (stdDev * 20));
  }

  private identifyStrengthsAndWeaknesses(
    skills: EmployeeSkill[],
    ratings: any[],
    attendance: any
  ): { strengths: string[]; developmentAreas: string[] } {
    const strengths: string[] = [];
    const developmentAreas: string[] = [];

    // Analyze skills
    const topSkills = skills
      .filter(s => s.performanceScore >= 80)
      .map(s => s.skillName);
    strengths.push(...topSkills);

    const weakSkills = skills
      .filter(s => s.performanceScore < 60)
      .map(s => s.skillName);
    developmentAreas.push(...weakSkills);

    // Analyze attendance
    if (attendance.present / attendance.total >= 0.95) {
      strengths.push('Excellent attendance');
    } else if (attendance.present / attendance.total < 0.85) {
      developmentAreas.push('Improve attendance reliability');
    }

    // Analyze ratings
    if (ratings.length > 0) {
      const avgRating = ratings.reduce((sum, r) => sum + (r.total_score || 0), 0) / ratings.length;
      if (avgRating >= 4.5) {
        strengths.push('Consistently high performance ratings');
      } else if (avgRating < 3.5) {
        developmentAreas.push('Improve overall performance quality');
      }
    }

    return { strengths, developmentAreas };
  }

  private generateRecommendations(
    skills: EmployeeSkill[],
    ratings: any[],
    developmentAreas: string[],
    readinessScores: PerformanceMetrics['readinessScores']
  ): string[] {
    const recommendations: string[] = [];

    if (readinessScores.promotion >= 80) {
      recommendations.push('Consider for promotion or leadership role');
    }

    if (developmentAreas.length > 0) {
      recommendations.push(`Focus on: ${developmentAreas.join(', ')}`);
    }

    const lowSkills = skills.filter(s => s.performanceScore < 60);
    if (lowSkills.length > 0) {
      recommendations.push(`Additional training recommended for: ${lowSkills.map(s => s.skillName).join(', ')}`);
    }

    if (readinessScores.crossTraining && Object.keys(readinessScores.crossTraining).length > 0) {
      const topCrossTraining = Object.entries(readinessScores.crossTraining)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([role]) => role);
      recommendations.push(`Cross-training opportunities: ${topCrossTraining.join(', ')}`);
    }

    return recommendations;
  }

  private getPrimarySkills(skills: EmployeeSkill[]): string[] {
    return skills
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 3)
      .map(s => s.skillCode);
  }

  private getSecondarySkills(skills: EmployeeSkill[]): string[] {
    return skills
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(3)
      .map(s => s.skillCode);
  }

  private inferWorkStyle(skills: EmployeeSkill[], ratings: any[], attendance: any): string {
    // Analyze patterns to infer work style
    const highPressureSkills = skills.filter(s => 
      s.skillCode.includes('expedite') || s.skillCode.includes('rush')
    );
    const detailSkills = skills.filter(s => 
      s.skillCode.includes('plating') || s.skillCode.includes('presentation')
    );

    if (highPressureSkills.length > 0 && detailSkills.length > 0) {
      return 'Thrives in high-pressure situations while maintaining attention to detail';
    } else if (highPressureSkills.length > 0) {
      return 'Excels in fast-paced, high-pressure environments';
    } else if (detailSkills.length > 0) {
      return 'Detail-oriented, best suited for precision work';
    } else {
      return 'Consistent performer, reliable team member';
    }
  }

  private inferBestFitRoles(skills: EmployeeSkill[], ratings: any[]): string[] {
    // Map skills to roles
    const roleMap: Record<string, string[]> = {
      'prep_chef': ['Prep Station', 'Garde Manger'],
      'saucier': ['Sauce Station', 'Hot Line'],
      'pastry_chef': ['Pastry Station', 'Bakery'],
      'banquet_server': ['Banquet Service', 'Event Service'],
      'captain': ['Service Captain', 'Floor Manager'],
      'food_runner': ['Expediting', 'Food Runner'],
    };

    const topSkills = skills
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 3);

    const roles = new Set<string>();
    for (const skill of topSkills) {
      const mappedRoles = roleMap[skill.skillCode] || [];
      mappedRoles.forEach(r => roles.add(r));
    }

    return Array.from(roles);
  }

  private inferGrowthPotential(ratings: any[], skills: EmployeeSkill[]): 'high' | 'medium' | 'low' {
    if (ratings.length < 3) return 'medium';
    
    const trend = this.analyzeTrend(ratings);
    const skillDiversity = new Set(skills.map(s => s.skillCode)).size;
    const avgSkillLevel = skills.length > 0
      ? skills.reduce((sum, s) => {
          const levelMap = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
          return sum + levelMap[s.proficiencyLevel];
        }, 0) / skills.length
      : 0;

    if (trend === 'improving' && skillDiversity >= 3 && avgSkillLevel >= 2.5) {
      return 'high';
    } else if (trend === 'declining' || skillDiversity < 2) {
      return 'low';
    }
    return 'medium';
  }

  private identifyRiskFactors(ratings: any[], attendance: any, skills: EmployeeSkill[]): string[] {
    const risks: string[] = [];

    if (attendance.present / attendance.total < 0.85) {
      risks.push('Attendance reliability concerns');
    }

    const recentRatings = ratings.slice(-5);
    if (recentRatings.length > 0) {
      const avgRecent = recentRatings.reduce((sum, r) => sum + (r.total_score || 0), 0) / recentRatings.length;
      if (avgRecent < 3.0) {
        risks.push('Recent performance decline');
      }
    }

    const criticalSkills = skills.filter(s => 
      s.proficiencyLevel === 'beginner' && 
      (s.skillCode.includes('safety') || s.skillCode.includes('certified'))
    );
    if (criticalSkills.length > 0) {
      risks.push('Missing critical certifications or safety training');
    }

    return risks;
  }

  private generateAIRecommendations(
    skills: EmployeeSkill[],
    ratings: any[],
    attendance: any
  ): string[] {
    const recommendations: string[] = [];

    if (ratings.length < 5) {
      recommendations.push('More performance data needed for accurate assessment');
    }

    const lowSkills = skills.filter(s => s.performanceScore < 60);
    if (lowSkills.length > 0) {
      recommendations.push(`Consider targeted training for: ${lowSkills.map(s => s.skillName).join(', ')}`);
    }

    if (attendance.present / attendance.total < 0.90) {
      recommendations.push('Address attendance patterns to improve reliability');
    }

    return recommendations;
  }

  private calculateSkillFit(skills: EmployeeSkill[], requirement: RoleRequirement): number {
    let score = 0;
    let maxScore = 0;

    // Required skills (weight: 2x)
    for (const reqSkill of requirement.requiredSkills) {
      maxScore += 2;
      const employeeSkill = skills.find(s => s.skillCode === reqSkill);
      if (employeeSkill) {
        const levelMap = { beginner: 0.5, intermediate: 0.75, advanced: 0.9, expert: 1.0 };
        score += levelMap[employeeSkill.proficiencyLevel] * 2;
      }
    }

    // Preferred skills (weight: 1x)
    for (const prefSkill of requirement.preferredSkills) {
      maxScore += 1;
      const employeeSkill = skills.find(s => s.skillCode === prefSkill);
      if (employeeSkill) {
        const levelMap = { beginner: 0.5, intermediate: 0.75, advanced: 0.9, expert: 1.0 };
        score += levelMap[employeeSkill.proficiencyLevel];
      }
    }

    return maxScore > 0 ? (score / maxScore) * 100 : 0;
  }

  private calculatePerformanceFit(metrics: PerformanceMetrics, requirement: RoleRequirement): number {
    // Weighted average of performance metrics
    return (
      metrics.overallRating * 0.4 +
      metrics.attendanceRate * 0.3 +
      metrics.qualityScore * 0.3
    );
  }

  private calculateAvailabilityFit(
    availability: PerformanceMetrics['availability'],
    requirement: RoleRequirement
  ): number {
    // In production, check against specific schedule requirements
    // For now, return a base score
    return 80;
  }

  private calculateOverallMatchScore(
    roleFit: number,
    skillFit: number,
    performanceFit: number,
    availabilityFit: number
  ): number {
    // Weighted combination
    return (
      roleFit * 0.3 +
      skillFit * 0.3 +
      performanceFit * 0.25 +
      availabilityFit * 0.15
    );
  }

  private identifyGaps(skills: EmployeeSkill[], requirement: RoleRequirement): string[] {
    const gaps: string[] = [];

    for (const reqSkill of requirement.requiredSkills) {
      const employeeSkill = skills.find(s => s.skillCode === reqSkill);
      if (!employeeSkill) {
        gaps.push(`Missing required skill: ${reqSkill}`);
      } else {
        const requiredLevel = requirement.minimumProficiency[reqSkill];
        const levelMap = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
        const requiredLevelNum = levelMap[requiredLevel] || 1;
        const employeeLevelNum = levelMap[employeeSkill.proficiencyLevel];
        if (employeeLevelNum < requiredLevelNum) {
          gaps.push(`${reqSkill} proficiency below required (${employeeSkill.proficiencyLevel} < ${requiredLevel})`);
        }
      }
    }

    return gaps;
  }

  private identifyStrengths(metrics: PerformanceMetrics, requirement: RoleRequirement): string[] {
    const strengths: string[] = [];

    if (metrics.overallRating >= 85) {
      strengths.push('Consistently high performance');
    }

    const matchingSkills = metrics.skills.filter(s =>
      requirement.requiredSkills.includes(s.skillCode) ||
      requirement.preferredSkills.includes(s.skillCode)
    );
    if (matchingSkills.length > 0) {
      strengths.push(`Strong in: ${matchingSkills.map(s => s.skillName).join(', ')}`);
    }

    if (metrics.attendanceRate >= 95) {
      strengths.push('Excellent attendance record');
    }

    return strengths;
  }

  private generateMatchReasoning(
    metrics: PerformanceMetrics,
    requirement: RoleRequirement,
    matchScore: number,
    gaps: string[],
    strengths: string[]
  ): string {
    if (matchScore >= 90) {
      return `Excellent match. ${strengths.join('. ')}. Ready for immediate assignment.`;
    } else if (matchScore >= 75) {
      return `Good match. ${strengths.join('. ')}. ${gaps.length > 0 ? `Minor gaps: ${gaps.join(', ')}.` : ''}`;
    } else if (matchScore >= 60) {
      return `Moderate match. ${strengths.join('. ')}. Requires attention to: ${gaps.join(', ')}.`;
    } else {
      return `Limited match. Significant gaps: ${gaps.join(', ')}. Consider training before assignment.`;
    }
  }

  private async fetchEligibleEmployees(orgId: string, filters?: any): Promise<any[]> {
    // In production, query employees table with filters
    return [];
  }
}

export const echoAI3PerformanceAnalyzer = new EchoAI3PerformanceAnalyzer();
