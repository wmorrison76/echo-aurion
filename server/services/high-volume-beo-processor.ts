/**
 * High-Volume BEO Processor
 * 
 * Handles processing of 100+ BEOs per week efficiently
 * Batch processing, conflict detection, and optimization
 * 
 * Features:
 * - Batch BEO analysis
 * - Multi-event conflict detection
 * - Resource optimization
 * - Staff allocation across multiple events
 */

import { logger } from '../utils/logger.js';
import * as crypto from 'crypto';
import { beoREOStaffingAnalyzer, type EventStaffingRequirement } from './beo-reo-staffing-analyzer.js';
import { aiScheduleGenerator, type GeneratedSchedule } from './ai-schedule-generator.js';

export interface WeeklyBEOBatch {
  weekStart: string; // ISO date
  weekEnd: string; // ISO date
  beos: Array<{
    eventId: string;
    beoId: string;
    eventDate: string;
    eventName: string;
    guestCount: number;
    serviceType: string;
    priority: 'critical' | 'high' | 'normal' | 'low';
  }>;
  totalEvents: number;
  totalGuestCount: number;
  totalStaffHours: number;
}

export interface BatchProcessingResult {
  batchId: string;
  weekStart: string;
  weekEnd: string;
  processedBEOs: number;
  generatedSchedules: number;
  conflicts: Array<{
    type: 'staff_shortage' | 'double_booking' | 'resource_conflict' | 'time_overlap';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    affectedBEOs: string[];
    resolution?: string;
  }>;
  shortages: Array<{
    date: string;
    role: string;
    needed: number;
    available: number;
    shortage: number;
    recommendedActions: string[];
  }>;
  schedules: GeneratedSchedule[];
  processingTime: number; // milliseconds
  status: 'processing' | 'completed' | 'failed' | 'partial';
}

export interface StaffAllocation {
  employeeId: string;
  employeeName: string;
  allocations: Array<{
    eventId: string;
    eventDate: string;
    role: string;
    startTime: string;
    endTime: string;
    hours: number;
  }>;
  totalHours: number;
  maxHoursPerWeek: number;
  utilization: number; // percentage
}

