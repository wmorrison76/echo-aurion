import { logger } from "../lib/logger";
import { safeRequire } from "../utils/safe-require";

type VercelPostgresModule = { sql: any };
const vercelPg = safeRequire<VercelPostgresModule>("@vercel/postgres");

export const sql =
  vercelPg?.sql ??
  ((..._args: any[]) => {
    throw new Error(
      "Staff assignment requires @vercel/postgres, which is not installed in this environment.",
    );
  });
import { phase5RealtimeBroadcaster } from "./phase5-realtime-broadcaster";

export interface StaffAssignment {
  id: string;
  productionTaskId: string;
  employeeId: string;
  employeeName: string;
  roleInTask: string;
  assignmentStatus: string;
  estimatedHours: number;
  actualHoursWorked?: number;
  taskAllocationPercentage: number;
}

export interface AvailableStaff {
  employeeId: string;
  employeeName: string;
  proficiencyLevel: string;
  hasRequiredSkill: boolean;
  availabilityScore: number;
}

class StaffAssignmentService {
  /**
   * Assign staff to a production task
   */
  async assignStaffToTask(
    orgId: string,
    productionTaskId: string,
    employeeId: string,
    roleInTask: string,
    estimatedHours: number,
    allocationPercentage: number = 100,
    assignedByUserId: string,
  ): Promise<StaffAssignment> {
    try {
      logger.info("[StaffAssignment] Assigning staff to task", {
        taskId: productionTaskId,
        employeeId,
        roleInTask,
      });

      const result = await sql`
        INSERT INTO staff_task_assignments (
          id,
          org_id,
          production_task_id,
          employee_id,
          role_in_task,
          estimated_hours,
          task_allocation_percentage,
          assignment_status,
          assigned_by_user_id,
          assigned_date
        ) VALUES (
          gen_random_uuid(),
          ${orgId}::UUID,
          ${productionTaskId}::UUID,
          ${employeeId}::UUID,
          ${roleInTask},
          ${estimatedHours}::NUMERIC,
          ${allocationPercentage}::NUMERIC,
          'pending',
          ${assignedByUserId}::UUID,
          NOW()
        )
        RETURNING 
          id,
          production_task_id,
          employee_id,
          role_in_task,
          assignment_status,
          estimated_hours,
          actual_hours_worked,
          task_allocation_percentage
      `;

      if (result.rows.length === 0) {
        throw new Error("Failed to insert staff assignment");
      }

      const assignment = result.rows[0];

      // Get employee name
      const empResult = await sql`
        SELECT user_metadata ->> 'full_name' as name
        FROM auth.users
        WHERE id = ${employeeId}::UUID
      `;

      const employeeName = empResult.rows[0]?.name || "Unknown";

      // Log collaboration event
      await sql`
        SELECT log_collaboration_event(
          ${orgId}::UUID,
          ${productionTaskId}::UUID,
          'staff_assigned',
          'Staff ' || ${employeeName} || ' assigned as ' || ${roleInTask},
          jsonb_build_object(
            'employeeId', ${employeeId}::TEXT,
            'role', ${roleInTask},
            'hours', ${estimatedHours}::TEXT
          ),
          ${assignedByUserId}::UUID
        )
      `;

      // Broadcast real-time update
      phase5RealtimeBroadcaster.broadcastStaffAssignment({
        taskId: productionTaskId,
        employeeId,
        employeeName,
        assignmentStatus: "pending",
        estimatedHours,
        role: roleInTask,
      });

      return {
        id: assignment.id,
        productionTaskId: assignment.production_task_id,
        employeeId: assignment.employee_id,
        employeeName,
        roleInTask: assignment.role_in_task,
        assignmentStatus: assignment.assignment_status,
        estimatedHours: parseFloat(assignment.estimated_hours),
        taskAllocationPercentage: parseFloat(
          assignment.task_allocation_percentage,
        ),
      };
    } catch (error) {
      logger.error("[StaffAssignment] Error assigning staff:", error);
      throw error;
    }
  }

  /**
   * Remove staff from a production task
   */
  async removeStaffAssignment(
    taskId: string,
    assignmentId: string,
    removedByUserId: string,
  ): Promise<boolean> {
    try {
      logger.info("[StaffAssignment] Removing staff assignment", {
        assignmentId,
        taskId,
      });

      const deleteResult = await sql`
        DELETE FROM staff_task_assignments
        WHERE id = ${assignmentId}::UUID
        RETURNING production_task_id, employee_id
      `;

      if (deleteResult.rows.length > 0) {
        const row = deleteResult.rows[0];

        // Log event
        await sql`
          SELECT log_collaboration_event(
            (SELECT org_id FROM maestro_production_tasks WHERE id = ${taskId}::UUID),
            ${taskId}::UUID,
            'staff_removed',
            'Staff member removed from task',
            jsonb_build_object('employeeId', ${row.employee_id}::TEXT),
            ${removedByUserId}::UUID
          )
        `;

        // Broadcast
        phase5RealtimeBroadcaster.broadcastTaskUpdate({
          id: assignmentId,
          taskId,
          eventType: "staff_removed",
          description: "Staff member removed from task",
          triggeredBy: removedByUserId,
          triggeredAt: new Date().toISOString(),
        });
      }

      return deleteResult.rowCount > 0;
    } catch (error) {
      logger.error("[StaffAssignment] Error removing assignment:", error);
      throw error;
    }
  }

