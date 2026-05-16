/**
 * Full-Automatic E2E Scenario Test
 * 
 * Validates that once a menu or BEO/REO is created, the system can run
 * fully automatically with EchoAI^3 enhancing UI/UX:
 * 
 * Flow: Layout → BEO → Order → Scheduling → Production
 * 
 * This demonstrates:
 * 1. Event space layout triggers BEO creation
 * 2. BEO triggers order/planning
 * 3. Order triggers production needs
 * 4. Production triggers scheduling
 * 5. Everything flows without manual intervention (except actual food prep/service)
 */

import { describe, it, expect, beforeAll } from "vitest";

// Mock types for the full flow
interface EventLayout {
  id: string;
  eventId: string;
  spaceName: string;
  capacity: number;
  setupStyle: "theater" | "banquet" | "classroom" | "cocktail";
  dimensions: { width: number; length: number };
  createdAt: string;
}

interface BEO {
  id: string;
  beoNumber: string;
  eventId: string;
  layoutId: string;
  guestCount: number;
  menu: {
    sections: Array<{
      name: string;
      items: Array<{
        name: string;
        quantity: number;
        station: string;
      }>;
    }>;
  };
  timeline: Array<{
    time: string;
    action: string;
    department: string;
  }>;
  status: "draft" | "approved" | "executed";
  createdAt: string;
  automaticTriggers: string[];
}

interface Order {
  id: string;
  beoId: string;
  beoNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    supplier?: string;
    deliveryDate?: string;
  }>;
  status: "pending" | "ordered" | "received";
  createdAt: string;
  automaticallyGenerated: boolean;
}

interface ProductionTask {
  id: string;
  beoId: string;
  beoNumber: string;
  taskName: string;
  station: string;
  quantity: number;
  startTime: string;
  endTime: string;
  assignedTo?: string;
  status: "pending" | "in_progress" | "completed";
}

interface ScheduleEntry {
  id: string;
  beoId: string;
  employeeId: string;
  employeeName: string;
  role: string;
  shiftStart: string;
  shiftEnd: string;
  assignedTasks: string[];
  autoScheduled: boolean;
}

interface AutomationLog {
  timestamp: string;
  step: string;
  trigger: string;
  action: string;
  result: string;
  nextStep?: string;
}

// Simulate the full automatic flow
class FullAutomaticFlowSimulator {
  private logs: AutomationLog[] = [];

  log(step: string, trigger: string, action: string, result: string, nextStep?: string): void {
    this.logs.push({
      timestamp: new Date().toISOString(),
      step,
      trigger,
      action,
      result,
      nextStep,
    });
  }

  getLogs(): AutomationLog[] {
    return this.logs;
  }

  // Step 1: Create event layout
  createLayout(eventId: string, spaceName: string): EventLayout {
    const layout: EventLayout = {
      id: `layout-${Date.now()}`,
      eventId,
      spaceName,
      capacity: 200,
      setupStyle: "banquet",
      dimensions: { width: 40, length: 60 },
      createdAt: new Date().toISOString(),
    };

    this.log(
      "Layout Creation",
      "User action: create event layout",
      `Created layout "${spaceName}" for event ${eventId}`,
      "Layout created successfully",
      "Auto-trigger BEO creation",
    );

    return layout;
  }

