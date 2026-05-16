/**
 * Mandatory Event Service
 * Handles creation and management of mandatory events with department dependencies
 * Auto-populates acknowledgment queues and sends notifications
 */

import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";
import { broadcastCalendarEventToOrg } from "./calendar-websocket-broadcaster";

interface MandatoryEventPayload {
  eventId: string;
  orgId: string;
  createdBy: string;
  departments: Array<{
    name: string;
    isPrimaryOrganizer: boolean;
    requiredRole: "MANAGER" | "ALL_STAFF" | "SPECIFIC_ROLE" | "LEADERSHIP_ONLY";
    notificationType?: "email_only" | "in_app_only" | "email_and_in_app";
    reminderHoursBefore?: number;
    autoEscalateAfterHours?: number;
  }>;
  enforcementPolicy?: "notify" | "escalate" | "block_checkin" | "full_lock";
  enforcementEnabled?: boolean;
}

const db = new Database();

class MandatoryEventService {
  /**
   * Create a mandatory event with department dependencies
   */
  async createMandatoryEvent(payload: MandatoryEventPayload): Promise<boolean> {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      // 1. Mark event as mandatory
      await client.query(
        `
        UPDATE calendar_events
        SET is_mandatory = true,
            requires_acknowledgment = true,
            acknowledgment_deadline = end_time + INTERVAL '24 hours',
            enforcement_policy = $2,
            enforcement_enabled = $3
        WHERE id = $1
      `,
        [
          payload.eventId,
          payload.enforcementPolicy || "notify",
          payload.enforcementEnabled ?? true,
        ],
      );

      // 2. Add department dependencies
      for (const dept of payload.departments) {
        await client.query(
          `
          INSERT INTO calendar_event_department_dependencies (
            event_id, department, is_primary_organizer, required_role,
            notification_type, reminder_hours_before, auto_escalate_after_hours
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `,
          [
            payload.eventId,
            dept.name,
            dept.isPrimaryOrganizer || false,
            dept.requiredRole,
            dept.notificationType || "email_and_in_app",
            dept.reminderHoursBefore || 24,
            dept.autoEscalateAfterHours || 48,
          ],
        );
      }

      // 3. Populate acknowledgment queue
      const queueResult = await this.populateAcknowledgmentQueue(
        client,
        payload.eventId,
        payload.orgId,
        payload.departments,
      );

      logger.info(
        "[MandatoryEvent] Created mandatory event with dependencies",
        {
          eventId: payload.eventId,
          departmentCount: payload.departments.length,
          queueCount: queueResult.totalQueued,
          createdBy: payload.createdBy,
        },
      );

      // 4. Broadcast to organization
      const eventResult = await client.query(
        `SELECT * FROM calendar_events WHERE id = $1`,
        [payload.eventId],
      );

      if (eventResult.rows[0]) {
        broadcastCalendarEventToOrg(
          payload.orgId,
          eventResult.rows[0],
          "mandatory_created",
          payload.createdBy,
        );
      }

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("[MandatoryEvent] Failed to create mandatory event", {
        error: error instanceof Error ? error.message : String(error),
        eventId: payload.eventId,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Populate the acknowledgment queue for a mandatory event
   */
  private async populateAcknowledgmentQueue(
    client: any,
    eventId: string,
    orgId: string,
    departments: Array<{
      name: string;
      requiredRole: string;
    }>,
  ): Promise<{ totalQueued: number }> {
    let totalQueued = 0;

    for (const dept of departments) {
      // Get all employees in this department with the required role
      let employeeQuery = `
        SELECT DISTINCT id, email, department
        FROM employee_profiles
        WHERE org_id = $1 AND department = $2
      `;

      const params: any[] = [orgId, dept.name];

      // Filter by role if needed
      if (dept.requiredRole !== "ALL_STAFF") {
        employeeQuery += ` AND position_title ILIKE $3`;
        params.push(`%${this.mapRoleToTitle(dept.requiredRole)}%`);
      }

      const employeeResult = await client.query(employeeQuery, params);

      // Insert acknowledgment queue entries
      for (const employee of employeeResult.rows) {
        try {
          await client.query(
            `
            INSERT INTO calendar_event_acknowledgment_queue (
              event_id, employee_id, department, required_role,
              status, notification_sent_at
            ) VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (event_id, employee_id) DO NOTHING
          `,
            [eventId, employee.id, dept.name, dept.requiredRole, "pending"],
          );
          totalQueued++;
        } catch (error) {
          logger.warn("[MandatoryEvent] Failed to queue employee", {
            error,
            employeeId: employee.id,
            eventId,
          });
        }
      }
    }

    return { totalQueued };
  }

  /**
   * Map required role to job title patterns
   */
  private mapRoleToTitle(requiredRole: string): string {
    const mapping: Record<string, string> = {
      MANAGER: "Manager|Director|Chef",
      LEADERSHIP_ONLY: "Executive|Director|Chef|Manager",
      SPECIFIC_ROLE: "Server|Bartender|Cook|Sous",
      ALL_STAFF: "",
    };
    return mapping[requiredRole] || "";
  }

  /**
   * Record an acknowledgment
   */
  async recordAcknowledgment(
    eventId: string,
    employeeId: string,
    method: "in_app" | "email_link" | "sms" | "manager_override" = "in_app",
  ): Promise<boolean> {
    try {
      const result = await db.query(
        `
        UPDATE calendar_event_acknowledgment_queue
        SET status = 'acknowledged',
            acknowledged_at = NOW(),
            acknowledged_by_user_id = $2,
            acknowledgment_method = $3
        WHERE event_id = $1 AND employee_id = $2 AND status = 'pending'
        RETURNING id
      `,
        [eventId, employeeId, method],
      );

      if (result.rows.length === 0) {
        logger.warn(
          "[MandatoryEvent] Acknowledgment not found or already acknowledged",
          {
            eventId,
            employeeId,
          },
        );
        return false;
      }

      logger.info("[MandatoryEvent] Acknowledgment recorded", {
        eventId,
        employeeId,
        method,
      });

      return true;
    } catch (error) {
      logger.error("[MandatoryEvent] Failed to record acknowledgment", {
        error: error instanceof Error ? error.message : String(error),
        eventId,
        employeeId,
      });
      throw error;
    }
  }

  /**
   * Get acknowledgment status for an event
   */
  async getAcknowledgmentStatus(eventId: string): Promise<{
    total: number;
    acknowledged: number;
    pending: number;
    escalated: number;
    percentAcknowledged: number;
    byDepartment: Record<
      string,
      { total: number; acknowledged: number; pending: number }
    >;
  }> {
    try {
      const result = await db.query(
        `
        SELECT
          department,
          status,
          COUNT(*) as count
        FROM calendar_event_acknowledgment_queue
        WHERE event_id = $1
        GROUP BY department, status
      `,
        [eventId],
      );

      const byDepartment: Record<
        string,
        { total: number; acknowledged: number; pending: number }
      > = {};
      let total = 0;
      let acknowledged = 0;
      let pending = 0;
      let escalated = 0;

      for (const row of result.rows) {
        if (!byDepartment[row.department]) {
          byDepartment[row.department] = {
            total: 0,
            acknowledged: 0,
            pending: 0,
          };
        }

        byDepartment[row.department].total += row.count;
        total += row.count;

        if (row.status === "acknowledged") {
          byDepartment[row.department].acknowledged += row.count;
          acknowledged += row.count;
        } else if (row.status === "pending") {
          byDepartment[row.department].pending += row.count;
          pending += row.count;
        } else if (row.status === "escalated") {
          escalated += row.count;
        }
      }

      return {
        total,
        acknowledged,
        pending,
        escalated,
        percentAcknowledged:
          total > 0 ? Math.round((acknowledged / total) * 100) : 0,
        byDepartment,
      };
    } catch (error) {
      logger.error("[MandatoryEvent] Failed to get acknowledgment status", {
        error: error instanceof Error ? error.message : String(error),
        eventId,
      });
      throw error;
    }
  }

  /**
   * Trigger escalation for unacknowledged items
   */
  async triggerEscalation(eventId: string): Promise<number> {
    try {
      // Get pending acknowledgments
      const pendingResult = await db.query(
        `
        SELECT ceaq.*, ep.manager_id
        FROM calendar_event_acknowledgment_queue ceaq
        LEFT JOIN employee_profiles ep ON ceaq.employee_id = ep.id
        WHERE ceaq.event_id = $1 AND ceaq.status = 'pending'
      `,
        [eventId],
      );

      let escalatedCount = 0;

      for (const row of pendingResult.rows) {
        // Only escalate if manager exists
        if (row.manager_id) {
          await db.query(
            `
            UPDATE calendar_event_acknowledgment_queue
            SET status = 'escalated',
                escalation_sent_at = NOW(),
                escalation_target_id = $2
            WHERE id = $1
          `,
            [row.id, row.manager_id],
          );

          escalatedCount++;
        }
      }

      logger.info("[MandatoryEvent] Escalation triggered", {
        eventId,
        escalatedCount,
      });

      return escalatedCount;
    } catch (error) {
      logger.error("[MandatoryEvent] Failed to trigger escalation", {
        error: error instanceof Error ? error.message : String(error),
        eventId,
      });
      throw error;
    }
  }

  /**
   * Check if user can clock in (enforcement check)
   */
  async canUserClockIn(
    employeeId: string,
    eventId: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Get the event and check enforcement
      const eventResult = await db.query(
        `
        SELECT enforcement_policy, enforcement_enabled, start_time, end_time
        FROM calendar_events
        WHERE id = $1 AND is_mandatory = true AND enforcement_enabled = true
      `,
        [eventId],
      );

      if (eventResult.rows.length === 0) {
        return { allowed: true }; // Event doesn't enforce
      }

      const event = eventResult.rows[0];
      const enforcementPolicy = event.enforcement_policy;

      // Check if user has acknowledged
      const ackResult = await db.query(
        `
        SELECT status FROM calendar_event_acknowledgment_queue
        WHERE event_id = $1 AND employee_id = $2
      `,
        [eventId, employeeId],
      );

      if (ackResult.rows.length === 0) {
        return { allowed: true }; // Not in acknowledgment queue
      }

      const status = ackResult.rows[0].status;

      // Determine if clock-in is allowed based on policy and status
      if (enforcementPolicy === "block_checkin" && status === "pending") {
        return {
          allowed: false,
          reason: "You must acknowledge the mandatory event before clocking in",
        };
      }

      if (enforcementPolicy === "full_lock" && status !== "acknowledged") {
        return {
          allowed: false,
          reason: "Full lock on mandatory event - acknowledgment required",
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error("[MandatoryEvent] Failed to check clock-in permission", {
        error: error instanceof Error ? error.message : String(error),
        employeeId,
        eventId,
      });
      return { allowed: true }; // Fail open
    }
  }
}

export const mandatoryEventService = new MandatoryEventService();
export default mandatoryEventService;
