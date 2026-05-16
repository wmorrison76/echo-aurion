/**
 * EchoAI^3 Audit Reader
 * 
 * Provides a read path for EchoAI^3 to consume audit events for:
 * - Learning from each interaction
 * - Auditing system behavior
 * - Pattern recognition across BEOs, orders, production, scheduling
 * 
 * This is the "learning hook" that allows EchoAI^3 to improve over time
 * by analyzing past decisions, outcomes, and user feedback.
 */

import {
  type AuditEvent,
  type SystemAuditEvent,
  type AuditEventType,
  AUDIT_EVENT_TYPES,
} from "../audit/audit-event-contract.js";

/** Query options for fetching audit events */
export interface AuditQueryOptions {
  tenantId: string;
  eventTypes?: AuditEventType[];
  entityType?: string;
  entityId?: string;
  beoNumber?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

/** Aggregated learning data from audit events */
export interface LearningAggregation {
  tenantId: string;
  period: { start: string; end: string };
  summary: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByModule: Record<string, number>;
    beoCount: number;
    orderCount: number;
    productionTasks: number;
    schedulesGenerated: number;
    staffShortages: number;
    jobSharesFilled: number;
  };
  patterns: LearningPattern[];
  recommendations: LearningRecommendation[];
}

/** Detected pattern from audit events */
export interface LearningPattern {
  patternId: string;
  patternType:
    | "correlation"
    | "sequence"
    | "anomaly"
    | "trend"
    | "efficiency"
    | "bottleneck";
  description: string;
  confidence: number;
  affectedModules: string[];
  dataPoints: number;
  metadata: Record<string, unknown>;
}

/** Recommendation generated from learning */
export interface LearningRecommendation {
  recommendationId: string;
  category:
    | "process_improvement"
    | "staffing"
    | "menu_optimization"
    | "cost_reduction"
    | "quality";
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedImpact: string;
  basedOnPatterns: string[];
}

/** In-memory store for audit events (in production, use database) */
const auditEventStore: SystemAuditEvent[] = [];

/**
 * EchoAI^3 Audit Reader Class
 * 
 * Provides methods to:
 * - Query audit events by various criteria
 * - Aggregate events by BEO, module, time period
 * - Identify patterns for learning
 * - Generate recommendations based on historical data
 */
export class EchoAI3AuditReader {
  /**
   * Record an audit event (for testing and in-memory scenarios)
   */
  recordEvent(event: SystemAuditEvent): void {
    auditEventStore.push(event);
  }

  /**
   * Query audit events with filtering
   */
  queryEvents(options: AuditQueryOptions): SystemAuditEvent[] {
    let events = auditEventStore.filter((e) => e.tenantId === options.tenantId);

    if (options.eventTypes && options.eventTypes.length > 0) {
      events = events.filter((e) => options.eventTypes!.includes(e.eventType));
    }

    if (options.entityType) {
      events = events.filter((e) => e.entityType === options.entityType);
    }

    if (options.entityId) {
      events = events.filter((e) => e.entityId === options.entityId);
    }

    if (options.beoNumber) {
      events = events.filter((e) => e.beoNumber === options.beoNumber);
    }

    if (options.fromDate) {
      events = events.filter((e) => e.timestamp >= options.fromDate!);
    }

    if (options.toDate) {
      events = events.filter((e) => e.timestamp <= options.toDate!);
    }

    // Sort by timestamp descending
    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 100;
    return events.slice(offset, offset + limit);
  }

  /**
   * Get all events for a specific BEO (traceability)
   */
  getEventsByBEO(tenantId: string, beoNumber: string): SystemAuditEvent[] {
    return this.queryEvents({ tenantId, beoNumber });
  }

  /**
   * Get events by module/entity type
   */
  getEventsByModule(tenantId: string, entityType: string): SystemAuditEvent[] {
    return this.queryEvents({ tenantId, entityType });
  }

  /**
   * Aggregate events for learning
   */
  aggregateForLearning(
    tenantId: string,
    fromDate: string,
    toDate: string,
  ): LearningAggregation {
    const events = this.queryEvents({
      tenantId,
      fromDate,
      toDate,
      limit: 10000, // Large limit for aggregation
    });

    // Count by type
    const eventsByType: Record<string, number> = {};
    for (const event of events) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
    }

    // Count by module
    const eventsByModule: Record<string, number> = {};
    for (const event of events) {
      eventsByModule[event.entityType] = (eventsByModule[event.entityType] || 0) + 1;
    }

    // Specific counts
    const beoCount = new Set(events.filter((e) => e.beoNumber).map((e) => e.beoNumber)).size;
    const orderCount = events.filter((e) => e.eventType === AUDIT_EVENT_TYPES.ORDER_PLACED).length;
    const productionTasks = events.filter(
      (e) => e.eventType === AUDIT_EVENT_TYPES.PRODUCTION_SCHEDULED,
    ).length;
    const schedulesGenerated = events.filter(
      (e) => e.eventType === AUDIT_EVENT_TYPES.SCHEDULE_GENERATED,
    ).length;
    const staffShortages = events.filter(
      (e) => e.eventType === AUDIT_EVENT_TYPES.STAFF_SHORTAGE_FORECAST,
    ).length;
    const jobSharesFilled = events.filter(
      (e) => e.eventType === AUDIT_EVENT_TYPES.JOB_SHARE_FILLED,
    ).length;

