/**
 * Module Gate (D8)
 *
 * The platform's modular-architecture claim — "any module can be turned
 * off; competitor software plugs in via APIs" — has been a sales-deck
 * line because the storage exists (feature_flags table from migration
 * 043, FeatureFlagService at server/services/feature-flag-service.ts)
 * but no consumer was wired. 132 sidebar panels and 150+ Express routes
 * registered unconditionally for every customer.
 *
 * This module is the consumer. It exposes:
 *
 *   - `isModuleEnabledForOrg(moduleName, orgId)` — returns true if the
 *     module should be active for this org. Defaults to TRUE (modules
 *     are on unless explicitly disabled per-org via FeatureFlagService).
 *     Cached 60s per (module, org) to avoid hitting the DB on every
 *     request.
 *
 *   - `requireModuleEnabled(moduleName)` — Express middleware factory.
 *     Wrap any router with `app.use('/api/x', requireModuleEnabled('x'),
 *     xRouter)` and disabled orgs get a 503 + Module-Disabled body
 *     instead of the route's response.
 *
 *   - `listKnownModules()` — the canonical module list the Admin Module
 *     Settings UI iterates. Add a new module here when you wire it
 *     through the gate.
 *
 * Failure mode: if FeatureFlagService throws (db down, migration not
 * run), the gate FAIL-OPENS — modules stay enabled. The reasoning:
 * accidental customer impact from "all modules off" during an outage
 * is worse than "modular gating temporarily not enforced". A flag
 * MODULE_GATE_FAIL_CLOSED=true reverses this for stricter deployments.
 */

import type { Request, Response, NextFunction } from "express";
import { featureFlagService } from "../services/feature-flag-service";
import { logger } from "./logger";

export interface ModuleDescriptor {
  name: string;             // canonical name (also the flag key suffix)
  label: string;            // human-readable for the admin UI
  description: string;
  defaultEnabled: boolean;  // when no flag exists, is the module on?
  category: "core" | "culinary" | "financial" | "operations" | "intelligence" | "integrations";
}

/** Module list the Admin Module Settings UI iterates over. To add a
 *  module, register it here. Gates apply to the first 4 (the demo path);
 *  the rest will be gated incrementally without UI changes. */
const KNOWN_MODULES: ModuleDescriptor[] = [
  {
    name: "aurum",
    label: "EchoAurum (Accounting)",
    description: "Real-time GL, AP, AR, P&L. Disable when customer uses QuickBooks/Xero/Sage via adapter.",
    defaultEnabled: true,
    category: "financial",
  },
  {
    name: "culinary",
    label: "Culinary (Recipes & Menus)",
    description: "Recipe builder, costing, allergens, nutrition, Echo Recipe Pro.",
    defaultEnabled: true,
    category: "culinary",
  },
  {
    name: "schedule",
    label: "Schedule (Labor)",
    description: "Employee scheduling, forecasting, time clock. Disable when customer uses ADP/Workday via adapter.",
    defaultEnabled: true,
    category: "operations",
  },
  {
    name: "chronos",
    label: "Chronos (Enterprise Dashboard)",
    description: "Real-time outlet KPIs, P&L drill-down, voice insights.",
    defaultEnabled: true,
    category: "intelligence",
  },
  {
    name: "purchasing-receiving",
    label: "Purchasing & Receiving",
    description: "PO, ASN, three-way match, receive-from-truck flow.",
    defaultEnabled: true,
    category: "operations",
  },
  {
    name: "echolayout",
    label: "EchoLayout (Floor Plans + Kitchen Design)",
    description: "Event room layouts, kitchen design with thermal heat map + compliance.",
    defaultEnabled: true,
    category: "operations",
  },
  {
    name: "maestro-bqt",
    label: "MaestroBQT (Banquets)",
    description: "BEO/REO management, banquet event orchestration.",
    defaultEnabled: true,
    category: "operations",
  },
  {
    name: "spa",
    label: "Spa Operations",
    description: "Treatments, memberships, retail attach.",
    defaultEnabled: true,
    category: "operations",
  },
  {
    name: "foh",
    label: "Front of House",
    description: "Floor management, beverage attach, server productivity.",
    defaultEnabled: true,
    category: "operations",
  },
  {
    name: "retail",
    label: "Retail Operations",
    description: "Gift shop sales, inventory, charge-to-room.",
    defaultEnabled: true,
    category: "operations",
  },
  {
    name: "engineering",
    label: "Engineering & HVAC",
    description: "Predictive maintenance, IoT, CapEx forecasting.",
    defaultEnabled: true,
    category: "operations",
  },
  {
    name: "security",
    label: "Security & Compliance",
    description: "Audit trail, RBAC, GDPR, certifications.",
    defaultEnabled: true,
    category: "core",
  },
  {
    name: "echo-ai3",
    label: "Echo AI³ (Intelligence)",
    description: "Resonance, Aurion, Voyage, Atrium cognition layers.",
    defaultEnabled: true,
    category: "intelligence",
  },
];

