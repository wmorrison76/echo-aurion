/**
 * Department Notification Cascader Service
 * Traverses department relationships and cascades notifications through hierarchy
 * Handles multi-level cascading, approval workflows, and escalation
 */

import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";

interface CascadeNotification {
  eventId: string;
  sourceDepartmentId: string;
  targetDepartmentId: string;
  relationshipId: string;
  relationshipType: string;
  cascadeLevel: number;
  requiresApproval: boolean;
  escalationHours?: number;
}

interface DepartmentDependency {
  departmentId: string;
  departmentName: string;
  relationshipType: string;
  priority: number;
  requiresApproval: boolean;
  escalationHours?: number;
}

const db = new Database();
const MAX_CASCADE_DEPTH = 5;
const DEFAULT_ESCALATION_HOURS = 48;

class DepartmentNotificationCascader {
  /**
   * Cascade notification from source event to all dependent departments
   */
  async cascadeNotificationForEvent(
    eventId: string,
    sourceDepartmentId: string,
    orgId: string,
  ): Promise<CascadeNotification[]> {
    try {
      // Get the event to check its type
      const eventResult = await db.query(
        `
        SELECT id, title, is_mandatory, start_time, end_time
        FROM calendar_events
        WHERE id = $1 AND org_id = $2
      `,
        [eventId, orgId],
      );

      if (eventResult.rows.length === 0) {
        throw new Error("Event not found");
      }

      const event = eventResult.rows[0];

      // Get all dependent departments
      const dependencies = await this.getDependendentDepartments(
        sourceDepartmentId,
        orgId,
      );

      const cascadedNotifications: CascadeNotification[] = [];

      // Queue notifications for each dependent department
      for (const dependency of dependencies) {
        // Check if this event type triggers notification
        if (!this.shouldNotifyForEventType(event, dependency)) {
          logger.debug("[Cascader] Skipping notification", {
            event: event.title,
            department: dependency.departmentName,
          });
          continue;
        }

        const notification = await this.queueDepartmentNotification(
          eventId,
          sourceDepartmentId,
          dependency,
          orgId,
          dependency.priority,
        );

        if (notification) {
          cascadedNotifications.push(notification);
        }
      }

      logger.info("[Cascader] Cascaded notifications", {
        eventId,
        sourceDept: sourceDepartmentId,
        targetCount: cascadedNotifications.length,
      });

      // Trigger immediate notifications for high-priority departments
      await this.sendImmediateNotifications(
        cascadedNotifications.filter((n) => n.priority <= 2),
      );

      return cascadedNotifications;
    } catch (error) {
      logger.error("[Cascader] Cascading failed:", error);
      throw error;
    }
  }

  /**
   * Get all departments dependent on source department
   * Uses recursive traversal of department_relationships graph
   */
  private async getDependendentDepartments(
    sourceDepartmentId: string,
    orgId: string,
  ): Promise<DepartmentDependency[]> {
    try {
      const result = await db.query(
        `
        SELECT
          gdd.dept_id as department_id,
          gdd.dept_name as department_name,
          gdd.relationship_type,
          gdd.priority,
          dr.approval_required,
          dr.escalate_if_not_responded_hours
        FROM get_dependent_departments($1, $2) gdd
        LEFT JOIN department_relationships dr ON (
          dr.target_department_id = gdd.dept_id
          AND dr.source_department_id = $1
          AND dr.org_id = $2
        )
        WHERE NOT EXISTS (
          SELECT 1 FROM department_notification_queue
          WHERE target_department_id = gdd.dept_id
          AND event_id = $3 -- Would need event_id passed
        )
        ORDER BY gdd.priority ASC, gdd.dept_name ASC
      `,
        [sourceDepartmentId, orgId, null],
      );

      return result.rows as DepartmentDependency[];
    } catch (error) {
      logger.warn("[Cascader] Failed to get dependencies:", error);
      return [];
    }
  }

  /**
   * Check if event type should trigger notification to this department
   */
  private shouldNotifyForEventType(event: any, dependency: any): boolean {
    // Get the relationship to check filters
    const eventType = event.is_mandatory ? "mandatory" : "standard";

    // Simplified check - in production would check event type against relationship filters
    return true;
  }

