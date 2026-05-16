/**
 * Enhanced Forecasting API Routes
 * --------------------------------
 * API endpoints for enhanced demand forecasting
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { basicAuthMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";
import { getEnhancedForecastingService } from "../services/enhanced-forecasting-service";

const router = Router();
router.use(basicAuthMiddleware);

const ForecastRequestSchema = z.object({
  orgId: z.string().uuid(),
  outletId: z.string().uuid().optional(),
  deptId: z.string().uuid().optional(),
  startDate: z.string(),
  horizonDays: z.number().int().min(1).max(90).optional().default(7),
  includeConfidence: z.boolean().optional().default(false),
  externalFactors: z
    .object({
      weather: z.boolean().optional(),
      events: z.boolean().optional(),
      holidays: z.boolean().optional(),
    })
    .optional(),
});

const TrackAccuracySchema = z.object({
  forecastId: z.string(),
  actualData: z.array(
    z.object({
      date: z.string(),
      value: z.number(),
    })
  ),
});

/**
 * POST /api/forecasting/generate
 * Generate enhanced forecast
 */
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validated = ForecastRequestSchema.parse({
      ...req.body,
      orgId: req.body.orgId || orgId,
    });

    const forecastingService = getEnhancedForecastingService();
    const result = await forecastingService.generateForecast(validated);

    logger.info("[Forecast] Forecast generated", {
      orgId: validated.orgId,
      horizonDays: validated.horizonDays,
      confidence: result.confidence,
      factors: result.factors,
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

    logger.error("[Forecast] Generate error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /api/forecasting/track-accuracy
 * Track forecast accuracy
 */
router.post("/track-accuracy", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validated = TrackAccuracySchema.parse(req.body);
    const forecastingService = getEnhancedForecastingService();

    const accuracy = await forecastingService.trackAccuracy(
      validated.forecastId,
      validated.actualData
    );

    logger.info("[Forecast] Accuracy tracked", {
      forecastId: validated.forecastId,
      accuracy: accuracy.accuracy,
      mae: accuracy.mae,
      mape: accuracy.mape,
    });

    res.json({
      success: true,
      accuracy,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }

    logger.error("[Forecast] Track accuracy error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default router;