    // Detect patterns (simplified)
    const patterns = this.detectPatterns(events);

    // Generate recommendations
    const recommendations = this.generateRecommendations(patterns, eventsByType);

    return {
      tenantId,
      period: { start: fromDate, end: toDate },
      summary: {
        totalEvents: events.length,
        eventsByType,
        eventsByModule,
        beoCount,
        orderCount,
        productionTasks,
        schedulesGenerated,
        staffShortages,
        jobSharesFilled,
      },
      patterns,
      recommendations,
    };
  }

  /**
   * Detect patterns in audit events for learning
   */
  private detectPatterns(events: SystemAuditEvent[]): LearningPattern[] {
    const patterns: LearningPattern[] = [];

    // Pattern 1: BEO to production timing
    const beoEvents = events.filter((e) => e.eventType === AUDIT_EVENT_TYPES.BEO_CREATED);
    const prodEvents = events.filter((e) => e.eventType === AUDIT_EVENT_TYPES.PRODUCTION_SCHEDULED);
    if (beoEvents.length > 0 && prodEvents.length > 0) {
      patterns.push({
        patternId: `pattern-beo-prod-${Date.now()}`,
        patternType: "sequence",
        description: "BEO creation triggers production scheduling",
        confidence: 85,
        affectedModules: ["BEOManagement", "MaestroBQT"],
        dataPoints: beoEvents.length + prodEvents.length,
        metadata: { beoCount: beoEvents.length, prodCount: prodEvents.length },
      });
    }

    // Pattern 2: Staff shortage frequency
    const shortageEvents = events.filter(
      (e) => e.eventType === AUDIT_EVENT_TYPES.STAFF_SHORTAGE_FORECAST,
    );
    if (shortageEvents.length > 3) {
      patterns.push({
        patternId: `pattern-shortage-${Date.now()}`,
        patternType: "trend",
        description: "Recurring staff shortages detected",
        confidence: 70 + Math.min(shortageEvents.length * 5, 25),
        affectedModules: ["Schedule", "StaffShortageForecaster"],
        dataPoints: shortageEvents.length,
        metadata: { shortageCount: shortageEvents.length },
      });
    }

    // Pattern 3: Auto-generation efficiency
    const autoGenSchedules = events.filter(
      (e) =>
        e.eventType === AUDIT_EVENT_TYPES.SCHEDULE_GENERATED &&
        (e.metadata as any)?.autoGenerated,
    );
    if (autoGenSchedules.length > 0) {
      patterns.push({
        patternId: `pattern-autogen-${Date.now()}`,
        patternType: "efficiency",
        description: "AI-generated schedules in use",
        confidence: 90,
        affectedModules: ["AIScheduleGenerator"],
        dataPoints: autoGenSchedules.length,
        metadata: { autoGenCount: autoGenSchedules.length },
      });
    }

    return patterns;
  }

  /**
   * Generate recommendations based on patterns
   */
  private generateRecommendations(
    patterns: LearningPattern[],
    eventsByType: Record<string, number>,
  ): LearningRecommendation[] {
    const recommendations: LearningRecommendation[] = [];

    // Recommendation based on staff shortage pattern
    const shortagePattern = patterns.find((p) => p.patternType === "trend" && p.description.includes("shortage"));
    if (shortagePattern) {
      recommendations.push({
        recommendationId: `rec-${Date.now()}-1`,
        category: "staffing",
        title: "Increase cross-training",
        description: "Recurring staff shortages suggest need for more cross-trained employees.",
        priority: "high",
        estimatedImpact: "Reduce shortage incidents by 30%",
        basedOnPatterns: [shortagePattern.patternId],
      });
    }

    // Recommendation based on low auto-generation usage
    const scheduleCount = eventsByType[AUDIT_EVENT_TYPES.SCHEDULE_GENERATED] || 0;
    const autoGenPattern = patterns.find((p) => p.description.includes("AI-generated"));
    if (scheduleCount > 5 && !autoGenPattern) {
      recommendations.push({
        recommendationId: `rec-${Date.now()}-2`,
        category: "process_improvement",
        title: "Enable AI schedule generation",
        description: "Manual scheduling detected. Enable AI generation to save time.",
        priority: "medium",
        estimatedImpact: "Reduce scheduling time by 60%",
        basedOnPatterns: [],
      });
    }

    return recommendations;
  }

  /**
   * Clear all events (for testing)
   */
  clearEvents(): void {
    auditEventStore.length = 0;
  }
}

// Singleton instance for application-wide use
export const echoAI3AuditReader = new EchoAI3AuditReader();
