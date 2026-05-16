/**
 * BEO Lifecycle — stub API routes for Schedule push, requisition, and prep list.
 * Replace with real implementations when staff-needs, banquets, and beo backends are available.
 */

import { Router, Request, Response } from "express";

const router = Router();

router.post("/staff-needs/push", (req: Request, res: Response) => {
  const { beoId, eventDate, eventName, staffing } = req.body || {};
  if (!beoId || !Array.isArray(staffing)) {
    return res.status(400).json({ message: "beoId and staffing array required." });
  }
  res.status(200).json({
    message: "Staffing pushed to Schedule.",
    beoId,
    eventDate,
    eventName,
    count: staffing.length,
  });
});

router.post("/banquets/requisition", (req: Request, res: Response) => {
  const { beoId, eventName, eventDate, guaranteedCount, setForCount, menuSummary } = req.body || {};
  if (!beoId) {
    return res.status(400).json({ message: "beoId required." });
  }
  const requisitionId = `req-${beoId}-${Date.now()}`;
  res.status(200).json({
    message: "Requisition created.",
    requisitionId,
    beoId,
    eventName,
    eventDate,
    lineCount: Array.isArray(menuSummary) ? menuSummary.length : 0,
  });
});

router.post("/beo/prep-list", (req: Request, res: Response) => {
  const { beoId, event } = req.body || {};
  if (!beoId) {
    return res.status(400).json({ message: "beoId required." });
  }
  res.status(200).json({
    message: "Prep list generated.",
    beoId,
  });
});

export { router as beoIntegrationsRouter };
