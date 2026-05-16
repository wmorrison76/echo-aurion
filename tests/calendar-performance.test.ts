/**
 * Calendar Performance Tests
 * Tests system performance with large datasets and concurrent operations
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CalendarEvent, EventStatus, EventSeverity } from "@/types/calendar";

/**
 * Performance test utilities
 */
class PerformanceTestHelper {
  /**
   * Generate mock events for performance testing
   */
  static generateEvents(
    count: number,
    baseDate: string = "2024-01-15",
  ): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const rooms = ["Room A", "Room B", "Room C", "Ballroom", "Conference Room"];
    const statuses = [
      EventStatus.PENDING,
      EventStatus.CONFIRMED,
      EventStatus.LOCKED,
    ];

    for (let i = 0; i < count; i++) {
      const hour = i % 24;
      const minute = i % 60;
      const dayOffset = Math.floor(i / (24 * 60));

      const startDate = new Date(baseDate);
      startDate.setDate(startDate.getDate() + dayOffset);
      startDate.setHours(hour, minute, 0);

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + 30);

      events.push({
        id: `event-${i}`,
        org_id: "org-1",
        outlet_id: `outlet-${i % 5}`,
        title: `Event ${i}`,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        date: baseDate,
        location_room: rooms[i % rooms.length],
        guest_count: Math.floor(Math.random() * 500) + 10,
        department: `Department ${i % 10}`,
        status: statuses[i % statuses.length],
        severity: EventSeverity.NORMAL,
        created_by: `user-${i % 100}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return events;
  }

  /**
   * Measure execution time
   */
  static measureTime(fn: () => void): number {
    const start = performance.now();
    fn();
    const end = performance.now();
    return end - start;
  }

  /**
   * Measure async execution time
   */
  static async measureTimeAsync(fn: () => Promise<void>): Promise<number> {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
  }
}

/**
 * Performance test suite
 */
class PerformanceTestSuite {
  private events: CalendarEvent[] = [];

  /**
   * Filter events by outlet
   */
  filterByOutlet(outletId: string): CalendarEvent[] {
    return this.events.filter((e) => e.outlet_id === outletId);
  }

  /**
   * Filter events by date range
   */
  filterByDateRange(startDate: string, endDate: string): CalendarEvent[] {
    return this.events.filter((e) => e.date >= startDate && e.date <= endDate);
  }

  /**
   * Find conflicts between all events
   */
  findAllConflicts(): number {
    let conflictCount = 0;

    for (let i = 0; i < this.events.length; i++) {
      for (let j = i + 1; j < this.events.length; j++) {
        const e1 = this.events[i];
        const e2 = this.events[j];

        // Simple conflict detection
        if (e1.location_room === e2.location_room) {
          const start1 = new Date(e1.start_time).getTime();
          const end1 = new Date(e1.end_time).getTime();
          const start2 = new Date(e2.start_time).getTime();
          const end2 = new Date(e2.end_time).getTime();

          if (start1 < end2 && start2 < end1) {
            conflictCount++;
          }
        }
      }
    }

    return conflictCount;
  }

  /**
   * Batch update events
   */
  batchUpdate(updates: Partial<CalendarEvent>, count: number): void {
    for (let i = 0; i < Math.min(count, this.events.length); i++) {
      this.events[i] = {
        ...this.events[i],
        ...updates,
        updated_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Sort events by start time
   */
  sortByStartTime(): void {
    this.events.sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );
  }

  /**
   * Aggregate events by outlet
   */
  aggregateByOutlet(): Record<string, number> {
    const aggregation: Record<string, number> = {};

    for (const event of this.events) {
      aggregation[event.outlet_id] = (aggregation[event.outlet_id] || 0) + 1;
    }

    return aggregation;
  }

  /**
   * Load events
   */
  loadEvents(events: CalendarEvent[]): void {
    this.events = [...events];
  }

  /**
   * Get event count
   */
  getEventCount(): number {
    return this.events.length;
  }
}

// =====================================================
// TEST SUITE
// =====================================================

describe("Calendar Performance Tests", () => {
  let suite: PerformanceTestSuite;

  beforeEach(() => {
    suite = new PerformanceTestSuite();
  });

  describe("Load Performance", () => {
    it("should load 1000 events in reasonable time", () => {
      const events = PerformanceTestHelper.generateEvents(1000);

      const time = PerformanceTestHelper.measureTime(() => {
        suite.loadEvents(events);
      });

      expect(time).toBeLessThan(100); // Should load in < 100ms
      expect(suite.getEventCount()).toBe(1000);
    });

    it("should load 5000 events efficiently", () => {
      const events = PerformanceTestHelper.generateEvents(5000);

      const time = PerformanceTestHelper.measureTime(() => {
        suite.loadEvents(events);
      });

      expect(time).toBeLessThan(500); // Should load in < 500ms
      expect(suite.getEventCount()).toBe(5000);
    });

    it("should load 10000 events", () => {
      const events = PerformanceTestHelper.generateEvents(10000);

      const time = PerformanceTestHelper.measureTime(() => {
        suite.loadEvents(events);
      });

      expect(time).toBeLessThan(1000); // Should load in < 1s
      expect(suite.getEventCount()).toBe(10000);
    });
  });

  describe("Query Performance", () => {
    beforeEach(() => {
      const events = PerformanceTestHelper.generateEvents(1000);
      suite.loadEvents(events);
    });

    it("should filter by outlet efficiently", () => {
      const time = PerformanceTestHelper.measureTime(() => {
        suite.filterByOutlet("outlet-1");
      });

      expect(time).toBeLessThan(50); // Filter should be < 50ms
    });

    it("should filter by date range efficiently", () => {
      const time = PerformanceTestHelper.measureTime(() => {
        suite.filterByDateRange("2024-01-15", "2024-01-20");
      });

      expect(time).toBeLessThan(50);
    });

    it("should aggregate by outlet efficiently", () => {
      const time = PerformanceTestHelper.measureTime(() => {
        suite.aggregateByOutlet();
      });

      expect(time).toBeLessThan(50);
    });
  });

  describe("Conflict Detection Performance", () => {
    it("should detect conflicts among 500 events", () => {
      const events = PerformanceTestHelper.generateEvents(500);
      suite.loadEvents(events);

      const time = PerformanceTestHelper.measureTime(() => {
        suite.findAllConflicts();
      });

      // Conflict detection is O(n²), should complete in reasonable time
      expect(time).toBeLessThan(5000); // < 5 seconds for 500 events
    });

    it("should detect conflicts with optimized algorithm", () => {
      const events = PerformanceTestHelper.generateEvents(1000);
      suite.loadEvents(events);

      // With proper indexing/optimization, should be faster
      const time = PerformanceTestHelper.measureTime(() => {
        // Real implementation would use spatial indexing or room-based bucketing
        const byRoom = new Map<string, CalendarEvent[]>();
        for (const event of events) {
          if (!byRoom.has(event.location_room || "")) {
            byRoom.set(event.location_room || "", []);
          }
          byRoom.get(event.location_room || "")?.push(event);
        }

        let conflicts = 0;
        for (const room of byRoom.values()) {
          for (let i = 0; i < room.length; i++) {
            for (let j = i + 1; j < room.length; j++) {
              const e1 = room[i];
              const e2 = room[j];
              const start1 = new Date(e1.start_time).getTime();
              const end1 = new Date(e1.end_time).getTime();
              const start2 = new Date(e2.start_time).getTime();
              const end2 = new Date(e2.end_time).getTime();

              if (start1 < end2 && start2 < end1) {
                conflicts++;
              }
            }
          }
        }
      });

      // Optimized version should be significantly faster
      expect(time).toBeLessThan(2000);
    });
  });

  describe("Update Performance", () => {
    beforeEach(() => {
      const events = PerformanceTestHelper.generateEvents(1000);
      suite.loadEvents(events);
    });

    it("should batch update 100 events efficiently", () => {
      const time = PerformanceTestHelper.measureTime(() => {
        suite.batchUpdate(
          {
            status: EventStatus.CONFIRMED,
          },
          100,
        );
      });

      expect(time).toBeLessThan(50);
    });

    it("should batch update 500 events efficiently", () => {
      const time = PerformanceTestHelper.measureTime(() => {
        suite.batchUpdate(
          {
            status: EventStatus.CONFIRMED,
          },
          500,
        );
      });

      expect(time).toBeLessThan(100);
    });
  });

  describe("Sorting Performance", () => {
    beforeEach(() => {
      const events = PerformanceTestHelper.generateEvents(1000);
      suite.loadEvents(events);
    });

    it("should sort 1000 events efficiently", () => {
      const time = PerformanceTestHelper.measureTime(() => {
        suite.sortByStartTime();
      });

      expect(time).toBeLessThan(100); // Sort should be < 100ms
    });
  });

  describe("Memory Usage", () => {
    it("should handle 1000 events without excessive memory", () => {
      const events = PerformanceTestHelper.generateEvents(1000);

      const before = process.memoryUsage().heapUsed;
      suite.loadEvents(events);
      const after = process.memoryUsage().heapUsed;
      const memoryUsed = (after - before) / 1024 / 1024; // MB

      // Rough estimate: ~5KB per event = ~5MB for 1000 events
      expect(memoryUsed).toBeLessThan(50); // Less than 50MB
    });
  });

  describe("Concurrent Operations Performance", () => {
    it("should handle concurrent reads on large dataset", async () => {
      const events = PerformanceTestHelper.generateEvents(1000);
      suite.loadEvents(events);

      const time = await PerformanceTestHelper.measureTimeAsync(async () => {
        const promises = Array.from({ length: 10 }, () =>
          Promise.resolve(suite.filterByOutlet("outlet-1")),
        );

        await Promise.all(promises);
      });

      expect(time).toBeLessThan(100);
    });
  });

  describe("Scalability Benchmarks", () => {
    it("should scale operations with increasing event count", () => {
      const results: { count: number; time: number }[] = [];

      for (const count of [100, 500, 1000, 5000]) {
        const events = PerformanceTestHelper.generateEvents(count);

        const time = PerformanceTestHelper.measureTime(() => {
          suite.loadEvents(events);
          suite.sortByStartTime();
          suite.aggregateByOutlet();
        });

        results.push({ count, time });
      }

      // Operations should scale roughly linearly (not exponentially)
      const scaleFactor = results[2].time / results[0].time;
      expect(scaleFactor).toBeLessThan(100); // 1000/100 = 10x, should be < 100x
    });
  });

  describe("Realistic Workflow Performance", () => {
    it("should complete realistic workflow efficiently", () => {
      const events = PerformanceTestHelper.generateEvents(2000);
      suite.loadEvents(events);

      const time = PerformanceTestHelper.measureTime(() => {
        // Load
        suite.loadEvents(events);

        // Filter
        const filtered = suite.filterByDateRange("2024-01-15", "2024-01-30");

        // Sort
        suite.sortByStartTime();

        // Aggregate
        suite.aggregateByOutlet();

        // Update subset
        suite.batchUpdate({ status: EventStatus.CONFIRMED }, 100);
      });

      expect(time).toBeLessThan(1000); // Complete workflow < 1 second
    });
  });

  describe("Stress Tests", () => {
    it("should not crash with 50000 events", () => {
      const events = PerformanceTestHelper.generateEvents(50000);

      expect(() => {
        suite.loadEvents(events);
      }).not.toThrow();

      expect(suite.getEventCount()).toBe(50000);
    });
  });
});
