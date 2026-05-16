/**
 * Calendar Analytics Engine
 * Handles revenue calculations, capacity planning, and KPI tracking
 * Supports forecasting with ML models
 */

import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";
import { getCache, CacheKeys } from "../lib/cache-layer";

export interface DailyAnalytics {
  date: string;
  totalEvents: number;
  confirmedEvents: number;
  totalRevenue: number;
  averageRevenuePerEvent: number;
  totalGuests: number;
  averageGuestCount: number;
  capacityUtilization: number;
  conflictCount: number;
  conflictResolutionRate: number;
}

export interface RevenueForecast {
  date: string;
  predictedRevenue: number;
  confidence: number;
  lowerBound: number;
  upperBound: number;
}

export interface KPIMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  variance: number;
  status: "on-track" | "warning" | "critical" | "exceeded";
  trend: "up" | "down" | "stable";
}

/**
 * Analytics Engine
 */
export class CalendarAnalyticsEngine {
  constructor(private db: Database) {}

  /**
   * Calculate daily analytics for an organization
   */
  async calculateDailyAnalytics(
    orgId: string,
    date: string,
  ): Promise<DailyAnalytics | null> {
    const cacheKey = CacheKeys.dailyStats(orgId, date);
    const cached = await getCache().get<DailyAnalytics>(cacheKey);
    if (cached) {
      logger.debug(`[Analytics] Cache hit for daily stats: ${date}`);
      return cached;
    }

    try {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      const result = await this.db.query<DailyAnalytics>(
        `
        SELECT
          DATE($1::DATE) as date,
          COUNT(*) as "totalEvents",
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as "confirmedEvents",
          COALESCE(SUM(revenue), 0)::NUMERIC as "totalRevenue",
          COALESCE(AVG(revenue), 0)::NUMERIC as "averageRevenuePerEvent",
          COALESCE(SUM(guest_count), 0)::INTEGER as "totalGuests",
          COALESCE(AVG(guest_count)::INTEGER, 0) as "averageGuestCount",
          COALESCE(
            (SUM(guest_count)::DECIMAL / NULLIF(
              (SELECT COALESCE(SUM(capacity), 1000)
               FROM calendar_outlets 
               WHERE org_id = $2), 0) * 100
            ), 0
          )::DECIMAL as "capacityUtilization",
          (SELECT COUNT(*) FROM calendar_conflicts 
           WHERE org_id = $2 AND DATE(detected_at) = $1) as "conflictCount",
          COALESCE(
            (SELECT COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) * 100 / 
             NULLIF(COUNT(*), 0)
             FROM calendar_conflicts 
             WHERE org_id = $2 AND DATE(detected_at) = $1), 0
          )::DECIMAL as "conflictResolutionRate"
        FROM calendar_events
        WHERE org_id = $2
          AND DATE(start_time) = $1::DATE
          AND status != 'cancelled'
        `,
        [date, orgId],
      );

      const analytics = result.rows[0];
      if (analytics) {
        await getCache().set(cacheKey, analytics, "stats");
      }

      logger.info(`[Analytics] Calculated daily stats for ${date}`, {
        orgId,
        revenue: analytics?.totalRevenue,
        events: analytics?.totalEvents,
      });

      return analytics || null;
    } catch (error) {
      logger.error("[Analytics] Error calculating daily analytics:", error);
      return null;
    }
  }

  /**
   * Get analytics for date range
   */
  async getAnalyticsRange(
    orgId: string,
    startDate: string,
    endDate: string,
    outletId?: string,
  ): Promise<DailyAnalytics[]> {
    try {
      const query = `
        SELECT
          date_snapshot as date,
          total_events as "totalEvents",
          confirmed_events as "confirmedEvents",
          total_revenue as "totalRevenue",
          average_revenue_per_event as "averageRevenuePerEvent",
          total_guest_count as "totalGuests",
          average_guest_count as "averageGuestCount",
          capacity_utilization_percent as "capacityUtilization",
          total_conflicts as "conflictCount",
          conflict_resolution_rate as "conflictResolutionRate"
        FROM calendar_analytics
        WHERE org_id = $1
          AND date_snapshot >= $2::DATE
          AND date_snapshot <= $3::DATE
          ${outletId ? "AND outlet_id = $4" : ""}
        ORDER BY date_snapshot DESC
      `;

      const params = outletId
        ? [orgId, startDate, endDate, outletId]
        : [orgId, startDate, endDate];

      const result = await this.db.query<DailyAnalytics>(query, params);
      return result.rows;
    } catch (error) {
      logger.error("[Analytics] Error fetching analytics range:", error);
      return [];
    }
  }

