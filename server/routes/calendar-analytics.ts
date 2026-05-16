/**
 * Calendar Analytics REST API
 * Endpoints for revenue tracking, KPI dashboards, and forecasting
 */

import { Router, Request, Response } from "express";
import { CalendarAnalyticsEngine } from "../services/analytics-engine";
import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";

const router = Router();
const db = new Database();
const analyticsEngine = new CalendarAnalyticsEngine(db);

// =====================================================
// ANALYTICS ENDPOINTS
// =====================================================

/**
 * GET /api/calendar/analytics/daily
 * Get daily analytics for a date range
 *
 * Query params:
 * - startDate: ISO date (required)
 * - endDate: ISO date (required)
 * - outletId: UUID (optional)
 */
router.get("/daily", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, outletId } = req.query;
    const orgId = res.locals.orgId;
    const userId = res.locals.userId;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "startDate and endDate are required",
      });
    }

    logger.info("[Analytics] Get daily analytics", {
      userId,
      orgId,
      startDate,
      endDate,
      outletId,
    });

    const analytics = await analyticsEngine.getAnalyticsRange(
      orgId,
      startDate as string,
      endDate as string,
      outletId as string | undefined,
    );

    return res.json({
      success: true,
      data: analytics,
      count: analytics.length,
    });
  } catch (error) {
    logger.error("[Analytics] Error fetching daily analytics:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch analytics",
    });
  }
});

/**
 * GET /api/calendar/analytics/revenue
 * Get revenue metrics
 *
 * Query params:
 * - startDate: ISO date (required)
 * - endDate: ISO date (required)
 */
router.get("/revenue", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, outletId } = req.query;
    const orgId = res.locals.orgId;

    const analytics = await analyticsEngine.getAnalyticsRange(
      orgId,
      startDate as string,
      endDate as string,
      outletId as string | undefined,
    );

    const totalRevenue = analytics.reduce(
      (sum, a) => sum + (a.totalRevenue || 0),
      0,
    );
    const avgRevenue =
      analytics.length > 0 ? totalRevenue / analytics.length : 0;
    const maxRevenue =
      analytics.length > 0
        ? Math.max(...analytics.map((a) => a.totalRevenue || 0))
        : 0;

    return res.json({
      success: true,
      data: {
        totalRevenue,
        avgRevenue,
        maxRevenue,
        daysAnalyzed: analytics.length,
        details: analytics,
      },
    });
  } catch (error) {
    logger.error("[Analytics] Error fetching revenue:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch revenue data",
    });
  }
});

/**
 * GET /api/calendar/analytics/capacity
 * Get capacity utilization metrics
 *
 * Query params:
 * - startDate: ISO date (required)
 * - endDate: ISO date (required)
 */
router.get("/capacity", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const orgId = res.locals.orgId;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "startDate and endDate are required",
      });
    }

    const capacity = await analyticsEngine.getCapacityUtilization(
      orgId,
      startDate as string,
      endDate as string,
    );

    return res.json({
      success: true,
      data: capacity,
    });
  } catch (error) {
    logger.error("[Analytics] Error fetching capacity:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch capacity data",
    });
  }
});

/**
 * GET /api/calendar/analytics/forecast/revenue
 * Get revenue forecast
 *
 * Query params:
 * - daysAhead: number (default: 30, max: 365)
 * - outletId: UUID (optional)
 */
router.get("/forecast/revenue", async (req: Request, res: Response) => {
  try {
    const { daysAhead, outletId } = req.query;
    const orgId = res.locals.orgId;

    const days = Math.min(parseInt(daysAhead as string) || 30, 365);

    const forecast = await analyticsEngine.forecastRevenue(
      orgId,
      days,
      outletId as string | undefined,
    );

    return res.json({
      success: true,
      data: {
        forecastDays: days,
        forecast,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("[Analytics] Error generating forecast:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate forecast",
    });
  }
});

/**
 * GET /api/calendar/analytics/kpis
 * Get KPI metrics
 *
 * Query params:
 * - startDate: ISO date (required)
 * - endDate: ISO date (required)
 */
router.get("/kpis", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const orgId = res.locals.orgId;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "startDate and endDate are required",
      });
    }

    const kpis = await analyticsEngine.calculateKPIs(
      orgId,
      startDate as string,
      endDate as string,
    );

    const summary = {
      totalKPIs: kpis.length,
      onTrack: kpis.filter((k) => k.status === "on-track").length,
      warning: kpis.filter((k) => k.status === "warning").length,
      critical: kpis.filter((k) => k.status === "critical").length,
      exceeded: kpis.filter((k) => k.status === "exceeded").length,
    };

    return res.json({
      success: true,
      data: { kpis, summary },
    });
  } catch (error) {
    logger.error("[Analytics] Error fetching KPIs:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch KPI data",
    });
  }
});

