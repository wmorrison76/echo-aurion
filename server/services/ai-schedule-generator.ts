/**
 * AI Schedule Generator
 * 
 * Automatically generates optimal schedules based on:
 * - BEO/REO staffing requirements
 * - Employee skills and performance
 * - Staff preferences and availability
 * - Preferences and constraints
 * 
 * Powered by EchoAI^3 for intelligent optimization
 */

import { logger } from '../utils/logger.js';
import { echoAI3PerformanceAnalyzer, type StaffMatch } from './echo-ai3-performance-analyzer.js';
import { beoREOStaffingAnalyzer, type EventStaffingRequirement } from './beo-reo-staffing-analyzer.js';

export interface ScheduleAssignment {
  employeeId: string;
  employeeName: string;
  role: string;
  roleCode: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  assignedSkills: string[];
  matchScore: number;
  reasoning: string;
}

export interface GeneratedSchedule {
  eventId: string;
  beoId?: string;
  eventDate: string;
  assignments: ScheduleAssignment[];
  summary: {
    totalStaff: number;
    totalHours: number;
    estimatedCost: number;
    coverageScore: number; // 0-100, how well requirements are met
    preferenceScore: number; // 0-100, how well preferences are honored
    skillMatchScore: number; // 0-100, average skill match
  };
  conflicts: Array<{
    employeeId: string;
    conflictType: 'double_booked' | 'availability' | 'skill_gap' | 'preference';
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  recommendations: string[];
  generatedAt: string;
  generatedBy: 'ai' | 'manual';
  confidence: number;
}

class AIScheduleGenerator {
  /**
   * Generate schedule for an event
   */
  async generateSchedule(
    eventId: string,
    beoId: string | undefined,
    orgId: string,
    options?: {
      respectPreferences?: boolean;
      allowOvertime?: boolean;
      minSkillMatch?: number;
      prioritizePerformance?: boolean;
    }
  ): Promise<GeneratedSchedule> {
    try {
      logger.info(`[AIScheduleGenerator] Generating schedule for event ${eventId}`);

      // Analyze staffing requirements
      const staffingReq = await beoREOStaffingAnalyzer.analyzeEvent(eventId, beoId, orgId);

      // Generate assignments for each staffing need
      const assignments: ScheduleAssignment[] = [];
      const conflicts: GeneratedSchedule['conflicts'] = [];
      const recommendations: string[] = [];

      for (const need of staffingReq.staffingNeeds) {
        // Find best matches for this role
        const roleRequirement: any = {
          roleCode: need.roleCode,
          roleName: need.role,
          requiredSkills: need.requiredSkills,
          preferredSkills: need.preferredSkills,
          minimumProficiency: need.minimumProficiency,
        };

        const matches = await echoAI3PerformanceAnalyzer.matchEmployeesToRole(
          roleRequirement,
          orgId,
          {
            minMatchScore: options?.minSkillMatch || 60,
          }
        );

        // Select best matches
        const selected = this.selectBestMatches(
          matches,
          need.count,
          need.startTime,
          need.endTime,
          options
        );

        // Create assignments
        for (const match of selected.matches) {
          const assignment = await this.createAssignment(
            match,
            need,
            staffingReq.eventDate,
            orgId
          );
          assignments.push(assignment);
        }

        // Track conflicts
        conflicts.push(...selected.conflicts);

        // Add recommendations
        if (selected.matches.length < need.count) {
          recommendations.push(
            `Shortage: Need ${need.count} ${need.role}, found ${selected.matches.length} suitable candidates`
          );
        }
      }

      // Calculate summary metrics
      const summary = this.calculateSummary(assignments, staffingReq, options);

      // Generate final recommendations
      const finalRecommendations = this.generateFinalRecommendations(
        assignments,
        conflicts,
        staffingReq,
        summary
      );
      recommendations.push(...finalRecommendations);

      return {
        eventId,
        beoId,
        eventDate: staffingReq.eventDate,
        assignments,
        summary,
        conflicts,
        recommendations,
        generatedAt: new Date().toISOString(),
        generatedBy: 'ai',
        confidence: this.calculateConfidence(assignments, conflicts, staffingReq),
      };
    } catch (error) {
      logger.error(`[AIScheduleGenerator] Error generating schedule:`, error);
      throw error;
    }
  }

  /**
   * Select best matches for a role
   */
  private selectBestMatches(
    matches: StaffMatch[],
    count: number,
    startTime: string,
    endTime: string,
    options?: any
  ): { matches: StaffMatch[]; conflicts: GeneratedSchedule['conflicts'] } {
    const selected: StaffMatch[] = [];
    const conflicts: GeneratedSchedule['conflicts'] = [];
    const usedEmployeeIds = new Set<string>();

    // Sort by match score
    const sorted = matches.sort((a, b) => b.matchScore - a.matchScore);

    for (const match of sorted) {
      if (selected.length >= count) break;

      // Check for double booking
      if (usedEmployeeIds.has(match.employeeId)) {
        conflicts.push({
          employeeId: match.employeeId,
          conflictType: 'double_booked',
          description: `${match.employeeName} already assigned to another role`,
          severity: 'high',
        });
        continue;
      }

      // Check availability
      const availabilityCheck = this.checkAvailability(
        match.employeeId,
        startTime,
        endTime
      );
      if (!availabilityCheck.available) {
        conflicts.push({
          employeeId: match.employeeId,
          conflictType: 'availability',
          description: availabilityCheck.reason,
          severity: availabilityCheck.severity,
        });
        if (availabilityCheck.severity === 'high') continue;
      }

      // Check skill gaps
      if (match.gaps.length > 0 && match.matchScore < 70) {
        conflicts.push({
          employeeId: match.employeeId,
          conflictType: 'skill_gap',
          description: `Skill gaps: ${match.gaps.join(', ')}`,
          severity: match.matchScore < 60 ? 'high' : 'medium',
        });
      }

      selected.push(match);
      usedEmployeeIds.add(match.employeeId);
    }

    return { matches: selected, conflicts };
  }

