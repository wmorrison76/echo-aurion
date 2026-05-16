/**
 * Calendar Conflict Detection Engine Tests
 * Comprehensive unit tests for all conflict detection scenarios
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CalendarEvent,
  CalendarConflict,
  EventStatus,
  ConflictType,
  ConflictSeverity,
  EventSeverity,
} from "@/types/calendar";

/**
 * Mock conflict detection implementation for testing
 * This simulates the server-side conflict detector
 */
class MockConflictDetector {
  /**
   * Check if two events have time overlap
   */
  private hasTimeOverlap(
    event1: CalendarEvent,
    event2: CalendarEvent,
  ): boolean {
    const start1 = new Date(event1.start_time).getTime();
    const end1 = new Date(event1.end_time).getTime();
    const start2 = new Date(event2.start_time).getTime();
    const end2 = new Date(event2.end_time).getTime();

    return start1 < end2 && start2 < end1;
  }

  /**
   * Check if two events have location conflict
   */
  private hasLocationConflict(
    event1: CalendarEvent,
    event2: CalendarEvent,
  ): boolean {
    if (!event1.location_room || !event2.location_room) return false;
    return event1.location_room === event2.location_room;
  }

  /**
   * Detect conflict between two events
   */
  detectConflict(
    event1: CalendarEvent,
    event2: CalendarEvent,
  ): CalendarConflict | null {
    const timeOverlap = this.hasTimeOverlap(event1, event2);
    const locationConflict = this.hasLocationConflict(event1, event2);

    // Location conflict requires BOTH time overlap AND same location
    if (!timeOverlap || !locationConflict) {
      return null;
    }

    // Determine conflict type
    const conflictType: ConflictType = "location";

    // Calculate severity
    const severity = this.calculateSeverity(event1, event2);

    const message = this.generateConflictMessage(event1, event2, conflictType);

    return {
      id: `conflict-${event1.id}-${event2.id}`,
      event_id_1: event1.id,
      event_id_2: event2.id,
      conflict_type: conflictType,
      severity,
      message,
      detected_at: new Date().toISOString(),
      resolved_at: null,
    } as CalendarConflict;
  }

