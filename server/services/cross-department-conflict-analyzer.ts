/**
 * Cross-Department Conflict Analyzer Service
 * Analyzes conflicts across departments, calculates impact scores,
 * and suggests alternative time slots to minimize disruption
 */

import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";

interface ConflictAnalysis {
  eventId: string;
  conflictCount: number;
  affectedStaffCount: number;
  affectedDepartments: string[];
  departmentBreakdown: Record<
    string,
    {
      staffCount: number;
      conflictType: string;
      severity: string;
    }
  >;
  impactScore: number; // 0-100
  overlapPercentage: number;
  alternatives: AlternativeTimeslot[];
}

interface AlternativeTimeslot {
  startTime: Date;
  endTime: Date;
  estimatedConflictCount: number;
  estimatedAffectedStaff: number;
  impactScore: number;
  departmentsNoLongerAffected: string[];
  conflictReductionPercent: number;
  reasoning: string;
}

interface StaffConflict {
  employeeId: string;
  primaryDepartment: string;
  secondaryDepartment?: string;
  primaryEventId: string;
  secondaryEventId: string;
  conflictType: "overlap" | "adjacent" | "insufficient_rest";
  severity: "low" | "warning" | "critical";
}

const db = new Database();
const DAYS_TO_ANALYZE = 30; // Look ahead this many days for alternatives

class CrossDepartmentConflictAnalyzer {
  /**
   * Analyze conflicts for a single event across departments
   */
  async analyzeEventConflicts(eventId: string): Promise<ConflictAnalysis> {
    try {
      // Get event details
      const eventResult = await db.query(
        `
        SELECT id, title, start_time, end_time, outlet_id, org_id
        FROM calendar_events
        WHERE id = $1
      `,
        [eventId],
      );

      if (eventResult.rows.length === 0) {
        throw new Error("Event not found");
      }

      const event = eventResult.rows[0];

      // Find overlapping events
      const conflictResult = await db.query(
        `
        SELECT DISTINCT
          ce.id,
          ce.title,
          ce.start_time,
          ce.end_time,
          ce.department,
          cc.id as conflict_id,
          cc.severity
        FROM calendar_events ce
        LEFT JOIN calendar_conflicts cc ON (
          (cc.event_id_1 = $1 AND cc.event_id_2 = ce.id)
          OR (cc.event_id_1 = ce.id AND cc.event_id_2 = $1)
        )
        WHERE ce.org_id = $2
          AND ce.id != $1
          AND ce.deleted_at IS NULL
          AND (
            (ce.start_time < $4 AND ce.end_time > $3)
            OR (ce.start_time >= $3 AND ce.start_time < $4)
          )
        ORDER BY ce.start_time ASC
      `,
        [eventId, event.org_id, event.start_time, event.end_time],
      );

      // Find affected staff
      const staffResult = await db.query(
        `
        SELECT
          ep.id,
          ep.department as primary_dept,
          ce.id as event_id,
          ce.department as event_dept,
          COUNT(*) OVER (PARTITION BY ep.id) as event_count
        FROM employee_profiles ep
        LEFT JOIN calendar_event_acknowledgment_queue ceaq ON ceaq.employee_id = ep.id
        LEFT JOIN calendar_events ce ON ceaq.event_id = ce.id
        WHERE ep.org_id = $1
          AND ceaq.event_id IN (
            SELECT id FROM calendar_events
            WHERE org_id = $1
              AND (
                (start_time < $3 AND end_time > $2)
                OR (start_time >= $2 AND start_time < $3)
              )
          )
          AND ceaq.status = 'acknowledged'
      `,
        [event.org_id, event.start_time, event.end_time],
      );

      // Calculate department breakdown
      const departmentBreakdown: Record<
        string,
        { staffCount: number; conflictType: string; severity: string }
      > = {};

      for (const conflict of conflictResult.rows) {
        if (!departmentBreakdown[conflict.department]) {
          departmentBreakdown[conflict.department] = {
            staffCount: 0,
            conflictType: "overlap",
            severity: conflict.severity || "warning",
          };
        }
        departmentBreakdown[conflict.department].staffCount += 1;
      }

      // Identify unique affected departments
      const affectedDepartments = Object.keys(departmentBreakdown);

      // Calculate impact score
      const impactScore = this.calculateImpactScore(
        staffResult.rows.length,
        affectedDepartments.length,
        conflictResult.rows.length,
      );

      // Find alternative time slots
      const alternatives = await this.findAlternativeTimeslots(
        eventId,
        event,
        affectedDepartments,
      );

      // Store analysis in database
      await this.storeConflictAnalysis(
        eventId,
        affectedDepartments,
        staffResult.rows.length,
        impactScore,
        departmentBreakdown,
      );

      // Record affected staff
      for (const staffConflict of staffResult.rows) {
        await this.recordAffectedStaff(
          eventId,
          staffConflict,
          affectedDepartments,
        );
      }

      const overlapPercentage = conflictResult.rows.length > 0 ? 100 : 0;

      return {
        eventId,
        conflictCount: conflictResult.rows.length,
        affectedStaffCount: staffResult.rows.length,
        affectedDepartments,
        departmentBreakdown,
        impactScore,
        overlapPercentage,
        alternatives,
      };
    } catch (error) {
      logger.error("[ConflictAnalyzer] Analysis failed:", error);
      throw error;
    }
  }