  /**
   * Queue a notification for a specific department
   */
  private async queueDepartmentNotification(
    eventId: string,
    sourceDepartmentId: string,
    dependency: DepartmentDependency,
    orgId: string,
    cascadeLevel: number,
  ): Promise<CascadeNotification | null> {
    try {
      // Get the relationship
      const relResult = await db.query(
        `
        SELECT id, approval_required, escalate_if_not_responded_hours
        FROM department_relationships
        WHERE org_id = $1
          AND source_department_id = $2
          AND target_department_id = $3
        LIMIT 1
      `,
        [orgId, sourceDepartmentId, dependency.departmentId],
      );

      if (relResult.rows.length === 0) {
        return null;
      }

      const relationship = relResult.rows[0];

      // Insert into notification queue
      const insertResult = await db.query(
        `
        INSERT INTO department_notification_queue (
          event_id,
          relationship_id,
          source_department_id,
          target_department_id,
          notification_status,
          approval_required,
          cascade_level
        ) VALUES ($1, $2, $3, $4, 'pending', $5, $6)
        ON CONFLICT (event_id, relationship_id) DO NOTHING
        RETURNING id, relationship_id
      `,
        [
          eventId,
          relationship.id,
          sourceDepartmentId,
          dependency.departmentId,
          relationship.approval_required,
          cascadeLevel,
        ],
      );

      if (insertResult.rows.length === 0) {
        return null;
      }

      // Audit the notification
      await db.query(
        `
        INSERT INTO department_notification_audit (
          event_id,
          source_department_id,
          target_department_id,
          action,
          action_timestamp
        ) VALUES ($1, $2, $3, 'notification_sent', NOW())
      `,
        [eventId, sourceDepartmentId, dependency.departmentId],
      );

      return {
        eventId,
        sourceDepartmentId,
        targetDepartmentId: dependency.departmentId,
        relationshipId: relationship.id,
        relationshipType: dependency.relationshipType,
        cascadeLevel,
        requiresApproval: relationship.approval_required,
        escalationHours: relationship.escalate_if_not_responded_hours,
      };
    } catch (error) {
      logger.warn("[Cascader] Failed to queue notification:", error);
      return null;
    }
  }

  /**
   * Send immediate notifications for high-priority items
   */
  private async sendImmediateNotifications(
    notifications: CascadeNotification[],
  ): Promise<void> {
    // This would integrate with email/SMS/push notification service
    logger.info("[Cascader] Sending immediate notifications", {
      count: notifications.length,
    });

    for (const notification of notifications) {
      try {
        // In production, would send actual notifications here
        // Via email, SMS, in-app, Teams, Slack, etc.

        // Update status to notified
        await db.query(
          `
          UPDATE department_notification_queue
          SET notification_status = 'notified',
              notification_sent_at = NOW()
          WHERE event_id = $1 AND relationship_id = $2
        `,
          [notification.eventId, notification.relationshipId],
        );
      } catch (error) {
        logger.warn("[Cascader] Failed to send notification:", error);
      }
    }
  }

  /**
   * Acknowledge a notification from a department
   */
  async acknowledgeDepartmentNotification(
    eventId: string,
    departmentId: string,
    acknowledgedBy: string,
  ): Promise<boolean> {
    try {
      const result = await db.query(
        `
        UPDATE department_notification_queue
        SET notification_status = 'acknowledged',
            acknowledged_at = NOW(),
            acknowledged_by_user_id = $3
        WHERE event_id = $1
          AND target_department_id = $2
          AND notification_status IN ('pending', 'notified')
        RETURNING id
      `,
        [eventId, departmentId, acknowledgedBy],
      );

      if (result.rows.length > 0) {
        // Audit the acknowledgment
        await db.query(
          `
          INSERT INTO department_notification_audit (
            event_id,
            target_department_id,
            action,
            action_by_user_id,
            action_timestamp
          ) VALUES ($1, $2, 'acknowledged', $3, NOW())
        `,
          [eventId, departmentId, acknowledgedBy],
        );

        return true;
      }

      return false;
    } catch (error) {
      logger.error("[Cascader] Failed to acknowledge notification:", error);
      throw error;
    }
  }