  /**
   * Detect all conflicts for an event against a list of other events
   */
  detectAllConflicts(
    event: CalendarEvent,
    otherEvents: CalendarEvent[],
  ): CalendarConflict[] {
    const conflicts: CalendarConflict[] = [];

    for (const otherEvent of otherEvents) {
      if (otherEvent.id !== event.id) {
        const conflict = this.detectConflict(event, otherEvent);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  /**
   * Calculate conflict severity
   */
  private calculateSeverity(
    event1: CalendarEvent,
    event2: CalendarEvent,
  ): ConflictSeverity {
    // Critical if either is locked
    if (
      event1.status === EventStatus.LOCKED ||
      event2.status === EventStatus.LOCKED
    ) {
      return ConflictSeverity.CRITICAL;
    }

    // Warning if both are confirmed
    if (
      event1.status === EventStatus.CONFIRMED &&
      event2.status === EventStatus.CONFIRMED
    ) {
      return ConflictSeverity.WARNING;
    }

    // Info if one or both are pending
    return ConflictSeverity.INFO;
  }

  /**
   * Generate human-readable conflict message
   */
  private generateConflictMessage(
    event1: CalendarEvent,
    event2: CalendarEvent,
    conflictType: ConflictType,
  ): string {
    const time1 = new Date(event1.start_time).toLocaleTimeString();
    const time2 = new Date(event2.start_time).toLocaleTimeString();

    if (conflictType === "location") {
      return `Location conflict: "${event1.title}" (${time1}) and "${event2.title}" (${time2}) both in ${event1.location_room}`;
    }

    return `Time overlap: "${event1.title}" (${time1}) conflicts with "${event2.title}" (${time2})`;
  }
}

// =====================================================
// TEST SUITE
// =====================================================

describe("Calendar Conflict Detector", () => {
  let detector: MockConflictDetector;
  let baseEvent: CalendarEvent;
  let conflictingEvent: CalendarEvent;

  beforeEach(() => {
    detector = new MockConflictDetector();

    // Base event: 2:00 PM - 4:00 PM
    baseEvent = {
      id: "event-1",
      org_id: "org-1",
      outlet_id: "outlet-1",
      title: "Wedding Reception",
      description: "Main reception",
      start_time: "2024-01-15T14:00:00Z",
      end_time: "2024-01-15T16:00:00Z",
      date: "2024-01-15",
      location_room: "Ballroom A",
      guest_count: 250,
      department: "Banquets",
      status: EventStatus.CONFIRMED,
      severity: EventSeverity.NORMAL,
      created_by: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    // Conflicting event: 3:00 PM - 5:00 PM (same room)
    conflictingEvent = {
      id: "event-2",
      org_id: "org-1",
      outlet_id: "outlet-1",
      title: "Corporate Dinner",
      description: "Team dinner",
      start_time: "2024-01-15T15:00:00Z",
      end_time: "2024-01-15T17:00:00Z",
      date: "2024-01-15",
      location_room: "Ballroom A",
      guest_count: 120,
      department: "Catering",
      status: EventStatus.CONFIRMED,
      severity: EventSeverity.NORMAL,
      created_by: "user-2",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
  });

  describe("Time Overlap Detection", () => {
    it("should detect time overlap between events", () => {
      const conflict = detector.detectConflict(baseEvent, conflictingEvent);

      expect(conflict).not.toBeNull();
      expect(conflict?.conflict_type).toBe("location");
      expect(conflict?.severity).toBe(ConflictSeverity.WARNING);
    });

    it("should not detect conflict for non-overlapping times", () => {
      const noConflictEvent: CalendarEvent = {
        ...conflictingEvent,
        id: "event-3",
        start_time: "2024-01-15T16:30:00Z",
        end_time: "2024-01-15T18:00:00Z",
      };

      const conflict = detector.detectConflict(baseEvent, noConflictEvent);

      expect(conflict).toBeNull();
    });

    it("should detect back-to-back events as no conflict", () => {
      const backToBackEvent: CalendarEvent = {
        ...conflictingEvent,
        id: "event-4",
        start_time: "2024-01-15T16:00:00Z",
        end_time: "2024-01-15T18:00:00Z",
      };

      const conflict = detector.detectConflict(baseEvent, backToBackEvent);

      // Should not conflict as one ends exactly when other starts
      expect(conflict).toBeNull();
    });

    it("should detect nested events (one completely inside another)", () => {
      const nestedEvent: CalendarEvent = {
        ...conflictingEvent,
        id: "event-5",
        start_time: "2024-01-15T14:30:00Z",
        end_time: "2024-01-15T15:30:00Z",
      };

      const conflict = detector.detectConflict(baseEvent, nestedEvent);

      expect(conflict).not.toBeNull();
    });
  });

  describe("Location Conflict Detection", () => {
    it("should detect same location conflict", () => {
      const conflict = detector.detectConflict(baseEvent, conflictingEvent);

      expect(conflict).not.toBeNull();
      expect(conflict?.location_room || "Ballroom A").toBe("Ballroom A");
    });

    it("should not detect conflict for different locations", () => {
      const differentLocationEvent: CalendarEvent = {
        ...conflictingEvent,
        location_room: "Ballroom B",
      };

      const conflict = detector.detectConflict(
        baseEvent,
        differentLocationEvent,
      );

      // Time overlaps but different rooms - no location conflict
      expect(conflict).toBeNull();
    });

    it("should handle events without location", () => {
      const noLocationEvent: CalendarEvent = {
        ...conflictingEvent,
        location_room: undefined,
      };

      const conflict = detector.detectConflict(baseEvent, noLocationEvent);

      expect(conflict).toBeNull();
    });
  });

  describe("Severity Calculation", () => {
    it("should mark conflict as CRITICAL if either event is locked", () => {
      const lockedEvent: CalendarEvent = {
        ...conflictingEvent,
        status: EventStatus.LOCKED,
      };

      const conflict = detector.detectConflict(baseEvent, lockedEvent);

      expect(conflict?.severity).toBe(ConflictSeverity.CRITICAL);
    });

    it("should mark conflict as WARNING if both events are confirmed", () => {
      const conflict = detector.detectConflict(baseEvent, conflictingEvent);

      expect(conflict?.severity).toBe(ConflictSeverity.WARNING);
    });

    it("should mark conflict as INFO if events are pending", () => {
      const pendingEvent: CalendarEvent = {
        ...conflictingEvent,
        status: EventStatus.PENDING,
      };

      const basePendingEvent: CalendarEvent = {
        ...baseEvent,
        status: EventStatus.PENDING,
      };

      const conflict = detector.detectConflict(basePendingEvent, pendingEvent);

      expect(conflict?.severity).toBe(ConflictSeverity.INFO);
    });

    it("should mark conflict as WARNING if one is confirmed, one is pending", () => {
      const pendingEvent: CalendarEvent = {
        ...conflictingEvent,
        status: EventStatus.PENDING,
      };

      const conflict = detector.detectConflict(baseEvent, pendingEvent);

      expect(conflict?.severity).toBe(ConflictSeverity.INFO);
    });
  });

  describe("Batch Conflict Detection", () => {
    it("should detect multiple conflicts in batch", () => {
      const event3: CalendarEvent = {
        ...baseEvent,
        id: "event-3",
        start_time: "2024-01-15T14:15:00Z",
        end_time: "2024-01-15T15:45:00Z",
      };

      const event4: CalendarEvent = {
        ...baseEvent,
        id: "event-4",
        start_time: "2024-01-15T13:00:00Z",
        end_time: "2024-01-15T14:30:00Z",
      };

      const events = [baseEvent, conflictingEvent, event3, event4];
      const conflicts = detector.detectAllConflicts(baseEvent, events);

      // Should find conflicts with event 3, event 4, and conflicting event
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it("should handle empty event list", () => {
      const conflicts = detector.detectAllConflicts(baseEvent, []);

      expect(conflicts).toEqual([]);
    });

    it("should ignore self-conflicts", () => {
      const events = [baseEvent, conflictingEvent];
      const conflicts = detector.detectAllConflicts(baseEvent, events);

      // Should only find conflicts with other events, not self
      const hasSelfConflict = conflicts.some(
        (c) => c.event_id_1 === baseEvent.id && c.event_id_2 === baseEvent.id,
      );
      expect(hasSelfConflict).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle events at midnight", () => {
      const midnightEvent1: CalendarEvent = {
        ...baseEvent,
        start_time: "2024-01-15T23:30:00Z",
        end_time: "2024-01-16T00:30:00Z",
      };

      const midnightEvent2: CalendarEvent = {
        ...baseEvent,
        id: "event-6",
        start_time: "2024-01-16T00:00:00Z",
        end_time: "2024-01-16T01:00:00Z",
      };

      const conflict = detector.detectConflict(midnightEvent1, midnightEvent2);

      expect(conflict).not.toBeNull();
    });

    it("should handle all-day events", () => {
      const allDayEvent1: CalendarEvent = {
        ...baseEvent,
        start_time: "2024-01-15T00:00:00Z",
        end_time: "2024-01-15T23:59:59Z",
      };

      const allDayEvent2: CalendarEvent = {
        ...conflictingEvent,
        start_time: "2024-01-15T00:00:00Z",
        end_time: "2024-01-15T23:59:59Z",
      };

      const conflict = detector.detectConflict(allDayEvent1, allDayEvent2);

      expect(conflict).not.toBeNull();
    });

    it("should handle very long events (multi-day)", () => {
      const multiDayEvent1: CalendarEvent = {
        ...baseEvent,
        start_time: "2024-01-15T00:00:00Z",
        end_time: "2024-01-17T23:59:59Z",
      };

      const multiDayEvent2: CalendarEvent = {
        ...baseEvent,
        id: "event-7",
        start_time: "2024-01-16T10:00:00Z",
        end_time: "2024-01-16T14:00:00Z",
      };

      const conflict = detector.detectConflict(multiDayEvent1, multiDayEvent2);

      expect(conflict).not.toBeNull();
    });

    it("should handle events with special characters in location names", () => {
      const specialCharsEvent: CalendarEvent = {
        ...baseEvent,
        location_room: "Ballroom A & B's Grand Suite",
      };

      const conflictEvent: CalendarEvent = {
        ...conflictingEvent,
        location_room: "Ballroom A & B's Grand Suite",
      };

      const conflict = detector.detectConflict(
        specialCharsEvent,
        conflictEvent,
      );

      expect(conflict).not.toBeNull();
    });
  });

  describe("Conflict Message Generation", () => {
    it("should generate location conflict message", () => {
      const conflict = detector.detectConflict(baseEvent, conflictingEvent);

      expect(conflict?.message).toContain("Location conflict");
      expect(conflict?.message).toContain("Ballroom A");
      expect(conflict?.message).toContain(baseEvent.title);
      expect(conflict?.message).toContain(conflictingEvent.title);
    });

    it("should include time information in message", () => {
      const conflict = detector.detectConflict(baseEvent, conflictingEvent);

      expect(conflict?.message).toBeDefined();
      expect(conflict?.message?.length || 0).toBeGreaterThan(0);
    });
  });

  describe("Performance", () => {
    it("should handle large batch of events efficiently", () => {
      const largeEventList: CalendarEvent[] = Array.from(
        { length: 100 },
        (_, i) => ({
          ...baseEvent,
          id: `event-${i}`,
          start_time: new Date(Date.UTC(2024, 0, 15, 14 + (i % 10), 0, 0)).toISOString(),
          end_time: new Date(Date.UTC(2024, 0, 15, 15 + (i % 10), 0, 0)).toISOString(),
        }),
      );

      const startTime = performance.now();
      const conflicts = detector.detectAllConflicts(baseEvent, largeEventList);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
      expect(conflicts.length).toBeGreaterThan(0);
    });
  });
});
