import { logger } from "../lib/logger";
import { safeRequire } from "../utils/safe-require";

type VercelPostgresModule = { sql: any };
const vercelPg = safeRequire<VercelPostgresModule>("@vercel/postgres");

export const sql =
  vercelPg?.sql ??
  ((..._args: any[]) => {
    throw new Error(
      "Maestro BEO sync requires @vercel/postgres, which is not installed in this environment.",
    );
  });

export interface ProductionTask {
  id: string;
  eventId: string;
  outletId: string;
  departmentId: string;
  title: string;
  description?: string;
  status: string;
  platingType?: "plated" | "buffet" | "family_style" | "stations" | "cocktail";
  prepStartDate: Date;
  prepEndDate: Date;
  executionDate: Date;
  executionStartTime?: Date;
  executionEndTime?: Date;
  guestCount?: number;
  percentComplete: number;
}

export interface PrepTimelineItem {
  id: string;
  productionTaskId: string;
  prepDayDate: Date;
  daysBeforeEvent: number;
  dailyTaskDescription?: string;
  estimatedHours?: number;
  status: string;
  checkpointRequired: boolean;
  checkpointName?: string;
}

class MaestroBeOSync {
  /**
   * Create production tasks for a BEO event
   */
  async createProductionTasksForBEO(
    eventId: string,
    outletId: string,
    orgId: string,
    userId: string,
    platingType: string = "plated",
  ): Promise<ProductionTask[]> {
    try {
      logger.info("[MaestroBeOSync] Creating production tasks for BEO", {
        eventId,
        outletId,
        platingType,
      });

      // Call PostgreSQL function to create tasks for all assigned departments
      const result = await sql`
        SELECT * FROM create_maestro_production_tasks_for_beo(
          ${eventId}::UUID,
          ${outletId}::UUID,
          ${orgId}::UUID,
          ${userId}::UUID
        );
      `;

      // Fetch the created tasks
      const tasks = await this.getEventProductionTasks(eventId);

      logger.info("[MaestroBeOSync] Production tasks created", {
        eventId,
        taskCount: tasks.length,
      });

      return tasks;
    } catch (error) {
      logger.error("[MaestroBeOSync] Error creating production tasks:", error);
      throw error;
    }
  }

  /**
   * Get all production tasks for an event
   */
  async getEventProductionTasks(eventId: string): Promise<ProductionTask[]> {
    try {
      const result = await sql`
        SELECT
          id,
          event_id,
          outlet_id,
          department_id,
          title,
          description,
          status,
          plating_type,
          prep_start_date,
          prep_end_date,
          execution_date,
          execution_start_time,
          execution_end_time,
          guest_count,
          percent_complete
        FROM maestro_production_tasks
        WHERE event_id = ${eventId}
        ORDER BY execution_date ASC, status DESC;
      `;

      return result.rows.map((row) => ({
        id: row.id,
        eventId: row.event_id,
        outletId: row.outlet_id,
        departmentId: row.department_id,
        title: row.title,
        description: row.description,
        status: row.status,
        platingType: row.plating_type,
        prepStartDate: new Date(row.prep_start_date),
        prepEndDate: new Date(row.prep_end_date),
        executionDate: new Date(row.execution_date),
        executionStartTime: row.execution_start_time
          ? new Date(row.execution_start_time)
          : undefined,
        executionEndTime: row.execution_end_time
          ? new Date(row.execution_end_time)
          : undefined,
        guestCount: row.guest_count,
        percentComplete: row.percent_complete,
      }));
    } catch (error) {
      logger.error("[MaestroBeOSync] Error fetching production tasks:", error);
      throw error;
    }
  }

