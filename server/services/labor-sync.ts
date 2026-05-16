import { logger } from "../lib/logger";
import { safeRequire } from "../utils/safe-require";

type VercelPostgresModule = { sql: any };
const vercelPg = safeRequire<VercelPostgresModule>("@vercel/postgres");

// Provide a safe fallback that throws only when used (not on import)
export const sql =
  vercelPg?.sql ??
  ((..._args: any[]) => {
    throw new Error(
      "Labor sync requires @vercel/postgres, which is not installed in this environment.",
    );
  });

export interface LaborHourBreakdown {
  prepDayDate: string;
  daysBeforeEvent: number;
  estimatedHours: number;
  estimatedStaffCount: number;
  laborType: string;
  status: string;
}

export interface DepartmentUpcomingEvent {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventStartTime: string;
  outletId: string;
  outletName: string;
  taskId: string;
  taskStatus: string;
  taskTitle: string;
  guestCount: number;
  estimatedHours: number;
  assignedStaffCount: number;
  platingType: string;
  daysUntilEvent: number;
}

export interface SyncResult {
  syncId: string;
  taskId: string;
  hoursSynced: number;
  staffCount: number;
  syncStatus: string;
}

class LaborSyncService {
  /**
   * Generate labor hours breakdown for a production task
   * This estimates hours for each prep day leading up to the event
   */
  async generateLaborHoursBreakdown(
    productionTaskId: string,
    eventId: string,
    guestCount: number = 50,
    prepDaysOut: number = 3,
  ): Promise<void> {
    try {
      logger.info("[LaborSync] Generating labor hours breakdown", {
        productionTaskId,
        guestCount,
        prepDaysOut,
      });

      // Get production task details
      const taskResult = await sql`
        SELECT
          id,
          event_date,
          event_start_time,
          guest_count,
          department_id,
          plating_type
        FROM maestro_production_tasks
        WHERE id = ${productionTaskId}::UUID
      `;

      if (taskResult.rows.length === 0) {
        logger.warn("[LaborSync] Production task not found", {
          productionTaskId,
        });
        return;
      }

      const task = taskResult.rows[0];
      const eventDate = new Date(task.event_date);
      const finalGuestCount = task.guest_count || guestCount;

      // Estimate hours based on days before event
      // 3 days out: 4 hours (gathering, prep list review)
      // 2 days out: 6 hours (major prep, shopping)
      // 1 day out: 8 hours (final prep, mise en place)
      // Day of: 4-6 hours (plating, setup, execution)

      const hourEstimates = [
        { daysBeforeEvent: 3, estimatedHours: 4, laborType: "menu_planning" },
        { daysBeforeEvent: 2, estimatedHours: 6, laborType: "major_prep" },
        { daysBeforeEvent: 1, estimatedHours: 8, laborType: "final_prep" },
        { daysBeforeEvent: 0, estimatedHours: 5, laborType: "execution" },
      ];

      // For buffet-style, reduce hours slightly
      // For plated, keep as is
      const platingMultiplier = task.plating_type === "buffet" ? 0.8 : 1.0;

      // For larger events, increase hours
      const guestMultiplier = Math.min(finalGuestCount / 50, 2.0);

      // Staff count estimation: 1 staff per 10 guests, minimum 2
      const baseStaffCount = Math.max(Math.ceil(finalGuestCount / 10), 2);

      // Create labor hours entries for each prep day
      for (const estimate of hourEstimates) {
        if (estimate.daysBeforeEvent <= prepDaysOut) {
          const prepDate = new Date(eventDate);
          prepDate.setDate(prepDate.getDate() - estimate.daysBeforeEvent);

          const adjustedHours =
            estimate.estimatedHours * platingMultiplier * guestMultiplier;
          const estimatedStaffCount =
            estimate.daysBeforeEvent === 0
              ? Math.ceil(baseStaffCount * 1.2) // Extra staff on day-of
              : baseStaffCount;

          try {
            // Upsert labor hours (insert or do nothing if already exists)
            await sql`
              INSERT INTO production_task_labor_hours (
                id,
                production_task_id,
                event_id,
                prep_day_date,
                days_before_event,
                estimated_hours,
                estimated_staff_count,
                labor_type,
                status,
                created_at,
                updated_at
              ) VALUES (
                gen_random_uuid(),
                ${productionTaskId}::UUID,
                ${eventId}::UUID,
                ${prepDate.toISOString().split("T")[0]},
                ${estimate.daysBeforeEvent},
                ${adjustedHours.toFixed(2)}::NUMERIC,
                ${estimatedStaffCount},
                ${estimate.laborType},
                'pending',
                NOW(),
                NOW()
              )
              ON CONFLICT (production_task_id, prep_day_date) DO NOTHING
            `;
          } catch (error) {
            logger.warn(
              "[LaborSync] Failed to insert labor hours for prep day",
              {
                daysBeforeEvent: estimate.daysBeforeEvent,
                error: error instanceof Error ? error.message : "Unknown error",
              },
            );
          }
        }
      }

      // Update production task's estimated total hours
      const totalHoursResult = await sql`
        SELECT calculate_total_labor_hours(${productionTaskId}::UUID) as total_hours
      `;

      if (totalHoursResult.rows.length > 0) {
        const totalHours = totalHoursResult.rows[0].total_hours;

        await sql`
          UPDATE maestro_production_tasks
          SET
            estimated_total_hours = ${totalHours}::NUMERIC,
            assigned_staff_count = ${baseStaffCount},
            updated_at = NOW()
          WHERE id = ${productionTaskId}::UUID
        `;
      }

      logger.info("[LaborSync] Labor hours breakdown generated successfully", {
        productionTaskId,
        totalHours: totalHoursResult.rows[0]?.total_hours,
      });
    } catch (error) {
      logger.error(
        "[LaborSync] Error generating labor hours breakdown:",
        error,
      );
      throw error;
    }
  }

