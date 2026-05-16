import { logger } from "../lib/logger";
import { safeRequire } from "../utils/safe-require";

type VercelPostgresModule = { sql: any };
const vercelPg = safeRequire<VercelPostgresModule>("@vercel/postgres");

export const sql =
  vercelPg?.sql ??
  ((..._args: any[]) => {
    throw new Error(
      "Labor analytics requires @vercel/postgres, which is not installed in this environment.",
    );
  });

export interface LaborAnalytics {
  taskId: string;
  eventId: string;
  estimatedHours: number;
  actualHours: number;
  hoursVariance: number;
  hoursVariancePercentage: number;
  estimatedCost: number;
  actualCost: number;
  costVariance: number;
  productivityScore: number;
  efficiencyIndex: number;
}

export interface DepartmentAnalytics {
  departmentId: string;
  departmentName: string;
  eventsAnalyzed: number;
  avgHoursVariance: number;
  avgCostVariance: number;
  avgProductivityScore: number;
  overallEfficiencyIndex: number;
}

class LaborAnalyticsService {
  /**
   * Record analytics for a completed production task
   */
  async recordTaskAnalytics(
    orgId: string,
    productionTaskId: string,
    eventId: string,
    departmentId: string,
    estimatedHours: number,
    actualHours: number,
    estimatedCost: number,
    actualCost: number,
    guestCount: number,
    eventType: string,
    platingType: string,
    varianceReason?: string,
  ): Promise<LaborAnalytics> {
    try {
      logger.info("[LaborAnalytics] Recording task analytics", {
        taskId: productionTaskId,
        estimatedHours,
        actualHours,
      });

      // Calculate variance metrics
      const hoursVariance = actualHours - estimatedHours;
      const hoursVariancePercentage =
        estimatedHours > 0 ? (hoursVariance / estimatedHours) * 100 : 0;

      const costVariance = actualCost - estimatedCost;
      const costVariancePercentage =
        estimatedCost > 0 ? (costVariance / estimatedCost) * 100 : 0;

      // Calculate productivity score (0-100)
      // 100 = exactly on estimate, decreases with variance
      const productivityScore = Math.max(
        0,
        100 - Math.abs(hoursVariancePercentage) * 0.5,
      );

      // Efficiency index: how much output per hour of effort
      // 100 = baseline, > 100 is efficient
      const efficiencyIndex =
        estimatedHours > 0
          ? 100 / (1 + Math.abs(hoursVariancePercentage) / 100)
          : 100;

      const result = await sql`
        INSERT INTO labor_performance_analytics (
          id,
          org_id,
          production_task_id,
          event_id,
          department_id,
          estimated_hours,
          actual_hours_worked,
          estimated_labor_cost,
          actual_labor_cost,
          hours_variance,
          hours_variance_percentage,
          cost_variance,
          cost_variance_percentage,
          productivity_score,
          efficiency_index,
          guest_count,
          event_type,
          plating_type,
          variance_reason
        ) VALUES (
          gen_random_uuid(),
          ${orgId}::UUID,
          ${productionTaskId}::UUID,
          ${eventId}::UUID,
          ${departmentId}::UUID,
          ${estimatedHours}::NUMERIC,
          ${actualHours}::NUMERIC,
          ${estimatedCost}::NUMERIC,
          ${actualCost}::NUMERIC,
          ${hoursVariance}::NUMERIC,
          ${hoursVariancePercentage}::NUMERIC,
          ${costVariance}::NUMERIC,
          ${costVariancePercentage}::NUMERIC,
          ${productivityScore}::NUMERIC,
          ${efficiencyIndex}::NUMERIC,
          ${guestCount},
          ${eventType},
          ${platingType},
          ${varianceReason || null}
        )
        RETURNING *
      `;

      const row = result.rows[0];

      logger.info("[LaborAnalytics] Analytics recorded successfully", {
        taskId: productionTaskId,
        productivityScore: row.productivity_score,
        efficiencyIndex: row.efficiency_index,
      });

      return {
        taskId: productionTaskId,
        eventId,
        estimatedHours: parseFloat(row.estimated_hours),
        actualHours: parseFloat(row.actual_hours_worked),
        hoursVariance: parseFloat(row.hours_variance),
        hoursVariancePercentage: parseFloat(row.hours_variance_percentage),
        estimatedCost: parseFloat(row.estimated_labor_cost),
        actualCost: parseFloat(row.actual_labor_cost),
        costVariance: parseFloat(row.cost_variance),
        productivityScore: parseFloat(row.productivity_score),
        efficiencyIndex: parseFloat(row.efficiency_index),
      };
    } catch (error) {
      logger.error("[LaborAnalytics] Error recording analytics:", error);
      throw error;
    }
  }

