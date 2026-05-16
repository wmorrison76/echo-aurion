/**
 * EchoStratus Analytics API Routes
 * 
 * Advanced analytics and export endpoints
 * 
 * All text is i18n-ready
 */

import express, { Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/auth-jwt.js';
import { exportService } from '../services/echostratus/export-service.js';
import { decisionRegistryService } from '../services/echostratus/decision-registry.js';
import { outcomeMeasurementService } from '../services/echostratus/outcome-measurement-service.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/stratus/analytics
 * Get analytics data
 */
router.get('/analytics', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.orgId;
    const { type, metric, range } = req.query;

    // Get decisions for time series
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const to = new Date();

    const decisions = await decisionRegistryService.getDecisions(tenantId, {
      from,
      to,
    });

    // Generate time series data
    const timeSeries: Array<{ date: string; value: number; label: string }> = [];
    const dailyData: Record<string, number> = {};

    for (const decision of decisions) {
      const date = new Date(decision.created_at).toISOString().split('T')[0];
      dailyData[date] = (dailyData[date] || 0) + 1;
    }

    for (const [date, value] of Object.entries(dailyData)) {
      timeSeries.push({
        date,
        value,
        label: `${value} decisions`,
      });
    }

    // Get cohort data (simplified)
    const cohorts = [
      { cohort: 'Week 1', value: 10 },
      { cohort: 'Week 2', value: 15 },
      { cohort: 'Week 3', value: 12 },
    ];

    res.json({
      success: true,
      timeSeries,
      cohorts,
      dimensions: {
        total: decisions.length,
        wins: decisions.filter((d) => d.outcome?.status === 'win').length,
        losses: decisions.filter((d) => d.outcome?.status === 'loss').length,
      },
    });
  } catch (error: any) {
    logger.error('[Stratus] Get analytics error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get analytics',
    });
  }
});

/**
 * POST /api/stratus/analytics/export
 * Export analytics report
 */
router.post('/analytics/export', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.orgId;
    const { type, metric, range, format } = req.query;

    const config = {
      type: (type as string) || 'analytics',
      format: (format as 'pdf' | 'excel') || 'pdf',
      filters: {
        metric,
        range,
      },
    };

    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    if (format === 'pdf') {
      buffer = await exportService.generatePDF(config, tenantId);
      contentType = 'application/pdf';
      filename = `stratus-analytics-${Date.now()}.pdf`;
    } else {
      buffer = await exportService.generateExcel(config, tenantId);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `stratus-analytics-${Date.now()}.xlsx`;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error: any) {
    logger.error('[Stratus] Export error:', error);
    res.status(500).json({
      error: error.message || 'Failed to export report',
    });
  }
});

export default router;