class HighVolumeBEOProcessor {
  /**
   * Process a batch of BEOs for a week
   */
  async processWeeklyBatch(
    weekStart: string,
    weekEnd: string,
    orgId: string,
    options?: {
      autoResolveConflicts?: boolean;
      allowOvertime?: boolean;
      prioritizeHighPriority?: boolean;
    }
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const batchId = `batch_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    try {
      logger.info(`[HighVolumeBEO] Processing weekly batch ${batchId} for ${weekStart} to ${weekEnd}`);

      // Fetch all BEOs for the week
      const beos = await this.fetchBEOsForWeek(weekStart, weekEnd, orgId);
      logger.info(`[HighVolumeBEO] Found ${beos.length} BEOs for processing`);

      // Analyze each BEO
      const analyses: EventStaffingRequirement[] = [];
      for (const beo of beos) {
        try {
          const analysis = await beoREOStaffingAnalyzer.analyzeEvent(
            beo.eventId,
            beo.beoId,
            orgId
          );
          analyses.push(analysis);
        } catch (error) {
          logger.error(`[HighVolumeBEO] Error analyzing BEO ${beo.beoId}:`, error);
        }
      }

      // Detect conflicts and shortages
      const conflicts = this.detectConflicts(analyses);
      const shortages = await this.identifyShortages(analyses, orgId);

      // Generate schedules (with conflict resolution)
      const schedules: GeneratedSchedule[] = [];
      const processedBEOs = new Set<string>();

      // Sort by priority if enabled
      const sortedAnalyses = options?.prioritizeHighPriority
        ? this.sortByPriority(analyses, beos)
        : analyses;

      for (const analysis of sortedAnalyses) {
        try {
          // Check if we can still assign staff (considering previous allocations)
          const canProceed = await this.canProceedWithScheduling(
            analysis,
            schedules,
            options
          );

          if (canProceed) {
            const schedule = await aiScheduleGenerator.generateSchedule(
              analysis.eventId,
              analysis.beoId,
              orgId,
              {
                respectPreferences: true,
                allowOvertime: options?.allowOvertime || false,
                minSkillMatch: 70,
                prioritizePerformance: true,
              }
            );

            schedules.push(schedule);
            processedBEOs.add(analysis.eventId);
          } else {
            conflicts.push({
              type: 'staff_shortage',
              severity: 'high',
              description: `Insufficient staff available for ${analysis.eventId}`,
              affectedBEOs: [analysis.eventId],
            });
          }
        } catch (error) {
          logger.error(`[HighVolumeBEO] Error generating schedule for ${analysis.eventId}:`, error);
          conflicts.push({
            type: 'resource_conflict',
            severity: 'medium',
            description: `Failed to generate schedule: ${error}`,
            affectedBEOs: [analysis.eventId],
          });
        }
      }

      // Auto-resolve conflicts if enabled
      if (options?.autoResolveConflicts) {
        await this.autoResolveConflicts(conflicts, schedules, orgId);
      }

      const processingTime = Date.now() - startTime;
      const status = conflicts.filter(c => c.severity === 'critical').length > 0
        ? 'partial'
        : processedBEOs.size === beos.length
        ? 'completed'
        : 'partial';

      logger.info(`[HighVolumeBEO] Batch ${batchId} processed: ${processedBEOs.size}/${beos.length} BEOs in ${processingTime}ms`);

      return {
        batchId,
        weekStart,
        weekEnd,
        processedBEOs: processedBEOs.size,
        generatedSchedules: schedules.length,
        conflicts,
        shortages,
        schedules,
        processingTime,
        status,
      };
    } catch (error) {
      logger.error(`[HighVolumeBEO] Error processing batch ${batchId}:`, error);
      return {
        batchId,
        weekStart,
        weekEnd,
        processedBEOs: 0,
        generatedSchedules: 0,
        conflicts: [{
          type: 'resource_conflict',
          severity: 'critical',
          description: `Batch processing failed: ${error}`,
          affectedBEOs: [],
        }],
        shortages: [],
        schedules: [],
        processingTime: Date.now() - startTime,
        status: 'failed',
      };
    }
  }

  /**
   * Get staff allocation across all events for a week
   */
  async getWeeklyStaffAllocation(
    weekStart: string,
    weekEnd: string,
    orgId: string
  ): Promise<StaffAllocation[]> {
    const allocations = new Map<string, StaffAllocation>();

    // Fetch all schedules for the week
    const schedules = await this.fetchSchedulesForWeek(weekStart, weekEnd, orgId);

    for (const schedule of schedules) {
      for (const assignment of schedule.assignments) {
        const existing = allocations.get(assignment.employeeId) || {
          employeeId: assignment.employeeId,
          employeeName: assignment.employeeName,
          allocations: [],
          totalHours: 0,
          maxHoursPerWeek: 40, // Default, should come from employee data
          utilization: 0,
        };

        const start = new Date(assignment.startTime);
        const end = new Date(assignment.endTime);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        existing.allocations.push({
          eventId: schedule.eventId,
          eventDate: schedule.eventDate,
          role: assignment.role,
          startTime: assignment.startTime,
          endTime: assignment.endTime,
          hours,
        });

        existing.totalHours += hours;
        existing.utilization = (existing.totalHours / existing.maxHoursPerWeek) * 100;

        allocations.set(assignment.employeeId, existing);
      }
    }

    return Array.from(allocations.values());
  }

  /**
   * Detect conflicts across multiple BEOs
   */
  private detectConflicts(analyses: EventStaffingRequirement[]): BatchProcessingResult['conflicts'] {
    const conflicts: BatchProcessingResult['conflicts'] = [];

    // Group by date
    const byDate = new Map<string, EventStaffingRequirement[]>();
    for (const analysis of analyses) {
      const date = analysis.eventDate.split('T')[0];
      const existing = byDate.get(date) || [];
      existing.push(analysis);
      byDate.set(date, existing);
    }

    // Check for time overlaps on same date
    for (const [date, dayAnalyses] of byDate.entries()) {
      if (dayAnalyses.length > 1) {
        // Check for overlapping time slots
        for (let i = 0; i < dayAnalyses.length; i++) {
          for (let j = i + 1; j < dayAnalyses.length; j++) {
            const overlap = this.checkTimeOverlap(dayAnalyses[i], dayAnalyses[j]);
            if (overlap) {
              conflicts.push({
                type: 'time_overlap',
                severity: 'high',
                description: `Time overlap detected on ${date}`,
                affectedBEOs: [dayAnalyses[i].eventId, dayAnalyses[j].eventId],
              });
            }
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Identify staff shortages across all BEOs
   */
  private async identifyShortages(
    analyses: EventStaffingRequirement[],
    orgId: string
  ): Promise<BatchProcessingResult['shortages']> {
    const shortages: BatchProcessingResult['shortages'] = [];

    // Group staffing needs by date and role
    const needsByDateRole = new Map<string, { needed: number; beos: string[] }>();

    for (const analysis of analyses) {
      const date = analysis.eventDate.split('T')[0];
      for (const need of analysis.staffingNeeds) {
        const key = `${date}_${need.roleCode}`;
        const existing = needsByDateRole.get(key) || { needed: 0, beos: [] };
        existing.needed += need.count;
        existing.beos.push(analysis.eventId);
        needsByDateRole.set(key, existing);
      }
    }

    // Check availability for each date/role combination
    for (const [key, need] of needsByDateRole.entries()) {
      const [date, roleCode] = key.split('_');
      const available = await this.getAvailableStaffCount(date, roleCode, orgId);

      if (available < need.needed) {
        const shortage = need.needed - available;
        shortages.push({
          date,
          role: roleCode,
          needed: need.needed,
          available,
          shortage,
          recommendedActions: this.generateShortageRecommendations(shortage, roleCode),
        });
      }
    }

    return shortages;
  }

  /**
   * Generate shortage recommendations
   */
  private generateShortageRecommendations(shortage: number, role: string): string[] {
    const recommendations: string[] = [];

    if (shortage <= 2) {
      recommendations.push('Consider job share posting for 2-4 hour shifts');
      recommendations.push('Offer overtime to existing staff');
    } else if (shortage <= 5) {
      recommendations.push('Post job share opportunities immediately');
      recommendations.push('Contact staffing agency for temporary help');
      recommendations.push('Consider cross-training staff from other departments');
    } else {
      recommendations.push('CRITICAL: Post multiple job share positions');
      recommendations.push('Contact staffing agency urgently');
      recommendations.push('Consider postponing non-critical events');
      recommendations.push('Reach out to part-time staff pool');
    }

    return recommendations;
  }

  /**
   * Helper methods
   */

  private async fetchBEOsForWeek(weekStart: string, weekEnd: string, orgId: string): Promise<WeeklyBEOBatch['beos']> {
    // In production, query database
    return [];
  }

  private async fetchSchedulesForWeek(weekStart: string, weekEnd: string, orgId: string): Promise<GeneratedSchedule[]> {
    // In production, query database
    return [];
  }

  private checkTimeOverlap(analysis1: EventStaffingRequirement, analysis2: EventStaffingRequirement): boolean {
    const timeline1 = analysis1.timeline;
    const timeline2 = analysis2.timeline;

    if (timeline1.length === 0 || timeline2.length === 0) return false;

    const start1 = new Date(timeline1[0].time);
    const end1 = new Date(timeline1[timeline1.length - 1].time);
    end1.setMinutes(end1.getMinutes() + timeline1[timeline1.length - 1].duration);

    const start2 = new Date(timeline2[0].time);
    const end2 = new Date(timeline2[timeline2.length - 1].time);
    end2.setMinutes(end2.getMinutes() + timeline2[timeline2.length - 1].duration);

    return start1 < end2 && start2 < end1;
  }

  private async getAvailableStaffCount(date: string, roleCode: string, orgId: string): Promise<number> {
    // In production, query available staff
    return 0;
  }

  private sortByPriority(
    analyses: EventStaffingRequirement[],
    beos: WeeklyBEOBatch['beos']
  ): EventStaffingRequirement[] {
    const priorityMap = { critical: 4, high: 3, normal: 2, low: 1 };
    const beoMap = new Map(beos.map(b => [b.eventId, b]));

    return analyses.sort((a, b) => {
      const priorityA = priorityMap[beoMap.get(a.eventId)?.priority || 'normal'] || 2;
      const priorityB = priorityMap[beoMap.get(b.eventId)?.priority || 'normal'] || 2;
      return priorityB - priorityA;
    });
  }

  private async canProceedWithScheduling(
    analysis: EventStaffingRequirement,
    existingSchedules: GeneratedSchedule[],
    options?: any
  ): Promise<boolean> {
    // Check if we have enough staff available considering existing schedules
    // In production, check actual availability
    return true;
  }

  private async autoResolveConflicts(
    conflicts: BatchProcessingResult['conflicts'],
    schedules: GeneratedSchedule[],
    orgId: string
  ): Promise<void> {
    // In production, attempt to resolve conflicts automatically
    // e.g., suggest job shares, adjust schedules, etc.
  }
}

export const highVolumeBEOProcessor = new HighVolumeBEOProcessor();
