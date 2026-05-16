import { logger } from "../lib/logger";
import { safeRequire } from "../utils/safe-require";

type VercelPostgresModule = { sql: any };
const vercelPg = safeRequire<VercelPostgresModule>("@vercel/postgres");

export const sql =
  vercelPg?.sql ??
  ((..._args: any[]) => {
    throw new Error(
      "Mobile time tracking requires @vercel/postgres, which is not installed in this environment.",
    );
  });

export interface TimeTrackingSession {
  id: string;
  staffAssignmentId: string;
  productionTaskId: string;
  employeeId: string;
  clockInTime: string;
  clockInLocation?: string;
  clockOutTime?: string;
  clockOutLocation?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  breakDurationMinutes?: number;
  totalHoursWorked: number;
  totalMinutesWorked: number;
  workQualityNotes?: string;
  taskCompletionPercentage?: number;
  isSubmitted: boolean;
  isApproved: boolean;
  submittedAt?: string;
  approvedAt?: string;
  approvedByUserId?: string;
  createdAt: string;
}

export interface TimeTrackingAdjustment {
  id: string;
  timeTrackingId: string;
  adjustmentType: string;
  originalValue: string;
  newValue: string;
  reasonForAdjustment: string;
  adjustedByUserId: string;
  adjustedAt: string;
}

class MobileTimeTrackingService {
  /**
   * Start a time tracking session (clock in)
   */
  async clockIn(
    orgId: string,
    staffAssignmentId: string,
    productionTaskId: string,
    employeeId: string,
    location?: string,
    deviceId?: string,
  ): Promise<TimeTrackingSession> {
    try {
      logger.info("[TimeTracking] Employee clocking in", {
        employeeId,
        productionTaskId,
      });

      // Check if there's an existing active session
      const existingResult = await sql`
        SELECT id FROM task_time_tracking
        WHERE staff_assignment_id = ${staffAssignmentId}::UUID
          AND clock_out_time IS NULL
      `;

      if (existingResult.rows.length > 0) {
        throw new Error("Employee already has an active time tracking session");
      }

      // Create new time tracking record
      const result = await sql`
        INSERT INTO task_time_tracking (
          id,
          org_id,
          staff_assignment_id,
          production_task_id,
          employee_id,
          clock_in_time,
          clock_in_location,
          clock_in_device_id
        ) VALUES (
          gen_random_uuid(),
          ${orgId}::UUID,
          ${staffAssignmentId}::UUID,
          ${productionTaskId}::UUID,
          ${employeeId}::UUID,
          NOW()::TIMESTAMP,
          ${location || null}::VARCHAR,
          ${deviceId || null}::VARCHAR
        )
        RETURNING id, employee_id, staff_assignment_id, production_task_id,
                  clock_in_time, clock_in_location, clock_in_device_id,
                  created_at
      `;

      const row = result.rows[0];
      return {
        id: row.id,
        staffAssignmentId: row.staff_assignment_id,
        productionTaskId: row.production_task_id,
        employeeId: row.employee_id,
        clockInTime: row.clock_in_time,
        clockInLocation: row.clock_in_location,
        totalHoursWorked: 0,
        totalMinutesWorked: 0,
        isSubmitted: false,
        isApproved: false,
        createdAt: row.created_at,
      };
    } catch (error) {
      logger.error("[TimeTracking] Error during clock in:", error);
      throw error;
    }
  }

  /**
   * Start a break
   */
  async startBreak(timeTrackingId: string): Promise<boolean> {
    try {
      logger.info("[TimeTracking] Break started", { timeTrackingId });

      const result = await sql`
        UPDATE task_time_tracking
        SET break_start_time = NOW()::TIMESTAMP
        WHERE id = ${timeTrackingId}::UUID
          AND clock_out_time IS NULL
          AND break_start_time IS NULL
        RETURNING id
      `;

      return result.rows.length > 0;
    } catch (error) {
      logger.error("[TimeTracking] Error starting break:", error);
      throw error;
    }
  }

