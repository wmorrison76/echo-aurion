/**
 * LUCCCA Core API (Moat 10: white-label / headless for chains)
 * GET /api/luccca-core/apis — list Core API surface (recipes, inventory, schedule, reports)
 * GET /api/luccca-core/tenant-branding — get tenant branding (logo, colors, name)
 * POST /api/luccca-core/tenant-branding — set tenant branding (for white-label)
 */

import { Router, Request, Response } from "express";
import { getOrgContext } from "../lib/org-context";

const router = Router();

const CORE_APIS = [
  { id: "recipes", name: "Recipes & Costing", path: "/api/recipes", methods: ["GET", "POST", "PUT", "DELETE"] },
  { id: "inventory", name: "Inventory", path: "/api/inventory", methods: ["GET", "POST"] },
  { id: "purchasing", name: "Purchasing & POs", path: "/api/purchasing", methods: ["GET", "POST"] },
  { id: "schedule", name: "Schedule & Shifts", path: "/api/schedule", methods: ["GET", "POST"] },
  { id: "reports", name: "Reports & Analytics", path: "/api/reports", methods: ["GET"] },
  { id: "cross-module", name: "Cross-module KPIs", path: "/api/analytics/cross-module", methods: ["GET"] },
];

const tenantBrandingStore = new Map<string, { name?: string; logoUrl?: string; primaryColor?: string; secondaryColor?: string }>();

router.get("/apis", (req: Request, res: Response) => {
  res.json({
    apis: CORE_APIS,
    message: "LUCCCA Core: recipe/costing, inventory, purchasing, scheduling, reporting. Use with API key or tenant context.",
  });
});

router.get("/tenant-branding", (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const stored = tenantBrandingStore.get(orgContext.orgId) ?? {};
    res.json({
      orgId: orgContext.orgId,
      name: stored.name ?? "LUCCCA",
      logoUrl: stored.logoUrl ?? null,
      primaryColor: stored.primaryColor ?? null,
      secondaryColor: stored.secondaryColor ?? null,
    });
  } catch {
    res.json({ name: "LUCCCA", logoUrl: null, primaryColor: null, secondaryColor: null });
  }
});

router.post("/tenant-branding", (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const { name, logoUrl, primaryColor, secondaryColor } = req.body ?? {};
    const key = orgContext.orgId;
    const current = tenantBrandingStore.get(key) ?? {};
    tenantBrandingStore.set(key, {
      ...current,
      ...(name !== undefined && { name }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(primaryColor !== undefined && { primaryColor }),
      ...(secondaryColor !== undefined && { secondaryColor }),
    });
    res.json({
      success: true,
      orgId: orgContext.orgId,
      branding: tenantBrandingStore.get(key),
    });
  } catch {
    res.status(400).json({ success: false, error: "Invalid request" });
  }
});

export default router;
