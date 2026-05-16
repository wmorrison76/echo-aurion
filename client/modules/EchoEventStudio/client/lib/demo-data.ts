import type { Prospect, ProspectStage } from "@shared/types/prospect";
import type { MenuItem } from "../components/BeoMenuPicker";
import { upsertMenuCatalogItems } from "./menu-catalog-store";

const DEMO_PROSPECTS_KEY = "echoeventstudio:demo:prospects:v1";
const DEMO_SEEDED_KEY = "echoeventstudio:demo:seeded:v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function loadDemoProspects(): Prospect[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<{ prospects?: Prospect[] }>(
    localStorage.getItem(DEMO_PROSPECTS_KEY),
  );
  return Array.isArray(parsed?.prospects)
    ? parsed!.prospects!.filter(Boolean)
    : [];
}

export function saveDemoProspects(prospects: Prospect[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEMO_PROSPECTS_KEY, JSON.stringify({ prospects }));
  } catch {
    // ignore storage errors
  }
}

export function buildDemoProspects(): Prospect[] {
  const now = new Date().toISOString();
  return [
    {
      id: "demo-prospect-1",
      name: "Luxe Bridal Collective",
      contact_name: "Avery Knight",
      email: "avery@luxebridal.com",
      phone: "+1-555-0101",
      status: "proposal",
      event_type_code: "WED",
      event_date: isoDaysFromNow(18),
      guest_count: 180,
      estimated_revenue: 48000,
      description: "Black-tie wedding reception with plated dinner.",
      created_by: "demo",
      created_at: now,
      updated_at: now,
    },
    {
      id: "demo-prospect-2",
      name: "Aurora Tech Summit",
      contact_name: "Jordan Lee",
      email: "jordan@auroratech.io",
      phone: "+1-555-0122",
      status: "qualified",
      event_type_code: "SEM",
      event_date: isoDaysFromNow(42),
      guest_count: 260,
      estimated_revenue: 72000,
      description: "Two-day summit with AV and branded coffee breaks.",
      created_by: "demo",
      created_at: now,
      updated_at: now,
    },
    {
      id: "demo-prospect-3",
      name: "Harborview Fundraiser",
      contact_name: "Morgan Reyes",
      email: "morgan@harborview.org",
      status: "negotiation",
      event_type_code: "BAN",
      event_date: isoDaysFromNow(6),
      guest_count: 320,
      estimated_revenue: 98000,
      description: "Gala with auction, stage, and VIP lounge.",
      scheduling_conflicts: {
        severity: "medium",
        notes: "Back-to-back ballroom reset",
      },
      created_by: "demo",
      created_at: now,
      updated_at: now,
    },
    {
      id: "demo-prospect-4",
      name: "Silverline Corporate Retreat",
      contact_name: "Priya Patel",
      email: "priya@silverline.co",
      status: "won",
      event_type_code: "COR",
      event_date: isoDaysFromNow(4),
      guest_count: 140,
      estimated_revenue: 38000,
      description: "Executive retreat with wellness breakouts.",
      created_by: "demo",
      created_at: now,
      updated_at: now,
    },
    {
      id: "demo-prospect-5",
      name: "Evergreen Community Awards",
      contact_name: "Chris Dalton",
      email: "chris@evergreen.org",
      status: "prospect",
      event_type_code: "OTH",
      event_date: isoDaysFromNow(72),
      guest_count: 220,
      estimated_revenue: 52000,
      description: "Community awards night with buffet stations.",
      created_by: "demo",
      created_at: now,
      updated_at: now,
    },
  ];
}

export function ensureDemoProspects(): Prospect[] {
  const existing = loadDemoProspects();
  if (existing.length > 0) return existing;
  const seeded = buildDemoProspects();
  saveDemoProspects(seeded);
  return seeded;
}

export function upsertDemoProspect(prospect: Prospect): Prospect[] {
  const existing = loadDemoProspects();
  const next = existing.some((p) => p.id === prospect.id)
    ? existing.map((p) => (p.id === prospect.id ? prospect : p))
    : [prospect, ...existing];
  saveDemoProspects(next);
  return next;
}

export function updateDemoProspectStage(
  id: string,
  status: ProspectStage,
): Prospect[] {
  const existing = loadDemoProspects();
  const next = existing.map((p) =>
    p.id === id ? { ...p, status, updated_at: new Date().toISOString() } : p,
  );
  saveDemoProspects(next);
  return next;
}