  /**
   * Get analytics for a specific task
   */
  async getTaskAnalytics(taskId: string): Promise<LaborAnalytics | null> {
    try {
      const result = await sql`
        SELECT *
        FROM labor_performance_analytics
        WHERE production_task_id = ${taskId}::UUID
      `;

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      return {
        taskId,
        eventId: row.event_id,
        estimatedHours: parseFloat(row.estimated_hours),
        actualHours: parseFloat(row.actual_hours_worked),
        hoursVariance: parseFloat(row.hours_variance),
        hoursVariancePercentage: parseFloat(row.hours_variance_percentage),
        estimatedCost: parseFloat(row.estimated_labor_cost),
        actualCost: parseFloat(row.actual_labor_cost),
        costVariance: parseFloat(row.cost_variance),
        productivityScore: parseFloat(row.productivity_score),
        efficiencyIndex: parseFloat(row.efficiency_index),
      };
    } catch (error) {
      logger.error("[LaborAnalytics] Error fetching task analytics:", error);
      throw error;
    }
  }

  /**
   * Get department-wide analytics
   */
  async getDepartmentAnalytics(
    departmentId: string,
    daysBack: number = 30,
  ): Promise<DepartmentAnalytics> {
    try {
      logger.info("[LaborAnalytics] Fetching department analytics", {
        departmentId,
        daysBack,
      });

      const result = await sql`
        SELECT
          d.id,
          d.name,
          COUNT(*) as events_analyzed,
          AVG(lpa.hours_variance)::NUMERIC as avg_hours_variance,
          AVG(lpa.cost_variance)::NUMERIC as avg_cost_variance,
          AVG(lpa.productivity_score)::NUMERIC as avg_productivity_score,
          AVG(lpa.efficiency_index)::NUMERIC as avg_efficiency_index
        FROM labor_performance_analytics lpa
        JOIN departments d ON d.id = lpa.department_id
        WHERE lpa.department_id = ${departmentId}::UUID
          AND lpa.created_at >= NOW() - INTERVAL '1 day' * ${daysBack}
        GROUP BY d.id, d.name
      `;

      if (result.rows.length === 0) {
        return {
          departmentId,
          departmentName: "Unknown",
          eventsAnalyzed: 0,
          avgHoursVariance: 0,
          avgCostVariance: 0,
          avgProductivityScore: 0,
          overallEfficiencyIndex: 0,
        };
      }

      const row = result.rows[0];

      return {
        departmentId: row.id,
        departmentName: row.name,
        eventsAnalyzed: parseInt(row.events_analyzed, 10),
        avgHoursVariance: parseFloat(row.avg_hours_variance || 0),
        avgCostVariance: parseFloat(row.avg_cost_variance || 0),
        avgProductivityScore: parseFloat(row.avg_productivity_score || 0),
        overallEfficiencyIndex: parseFloat(row.avg_efficiency_index || 0),
      };
    } catch (error) {
      logger.error(
        "[LaborAnalytics] Error fetching department analytics:",
        error,
      );
      throw error;
    }
  }

