/**
 * Calendar E2E Workflow Tests
 * Tests complete user workflows from creation through resolution
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CalendarEvent,
  EventStatus,
  EventSeverity,
  ConflictSeverity,
} from "@/types/calendar";

/**
 * Mock calendar system for E2E testing
 * Simulates complete workflow with UI, API, and broadcast
 */
class CalendarWorkflowSimulator {
  private events: Map<string, CalendarEvent> = new Map();
  private conflicts: Map<string, any> = new Map();
  private broadcastLog: any[] = [];
  private nextId = 1;

  /**
   * Simulate user workflow: Create event → Detect conflicts → Resolve
   */
  async workflowCreateEventWithConflictResolution(
    event: Omit<CalendarEvent, "id" | "created_at" | "updated_at">,
    conflictingEventData?: Partial<CalendarEvent>,
  ): Promise<{
    event: CalendarEvent;
    conflicts: any[];
    resolvedConflicts: any[];
  }> {
    // Step 1: Create event
    const createdEvent: CalendarEvent = {
      ...event,
      id: `event-${this.nextId++}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.events.set(createdEvent.id, createdEvent);
    this.broadcastLog.push({
      type: "event-created",
      eventId: createdEvent.id,
      timestamp: Date.now(),
    });

    // Step 2: Detect conflicts
    let conflicts: any[] = [];
    if (conflictingEventData) {
      const conflictingEvent: CalendarEvent = {
        ...(conflictingEventData as CalendarEvent),
        id: `event-${this.nextId++}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.events.set(conflictingEvent.id, conflictingEvent);

      // Simple conflict detection based on location and time overlap
      if (createdEvent.location_room === conflictingEvent.location_room) {
        const start1 = new Date(createdEvent.start_time).getTime();
        const end1 = new Date(createdEvent.end_time).getTime();
        const start2 = new Date(conflictingEvent.start_time).getTime();
        const end2 = new Date(conflictingEvent.end_time).getTime();

        if (start1 < end2 && start2 < end1) {
          const conflict = {
            id: `conflict-${createdEvent.id}-${conflictingEvent.id}`,
            event_id_1: createdEvent.id,
            event_id_2: conflictingEvent.id,
            severity: ConflictSeverity.WARNING,
            message: `Conflict between "${createdEvent.title}" and "${conflictingEvent.title}"`,
            resolved_at: null,
          };

          conflicts.push(conflict);
          this.conflicts.set(conflict.id, conflict);

          this.broadcastLog.push({
            type: "conflict-detected",
            conflictId: conflict.id,
            timestamp: Date.now(),
          });
        }
      }
    }

    // Step 3: Resolve conflicts
    const resolvedConflicts = [];
    for (const conflict of conflicts) {
      const resolution = {
        conflictId: conflict.id,
        resolution_notes: "Moved event to different time",
        resolved_at: new Date().toISOString(),
      };

      resolvedConflicts.push(resolution);
      conflict.resolved_at = resolution.resolved_at;

      this.broadcastLog.push({
        type: "conflict-resolved",
        conflictId: conflict.id,
        timestamp: Date.now(),
      });
    }

    return {
      event: createdEvent,
      conflicts,
      resolvedConflicts,
    };
  }

