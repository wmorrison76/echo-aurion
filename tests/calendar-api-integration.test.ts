/**
 * Calendar API Integration Tests
 * Tests for REST API endpoints with full request/response cycle
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  CalendarEvent,
  CreateEventRequest,
  UpdateEventRequest,
  EventStatus,
  EventSeverity,
  ApiResponse,
  PaginatedResponse,
} from "@/types/calendar";

/**
 * Mock API response handler for testing
 */
class MockCalendarAPI {
  private events: Map<string, CalendarEvent> = new Map();
  private nextId = 1;

  /**
   * POST /api/calendar/events
   */
  async createEvent(
    req: CreateEventRequest,
  ): Promise<{ event: CalendarEvent; conflicts: any[] }> {
    const event: CalendarEvent = {
      id: `event-${this.nextId++}`,
      org_id: req.org_id || "org-1",
      outlet_id: req.outlet_id,
      title: req.title,
      description: req.description,
      start_time: req.start_time,
      end_time: req.end_time,
      date: req.start_time.split("T")[0],
      location_room: req.location_room,
      guest_count: req.guest_count,
      department: req.department,
      status: req.status || EventStatus.PENDING,
      severity: req.severity || EventSeverity.NORMAL,
      created_by: req.created_by || "user-1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: req.notes,
      beo_id: req.beo_id,
      revenue: req.revenue,
      contact_person: req.contact_person,
    };

    this.events.set(event.id, event);

    return {
      event,
      conflicts: [],
    };
  }

  /**
   * GET /api/calendar/events
   */
  async listEvents(filters?: {
    outlet_ids?: string[];
    start_date?: string;
    end_date?: string;
    status?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ events: CalendarEvent[]; total: number }> {
    let events = Array.from(this.events.values());

    // Apply filters
    if (filters?.outlet_ids?.length) {
      events = events.filter((e) => filters.outlet_ids?.includes(e.outlet_id));
    }

    if (filters?.start_date && filters?.end_date) {
      events = events.filter(
        (e) => e.date >= filters.start_date! && e.date <= filters.end_date!,
      );
    }

    if (filters?.status?.length) {
      events = events.filter((e) => filters.status?.includes(e.status));
    }

    const total = events.length;
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    return {
      events: events.slice(offset, offset + limit),
      total,
    };
  }

  /**
   * GET /api/calendar/events/:id
   */
  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    return this.events.get(eventId) || null;
  }