export function seedDemoMenuCatalog(): void {
  const now = new Date().toISOString();
  const items: MenuItem[] = [
    {
      id: "demo-menu-1",
      name: "Citrus Herb Chicken",
      category: "Entrees",
      description: "Roasted chicken with lemon thyme jus.",
      price: 32,
      cost: 12,
      preparationTime: 35,
      servingSize: "6 oz",
      dietary: ["gluten-free available"],
      allergens: ["citrus"],
      popularity: 8,
      upsellPotential: 6,
      menuVersion: "2026-Q1",
      effectiveFrom: now,
      outletId: "banquet",
    },
    {
      id: "demo-menu-2",
      name: "Wild Mushroom Risotto",
      category: "Entrees",
      description: "Arborio rice with porcini cream.",
      price: 28,
      cost: 9,
      preparationTime: 30,
      servingSize: "1 plate",
      dietary: ["vegetarian"],
      allergens: ["dairy"],
      popularity: 7,
      upsellPotential: 5,
      menuVersion: "2026-Q1",
      effectiveFrom: now,
      outletId: "all",
    },
    {
      id: "demo-menu-3",
      name: "Seared Salmon",
      category: "Entrees",
      description: "Atlantic salmon with fennel salad.",
      price: 36,
      cost: 14,
      preparationTime: 25,
      servingSize: "5 oz",
      dietary: ["gluten-free"],
      allergens: ["fish"],
      popularity: 9,
      upsellPotential: 7,
      menuVersion: "2026-Q1",
      effectiveFrom: now,
      outletId: "outlet-1",
    },
    {
      id: "demo-menu-4",
      name: "Seasonal Fruit Tart",
      category: "Desserts",
      description: "Vanilla pastry cream with fresh berries.",
      price: 12,
      cost: 4,
      preparationTime: 15,
      servingSize: "1 slice",
      dietary: ["vegetarian"],
      allergens: ["dairy", "gluten"],
      popularity: 6,
      upsellPotential: 8,
      menuVersion: "2026-Q1",
      effectiveFrom: now,
      outletId: "pastry",
    },
  ];

  upsertMenuCatalogItems(items, {
    source: { kind: "manual", fileName: "demo-seed" },
  });
}

export function seedDemoData() {
  const prospects = ensureDemoProspects();
  seedDemoMenuCatalog();
  if (typeof window !== "undefined") {
    localStorage.setItem(DEMO_SEEDED_KEY, "1");
    window.dispatchEvent(new CustomEvent("echoeventstudio:demo-seeded"));
  }
  return { prospects };
}

export function isDemoSeeded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_SEEDED_KEY) === "1";
}

export function buildMetricsFromProspects(prospects: Prospect[]) {
  const weights: Record<ProspectStage, number> = {
    prospect: 0.2,
    qualified: 0.4,
    proposal: 0.6,
    negotiation: 0.7,
    won: 1,
    beo_created: 1,
    lost: 0,
  };

  const now = new Date();
  const inNextDays = (days: number, date: string) => {
    const d = new Date(date);
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= days;
  };

  const prospectsCount = prospects.length;
  const openProspectsCount = prospects.filter(
    (p) => !["won", "beo_created", "lost"].includes(p.status),
  ).length;
  const pipeline30d = prospects
    .filter((p) => p.status !== "lost" && inNextDays(30, p.event_date))
    .reduce((sum, p) => sum + Number(p.estimated_revenue || 0), 0);
  const weighted30d = prospects
    .filter((p) => p.status !== "lost" && inNextDays(30, p.event_date))
    .reduce(
      (sum, p) =>
        sum + Number(p.estimated_revenue || 0) * (weights[p.status] || 0),
      0,
    );
  const pipeline18 = prospects
    .filter((p) => p.status !== "lost")
    .reduce((sum, p) => sum + Number(p.estimated_revenue || 0), 0);
  const weighted18 = prospects
    .filter((p) => p.status !== "lost")
    .reduce(
      (sum, p) =>
        sum + Number(p.estimated_revenue || 0) * (weights[p.status] || 0),
      0,
    );
  const rush72hCount = prospects.filter(
    (p) => p.status !== "lost" && inNextDays(3, p.event_date),
  ).length;

  return {
    clientsCount: Math.max(12, prospectsCount + 6),
    vipClientsCount: Math.min(4, Math.max(0, Math.floor(prospectsCount / 3))),
    prospectsCount,
    openProspectsCount,
    rush72hCount,
    pipeline30d,
    weighted30d,
    pipeline18,
    weighted18,
  };
}
