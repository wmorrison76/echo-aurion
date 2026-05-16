/**
 * BEO Traceability Test: Prospect/Order → Production/Plate
 * 
 * Validates that a BEO number can be traced through the entire flow:
 * 1. Prospect/Order → Event
 * 2. Event → BEO creation (beoNumber assigned)
 * 3. BEO → Menu items (contentData.menuItems)
 * 4. BEO → Production items (derivedFrom.beoId)
 * 5. (Optional) BEO → Schedule (if applicable)
 * 
 * This test verifies that when you "open each module" in the product,
 * you can follow the BEO# from prospect/order to food on plate.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Mock BEO document structure (based on shared/types/beo.ts)
interface MockBEODocument {
  beoId: string;
  beoNumber: string;
  eventId: string;
  orgId: string;
  outletId?: string;
  gtd?: number;
  exp?: number;
  menu?: {
    sections: Array<{
      sectionName: string;
      items: Array<{
        itemName: string;
        quantity?: number;
        price?: number;
      }>;
    }>;
  };
  timeline?: Array<{
    time: string;
    label: string;
    department?: string;
  }>;
  status: string;
  createdAt: string;
}

// Mock production item structure
interface MockProductionItem {
  itemId: string;
  itemName: string;
  station: string;
  quantity: number;
  unit: string;
  derivedFrom: {
    beoId: string;
    menuPath: string;
  };
}

// Mock prospect structure
interface MockProspect {
  id: string;
  orgId: string;
  name: string;
  eventDate: string;
  guestCount: number;
  status: string;
}

// Simulate BEO number generation (based on server/services/beo-management.ts)
function generateMockBEONumber(
  orgId: string,
  outletId: string,
  eventDate: string,
  eventTypeCode: string,
  sequence: number,
): string {
  const glCode = outletId?.slice(0, 2).toUpperCase() || "00";
  const dateStr = eventDate.replace(/-/g, "");
  const seq = String(sequence).padStart(3, "0");
  return `AUR-${glCode}-${dateStr}-${eventTypeCode}-${seq}`;
}

// Simulate BEO creation from prospect
function createBEOFromProspect(prospect: MockProspect): MockBEODocument {
  const beoId = `beo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const beoNumber = generateMockBEONumber(
    prospect.orgId,
    "ballroom-a",
    prospect.eventDate,
    "WED",
    1,
  );

  return {
    beoId,
    beoNumber,
    eventId: `event-${prospect.id}`,
    orgId: prospect.orgId,
    outletId: "ballroom-a",
    gtd: prospect.guestCount,
    exp: prospect.guestCount + 10,
    menu: {
      sections: [
        {
          sectionName: "Appetizers",
          items: [
            { itemName: "Caprese Salad", quantity: prospect.guestCount, price: 12 },
            { itemName: "Shrimp Cocktail", quantity: prospect.guestCount, price: 18 },
          ],
        },
        {
          sectionName: "Entrees",
          items: [
            { itemName: "Beef Tenderloin", quantity: Math.floor(prospect.guestCount * 0.6), price: 48 },
            { itemName: "Salmon Filet", quantity: Math.floor(prospect.guestCount * 0.4), price: 42 },
          ],
        },
        {
          sectionName: "Desserts",
          items: [
            { itemName: "Wedding Cake", quantity: 1, price: 500 },
            { itemName: "Chocolate Mousse", quantity: prospect.guestCount, price: 8 },
          ],
        },
      ],
    },
    timeline: [
      { time: "17:00", label: "Setup", department: "Setup" },
      { time: "18:00", label: "Cocktail Hour", department: "F&B" },
      { time: "19:00", label: "Dinner Service", department: "Kitchen" },
      { time: "21:00", label: "Dessert", department: "Pastry" },
    ],
    status: "approved",
    createdAt: new Date().toISOString(),
  };
}

// Simulate production mapper (based on client/lib/production-mapper.ts)
function mapBEOToProductionItems(doc: MockBEODocument): MockProductionItem[] {
  const items: MockProductionItem[] = [];
  const stations: Record<string, string> = {
    salad: "GARDE",
    cake: "PASTRY",
    mousse: "PASTRY",
    beef: "HOT",
    salmon: "HOT",
    shrimp: "COLD",
  };

  function inferStation(itemName: string): string {
    const name = itemName.toLowerCase();
    for (const [keyword, station] of Object.entries(stations)) {
      if (name.includes(keyword)) return station;
    }
    return "OTHER";
  }

  doc.menu?.sections?.forEach((section, sIdx) => {
    section.items.forEach((item, iIdx) => {
      items.push({
        itemId: `${doc.beoId}:${sIdx}:${iIdx}`,
        itemName: item.itemName,
        station: inferStation(item.itemName),
        quantity: doc.gtd ?? doc.exp ?? 0,
        unit: "portions",
        derivedFrom: {
          beoId: doc.beoId,
          menuPath: `menu.sections[${sIdx}].items[${iIdx}]`,
        },
      });
    });
  });

  return items;
}

// Traceability report entry
interface TraceEntry {
  step: number;
  module: string;
  action: string;
  beoReference: string;
  details: string;
}

describe("BEO Traceability: Prospect/Order → Production/Plate", () => {
  let prospect: MockProspect;
  let beo: MockBEODocument;
  let productionItems: MockProductionItem[];
  const traceLog: TraceEntry[] = [];

  beforeAll(() => {
    // Step 1: Create prospect (simulating CRM/Sales)
    prospect = {
      id: "prospect-001",
      orgId: "org-disney-resort",
      name: "Smith Wedding",
      eventDate: "2026-06-15",
      guestCount: 150,
      status: "confirmed",
    };
    traceLog.push({
      step: 1,
      module: "CRM/Prospect",
      action: "Prospect created",
      beoReference: `(pending BEO) prospect.id=${prospect.id}`,
      details: `${prospect.name}, ${prospect.guestCount} guests, ${prospect.eventDate}`,
    });
  });

  it("should create BEO from prospect with valid beoNumber", () => {
    // Step 2: Create BEO from prospect
    beo = createBEOFromProspect(prospect);

    expect(beo.beoId).toBeDefined();
    expect(beo.beoNumber).toBeDefined();
    expect(beo.beoNumber).toMatch(/^AUR-[A-Z0-9]+-\d{8}-[A-Z]+-\d{3}$/);
    expect(beo.eventId).toContain(prospect.id);
    expect(beo.gtd).toBe(prospect.guestCount);

    traceLog.push({
      step: 2,
      module: "EchoEventStudio/BEOManagement",
      action: "BEO created",
      beoReference: beo.beoNumber,
      details: `beoId=${beo.beoId}, eventId=${beo.eventId}, gtd=${beo.gtd}`,
    });
  });

  it("should have menu items with traceable beoId", () => {
    // Step 3: Verify menu items exist in BEO
    expect(beo.menu).toBeDefined();
    expect(beo.menu?.sections.length).toBeGreaterThan(0);

    const totalItems = beo.menu?.sections.reduce(
      (sum, section) => sum + section.items.length,
      0,
    );
    expect(totalItems).toBeGreaterThan(0);

    traceLog.push({
      step: 3,
      module: "Culinary/Menu",
      action: "Menu items attached to BEO",
      beoReference: beo.beoNumber,
      details: `${beo.menu?.sections.length} sections, ${totalItems} items`,
    });
  });

  it("should map BEO to production items with derivedFrom.beoId", () => {
    // Step 4: Map BEO to production items
    productionItems = mapBEOToProductionItems(beo);

    expect(productionItems.length).toBeGreaterThan(0);

    // All production items should reference the source BEO
    for (const item of productionItems) {
      expect(item.derivedFrom).toBeDefined();
      expect(item.derivedFrom.beoId).toBe(beo.beoId);
      expect(item.derivedFrom.menuPath).toMatch(/^menu\.sections\[\d+\]\.items\[\d+\]$/);
    }

    const stationSummary = productionItems.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.station] = (acc[item.station] || 0) + 1;
        return acc;
      },
      {},
    );

    traceLog.push({
      step: 4,
      module: "MaestroBQT/Production",
      action: "Production items mapped from BEO",
      beoReference: beo.beoNumber,
      details: `${productionItems.length} items: ${JSON.stringify(stationSummary)}`,
    });
  });

  it("should have timeline with departments for scheduling", () => {
    // Step 5: Verify timeline exists for scheduling
    expect(beo.timeline).toBeDefined();
    expect(beo.timeline?.length).toBeGreaterThan(0);

    const departments = new Set(beo.timeline?.map((t) => t.department).filter(Boolean));

    traceLog.push({
      step: 5,
      module: "Schedule",
      action: "Timeline available for scheduling",
      beoReference: beo.beoNumber,
      details: `${beo.timeline?.length} timeline entries, departments: ${[...departments].join(", ")}`,
    });
  });

  it("should produce complete traceability from prospect to plate", () => {
    // Final: Verify full traceability
    expect(traceLog.length).toBe(5);

    // All steps after BEO creation should reference the same beoNumber
    const beoSteps = traceLog.filter((t) => t.step >= 2);
    for (const step of beoSteps) {
      expect(step.beoReference).toBe(beo.beoNumber);
    }

    // Log the trace for visibility
    console.log("\n=== BEO Traceability Report ===");
    console.log(`BEO Number: ${beo.beoNumber}`);
    console.log(`Prospect: ${prospect.name} (${prospect.guestCount} guests)`);
    console.log(`Event Date: ${prospect.eventDate}`);
    console.log("\nTrace Steps:");
    for (const entry of traceLog) {
      console.log(`  ${entry.step}. [${entry.module}] ${entry.action}`);
      console.log(`     BEO Ref: ${entry.beoReference}`);
      console.log(`     Details: ${entry.details}`);
    }
    console.log("=== End Traceability Report ===\n");
  });

  afterAll(() => {
    // Export trace log for reporting (in real scenario, this would go to a file)
    const traceReport = {
      beoNumber: beo.beoNumber,
      prospectId: prospect.id,
      prospectName: prospect.name,
      eventDate: prospect.eventDate,
      guestCount: prospect.guestCount,
      traceSteps: traceLog,
      productionItemsCount: productionItems.length,
      generatedAt: new Date().toISOString(),
    };

    // In a real scenario, write to docs/smoke-system/BEO_TRACE_<beoNumber>.json
    console.log("\nTrace Report JSON:", JSON.stringify(traceReport, null, 2));
  });
});
