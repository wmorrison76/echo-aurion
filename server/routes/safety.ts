/**
 * Safety API: Safe Mode, kill switch
 * RBAC gated; all toggles emit trace (who, why).
 */

import { Router, Request, Response } from "express";
import { emitTrace } from "../lib/trace-emitter";
import { logger } from "../lib/logger";

const router = Router();

router.post("/safe-mode", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id ?? "anonymous";
    const orgId = (req as any).user?.org_id ?? (req as any).organization?.id ?? "default";
    const { enabled, reason } = req.body || {};
    const traceId = `safe-mode-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await emitTrace(req as any, "safety", traceId, "safety-controls", "safety", { action: "safe_mode", enabled, reason, userId }, { enabled }, { traceId });
    logger.info("[Safety] Safe mode toggled", { userId, enabled, reason });
    res.json({ enabled: !!enabled, traceId });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post("/kill-switch", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id ?? "anonymous";
    const { enabled, reason } = req.body || {};
    const traceId = `kill-switch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await emitTrace(req as any, "safety", traceId, "safety-controls", "safety", { action: "kill_switch", enabled, reason, userId }, { enabled }, { traceId });
    logger.info("[Safety] Kill switch toggled", { userId, enabled, reason });
    res.json({ enabled: !!enabled, traceId });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export const safetyRouter = router;