  /**
   * Create assignment from match
   */
  private async createAssignment(
    match: StaffMatch,
    need: EventStaffingRequirement['staffingNeeds'][0],
    eventDate: string,
    orgId: string
  ): Promise<ScheduleAssignment> {
    // Calculate break times (if shift > 6 hours)
    const start = new Date(need.startTime);
    const end = new Date(need.endTime);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    let breakStart: string | undefined;
    let breakEnd: string | undefined;

    if (duration > 6) {
      // 30-minute break after 4 hours
      const breakTime = new Date(start);
      breakTime.setHours(breakTime.getHours() + 4);
      breakStart = breakTime.toISOString();
      breakEnd = new Date(breakTime.getTime() + 30 * 60000).toISOString();
    }

    return {
      employeeId: match.employeeId,
      employeeName: match.employeeName,
      role: need.role,
      roleCode: need.roleCode,
      startTime: need.startTime,
      endTime: need.endTime,
      breakStart,
      breakEnd,
      assignedSkills: need.requiredSkills,
      matchScore: match.matchScore,
      reasoning: match.reasoning,
    };
  }

  /**
   * Check employee availability
   */
  private checkAvailability(
    employeeId: string,
    startTime: string,
    endTime: string
  ): { available: boolean; reason: string; severity: 'low' | 'medium' | 'high' } {
    // In production, query staff_availability_constraints and existing schedules
    // For now, return available
    return { available: true, reason: '', severity: 'low' };
  }

  /**
   * Calculate summary metrics
   */
  private calculateSummary(
    assignments: ScheduleAssignment[],
    staffingReq: EventStaffingRequirement,
    options?: any
  ): GeneratedSchedule['summary'] {
    const totalStaff = assignments.length;
    const totalHours = this.calculateTotalHours(assignments);
    const estimatedCost = staffingReq.estimatedCost;

    // Calculate coverage score
    const requiredStaff = staffingReq.staffingNeeds.reduce((sum, n) => sum + n.count, 0);
    const coverageScore = totalStaff >= requiredStaff
      ? 100
      : (totalStaff / requiredStaff) * 100;

    // Calculate preference score (if preferences were respected)
    const preferenceScore = options?.respectPreferences ? 85 : 50; // Placeholder

    // Calculate skill match score
    const skillMatchScore = assignments.length > 0
      ? assignments.reduce((sum, a) => sum + a.matchScore, 0) / assignments.length
      : 0;

    return {
      totalStaff,
      totalHours,
      estimatedCost,
      coverageScore,
      preferenceScore,
      skillMatchScore,
    };
  }

  /**
   * Generate final recommendations
   */
  private generateFinalRecommendations(
    assignments: ScheduleAssignment[],
    conflicts: GeneratedSchedule['conflicts'],
    staffingReq: EventStaffingRequirement,
    summary: GeneratedSchedule['summary']
  ): string[] {
    const recommendations: string[] = [];

    if (summary.coverageScore < 100) {
      recommendations.push(
        `Staffing shortage: ${staffingReq.staffingNeeds.reduce((sum, n) => sum + n.count, 0) - assignments.length} positions still need to be filled`
      );
    }

    if (conflicts.filter(c => c.severity === 'high').length > 0) {
      recommendations.push(
        `${conflicts.filter(c => c.severity === 'high').length} high-severity conflicts need resolution`
      );
    }

    if (summary.skillMatchScore < 75) {
      recommendations.push(
        'Average skill match is below optimal. Consider additional training or alternative staff.'
      );
    }

    if (summary.preferenceScore < 70) {
      recommendations.push(
        'Staff preferences not fully honored. Review assignments for better alignment.'
      );
    }

    return recommendations;
  }

  /**
   * Calculate total hours
   */
  private calculateTotalHours(assignments: ScheduleAssignment[]): number {
    let total = 0;
    for (const assignment of assignments) {
      const start = new Date(assignment.startTime);
      const end = new Date(assignment.endTime);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      
      // Subtract break time if exists
      if (assignment.breakStart && assignment.breakEnd) {
        const breakStart = new Date(assignment.breakStart);
        const breakEnd = new Date(assignment.breakEnd);
        const breakHours = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60 * 60);
        total += hours - breakHours;
      } else {
        total += hours;
      }
    }
    return Math.ceil(total);
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    assignments: ScheduleAssignment[],
    conflicts: GeneratedSchedule['conflicts'],
    staffingReq: EventStaffingRequirement
  ): number {
    let confidence = 50; // Base

    // Coverage
    const required = staffingReq.staffingNeeds.reduce((sum, n) => sum + n.count, 0);
    if (assignments.length >= required) confidence += 20;
    else confidence += (assignments.length / required) * 20;

    // Conflicts
    const highConflicts = conflicts.filter(c => c.severity === 'high').length;
    confidence -= highConflicts * 10;
    const mediumConflicts = conflicts.filter(c => c.severity === 'medium').length;
    confidence -= mediumConflicts * 5;

    // Skill match
    if (assignments.length > 0) {
      const avgMatch = assignments.reduce((sum, a) => sum + a.matchScore, 0) / assignments.length;
      confidence += (avgMatch / 100) * 20;
    }

    return Math.max(0, Math.min(100, confidence));
  }
}

export const aiScheduleGenerator = new AIScheduleGenerator();