  /**
   * Sync production task labor hours to Schedule module
   * This creates the connection between production tasks and staff scheduling
   */
  async syncProductionTaskToSchedule(
    productionTaskId: string,
    userId: string,
  ): Promise<SyncResult> {
    try {
      logger.info("[LaborSync] Syncing production task to Schedule", {
        productionTaskId,
        userId,
      });

      const result = await sql`
        SELECT * FROM sync_production_task_to_schedule(
          ${productionTaskId}::UUID,
          ${userId}::UUID
        )
      `;

      if (result.rows.length === 0) {
        throw new Error("Failed to sync production task");
      }

      const syncResult = result.rows[0];

      logger.info("[LaborSync] Production task synced successfully", {
        productionTaskId,
        hoursSynced: syncResult.hours_synced,
        staffCount: syncResult.staff_count_synced,
      });

      return {
        syncId: syncResult.sync_id,
        taskId: syncResult.task_id,
        hoursSynced: parseFloat(syncResult.hours_synced),
        staffCount: syncResult.staff_count_integer,
        syncStatus: syncResult.sync_status,
      };
    } catch (error) {
      logger.error("[LaborSync] Error syncing production task:", error);
      throw error;
    }
  }

  /**
   * Get upcoming events for a specific department (for mini-panel)
   */
  async getDepartmentUpcomingEvents(
    departmentId: string,
    daysAhead: number = 7,
  ): Promise<DepartmentUpcomingEvent[]> {
    try {
      logger.info("[LaborSync] Fetching upcoming events for department", {
        departmentId,
        daysAhead,
      });

      const result = await sql`
        SELECT * FROM get_department_upcoming_events(
          ${departmentId}::UUID,
          ${daysAhead}
        )
      `;

      const events: DepartmentUpcomingEvent[] = result.rows.map((row: any) => ({
        eventId: row.event_id,
        eventTitle: row.event_title,
        eventDate: row.event_date.toISOString().split("T")[0],
        eventStartTime: new Date(row.event_start_time).toISOString(),
        outletId: row.outlet_id,
        outletName: row.outlet_name,
        taskId: row.task_id,
        taskStatus: row.task_status,
        taskTitle: row.task_title,
        guestCount: row.guest_count,
        estimatedHours: parseFloat(row.estimated_hours || 0),
        assignedStaffCount: row.assigned_staff_count || 0,
        platingType: row.plating_type,
        daysUntilEvent: row.days_until_event,
      }));

      logger.info("[LaborSync] Retrieved upcoming events", {
        departmentId,
        eventCount: events.length,
      });

      return events;
    } catch (error) {
      logger.error(
        "[LaborSync] Error fetching department upcoming events:",
        error,
      );
      throw error;
    }
  }

  /**
   * Get labor hours breakdown for a production task
   */
  async getPrepLaborBreakdown(
    productionTaskId: string,
  ): Promise<LaborHourBreakdown[]> {
    try {
      const result = await sql`
        SELECT * FROM get_prep_labor_breakdown(${productionTaskId}::UUID)
      `;

      const breakdown: LaborHourBreakdown[] = result.rows.map((row: any) => ({
        prepDayDate: row.prep_day_date.toISOString().split("T")[0],
        daysBeforeEvent: row.days_before_event,
        estimatedHours: parseFloat(row.estimated_hours),
        estimatedStaffCount: row.estimated_staff_count,
        laborType: row.labor_type,
        status: row.status,
      }));

      return breakdown;
    } catch (error) {
      logger.error("[LaborSync] Error fetching prep labor breakdown:", error);
      throw error;
    }
  }

  /**
   * Update labor hours status as work progresses
   */
  async updateLaborHoursStatus(
    laborHoursId: string,
    status: "pending" | "scheduled" | "in_progress" | "completed",
    actualHours?: number,
  ): Promise<void> {
    try {
      const updateQuery = actualHours
        ? await sql`
            UPDATE production_task_labor_hours
            SET
              status = ${status},
              actual_hours = ${actualHours}::NUMERIC,
              updated_at = NOW()
            WHERE id = ${laborHoursId}::UUID
          `
        : await sql`
            UPDATE production_task_labor_hours
            SET
              status = ${status},
              updated_at = NOW()
            WHERE id = ${laborHoursId}::UUID
          `;

      logger.info("[LaborSync] Labor hours status updated", {
        laborHoursId,
        status,
        actualHours,
      });
    } catch (error) {
      logger.error("[LaborSync] Error updating labor hours status:", error);
      throw error;
    }
  }

  /**
   * Get total labor cost for a production task
   */
  async getTaskLaborCost(productionTaskId: string): Promise<number> {
    try {
      const result = await sql`
        SELECT COALESCE(SUM(
          COALESCE(ptlh.estimated_hours, 0) *
          COALESCE(mpt.labor_rate_hourly, 20)::NUMERIC
        ), 0) as total_cost
        FROM production_task_labor_hours ptlh
        JOIN maestro_production_tasks mpt ON mpt.id = ptlh.production_task_id
        WHERE mpt.id = ${productionTaskId}::UUID
      `;

      if (result.rows.length > 0) {
        return parseFloat(result.rows[0].total_cost);
      }

      return 0;
    } catch (error) {
      logger.error("[LaborSync] Error calculating labor cost:", error);
      return 0;
    }
  }
}

export const laborSync = new LaborSyncService();