/**
 * GET /api/calendar/analytics/top-performers
 * Get top performing outlets
 *
 * Query params:
 * - limit: number (default: 5, max: 20)
 * - metric: 'revenue' | 'events' (default: 'revenue')
 */
router.get("/top-performers", async (req: Request, res: Response) => {
  try {
    const { limit = "5" } = req.query;
    const orgId = res.locals.orgId;

    const performers = await analyticsEngine.getTopPerformers(
      orgId,
      Math.min(parseInt(limit as string) || 5, 20),
    );

    return res.json({
      success: true,
      data: performers,
      count: performers.length,
    });
  } catch (error) {
    logger.error("[Analytics] Error fetching top performers:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch top performers",
    });
  }
});

/**
 * POST /api/calendar/analytics/kpis
 * Create new KPI
 *
 * Body:
 * {
 *   kpiName: string,
 *   kpiType: 'numeric' | 'percentage' | 'ratio',
 *   targetValue: number,
 *   warningThreshold: number,
 *   criticalThreshold: number,
 *   periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
 *   periodStart: ISO date,
 *   periodEnd: ISO date,
 *   description?: string,
 *   owner?: string
 * }
 */
router.post("/kpis", async (req: Request, res: Response) => {
  try {
    const {
      kpiName,
      kpiType,
      targetValue,
      warningThreshold,
      criticalThreshold,
      periodType,
      periodStart,
      periodEnd,
      description,
      owner,
    } = req.body;

    const orgId = res.locals.orgId;
    const userId = res.locals.userId;

    if (
      !kpiName ||
      !kpiType ||
      !targetValue ||
      !periodType ||
      !periodStart ||
      !periodEnd
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const result = await db.query(
      `
      INSERT INTO calendar_kpis (
        org_id, "kpiName", "kpiType", "targetValue",
        "warningThreshold", "criticalThreshold", "periodType",
        period_start, period_end, description, owner
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
      `,
      [
        orgId,
        kpiName,
        kpiType,
        targetValue,
        warningThreshold,
        criticalThreshold,
        periodType,
        periodStart,
        periodEnd,
        description,
        owner || userId,
      ],
    );

    logger.info("[Analytics] Created new KPI", {
      userId,
      orgId,
      kpiName,
    });

    return res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error("[Analytics] Error creating KPI:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create KPI",
    });
  }
});

/**
 * PATCH /api/calendar/analytics/kpis/:kpiId
 * Update KPI
 */
router.patch("/kpis/:kpiId", async (req: Request, res: Response) => {
  try {
    const { kpiId } = req.params;
    const { targetValue, warningThreshold, criticalThreshold, isActive } =
      req.body;
    const orgId = res.locals.orgId;

    const updates: string[] = [];
    const params: any[] = [kpiId, orgId];

    if (targetValue !== undefined) {
      updates.push(`"targetValue" = $${params.length + 1}`);
      params.push(targetValue);
    }
    if (warningThreshold !== undefined) {
      updates.push(`"warningThreshold" = $${params.length + 1}`);
      params.push(warningThreshold);
    }
    if (criticalThreshold !== undefined) {
      updates.push(`"criticalThreshold" = $${params.length + 1}`);
      params.push(criticalThreshold);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${params.length + 1}`);
      params.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No fields to update",
      });
    }

    const result = await db.query(
      `
      UPDATE calendar_kpis
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $1 AND org_id = $2
      RETURNING *
      `,
      params,
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "KPI not found",
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error("[Analytics] Error updating KPI:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update KPI",
    });
  }
});

/**
 * DELETE /api/calendar/analytics/kpis/:kpiId
 * Delete KPI
 */
router.delete("/kpis/:kpiId", async (req: Request, res: Response) => {
  try {
    const { kpiId } = req.params;
    const orgId = res.locals.orgId;

    const result = await db.query(
      `
      DELETE FROM calendar_kpis
      WHERE id = $1 AND org_id = $2
      RETURNING id
      `,
      [kpiId, orgId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "KPI not found",
      });
    }

    logger.info("[Analytics] Deleted KPI", {
      orgId,
      kpiId,
    });

    return res.status(204).send();
  } catch (error) {
    logger.error("[Analytics] Error deleting KPI:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete KPI",
    });
  }
});

export default router;