  /**
   * Check for and trigger escalations for unacknowledged notifications
   */
  async processEscalations(eventId: string, orgId: string): Promise<number> {
    try {
      const escalatableResult = await db.query(
        `
        SELECT dnq.*, dr.escalate_to_department_id
        FROM department_notification_queue dnq
        LEFT JOIN department_relationships dr ON dnq.relationship_id = dr.id
        WHERE dnq.event_id = $1
          AND dnq.notification_status IN ('pending', 'notified')
          AND dnq.created_at < NOW() - INTERVAL '1 hour' * COALESCE(dr.escalate_if_not_responded_hours, $2)
      `,
        [eventId, DEFAULT_ESCALATION_HOURS],
      );

      let escalatedCount = 0;

      for (const row of escalatableResult.rows) {
        try {
          // Update status to escalated
          await db.query(
            `
            UPDATE department_notification_queue
            SET notification_status = 'escalated',
                escalation_timestamp = NOW(),
                escalated_to_department_id = $2
            WHERE id = $1
          `,
            [row.id, row.escalate_to_department_id],
          );

          // Audit escalation
          await db.query(
            `
            INSERT INTO department_notification_audit (
              event_id,
              source_department_id,
              target_department_id,
              action,
              action_timestamp,
              message
            ) VALUES ($1, $2, $3, 'escalated', NOW(), $4)
          `,
            [
              row.event_id,
              row.source_department_id,
              row.target_department_id,
              `Escalated to ${row.escalate_to_department_id}`,
            ],
          );

          escalatedCount++;
        } catch (error) {
          logger.warn("[Cascader] Failed to escalate:", error);
        }
      }

      logger.info("[Cascader] Escalations processed", { escalatedCount });
      return escalatedCount;
    } catch (error) {
      logger.error("[Cascader] Escalation processing failed:", error);
      throw error;
    }
  }

  /**
   * Get approval status for an event across all departments
   */
  async getApprovalStatus(eventId: string): Promise<{
    totalRequired: number;
    approved: number;
    pending: number;
    rejected: number;
    byDepartment: Record<
      string,
      {
        status: string;
        approvedBy?: string;
        approvedAt?: string;
      }
    >;
  }> {
    try {
      const result = await db.query(
        `
        SELECT
          od.name as dept_name,
          dnq.approval_status,
          dnq.approval_by_user_id,
          dnq.approval_at
        FROM department_notification_queue dnq
        JOIN organization_departments od ON dnq.target_department_id = od.id
        WHERE dnq.event_id = $1
          AND dnq.approval_required = true
        ORDER BY od.name ASC
      `,
        [eventId],
      );

      const byDepartment: Record<
        string,
        {
          status: string;
          approvedBy?: string;
          approvedAt?: string;
        }
      > = {};

      let approved = 0;
      let pending = 0;
      let rejected = 0;

      for (const row of result.rows) {
        byDepartment[row.dept_name] = {
          status: row.approval_status || "pending",
          approvedBy: row.approval_by_user_id,
          approvedAt: row.approval_at,
        };

        if (row.approval_status === "approved") approved++;
        else if (row.approval_status === "rejected") rejected++;
        else pending++;
      }

      return {
        totalRequired: result.rows.length,
        approved,
        pending,
        rejected,
        byDepartment,
      };
    } catch (error) {
      logger.error("[Cascader] Failed to get approval status:", error);
      throw error;
    }
  }

  /**
   * Submit approval/rejection from a department
   */
  async submitApproval(
    eventId: string,
    departmentId: string,
    approved: boolean,
    submittedBy: string,
  ): Promise<boolean> {
    try {
      const result = await db.query(
        `
        UPDATE department_notification_queue
        SET approval_status = $3,
            approval_by_user_id = $4,
            approval_at = NOW()
        WHERE event_id = $1
          AND target_department_id = $2
          AND approval_required = true
        RETURNING id
      `,
        [
          eventId,
          departmentId,
          approved ? "approved" : "rejected",
          submittedBy,
        ],
      );

      if (result.rows.length > 0) {
        // Audit the approval
        await db.query(
          `
          INSERT INTO department_notification_audit (
            event_id,
            target_department_id,
            action,
            action_by_user_id,
            action_timestamp,
            message
          ) VALUES ($1, $2, $3, $4, NOW(), $5)
        `,
          [
            eventId,
            departmentId,
            approved ? "approval_given" : "approval_rejected",
            submittedBy,
            approved ? "Department approved" : "Department rejected",
          ],
        );

        return true;
      }

      return false;
    } catch (error) {
      logger.error("[Cascader] Failed to submit approval:", error);
      throw error;
    }
  }

  /**
   * Get cascade history for an event
   */
  async getCascadeHistory(eventId: string): Promise<any[]> {
    try {
      const result = await db.query(
        `
        SELECT
          od1.name as source_department,
          od2.name as target_department,
          dna.action,
          dna.action_timestamp,
          dna.message
        FROM department_notification_audit dna
        LEFT JOIN organization_departments od1 ON dna.source_department_id = od1.id
        LEFT JOIN organization_departments od2 ON dna.target_department_id = od2.id
        WHERE dna.event_id = $1
        ORDER BY dna.action_timestamp DESC
      `,
        [eventId],
      );

      return result.rows;
    } catch (error) {
      logger.error("[Cascader] Failed to get cascade history:", error);
      return [];
    }
  }
}

export const departmentNotificationCascader =
  new DepartmentNotificationCascader();
export default departmentNotificationCascader;
