/**
 * ML Forecasting Accuracy API Routes
 * 
 * Provides endpoints for:
 * - Historical accuracy analysis
 * - Forecast vs actual comparison
 * - Model performance tracking
 * - Accuracy metrics over time
 */

import { Router, Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/auth-jwt.js';
import { mlLaborForecasting } from '../services/ml-labor-forecasting.js';
import { prophetForecastingService } from '../services/prophet-forecasting-service.js';
import { logger } from '../lib/logger.js';

const router = Router();

/**
 * GET /api/ml-forecasting/accuracy
 * Get overall forecast accuracy metrics
 */
router.get('/accuracy', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId || req.query.orgId as string;
    const daysBack = parseInt(req.query.daysBack as string) || 30;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const accuracy = await mlLaborForecasting.getForecastAccuracy(orgId, daysBack);

    res.json({
      success: true,
      data: accuracy,
    });
  } catch (error: any) {
    logger.error('[MLForecasting] Error getting accuracy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ml-forecasting/historical-analysis
 * Analyze historical forecast accuracy with detailed metrics
 */
router.get('/historical-analysis', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId || req.query.orgId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const analysis = await mlLaborForecasting.analyzeHistoricalAccuracy(
      orgId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    logger.error('[MLForecasting] Error analyzing historical accuracy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ml-forecasting/comparison
 * Get forecast vs actual comparison for recent forecasts
 */
router.get('/comparison', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId || req.query.orgId as string;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const comparison = await mlLaborForecasting.getHistoricalComparison(orgId, limit);

    res.json({
      success: true,
      data: comparison,
      count: comparison.length,
    });
  } catch (error: any) {
    logger.error('[MLForecasting] Error getting comparison:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ml-forecasting/evaluate-prophet
 * Evaluate Prophet model accuracy with actual data
 */
router.post('/evaluate-prophet', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { modelId, actuals } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !modelId || !actuals || !Array.isArray(actuals)) {
      return res.status(400).json({
        success: false,
        error: 'orgId, modelId, and actuals array required',
      });
    }

    // Get forecasts for the same period
    const { data: forecasts } = await (await import('../lib/supabase.js')).supabase
      .from('prophet_forecasts')
      .select('*')
      .eq('org_id', orgId)
      .in('forecast_date', actuals.map((a: any) => a.date))
      .order('forecast_date', { ascending: true });

    if (!forecasts || forecasts.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No forecasts found for the specified period',
      });
    }

    const prophetForecasts = forecasts.map((f: any) => ({
      id: f.id,
      metricType: f.metric_type,
      forecastDate: f.forecast_date,
      predictedValue: f.predicted_value,
      lowerBound: f.lower_bound,
      upperBound: f.upper_bound,
      confidence: f.confidence,
      seasonality: f.seasonality,
      trend: f.trend,
      metadata: f.metadata,
      createdAt: f.created_at,
    }));

    const accuracy = await prophetForecastingService.evaluateAccuracy(
      modelId,
      actuals,
      prophetForecasts
    );

    res.json({
      success: true,
      data: accuracy,
    });
  } catch (error: any) {
    logger.error('[MLForecasting] Error evaluating Prophet model:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ml-forecasting/generate
 * Generate ML (Prophet) forecast with optional events and weather
 * Best-in-class: method=prophet, events[], weatherFactor
 */
router.post('/generate', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId || req.body.orgId;
    const {
      metricType = 'revenue',
      forecastPeriods = 30,
      startDate: reqStart,
      endDate: reqEnd,
      events = [],
      weatherFactor,
    } = req.body;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const endDate = reqEnd || new Date().toISOString().split('T')[0];
    const startDate = reqStart || (() => {
      const d = new Date(endDate);
      d.setDate(d.getDate() - 90);
      return d.toISOString().split('T')[0];
    })();

    const historicalData = await prophetForecastingService.getHistoricalData(
      orgId,
      metricType,
      startDate,
      endDate
    );

    if (historicalData.length < 30) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient historical data (minimum 30 points). Use rule-based forecast or add more data.',
      });
    }

    const config: { holidays?: Array<{ name: string; dates: string[] }> } = {};
    if (Array.isArray(events) && events.length > 0) {
      config.holidays = events.map((e: { name?: string; date?: string }) => ({
        name: e.name || 'event',
        dates: [e.date].filter(Boolean),
      }));
    }

    const forecasts = await prophetForecastingService.generateForecast(
      orgId,
      metricType,
      historicalData,
      forecastPeriods,
      config
    );

    const result = forecasts.map((f) => ({
      date: f.forecastDate,
      predicted: f.predictedValue,
      lower: f.lowerBound,
      upper: f.upperBound,
      confidence: f.confidence,
      source: 'prophet',
    }));

    if (typeof weatherFactor === 'number' && weatherFactor !== 1) {
      result.forEach((r) => {
        r.predicted *= weatherFactor;
        r.lower *= weatherFactor;
        r.upper *= weatherFactor;
      });
    }

    res.json({
      success: true,
      data: result,
      meta: {
        metricType,
        periods: forecastPeriods,
        eventsUsed: events?.length ?? 0,
        weatherFactor: weatherFactor ?? null,
      },
    });
  } catch (error: any) {
    logger.error('[MLForecasting] Error generating forecast:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ml-forecasting/historical-data
 * Get historical data for forecasting training
 */
router.get('/historical-data', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId || req.query.orgId as string;
    const metricType = req.query.metricType as 'labor_hours' | 'guest_count' | 'revenue' | 'cost';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (!orgId || !metricType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'orgId, metricType, startDate, and endDate required',
      });
    }

    const historicalData = await prophetForecastingService.getHistoricalData(
      orgId,
      metricType,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: historicalData,
      count: historicalData.length,
    });
  } catch (error: any) {
    logger.error('[MLForecasting] Error getting historical data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
