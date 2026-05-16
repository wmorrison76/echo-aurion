import {
  addDays,
  endOfDay,
  format,
  isTomorrow,
  isWithinInterval,
  isYesterday,
  isToday,
  parseISO,
  startOfDay,
} from "date-fns";
export type DeliveryStatus =
  | "scheduled"
  | "enroute"
  | "arrived"
  | "receiving"
  | "completed"
  | "delayed";
export type DeliveryInternalOrderStatus =
  | "scheduled"
  | "staged"
  | "in_transit"
  | "completed";
export type PickupStatus = "pending" | "loading" | "completed";
export interface DeliveryManifestItem {
  id: string;
  productName: string;
  orderedQty: number;
  unit: string;
  receivedQty?: number | null;
  temperatureF?: number | null;
  notes?: string | null;
}
export interface DeliveryInternalOrderItem {
  name: string;
  qty: number;
  unit: string;
  note?: string | null;
}
export interface DeliveryInternalOrder {
  id: string;
  outlet: string;
  department: string;
  status: DeliveryInternalOrderStatus;
  scheduledFor: string;
  items: DeliveryInternalOrderItem[];
}
export interface DeliveryPickup {
  id: string;
  description: string;
  status: PickupStatus;
  readyBy?: string | null;
}
export interface DeliveryTimelineEvent {
  at: string;
  label: string;
  actor?: string | null;
  note?: string | null;
}
export interface DeliveryRecord {
  id: string;
  poNumber: string;
  vendor: string;
  contact?: string | null;
  phone?: string | null;
  outlet: {
    id: string;
    name: string;
    department: string;
    code?: string | null;
  };
  dock: string;
  carrier?: string | null;
  status: DeliveryStatus;
  eta?: string | null;
  scheduledWindow: { start: string; end: string };
  internalOrders: DeliveryInternalOrder[];
  pickups: DeliveryPickup[];
  manifest: DeliveryManifestItem[];
  timeline: DeliveryTimelineEvent[];
  notes: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
export interface DeliveryMetrics {
  total: number;
  scheduledToday: number;
  active: number;
  inReceiving: number;
  delayed: number;
  pickupsPending: number;
  internalOrdersPending: number;
}
export interface DeliveryScheduleDay {
  date: string;
  label: string;
  deliveries: DeliveryRecord[];
}
function buildTime(
  reference: Date,
  offsetDays: number,
  hours: number,
  minutes: number,
): string {
  const base = startOfDay(reference);
  const date = addDays(base, offsetDays);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}
export function generateDeliveries(
  reference: Date = new Date(),
): DeliveryRecord[] {
  return [
    {
      id: "del-001",
      poNumber: "PO-10543",
      vendor: "Sysco",
      contact: "Sharon Mills",
      phone: "404-555-0110",
      outlet: {
        id: "out-harbor",
        name: "Harborview Kitchen",
        department: "Culinary",
        code: "HVK",
      },
      dock: "North Dock • Bay 2",
      carrier: "Sysco ATL",
      status: "receiving",
      eta: buildTime(reference, 0, 8, 10),
      scheduledWindow: {
        start: buildTime(reference, 0, 8, 15),
        end: buildTime(reference, 0, 8, 45),
      },
      internalOrders: [
        {
          id: "INT-9821",
          outlet: "Banquets",
          department: "Culinary",
          status: "staged",
          scheduledFor: buildTime(reference, 0, 10, 0),
          items: [
            {
              name: "Chicken Breast Boneless Skinless 10lb Case",
              qty: 6,
              unit: "case",
            },
            { name: "Fryer Oil 35 lb Jug", qty: 4, unit: "jug" },
          ],
        },
        {
          id: "INT-9825",
          outlet: "In-Room Dining",
          department: "Culinary",
          status: "scheduled",
          scheduledFor: buildTime(reference, 0, 12, 0),
          items: [
            { name: "Romaine Hearts Fresh 12ct", qty: 3, unit: "case" },
            {
              name: "Tomato Paste #10 Can",
              qty: 4,
              unit: "case",
              note: "Hold for Chef Jenna",
            },
          ],
        },
      ],
      pickups: [
        {
          id: "PU-301",
          description: "Return 2 cases of dented canned tomatoes",
          status: "pending",
          readyBy: buildTime(reference, 0, 8, 40),
        },
      ],
      manifest: [
        {
          id: "man-001",
          productName: "Chicken Breast Boneless Skinless 10lb Case",
          orderedQty: 12,
          unit: "case",
          receivedQty: 12,
          temperatureF: 36.2,
        },
        {
          id: "man-002",
          productName: "Fryer Oil 35 lb Jug",
          orderedQty: 8,
          unit: "jug",
          receivedQty: 8,
        },
        {
          id: "man-003",
          productName: "Romaine Hearts Fresh 12ct",
          orderedQty: 6,
          unit: "case",
          receivedQty: 6,
          temperatureF: 38.1,
        },
      ],
      timeline: [
        {
          at: buildTime(reference, 0, 7, 48),
          label: "Driver check-in",
          actor: "Dock Clerk",
          note: "Trailer 12B assigned to Bay 2",
        },
        {
          at: buildTime(reference, 0, 8, 5),
          label: "Temperature logs captured",
          actor: "Receiver A. Lopez",
        },
        {
          at: buildTime(reference, 0, 8, 18),
          label: "First pallet unloaded",
          actor: "Receiver A. Lopez",
        },
      ],
      notes: [
        "Prioritize produce cases for garde manger prep before 10:30 service.",
        "Review new Sysco fuel surcharge with finance before close of day.",
      ],
      tags: ["cooler", "prime"],
      createdAt: buildTime(reference, -3, 9, 0),
      updatedAt: buildTime(reference, 0, 8, 22),
    },
    {
      id: "del-002",
      poNumber: "PO-10587",
      vendor: "FreshPoint",
      contact: "Luis Ortega",
      phone: "912-555-0142",
      outlet: {
        id: "out-garden",
        name: "Garden Bistro",
        department: "Produce",
        code: "GBI",
      },
      dock: "North Dock • Bay 1",
      carrier: "FreshPoint Logistics",
      status: "arrived",
      eta: buildTime(reference, 0, 9, 30),
      scheduledWindow: {
        start: buildTime(reference, 0, 9, 15),
        end: buildTime(reference, 0, 9, 45),
      },
      internalOrders: [
        {
          id: "INT-9832",
          outlet: "Banquets",
          department: "Culinary",
          status: "staged",
          scheduledFor: buildTime(reference, 0, 11, 30),
          items: [
            { name: "Strawberries Fresh Flat 8 lb", qty: 4, unit: "flat" },
            { name: "Romaine Hearts Fresh 12ct", qty: 5, unit: "case" },
          ],
        },
        {
          id: "INT-9837",
          outlet: "Pool Bar",
          department: "Beverage",
          status: "in_transit",
          scheduledFor: buildTime(reference, 0, 13, 0),
          items: [{ name: "Orange Juice NFC 6/64 oz", qty: 6, unit: "case" }],
        },
      ],
      pickups: [
        {
          id: "PU-305",
          description: "Swap 1 pallet empties for fresh herb totes",
          status: "loading",
          readyBy: buildTime(reference, 0, 9, 50),
        },
      ],
      manifest: [
        {
          id: "man-011",
          productName: "Romaine Hearts Fresh 12ct",
          orderedQty: 10,
          unit: "case",
          receivedQty: 10,
          temperatureF: 37.4,
        },
        {
          id: "man-012",
          productName: "Strawberries Fresh Flat 8 lb",
          orderedQty: 6,
          unit: "flat",
          receivedQty: 5,
          notes: "1 flat short, vendor issuing credit",
        },
        {
          id: "man-013",
          productName: "Assorted Fresh Herbs",
          orderedQty: 8,
          unit: "tote",
          receivedQty: 8,
          temperatureF: 39.1,
        },
      ],
      timeline: [
        {
          at: buildTime(reference, 0, 8, 58),
          label: "Vendor en route",
          actor: "Dispatch SMS",
          note: "Traffic delay on I-85, arrival pushed 10 min",
        },
        {
          at: buildTime(reference, 0, 9, 25),
          label: "Docked at Bay 1",
          actor: "Dock Clerk",
        },
      ],
      notes: [
        "Inspect berry flats for bruising before staging for banquets.",
        "Confirm credit memo for missing strawberries posts to PO.",
      ],
      tags: ["produce"],
      createdAt: buildTime(reference, -2, 8, 45),
      updatedAt: buildTime(reference, 0, 9, 28),
    },
    {
      id: "del-003",
      poNumber: "PO-10602",
      vendor: "Halperns",
      contact: "Denise Booker",
      phone: "770-555-0188",
      outlet: {
        id: "out-steak",
        name: "Signature Steakhouse",
        department: "Butchery",
        code: "STK",
      },
      dock: "South Dock • Bay 4",
      carrier: "Halperns Fleet",
      status: "delayed",
      eta: buildTime(reference, 0, 12, 10),
      scheduledWindow: {
        start: buildTime(reference, 0, 11, 30),
        end: buildTime(reference, 0, 12, 0),
      },
      internalOrders: [
        {
          id: "INT-9855",
          outlet: "Steakhouse",
          department: "Butchery",
          status: "scheduled",
          scheduledFor: buildTime(reference, 0, 13, 30),
          items: [
            { name: "Prime Ribeye 14oz", qty: 24, unit: "each" },
            { name: "Dry-Aged Striploin", qty: 6, unit: "loin" },
          ],
        },
      ],
      pickups: [],
      manifest: [
        {
          id: "man-021",
          productName: "Prime Ribeye 14oz",
          orderedQty: 24,
          unit: "each",
        },
        {
          id: "man-022",
          productName: "Dry-Aged Striploin",
          orderedQty: 6,
          unit: "loin",
        },
        {
          id: "man-023",
          productName: "Center-Cut Filet 8oz",
          orderedQty: 32,
          unit: "each",
        },
      ],
      timeline: [
        {
          at: buildTime(reference, 0, 10, 15),
          label: "Vendor delay reported",
          actor: "Halperns Dispatch",
          note: "Production line sanitation hold released at 10:45",
        },
      ],
      notes: [
        "Chef expects dry-aged cuts before 15:00 prep. Escalate if delay exceeds 60 min.",
      ],
      tags: ["protein", "priority"],
      createdAt: buildTime(reference, -5, 7, 52),
      updatedAt: buildTime(reference, 0, 11, 5),
    },
    {
      id: "del-004",
      poNumber: "PO-10618",
      vendor: "WineDirect",
      contact: "Hannah Kline",
      phone: "646-555-0199",
      outlet: {
        id: "out-cellar",
        name: "Cellar & Spirits",
        department: "Beverage",
        code: "CSL",
      },
      dock: "Loading Court • Bay 6",
      carrier: "WineDirect Logistics",
      status: "enroute",
      eta: buildTime(reference, 1, 14, 30),
      scheduledWindow: {
        start: buildTime(reference, 1, 14, 0),
        end: buildTime(reference, 1, 14, 45),
      },
      internalOrders: [
        {
          id: "INT-9872",
          outlet: "Banquets",
          department: "Beverage",
          status: "scheduled",
          scheduledFor: buildTime(reference, 1, 16, 30),
          items: [
            { name: "Cabernet Sauvignon 750ml Reserve", qty: 12, unit: "case" },
            { name: "Sparkling Brut 750ml", qty: 10, unit: "case" },
          ],
        },
        {
          id: "INT-9875",
          outlet: "Lobby Bar",
          department: "Beverage",
          status: "scheduled",
          scheduledFor: buildTime(reference, 1, 17, 0),
          items: [{ name: "Premium Gin 6/1L", qty: 6, unit: "case" }],
        },
      ],
      pickups: [
        {
          id: "PU-322",
          description: "Return 3 empty wine racks for refurbishment",
          status: "pending",
          readyBy: buildTime(reference, 1, 13, 30),
        },
      ],
      manifest: [
        {
          id: "man-031",
          productName: "Cabernet Sauvignon 750ml Reserve",
          orderedQty: 18,
          unit: "case",
        },
        {
          id: "man-032",
          productName: "Sparkling Brut 750ml",
          orderedQty: 14,
          unit: "case",
        },
        {
          id: "man-033",
          productName: "Premium Gin 6/1L",
          orderedQty: 8,
          unit: "case",
        },
      ],
      timeline: [
        {
          at: buildTime(reference, 0, 16, 40),
          label: "Confirmed load out",
          actor: "WineDirect Dispatch",
        },
      ],
      notes: [
        "Secure temp-controlled staging space before arrival.",
        "Audit lot codes against banquets special event list.",
      ],
      tags: ["beverage", "aged"],
      createdAt: buildTime(reference, -1, 14, 5),
      updatedAt: buildTime(reference, 0, 16, 40),
    },
    {
      id: "del-005",
      poNumber: "PO-10644",
      vendor: "DairyBest",
      contact: "Marta Nguyen",
      phone: "678-555-0174",
      outlet: {
        id: "out-pastry",
        name: "Pastry Kitchen",
        department: "Bakery",
        code: "PSY",
      },
      dock: "South Dock • Bay 3",
      carrier: "DairyBest Fleet",
      status: "scheduled",
      eta: buildTime(reference, 1, 6, 50),
      scheduledWindow: {
        start: buildTime(reference, 1, 7, 0),
        end: buildTime(reference, 1, 7, 30),
      },
      internalOrders: [
        {
          id: "INT-9888",
          outlet: "Pastry Kitchen",
          department: "Bakery",
          status: "scheduled",
          scheduledFor: buildTime(reference, 1, 8, 30),
          items: [
            { name: "European Butter 1 lb", qty: 36, unit: "lb" },
            { name: "Heavy Cream 40%", qty: 18, unit: "gal" },
          ],
        },
      ],
      pickups: [
        {
          id: "PU-327",
          description: "Return empty milk crates",
          status: "pending",
          readyBy: buildTime(reference, 1, 7, 5),
        },
      ],
      manifest: [
        {
          id: "man-041",
          productName: "European Butter 1 lb",
          orderedQty: 36,
          unit: "lb",
        },
        {
          id: "man-042",
          productName: "Heavy Cream 40%",
          orderedQty: 18,
          unit: "gal",
        },
        {
          id: "man-043",
          productName: "Mascarpone 5 lb Tub",
          orderedQty: 10,
          unit: "tub",
        },
      ],
      timeline: [],
      notes: [
        "Confirm refrigeration capacity for bulk cream before unloading.",
      ],
      tags: ["cooler"],
      createdAt: buildTime(reference, -1, 6, 45),
      updatedAt: buildTime(reference, -1, 6, 45),
    },
    {
      id: "del-006",
      poNumber: "PO-10521",
      vendor: "US Foods",
      contact: "Andy Cooper",
      phone: "404-555-0126",
      outlet: {
        id: "out-banquet",
        name: "Banquets Central",
        department: "Culinary",
        code: "BQT",
      },
      dock: "North Dock • Bay 3",
      carrier: "US Foods",
      status: "completed",
      eta: buildTime(reference, -1, 13, 0),
      scheduledWindow: {
        start: buildTime(reference, -1, 12, 30),
        end: buildTime(reference, -1, 13, 0),
      },
      internalOrders: [
        {
          id: "INT-9799",
          outlet: "Pool Grill",
          department: "Culinary",
          status: "completed",
          scheduledFor: buildTime(reference, -1, 15, 0),
          items: [
            { name: "Beef Patties 4 oz", qty: 180, unit: "each" },
            { name: "Brioche Buns 72ct", qty: 4, unit: "case" },
          ],
        },
      ],
      pickups: [
        {
          id: "PU-292",
          description: "Backhaul trays and totes",
          status: "completed",
          readyBy: buildTime(reference, -1, 12, 45),
        },
      ],
      manifest: [
        {
          id: "man-051",
          productName: "Beef Patties 4 oz",
          orderedQty: 180,
          unit: "each",
          receivedQty: 176,
          notes: "4 patties short, credited",
        },
        {
          id: "man-052",
          productName: "Brioche Buns 72ct",
          orderedQty: 6,
          unit: "case",
          receivedQty: 6,
        },
        {
          id: "man-053",
          productName: "Shredded Cheddar 5 lb",
          orderedQty: 12,
          unit: "bag",
          receivedQty: 12,
        },
      ],
      timeline: [
        {
          at: buildTime(reference, -1, 12, 20),
          label: "Arrival at gate",
          actor: "Security",
        },
        {
          at: buildTime(reference, -1, 12, 35),
          label: "Docked at Bay 3",
          actor: "Dock Clerk",
        },
        {
          at: buildTime(reference, -1, 13, 5),
          label: "Unload complete",
          actor: "Receiver M. Patel",
        },
      ],
      notes: ["Shorted patties reconciled via credit memo 45291."],
      tags: ["completed"],
      createdAt: buildTime(reference, -4, 11, 25),
      updatedAt: buildTime(reference, -1, 13, 10),
    },
    {
      id: "del-007",
      poNumber: "PO-10488",
      vendor: "LaundryPro",
      contact: "Kendrick Hart",
      phone: "770-555-0192",
      outlet: {
        id: "out-housekeeping",
        name: "Housekeeping",
        department: "Facilities",
        code: "FAC",
      },
      dock: "Service Corridor • Bay 5",
      carrier: "LaundryPro",
      status: "completed",
      eta: buildTime(reference, -3, 16, 0),
      scheduledWindow: {
        start: buildTime(reference, -3, 15, 30),
        end: buildTime(reference, -3, 16, 15),
      },
      internalOrders: [
        {
          id: "INT-9722",
          outlet: "Housekeeping",
          department: "Facilities",
          status: "completed",
          scheduledFor: buildTime(reference, -3, 16, 30),
          items: [
            { name: "Fresh Linen Carts", qty: 5, unit: "cart" },
            { name: "Towel Bundles", qty: 12, unit: "bundle" },
          ],
        },
      ],
      pickups: [
        {
          id: "PU-271",
          description: "Return soiled linens",
          status: "completed",
          readyBy: buildTime(reference, -3, 15, 45),
        },
      ],
      manifest: [
        {
          id: "man-061",
          productName: "Fresh Linen Carts",
          orderedQty: 5,
          unit: "cart",
          receivedQty: 5,
        },
        {
          id: "man-062",
          productName: "Towel Bundles",
          orderedQty: 12,
          unit: "bundle",
          receivedQty: 12,
        },
      ],
      timeline: [
        {
          at: buildTime(reference, -3, 15, 35),
          label: "Dock door opened",
          actor: "Dock Clerk",
        },
        {
          at: buildTime(reference, -3, 15, 55),
          label: "Backhaul linens loaded",
          actor: "Facilities Lead",
        },
      ],
      notes: ["Verified par levels met for all guest floors."],
      tags: ["facilities"],
      createdAt: buildTime(reference, -7, 10, 5),
      updatedAt: buildTime(reference, -3, 16, 5),
    },
  ];
}
export function summarizeDeliveries(
  deliveries: DeliveryRecord[],
  reference: Date = new Date(),
): DeliveryMetrics {
  const windowStart = startOfDay(reference);
  const windowEnd = endOfDay(reference);
  return deliveries.reduce<DeliveryMetrics>(
    (acc, delivery) => {
      const startTime = parseISO(delivery.scheduledWindow.start);
      const inToday = isWithinInterval(startTime, {
        start: windowStart,
        end: windowEnd,
      });
      acc.total += 1;
      if (inToday) {
        acc.scheduledToday += 1;
      }
      if (delivery.status === "arrived" || delivery.status === "receiving") {
        acc.inReceiving += 1;
      }
      if (
        delivery.status === "scheduled" ||
        delivery.status === "enroute" ||
        delivery.status === "arrived" ||
        delivery.status === "receiving"
      ) {
        acc.active += 1;
      }
      if (delivery.status === "delayed") {
        acc.delayed += 1;
      }
      acc.pickupsPending += delivery.pickups.filter(
        (pickup) => pickup.status !== "completed",
      ).length;
      acc.internalOrdersPending += delivery.internalOrders.filter(
        (order) => order.status !== "completed",
      ).length;
      return acc;
    },
    {
      total: 0,
      scheduledToday: 0,
      active: 0,
      inReceiving: 0,
      delayed: 0,
      pickupsPending: 0,
      internalOrdersPending: 0,
    },
  );
}
export function groupDeliveriesByDate(
  deliveries: DeliveryRecord[],
): DeliveryScheduleDay[] {
  const buckets = new Map<string, DeliveryRecord[]>();
  const sorted = [...deliveries].sort(
    (a, b) =>
      parseISO(a.scheduledWindow.start).getTime() -
      parseISO(b.scheduledWindow.start).getTime(),
  );
  sorted.forEach((delivery) => {
    const dayKey = format(
      parseISO(delivery.scheduledWindow.start),
      "yyyy-MM-dd",
    );
    const items = buckets.get(dayKey) ?? [];
    items.push(delivery);
    buckets.set(dayKey, items);
  });
  return Array.from(buckets.entries())
    .map(([date, items]) => {
      const dateObj = parseISO(`${date}T00:00:00`);
      let label = format(dateObj, "EEEE, MMM d");
      if (isToday(dateObj)) {
        label = `Today • ${format(dateObj, "EEE, MMM d")}`;
      } else if (isTomorrow(dateObj)) {
        label = `Tomorrow • ${format(dateObj, "EEE, MMM d")}`;
      } else if (isYesterday(dateObj)) {
        label = `Yesterday • ${format(dateObj, "EEE, MMM d")}`;
      }
      return { date, label, deliveries: items } satisfies DeliveryScheduleDay;
    })
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
}
