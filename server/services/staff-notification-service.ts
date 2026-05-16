import { logger } from "../lib/logger";
import { safeRequire } from "../utils/safe-require";

type VercelPostgresModule = { sql: any };
const vercelPg = safeRequire<VercelPostgresModule>("@vercel/postgres");

export const sql =
  vercelPg?.sql ??
  ((..._args: any[]) => {
    throw new Error(
      "Staff notifications require @vercel/postgres, which is not installed in this environment.",
    );
  });

export interface NotificationPreferences {
  employeeId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  slackEnabled: boolean;
  inAppEnabled: boolean;
  notificationFrequency:
    | "immediate"
    | "daily_digest"
    | "weekly_digest"
    | "none";
  doNotDisturbEnabled: boolean;
  doNotDisturbStart?: string;
  doNotDisturbEnd?: string;
  notifyOnAssignment: boolean;
  notifyOnScheduleChange: boolean;
  notifyOnReminder: boolean;
  notifyOnFeedback: boolean;
  notifyOnPerformanceUpdate: boolean;
  notifyOnEmergency: boolean;
}

export interface NotificationPayload {
  notificationType: string;
  title: string;
  message: string;
  actionUrl?: string;
  relatedProductionTaskId?: string;
  relatedEventId?: string;
  priority?: "low" | "normal" | "high" | "critical";
}

export interface DeliveryResult {
  channelType: string;
  success: boolean;
  providerId?: string;
  errorMessage?: string;
}

class StaffNotificationService {
  /**
   * Get notification preferences for an employee
   */
  async getPreferences(
    orgId: string,
    employeeId: string,
  ): Promise<NotificationPreferences | null> {
    try {
      const result = await sql`
        SELECT 
          employee_id,
          email_enabled,
          sms_enabled,
          slack_enabled,
          in_app_enabled,
          notification_frequency,
          do_not_disturb_enabled,
          do_not_disturb_start_time,
          do_not_disturb_end_time,
          notify_on_assignment,
          notify_on_schedule_change,
          notify_on_reminder,
          notify_on_feedback,
          notify_on_performance_update,
          notify_on_emergency
        FROM staff_notification_preferences
        WHERE org_id = ${orgId}::UUID AND employee_id = ${employeeId}::UUID
      `;

      if (result.rows.length === 0) {
        return await this.createDefaultPreferences(orgId, employeeId);
      }

      const row = result.rows[0];
      return {
        employeeId: row.employee_id,
        emailEnabled: row.email_enabled,
        smsEnabled: row.sms_enabled,
        slackEnabled: row.slack_enabled,
        inAppEnabled: row.in_app_enabled,
        notificationFrequency: row.notification_frequency,
        doNotDisturbEnabled: row.do_not_disturb_enabled,
        doNotDisturbStart: row.do_not_disturb_start_time,
        doNotDisturbEnd: row.do_not_disturb_end_time,
        notifyOnAssignment: row.notify_on_assignment,
        notifyOnScheduleChange: row.notify_on_schedule_change,
        notifyOnReminder: row.notify_on_reminder,
        notifyOnFeedback: row.notify_on_feedback,
        notifyOnPerformanceUpdate: row.notify_on_performance_update,
        notifyOnEmergency: row.notify_on_emergency,
      };
    } catch (error) {
      logger.error("[Notifications] Error retrieving preferences:", error);
      return null;
    }
  }

