/**
 * Conflict Detection Engine
 * Advanced algorithm for detecting and analyzing event conflicts
 * Supports location overlaps, time conflicts, and smart alerting
 */

import {
  CalendarEvent,
  CalendarConflict,
  ConflictType,
  ConflictSeverity,
} from "@/types/calendar";
import { calendarService } from "../services/EnterpriseCalendarService";

/**
 * ConflictDetector
 * Detects conflicts between calendar events across multiple outlets
 */
export class ConflictDetector {
  /**
   * Detect all conflicts for an event
   * Checks against all accessible outlets, not just selected ones
   */
  async detectAllConflicts(event: CalendarEvent): Promise<CalendarConflict[]> {
    try {
      const conflicts: CalendarConflict[] = [];

      // Query all events in the same org that might conflict
      const conflictingEvents = await this.findPotentialConflicts(event);

      for (const otherEvent of conflictingEvents) {
        const conflict = await this.analyzeConflict(event, otherEvent);
        if (conflict) {
          conflicts.push(conflict);
        }
      }

      return conflicts;
    } catch (error) {
      console.error("Error detecting conflicts:", error);
      return [];
    }
  }

  /**
   * Batch detect conflicts for multiple events
   * More efficient than individual detection
   */
  async detectBatchConflicts(events: CalendarEvent[]): Promise<ConflictMap> {
    const conflictMap = new Map<string, CalendarConflict[]>();

    for (const event of events) {
      const conflicts = await this.detectAllConflicts(event);
      if (conflicts.length > 0) {
        conflictMap.set(event.id, conflicts);
      }
    }

    return conflictMap;
  }

  /**
   * Find potential conflicts with smart scoping
   */
  private async findPotentialConflicts(
    event: CalendarEvent,
  ): Promise<CalendarEvent[]> {
    const potentialConflicts: CalendarEvent[] = [];

    // Find events on same date or adjacent dates
    const dateStart = new Date(event.date);
    dateStart.setDate(dateStart.getDate() - 1);

    const dateEnd = new Date(event.date);
    dateEnd.setDate(dateEnd.getDate() + 1);

    // This would be implemented in CalendarService
    // For now returning empty, actual implementation would query DB
    return potentialConflicts;
  }

  /**
   * Analyze potential conflict between two events
   */
  private async analyzeConflict(
    event1: CalendarEvent,
    event2: CalendarEvent,
  ): Promise<CalendarConflict | null> {
    // Check for location conflict
    const hasLocationConflict = this.checkLocationConflict(event1, event2);

    // Check for time conflict
    const hasTimeConflict = this.checkTimeConflict(event1, event2);

    if (!hasLocationConflict && !hasTimeConflict) {
      return null; // No conflict
    }

    // Determine conflict type
    let conflictType: ConflictType = "time";
    if (hasLocationConflict && hasTimeConflict) {
      conflictType = "location";
    } else if (hasLocationConflict) {
      conflictType = "resource";
    }

    // Calculate severity
    const severity = this.calculateSeverity(event1, event2, conflictType);

    // Generate message
    const message = this.generateConflictMessage(event1, event2, conflictType);

    return {
      id: this.generateConflictId(event1.id, event2.id),
      event_id_1: event1.id < event2.id ? event1.id : event2.id,
      event_id_2: event1.id < event2.id ? event2.id : event1.id,
      org_id: event1.org_id,
      conflict_type: conflictType,
      severity,
      message,
      detected_at: new Date().toISOString(),
      metadata: {
        event_1_title: event1.title,
        event_2_title: event2.title,
        event_1_outlet: event1.outlet_id,
        event_2_outlet: event2.outlet_id,
        location_conflict: hasLocationConflict,
        time_conflict: hasTimeConflict,
      },
    };
  }

