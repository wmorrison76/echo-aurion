/********************************************************************
 * LUCCCA — BUILD 15
 * Space Lock & Availability API
 *
 * PURPOSE:
 *  - Track locked/blocked venues in real-time
 *  - Prevent scheduling conflicts proactively
 *  - Provide availability queries to schedulers
 *
 * INTEGRATION:
 *  - EventScheduler
 *  - MaintenanceScheduler
 *  - GlobalCalendar
 *  - Override Center
 *********************************************************************/

import { Router, Request, Response } from "express";
import { getOrgContext } from "../lib/org-resolver";

export const spaceLocksRouter = Router();

type SpaceLock = {
  id: string;
  org_id: string;
  space: string;
  start: number;
  end: number;
  type: "hard" | "soft"; // hard = enforced, soft = buffer
  reason: string;
  setBy: string;
  createdAt: number;
};

let spaceLocksbyOrg: Record<string, SpaceLock[]> = {};

// GET current locks
spaceLocksRouter.get("/", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    let spaceLocks = spaceLocksbyOrg[orgContext.orgId] || [];
    const now = Date.now();
    // Filter out expired locks
    const active = spaceLocks.filter((l) => l.end > now);
    spaceLocksbyOrg[orgContext.orgId] = active; // Clean up expired
    res.json(active);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch locks" });
  }
});

// QUERY availability for given time
spaceLocksRouter.post("/availability", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const { space, start, end } = req.body;
    const spaceLocks = spaceLocksbyOrg[orgContext.orgId] || [];

    if (!space || !start || !end) {
      return res
        .status(400)
        .json({ error: "Missing required fields: space, start, end" });
    }

    const conflicts = spaceLocks.filter(
      (l) => l.space === space && l.end > start && end > l.start,
    );

    res.json({
      available: conflicts.length === 0,
      conflicts,
      message: conflicts.length
        ? `${conflicts.length} lock(s) block this time`
        : "Space is available",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to query availability" });
  }
});

// CREATE lock
spaceLocksRouter.post("/", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const data = req.body;

    if (!data.space || !data.start || !data.end || !data.reason) {
      return res.status(400).json({
        error: "Missing required fields: space, start, end, reason",
      });
    }

    const lock: SpaceLock = {
      id: `lock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      org_id: orgContext.orgId,
      space: data.space,
      start: data.start,
      end: data.end,
      type: data.type || "hard",
      reason: data.reason,
      setBy: data.setBy || "system",
      createdAt: Date.now(),
    };

    if (!spaceLocksbyOrg[orgContext.orgId]) {
      spaceLocksbyOrg[orgContext.orgId] = [];
    }
    spaceLocksbyOrg[orgContext.orgId].push(lock);

    console.log(
      `[SPACE-LOCK] Created: ${lock.id} for ${lock.space} (${lock.type})`,
    );

    res.json(lock);
  } catch (error) {
    res.status(400).json({ error: "Failed to create lock" });
  }
});

// GET single lock
spaceLocksRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const { id } = req.params;
    const spaceLocks = spaceLocksbyOrg[orgContext.orgId] || [];
    const lock = spaceLocks.find((l) => l.id === id);

    if (!lock) {
      return res.status(404).json({ error: "Lock not found" });
    }

    res.json(lock);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch lock" });
  }
});

// RELEASE lock
spaceLocksRouter.post("/:id/release", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const { id } = req.params;
    let spaceLocks = spaceLocksbyOrg[orgContext.orgId] || [];
    const lock = spaceLocks.find((l) => l.id === id);

    if (!lock) {
      return res.status(404).json({ error: "Lock not found" });
    }

    spaceLocksbyOrg[orgContext.orgId] = spaceLocks.filter((l) => l.id !== id);

    console.log(`[SPACE-LOCK] Released: ${id} for ${lock.space}`);

    res.json({ ok: true, released: lock });
  } catch (error) {
    res.status(500).json({ error: "Failed to release lock" });
  }
});

// RELEASE all locks for a space
spaceLocksRouter.post(
  "/:space/release-all",
  async (req: Request, res: Response) => {
    try {
      const orgContext = getOrgContext(req);
      const { space } = req.params;
      let spaceLocks = spaceLocksbyOrg[orgContext.orgId] || [];
      const before = spaceLocks.length;
      spaceLocksbyOrg[orgContext.orgId] = spaceLocks.filter(
        (l) => l.space !== space,
      );
      const released = before - spaceLocksbyOrg[orgContext.orgId].length;

      console.log(`[SPACE-LOCK] Released ${released} locks for ${space}`);

      res.json({ ok: true, releasedCount: released });
    } catch (error) {
      res.status(500).json({ error: "Failed to release locks" });
    }
  },
);