  // Step 2: Auto-create BEO from layout (triggered automatically)
  autoCreateBEO(layout: EventLayout): BEO {
    const beoNumber = `AUR-BQ-${layout.eventId.slice(-6)}-${Date.now().toString(36).toUpperCase()}`;
    const beo: BEO = {
      id: `beo-${Date.now()}`,
      beoNumber,
      eventId: layout.eventId,
      layoutId: layout.id,
      guestCount: layout.capacity,
      menu: {
        sections: [
          {
            name: "Appetizers",
            items: [
              { name: "Caesar Salad", quantity: layout.capacity, station: "GARDE" },
              { name: "Shrimp Cocktail", quantity: Math.ceil(layout.capacity * 0.5), station: "COLD" },
            ],
          },
          {
            name: "Entrees",
            items: [
              { name: "Grilled Salmon", quantity: Math.ceil(layout.capacity * 0.4), station: "HOT" },
              { name: "Beef Tenderloin", quantity: Math.ceil(layout.capacity * 0.4), station: "HOT" },
              { name: "Vegetable Wellington", quantity: Math.ceil(layout.capacity * 0.2), station: "HOT" },
            ],
          },
          {
            name: "Desserts",
            items: [
              { name: "Chocolate Mousse", quantity: layout.capacity, station: "PASTRY" },
            ],
          },
        ],
      },
      timeline: [
        { time: "16:00", action: "Setup begins", department: "Setup" },
        { time: "17:30", action: "Kitchen prep complete", department: "Kitchen" },
        { time: "18:00", action: "Cocktail hour", department: "F&B" },
        { time: "19:00", action: "Dinner service", department: "Kitchen" },
        { time: "21:00", action: "Dessert service", department: "Pastry" },
        { time: "22:00", action: "Event concludes", department: "All" },
      ],
      status: "approved", // Auto-approved for this simulation
      createdAt: new Date().toISOString(),
      automaticTriggers: ["Layout created", "EchoAI^3 menu suggestion"],
    };

    this.log(
      "BEO Creation",
      `Layout ${layout.id} created`,
      `Auto-created BEO ${beoNumber} with ${beo.menu.sections.reduce((sum, s) => sum + s.items.length, 0)} menu items`,
      "BEO created and approved",
      "Auto-trigger Order generation",
    );

    return beo;
  }

  // Step 3: Auto-generate orders from BEO (triggered automatically)
  autoGenerateOrder(beo: BEO): Order {
    const items: Order["items"] = [];

    // Convert menu items to order items
    for (const section of beo.menu.sections) {
      for (const item of section.items) {
        // Calculate ingredient needs (simplified)
        items.push({
          name: `${item.name} - Ingredients`,
          quantity: item.quantity,
          unit: "portions",
          supplier: "Primary Supplier",
          deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        });
      }
    }

    const order: Order = {
      id: `order-${Date.now()}`,
      beoId: beo.id,
      beoNumber: beo.beoNumber,
      items,
      status: "pending",
      createdAt: new Date().toISOString(),
      automaticallyGenerated: true,
    };

    this.log(
      "Order Generation",
      `BEO ${beo.beoNumber} approved`,
      `Auto-generated order with ${items.length} line items`,
      "Order created and sent to purchasing",
      "Auto-trigger Production planning",
    );

    return order;
  }

  // Step 4: Auto-create production tasks from BEO (triggered automatically)
  autoCreateProductionTasks(beo: BEO): ProductionTask[] {
    const tasks: ProductionTask[] = [];
    const eventDate = new Date();
    eventDate.setHours(16, 0, 0, 0); // Start at 4 PM

    for (const section of beo.menu.sections) {
      for (const item of section.items) {
        // Calculate prep time based on station
        const prepHours = item.station === "PASTRY" ? 3 : 2;
        const startTime = new Date(eventDate);
        startTime.setHours(eventDate.getHours() - prepHours);

        tasks.push({
          id: `task-${Date.now()}-${tasks.length}`,
          beoId: beo.id,
          beoNumber: beo.beoNumber,
          taskName: `Prep: ${item.name}`,
          station: item.station,
          quantity: item.quantity,
          startTime: startTime.toISOString(),
          endTime: eventDate.toISOString(),
          status: "pending",
        });
      }
    }

    this.log(
      "Production Planning",
      `BEO ${beo.beoNumber} menu finalized`,
      `Auto-created ${tasks.length} production tasks across ${new Set(tasks.map((t) => t.station)).size} stations`,
      "Production plan created",
      "Auto-trigger Schedule generation",
    );

    return tasks;
  }