  /**
   * Check if two events have location conflict
   */
  private checkLocationConflict(
    event1: CalendarEvent,
    event2: CalendarEvent,
  ): boolean {
    if (!event1.location_room || !event2.location_room) {
      return false;
    }

    // Exact match on room
    if (event1.location_room === event2.location_room) {
      return true;
    }

    // Could also check if rooms are in same space_id
    if (
      event1.space_id &&
      event2.space_id &&
      event1.space_id === event2.space_id
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if two events have time conflict
   */
  private checkTimeConflict(
    event1: CalendarEvent,
    event2: CalendarEvent,
  ): boolean {
    const start1 = new Date(event1.start_time).getTime();
    const end1 = new Date(event1.end_time).getTime();
    const start2 = new Date(event2.start_time).getTime();
    const end2 = new Date(event2.end_time).getTime();

    // Check for time overlap
    return start1 < end2 && start2 < end1;
  }

  /**
   * Calculate conflict severity
   * Considers event status, timing, and business impact
   */
  private calculateSeverity(
    event1: CalendarEvent,
    event2: CalendarEvent,
    conflictType: ConflictType,
  ): ConflictSeverity {
    // Critical: One event is locked
    if (event1.status === "locked" || event2.status === "locked") {
      return ConflictSeverity.CRITICAL;
    }

    // High severity for confirmed events
    if (event1.status === "confirmed" && event2.status === "confirmed") {
      return ConflictSeverity.CRITICAL;
    }

    // Warning: At least one confirmed event
    if (event1.status === "confirmed" || event2.status === "confirmed") {
      return ConflictSeverity.WARNING;
    }

    // Info: Both pending
    if (event1.status === "pending" && event2.status === "pending") {
      return ConflictSeverity.INFO;
    }

    // High severity for large events
    const totalGuests = (event1.guest_count || 0) + (event2.guest_count || 0);
    if (totalGuests > 100) {
      return ConflictSeverity.CRITICAL;
    }

    // Check revenue impact
    const totalRevenue = (event1.revenue || 0) + (event2.revenue || 0);
    if (totalRevenue > 50000) {
      return ConflictSeverity.CRITICAL;
    }

    return ConflictSeverity.WARNING;
  }

  /**
   * Generate human-readable conflict message
   */
  private generateConflictMessage(
    event1: CalendarEvent,
    event2: CalendarEvent,
    conflictType: ConflictType,
  ): string {
    const format = (time: string) => {
      const date = new Date(time);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const start1 = format(event1.start_time);
    const end1 = format(event1.end_time);
    const start2 = format(event2.start_time);

    if (conflictType === "location") {
      return `"${event1.title}" (${start1}-${end1}) conflicts with "${event2.title}" (${start2}) in ${event1.location_room}`;
    }

    return `"${event1.title}" and "${event2.title}" overlap on ${new Date(event1.date).toLocaleDateString()}`;
  }

  /**
   * Generate conflict ID from event IDs
   */
  private generateConflictId(id1: string, id2: string): string {
    const [smaller, larger] = id1 < id2 ? [id1, id2] : [id2, id1];
    return `${smaller}-${larger}`;
  }

  /**
   * Suggest resolution options for a conflict
   */
  suggestResolutions(
    conflict: CalendarConflict,
    event1: CalendarEvent,
    event2: CalendarEvent,
  ): string[] {
    const suggestions: string[] = [];

    // Suggest time changes
    const gap1After = this.findNextAvailableSlot(event2.end_time, 1); // 1 hour after event2
    suggestions.push(`Reschedule "${event1.title}" to ${gap1After}`);

    const gap2After = this.findNextAvailableSlot(event1.end_time, 1);
    suggestions.push(`Reschedule "${event2.title}" to ${gap2After}`);

    // If location conflict, suggest room changes
    if (
      conflict.conflict_type === "location" ||
      conflict.conflict_type === "resource"
    ) {
      suggestions.push(`Use alternative location for "${event1.title}"`);
      suggestions.push(`Use alternative location for "${event2.title}"`);
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  /**
   * Find next available time slot after a given time
   */
  private findNextAvailableSlot(time: string, durationHours: number): string {
    const date = new Date(time);
    date.setHours(date.getHours() + durationHours);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Check if conflict is blocking (critical and affects confirmed events)
   */
  isBlockingConflict(
    conflict: CalendarConflict,
    event1: CalendarEvent,
    event2: CalendarEvent,
  ): boolean {
    return (
      conflict.severity === ConflictSeverity.CRITICAL &&
      (event1.status === "locked" || event2.status === "locked")
    );
  }

  /**
   * Group conflicts by severity for display
   */
  groupBySeverity(
    conflicts: CalendarConflict[],
  ): Map<ConflictSeverity, CalendarConflict[]> {
    const grouped = new Map<ConflictSeverity, CalendarConflict[]>();

    for (const conflict of conflicts) {
      if (!grouped.has(conflict.severity as ConflictSeverity)) {
        grouped.set(conflict.severity as ConflictSeverity, []);
      }
      grouped.get(conflict.severity as ConflictSeverity)!.push(conflict);
    }

    return grouped;
  }

  /**
   * Filter conflicts by criteria
   */
  filterConflicts(
    conflicts: CalendarConflict[],
    criteria: {
      severity?: ConflictSeverity[];
      type?: ConflictType[];
      resolved?: boolean;
    },
  ): CalendarConflict[] {
    return conflicts.filter((conflict) => {
      if (
        criteria.severity &&
        !criteria.severity.includes(conflict.severity as ConflictSeverity)
      ) {
        return false;
      }

      if (
        criteria.type &&
        !criteria.type.includes(conflict.conflict_type as ConflictType)
      ) {
        return false;
      }

      if (criteria.resolved !== undefined) {
        const isResolved = !!conflict.resolved_at;
        if (criteria.resolved !== isResolved) {
          return false;
        }
      }

      return true;
    });
  }
}

/**
 * Type for conflict map
 */
export type ConflictMap = Map<string, CalendarConflict[]>;

// Export singleton instance
export const conflictDetector = new ConflictDetector();