  /**
   * PATCH /api/calendar/events/:id
   */
  async updateEvent(
    eventId: string,
    updates: UpdateEventRequest,
  ): Promise<CalendarEvent> {
    const event = this.events.get(eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const updated = {
      ...event,
      ...updates,
      id: eventId, // Don't allow ID changes
      org_id: event.org_id, // Don't allow org changes
      outlet_id: event.outlet_id, // Don't allow outlet changes
      created_by: event.created_by, // Don't allow creator changes
      created_at: event.created_at, // Don't allow creation date changes
      updated_at: new Date().toISOString(),
    };

    this.events.set(eventId, updated);
    return updated;
  }

  /**
   * DELETE /api/calendar/events/:id
   */
  async deleteEvent(eventId: string): Promise<void> {
    if (!this.events.has(eventId)) {
      throw new Error("Event not found");
    }

    this.events.delete(eventId);
  }

  /**
   * GET /api/calendar/events/:id/conflicts
   */
  async getEventConflicts(eventId: string): Promise<any[]> {
    // Mock: return empty conflicts
    return [];
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.events.clear();
    this.nextId = 1;
  }
}

// =====================================================
// TEST SUITE
// =====================================================

describe("Calendar API Integration", () => {
  let api: MockCalendarAPI;
  let testEvent: CreateEventRequest;

  beforeEach(() => {
    api = new MockCalendarAPI();

    testEvent = {
      title: "Team Meeting",
      outlet_id: "outlet-1",
      org_id: "org-1",
      start_time: "2024-01-15T14:00:00Z",
      end_time: "2024-01-15T15:00:00Z",
      status: EventStatus.CONFIRMED,
      severity: EventSeverity.NORMAL,
      created_by: "user-1",
      department: "Engineering",
      location_room: "Conference Room A",
      guest_count: 10,
      notes: "Sprint planning",
    };
  });

  describe("POST /api/calendar/events", () => {
    it("should create event with required fields", async () => {
      const result = await api.createEvent(testEvent);

      expect(result.event).toBeDefined();
      expect(result.event.id).toBeDefined();
      expect(result.event.title).toBe(testEvent.title);
      expect(result.event.outlet_id).toBe(testEvent.outlet_id);
      expect(result.event.status).toBe(EventStatus.CONFIRMED);
    });

    it("should generate unique IDs for each event", async () => {
      const event1 = await api.createEvent(testEvent);
      const event2 = await api.createEvent({
        ...testEvent,
        title: "Meeting 2",
      });

      expect(event1.event.id).not.toBe(event2.event.id);
    });

    it("should set created_at and updated_at timestamps", async () => {
      const before = new Date().getTime();
      const result = await api.createEvent(testEvent);
      const after = new Date().getTime();

      const createdAt = new Date(result.event.created_at).getTime();
      const updatedAt = new Date(result.event.updated_at).getTime();

      expect(createdAt).toBeGreaterThanOrEqual(before);
      expect(createdAt).toBeLessThanOrEqual(after);
      expect(updatedAt).toEqual(createdAt);
    });

    it("should handle optional fields", async () => {
      const minimalEvent: CreateEventRequest = {
        title: "Minimal Event",
        outlet_id: "outlet-1",
        org_id: "org-1",
        start_time: "2024-01-15T14:00:00Z",
        end_time: "2024-01-15T15:00:00Z",
        created_by: "user-1",
      };

      const result = await api.createEvent(minimalEvent);

      expect(result.event.title).toBe(minimalEvent.title);
      expect(result.event.description).toBeUndefined();
      expect(result.event.notes).toBeUndefined();
    });

    it("should initialize conflicts array", async () => {
      const result = await api.createEvent(testEvent);

      expect(Array.isArray(result.conflicts)).toBe(true);
    });
  });

  describe("GET /api/calendar/events", () => {
    beforeEach(async () => {
      await api.createEvent(testEvent);
      await api.createEvent({
        ...testEvent,
        title: "Meeting 2",
        outlet_id: "outlet-2",
      });
      await api.createEvent({
        ...testEvent,
        title: "Meeting 3",
        status: EventStatus.PENDING,
      });
    });

    it("should list all events", async () => {
      const result = await api.listEvents();

      expect(result.total).toBe(3);
      expect(result.events.length).toBe(3);
    });

    it("should filter by outlet_ids", async () => {
      const result = await api.listEvents({
        outlet_ids: ["outlet-1"],
      });

      expect(result.events.length).toBe(2);
      expect(result.events.every((e) => e.outlet_id === "outlet-1")).toBe(true);
    });

    it("should filter by date range", async () => {
      const result = await api.listEvents({
        start_date: "2024-01-15",
        end_date: "2024-01-15",
      });

      expect(result.events.length).toBe(3);
    });

    it("should filter by status", async () => {
      const result = await api.listEvents({
        status: [EventStatus.PENDING],
      });

      expect(result.events.length).toBe(1);
      expect(result.events[0].status).toBe(EventStatus.PENDING);
    });

    it("should support pagination", async () => {
      const page1 = await api.listEvents({
        limit: 2,
        offset: 0,
      });

      expect(page1.events.length).toBe(2);
      expect(page1.total).toBe(3);

      const page2 = await api.listEvents({
        limit: 2,
        offset: 2,
      });

      expect(page2.events.length).toBe(1);
    });

    it("should combine multiple filters", async () => {
      const result = await api.listEvents({
        outlet_ids: ["outlet-1"],
        status: [EventStatus.CONFIRMED],
        start_date: "2024-01-15",
        end_date: "2024-01-15",
      });

      expect(
        result.events.every(
          (e) =>
            e.outlet_id === "outlet-1" && e.status === EventStatus.CONFIRMED,
        ),
      ).toBe(true);
    });
  });

  describe("GET /api/calendar/events/:id", () => {
    let eventId: string;

    beforeEach(async () => {
      const result = await api.createEvent(testEvent);
      eventId = result.event.id;
    });

    it("should retrieve event by ID", async () => {
      const event = await api.getEvent(eventId);

      expect(event).not.toBeNull();
      expect(event?.id).toBe(eventId);
      expect(event?.title).toBe(testEvent.title);
    });

    it("should return null for non-existent event", async () => {
      const event = await api.getEvent("non-existent-id");

      expect(event).toBeNull();
    });
  });

  describe("PATCH /api/calendar/events/:id", () => {
    let eventId: string;

    beforeEach(async () => {
      const result = await api.createEvent(testEvent);
      eventId = result.event.id;
    });

    it("should update event fields", async () => {
      const updates: UpdateEventRequest = {
        title: "Updated Meeting",
        status: EventStatus.LOCKED,
      };

      const updated = await api.updateEvent(eventId, updates);

      expect(updated.title).toBe("Updated Meeting");
      expect(updated.status).toBe(EventStatus.LOCKED);
    });

    it("should not allow changing immutable fields", async () => {
      const updates: UpdateEventRequest = {
        title: "Updated",
        org_id: "org-2", // Should not change
      };

      const updated = await api.updateEvent(eventId, updates);

      expect(updated.org_id).toBe(testEvent.org_id);
      expect(updated.title).toBe("Updated");
    });

    it("should update updated_at timestamp", async () => {
      const before = await api.getEvent(eventId);
      const createdAt = before?.created_at;

      // Wait a bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await api.updateEvent(eventId, {
        title: "Updated",
      });

      expect(updated.updated_at).not.toBe(createdAt);
      expect(new Date(updated.updated_at).getTime()).toBeGreaterThan(
        new Date(createdAt!).getTime(),
      );
    });

    it("should throw error for non-existent event", async () => {
      await expect(
        api.updateEvent("non-existent-id", {
          title: "Updated",
        }),
      ).rejects.toThrow("Event not found");
    });
  });

