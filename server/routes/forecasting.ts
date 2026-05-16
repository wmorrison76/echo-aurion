/**
 * Unified Forecasting API Routes
 */

import { Router } from 'express';
import { forecastService } from '../services/forecasting/forecast-service';
import { z } from 'zod';

const router = Router();

// Validation schemas
const generateForecastSchema = z.object({
  type: z.enum(['revenue', 'demand', 'labor', 'inventory', 'cost']),
  startDate: z.string(),
  endDate: z.string(),
  config: z.object({
    method: z.enum(['moving_average', 'exponential_smoothing', 'linear_regression', 'prophet', 'ensemble']).optional(),
    granularity: z.enum(['hour', 'day', 'week', 'month']).optional(),
    horizon: z.number().optional(),
    historicalDataDays: z.number().optional()
  }).optional()
});

/**
 * POST /api/forecasting/generate
 * Generate a new forecast
 */
router.post('/generate', async (req, res) => {
  try {
    const { type, startDate, endDate, config } = generateForecastSchema.parse(req.body);
    const orgId = req.user!.orgId;
    
    const forecast = await forecastService.generateForecast(
      orgId,
      type,
      startDate,
      endDate,
      config
    );
    
    res.json(forecast);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/forecasting/:id
 * Get forecast by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const forecast = await forecastService.getForecast(req.params.id);
    
    if (!forecast) {
      return res.status(404).json({ error: 'Forecast not found' });
    }
    
    res.json(forecast);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/forecasting
 * List forecasts for organization
 */
router.get('/', async (req, res) => {
  try {
    const orgId = req.user!.orgId;
    const type = req.query.type as string | undefined;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const forecasts = await forecastService.listForecasts(orgId, type, limit);
    
    res.json(forecasts);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/forecasting/:id
 * Delete forecast
 */
router.delete('/:id', async (req, res) => {
  try {
    await forecastService.deleteForecast(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
