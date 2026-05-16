/**
 * Fast-path recipe creation
 * Minimal required fields; saves draft immediately; later prompts for yield/nutrition/allergen.
 * Echo teaching overlay optionally guides. Trace emitted on create.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { getOrgContext } from "../lib/org-context";
import { logger } from "../lib/logger";
import { emitTrace } from "../lib/trace-emitter";

const router = Router();
const DraftSchema = z.object({
  name: z.string().min(1),
  orgId: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/recipes/draft
 * Create recipe draft (minimal required: name); emit trace.
 */
router.post("/draft", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    const orgId = orgContext.orgId;
    const parsed = DraftSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation error", details: parsed.error.errors });
    }
    const { name, notes } = parsed.data;
    const draftId = `recipe-draft-${orgId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const traceId = `recipe-draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    await emitTrace(
      req as any,
      "recipe",
      draftId,
      "recipe-draft",
      "recipe",
      { name, notes, orgId },
      { draftId, status: "draft" },
      { traceId, sourceRef: "fast-path-recipe" }
    );

    logger.info("[RecipeDraft] Draft created", { draftId, name, orgId });
    res.status(201).json({
      success: true,
      draftId,
      traceId,
      name,
      status: "draft",
      message: "Draft saved; add yield/nutrition/allergen later.",
    });
  } catch (error) {
    logger.error("[RecipeDraft] Error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Failed to create draft" });
  }
});

/**
 * GET /api/recipes/drafts
 * List recipe drafts for org (stub: returns in-memory or from trace ledger filter).
 */
router.get("/drafts", async (req: Request, res: Response) => {
  try {
    const orgContext = getOrgContext(req);
    res.json({ success: true, drafts: [], message: "Wire to recipe store or trace ledger filter." });
  } catch (error) {
    res.status(500).json({ error: "Failed to list drafts" });
  }
});

export const recipeDraftRouter = router;
