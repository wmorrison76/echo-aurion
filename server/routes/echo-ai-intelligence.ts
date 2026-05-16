/**
 * EchoAI³ Intelligence API Routes
 * -------------------------------
 * API endpoints for EchoAI³ cross-domain intelligence, learning, and predictive analytics
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { basicAuthMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";
import { getCrossDomainEngine } from "../../client/modules/Culinary/client/echo/intelligence/cross-domain-engine";
import { getRealTimeLearningSystem } from "../../client/modules/Culinary/client/echo/learning/real-time-learning";
import { getPredictiveAnalyticsEngine } from "../../client/modules/Culinary/client/echo/predictive/predictive-analytics-engine";

const router = Router();
router.use(basicAuthMiddleware);

const CrossDomainQuerySchema = z.object({
  query: z.string().min(1),
  domains: z.array(z.string()).optional(),
  context: z.record(z.any()).optional(),
});

const PredictionRequestSchema = z.object({
  type: z.enum(["demand", "inventory", "financial", "labor"]),
  parameters: z.record(z.any()),
  horizonDays: z.number().int().min(1).max(90).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const UserActionSchema = z.object({
  userId: z.string(),
  module: z.string(),
  actionType: z.string(),
  action: z.record(z.any()),
  context: z.record(z.any()).optional(),
});

const ActionOutcomeSchema = z.object({
  actionId: z.string(),
  success: z.boolean(),
  outcome: z.record(z.any()),
  metrics: z
    .object({
      accuracy: z.number().optional(),
      cost: z.number().optional(),
      time: z.number().optional(),
      satisfaction: z.number().optional(),
    })
    .optional(),
});

/**
 * POST /api/echo-ai/cross-domain/query
 * Execute cross-domain query
 */
router.post("/cross-domain/query", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validated = CrossDomainQuerySchema.parse(req.body);
    const crossDomainEngine = getCrossDomainEngine();

    const response = await crossDomainEngine.executeQuery({
      query: validated.query,
      domains: validated.domains || [],
      context: validated.context || {},
    });

    logger.info("[EchoAI³] Cross-domain query executed", {
      orgId,
      query: validated.query,
      domains: response.domains,
      confidence: response.confidence,
    });

    res.json({
      success: true,
      response,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }

    logger.error("[EchoAI³] Cross-domain query error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /api/echo-ai/learning/track-action
 * Track user action for learning
 */
router.post("/learning/track-action", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validated = UserActionSchema.parse(req.body);
    const learningSystem = getRealTimeLearningSystem();

    const action = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...validated,
      orgId,
      timestamp: new Date().toISOString(),
    };

    await learningSystem.trackAction(action);

    logger.info("[EchoAI³] Action tracked", {
      orgId,
      userId: validated.userId,
      module: validated.module,
      actionType: validated.actionType,
    });

    res.json({
      success: true,
      actionId: action.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }

    logger.error("[EchoAI³] Track action error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /api/echo-ai/learning/record-outcome
 * Record action outcome for learning
 */
router.post("/learning/record-outcome", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validated = ActionOutcomeSchema.parse(req.body);
    const learningSystem = getRealTimeLearningSystem();

    const outcome = {
      ...validated,
      timestamp: new Date().toISOString(),
    };

    await learningSystem.recordOutcome(outcome);

    logger.info("[EchoAI³] Outcome recorded", {
      orgId,
      actionId: validated.actionId,
      success: validated.success,
    });

    res.json({
      success: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }

    logger.error("[EchoAI³] Record outcome error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/echo-ai/learning/stats
 * Get learning statistics
 */
router.get("/learning/stats", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const learningSystem = getRealTimeLearningSystem();
    const stats = learningSystem.getLearningStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error("[EchoAI³] Learning stats error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /api/echo-ai/predictive/predict
 * Generate prediction
 */
router.post("/predictive/predict", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validated = PredictionRequestSchema.parse(req.body);
    const predictiveEngine = getPredictiveAnalyticsEngine();

    const result = await predictiveEngine.predict(validated);

    logger.info("[EchoAI³] Prediction generated", {
      orgId,
      type: validated.type,
      confidence: result.confidence,
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

    logger.error("[EchoAI³] Prediction error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/echo-ai/predictive/alerts
 * Get active alerts
 */
router.get("/predictive/alerts", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const severity = req.query.severity as string | undefined;
    const predictiveEngine = getPredictiveAnalyticsEngine();

    const alerts = predictiveEngine.getAlerts(
      severity as "low" | "medium" | "high" | "critical" | undefined
    );

    res.json({
      success: true,
      alerts,
    });
  } catch (error) {
    logger.error("[EchoAI³] Get alerts error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * DELETE /api/echo-ai/predictive/alerts
 * Clear alerts
 */
router.delete("/predictive/alerts", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const alertIds = req.body.alertIds as string[] | undefined;
    const predictiveEngine = getPredictiveAnalyticsEngine();

    predictiveEngine.clearAlerts(alertIds);

    logger.info("[EchoAI³] Alerts cleared", {
      orgId,
      alertIds,
    });

    res.json({
      success: true,
    });
  } catch (error) {
    logger.error("[EchoAI³] Clear alerts error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default router;