  /**
   * Calculate impact score (0-100)
   * Based on affected staff, departments, and severity
   */
  private calculateImpactScore(
    staffCount: number,
    deptCount: number,
    conflictCount: number,
  ): number {
    let score = 0;

    // Staff count component (0-50 points)
    score += Math.min((staffCount / 10) * 50, 50);

    // Department count component (0-30 points)
    score += Math.min((deptCount / 5) * 30, 30);

    // Conflict count component (0-20 points)
    score += Math.min((conflictCount / 5) * 20, 20);

    return Math.round(Math.min(score, 100));
  }

  /**
   * Find alternative time slots with fewer conflicts
   */
  private async findAlternativeTimeslots(
    eventId: string,
    event: any,
    affectedDepartments: string[],
  ): Promise<AlternativeTimeslot[]> {
    try {
      const alternatives: AlternativeTimeslot[] = [];
      const eventDuration =
        (event.end_time.getTime() - event.start_time.getTime()) /
        (1000 * 60 * 60); // Hours

      // Generate candidate time slots (same day, next days, different times)
      const candidates = this.generateCandidateTimeslots(event, eventDuration);

      for (const candidate of candidates) {
        // Check conflicts for this time slot
        const conflictCount = await this.countConflicts(
          event.org_id,
          candidate.start,
          candidate.end,
          affectedDepartments,
        );

        const staffConflicts = await this.countAffectedStaff(
          event.org_id,
          candidate.start,
          candidate.end,
          affectedDepartments,
        );

        // Only suggest if it reduces conflicts
        if (conflictCount === 0 || staffConflicts < 3) {
          const impactScore = this.calculateImpactScore(
            staffConflicts,
            affectedDepartments.length,
            conflictCount,
          );

          const reduction = Math.max(
            0,
            100 -
              (conflictCount > 0
                ? (conflictCount / affectedDepartments.length) * 100
                : 0),
          );

          alternatives.push({
            startTime: candidate.start,
            endTime: candidate.end,
            estimatedConflictCount: conflictCount,
            estimatedAffectedStaff: staffConflicts,
            impactScore,
            departmentsNoLongerAffected: this.getDepartmentReduction(
              affectedDepartments,
              conflictCount,
            ),
            conflictReductionPercent: reduction,
            reasoning: this.generateAlternativeReasoning(
              candidate.reason,
              conflictCount,
              staffConflicts,
            ),
          });
        }
      }

      // Sort by impact score (lowest first) and limit to top 3
      return alternatives
        .sort((a, b) => a.impactScore - b.impactScore)
        .slice(0, 3);
    } catch (error) {
      logger.warn("[ConflictAnalyzer] Alternative suggestion failed:", error);
      return [];
    }
  }

  /**
   * Generate candidate time slots
   */
  private generateCandidateTimeslots(
    event: any,
    durationHours: number,
  ): Array<{ start: Date; end: Date; reason: string }> {
    const candidates: Array<{ start: Date; end: Date; reason: string }> = [];
    const baseDate = new Date(event.start_time);
    const duration = durationHours * 60 * 60 * 1000; // Milliseconds

    // Same day - different times
    const morningStart = new Date(baseDate);
    morningStart.setHours(8, 0, 0, 0);
    candidates.push({
      start: morningStart,
      end: new Date(morningStart.getTime() + duration),
      reason: "Move to morning (8am)",
    });

    const earlyAfternoonStart = new Date(baseDate);
    earlyAfternoonStart.setHours(12, 0, 0, 0);
    candidates.push({
      start: earlyAfternoonStart,
      end: new Date(earlyAfternoonStart.getTime() + duration),
      reason: "Move to early afternoon (12pm)",
    });

    const lateAfternoonStart = new Date(baseDate);
    lateAfternoonStart.setHours(16, 0, 0, 0);
    candidates.push({
      start: lateAfternoonStart,
      end: new Date(lateAfternoonStart.getTime() + duration),
      reason: "Move to late afternoon (4pm)",
    });

    // Next day
    const nextDayStart = new Date(baseDate);
    nextDayStart.setDate(nextDayStart.getDate() + 1);
    nextDayStart.setHours(10, 0, 0, 0);
    candidates.push({
      start: nextDayStart,
      end: new Date(nextDayStart.getTime() + duration),
      reason: "Move to next day",
    });

    // Two days later
    const twoDaysStart = new Date(baseDate);
    twoDaysStart.setDate(twoDaysStart.getDate() + 2);
    twoDaysStart.setHours(10, 0, 0, 0);
    candidates.push({
      start: twoDaysStart,
      end: new Date(twoDaysStart.getTime() + duration),
      reason: "Move 2 days later",
    });

    return candidates;
  }