  /**
   * Get top performers (most efficient staff)
   */
  async getTopPerformers(
    departmentId: string,
    limit: number = 10,
  ): Promise<any[]> {
    try {
      const result = await sql`
        SELECT
          sta.employee_id,
          COALESCE(u.user_metadata ->> 'full_name', u.email) as name,
          COUNT(*) as tasks_completed,
          AVG(lpa.efficiency_index)::NUMERIC as avg_efficiency,
          AVG(lpa.productivity_score)::NUMERIC as avg_productivity,
          SUM(sta.actual_hours_worked)::NUMERIC as total_hours
        FROM staff_task_assignments sta
        JOIN maestro_production_tasks mpt ON mpt.id = sta.production_task_id
        LEFT JOIN labor_performance_analytics lpa ON lpa.production_task_id = mpt.id
        LEFT JOIN auth.users u ON u.id = sta.employee_id
        WHERE mpt.department_id = ${departmentId}::UUID
          AND sta.assignment_status = 'completed'
        GROUP BY sta.employee_id, u.id
        ORDER BY avg_efficiency DESC
        LIMIT ${limit}
      `;

      return result.rows.map((row: any) => ({
        employeeId: row.employee_id,
        name: row.name,
        tasksCompleted: parseInt(row.tasks_completed, 10),
        avgEfficiency: parseFloat(row.avg_efficiency || 0),
        avgProductivity: parseFloat(row.avg_productivity || 0),
        totalHours: parseFloat(row.total_hours || 0),
      }));
    } catch (error) {
      logger.error("[LaborAnalytics] Error fetching top performers:", error);
      throw error;
    }
  }

  /**
   * Get improvement areas (where estimates are off)
   */
  async getImprovementAreas(
    departmentId: string,
    limit: number = 5,
  ): Promise<any[]> {
    try {
      const result = await sql`
        SELECT
          mpt.title,
          mpt.id,
          lpa.hours_variance_percentage,
          lpa.event_type,
          COUNT(*) as frequency,
          AVG(lpa.hours_variance_percentage)::NUMERIC as avg_variance
        FROM labor_performance_analytics lpa
        JOIN maestro_production_tasks mpt ON mpt.id = lpa.production_task_id
        WHERE lpa.department_id = ${departmentId}::UUID
          AND ABS(lpa.hours_variance_percentage) > 20 -- > 20% variance
        GROUP BY mpt.id, mpt.title, lpa.event_type
        ORDER BY frequency DESC, avg_variance DESC
        LIMIT ${limit}
      `;

      return result.rows.map((row: any) => ({
        taskId: row.id,
        taskTitle: row.title,
        hoursVariancePercentage: parseFloat(row.avg_variance),
        eventType: row.event_type,
        frequency: parseInt(row.frequency, 10),
      }));
    } catch (error) {
      logger.error("[LaborAnalytics] Error fetching improvement areas:", error);
      throw error;
    }
  }

  /**
   * Generate labor cost forecast based on historical data
   */
  async generateCostForecast(
    departmentId: string,
    upcomingEventCount: number = 5,
  ): Promise<{ avgEventCost: number; forecastedTotalCost: number }> {
    try {
      const result = await sql`
        SELECT
          AVG(actual_labor_cost)::NUMERIC as avg_cost
        FROM labor_performance_analytics
        WHERE department_id = ${departmentId}::UUID
          AND created_at >= NOW() - INTERVAL '90 days'
      `;

      if (result.rows.length === 0 || !result.rows[0].avg_cost) {
        return {
          avgEventCost: 0,
          forecastedTotalCost: 0,
        };
      }

      const avgEventCost = parseFloat(result.rows[0].avg_cost);
      const forecastedTotalCost = avgEventCost * upcomingEventCount;

      return {
        avgEventCost,
        forecastedTotalCost,
      };
    } catch (error) {
      logger.error("[LaborAnalytics] Error generating cost forecast:", error);
      throw error;
    }
  }
}

export const laborAnalytics = new LaborAnalyticsService();
