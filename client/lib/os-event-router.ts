/**
 * Phase 2: OS Bus Event Router (client-side)
 * ------------------------------------------------------------
 * Implements deterministic, idempotent, multi-step flows on top of the canonical OS Bus.
 *
 * NOTE:
 * - This is a client-side orchestrator (best-effort) to prove the architecture quickly.
 * - Durable orchestration + replay should move server-side later.
 */

import { osBus } from "@/lib/os-bus";
import { getBeo } from "@/lib/beo-store";
import { generateProductionSheets } from "@/lib/production-generator";
import { estimateLabor } from "@/lib/labor-estimator";
import { computePurchaseDeltas } from "@/lib/purchase-delta";
import { optimizePurchasePlan } from "@/lib/purchase-optimizer";
import type { IngredientRequirement, PurchasePlan } from "@/../shared/types/purchasing";
import type { LaborPlan } from "@/../shared/types/labor";

declare global {
  interface Window {
    __osEventRouterInit?: boolean;
  }
}

const IDEMPOTENCY_KEY = "luccca.os_router.idempotency.v1";

function loadIdem(): Record<string, number> {
  try {
    const raw = localStorage.getItem(IDEMPOTENCY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveIdem(map: Record<string, number>) {
  try {
    localStorage.setItem(IDEMPOTENCY_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function once(idempotencyKey: string, fn: () => void) {
  const map = loadIdem();
  if (map[idempotencyKey]) return;
  fn();
  map[idempotencyKey] = Date.now();
  saveIdem(map);
}

function isoDate(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function inferSkillsForStation(station: string, itemNames: string[]): string[] {
  const s = String(station || "").toUpperCase();
  const text = itemNames.join(" ").toLowerCase();

  // Baseline station skills
  const base =
    s === "HOT"
      ? ["hot-line"]
      : s === "COLD"
        ? ["cold-station"]
        : s === "GARDE"
          ? ["garde"]
          : s === "PASTRY"
            ? ["pastry"]
            : s === "BAR"
              ? ["bar"]
              : ["banquet-service"];

  // Heuristics for specialization (v1)
  const out = new Set<string>(base);

  // Butchering signals
  if (/\b(beef|pork|loin|ribeye|striploin|brisket|prime rib|short rib|lamb)\b/i.test(text)) {
    out.add("butchering");
  }
  // Saucier signals
  if (/\b(sauce|au jus|demi|glace|reduction|gravy)\b/i.test(text)) {
    out.add("saucier");
  }
  // Seafood signals
  if (/\b(fish|salmon|tuna|cod|halibut|shrimp|seafood)\b/i.test(text)) {
    out.add("seafood");
  }

  return Array.from(out);
}

/**
 * Core flow:
 * beo:created/updated
 *   -> production:generated
 *   -> purchasing:plan_generated + purchasing:optimized
 *   -> labor:plan_generated
 */
function handleBeoLifecycle(beoId: string, eventId: string) {
  const doc = getBeo(beoId);
  if (!doc) return;

  const revision = Number(doc.revisionNumber ?? 1) || 1;
  const idemBase = `beo:${beoId}:rev:${revision}`;

  // Step 1: Production
  once(`${idemBase}:production`, () => {
    const sheets = generateProductionSheets(doc);
    osBus.emit("production:generated", {
      beoId,
      revision,
      sheets,
      source: "os-event-router",
    });
  });

  // Step 2: Purchasing
  once(`${idemBase}:purchasing`, () => {
    const sheets = generateProductionSheets(doc);
    const requirements: IngredientRequirement[] = sheets.flatMap((sheet) =>
      (sheet.items || []).map((it) => ({
        ingredientId: it.itemId,
        ingredientName: it.itemName,
        requiredQuantity: it.quantity,
        unit: it.unit,
        source: { beoId: sheet.beoId, productionId: sheet.productionId, station: String(sheet.station) },
      })),
    );

    const deltas = computePurchaseDeltas(requirements);
    const plan: PurchasePlan = {
      planId: `plan-${beoId}-${revision}`,
      beoId,
      revision,
      generatedAt: new Date().toISOString(),
      ingredients: deltas,
    };

    osBus.emit("purchasing:plan_generated", {
      planId: plan.planId,
      beoId: plan.beoId,
      revision: plan.revision,
      generatedAt: plan.generatedAt,
      ingredients: plan.ingredients,
      source: "os-event-router",
    });

    // Optimized orders (vendor/pack intelligence).
    const orders = optimizePurchasePlan(deltas);
    osBus.emit("purchasing:optimized", {
      beoId,
      revision,
      generatedAt: new Date().toISOString(),
      orders: orders as any[],
      source: "os-event-router",
    });
  });

  // Step 3: Labor
  once(`${idemBase}:labor`, () => {
    const sheets = generateProductionSheets(doc);
    const baseReqs = estimateLabor(sheets);
    const requirements = baseReqs.map((r) => {
      const sheet = sheets.find((s) => s.productionId === r.derivedFrom.productionId);
      const itemNames = (sheet?.items || []).map((it) => String(it?.itemName || "")).filter(Boolean);
      return {
        ...r,
        requiredSkills: inferSkillsForStation(String(r.station), itemNames),
      };
    });

    const start = doc.start || new Date().toISOString();
    const end = doc.end || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const plan: LaborPlan = {
      planId: `labor-${beoId}-${revision}`,
      beoId,
      revision,
      eventDate: isoDate(start),
      eventTimeRange: `${start} → ${end}`,
      generatedAt: new Date().toISOString(),
      requirements: requirements as any,
      deltas: requirements.map((r) => ({ station: r.station, required: r.requiredStaff, scheduled: 0, delta: r.requiredStaff })),
    };

    osBus.emit("labor:plan_generated", {
      planId: plan.planId,
      beoId: plan.beoId,
      revision: plan.revision,
      eventDate: plan.eventDate,
      eventTimeRange: plan.eventTimeRange,
      generatedAt: plan.generatedAt,
      requirements: plan.requirements as any[],
      deltas: plan.deltas as any[],
      source: "os-event-router",
    });
  });

  // Bookkeeping: mark Maestro received (keeps UI in sync)
  osBus.emit("maestro:event_received", { eventId, source: "os-event-router" });
}

export function initOSEventRouter() {
  if (typeof window !== "undefined" && window.__osEventRouterInit) return;
  if (typeof window !== "undefined") window.__osEventRouterInit = true;

  osBus.on("beo:created", ({ beoId, eventId }) => handleBeoLifecycle(beoId, eventId));
  osBus.on("beo:updated", ({ beoId, eventId }) => handleBeoLifecycle(beoId, eventId));
}

// Auto-init
try {
  initOSEventRouter();
} catch (err) {
  console.warn("[OSEventRouter] init failed (non-fatal):", err);
}