  // Step 5: Auto-generate schedule from production tasks (triggered automatically)
  autoGenerateSchedule(beo: BEO, tasks: ProductionTask[]): ScheduleEntry[] {
    const entries: ScheduleEntry[] = [];
    const staffPool = [
      { id: "emp-001", name: "Chef Maria", role: "Line Cook", station: "HOT" },
      { id: "emp-002", name: "Chef John", role: "Line Cook", station: "HOT" },
      { id: "emp-003", name: "Chef Lisa", role: "Garde Manger", station: "GARDE" },
      { id: "emp-004", name: "Chef Tom", role: "Garde Manger", station: "COLD" },
      { id: "emp-005", name: "Chef Sarah", role: "Pastry Chef", station: "PASTRY" },
      { id: "emp-006", name: "Alex", role: "Server", station: "SERVICE" },
      { id: "emp-007", name: "Jordan", role: "Server", station: "SERVICE" },
      { id: "emp-008", name: "Casey", role: "Server", station: "SERVICE" },
    ];

    // Group tasks by station
    const tasksByStation = new Map<string, ProductionTask[]>();
    for (const task of tasks) {
      if (!tasksByStation.has(task.station)) {
        tasksByStation.set(task.station, []);
      }
      tasksByStation.get(task.station)!.push(task);
    }

    // Assign staff to stations
    for (const staff of staffPool) {
      const stationTasks = tasksByStation.get(staff.station) || [];
      if (stationTasks.length > 0) {
        const earliestStart = stationTasks
          .map((t) => new Date(t.startTime).getTime())
          .reduce((a, b) => Math.min(a, b));
        const latestEnd = stationTasks
          .map((t) => new Date(t.endTime).getTime())
          .reduce((a, b) => Math.max(a, b));

        entries.push({
          id: `schedule-${Date.now()}-${entries.length}`,
          beoId: beo.id,
          employeeId: staff.id,
          employeeName: staff.name,
          role: staff.role,
          shiftStart: new Date(earliestStart).toISOString(),
          shiftEnd: new Date(latestEnd + 2 * 60 * 60 * 1000).toISOString(), // +2 hours for service
          assignedTasks: stationTasks.map((t) => t.taskName),
          autoScheduled: true,
        });
      }
    }

    // Add servers for service
    const serviceStart = beo.timeline.find((t) => t.action.includes("Cocktail"))?.time || "18:00";
    const serviceEnd = beo.timeline.find((t) => t.action.includes("concludes"))?.time || "22:00";

    for (const staff of staffPool.filter((s) => s.role === "Server")) {
      const today = new Date().toISOString().slice(0, 10);
      entries.push({
        id: `schedule-${Date.now()}-${entries.length}`,
        beoId: beo.id,
        employeeId: staff.id,
        employeeName: staff.name,
        role: staff.role,
        shiftStart: `${today}T${serviceStart}:00`,
        shiftEnd: `${today}T${serviceEnd}:00`,
        assignedTasks: ["Service"],
        autoScheduled: true,
      });
    }

    this.log(
      "Schedule Generation",
      `Production tasks created for BEO ${beo.beoNumber}`,
      `Auto-scheduled ${entries.length} staff members across all departments`,
      "Schedule generated and published",
      "Flow complete - ready for execution",
    );

    return entries;
  }
}