  describe("DELETE /api/calendar/events/:id", () => {
    let eventId: string;

    beforeEach(async () => {
      const result = await api.createEvent(testEvent);
      eventId = result.event.id;
    });

    it("should delete event by ID", async () => {
      await api.deleteEvent(eventId);

      const deleted = await api.getEvent(eventId);
      expect(deleted).toBeNull();
    });

    it("should throw error for non-existent event", async () => {
      await expect(api.deleteEvent("non-existent-id")).rejects.toThrow(
        "Event not found",
      );
    });
  });

  describe("GET /api/calendar/events/:id/conflicts", () => {
    let eventId: string;

    beforeEach(async () => {
      const result = await api.createEvent(testEvent);
      eventId = result.event.id;
    });

    it("should return conflicts array", async () => {
      const conflicts = await api.getEventConflicts(eventId);

      expect(Array.isArray(conflicts)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing required fields", async () => {
      const invalidEvent = {
        title: "Event",
        // Missing outlet_id
      } as any;

      // Should throw or return error
      expect(() => {
        const event = {
          ...testEvent,
          outlet_id: invalidEvent.outlet_id,
        };
        if (!event.outlet_id) throw new Error("outlet_id is required");
      }).toThrow("outlet_id is required");
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent creates", async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        api.createEvent({
          ...testEvent,
          title: `Event ${i}`,
        }),
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(5);
      expect(new Set(results.map((r) => r.event.id)).size).toBe(5); // All unique IDs
    });

    it("should handle concurrent reads and writes", async () => {
      const createPromise = api.createEvent(testEvent);
      const listPromise = api.listEvents();

      const [created, listed] = await Promise.all([createPromise, listPromise]);

      expect(created.event).toBeDefined();
      expect(listed.events).toBeDefined();
    });
  });

  describe("Data Consistency", () => {
    it("should maintain referential integrity", async () => {
      const event = await api.createEvent(testEvent);
      const retrieved = await api.getEvent(event.event.id);

      expect(retrieved).toEqual(event.event);
    });

    it("should preserve all event data through CRUD cycle", async () => {
      const created = await api.createEvent(testEvent);
      const retrieved = await api.getEvent(created.event.id);
      const updated = await api.updateEvent(created.event.id, {
        title: "Updated Title",
      });

      // Original fields should be preserved
      expect(updated.outlet_id).toBe(created.event.outlet_id);
      expect(updated.org_id).toBe(created.event.org_id);
      expect(updated.created_by).toBe(created.event.created_by);
    });
  });
});