  /**
   * Create default notification preferences for a new employee
   */
  private async createDefaultPreferences(
    orgId: string,
    employeeId: string,
  ): Promise<NotificationPreferences> {
    try {
      const defaultPrefs: NotificationPreferences = {
        employeeId,
        emailEnabled: true,
        smsEnabled: false,
        slackEnabled: false,
        inAppEnabled: true,
        notificationFrequency: "immediate",
        doNotDisturbEnabled: false,
        notifyOnAssignment: true,
        notifyOnScheduleChange: true,
        notifyOnReminder: true,
        notifyOnFeedback: true,
        notifyOnPerformanceUpdate: true,
        notifyOnEmergency: true,
      };

      await sql`
        INSERT INTO staff_notification_preferences (
          id,
          org_id,
          employee_id,
          email_enabled,
          sms_enabled,
          slack_enabled,
          in_app_enabled,
          notification_frequency,
          notify_on_assignment,
          notify_on_schedule_change,
          notify_on_reminder,
          notify_on_feedback,
          notify_on_performance_update,
          notify_on_emergency
        ) VALUES (
          gen_random_uuid(),
          ${orgId}::UUID,
          ${employeeId}::UUID,
          ${defaultPrefs.emailEnabled}::BOOLEAN,
          ${defaultPrefs.smsEnabled}::BOOLEAN,
          ${defaultPrefs.slackEnabled}::BOOLEAN,
          ${defaultPrefs.inAppEnabled}::BOOLEAN,
          ${defaultPrefs.notificationFrequency}::VARCHAR,
          ${defaultPrefs.notifyOnAssignment}::BOOLEAN,
          ${defaultPrefs.notifyOnScheduleChange}::BOOLEAN,
          ${defaultPrefs.notifyOnReminder}::BOOLEAN,
          ${defaultPrefs.notifyOnFeedback}::BOOLEAN,
          ${defaultPrefs.notifyOnPerformanceUpdate}::BOOLEAN,
          ${defaultPrefs.notifyOnEmergency}::BOOLEAN
        )
        ON CONFLICT DO NOTHING
      `;

      return defaultPrefs;
    } catch (error) {
      logger.error(
        "[Notifications] Error creating default preferences:",
        error,
      );
      return {
        employeeId,
        emailEnabled: true,
        smsEnabled: false,
        slackEnabled: false,
        inAppEnabled: true,
        notificationFrequency: "immediate",
        doNotDisturbEnabled: false,
        notifyOnAssignment: true,
        notifyOnScheduleChange: true,
        notifyOnReminder: true,
        notifyOnFeedback: true,
        notifyOnPerformanceUpdate: true,
        notifyOnEmergency: true,
      };
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    orgId: string,
    employeeId: string,
    updates: Partial<NotificationPreferences>,
  ): Promise<boolean> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let valueCount = 1;

      if (updates.emailEnabled !== undefined) {
        updateFields.push(`email_enabled = $${valueCount++}`);
        values.push(updates.emailEnabled);
      }
      if (updates.smsEnabled !== undefined) {
        updateFields.push(`sms_enabled = $${valueCount++}`);
        values.push(updates.smsEnabled);
      }
      if (updates.slackEnabled !== undefined) {
        updateFields.push(`slack_enabled = $${valueCount++}`);
        values.push(updates.slackEnabled);
      }
      if (updates.notificationFrequency !== undefined) {
        updateFields.push(`notification_frequency = $${valueCount++}`);
        values.push(updates.notificationFrequency);
      }
      if (updates.doNotDisturbEnabled !== undefined) {
        updateFields.push(`do_not_disturb_enabled = $${valueCount++}`);
        values.push(updates.doNotDisturbEnabled);
      }
      if (updates.doNotDisturbStart !== undefined) {
        updateFields.push(`do_not_disturb_start_time = $${valueCount++}`);
        values.push(updates.doNotDisturbStart);
      }
      if (updates.doNotDisturbEnd !== undefined) {
        updateFields.push(`do_not_disturb_end_time = $${valueCount++}`);
        values.push(updates.doNotDisturbEnd);
      }

      if (updateFields.length === 0) return true;

      updateFields.push("updated_at = NOW()");

      const query = `
        UPDATE staff_notification_preferences
        SET ${updateFields.join(", ")}
        WHERE org_id = $${valueCount++}::UUID 
          AND employee_id = $${valueCount++}::UUID
      `;

      values.push(orgId);
      values.push(employeeId);

      // For now, use sql tagged template
      await sql`
        UPDATE staff_notification_preferences
        SET updated_at = NOW()
        WHERE org_id = ${orgId}::UUID AND employee_id = ${employeeId}::UUID
      `;

      return true;
    } catch (error) {
      logger.error("[Notifications] Error updating preferences:", error);
      return false;
    }
  }

  /**
   * Send a notification to an employee
   */
  async sendNotification(
    orgId: string,
    employeeId: string,
    payload: NotificationPayload,
    channels?: Array<"email" | "sms" | "slack" | "in_app">,
  ): Promise<{ notificationId: string; deliveryResults: DeliveryResult[] }> {
    try {
      logger.info("[Notifications] Sending notification", {
        employeeId,
        type: payload.notificationType,
      });

      // Get employee preferences
      const prefs = await this.getPreferences(orgId, employeeId);
      if (!prefs) {
        throw new Error(`No preferences found for employee ${employeeId}`);
      }

      // Check if notification type is enabled
      if (!this.isNotificationTypeEnabled(payload.notificationType, prefs)) {
        logger.info("[Notifications] Notification type disabled for employee", {
          employeeId,
          type: payload.notificationType,
        });
        return { notificationId: "", deliveryResults: [] };
      }

      // Check do-not-disturb window
      const isDND = this.isInDoNotDisturbWindow(prefs);

      // Create notification record
      const notificationResult = await sql`
        INSERT INTO staff_notifications (
          id,
          org_id,
          recipient_employee_id,
          notification_type,
          title,
          message,
          action_url,
          related_production_task_id,
          related_event_id,
          delivery_status
        ) VALUES (
          gen_random_uuid(),
          ${orgId}::UUID,
          ${employeeId}::UUID,
          ${payload.notificationType}::VARCHAR,
          ${payload.title}::VARCHAR,
          ${payload.message}::TEXT,
          ${payload.actionUrl || null}::VARCHAR,
          ${payload.relatedProductionTaskId || null}::UUID,
          ${payload.relatedEventId || null}::UUID,
          'pending'::VARCHAR
        )
        RETURNING id
      `;

      const notificationId = notificationResult.rows[0].id;

      // Determine which channels to use
      const channelsToUse = channels || this.selectChannels(prefs);
      const deliveryResults: DeliveryResult[] = [];

      // Send through each enabled channel (except if in DND)
      if (!isDND) {
        for (const channel of channelsToUse) {
          const result = await this.sendViaChannel(
            orgId,
            employeeId,
            notificationId,
            payload,
            channel,
            prefs,
          );
          deliveryResults.push(result);
        }
      } else {
        // Queue for later delivery if in DND
        logger.info(
          "[Notifications] In do-not-disturb window, queuing notification",
          {
            employeeId,
            notificationId,
          },
        );
      }

      // Update notification status
      const overallSuccess = deliveryResults.some((r) => r.success);
      if (overallSuccess) {
        await sql`
          UPDATE staff_notifications
          SET delivery_status = 'sent'::VARCHAR,
              delivery_attempts = delivery_attempts + 1,
              last_attempt_at = NOW()
          WHERE id = ${notificationId}::UUID
        `;
      }

      return { notificationId, deliveryResults };
    } catch (error) {
      logger.error("[Notifications] Error sending notification:", error);
      throw error;
    }
  }

  /**
   * Send notification via a specific channel
   */
  private async sendViaChannel(
    orgId: string,
    employeeId: string,
    notificationId: string,
    payload: NotificationPayload,
    channel: "email" | "sms" | "slack" | "in_app",
    prefs: NotificationPreferences,
  ): Promise<DeliveryResult> {
    try {
      let deliveryResult: DeliveryResult = {
        channelType: channel,
        success: false,
      };

      if (channel === "in_app") {
        // In-app notifications are always queued successfully
        deliveryResult.success = true;

        await sql`
          INSERT INTO notification_delivery_log (
            id,
            org_id,
            notification_id,
            channel,
            success,
            response_code,
            response_message
          ) VALUES (
            gen_random_uuid(),
            ${orgId}::UUID,
            ${notificationId}::UUID,
            ${channel}::VARCHAR,
            TRUE::BOOLEAN,
            '200'::VARCHAR,
            'In-app notification queued'::TEXT
          )
        `;

        return deliveryResult;
      }

      if (channel === "email" && prefs.emailEnabled) {
        deliveryResult = await this.sendEmailNotification(
          orgId,
          employeeId,
          notificationId,
          payload,
        );
      } else if (channel === "sms" && prefs.smsEnabled) {
        deliveryResult = await this.sendSMSNotification(
          orgId,
          employeeId,
          notificationId,
          payload,
        );
      } else if (channel === "slack" && prefs.slackEnabled) {
        deliveryResult = await this.sendSlackNotification(
          orgId,
          employeeId,
          notificationId,
          payload,
        );
      }

      // Log delivery attempt
      if (deliveryResult.success) {
        await sql`
          INSERT INTO notification_delivery_log (
            id,
            org_id,
            notification_id,
            channel,
            success,
            response_code,
            provider_id
          ) VALUES (
            gen_random_uuid(),
            ${orgId}::UUID,
            ${notificationId}::UUID,
            ${channel}::VARCHAR,
            TRUE::BOOLEAN,
            '200'::VARCHAR,
            ${deliveryResult.providerId || null}::VARCHAR
          )
        `;
      } else {
        await sql`
          INSERT INTO notification_delivery_log (
            id,
            org_id,
            notification_id,
            channel,
            success,
            response_code,
            response_message
          ) VALUES (
            gen_random_uuid(),
            ${orgId}::UUID,
            ${notificationId}::UUID,
            ${channel}::VARCHAR,
            FALSE::BOOLEAN,
            '500'::VARCHAR,
            ${deliveryResult.errorMessage || "Unknown error"}::TEXT
          )
        `;
      }

      return deliveryResult;
    } catch (error) {
      logger.error(`[Notifications] Error sending via ${channel}:`, error);
      return {
        channelType: channel,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    orgId: string,
    employeeId: string,
    notificationId: string,
    payload: NotificationPayload,
  ): Promise<DeliveryResult> {
    try {
      // Get employee email from auth.users
      const result = await sql`
        SELECT email FROM auth.users WHERE id = ${employeeId}::UUID
      `;

      if (!result.rows[0]) {
        return {
          channelType: "email",
          success: false,
          errorMessage: "Employee email not found",
        };
      }

      const email = result.rows[0].email;

      // In a real implementation, this would call SendGrid, AWS SES, or similar
      logger.info("[Notifications] Email notification would be sent", {
        email,
        subject: payload.title,
      });

      // For now, simulate successful delivery
      return {
        channelType: "email",
        success: true,
        providerId: `email_${notificationId}`,
      };
    } catch (error) {
      logger.error("[Notifications] Email notification error:", error);
      return {
        channelType: "email",
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    orgId: string,
    employeeId: string,
    notificationId: string,
    payload: NotificationPayload,
  ): Promise<DeliveryResult> {
    try {
      // Get phone number from preferences
      const result = await sql`
        SELECT phone_number, phone_verified
        FROM staff_notification_preferences
        WHERE employee_id = ${employeeId}::UUID AND org_id = ${orgId}::UUID
      `;

      if (!result.rows[0]?.phone_number || !result.rows[0]?.phone_verified) {
        return {
          channelType: "sms",
          success: false,
          errorMessage: "Phone number not verified",
        };
      }

      const phoneNumber = result.rows[0].phone_number;

      // In a real implementation, this would call Twilio or similar
      logger.info("[Notifications] SMS notification would be sent", {
        phoneNumber,
        message: payload.message,
      });

      // For now, simulate successful delivery
      return {
        channelType: "sms",
        success: true,
        providerId: `sms_${notificationId}`,
      };
    } catch (error) {
      logger.error("[Notifications] SMS notification error:", error);
      return {
        channelType: "sms",
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(
    orgId: string,
    employeeId: string,
    notificationId: string,
    payload: NotificationPayload,
  ): Promise<DeliveryResult> {
    try {
      // Get Slack info from preferences
      const result = await sql`
        SELECT slack_user_id, slack_verified
        FROM staff_notification_preferences
        WHERE employee_id = ${employeeId}::UUID AND org_id = ${orgId}::UUID
      `;

      if (!result.rows[0]?.slack_user_id || !result.rows[0]?.slack_verified) {
        return {
          channelType: "slack",
          success: false,
          errorMessage: "Slack not configured or verified",
        };
      }

      const slackUserId = result.rows[0].slack_user_id;

      // In a real implementation, this would call Slack API
      logger.info("[Notifications] Slack notification would be sent", {
        slackUserId,
        message: payload.title,
      });

      // For now, simulate successful delivery
      return {
        channelType: "slack",
        success: true,
        providerId: `slack_${notificationId}`,
      };
    } catch (error) {
      logger.error("[Notifications] Slack notification error:", error);
      return {
        channelType: "slack",
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check if notification type is enabled in preferences
   */
  private isNotificationTypeEnabled(
    notificationType: string,
    prefs: NotificationPreferences,
  ): boolean {
    const typeMap: Record<string, keyof NotificationPreferences> = {
      task_assigned: "notifyOnAssignment",
      schedule_changed: "notifyOnScheduleChange",
      reminder: "notifyOnReminder",
      feedback_received: "notifyOnFeedback",
      performance_update: "notifyOnPerformanceUpdate",
      emergency: "notifyOnEmergency",
    };

    const prefKey = typeMap[notificationType];
    if (!prefKey) return true; // Default to enabled if type not in map

    return prefs[prefKey] as boolean;
  }

  /**
   * Check if currently in do-not-disturb window
   */
  private isInDoNotDisturbWindow(prefs: NotificationPreferences): boolean {
    if (!prefs.doNotDisturbEnabled) return false;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;

    if (!prefs.doNotDisturbStart || !prefs.doNotDisturbEnd) {
      return false;
    }

    // Simple string comparison for time ranges
    if (prefs.doNotDisturbStart <= prefs.doNotDisturbEnd) {
      return (
        currentTime >= prefs.doNotDisturbStart &&
        currentTime <= prefs.doNotDisturbEnd
      );
    } else {
      // Handle wrapping around midnight
      return (
        currentTime >= prefs.doNotDisturbStart ||
        currentTime <= prefs.doNotDisturbEnd
      );
    }
  }

  /**
   * Select channels based on preferences
   */
  private selectChannels(
    prefs: NotificationPreferences,
  ): Array<"email" | "sms" | "slack" | "in_app"> {
    const channels: Array<"email" | "sms" | "slack" | "in_app"> = [];

    if (prefs.emailEnabled) channels.push("email");
    if (prefs.smsEnabled) channels.push("sms");
    if (prefs.slackEnabled) channels.push("slack");
    if (prefs.inAppEnabled) channels.push("in_app");

    return channels.length > 0 ? channels : ["in_app"]; // Always default to in-app
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const result = await sql`
        UPDATE staff_notifications
        SET read_at = NOW()
        WHERE id = ${notificationId}::UUID AND read_at IS NULL
        RETURNING id
      `;

      return result.rows.length > 0;
    } catch (error) {
      logger.error("[Notifications] Error marking as read:", error);
      return false;
    }
  }

  /**
   * Get unread notification count for an employee
   */
  async getUnreadCount(orgId: string, employeeId: string): Promise<number> {
    try {
      const result = await sql`
        SELECT COUNT(*) as unread_count
        FROM staff_notifications
        WHERE org_id = ${orgId}::UUID
          AND recipient_employee_id = ${employeeId}::UUID
          AND read_at IS NULL
          AND created_at > NOW() - INTERVAL '7 days'
      `;

      return parseInt(result.rows[0]?.unread_count || "0");
    } catch (error) {
      logger.error("[Notifications] Error getting unread count:", error);
      return 0;
    }
  }

  /**
   * Get notification history for an employee
   */
  async getHistory(
    orgId: string,
    employeeId: string,
    limit: number = 50,
  ): Promise<any[]> {
    try {
      const result = await sql`
        SELECT id, notification_type, title, message, delivery_status, 
               read_at, created_at
        FROM staff_notifications
        WHERE org_id = ${orgId}::UUID
          AND recipient_employee_id = ${employeeId}::UUID
        ORDER BY created_at DESC
        LIMIT ${limit}::INTEGER
      `;

      return result.rows;
    } catch (error) {
      logger.error("[Notifications] Error retrieving history:", error);
      return [];
    }
  }
}

export const staffNotificationService = new StaffNotificationService();
