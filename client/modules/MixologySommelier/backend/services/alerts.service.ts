import { query } from "../db/client";
import EventBroadcaster from "./event-broadcaster.service";
import WebSocketService from "./websocket.service";
export interface Alert {
  id: string;
  venue_id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  data: any;
  created_at: Date;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: Date;
}
export interface NotificationPreferences {
  venue_id: string;
  user_id: string;
  email_alerts: boolean;
  sms_alerts: boolean;
  push_notifications: boolean;
  alert_types: string[];
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}
class AlertsService {
  private activeAlerts = new Map<string, Alert>();
  private alertHistory: Alert[] = [];
  private maxHistorySize = 5000;
  async createAlert(
    venue_id: string,
    alert_type: string,
    severity: "info" | "warning" | "critical",
    title: string,
    description: string,
    data: any,
  ): Promise<Alert> {
    const alert: Alert = {
      id: `alert:${venue_id}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
      venue_id,
      alert_type,
      severity,
      title,
      description,
      data,
      created_at: new Date(),
      acknowledged: false,
    };
    this.activeAlerts.set(alert.id, alert);
    this.addToHistory(alert);
    EventBroadcaster.emitAlert(venue_id, alert_type, {
      ...alert,
      timestamp: alert.created_at,
    });
    await this.persistAlert(alert);
    if (severity === "critical") {
      await this.notifyStakeholders(venue_id, alert);
    }
    return alert;
  }
  async createLowStockAlert(
    venue_id: string,
    item_id: string,
    item_name: string,
    current_qty: number,
    reorder_level: number,
  ) {
    return this.createAlert(
      venue_id,
      "low_stock",
      "warning",
      `Low Stock Alert: ${item_name}`,
      `${item_name} has fallen below reorder level. Current: ${current_qty}, Reorder Level: ${reorder_level}`,
      { item_id, item_name, current_qty, reorder_level },
    );
  }
  async createCriticalStockAlert(
    venue_id: string,
    item_id: string,
    item_name: string,
    current_qty: number,
  ) {
    return this.createAlert(
      venue_id,
      "critical_stock",
      "critical",
      `CRITICAL: ${item_name} is nearly out of stock`,
      `Immediate action required. ${item_name} quantity is critically low: ${current_qty}`,
      { item_id, item_name, current_qty },
    );
  }
  async createInventoryVarianceAlert(
    venue_id: string,
    item_id: string,
    item_name: string,
    expected_qty: number,
    counted_qty: number,
    variance_percentage: number,
  ) {
    return this.createAlert(
      venue_id,
      "inventory_variance",
      variance_percentage > 5 ? "critical" : "warning",
      `Inventory Variance Detected: ${item_name}`,
      `${item_name} variance of ${variance_percentage.toFixed(2)}%. Expected: ${expected_qty}, Counted: ${counted_qty}`,
      { item_id, item_name, expected_qty, counted_qty, variance_percentage },
    );
  }
  async createSyncFailureAlert(
    venue_id: string,
    sync_type: string,
    error: string,
  ) {
    return this.createAlert(
      venue_id,
      "sync_failure",
      "critical",
      `${sync_type} Sync Failed`,
      `Real-time sync operation failed: ${error}`,
      { sync_type, error },
    );
  }
  async createAnomalyAlert(
    venue_id: string,
    item_id: string,
    item_name: string,
    anomaly_type: string,
    description: string,
    confidence_score: number,
  ) {
    return this.createAlert(
      venue_id,
      `anomaly:${anomaly_type}`,
      confidence_score > 0.8 ? "critical" : "warning",
      `Anomaly Detected: ${item_name}`,
      `${description}. Confidence Score: ${(confidence_score * 100).toFixed(0)}%`,
      { item_id, item_name, anomaly_type, confidence_score },
    );
  }
  async createPricingAlert(
    venue_id: string,
    item_id: string,
    item_name: string,
    from_price: number,
    to_price: number,
    reason: string,
  ) {
    const priceChange = (((to_price - from_price) / from_price) * 100).toFixed(
      2,
    );
    return this.createAlert(
      venue_id,
      "pricing_update",
      "info",
      `Price Updated: ${item_name}`,
      `Price changed from $${from_price.toFixed(2)} to $${to_price.toFixed(2)} (${priceChange}%). Reason: ${reason}`,
      { item_id, item_name, from_price, to_price, priceChange, reason },
    );
  }
  async acknowledgeAlert(
    alert_id: string,
    user_id: string,
  ): Promise<Alert | null> {
    const alert = this.activeAlerts.get(alert_id);
    if (!alert) return null;
    alert.acknowledged = true;
    alert.acknowledged_by = user_id;
    alert.acknowledged_at = new Date();
    await this.updateAlertInDB(alert);
    return alert;
  }
  async getActiveAlerts(venue_id: string): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values()).filter(
      (a) => a.venue_id === venue_id && !a.acknowledged,
    );
  }
  async getAlertHistory(
    venue_id: string,
    limit: number = 50,
    severity?: string,
  ): Promise<Alert[]> {
    let alerts = this.alertHistory.filter((a) => a.venue_id === venue_id);
    if (severity) {
      alerts = alerts.filter((a) => a.severity === severity);
    }
    return alerts.slice(-limit);
  }
  async getAnomalyAlerts(
    venue_id: string,
    limit: number = 20,
  ): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values())
      .filter(
        (a) => a.venue_id === venue_id && a.alert_type.startsWith("anomaly:"),
      )
      .slice(-limit);
  }
  async setNotificationPreferences(
    preferences: NotificationPreferences,
  ): Promise<void> {
    try {
      const existingResult = await query(
        `SELECT * FROM notification_preferences WHERE venue_id = $1 AND user_id = $2`,
        [preferences.venue_id, preferences.user_id],
      );
      if (existingResult.rows.length > 0) {
        await query(
          ` UPDATE notification_preferences SET email_alerts = $1, sms_alerts = $2, push_notifications = $3, alert_types = $4, quiet_hours_start = $5, quiet_hours_end = $6 WHERE venue_id = $7 AND user_id = $8 `,
          [
            preferences.email_alerts,
            preferences.sms_alerts,
            preferences.push_notifications,
            JSON.stringify(preferences.alert_types),
            preferences.quiet_hours_start,
            preferences.quiet_hours_end,
            preferences.venue_id,
            preferences.user_id,
          ],
        );
      } else {
        await query(
          ` INSERT INTO notification_preferences (venue_id, user_id, email_alerts, sms_alerts, push_notifications, alert_types, quiet_hours_start, quiet_hours_end) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) `,
          [
            preferences.venue_id,
            preferences.user_id,
            preferences.email_alerts,
            preferences.sms_alerts,
            preferences.push_notifications,
            JSON.stringify(preferences.alert_types),
            preferences.quiet_hours_start,
            preferences.quiet_hours_end,
          ],
        );
      }
    } catch (error) {
      console.error("Error setting notification preferences:", error);
      throw error;
    }
  }
  async getNotificationPreferences(
    venue_id: string,
    user_id: string,
  ): Promise<NotificationPreferences | null> {
    try {
      const result = await query(
        `SELECT * FROM notification_preferences WHERE venue_id = $1 AND user_id = $2`,
        [venue_id, user_id],
      );
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        venue_id: row.venue_id,
        user_id: row.user_id,
        email_alerts: row.email_alerts,
        sms_alerts: row.sms_alerts,
        push_notifications: row.push_notifications,
        alert_types: JSON.parse(row.alert_types || "[]"),
        quiet_hours_start: row.quiet_hours_start,
        quiet_hours_end: row.quiet_hours_end,
      };
    } catch (error) {
      console.error("Error getting notification preferences:", error);
      return null;
    }
  }
  private async persistAlert(alert: Alert): Promise<void> {
    try {
      await query(
        ` INSERT INTO alerts (id, venue_id, alert_type, severity, title, description, data, created_at, acknowledged) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) `,
        [
          alert.id,
          alert.venue_id,
          alert.alert_type,
          alert.severity,
          alert.title,
          alert.description,
          JSON.stringify(alert.data),
          alert.created_at,
          alert.acknowledged,
        ],
      );
    } catch (error) {
      console.error("Error persisting alert to database:", error);
    }
  }
  private async updateAlertInDB(alert: Alert): Promise<void> {
    try {
      await query(
        ` UPDATE alerts SET acknowledged = $1, acknowledged_by = $2, acknowledged_at = $3 WHERE id = $4 `,
        [
          alert.acknowledged,
          alert.acknowledged_by,
          alert.acknowledged_at,
          alert.id,
        ],
      );
    } catch (error) {
      console.error("Error updating alert in database:", error);
    }
  }
  private async notifyStakeholders(
    venue_id: string,
    alert: Alert,
  ): Promise<void> {
    try {
      const preferences = await query(
        `SELECT * FROM notification_preferences WHERE venue_id = $1 AND email_alerts = true`,
        [venue_id],
      );
      for (const pref of preferences.rows) {
        console.log(
          `Notifying user ${pref.user_id} about critical alert in venue ${venue_id}`,
        );
        if (pref.email_alerts) {
          await this.sendEmailNotification(pref.user_id, alert);
        }
      }
    } catch (error) {
      console.error("Error notifying stakeholders:", error);
    }
  }
  private async sendEmailNotification(
    user_id: string,
    alert: Alert,
  ): Promise<void> {
    console.log(`Sending email to user ${user_id} about alert:`, alert.title);
  }
  private addToHistory(alert: Alert): void {
    this.alertHistory.push(alert);
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.shift();
    }
  }
  getAlertStats(venue_id: string) {
    const activeAlerts = this.getActiveAlerts(venue_id);
    const criticalCount = activeAlerts.then(
      (alerts) => alerts.filter((a) => a.severity === "critical").length,
    );
    const warningCount = activeAlerts.then(
      (alerts) => alerts.filter((a) => a.severity === "warning").length,
    );
    return {
      total_active: activeAlerts.then((a) => a.length),
      critical: criticalCount,
      warning: warningCount,
    };
  }
}
export default new AlertsService();
