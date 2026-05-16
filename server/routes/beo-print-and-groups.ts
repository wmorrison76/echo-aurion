/**
 * BEO Print Pack + Event Groups (best-in-class)
 * GET /api/beo/print-pack/:id - generate print pack (BEO + run of show + floor plan)
 * GET /api/beo/event-groups - list event groups
 * GET /api/beo/event-groups/:id - get group with linked BEOs
 */

import { Router, Request, Response } from "express";

const router = Router();

router.get("/print-pack/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "BEO id required" });
  // Stub: in production use beo-print-helpers + PDF lib to return PDF or HTML pack
  res.json({
    beoId: id,
    sections: [
      { type: "beo", title: "Banquet Event Order", content: "Stub BEO content" },
      { type: "run_of_show", title: "Run of Show", content: "Stub run of show" },
      { type: "floor_plan", title: "Floor Plan", content: "Stub floor plan" },
    ],
    format: "json",
    message: "Use client lib beo-print-helpers or generate server-side PDF for full print pack",
  });
});

router.get("/event-groups", (req: Request, res: Response) => {
  const { orgId } = req.query;
  if (!orgId) return res.status(400).json({ error: "orgId required" });
  res.json({
    groups: [],
    total: 0,
    message: "Wire to BEO repo filtered by eventGroupId",
  });
});

router.get("/event-groups/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Event group id required" });
  res.json({
    id,
    name: "Event group",
    beoIds: [],
    startDate: null,
    endDate: null,
    message: "Wire to BEO repo where eventGroupId = id",
  });
});

export default router;