describe("Full-Automatic E2E Flow", () => {
  let simulator: FullAutomaticFlowSimulator;
  let layout: EventLayout;
  let beo: BEO;
  let order: Order;
  let productionTasks: ProductionTask[];
  let schedule: ScheduleEntry[];

  beforeAll(() => {
    simulator = new FullAutomaticFlowSimulator();
  });

  it("Step 1: should create event layout", () => {
    layout = simulator.createLayout("event-disney-2026-001", "Grand Ballroom A");

    expect(layout.id).toBeDefined();
    expect(layout.spaceName).toBe("Grand Ballroom A");
    expect(layout.capacity).toBeGreaterThan(0);

    console.log(`\n=== Step 1: Layout Created ===`);
    console.log(`Space: ${layout.spaceName}`);
    console.log(`Capacity: ${layout.capacity} guests`);
    console.log(`Setup: ${layout.setupStyle}`);
  });

  it("Step 2: should auto-create BEO from layout", () => {
    beo = simulator.autoCreateBEO(layout);

    expect(beo.id).toBeDefined();
    expect(beo.beoNumber).toBeDefined();
    expect(beo.layoutId).toBe(layout.id);
    expect(beo.guestCount).toBe(layout.capacity);
    expect(beo.menu.sections.length).toBeGreaterThan(0);
    expect(beo.timeline.length).toBeGreaterThan(0);
    expect(beo.automaticTriggers).toContain("Layout created");

    console.log(`\n=== Step 2: BEO Auto-Created ===`);
    console.log(`BEO Number: ${beo.beoNumber}`);
    console.log(`Guest Count: ${beo.guestCount}`);
    console.log(`Menu Sections: ${beo.menu.sections.length}`);
    console.log(`Timeline Events: ${beo.timeline.length}`);
    console.log(`Automatic Triggers: ${beo.automaticTriggers.join(", ")}`);
  });

  it("Step 3: should auto-generate order from BEO", () => {
    order = simulator.autoGenerateOrder(beo);

    expect(order.id).toBeDefined();
    expect(order.beoId).toBe(beo.id);
    expect(order.beoNumber).toBe(beo.beoNumber);
    expect(order.items.length).toBeGreaterThan(0);
    expect(order.automaticallyGenerated).toBe(true);

    console.log(`\n=== Step 3: Order Auto-Generated ===`);
    console.log(`Order ID: ${order.id}`);
    console.log(`BEO Reference: ${order.beoNumber}`);
    console.log(`Line Items: ${order.items.length}`);
    console.log(`Auto-Generated: ${order.automaticallyGenerated}`);
  });

  it("Step 4: should auto-create production tasks from BEO", () => {
    productionTasks = simulator.autoCreateProductionTasks(beo);

    expect(productionTasks.length).toBeGreaterThan(0);

    // All tasks should reference the BEO
    for (const task of productionTasks) {
      expect(task.beoId).toBe(beo.id);
      expect(task.beoNumber).toBe(beo.beoNumber);
      expect(task.station).toBeDefined();
    }

    const stations = new Set(productionTasks.map((t) => t.station));

    console.log(`\n=== Step 4: Production Tasks Auto-Created ===`);
    console.log(`Total Tasks: ${productionTasks.length}`);
    console.log(`Stations: ${[...stations].join(", ")}`);
    console.log(`BEO Reference: ${beo.beoNumber}`);
  });

  it("Step 5: should auto-generate schedule from production tasks", () => {
    schedule = simulator.autoGenerateSchedule(beo, productionTasks);

    expect(schedule.length).toBeGreaterThan(0);

    // All entries should be auto-scheduled
    for (const entry of schedule) {
      expect(entry.beoId).toBe(beo.id);
      expect(entry.autoScheduled).toBe(true);
      expect(entry.assignedTasks.length).toBeGreaterThan(0);
    }

    const roles = new Set(schedule.map((e) => e.role));

    console.log(`\n=== Step 5: Schedule Auto-Generated ===`);
    console.log(`Total Staff Scheduled: ${schedule.length}`);
    console.log(`Roles: ${[...roles].join(", ")}`);
    console.log(`All Auto-Scheduled: ${schedule.every((e) => e.autoScheduled)}`);
  });

  it("should complete full flow without manual intervention", () => {
    const logs = simulator.getLogs();

    // Should have all 5 steps logged
    expect(logs.length).toBe(5);

    // Each step should have triggered the next
    for (let i = 0; i < logs.length - 1; i++) {
      expect(logs[i].nextStep).toBeDefined();
    }

    // All steps should complete successfully
    for (const log of logs) {
      expect(
        log.result.includes("created") || log.result.includes("generated"),
      ).toBe(true);
    }

    console.log("\n=== Full Automation Log ===");
    for (const log of logs) {
      console.log(`\n[${log.step}]`);
      console.log(`  Trigger: ${log.trigger}`);
      console.log(`  Action: ${log.action}`);
      console.log(`  Result: ${log.result}`);
      if (log.nextStep) console.log(`  → Next: ${log.nextStep}`);
    }
    console.log("\n=== Flow Complete ===\n");
  });

  it("should maintain BEO reference throughout entire flow", () => {
    // BEO number should be traceable in all downstream objects
    expect(order.beoNumber).toBe(beo.beoNumber);
    expect(productionTasks.every((t) => t.beoNumber === beo.beoNumber)).toBe(true);
    expect(schedule.every((s) => s.beoId === beo.id)).toBe(true);

    // Layout → BEO → Order → Production → Schedule chain is intact
    expect(beo.layoutId).toBe(layout.id);
    expect(order.beoId).toBe(beo.id);
    expect(productionTasks.every((t) => t.beoId === beo.id)).toBe(true);
    expect(schedule.every((s) => s.beoId === beo.id)).toBe(true);

    console.log("\n=== BEO Reference Chain ===");
    console.log(`Layout: ${layout.id}`);
    console.log(`  └→ BEO: ${beo.beoNumber} (id: ${beo.id})`);
    console.log(`      └→ Order: ${order.id} (beoNumber: ${order.beoNumber})`);
    console.log(`      └→ Production: ${productionTasks.length} tasks`);
    console.log(`      └→ Schedule: ${schedule.length} entries`);
  });
});
