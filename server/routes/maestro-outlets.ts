/**
 * Maestro Outlets Routes
 *
 * Simple outlets management without @vercel/postgres dependency.
 * Provides outlet listing and selection for event management.
 *
 * ENDPOINTS:
 * - GET /api/outlets - List all outlets for organization
 */

import express, { Request, Response } from "express";
import { getOrgContext } from "../lib/org-resolver";

const router = express.Router();

// Simple in-memory outlet storage per organization
// In a production system, this would be in Supabase
const outletsStore: Record<
  string,
  Array<{ id: string; name: string; location?: string; timezone?: string }>
> = {
  default: [
    {
      id: "main",
      name: "Main Location",
      location: "Primary Venue",
      timezone: "America/New_York",
    },
    {
      id: "secondary",
      name: "Secondary Location",
      location: "Satellite Venue",
      timezone: "America/New_York",
    },
  ],
};

/**
 * GET /api/outlets
 * List all outlets for the organization
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    console.log("[MAESTRO-OUTLETS] GET / called");

    const orgContext = getOrgContext(req);
    const orgId = orgContext.orgId || "default";

    console.log("[MAESTRO-OUTLETS] OrgContext:", {
      orgId,
      userId: orgContext.userId,
      authenticated: orgContext.authenticated,
      userRole: orgContext.userRole,
    });

    // Get outlets for this organization, or return defaults
    const outlets = outletsStore[orgId] || outletsStore.default;

    console.log("[MAESTRO-OUTLETS] Returning outlets:", {
      count: outlets.length,
      orgId,
    });

    res.json({
      success: true,
      outlets: outlets,
      count: outlets.length,
      orgId: orgId,
    });
  } catch (err) {
    console.error("[MAESTRO-OUTLETS] GET error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch outlets",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * GET /api/outlets/:id
 * Get a specific outlet
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgContext = getOrgContext(req);
    const orgId = orgContext.orgId || "default";

    const outlets = outletsStore[orgId] || outletsStore.default;
    const outlet = outlets.find((o) => o.id === id);

    if (!outlet) {
      return res.status(404).json({
        success: false,
        error: "Outlet not found",
      });
    }

    res.json({
      success: true,
      outlet: outlet,
      orgId: orgId,
    });
  } catch (err) {
    console.error("[MAESTRO-OUTLETS] GET :id error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch outlet",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * POST /api/outlets
 * Create a new outlet (admin only)
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const orgId = orgContext.orgId || "default";
    const { name, location, timezone } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: name",
      });
    }

    // Initialize outlets array if not exists
    if (!outletsStore[orgId]) {
      outletsStore[orgId] = [];
    }

    // Generate simple ID from name
    const id = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    // Check if outlet already exists
    if (outletsStore[orgId].some((o) => o.id === id)) {
      return res.status(409).json({
        success: false,
        error: "Outlet with this name already exists",
      });
    }

    const newOutlet = {
      id,
      name,
      location: location || undefined,
      timezone: timezone || "America/New_York",
    };

    outletsStore[orgId].push(newOutlet);

    res.status(201).json({
      success: true,
      outlet: newOutlet,
      orgId: orgId,
    });
  } catch (err) {
    console.error("[MAESTRO-OUTLETS] POST error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to create outlet",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