  /**
   * Calculate revenue forecast for next N days
   */
  async forecastRevenue(
    orgId: string,
    daysAhead: number = 30,
    outletId?: string,
  ): Promise<RevenueForecast[]> {
    const cacheKey = CacheKeys.orgStats(orgId);
    const cached = await getCache().get<RevenueForecast[]>(cacheKey);
    if (cached) {
      logger.debug(`[Analytics] Cache hit for revenue forecast`);
      return cached;
    }

    try {
      // Get historical data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.db.query<{
        avgRevenue: number;
        stdDev: number;
        minRevenue: number;
        maxRevenue: number;
      }>(
        `
        SELECT
          AVG(total_revenue) as "avgRevenue",
          STDDEV(total_revenue) as "stdDev",
          MIN(total_revenue) as "minRevenue",
          MAX(total_revenue) as "maxRevenue"
        FROM calendar_analytics
        WHERE org_id = $1
          AND date_snapshot >= $2::DATE
          ${outletId ? "AND outlet_id = $3" : ""}
        `,
        outletId
          ? [orgId, thirtyDaysAgo.toISOString().split("T")[0], outletId]
          : [orgId, thirtyDaysAgo.toISOString().split("T")[0]],
      );

      const stats = result.rows[0];
      if (!stats) {
        return [];
      }

      const forecasts: RevenueForecast[] = [];
      const avgRevenue = stats.avgRevenue || 0;
      const stdDev = stats.stdDev || 0;
      const confidence = Math.max(
        50,
        100 - (stdDev / Math.max(avgRevenue, 1)) * 100,
      );

      for (let i = 1; i <= daysAhead; i++) {
        const forecastDate = new Date();
        forecastDate.setDate(forecastDate.getDate() + i);

        forecasts.push({
          date: forecastDate.toISOString().split("T")[0],
          predictedRevenue: Math.max(0, avgRevenue),
          confidence: Math.min(100, confidence),
          lowerBound: Math.max(0, avgRevenue - stdDev),
          upperBound: avgRevenue + stdDev,
        });
      }

      await getCache().set(cacheKey, forecasts, "stats");
      logger.info(`[Analytics] Generated ${daysAhead}-day revenue forecast`, {
        orgId,
        avgRevenue: Math.round(avgRevenue),
      });

      return forecasts;
    } catch (error) {
      logger.error("[Analytics] Error forecasting revenue:", error);
      return [];
    }
  }

  /**
   * Calculate capacity utilization
   */
  async getCapacityUtilization(
    orgId: string,
    startDate: string,
    endDate: string,
  ): Promise<{
    totalCapacity: number;
    usedCapacity: number;
    utilizationPercent: number;
    peakDay?: string;
  }> {
    try {
      const result = await this.db.query<{
        totalCapacity: number;
        usedCapacity: number;
      }>(
        `
        SELECT
          COALESCE(SUM(o.capacity), 1000) as "totalCapacity",
          COALESCE(SUM(e.guest_count), 0) as "usedCapacity"
        FROM calendar_outlets o
        LEFT JOIN calendar_events e ON o.id = e.outlet_id
          AND DATE(e.start_time) >= $2::DATE
          AND DATE(e.start_time) <= $3::DATE
          AND e.status != 'cancelled'
        WHERE o.org_id = $1
        `,
        [orgId, startDate, endDate],
      );

      const data = result.rows[0];
      const totalCapacity = data?.totalCapacity || 1000;
      const usedCapacity = data?.usedCapacity || 0;

      return {
        totalCapacity,
        usedCapacity,
        utilizationPercent: Math.round((usedCapacity / totalCapacity) * 100),
      };
    } catch (error) {
      logger.error("[Analytics] Error calculating capacity:", error);
      return {
        totalCapacity: 0,
        usedCapacity: 0,
        utilizationPercent: 0,
      };
    }
  }

  /**
   * Calculate KPIs
   */
  async calculateKPIs(
    orgId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<KPIMetric[]> {
    try {
      // Get all active KPIs for org
      const kpiResult = await this.db.query<{
        id: string;
        kpiName: string;
        targetValue: number;
        warningThreshold: number;
        criticalThreshold: number;
      }>(
        `
        SELECT
          id, "kpiName" as "kpiName", "targetValue" as "targetValue",
          "warningThreshold" as "warningThreshold",
          "criticalThreshold" as "criticalThreshold"
        FROM calendar_kpis
        WHERE org_id = $1 AND is_active = TRUE
        `,
        [orgId],
      );

      const metrics: KPIMetric[] = [];

      for (const kpi of kpiResult.rows) {
        // Calculate actual value based on KPI type
        let actualValue = 0;

        if (kpi.kpiName.includes("revenue")) {
          const revResult = await this.db.query<{ total: number }>(
            `
            SELECT COALESCE(SUM(revenue), 0)::NUMERIC as total
            FROM calendar_events
            WHERE org_id = $1
              AND DATE(start_time) >= $2::DATE
              AND DATE(start_time) <= $3::DATE
            `,
            [orgId, periodStart, periodEnd],
          );
          actualValue = revResult.rows[0]?.total || 0;
        } else if (kpi.kpiName.includes("capacity")) {
          const capResult = await this.getCapacityUtilization(
            orgId,
            periodStart,
            periodEnd,
          );
          actualValue = capResult.utilizationPercent;
        } else if (kpi.kpiName.includes("events")) {
          const evtResult = await this.db.query<{ count: number }>(
            `
            SELECT COUNT(*) as count
            FROM calendar_events
            WHERE org_id = $1
              AND DATE(start_time) >= $2::DATE
              AND DATE(start_time) <= $3::DATE
            `,
            [orgId, periodStart, periodEnd],
          );
          actualValue = evtResult.rows[0]?.count || 0;
        }

        const variance = actualValue - kpi.targetValue;
        const variancePercent = (variance / Math.max(kpi.targetValue, 1)) * 100;

        let status: "on-track" | "warning" | "critical" | "exceeded" =
          "on-track";
        if (actualValue >= kpi.targetValue) {
          status = "exceeded";
        } else if (
          actualValue <= (kpi.criticalThreshold || kpi.targetValue * 0.5)
        ) {
          status = "critical";
        } else if (
          actualValue <= (kpi.warningThreshold || kpi.targetValue * 0.75)
        ) {
          status = "warning";
        }

        metrics.push({
          id: kpi.id,
          name: kpi.kpiName,
          value: Math.round(actualValue),
          target: Math.round(kpi.targetValue),
          variance: Math.round(variance),
          status,
          trend: "stable", // TODO: Calculate trend from historical data
        });
      }

      return metrics;
    } catch (error) {
      logger.error("[Analytics] Error calculating KPIs:", error);
      return [];
    }
  }

  /**
   * Get top performers (outlets by revenue)
   */
  async getTopPerformers(
    orgId: string,
    limit: number = 5,
  ): Promise<
    Array<{
      outletId: string;
      outletName: string;
      revenue: number;
      events: number;
      avgRevenuePerEvent: number;
    }>
  > {
    try {
      const result = await this.db.query(
        `
        SELECT
          o.id as "outletId",
          o.name as "outletName",
          COALESCE(SUM(e.revenue), 0)::NUMERIC as revenue,
          COUNT(e.*) as events,
          COALESCE(AVG(e.revenue), 0)::NUMERIC as "avgRevenuePerEvent"
        FROM calendar_outlets o
        LEFT JOIN calendar_events e ON o.id = e.outlet_id
          AND e.status != 'cancelled'
          AND DATE(e.start_time) >= (NOW()::DATE - INTERVAL '90 days')
        WHERE o.org_id = $1
        GROUP BY o.id, o.name
        ORDER BY revenue DESC
        LIMIT $2
        `,
        [orgId, limit],
      );

      return result.rows;
    } catch (error) {
      logger.error("[Analytics] Error fetching top performers:", error);
      return [];
    }
  }
}

export default CalendarAnalyticsEngine;
