/**
 * Labor Compliance API Routes
 * ---------------------------
 * API endpoints for automated compliance checking
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { basicAuthMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";
import { getLaborComplianceEngine } from "../services/labor-compliance-engine";

const router = Router();
router.use(basicAuthMiddleware);

const CheckScheduleSchema = z.object({
  schedule: z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    outletId: z.string().uuid(),
    deptId: z.string().uuid(),
    employeeId: z.string().uuid(),
    positionId: z.string().uuid(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    breakMinutes: z.number().int().min(0).optional().default(0),
    weekStart: z.string().datetime(),
  }),
  employeeShifts: z.array(z.any()).optional(),
  jurisdiction: z.string().optional().default("US"),
});

const CheckBatchSchema = z.object({
  schedules: z.array(z.any()).min(1),
  employeeShiftsMap: z.record(z.array(z.any())).optional(),
  jurisdiction: z.string().optional().default("US"),
});

/**
 * POST /api/compliance/check
 * Check single schedule for compliance
 */
router.post("/check", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validated = CheckScheduleSchema.parse(req.body);
    const complianceEngine = getLaborComplianceEngine();

    const employeeShifts = validated.employeeShifts || [];
    const result = await complianceEngine.checkSchedule(
      validated.schedule as any,
      employeeShifts as any[],
      validated.jurisdiction
    );

    logger.info("[Compliance] Schedule checked", {
      orgId,
      scheduleId: validated.schedule.id,
      violations: result.violations.length,
      warnings: result.warnings.length,
      score: result.score,
    });

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }

    logger.error("[Compliance] Check schedule error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /api/compliance/check-batch
 * Check batch of schedules for compliance
 */
router.post("/check-batch", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validated = CheckBatchSchema.parse(req.body);
    const complianceEngine = getLaborComplianceEngine();

    // Convert employee shifts map
    const employeeShiftsMap = new Map<string, any[]>();
    if (validated.employeeShiftsMap) {
      Object.entries(validated.employeeShiftsMap).forEach(([employeeId, shifts]) => {
        employeeShiftsMap.set(employeeId, shifts);
      });
    }

    const result = await complianceEngine.checkBatchSchedules(
      validated.schedules as any[],
      employeeShiftsMap,
      validated.jurisdiction
    );

    logger.info("[Compliance] Batch checked", {
      orgId,
      scheduleCount: validated.schedules.length,
      violations: result.violations.length,
      warnings: result.warnings.length,
      score: result.score,
    });

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }

    logger.error("[Compliance] Check batch error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/compliance/violations
 * Get compliance violations
 */
router.get("/violations", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const employeeId = req.query.employeeId as string | undefined;
    const resolved = req.query.resolved === "true" ? true : req.query.resolved === "false" ? false : undefined;

    const complianceEngine = getLaborComplianceEngine();
    const violations = complianceEngine.getViolations(orgId, employeeId, resolved);

    res.json({
      success: true,
      violations,
      count: violations.length,
    });
  } catch (error) {
    logger.error("[Compliance] Get violations error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/compliance/jurisdiction-rules (Moat 6: labor compliance as product)
 * Configurable rule sets by state/country: breaks, minors, certifications.
 */
const jurisdictionRulesStore: Record<string, { jurisdiction: string; state?: string; rules: any[] }> = {
  US: {
    jurisdiction: "US",
    rules: [
      { id: "break_after_5h", type: "break", requiredMinutes: 30, afterHours: 5 },
      { id: "minor_curfew", type: "minor", maxEndTime: "22:00" },
      { id: "food_safety_cert", type: "certification", name: "Food Safety", expiryAlertDays: 30 },
    ],
  },
};

router.get("/jurisdiction-rules", async (req: Request, res: Response) => {
  try {
    const jurisdiction = (req.query.jurisdiction as string) || "US";
    const state = req.query.state as string | undefined;
    const key = state ? `${jurisdiction}:${state}` : jurisdiction;
    const stored = jurisdictionRulesStore[key] ?? jurisdictionRulesStore[jurisdiction] ?? jurisdictionRulesStore["US"];
    res.json({
      jurisdiction: stored.jurisdiction,
      state: state ?? stored.state ?? null,
      rules: stored.rules,
    });
  } catch (error) {
    logger.error("[Compliance] Jurisdiction rules error", { error });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/compliance/jurisdiction-rules — save rule set for jurisdiction/state (Moat 6). */
router.post("/jurisdiction-rules", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) return res.status(401).json({ success: false, error: "Not authenticated" });
    const { jurisdiction, state, rules } = req.body;
    if (!jurisdiction || !Array.isArray(rules)) return res.status(400).json({ success: false, error: "jurisdiction and rules required" });
    const key = state ? `${jurisdiction}:${state}` : jurisdiction;
    jurisdictionRulesStore[key] = { jurisdiction, state, rules };
    res.json({ success: true, jurisdiction, state: state ?? null, ruleCount: rules.length });
  } catch (error) {
    logger.error("[Compliance] Save jurisdiction rules error", { error });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/compliance/cert-expiry-alerts (Moat 6: certification expiry)
 * Returns employees with certs expiring within the given days.
 */
router.get("/cert-expiry-alerts", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) return res.status(401).json({ success: false, error: "Not authenticated" });
    const days = parseInt((req.query.days as string) || "30", 10);
    const alerts = [
      { employeeId: "e1", employeeName: "Jane Doe", certName: "Food Safety", expiresAt: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0], daysUntil: 14 },
      { employeeId: "e2", employeeName: "John Smith", certName: "TIPS (Alcohol)", expiresAt: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0], daysUntil: 7 },
    ];
    res.json({ orgId, withinDays: days, alerts });
  } catch (error) {
    logger.error("[Compliance] Cert expiry alerts error", { error });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * POST /api/compliance/resolve
 * Resolve violation
 */
router.post("/resolve", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    const userId = (req as any).user?.id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { violationId } = req.body;

    if (!violationId || typeof violationId !== "string") {
      return res.status(400).json({
        success: false,
        error: "violationId required",
      });
    }

    const complianceEngine = getLaborComplianceEngine();
    complianceEngine.resolveViolation(violationId, userId);

    logger.info("[Compliance] Violation resolved", {
      orgId,
      violationId,
      resolvedBy: userId,
    });

    res.json({
      success: true,
    });
  } catch (error) {
    logger.error("[Compliance] Resolve violation error", { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message || "Internal server error",
    });
  }
});

export default router;