  /**
   * Confirm staff availability for assignment
   */
  async confirmAssignment(
    assignmentId: string,
    employeeId: string,
  ): Promise<boolean> {
    try {
      logger.info("[StaffAssignment] Confirming assignment", {
        assignmentId,
        employeeId,
      });

      const result = await sql`
        UPDATE staff_task_assignments
        SET assignment_status = 'confirmed'
        WHERE id = ${assignmentId}::UUID
          AND employee_id = ${employeeId}::UUID
        RETURNING production_task_id
      `;

      if (result.rows.length > 0) {
        const taskId = result.rows[0].production_task_id;

        // Broadcast
        phase5RealtimeBroadcaster.broadcastTaskUpdate({
          id: assignmentId,
          taskId,
          eventType: "staff_confirmed",
          description: "Staff confirmed availability for task",
          triggeredBy: employeeId,
          triggeredAt: new Date().toISOString(),
        });
      }

      return result.rowCount > 0;
    } catch (error) {
      logger.error("[StaffAssignment] Error confirming assignment:", error);
      throw error;
    }
  }

  /**
   * Log actual hours worked
   */
  async logActualHours(
    assignmentId: string,
    actualHours: number,
    startTime: Date,
    endTime: Date,
    loggedByUserId: string,
  ): Promise<boolean> {
    try {
      logger.info("[StaffAssignment] Logging actual hours", {
        assignmentId,
        actualHours,
      });

      const result = await sql`
        UPDATE staff_task_assignments
        SET 
          assignment_status = 'completed',
          actual_hours_worked = ${actualHours}::NUMERIC,
          actual_start_time = ${startTime.toISOString()}::TIMESTAMP WITH TIME ZONE,
          actual_end_time = ${endTime.toISOString()}::TIMESTAMP WITH TIME ZONE,
          updated_at = NOW()
        WHERE id = ${assignmentId}::UUID
        RETURNING production_task_id
      `;

      if (result.rows.length > 0) {
        const taskId = result.rows[0].production_task_id;

        // Log event
        await sql`
          SELECT log_collaboration_event(
            (SELECT org_id FROM maestro_production_tasks WHERE id = ${taskId}::UUID),
            ${taskId}::UUID,
            'actual_hours_logged',
            'Actual hours logged: ' || ${actualHours}::TEXT,
            jsonb_build_object('hours', ${actualHours}::TEXT),
            ${loggedByUserId}::UUID
          )
        `;

        // Broadcast
        phase5RealtimeBroadcaster.broadcastHoursUpdate({
          taskId,
          estimatedHours: 0, // Fetched separately
          actualHours,
          updatedBy: loggedByUserId,
        });
      }

      return result.rowCount > 0;
    } catch (error) {
      logger.error("[StaffAssignment] Error logging hours:", error);
      throw error;
    }
  }

  /**
   * Get all assignments for a production task
   */
  async getTaskAssignments(taskId: string): Promise<StaffAssignment[]> {
    try {
      const result = await sql`
        SELECT
          sta.id,
          sta.production_task_id,
          sta.employee_id,
          sta.role_in_task,
          sta.assignment_status,
          sta.estimated_hours,
          sta.actual_hours_worked,
          sta.task_allocation_percentage,
          COALESCE(u.user_metadata ->> 'full_name', u.email) as employee_name
        FROM staff_task_assignments sta
        LEFT JOIN auth.users u ON u.id = sta.employee_id
        WHERE sta.production_task_id = ${taskId}::UUID
        ORDER BY sta.assigned_date DESC
      `;

      return result.rows.map((row: any) => ({
        id: row.id,
        productionTaskId: row.production_task_id,
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        roleInTask: row.role_in_task,
        assignmentStatus: row.assignment_status,
        estimatedHours: parseFloat(row.estimated_hours),
        actualHoursWorked: row.actual_hours_worked
          ? parseFloat(row.actual_hours_worked)
          : undefined,
        taskAllocationPercentage: parseFloat(row.task_allocation_percentage),
      }));
    } catch (error) {
      logger.error("[StaffAssignment] Error fetching task assignments:", error);
      throw error;
    }
  }

  /**
   * Get available staff for a task based on skills and availability
   */
  async getAvailableStaff(
    taskId: string,
    requiredSkill?: string,
  ): Promise<AvailableStaff[]> {
    try {
      const result = await sql`
        SELECT * FROM get_available_staff_for_task(
          ${taskId}::UUID,
          ${requiredSkill}::VARCHAR
        )
      `;

      return result.rows.map((row: any) => ({
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        proficiencyLevel: row.proficiency_level,
        hasRequiredSkill: row.has_required_skill,
        availabilityScore: parseFloat(row.availability_score),
      }));
    } catch (error) {
      logger.error("[StaffAssignment] Error fetching available staff:", error);
      throw error;
    }
  }

  /**
   * Sync staff assignments to Schedule module
   */
  async syncAssignmentsToSchedule(taskId: string): Promise<void> {
    try {
      logger.info("[StaffAssignment] Syncing assignments to Schedule", {
        taskId,
      });

      const assignments = await this.getTaskAssignments(taskId);

      // For each assignment, create/update corresponding Schedule shifts
      for (const assignment of assignments) {
        // This would integrate with the Schedule module API
        // POST to /api/schedule/upsert with proper org_id
        logger.info("[StaffAssignment] Would sync to Schedule", {
          assignmentId: assignment.id,
          employeeId: assignment.employeeId,
        });
      }
    } catch (error) {
      logger.error("[StaffAssignment] Error syncing to Schedule:", error);
      throw error;
    }
  }
}

export const staffAssignment = new StaffAssignmentService();