  /**
   * Count conflicts for a given time slot
   */
  private async countConflicts(
    orgId: string,
    startTime: Date,
    endTime: Date,
    departments: string[],
  ): Promise<number> {
    try {
      const result = await db.query(
        `
        SELECT COUNT(*) as count
        FROM calendar_events
        WHERE org_id = $1
          AND department = ANY($4)
          AND deleted_at IS NULL
          AND (
            (start_time < $3 AND end_time > $2)
            OR (start_time >= $2 AND start_time < $3)
          )
      `,
        [orgId, startTime, endTime, departments],
      );

      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      logger.warn("[ConflictAnalyzer] Count conflicts failed:", error);
      return 0;
    }
  }

  /**
   * Count affected staff for a time slot
   */
  private async countAffectedStaff(
    orgId: string,
    startTime: Date,
    endTime: Date,
    departments: string[],
  ): Promise<number> {
    try {
      const result = await db.query(
        `
        SELECT COUNT(DISTINCT ceaq.employee_id) as count
        FROM calendar_event_acknowledgment_queue ceaq
        JOIN calendar_events ce ON ceaq.event_id = ce.id
        WHERE ce.org_id = $1
          AND ce.department = ANY($4)
          AND ceaq.status = 'acknowledged'
          AND (
            (ce.start_time < $3 AND ce.end_time > $2)
            OR (ce.start_time >= $2 AND ce.start_time < $3)
          )
      `,
        [orgId, startTime, endTime, departments],
      );

      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      logger.warn("[ConflictAnalyzer] Count staff failed:", error);
      return 0;
    }
  }

  /**
   * Get departments no longer affected by new time
   */
  private getDepartmentReduction(
    originalDepts: string[],
    newConflictCount: number,
  ): string[] {
    if (newConflictCount === 0) {
      return originalDepts; // All freed up
    }
    return originalDepts.slice(0, Math.max(1, newConflictCount)); // Simplified
  }

  /**
   * Generate reasoning text for alternative
   */
  private generateAlternativeReasoning(
    reason: string,
    conflictCount: number,
    staffCount: number,
  ): string {
    const impacts = [];
    if (conflictCount === 0) impacts.push("No conflicts");
    else impacts.push(`${conflictCount} conflicts`);

    if (staffCount === 0) impacts.push("no staff overlap");
    else impacts.push(`${staffCount} staff affected`);

    return `${reason} - ${impacts.join(", ")}`;
  }

  /**
   * Store conflict analysis in database
   */
  private async storeConflictAnalysis(
    eventId: string,
    departments: string[],
    staffCount: number,
    impactScore: number,
    breakdown: Record<string, any>,
  ): Promise<void> {
    try {
      // Find or create primary conflict record
      const conflictResult = await db.query(
        `
        SELECT id FROM calendar_conflicts
        WHERE (event_id_1 = $1 OR event_id_2 = $1)
        AND resolved_at IS NULL
        LIMIT 1
      `,
        [eventId],
      );

      if (conflictResult.rows.length > 0) {
        const conflictId = conflictResult.rows[0].id;
        await db.query(
          `
          UPDATE calendar_conflicts
          SET affected_departments = $2,
              affected_staff_count = $3,
              impact_score = $4,
              conflict_breakdown = $5
          WHERE id = $1
        `,
          [
            conflictId,
            departments,
            staffCount,
            impactScore,
            JSON.stringify(breakdown),
          ],
        );
      }
    } catch (error) {
      logger.warn("[ConflictAnalyzer] Failed to store analysis:", error);
    }
  }

  /**
   * Record affected staff member
   */
  private async recordAffectedStaff(
    eventId: string,
    staff: any,
    departments: string[],
  ): Promise<void> {
    // This would be called from conflict detection to record individual affected staff
    try {
      // Implementation would record to calendar_conflict_affected_staff
    } catch (error) {
      logger.warn("[ConflictAnalyzer] Failed to record affected staff:", error);
    }
  }

  /**
   * Apply hard-lock to an event (prevent conflicting shifts in other departments)
   */
  async applyHardLock(eventId: string, reason: string): Promise<boolean> {
    try {
      const conflictResult = await db.query(
        `
        SELECT id FROM calendar_conflicts
        WHERE (event_id_1 = $1 OR event_id_2 = $1)
        AND resolved_at IS NULL
        LIMIT 1
      `,
        [eventId],
      );

      if (conflictResult.rows.length > 0) {
        await db.query(
          `
          UPDATE calendar_conflicts
          SET is_hard_locked = true,
              hard_lock_reason = $2
          WHERE id = $1
        `,
          [conflictResult.rows[0].id, reason],
        );

        logger.info("[ConflictAnalyzer] Hard lock applied", {
          eventId,
          reason,
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error("[ConflictAnalyzer] Failed to apply hard lock:", error);
      throw error;
    }
  }
}

export const crossDepartmentConflictAnalyzer =
  new CrossDepartmentConflictAnalyzer();
export default crossDepartmentConflictAnalyzer;