const KNOWN_BY_NAME = new Map(KNOWN_MODULES.map((m) => [m.name, m] as const));

export function listKnownModules(): ModuleDescriptor[] {
  return [...KNOWN_MODULES];
}

export function getModuleDescriptor(name: string): ModuleDescriptor | undefined {
  return KNOWN_BY_NAME.get(name);
}

const FLAG_PREFIX = "module:";
const CACHE_TTL_MS = 60 * 1000;
type CacheEntry = { enabled: boolean; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function cacheKey(moduleName: string, orgId?: string): string {
  return `${moduleName}::${orgId ?? "global"}`;
}

/**
 * Check whether a module is enabled for the given org. Defaults to the
 * descriptor's defaultEnabled when no flag is set, so a fresh customer
 * starts with all modules on. To disable a module, the admin UI sets
 * a flag named "module:{name}" with status="disabled" or
 * targetType="org_ids" + targetConfig.orgIds=[...] inverted.
 */
export async function isModuleEnabledForOrg(
  moduleName: string,
  orgId?: string,
): Promise<boolean> {
  const cached = cache.get(cacheKey(moduleName, orgId));
  if (cached && cached.expiresAt > Date.now()) return cached.enabled;

  const desc = KNOWN_BY_NAME.get(moduleName);
  const fallback = desc?.defaultEnabled ?? true;

  try {
    const result = await featureFlagService.isEnabled(`${FLAG_PREFIX}${moduleName}`, { orgId });
    // If flag isn't found (most modules), use the descriptor's default.
    const enabled = result.reason === "Feature flag not found" ? fallback : result.enabled;
    cache.set(cacheKey(moduleName, orgId), {
      enabled,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return enabled;
  } catch (err) {
    // Fail-open by default. Set MODULE_GATE_FAIL_CLOSED=true to invert.
    const failClosed = (process.env.MODULE_GATE_FAIL_CLOSED || "").toLowerCase() === "true";
    logger.warn("[ModuleGate] FeatureFlagService threw; falling back", {
      moduleName,
      orgId,
      failClosed,
      error: err instanceof Error ? err.message : String(err),
    });
    return failClosed ? false : fallback;
  }
}

export function invalidateModuleGateCache(moduleName?: string): void {
  if (!moduleName) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) if (key.startsWith(`${moduleName}::`)) cache.delete(key);
}

/**
 * Express middleware factory. Use as:
 *   app.use("/api/aurum", requireModuleEnabled("aurum"), aurumRouter);
 * When the module is disabled for the request's org, returns 503 with
 * a structured body the client can render as "this module is off — ask
 * your admin". Other module routes continue to work.
 */
export function requireModuleEnabled(moduleName: string) {
  return async function moduleGate(req: Request, res: Response, next: NextFunction) {
    const orgId = (req as any).user?.org_id || (req as any).user?.orgId || (req.headers["x-org-id"] as string | undefined);
    const enabled = await isModuleEnabledForOrg(moduleName, orgId);
    if (enabled) return next();
    const desc = getModuleDescriptor(moduleName);
    return res.status(503).json({
      error: "Module disabled",
      module: moduleName,
      label: desc?.label ?? moduleName,
      reason: "module_disabled_for_org",
      hint: "Enable in Admin → Module Settings, or configure the corresponding adapter (e.g. QuickBooks, ADP) if your org uses external software.",
    });
  };
}
