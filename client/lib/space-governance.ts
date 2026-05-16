/**
 * Space Governance Engine
 *
 * PURPOSE:
 *   - Evaluate if a work order or activity can be scheduled
 *   - Detect conflicts with existing events and buffer times
 *   - Suggest alternative time windows
 *   - Enforce space constraints
 *
 * FEATURES:
 *   - Time conflict detection
 *   - Buffer time enforcement (before/after events)
 *   - Alternative slot suggestions
 *   - Space capacity validation
 *   - Event priority levels
 *
 * USAGE:
 *   const engine = new SpaceGovernanceEngine(events);
 *   const result = engine.checkRequest({
 *     space: "Aviva",
 *     start: new Date(...),
 *     end: new Date(...),
 *     bufferBefore: 30,
 *     bufferAfter: 15
 *   });
 */

/**
 * Event interface for conflict detection
 */
export interface GovernanceEvent {
  id: string | number;
  space: string;
  title: string;
  start: Date;
  end: Date;
  priority?: "high" | "medium" | "low"; // high priority events get buffer protection
  capacity?: number; // max people allowed
}

/**
 * Request interface
 */
export interface ScheduleRequest {
  space: string;
  start: Date;
  end: Date;
  bufferBefore?: number; // minutes before event
  bufferAfter?: number; // minutes after event
  expectedAttendees?: number;
  strict?: boolean; // if true, no overlaps allowed at all
}

/**
 * Response interface
 */
export interface ConflictCheckResult {
  allowed: boolean;
  message: string;
  conflicts: GovernanceEvent[];
  suggestions?: {
    nextAvailable: {
      start: Date;
      end: Date;
      duration: number;
    };
    alternatives: Array<{
      start: Date;
      end: Date;
      duration: number;
      reason: string;
    }>;
  };
}

/**
 * Space Governance Engine
 */
export class SpaceGovernanceEngine {
  private events: GovernanceEvent[];
  private defaultBufferBefore = 15; // minutes
  private defaultBufferAfter = 15; // minutes

  constructor(events: GovernanceEvent[]) {
    this.events = events.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
  }

  /**
   * Add event to the engine
   */
  addEvent(event: GovernanceEvent): void {
    this.events.push(event);
    this.events.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
  }

  /**
   * Remove event by ID
   */
  removeEvent(eventId: string | number): void {
    this.events = this.events.filter((e) => e.id !== eventId);
  }

  /**
   * Check if a schedule request is valid (no conflicts)
   */
  checkRequest(request: ScheduleRequest): ConflictCheckResult {
    const bufferBefore = request.bufferBefore ?? this.defaultBufferBefore;
    const bufferAfter = request.bufferAfter ?? this.defaultBufferAfter;

    // Get all events in the same space
    const spaceEvents = this.events.filter((e) => e.space === request.space);

    // Check for conflicts
    const conflicts = this.findConflicts(
      request.start,
      request.end,
      bufferBefore,
      bufferAfter,
      request.strict ?? false,
      spaceEvents
    );

    if (conflicts.length === 0) {
      return {
        allowed: true,
        message: "✓ Scheduled successfully - no conflicts",
        conflicts: [],
      };
    }

    // Check capacity if provided
    if (request.expectedAttendees) {
      const capacityConflict = this.checkCapacity(
        request.space,
        request.start,
        request.end,
        request.expectedAttendees
      );
      if (capacityConflict) {
        conflicts.push(capacityConflict);
      }
    }

    // Suggest alternatives
    const suggestions = this.suggestAlternatives(
      request,
      bufferBefore,
      bufferAfter,
      spaceEvents
    );

    return {
      allowed: false,
      message:
        conflicts.length === 1
          ? `Conflict with "${conflicts[0].title}"`
          : `${conflicts.length} conflicts detected`,
      conflicts,
      suggestions,
    };
  }