  /**
   * Simulate user workflow: Create → Update → Delete
   */
  async workflowEventLifecycle(
    initialEvent: Omit<CalendarEvent, "id" | "created_at" | "updated_at">,
  ): Promise<{
    created: CalendarEvent;
    updated: CalendarEvent;
    deleted: boolean;
  }> {
    // Create
    const created: CalendarEvent = {
      ...initialEvent,
      id: `event-${this.nextId++}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.events.set(created.id, created);

    this.broadcastLog.push({
      type: "event-created",
      eventId: created.id,
    });

    // Update
    const updated: CalendarEvent = {
      ...created,
      status: EventStatus.CONFIRMED,
      guest_count: (created.guest_count || 0) + 20,
      updated_at: new Date().toISOString(),
    };

    this.events.set(updated.id, updated);

    this.broadcastLog.push({
      type: "event-updated",
      eventId: updated.id,
    });

    // Delete
    this.events.delete(created.id);

    this.broadcastLog.push({
      type: "event-deleted",
      eventId: created.id,
    });

    return {
      created,
      updated,
      deleted: !this.events.has(created.id),
    };
  }

  /**
   * Simulate multi-user concurrent editing with conflicts
   */
  async workflowConcurrentEditing(
    eventId: string,
    user1Update: Partial<CalendarEvent>,
    user2Update: Partial<CalendarEvent>,
  ): Promise<{
    user1Conflict: boolean;
    user2Conflict: boolean;
    finalEvent: CalendarEvent;
  }> {
    let event = this.events.get(eventId);
    if (!event) throw new Error("Event not found");

    // Simulate both users attempting updates
    const user1Event = {
      ...event,
      ...user1Update,
      updated_at: new Date().toISOString(),
    };
    const user2Event = {
      ...event,
      ...user2Update,
      updated_at: new Date().toISOString(),
    };

    // Determine conflict resolution (last write wins in this simple scenario)
    let finalEvent = user2Event;
    let user1Conflict = false;
    let user2Conflict = false;

    // Check for data conflicts
    if (
      user1Update.status &&
      user2Update.status &&
      user1Update.status !== user2Update.status
    ) {
      user1Conflict = true;
      user2Conflict = true;
    }

    this.events.set(eventId, finalEvent);

    this.broadcastLog.push({
      type: "event-sync",
      eventId,
      conflictDetected: user1Conflict || user2Conflict,
    });

    return {
      user1Conflict,
      user2Conflict,
      finalEvent,
    };
  }

  /**
   * Simulate bulk import workflow
   */
  async workflowBulkImport(
    events: Array<Omit<CalendarEvent, "id" | "created_at" | "updated_at">>,
  ): Promise<{
    importedCount: number;
    failedCount: number;
    conflictCount: number;
  }> {
    let importedCount = 0;
    let failedCount = 0;
    let conflictCount = 0;

    for (const eventData of events) {
      try {
        const event: CalendarEvent = {
          ...eventData,
          id: `event-${this.nextId++}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Check for conflicts
        const hasConflict = Array.from(this.events.values()).some(
          (existing) =>
            existing.location_room === event.location_room &&
            new Date(existing.start_time).getTime() <
              new Date(event.end_time).getTime() &&
            new Date(existing.end_time).getTime() >
              new Date(event.start_time).getTime(),
        );

        if (hasConflict) {
          conflictCount++;
        }

        this.events.set(event.id, event);
        importedCount++;
      } catch (error) {
        failedCount++;
      }
    }

    this.broadcastLog.push({
      type: "bulk-import",
      importedCount,
      failedCount,
      conflictCount,
    });

    return {
      importedCount,
      failedCount,
      conflictCount,
    };
  }

  /**
   * Get broadcast log
   */
  getBroadcastLog(): any[] {
    return [...this.broadcastLog];
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.events.clear();
    this.conflicts.clear();
    this.broadcastLog = [];
    this.nextId = 1;
  }
}

// =====================================================
// TEST SUITE
// =====================================================

