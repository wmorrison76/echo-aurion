import express from "express";
import { z } from "zod";
import { deriveInventoryImplications, getDemandDeltasByTraceId } from "../services/inventory-implications-service";
import { getOrgContext } from "../lib/org-resolver";

const router = express.Router();

const deriveImplicationsSchema = z.object({
  orgId: z.string().min(1),
  traceId: z.string().min(1),
});

router.post("/inventory-implications/derive", async (req, res) => {
  try {
    const payload = deriveImplicationsSchema.parse(req.body);
    const orgContext = getOrgContext(req);

    // Get demand deltas by traceId
    const deltas = await getDemandDeltasByTraceId(payload.orgId, payload.traceId);

    if (deltas.length === 0) {
      return res.json({
        success: true,
        message: "No demand deltas found for this traceId",
        implications: [],
      });
    }

    // Derive inventory implications
    const implications = await deriveInventoryImplications(
      payload.orgId,
      payload.traceId,
      deltas,
      {
        userId: orgContext.userId,
        role: orgContext.userRole,
        system: "inventory-engine",
      },
    );

    res.json({
      success: true,
      traceId: payload.traceId,
      deltas: deltas.length,
      implications,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to derive implications";
    res.status(400).json({ success: false, error: message });
  }
});

export default router;