  /**
   * End a break
   */
  async endBreak(timeTrackingId: string): Promise<boolean> {
    try {
      logger.info("[TimeTracking] Break ended", { timeTrackingId });

      const result = await sql`
        UPDATE task_time_tracking
        SET break_end_time = NOW()::TIMESTAMP,
            break_duration_minutes = EXTRACT(EPOCH FROM (NOW()::TIMESTAMP - break_start_time)) / 60
        WHERE id = ${timeTrackingId}::UUID
          AND break_start_time IS NOT NULL
          AND break_end_time IS NULL
        RETURNING break_duration_minutes
      `;

      if (result.rows.length > 0) {
        await this.recalculateTotalHours(timeTrackingId);
        return true;
      }
      return false;
    } catch (error) {
      logger.error("[TimeTracking] Error ending break:", error);
      throw error;
    }
  }

  /**
   * Clock out from a task
   */
  async clockOut(
    timeTrackingId: string,
    location?: string,
    deviceId?: string,
    workQualityNotes?: string,
    taskCompletionPercentage?: number,
  ): Promise<TimeTrackingSession | null> {
    try {
      logger.info("[TimeTracking] Employee clocking out", { timeTrackingId });

      // If still on break, end it first
      const breakCheckResult = await sql`
        SELECT break_start_time, break_end_time FROM task_time_tracking
        WHERE id = ${timeTrackingId}::UUID
      `;

      if (
        breakCheckResult.rows[0]?.break_start_time &&
        !breakCheckResult.rows[0]?.break_end_time
      ) {
        await this.endBreak(timeTrackingId);
      }

      // Update clock out time
      const result = await sql`
        UPDATE task_time_tracking
        SET clock_out_time = NOW()::TIMESTAMP,
            clock_out_location = ${location || null}::VARCHAR,
            clock_out_device_id = ${deviceId || null}::VARCHAR,
            work_quality_notes = ${workQualityNotes || null}::TEXT,
            task_completion_percentage = ${taskCompletionPercentage || 100}::NUMERIC,
            updated_at = NOW()
        WHERE id = ${timeTrackingId}::UUID
        RETURNING id, staff_assignment_id, production_task_id, employee_id,
                  clock_in_time, clock_out_time, break_duration_minutes,
                  work_quality_notes, task_completion_percentage, created_at
      `;

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      // Recalculate total hours
      await this.recalculateTotalHours(timeTrackingId);

      return {
        id: timeTrackingId,
        staffAssignmentId: row.staff_assignment_id,
        productionTaskId: row.production_task_id,
        employeeId: row.employee_id,
        clockInTime: row.clock_in_time,
        clockOutTime: row.clock_out_time,
        breakDurationMinutes: row.break_duration_minutes || 0,
        totalHoursWorked:
          this.calculateHours(
            row.clock_in_time,
            row.clock_out_time,
            row.break_duration_minutes,
          ) || 0,
        totalMinutesWorked:
          this.calculateMinutes(
            row.clock_in_time,
            row.clock_out_time,
            row.break_duration_minutes,
          ) || 0,
        workQualityNotes: row.work_quality_notes,
        taskCompletionPercentage: row.task_completion_percentage,
        isSubmitted: false,
        isApproved: false,
        createdAt: row.created_at,
      };
    } catch (error) {
      logger.error("[TimeTracking] Error during clock out:", error);
      throw error;
    }
  }

  /**
   * Recalculate total hours worked
   */
  private async recalculateTotalHours(timeTrackingId: string): Promise<void> {
    try {
      const result = await sql`
        SELECT clock_in_time, clock_out_time, break_duration_minutes
        FROM task_time_tracking
        WHERE id = ${timeTrackingId}::UUID
      `;

      if (result.rows.length === 0) return;

      const row = result.rows[0];
      if (!row.clock_out_time) return;

      const minutes = this.calculateMinutes(
        row.clock_in_time,
        row.clock_out_time,
        row.break_duration_minutes,
      );

      const hours = minutes / 60;

      await sql`
        UPDATE task_time_tracking
        SET total_minutes_worked = ${minutes}::INTEGER,
            total_hours_worked = ${hours}::NUMERIC
        WHERE id = ${timeTrackingId}::UUID
      `;
    } catch (error) {
      logger.error("[TimeTracking] Error recalculating hours:", error);
    }
  }

