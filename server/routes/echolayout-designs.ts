/**
 * EchoLayout — Design HTTP surface (A6)
 *
 *   POST /api/echolayout/design-from-beo
 *     Body: { beoId, style?, roomId?, guestCountOverride?, constraints?, allowSoftFail? }
 *     Auto-generate (or regenerate) the layout for a BEO. Returns the
 *     pending_approval design. Auth required.
 *
 *   POST /api/echolayout/designs/:designId/approve
 *     Body: { edited?, tables?, fixtures?, aisles? }
 *     Approve the design. If the chef edited tables/fixtures/aisles in
 *     the UI before approving, pass them in the body and the row stamps
 *     `edited=true`. Auth required.
 *
 *   POST /api/echolayout/designs/:designId/reject
 *     Body: { reason? }. Auth required.
 *
 *   GET  /api/echolayout/designs/by-beo/:beoId
 *     Returns the active design (pending_approval or approved) for a BEO.
 *
 *   GET  /api/echolayout/designs/:designId
 *     Returns the full design row.
 */

import express, { Request, Response } from "express";
import { logger } from "../lib/logger";
import { basicAuthMiddleware } from "../middleware/auth";
import { StrictModeError } from "../lib/strict-mode";
import {
  designLayoutFromBEO,
  approveLayoutDesign,
  rejectLayoutDesign,
  getActiveDesignForBEO,
  getDesignById,
} from "../services/echo-layout-design-service";

const router = express.Router();

router.post("/design-from-beo", basicAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { beoId, style, roomId, guestCountOverride, constraints, allowSoftFail } = req.body ?? {};
    if (!beoId) return res.status(400).json({ success: false, error: "beoId is required" });
    const userId = (req as any).user?.id;
    const result = await designLayoutFromBEO({
      beoId,
      style,
      roomId,
      guestCountOverride: typeof guestCountOverride === "number" ? guestCountOverride : undefined,
      constraints,
      generatedBy: userId ?? "manual",
      allowSoftFail: allowSoftFail === true ? true : undefined,
    });
    res.json({ success: true, result });
  } catch (err) {
    if (err instanceof StrictModeError) {
      return res.status(422).json({
        success: false,
        error: err.message,
        strictModeArea: err.area,
        details: err.details,
      });
    }
    logger.error("[EchoLayout] design error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Design failed",
    });
  }
});

router.post("/designs/:designId/approve", basicAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { edited, tables, fixtures, aisles } = req.body ?? {};
    const result = await approveLayoutDesign(req.params.designId, {
      approvedBy: userId,
      edited: edited === true,
      tables,
      fixtures,
      aisles,
    });
    res.json({ success: true, result });
  } catch (err) {
    logger.error("[EchoLayout] approve error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Approve failed",
    });
  }
});

router.post("/designs/:designId/reject", basicAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { reason } = req.body ?? {};
    const result = await rejectLayoutDesign(req.params.designId, {
      rejectedBy: userId,
      reason,
    });
    res.json({ success: true, result });
  } catch (err) {
    logger.error("[EchoLayout] reject error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Reject failed",
    });
  }
});

router.get("/designs/by-beo/:beoId", async (req: Request, res: Response) => {
  try {
    const design = await getActiveDesignForBEO(req.params.beoId);
    if (!design) return res.status(404).json({ success: false, error: "No active design for this BEO" });
    res.json({ success: true, design });
  } catch (err) {
    logger.error("[EchoLayout] read by-beo error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Read failed",
    });
  }
});

router.get("/designs/:designId", async (req: Request, res: Response) => {
  try {
    const design = await getDesignById(req.params.designId);
    if (!design) return res.status(404).json({ success: false, error: "Design not found" });
    res.json({ success: true, design });
  } catch (err) {
    logger.error("[EchoLayout] read by-id error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Read failed",
    });
  }
});

export { router as echolayoutDesignsRouter };
export default router;
