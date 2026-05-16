/**
 * AI Forecasting API Routes
 * =========================
 * 
 * REST API for the AI Forecasting Engine
 * Provides demand forecasting, order scheduling, and stock alerts
 * 
 * Endpoints:
 * - GET /api/forecasting/ingredient/:id - Forecast single ingredient
 * - GET /api/forecasting/all - Forecast all ingredients
 * - GET /api/forecasting/order-schedule - Get optimized order schedule
 * - GET /api/forecasting/alerts - Get stock alerts by urgency
 * - POST /api/forecasting/events - Add event for forecasting
 * - POST /api/forecasting/weather - Add weather data
 * - POST /api/forecasting/import - Import historical data
 * - GET /api/forecasting/stats - Get engine statistics
 * - GET /api/forecasting/config - Get forecasting configuration
 * - PUT /api/forecasting/config - Update forecasting configuration
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { aiForecastingEngine } from '../services/ai-forecasting-engine.js';
import { getOrgId } from '../lib/org-resolver.js';
import { logger } from '../lib/logger.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const eventSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(['banquet', 'private_event', 'holiday', 'conference', 'wedding', 'regular']),
  date: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  guestCount: z.number().int().min(0),
  outletId: z.string().uuid(),
  menuItems: z.array(z.string()).optional(),
  beoId: z.string().uuid().optional(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).default('confirmed'),
});

const weatherSchema = z.object({
  date: z.string(),
  temperature: z.number(),
  temperatureUnit: z.enum(['F', 'C']),
  condition: z.enum(['sunny', 'cloudy', 'rainy', 'snowy', 'hot', 'cold']),
  humidity: z.number().min(0).max(100).optional(),
  precipitation: z.number().min(0).optional(),
});

const importDataSchema = z.object({
  data: z.array(z.object({
    date: z.string(),
    ingredientId: z.string().uuid(),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    source: z.enum(['production', 'pos', 'waste', 'adjustment']),
    outletId: z.string().uuid(),
    metadata: z.object({
      recipeId: z.string().optional(),
      eventId: z.string().optional(),
      mealPeriod: z.enum(['breakfast', 'lunch', 'dinner', 'late_night']).optional(),
    }).optional(),
  })),
});

const configUpdateSchema = z.object({
  forecastDays: z.number().int().min(1).max(90).optional(),
  historicalWeight: z.number().min(0).max(1).optional(),
  eventWeight: z.number().min(0).max(1).optional(),
  seasonalityWeight: z.number().min(0).max(1).optional(),
  weatherWeight: z.number().min(0).max(1).optional(),
  trendWeight: z.number().min(0).max(1).optional(),
  safetyStockDays: z.number().int().min(0).max(14).optional(),
  safetyStockMultiplier: z.number().min(1).max(3).optional(),
  minOrderValue: z.number().min(0).optional(),
  orderLeadTimeDays: z.number().int().min(0).max(14).optional(),
  preferredOrderDays: z.array(z.number().int().min(0).max(6)).optional(),
  urgentStockoutDays: z.number().int().min(0).max(7).optional(),
  warningStockoutDays: z.number().int().min(0).max(14).optional(),
  enableMLPredictions: z.boolean().optional(),
  enableAnomalyDetection: z.boolean().optional(),
  anomalyThreshold: z.number().min(1).max(5).optional(),
});

// ============================================================================
// FORECASTING ENDPOINTS
// ============================================================================

/**
 * GET /api/forecasting/ingredient/:id
 * Forecast a single ingredient
 */