  /**
   * Get production tasks for a department and date range
   */
  async getDepartmentProductionTasks(
    departmentId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ProductionTask[]> {
    try {
      const result = await sql`
        SELECT
          id,
          event_id,
          outlet_id,
          department_id,
          title,
          description,
          status,
          plating_type,
          prep_start_date,
          prep_end_date,
          execution_date,
          execution_start_time,
          execution_end_time,
          guest_count,
          percent_complete
        FROM maestro_production_tasks
        WHERE department_id = ${departmentId}
          AND (
            (prep_start_date <= ${endDate.toISOString().split("T")[0]} AND prep_end_date >= ${startDate.toISOString().split("T")[0]})
            OR (execution_date BETWEEN ${startDate.toISOString().split("T")[0]} AND ${endDate.toISOString().split("T")[0]})
          )
        ORDER BY execution_date ASC, prep_start_date ASC;
      `;

      return result.rows.map((row) => ({
        id: row.id,
        eventId: row.event_id,
        outletId: row.outlet_id,
        departmentId: row.department_id,
        title: row.title,
        description: row.description,
        status: row.status,
        platingType: row.plating_type,
        prepStartDate: new Date(row.prep_start_date),
        prepEndDate: new Date(row.prep_end_date),
        executionDate: new Date(row.execution_date),
        executionStartTime: row.execution_start_time
          ? new Date(row.execution_start_time)
          : undefined,
        executionEndTime: row.execution_end_time
          ? new Date(row.execution_end_time)
          : undefined,
        guestCount: row.guest_count,
        percentComplete: row.percent_complete,
      }));
    } catch (error) {
      logger.error(
        "[MaestroBeOSync] Error fetching department production tasks:",
        error,
      );
      throw error;
    }
  }

  /**
   * Generate prep timeline for a production task
   */
  async generatePrepTimeline(
    productionTaskId: string,
    eventId: string,
    advancePrepDays: number = 3,
  ): Promise<PrepTimelineItem[]> {
    try {
      // Get event date
      const eventResult = await sql`
        SELECT start_time FROM calendar_events WHERE id = ${eventId};
      `;

      if (eventResult.rows.length === 0) {
        throw new Error("Event not found");
      }

      const eventDate = new Date(eventResult.rows[0].start_time);
      const eventDateStr = eventDate.toISOString().split("T")[0];

      // Delete existing timeline
      await sql`
        DELETE FROM production_prep_timeline
        WHERE production_task_id = ${productionTaskId};
      `;

      // Create timeline entries for each prep day
      const timeline: PrepTimelineItem[] = [];

      for (
        let daysBeforeEvent = advancePrepDays;
        daysBeforeEvent >= 0;
        daysBeforeEvent--
      ) {
        const prepDate = new Date(eventDate);
        prepDate.setDate(prepDate.getDate() - daysBeforeEvent);
        const prepDateStr = prepDate.toISOString().split("T")[0];

        const result = await sql`
          INSERT INTO production_prep_timeline (
            id,
            production_task_id,
            event_id,
            prep_day_date,
            days_before_event,
            daily_task_description,
            estimated_hours,
            status,
            checkpoint_required,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid(),
            ${productionTaskId},
            ${eventId},
            ${prepDateStr}::DATE,
            ${daysBeforeEvent},
            ${this.getDefaultPrepTaskDescription(daysBeforeEvent)},
            ${this.getEstimatedHours(daysBeforeEvent)},
            'pending',
            ${daysBeforeEvent === 1},
            NOW(),
            NOW()
          )
          RETURNING
            id,
            production_task_id,
            prep_day_date,
            days_before_event,
            daily_task_description,
            estimated_hours,
            status,
            checkpoint_required,
            checkpoint_name;
        `;

        if (result.rows.length > 0) {
          const row = result.rows[0];
          timeline.push({
            id: row.id,
            productionTaskId: row.production_task_id,
            prepDayDate: new Date(row.prep_day_date),
            daysBeforeEvent: row.days_before_event,
            dailyTaskDescription: row.daily_task_description,
            estimatedHours: row.estimated_hours,
            status: row.status,
            checkpointRequired: row.checkpoint_required,
            checkpointName: row.checkpoint_name,
          });
        }
      }

      logger.info("[MaestroBeOSync] Prep timeline generated", {
        productionTaskId,
        timelineLength: timeline.length,
      });

      return timeline;
    } catch (error) {
      logger.error("[MaestroBeOSync] Error generating prep timeline:", error);
      throw error;
    }
  }

  /**
   * Get prep timeline for a production task
   */
  async getPrepTimeline(productionTaskId: string): Promise<PrepTimelineItem[]> {
    try {
      const result = await sql`
        SELECT
          id,
          production_task_id,
          prep_day_date,
          days_before_event,
          daily_task_description,
          estimated_hours,
          status,
          checkpoint_required,
          checkpoint_name
        FROM production_prep_timeline
        WHERE production_task_id = ${productionTaskId}
        ORDER BY prep_day_date ASC;
      `;

      return result.rows.map((row) => ({
        id: row.id,
        productionTaskId: row.production_task_id,
        prepDayDate: new Date(row.prep_day_date),
        daysBeforeEvent: row.days_before_event,
        dailyTaskDescription: row.daily_task_description,
        estimatedHours: row.estimated_hours,
        status: row.status,
        checkpointRequired: row.checkpoint_required,
        checkpointName: row.checkpoint_name,
      }));
    } catch (error) {
      logger.error("[MaestroBeOSync] Error fetching prep timeline:", error);
      throw error;
    }
  }

  /**
   * Update production task status
   */
  async updateTaskStatus(
    taskId: string,
    status: string,
    percentComplete?: number,
  ): Promise<boolean> {
    try {
      const result = await sql`
        UPDATE maestro_production_tasks
        SET status = ${status},
            percent_complete = COALESCE(${percentComplete}, percent_complete),
            updated_at = NOW()
        WHERE id = ${taskId}
        RETURNING id;
      `;

      if (result.rows.length === 0) {
        return false;
      }

      logger.info("[MaestroBeOSync] Task status updated", {
        taskId,
        status,
        percentComplete,
      });

      return true;
    } catch (error) {
      logger.error("[MaestroBeOSync] Error updating task status:", error);
      throw error;
    }
  }

  /**
   * Add note to production task
   */
  async addTaskNote(
    productionTaskId: string,
    eventId: string,
    message: string,
    userId: string,
    updateType: string = "note_added",
  ): Promise<string> {
    try {
      const result = await sql`
        INSERT INTO production_task_updates (
          id,
          production_task_id,
          event_id,
          update_type,
          update_message,
          updated_by_user_id,
          created_at
        ) VALUES (
          gen_random_uuid(),
          ${productionTaskId},
          ${eventId},
          ${updateType},
          ${message},
          ${userId},
          NOW()
        )
        RETURNING id;
      `;

      logger.info("[MaestroBeOSync] Note added to task", {
        productionTaskId,
        updateType,
      });

      return result.rows[0].id;
    } catch (error) {
      logger.error("[MaestroBeOSync] Error adding task note:", error);
      throw error;
    }
  }

  /**
   * Get production task updates
   */
  async getTaskUpdates(productionTaskId: string): Promise<any[]> {
    try {
      const result = await sql`
        SELECT
          id,
          update_type,
          update_message,
          updated_by_user_id,
          created_at
        FROM production_task_updates
        WHERE production_task_id = ${productionTaskId}
        ORDER BY created_at DESC;
      `;

      return result.rows;
    } catch (error) {
      logger.error("[MaestroBeOSync] Error fetching task updates:", error);
      throw error;
    }
  }

  /**
   * Update prep timeline status
   */
  async updatePrepTimelineStatus(
    prepTimelineId: string,
    status: string,
  ): Promise<boolean> {
    try {
      const result = await sql`
        UPDATE production_prep_timeline
        SET status = ${status},
            updated_at = NOW()
        WHERE id = ${prepTimelineId}
        RETURNING id;
      `;

      if (result.rows.length === 0) {
        return false;
      }

      logger.info("[MaestroBeOSync] Prep timeline status updated", {
        prepTimelineId,
        status,
      });

      return true;
    } catch (error) {
      logger.error(
        "[MaestroBeOSync] Error updating prep timeline status:",
        error,
      );
      throw error;
    }
  }

  /**
   * Mark prep checkpoint as approved
   */
  async approvePrepCheckpoint(
    prepTimelineId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const result = await sql`
        UPDATE production_prep_timeline
        SET checkpoint_approved = TRUE,
            checkpoint_approved_by = ${userId},
            checkpoint_approved_at = NOW(),
            status = 'completed',
            updated_at = NOW()
        WHERE id = ${prepTimelineId}
        RETURNING id;
      `;

      if (result.rows.length === 0) {
        return false;
      }

      logger.info("[MaestroBeOSync] Prep checkpoint approved", {
        prepTimelineId,
        userId,
      });

      return true;
    } catch (error) {
      logger.error("[MaestroBeOSync] Error approving checkpoint:", error);
      throw error;
    }
  }