  /**
   * Find all conflicting events
   */
  private findConflicts(
    start: Date,
    end: Date,
    bufferBefore: number,
    bufferAfter: number,
    strict: boolean,
    spaceEvents: GovernanceEvent[]
  ): GovernanceEvent[] {
    const requestStart = new Date(start.getTime() - bufferBefore * 60000);
    const requestEnd = new Date(end.getTime() + bufferAfter * 60000);

    return spaceEvents.filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Apply buffer to high-priority events
      if (event.priority === "high") {
        eventStart.setMinutes(eventStart.getMinutes() - 30);
        eventEnd.setMinutes(eventEnd.getMinutes() + 30);
      }

      // Check for overlap
      if (strict) {
        // No overlap allowed at all
        return requestStart < eventEnd && requestEnd > eventStart;
      } else {
        // Standard overlap check (start/end within event window)
        return (
          (start >= eventStart && start < eventEnd) ||
          (end > eventStart && end <= eventEnd) ||
          (start <= eventStart && end >= eventEnd)
        );
      }
    });
  }

  /**
   * Check capacity constraints
   */
  private checkCapacity(
    space: string,
    start: Date,
    end: Date,
    expectedAttendees: number
  ): GovernanceEvent | null {
    const spaceEvents = this.events.filter(
      (e) =>
        e.space === space &&
        new Date(e.start) < end &&
        new Date(e.end) > start &&
        e.capacity
    );

    for (const event of spaceEvents) {
      if (event.capacity && expectedAttendees > event.capacity) {
        return event;
      }
    }

    return null;
  }

  /**
   * Suggest alternative time slots
   */
  private suggestAlternatives(
    request: ScheduleRequest,
    bufferBefore: number,
    bufferAfter: number,
    spaceEvents: GovernanceEvent[]
  ): ConflictCheckResult["suggestions"] {
    const duration =
      (request.end.getTime() - request.start.getTime()) / 60000; // minutes
    const alternatives: Array<{
      start: Date;
      end: Date;
      duration: number;
      reason: string;
    }> = [];

    // Find the next available slot after the requested time
    const lastEvent = spaceEvents[spaceEvents.length - 1];
    if (lastEvent) {
      const nextStart = new Date(
        new Date(lastEvent.end).getTime() + bufferAfter * 60000
      );
      const nextEnd = new Date(nextStart.getTime() + duration * 60000);

      alternatives.push({
        start: nextStart,
        end: nextEnd,
        duration: duration,
        reason: "After last scheduled event",
      });
    }

    // Find gaps between events
    for (let i = 0; i < spaceEvents.length - 1; i++) {
      const gapStart = new Date(
        new Date(spaceEvents[i].end).getTime() + bufferAfter * 60000
      );
      const gapEnd = new Date(
        new Date(spaceEvents[i + 1].start).getTime() - bufferBefore * 60000
      );

      const gapDuration =
        (gapEnd.getTime() - gapStart.getTime()) / 60000; // minutes

      if (gapDuration >= duration) {
        alternatives.push({
          start: gapStart,
          end: new Date(gapStart.getTime() + duration * 60000),
          duration: duration,
          reason: `Gap between "${spaceEvents[i].title}" and "${spaceEvents[i + 1].title}"`,
        });
      }
    }

    // Return next available + up to 2 alternatives
    if (alternatives.length > 0) {
      return {
        nextAvailable: alternatives[0],
        alternatives: alternatives.slice(0, 3),
      };
    }

    return undefined;
  }

  /**
   * Get all events in a space
   */
  getSpaceEvents(space: string): GovernanceEvent[] {
    return this.events.filter((e) => e.space === space);
  }

  /**
   * Get all spaces
   */
  getSpaces(): string[] {
    return [...new Set(this.events.map((e) => e.space))];
  }

  /**
   * Get utilization stats for a space
   */
  getUtilization(
    space: string,
    startDate: Date,
    endDate: Date
  ): {
    totalHours: number;
    bookedHours: number;
    utilizationPercent: number;
    events: GovernanceEvent[];
  } {
    const spaceEvents = this.getSpaceEvents(space).filter(
      (e) => new Date(e.start) >= startDate && new Date(e.end) <= endDate
    );

    const totalMs = endDate.getTime() - startDate.getTime();
    const totalHours = totalMs / (1000 * 60 * 60);

    let bookedMs = 0;
    for (const event of spaceEvents) {
      const eventStart = Math.max(
        new Date(event.start).getTime(),
        startDate.getTime()
      );
      const eventEnd = Math.min(new Date(event.end).getTime(), endDate.getTime());
      bookedMs += eventEnd - eventStart;
    }

    const bookedHours = bookedMs / (1000 * 60 * 60);
    const utilizationPercent = (bookedHours / totalHours) * 100;

    return {
      totalHours,
      bookedHours,
      utilizationPercent: Math.round(utilizationPercent),
      events: spaceEvents,
    };
  }

  /**
   * Detect booking conflicts in the current schedule
   */
  detectAllConflicts(): Array<{
    event1: GovernanceEvent;
    event2: GovernanceEvent;
    type: "overlap" | "buffer";
  }> {
    const conflicts: Array<{
      event1: GovernanceEvent;
      event2: GovernanceEvent;
      type: "overlap" | "buffer";
    }> = [];

    for (let i = 0; i < this.events.length; i++) {
      for (let j = i + 1; j < this.events.length; j++) {
        const e1 = this.events[i];
        const e2 = this.events[j];

        // Only check same space
        if (e1.space !== e2.space) continue;

        const end1 = new Date(e1.end);
        const start2 = new Date(e2.start);

        // Check for direct overlap
        if (
          new Date(e1.start) < new Date(e2.end) &&
          end1 > new Date(e2.start)
        ) {
          conflicts.push({ event1: e1, event2: e2, type: "overlap" });
        }
        // Check for buffer violation (30 min for high priority)
        else if (
          (e1.priority === "high" || e2.priority === "high") &&
          start2.getTime() - end1.getTime() < 30 * 60000
        ) {
          conflicts.push({ event1: e1, event2: e2, type: "buffer" });
        }
      }
    }

    return conflicts;
  }
}

/**
 * Utility: Create a space governance engine from Maestro events
 * TODO: Wire to actual MaestroBQT event bus
 */
export function createGovernanceEngineFromMaestro(
  maestroEvents: any[]
): SpaceGovernanceEngine {
  const governanceEvents: GovernanceEvent[] = maestroEvents.map((e) => ({
    id: e.id,
    space: e.space || e.venue,
    title: e.title || e.name,
    start: new Date(e.start),
    end: new Date(e.end),
    priority: e.priority || "medium",
    capacity: e.capacity,
  }));

  return new SpaceGovernanceEngine(governanceEvents);
}
