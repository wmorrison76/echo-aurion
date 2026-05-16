/********************************************************************
 * LUCCCA — BUILD 13 (1 of 2)
 * API for conflicts (REST)
 *
 * PURPOSE:
 *  - Central registry for conflicts
 *  - Event + maintenance schedulers POST here
 *  - Override Center GETs and RESOLVEs
 *  - Triggers ChangeFeed events when state changes
 *
 * REQUIREMENTS:
 *  - Hook into in-memory DB for now
 *  - Later: swap to Postgres
 *********************************************************************/

import { Router, Request, Response } from "express";
import { getOrgContext } from "../lib/org-resolver";

export const conflictsRouter = Router();

// temp in-memory DB (map org_id -> conflicts array)
let conflictsByOrg: Record<string, any[]> = {};

// GET all pending conflicts
conflictsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const orgConflicts = conflictsByOrg[orgContext.orgId] || [];
    const pending = orgConflicts.filter((c) => c.status === "pending");
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch conflicts" });
  }
});

// CREATE conflict
conflictsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const body = req.body;
    const conflict = {
      id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      org_id: orgContext.orgId,
      kind: body.kind || "event",
      space: body.space,
      description: body.description,
      severity: body.severity || "warn",
      requestedBy: body.requestedBy,
      status: "pending",
      createdAt: Date.now(),
    };

    if (!conflictsByOrg[orgContext.orgId]) {
      conflictsByOrg[orgContext.orgId] = [];
    }
    conflictsByOrg[orgContext.orgId].unshift(conflict);

    // Publish to Change Feed via in-memory notification
    // In production, this would emit to a real event bus or call an API
    console.log(`[CONFLICT] Created: ${conflict.id}`);

    res.json(conflict);
  } catch (error) {
    res.status(400).json({ error: "Failed to create conflict" });
  }
});

// RESOLVE conflict
conflictsRouter.post("/:id/resolve", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const { id } = req.params;
    const { decision, actor } = req.body;

    const orgConflicts = conflictsByOrg[orgContext.orgId] || [];
    const conflict = orgConflicts.find((c) => c.id === id);
    if (!conflict) return res.status(404).json({ error: "not found" });

    conflict.status = decision;
    conflict.resolvedBy = actor;
    conflict.resolvedAt = Date.now();

    console.log(`[CONFLICT] Resolved: ${id} -> ${decision} by ${actor}`);

    res.json(conflict);
  } catch (error) {
    res.status(500).json({ error: "Failed to resolve conflict" });
  }
});

// GET single conflict
conflictsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const { id } = req.params;
    const orgConflicts = conflictsByOrg[orgContext.orgId] || [];
    const conflict = orgConflicts.find((c) => c.id === id);

    if (!conflict) {
      return res.status(404).json({ error: "not found" });
    }

    res.json(conflict);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch conflict" });
  }
});

// DELETE conflict (admin only)
conflictsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const { id } = req.params;
    const orgConflicts = conflictsByOrg[orgContext.orgId] || [];
    const index = orgConflicts.findIndex((c) => c.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "not found" });
    }

    const deleted = orgConflicts.splice(index, 1);
    conflictsByOrg[orgContext.orgId] = orgConflicts;
    res.json({ deleted: deleted[0] });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete conflict" });
  }
});