  /**
   * Default prep task description based on days before event
   */
  private getDefaultPrepTaskDescription(daysBeforeEvent: number): string {
    const descriptions: Record<number, string> = {
      3: "Gather ingredients, review recipes, plan prep schedule",
      2: "Major prep work - cut vegetables, prepare components",
      1: "Final prep, sauce preparation, plating setup, equipment check",
      0: "Cooking, plating, final presentation, service preparation",
    };
    return descriptions[daysBeforeEvent] || "Prep work";
  }

  /**
   * Estimated hours for prep based on days before event
   */
  private getEstimatedHours(daysBeforeEvent: number): number {
    const hours: Record<number, number> = {
      3: 4,
      2: 8,
      1: 6,
      0: 8,
    };
    return hours[daysBeforeEvent] || 4;
  }

  /**
   * Cancel production tasks for cancelled event
   */
  async cancelEventTasks(eventId: string): Promise<number> {
    try {
      const result = await sql`
        UPDATE maestro_production_tasks
        SET status = 'cancelled',
            updated_at = NOW()
        WHERE event_id = ${eventId}
          AND status != 'completed'
        RETURNING id;
      `;

      logger.info("[MaestroBeOSync] Event production tasks cancelled", {
        eventId,
        tasksCount: result.rows.length,
      });

      return result.rows.length;
    } catch (error) {
      logger.error(
        "[MaestroBeOSync] Error cancelling event production tasks:",
        error,
      );
      throw error;
    }
  }
}

export const maestroBeOSync = new MaestroBeOSync();
