/**
 * Audit Events + EchoAI^3 Learning Test
 * 
 * Validates that:
 * 1. Critical actions emit audit events (BEO_CREATED, ORDER_PLACED, etc.)
 * 2. Audit events are readable through the query API
 * 3. EchoAI^3 can aggregate events for learning
 * 4. Patterns are detected from audit data
 * 5. Recommendations are generated based on patterns
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  AUDIT_EVENT_TYPES,
  createAuditEvent,
  type SystemAuditEvent,
  type AuditEventType,
} from "../shared/audit/audit-event-contract";
import {
  echoAI3AuditReader,
  EchoAI3AuditReader,
  type LearningAggregation,
} from "../shared/echo/echoai3-audit-reader";

describe("Audit Events + EchoAI^3 Learning", () => {
  const TENANT_ID = "org-disney-resort";
  const USER_ID = "user-001";
  let reader: EchoAI3AuditReader;

  beforeEach(() => {
    reader = echoAI3AuditReader;
    reader.clearEvents();
  });

  afterEach(() => {
    reader.clearEvents();
  });

  describe("Audit Event Contract", () => {
    it("should define all required audit event types", () => {
      // BEO lifecycle
      expect(AUDIT_EVENT_TYPES.BEO_CREATED).toBe("BEO_CREATED");
      expect(AUDIT_EVENT_TYPES.BEO_UPDATED).toBe("BEO_UPDATED");
      expect(AUDIT_EVENT_TYPES.BEO_APPROVED).toBe("BEO_APPROVED");
      expect(AUDIT_EVENT_TYPES.BEO_EXECUTED).toBe("BEO_EXECUTED");

      // Order lifecycle
      expect(AUDIT_EVENT_TYPES.ORDER_PLACED).toBe("ORDER_PLACED");
      expect(AUDIT_EVENT_TYPES.ORDER_RECEIVED).toBe("ORDER_RECEIVED");

      // Production
      expect(AUDIT_EVENT_TYPES.PRODUCTION_SCHEDULED).toBe("PRODUCTION_SCHEDULED");
      expect(AUDIT_EVENT_TYPES.PRODUCTION_COMPLETED).toBe("PRODUCTION_COMPLETED");

      // Schedule
      expect(AUDIT_EVENT_TYPES.SCHEDULE_GENERATED).toBe("SCHEDULE_GENERATED");
      expect(AUDIT_EVENT_TYPES.SCHEDULE_PUBLISHED).toBe("SCHEDULE_PUBLISHED");

      // Staff
      expect(AUDIT_EVENT_TYPES.STAFF_SHORTAGE_FORECAST).toBe("STAFF_SHORTAGE_FORECAST");
      expect(AUDIT_EVENT_TYPES.JOB_SHARE_FILLED).toBe("JOB_SHARE_FILLED");

      // Menu
      expect(AUDIT_EVENT_TYPES.MENU_ITEM_ADDED).toBe("MENU_ITEM_ADDED");

      // EchoAI^3
      expect(AUDIT_EVENT_TYPES.ECHOAI_RECOMMENDATION).toBe("ECHOAI_RECOMMENDATION");
      expect(AUDIT_EVENT_TYPES.ECHOAI_LEARNING_CAPTURED).toBe("ECHOAI_LEARNING_CAPTURED");
    });

    it("should create audit events with correct structure", () => {
      const event = createAuditEvent(
        AUDIT_EVENT_TYPES.BEO_CREATED,
        TENANT_ID,
        USER_ID,
        "beo",
        "beo-001",
        { guestCount: 150, menuItems: 10 },
        { beoNumber: "AUR-BQ-20260215-001" },
      );

      expect(event.eventId).toBeDefined();
      expect(event.eventId).toMatch(/^evt-/);
      expect(event.eventType).toBe(AUDIT_EVENT_TYPES.BEO_CREATED);
      expect(event.timestamp).toBeDefined();
      expect(event.tenantId).toBe(TENANT_ID);
      expect(event.userId).toBe(USER_ID);
      expect(event.entityType).toBe("beo");
      expect(event.entityId).toBe("beo-001");
      expect(event.beoNumber).toBe("AUR-BQ-20260215-001");
      expect(event.metadata.guestCount).toBe(150);
      expect(event.metadata.menuItems).toBe(10);
    });
  });

  describe("Audit Event Recording and Querying", () => {
    it("should record and query audit events", () => {
      // Record events
      const beoEvent = createAuditEvent(
        AUDIT_EVENT_TYPES.BEO_CREATED,
        TENANT_ID,
        USER_ID,
        "beo",
        "beo-001",
        { guestCount: 150 },
        { beoNumber: "AUR-BQ-001" },
      );
      reader.recordEvent(beoEvent as SystemAuditEvent);

      const orderEvent = createAuditEvent(
        AUDIT_EVENT_TYPES.ORDER_PLACED,
        TENANT_ID,
        USER_ID,
        "order",
        "order-001",
        { lineItems: 10 },
        { beoNumber: "AUR-BQ-001" },
      );
      reader.recordEvent(orderEvent as SystemAuditEvent);

      // Query all events for tenant
      const events = reader.queryEvents({ tenantId: TENANT_ID });
      expect(events.length).toBe(2);

      // Query by event type
      const beoEvents = reader.queryEvents({
        tenantId: TENANT_ID,
        eventTypes: [AUDIT_EVENT_TYPES.BEO_CREATED],
      });
      expect(beoEvents.length).toBe(1);
      expect(beoEvents[0].eventType).toBe(AUDIT_EVENT_TYPES.BEO_CREATED);
    });

    it("should query events by BEO number for traceability", () => {
      const BEO_NUMBER = "AUR-BQ-20260215-001";

      // Record multiple events with same BEO number
      reader.recordEvent(
        createAuditEvent(
          AUDIT_EVENT_TYPES.BEO_CREATED,
          TENANT_ID,
          USER_ID,
          "beo",
          "beo-001",
          {},
          { beoNumber: BEO_NUMBER },
        ) as SystemAuditEvent,
      );

      reader.recordEvent(
        createAuditEvent(
          AUDIT_EVENT_TYPES.ORDER_PLACED,
          TENANT_ID,
          USER_ID,
          "order",
          "order-001",
          {},
          { beoNumber: BEO_NUMBER },
        ) as SystemAuditEvent,
      );

      reader.recordEvent(
        createAuditEvent(
          AUDIT_EVENT_TYPES.PRODUCTION_SCHEDULED,
          TENANT_ID,
          USER_ID,
          "production",
          "prod-001",
          {},
          { beoNumber: BEO_NUMBER },
        ) as SystemAuditEvent,
      );

      reader.recordEvent(
        createAuditEvent(
          AUDIT_EVENT_TYPES.SCHEDULE_GENERATED,
          TENANT_ID,
          USER_ID,
          "schedule",
          "schedule-001",
          {},
          { beoNumber: BEO_NUMBER },
        ) as SystemAuditEvent,
      );

      // Query by BEO number
      const beoEvents = reader.getEventsByBEO(TENANT_ID, BEO_NUMBER);
      expect(beoEvents.length).toBe(4);

      // All events should have the same BEO number
      for (const event of beoEvents) {
        expect(event.beoNumber).toBe(BEO_NUMBER);
      }

      console.log("\n=== BEO Traceability via Audit Events ===");
      console.log(`BEO Number: ${BEO_NUMBER}`);
      for (const event of beoEvents) {
        console.log(`  - ${event.eventType} (${event.entityType}: ${event.entityId})`);
      }
    });

    it("should query events by module/entity type", () => {
      // Record events for different modules
      reader.recordEvent(
        createAuditEvent(
          AUDIT_EVENT_TYPES.BEO_CREATED,
          TENANT_ID,
          USER_ID,
          "beo",
          "beo-001",
        ) as SystemAuditEvent,
      );
      reader.recordEvent(
        createAuditEvent(
          AUDIT_EVENT_TYPES.BEO_APPROVED,
          TENANT_ID,
          USER_ID,
          "beo",
          "beo-001",
        ) as SystemAuditEvent,
      );
      reader.recordEvent(
        createAuditEvent(
          AUDIT_EVENT_TYPES.ORDER_PLACED,
          TENANT_ID,
          USER_ID,
          "order",
          "order-001",
        ) as SystemAuditEvent,
      );

      // Query by module
      const beoModuleEvents = reader.getEventsByModule(TENANT_ID, "beo");
      expect(beoModuleEvents.length).toBe(2);

      const orderModuleEvents = reader.getEventsByModule(TENANT_ID, "order");
      expect(orderModuleEvents.length).toBe(1);
    });
  });

  describe("EchoAI^3 Learning Aggregation", () => {
    beforeEach(() => {
      // Seed with realistic event data
      const now = new Date();
      const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      // BEO lifecycle events
      for (let i = 0; i < 5; i++) {
        const beoNumber = `AUR-BQ-${startDate.toISOString().slice(0, 10).replace(/-/g, "")}-${String(i + 1).padStart(3, "0")}`;
        reader.recordEvent(
          createAuditEvent(
            AUDIT_EVENT_TYPES.BEO_CREATED,
            TENANT_ID,
            USER_ID,
            "beo",
            `beo-${i + 1}`,
            { guestCount: 100 + i * 20 },
            { beoNumber },
          ) as SystemAuditEvent,
        );
        reader.recordEvent(
          createAuditEvent(
            AUDIT_EVENT_TYPES.ORDER_PLACED,
            TENANT_ID,
            USER_ID,
            "order",
            `order-${i + 1}`,
            { lineItems: 10 + i },
            { beoNumber },
          ) as SystemAuditEvent,
        );
        reader.recordEvent(
          createAuditEvent(
            AUDIT_EVENT_TYPES.PRODUCTION_SCHEDULED,
            TENANT_ID,
            USER_ID,
            "production",
            `prod-${i + 1}`,
            { taskCount: 8 + i },
            { beoNumber },
          ) as SystemAuditEvent,
        );
        reader.recordEvent(
          createAuditEvent(
            AUDIT_EVENT_TYPES.SCHEDULE_GENERATED,
            TENANT_ID,
            USER_ID,
            "schedule",
            `schedule-${i + 1}`,
            { staffCount: 12, autoGenerated: i % 2 === 0 },
            { beoNumber },
          ) as SystemAuditEvent,
        );
      }

      // Staff shortage events
      for (let i = 0; i < 4; i++) {
        reader.recordEvent(
          createAuditEvent(
            AUDIT_EVENT_TYPES.STAFF_SHORTAGE_FORECAST,
            TENANT_ID,
            USER_ID,
            "staff",
            `shortage-${i + 1}`,
            { shortageCount: 2 + i, affectedRoles: ["COOK", "SERVER"] },
          ) as SystemAuditEvent,
        );
      }
    });

    it("should aggregate events for learning", () => {
      const fromDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      const toDate = new Date().toISOString();

      const aggregation = reader.aggregateForLearning(TENANT_ID, fromDate, toDate);

      expect(aggregation.tenantId).toBe(TENANT_ID);
      expect(aggregation.period.start).toBe(fromDate);
      expect(aggregation.period.end).toBe(toDate);

      // Summary counts
      expect(aggregation.summary.totalEvents).toBeGreaterThan(0);
      expect(aggregation.summary.beoCount).toBe(5);
      expect(aggregation.summary.orderCount).toBe(5);
      expect(aggregation.summary.productionTasks).toBe(5);
      expect(aggregation.summary.schedulesGenerated).toBe(5);
      expect(aggregation.summary.staffShortages).toBe(4);

      // Events by type
      expect(aggregation.summary.eventsByType[AUDIT_EVENT_TYPES.BEO_CREATED]).toBe(5);
      expect(aggregation.summary.eventsByType[AUDIT_EVENT_TYPES.ORDER_PLACED]).toBe(5);

      // Events by module
      expect(aggregation.summary.eventsByModule["beo"]).toBe(5);
      expect(aggregation.summary.eventsByModule["order"]).toBe(5);
      expect(aggregation.summary.eventsByModule["staff"]).toBe(4);

      console.log("\n=== EchoAI^3 Learning Aggregation ===");
      console.log(`Total Events: ${aggregation.summary.totalEvents}`);
      console.log(`BEOs: ${aggregation.summary.beoCount}`);
      console.log(`Orders: ${aggregation.summary.orderCount}`);
      console.log(`Production Tasks: ${aggregation.summary.productionTasks}`);
      console.log(`Schedules: ${aggregation.summary.schedulesGenerated}`);
      console.log(`Staff Shortages: ${aggregation.summary.staffShortages}`);
    });

    it("should detect patterns from audit data", () => {
      const fromDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      const toDate = new Date().toISOString();

      const aggregation = reader.aggregateForLearning(TENANT_ID, fromDate, toDate);

      // Should detect patterns
      expect(aggregation.patterns.length).toBeGreaterThan(0);

      // Should detect BEO → Production sequence pattern
      const sequencePattern = aggregation.patterns.find((p) => p.patternType === "sequence");
      expect(sequencePattern).toBeDefined();
      expect(sequencePattern!.confidence).toBeGreaterThan(80);

      // Should detect staff shortage trend
      const trendPattern = aggregation.patterns.find(
        (p) => p.patternType === "trend" && p.description.includes("shortage"),
      );
      expect(trendPattern).toBeDefined();
      expect(trendPattern!.affectedModules).toContain("Schedule");

      // Should detect auto-generation efficiency
      const efficiencyPattern = aggregation.patterns.find((p) => p.patternType === "efficiency");
      expect(efficiencyPattern).toBeDefined();

      console.log("\n=== Detected Patterns ===");
      for (const pattern of aggregation.patterns) {
        console.log(`  - [${pattern.patternType}] ${pattern.description}`);
        console.log(`    Confidence: ${pattern.confidence}%, Data Points: ${pattern.dataPoints}`);
      }
    });

    it("should generate recommendations based on patterns", () => {
      const fromDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      const toDate = new Date().toISOString();

      const aggregation = reader.aggregateForLearning(TENANT_ID, fromDate, toDate);

      // Should have recommendations
      expect(aggregation.recommendations.length).toBeGreaterThan(0);

      // Should have staffing recommendation based on shortage pattern
      const staffingRec = aggregation.recommendations.find((r) => r.category === "staffing");
      expect(staffingRec).toBeDefined();
      expect(staffingRec!.priority).toBe("high");
      expect(staffingRec!.basedOnPatterns.length).toBeGreaterThan(0);

      console.log("\n=== EchoAI^3 Recommendations ===");
      for (const rec of aggregation.recommendations) {
        console.log(`  - [${rec.priority}] ${rec.title}`);
        console.log(`    ${rec.description}`);
        console.log(`    Impact: ${rec.estimatedImpact}`);
      }
    });
  });

  describe("Learning Integration", () => {
    it("should support EchoAI^3 learning from each interaction", () => {
      // Record a learning event
      reader.recordEvent(
        createAuditEvent(
          AUDIT_EVENT_TYPES.ECHOAI_LEARNING_CAPTURED,
          TENANT_ID,
          "echoai3",
          "echoai",
          "learning-001",
          {
            learningCategory: "scheduling_optimization",
            dataPoints: 150,
            confidence: 85,
          },
          { source: "echoai" },
        ) as SystemAuditEvent,
      );

      // Record a recommendation event
      reader.recordEvent(
        createAuditEvent(
          AUDIT_EVENT_TYPES.ECHOAI_RECOMMENDATION,
          TENANT_ID,
          "echoai3",
          "echoai",
          "rec-001",
          {
            recommendationType: "staffing",
            confidence: 90,
            accepted: true,
          },
          { source: "echoai" },
        ) as SystemAuditEvent,
      );

      // Query EchoAI events
      const echoaiEvents = reader.getEventsByModule(TENANT_ID, "echoai");
      expect(echoaiEvents.length).toBe(2);

      // Verify learning event
      const learningEvent = echoaiEvents.find(
        (e) => e.eventType === AUDIT_EVENT_TYPES.ECHOAI_LEARNING_CAPTURED,
      );
      expect(learningEvent).toBeDefined();
      expect((learningEvent!.metadata as any).dataPoints).toBe(150);

      // Verify recommendation event
      const recEvent = echoaiEvents.find(
        (e) => e.eventType === AUDIT_EVENT_TYPES.ECHOAI_RECOMMENDATION,
      );
      expect(recEvent).toBeDefined();
      expect((recEvent!.metadata as any).accepted).toBe(true);

      console.log("\n=== EchoAI^3 Learning Events ===");
      for (const event of echoaiEvents) {
        console.log(`  - ${event.eventType}: ${JSON.stringify(event.metadata)}`);
      }
    });
  });
});