  /**
   * Calculate total minutes worked
   */
  private calculateMinutes(
    clockInTime: string,
    clockOutTime: string | null,
    breakDurationMinutes?: number,
  ): number {
    if (!clockOutTime) return 0;

    const clockIn = new Date(clockInTime).getTime();
    const clockOut = new Date(clockOutTime).getTime();

    let minutes = (clockOut - clockIn) / (1000 * 60);
    if (breakDurationMinutes) {
      minutes -= breakDurationMinutes;
    }

    return Math.round(minutes);
  }

  /**
   * Calculate total hours worked
   */
  private calculateHours(
    clockInTime: string,
    clockOutTime: string | null,
    breakDurationMinutes?: number,
  ): number {
    const minutes = this.calculateMinutes(
      clockInTime,
      clockOutTime,
      breakDurationMinutes,
    );
    return Math.round((minutes / 60) * 100) / 100;
  }

  /**
   * Get current time tracking session for an employee
   */
  async getActiveSession(
    employeeId: string,
  ): Promise<TimeTrackingSession | null> {
    try {
      const result = await sql`
        SELECT id, staff_assignment_id, production_task_id, employee_id,
               clock_in_time, clock_in_location, break_start_time,
               break_end_time, break_duration_minutes, total_hours_worked,
               total_minutes_worked, work_quality_notes, task_completion_percentage,
               is_submitted, is_approved, created_at
        FROM task_time_tracking
        WHERE employee_id = ${employeeId}::UUID
          AND clock_out_time IS NULL
        LIMIT 1
      `;

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        staffAssignmentId: row.staff_assignment_id,
        productionTaskId: row.production_task_id,
        employeeId: row.employee_id,
        clockInTime: row.clock_in_time,
        clockInLocation: row.clock_in_location,
        breakStartTime: row.break_start_time,
        breakEndTime: row.break_end_time,
        breakDurationMinutes: row.break_duration_minutes,
        totalHoursWorked: parseFloat(row.total_hours_worked || "0"),
        totalMinutesWorked: row.total_minutes_worked || 0,
        workQualityNotes: row.work_quality_notes,
        taskCompletionPercentage: row.task_completion_percentage,
        isSubmitted: row.is_submitted,
        isApproved: row.is_approved,
        createdAt: row.created_at,
      };
    } catch (error) {
      logger.error("[TimeTracking] Error retrieving active session:", error);
      return null;
    }
  }

  /**
   * Get time tracking session details
   */
  async getSession(
    timeTrackingId: string,
  ): Promise<TimeTrackingSession | null> {
    try {
      const result = await sql`
        SELECT id, staff_assignment_id, production_task_id, employee_id,
               clock_in_time, clock_in_location, clock_out_time, clock_out_location,
               break_start_time, break_end_time, break_duration_minutes,
               total_hours_worked, total_minutes_worked, work_quality_notes,
               task_completion_percentage, is_submitted, is_approved,
               submitted_at, approved_at, approved_by_user_id, created_at
        FROM task_time_tracking
        WHERE id = ${timeTrackingId}::UUID
      `;

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        staffAssignmentId: row.staff_assignment_id,
        productionTaskId: row.production_task_id,
        employeeId: row.employee_id,
        clockInTime: row.clock_in_time,
        clockInLocation: row.clock_in_location,
        clockOutTime: row.clock_out_time,
        clockOutLocation: row.clock_out_location,
        breakStartTime: row.break_start_time,
        breakEndTime: row.break_end_time,
        breakDurationMinutes: row.break_duration_minutes,
        totalHoursWorked: parseFloat(row.total_hours_worked || "0"),
        totalMinutesWorked: row.total_minutes_worked || 0,
        workQualityNotes: row.work_quality_notes,
        taskCompletionPercentage: row.task_completion_percentage,
        isSubmitted: row.is_submitted,
        isApproved: row.is_approved,
        submittedAt: row.submitted_at,
        approvedAt: row.approved_at,
        approvedByUserId: row.approved_by_user_id,
        createdAt: row.created_at,
      };
    } catch (error) {
      logger.error("[TimeTracking] Error retrieving session:", error);
      return null;
    }
  }

  /**
   * Submit time tracking for approval
   */
  async submitTimeTracking(timeTrackingId: string): Promise<boolean> {
    try {
      logger.info("[TimeTracking] Submitting time tracking for approval", {
        timeTrackingId,
      });

      const result = await sql`
        UPDATE task_time_tracking
        SET is_submitted = TRUE,
            submitted_at = NOW(),
            updated_at = NOW()
        WHERE id = ${timeTrackingId}::UUID AND clock_out_time IS NOT NULL
        RETURNING id
      `;

      return result.rows.length > 0;
    } catch (error) {
      logger.error("[TimeTracking] Error submitting time tracking:", error);
      return false;
    }
  }

  /**
   * Approve time tracking
   */
  async approveTimeTracking(
    timeTrackingId: string,
    approverUserId: string,
  ): Promise<boolean> {
    try {
      logger.info("[TimeTracking] Approving time tracking", { timeTrackingId });

      const result = await sql`
        UPDATE task_time_tracking
        SET is_approved = TRUE,
            approved_at = NOW(),
            approved_by_user_id = ${approverUserId}::UUID,
            updated_at = NOW()
        WHERE id = ${timeTrackingId}::UUID AND is_submitted = TRUE
        RETURNING id
      `;

      return result.rows.length > 0;
    } catch (error) {
      logger.error("[TimeTracking] Error approving time tracking:", error);
      return false;
    }
  }

  /**
   * Record a time adjustment
   */
  async recordAdjustment(
    orgId: string,
    timeTrackingId: string,
    adjustmentType: string,
    originalValue: string,
    newValue: string,
    reasonForAdjustment: string,
    adjustedByUserId: string,
  ): Promise<TimeTrackingAdjustment | null> {
    try {
      logger.info("[TimeTracking] Recording time adjustment", {
        timeTrackingId,
        adjustmentType,
      });

      const result = await sql`
        INSERT INTO time_tracking_adjustments (
          id,
          org_id,
          time_tracking_id,
          adjustment_type,
          original_value,
          new_value,
          reason_for_adjustment,
          adjusted_by_user_id
        ) VALUES (
          gen_random_uuid(),
          ${orgId}::UUID,
          ${timeTrackingId}::UUID,
          ${adjustmentType}::VARCHAR,
          ${originalValue}::VARCHAR,
          ${newValue}::VARCHAR,
          ${reasonForAdjustment}::TEXT,
          ${adjustedByUserId}::UUID
        )
        RETURNING id, time_tracking_id, adjustment_type, original_value,
                  new_value, reason_for_adjustment, adjusted_by_user_id, adjusted_at
      `;

      const row = result.rows[0];
      return {
        id: row.id,
        timeTrackingId: row.time_tracking_id,
        adjustmentType: row.adjustment_type,
        originalValue: row.original_value,
        newValue: row.new_value,
        reasonForAdjustment: row.reason_for_adjustment,
        adjustedByUserId: row.adjusted_by_user_id,
        adjustedAt: row.adjusted_at,
      };
    } catch (error) {
      logger.error("[TimeTracking] Error recording adjustment:", error);
      return null;
    }
  }

  /**
   * Get time tracking history for an employee
   */
  async getEmployeeHistory(
    employeeId: string,
    limit: number = 30,
  ): Promise<TimeTrackingSession[]> {
    try {
      const result = await sql`
        SELECT id, staff_assignment_id, production_task_id, employee_id,
               clock_in_time, clock_in_location, clock_out_time, clock_out_location,
               break_start_time, break_end_time, break_duration_minutes,
               total_hours_worked, total_minutes_worked, work_quality_notes,
               task_completion_percentage, is_submitted, is_approved,
               submitted_at, approved_at, approved_by_user_id, created_at
        FROM task_time_tracking
        WHERE employee_id = ${employeeId}::UUID
        ORDER BY created_at DESC
        LIMIT ${limit}::INTEGER
      `;

      return result.rows.map((row) => ({
        id: row.id,
        staffAssignmentId: row.staff_assignment_id,
        productionTaskId: row.production_task_id,
        employeeId: row.employee_id,
        clockInTime: row.clock_in_time,
        clockInLocation: row.clock_in_location,
        clockOutTime: row.clock_out_time,
        clockOutLocation: row.clock_out_location,
        breakStartTime: row.break_start_time,
        breakEndTime: row.break_end_time,
        breakDurationMinutes: row.break_duration_minutes,
        totalHoursWorked: parseFloat(row.total_hours_worked || "0"),
        totalMinutesWorked: row.total_minutes_worked || 0,
        workQualityNotes: row.work_quality_notes,
        taskCompletionPercentage: row.task_completion_percentage,
        isSubmitted: row.is_submitted,
        isApproved: row.is_approved,
        submittedAt: row.submitted_at,
        approvedAt: row.approved_at,
        approvedByUserId: row.approved_by_user_id,
        createdAt: row.created_at,
      }));
    } catch (error) {
      logger.error("[TimeTracking] Error retrieving employee history:", error);
      return [];
    }
  }

  /**
   * Get pending approvals for a department
   */
  async getPendingApprovals(
    departmentId: string,
    limit: number = 50,
  ): Promise<TimeTrackingSession[]> {
    try {
      const result = await sql`
        SELECT ttt.id, ttt.staff_assignment_id, ttt.production_task_id,
               ttt.employee_id, ttt.clock_in_time, ttt.clock_out_time,
               ttt.total_hours_worked, ttt.work_quality_notes,
               ttt.task_completion_percentage, ttt.is_submitted, ttt.is_approved,
               ttt.submitted_at, ttt.created_at
        FROM task_time_tracking ttt
        JOIN staff_task_assignments sta ON ttt.staff_assignment_id = sta.id
        JOIN maestro_production_tasks mpt ON sta.production_task_id = mpt.id
        WHERE mpt.department_id = ${departmentId}::UUID
          AND ttt.is_submitted = TRUE
          AND ttt.is_approved = FALSE
        ORDER BY ttt.submitted_at
        LIMIT ${limit}::INTEGER
      `;

      return result.rows.map((row) => ({
        id: row.id,
        staffAssignmentId: row.staff_assignment_id,
        productionTaskId: row.production_task_id,
        employeeId: row.employee_id,
        clockInTime: row.clock_in_time,
        clockOutTime: row.clock_out_time,
        totalHoursWorked: parseFloat(row.total_hours_worked || "0"),
        totalMinutesWorked: 0,
        workQualityNotes: row.work_quality_notes,
        taskCompletionPercentage: row.task_completion_percentage,
        isSubmitted: row.is_submitted,
        isApproved: row.is_approved,
        submittedAt: row.submitted_at,
        createdAt: row.created_at,
      }));
    } catch (error) {
      logger.error("[TimeTracking] Error retrieving pending approvals:", error);
      return [];
    }
  }

  /**
   * Get total hours worked for a staff member in a date range
   */
  async getTotalHoursWorked(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    try {
      const result = await sql`
        SELECT COALESCE(SUM(total_hours_worked), 0) as total_hours
        FROM task_time_tracking
        WHERE employee_id = ${employeeId}::UUID
          AND is_approved = TRUE
          AND created_at >= ${startDate.toISOString()}::TIMESTAMP
          AND created_at <= ${endDate.toISOString()}::TIMESTAMP
      `;

      return parseFloat(result.rows[0]?.total_hours || "0");
    } catch (error) {
      logger.error("[TimeTracking] Error calculating total hours:", error);
      return 0;
    }
  }
}

export const mobileTimeTracking = new MobileTimeTrackingService();