describe("Calendar E2E Workflows", () => {
  let simulator: CalendarWorkflowSimulator;

  beforeEach(() => {
    simulator = new CalendarWorkflowSimulator();
  });

  describe("Workflow: Create Event with Conflict Resolution", () => {
    it("should create event without conflicts", async () => {
      const result = await simulator.workflowCreateEventWithConflictResolution({
        org_id: "org-1",
        outlet_id: "outlet-1",
        title: "Team Meeting",
        start_time: "2024-01-15T14:00:00Z",
        end_time: "2024-01-15T15:00:00Z",
        location_room: "Room A",
        status: EventStatus.CONFIRMED,
        severity: EventSeverity.NORMAL,
        created_by: "user-1",
      });

      expect(result.event).toBeDefined();
      expect(result.event.title).toBe("Team Meeting");
      expect(result.conflicts.length).toBe(0);
    });

    it("should detect and resolve conflicts", async () => {
      const result = await simulator.workflowCreateEventWithConflictResolution(
        {
          org_id: "org-1",
          outlet_id: "outlet-1",
          title: "Wedding Reception",
          start_time: "2024-01-15T14:00:00Z",
          end_time: "2024-01-15T16:00:00Z",
          location_room: "Ballroom A",
          status: EventStatus.CONFIRMED,
          severity: EventSeverity.NORMAL,
          created_by: "user-1",
        },
        {
          org_id: "org-1",
          outlet_id: "outlet-1",
          title: "Corporate Dinner",
          start_time: "2024-01-15T15:30:00Z",
          end_time: "2024-01-15T17:00:00Z",
          location_room: "Ballroom A",
          status: EventStatus.CONFIRMED,
          severity: EventSeverity.NORMAL,
          created_by: "user-2",
        },
      );

      expect(result.event.title).toBe("Wedding Reception");
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.resolvedConflicts.length).toBeGreaterThan(0);
    });

    it("should broadcast events during conflict resolution", async () => {
      await simulator.workflowCreateEventWithConflictResolution(
        {
          org_id: "org-1",
          outlet_id: "outlet-1",
          title: "Event 1",
          start_time: "2024-01-15T14:00:00Z",
          end_time: "2024-01-15T16:00:00Z",
          location_room: "Room A",
          status: EventStatus.CONFIRMED,
          severity: EventSeverity.NORMAL,
          created_by: "user-1",
        },
        {
          org_id: "org-1",
          outlet_id: "outlet-1",
          title: "Event 2",
          start_time: "2024-01-15T15:00:00Z",
          end_time: "2024-01-15T17:00:00Z",
          location_room: "Room A",
          status: EventStatus.CONFIRMED,
          severity: EventSeverity.NORMAL,
          created_by: "user-2",
        },
      );

      const log = simulator.getBroadcastLog();

      expect(log.some((e) => e.type === "event-created")).toBe(true);
      expect(log.some((e) => e.type === "conflict-detected")).toBe(true);
      expect(log.some((e) => e.type === "conflict-resolved")).toBe(true);
    });
  });

  describe("Workflow: Event Lifecycle (Create → Update → Delete)", () => {
    it("should complete full event lifecycle", async () => {
      const result = await simulator.workflowEventLifecycle({
        org_id: "org-1",
        outlet_id: "outlet-1",
        title: "Project Kickoff",
        start_time: "2024-01-15T10:00:00Z",
        end_time: "2024-01-15T11:00:00Z",
        location_room: "Conference Room",
        guest_count: 5,
        status: EventStatus.PENDING,
        severity: EventSeverity.NORMAL,
        created_by: "user-1",
      });

      expect(result.created.title).toBe("Project Kickoff");
      expect(result.created.status).toBe(EventStatus.PENDING);

      expect(result.updated.status).toBe(EventStatus.CONFIRMED);
      expect(result.updated.guest_count).toBe(25);

      expect(result.deleted).toBe(true);
    });

    it("should track status changes through lifecycle", async () => {
      await simulator.workflowEventLifecycle({
        org_id: "org-1",
        outlet_id: "outlet-1",
        title: "Event",
        start_time: "2024-01-15T10:00:00Z",
        end_time: "2024-01-15T11:00:00Z",
        status: EventStatus.PENDING,
        severity: EventSeverity.NORMAL,
        created_by: "user-1",
      });

      const log = simulator.getBroadcastLog();
      const types = log.map((e) => e.type);

      expect(types).toContain("event-created");
      expect(types).toContain("event-updated");
      expect(types).toContain("event-deleted");
    });
  });

  describe("Workflow: Multi-user Concurrent Editing", () => {
    it("should handle concurrent updates with conflict detection", async () => {
      // Create base event
      const baseEvent: CalendarEvent = {
        id: "event-1",
        org_id: "org-1",
        outlet_id: "outlet-1",
        title: "Team Sync",
        start_time: "2024-01-15T14:00:00Z",
        end_time: "2024-01-15T15:00:00Z",
        date: "2024-01-15",
        location_room: "Room A",
        guest_count: 10,
        department: "Engineering",
        status: EventStatus.PENDING,
        severity: EventSeverity.NORMAL,
        created_by: "user-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Add the event to the simulator first
      simulator.events.set(baseEvent.id, baseEvent);

      const result = await simulator.workflowConcurrentEditing(
        baseEvent.id,
        { status: EventStatus.CONFIRMED },
        { status: EventStatus.LOCKED },
      );

      // Conflict detected because different status updates
      expect(result.user1Conflict || result.user2Conflict).toBe(true);
      expect(result.finalEvent).toBeDefined();
    });
  });

  describe("Workflow: Bulk Import", () => {
    it("should successfully import multiple events", async () => {
      const events = Array.from({ length: 10 }, (_, i) => ({
        org_id: "org-1",
        outlet_id: "outlet-1",
        title: `Event ${i}`,
        start_time: `2024-01-${15 + Math.floor(i / 2)}T${14 + (i % 2)}:00:00Z`,
        end_time: `2024-01-${15 + Math.floor(i / 2)}T${14 + (i % 2)}:30:00Z`,
        location_room: `Room ${(i % 3) + 1}`,
        status: EventStatus.CONFIRMED,
        severity: EventSeverity.NORMAL,
        created_by: "import-user",
      }));

      const result = await simulator.workflowBulkImport(events);

      expect(result.importedCount).toBe(10);
      expect(result.failedCount).toBe(0);
    });

    it("should detect conflicts during bulk import", async () => {
      const events = [
        {
          org_id: "org-1",
          outlet_id: "outlet-1",
          title: "Event 1",
          start_time: "2024-01-15T14:00:00Z",
          end_time: "2024-01-15T15:00:00Z",
          location_room: "Room A",
          status: EventStatus.CONFIRMED,
          severity: EventSeverity.NORMAL,
          created_by: "user-1",
        },
        {
          org_id: "org-1",
          outlet_id: "outlet-1",
          title: "Event 2",
          start_time: "2024-01-15T14:30:00Z",
          end_time: "2024-01-15T15:30:00Z",
          location_room: "Room A",
          status: EventStatus.CONFIRMED,
          severity: EventSeverity.NORMAL,
          created_by: "user-1",
        },
      ];

      const result = await simulator.workflowBulkImport(events);

      expect(result.importedCount).toBe(2);
      expect(result.conflictCount).toBeGreaterThan(0);
    });

    it("should track bulk import in broadcast log", async () => {
      const events = Array.from({ length: 5 }, (_, i) => ({
        org_id: "org-1",
        outlet_id: "outlet-1",
        title: `Event ${i}`,
        start_time: `2024-01-15T${10 + i}:00:00Z`,
        end_time: `2024-01-15T${10 + i + 1}:00:00Z`,
        status: EventStatus.CONFIRMED,
        severity: EventSeverity.NORMAL,
        created_by: "importer",
      }));

      await simulator.workflowBulkImport(events);

      const log = simulator.getBroadcastLog();
      const bulkImport = log.find((e) => e.type === "bulk-import");

      expect(bulkImport).toBeDefined();
      expect(bulkImport?.importedCount).toBe(5);
    });
  });

  describe("Workflow: Calendar Sync Between Users", () => {
    it("should handle multiple users viewing same calendar", async () => {
      // Create event as user 1
      const result1 = await simulator.workflowCreateEventWithConflictResolution(
        {
          org_id: "org-1",
          outlet_id: "outlet-1",
          title: "Shared Event",
          start_time: "2024-01-15T14:00:00Z",
          end_time: "2024-01-15T15:00:00Z",
          status: EventStatus.CONFIRMED,
          severity: EventSeverity.NORMAL,
          created_by: "user-1",
        },
      );

      // User 2 attempts to create overlapping event
      const result2 = await simulator.workflowCreateEventWithConflictResolution(
        {
          org_id: "org-1",
          outlet_id: "outlet-1",
          title: "Another Event",
          start_time: "2024-01-15T14:30:00Z",
          end_time: "2024-01-15T15:30:00Z",
          location_room: result1.event.location_room,
          status: EventStatus.CONFIRMED,
          severity: EventSeverity.NORMAL,
          created_by: "user-2",
        },
      );

      // Broadcasts should show both creations
      const log = simulator.getBroadcastLog();
      const creations = log.filter((e) => e.type === "event-created");

      expect(creations.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Broadcast Verification", () => {
    it("should emit broadcasts for all workflow events", async () => {
      const simulator2 = new CalendarWorkflowSimulator();

      await simulator2.workflowCreateEventWithConflictResolution({
        org_id: "org-1",
        outlet_id: "outlet-1",
        title: "Test Event",
        start_time: "2024-01-15T14:00:00Z",
        end_time: "2024-01-15T15:00:00Z",
        status: EventStatus.CONFIRMED,
        severity: EventSeverity.NORMAL,
        created_by: "user-1",
      });

      const log = simulator2.getBroadcastLog();

      expect(log.length).toBeGreaterThan(0);
      expect(log[0].type).toBeDefined();
      expect(log[0].timestamp || log[0].eventId).toBeDefined();
    });
  });
});