router.get('/ingredient/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { outletId, days } = req.query;

    if (!outletId) {
      return res.status(400).json({
        success: false,
        error: 'outletId query parameter is required',
      });
    }

    const forecast = await aiForecastingEngine.forecastIngredient(
      id,
      outletId as string,
      days ? parseInt(days as string) : undefined
    );

    return res.json({
      success: true,
      data: forecast,
    });
  } catch (error: any) {
    logger.error('[ForecastingAPI] Ingredient forecast failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/forecasting/all
 * Forecast all ingredients
 */
router.get('/all', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { outletId, days } = req.query;

    const forecasts = await aiForecastingEngine.forecastAllIngredients(
      orgId,
      outletId as string | undefined,
      days ? parseInt(days as string) : undefined
    );

    return res.json({
      success: true,
      data: forecasts,
      total: forecasts.length,
      summary: {
        urgentStockouts: forecasts.filter(f => 
          f.daysUntilStockout !== undefined && f.daysUntilStockout <= 2
        ).length,
        warningStockouts: forecasts.filter(f => 
          f.daysUntilStockout !== undefined && 
          f.daysUntilStockout > 2 && 
          f.daysUntilStockout <= 5
        ).length,
        averageConfidence: forecasts.reduce((sum, f) => sum + f.confidenceScore, 0) / forecasts.length,
      },
    });
  } catch (error: any) {
    logger.error('[ForecastingAPI] All forecasts failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/forecasting/order-schedule
 * Get optimized order schedule
 */
router.get('/order-schedule', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { outletId, days } = req.query;

    if (!outletId) {
      return res.status(400).json({
        success: false,
        error: 'outletId query parameter is required',
      });
    }

    const schedules = await aiForecastingEngine.generateOrderSchedule(
      orgId,
      outletId as string,
      days ? parseInt(days as string) : undefined
    );

    const totalEstimatedSpend = schedules.reduce((sum, s) => sum + s.totalEstimatedCost, 0);
    const urgentOrders = schedules.filter(s => s.priority === 'urgent').length;

    return res.json({
      success: true,
      data: schedules,
      total: schedules.length,
      summary: {
        totalEstimatedSpend,
        urgentOrders,
        nextOrderDate: schedules[0]?.recommendedOrderDate,
      },
    });
  } catch (error: any) {
    logger.error('[ForecastingAPI] Order schedule failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/forecasting/alerts
 * Get stock alerts by urgency level
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { outletId } = req.query;

    const alerts = await aiForecastingEngine.getStockAlerts(
      orgId,
      outletId as string | undefined
    );

    return res.json({
      success: true,
      data: alerts,
      summary: {
        urgent: alerts.urgent.length,
        warning: alerts.warning.length,
        normal: alerts.normal.length,
      },
    });
  } catch (error: any) {
    logger.error('[ForecastingAPI] Get alerts failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// DATA INGESTION ENDPOINTS
// ============================================================================

/**
 * POST /api/forecasting/events
 * Add event for forecasting consideration
 */
router.post('/events', async (req: Request, res: Response) => {
  try {
    const parsed = eventSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    await aiForecastingEngine.addEvent(parsed.data);

    return res.json({ success: true });
  } catch (error: any) {
    logger.error('[ForecastingAPI] Add event failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/forecasting/weather
 * Add weather data
 */
router.post('/weather', async (req: Request, res: Response) => {
  try {
    const { outletId } = req.query;
    
    if (!outletId) {
      return res.status(400).json({
        success: false,
        error: 'outletId query parameter is required',
      });
    }

    const parsed = weatherSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    await aiForecastingEngine.addWeatherData(outletId as string, parsed.data);

    return res.json({ success: true });
  } catch (error: any) {
    logger.error('[ForecastingAPI] Add weather failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/forecasting/import
 * Bulk import historical consumption data
 */
router.post('/import', async (req: Request, res: Response) => {
  try {
    const parsed = importDataSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const imported = await aiForecastingEngine.importHistoricalData(parsed.data.data);

    return res.json({
      success: true,
      imported,
    });
  } catch (error: any) {
    logger.error('[ForecastingAPI] Import failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// CONFIGURATION ENDPOINTS
// ============================================================================

/**
 * GET /api/forecasting/stats
 * Get engine statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = aiForecastingEngine.getStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('[ForecastingAPI] Get stats failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/forecasting/config
 * Get forecasting configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = aiForecastingEngine.getConfig();

    return res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    logger.error('[ForecastingAPI] Get config failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/forecasting/config
 * Update forecasting configuration
 */
router.put('/config', async (req: Request, res: Response) => {
  try {
    const parsed = configUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    aiForecastingEngine.updateConfig(parsed.data);

    return res.json({
      success: true,
      data: aiForecastingEngine.getConfig(),
    });
  } catch (error: any) {
    logger.error('[ForecastingAPI] Update config failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/forecasting/clear-cache
 * Clear forecast cache
 */
router.post('/clear-cache', async (req: Request, res: Response) => {
  try {
    aiForecastingEngine.clearCache();

    return res.json({ success: true });
  } catch (error: any) {
    logger.error('[ForecastingAPI] Clear cache failed', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
