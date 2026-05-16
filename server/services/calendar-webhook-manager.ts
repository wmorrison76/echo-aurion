/**
 * Calendar Webhook Manager
 * Manages webhook subscriptions and event delivery for Zapier and custom webhooks
 */

import crypto from "crypto";
import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";

export interface WebhookEvent {
  id: string;
  type: string;
  timestamp: Date;
  orgId: string;
  data: Record<string, any>;
}

export interface WebhookDelivery {
  webhookId: string;
  eventType: string;
  eventData: Record<string, any>;
  status: "pending" | "delivered" | "failed" | "skipped";
  attempts: number;
  lastAttemptAt?: Date;
  error?: string;
}

export class CalendarWebhookManager {
  private db: Database;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;
  private deliveryQueue: Map<string, WebhookDelivery> = new Map();

  constructor(db?: Database) {
    this.db = db || new Database();
  }

  /**
   * Create a webhook subscription
   */
  async createWebhook(
    orgId: string,
    webhookUrl: string,
    webhookSecret: string,
    events: string[],
    createdBy: string,
    name?: string,
  ): Promise<string | null> {
    try {
      // Validate webhook URL
      if (!this.isValidWebhookUrl(webhookUrl)) {
        throw new Error("Invalid webhook URL");
      }

      // Validate secret strength
      if (webhookSecret.length < 32) {
        throw new Error("Webhook secret must be at least 32 characters");
      }

      const result = await this.db.query(
        `INSERT INTO calendar_webhooks 
        (org_id, name, webhook_url, webhook_secret, events, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
        [
          orgId,
          name || "Unnamed Webhook",
          webhookUrl,
          webhookSecret,
          events,
          createdBy,
        ],
      );

      const webhookId = result.rows[0]?.id;

      logger.info("[Webhooks] Webhook created", {
        webhookId,
        orgId,
        events,
      });

      return webhookId;
    } catch (error) {
      logger.error("[Webhooks] Failed to create webhook:", error);
      return null;
    }
  }

  /**
   * List webhooks for organization
   */
  async listWebhooks(orgId: string): Promise<any[]> {
    try {
      const result = await this.db.query(
        `SELECT id, name, webhook_url, events, is_active, created_at, last_tested_at
         FROM calendar_webhooks
         WHERE org_id = $1 AND is_active = true
         ORDER BY created_at DESC`,
        [orgId],
      );
      return result.rows;
    } catch (error) {
      logger.error("[Webhooks] Failed to list webhooks:", error);
      return [];
    }
  }

  /**
   * Get webhook details
   */
  async getWebhook(webhookId: string, orgId: string): Promise<any | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM calendar_webhooks WHERE id = $1 AND org_id = $2`,
        [webhookId, orgId],
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error("[Webhooks] Failed to get webhook:", error);
      return null;
    }
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(
    webhookId: string,
    orgId: string,
    updates: Partial<{
      webhookUrl: string;
      events: string[];
      isActive: boolean;
    }>,
  ): Promise<boolean> {
    try {
      const webhook = await this.getWebhook(webhookId, orgId);
      if (!webhook) {
        throw new Error("Webhook not found");
      }

      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (updates.webhookUrl !== undefined) {
        if (!this.isValidWebhookUrl(updates.webhookUrl)) {
          throw new Error("Invalid webhook URL");
        }
        updateFields.push(`webhook_url = $${paramIndex++}`);
        params.push(updates.webhookUrl);
      }

      if (updates.events !== undefined) {
        updateFields.push(`events = $${paramIndex++}`);
        params.push(updates.events);
      }

      if (updates.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        params.push(updates.isActive);
      }

      if (updateFields.length === 0) {
        return true;
      }

      params.push(webhookId);
      params.push(orgId);

      const result = await this.db.query(
        `UPDATE calendar_webhooks 
        SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex++} AND org_id = $${paramIndex++}`,
        params,
      );

      logger.info("[Webhooks] Webhook updated", { webhookId, orgId });

      return result.rowCount! > 0;
    } catch (error) {
      logger.error("[Webhooks] Failed to update webhook:", error);
      return false;
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string, orgId: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        `UPDATE calendar_webhooks 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND org_id = $2`,
        [webhookId, orgId],
      );

      logger.info("[Webhooks] Webhook deleted", { webhookId, orgId });

      return result.rowCount! > 0;
    } catch (error) {
      logger.error("[Webhooks] Failed to delete webhook:", error);
      return false;
    }
  }

  /**
   * Dispatch event to webhook
   */
  async dispatchEvent(
    orgId: string,
    eventType: string,
    eventData: Record<string, any>,
  ): Promise<void> {
    try {
      // Get active webhooks for this organization and event type
      const webhooks = await this.db.query(
        `SELECT * FROM calendar_webhooks 
        WHERE org_id = $1 AND is_active = true 
        AND ($2 = ANY(events) OR 'all' = ANY(events))`,
        [orgId, eventType],
      );

      // Queue delivery for each webhook
      for (const webhook of webhooks.rows) {
        await this.queueWebhookDelivery(
          webhook.id,
          eventType,
          eventData,
          webhook.webhook_secret,
          webhook.webhook_url,
        );
      }

      logger.info("[Webhooks] Event dispatched", {
        orgId,
        eventType,
        webhookCount: webhooks.rows.length,
      });
    } catch (error) {
      logger.error("[Webhooks] Failed to dispatch event:", error);
    }
  }

  /**
   * Queue webhook delivery
   */
  private async queueWebhookDelivery(
    webhookId: string,
    eventType: string,
    eventData: Record<string, any>,
    secret: string,
    url: string,
  ): Promise<void> {
    try {
      const eventId = crypto.randomUUID();

      // Store event in database
      await this.db.query(
        `INSERT INTO calendar_webhook_events 
        (webhook_id, event_type, event_data, delivery_status)
        VALUES ($1, $2, $3, 'pending')`,
        [webhookId, eventType, JSON.stringify(eventData)],
      );

      // Attempt initial delivery
      setImmediate(() => {
        this.deliverWebhook(webhookId, eventType, eventData, secret, url).catch(
          (error) => logger.error("[Webhooks] Delivery error:", error),
        );
      });
    } catch (error) {
      logger.error("[Webhooks] Failed to queue delivery:", error);
    }
  }

  /**
   * Deliver webhook with retries
   */
  private async deliverWebhook(
    webhookId: string,
    eventType: string,
    eventData: Record<string, any>,
    secret: string,
    url: string,
    attempt: number = 1,
  ): Promise<boolean> {
    try {
      // Generate signature
      const signature = this.generateSignature(eventData, secret);
      const timestamp = Date.now();

      // Prepare payload
      const payload = {
        id: crypto.randomUUID(),
        type: eventType,
        timestamp: new Date(timestamp).toISOString(),
        data: eventData,
      };

      // Send webhook
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Timestamp": timestamp.toString(),
          "X-Webhook-ID": webhookId,
        },
        body: JSON.stringify(payload),
        timeout: 30000,
      });

      if (response.ok || response.status === 200 || response.status === 204) {
        // Success
        await this.updateDeliveryStatus(
          webhookId,
          eventType,
          "delivered",
          attempt,
        );
        logger.info("[Webhooks] Delivery successful", {
          webhookId,
          eventType,
          attempt,
        });
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
    } catch (error) {
      const errorMsg = (error as Error).message;

      if (attempt < this.MAX_RETRIES) {
        // Schedule retry with exponential backoff
        const delayMs = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        setTimeout(() => {
          this.deliverWebhook(
            webhookId,
            eventType,
            eventData,
            secret,
            url,
            attempt + 1,
          );
        }, delayMs);

        logger.warn("[Webhooks] Delivery failed, retrying", {
          webhookId,
          eventType,
          attempt,
          error: errorMsg,
          nextRetryMs: delayMs,
        });
      } else {
        // Max retries exceeded
        await this.updateDeliveryStatus(
          webhookId,
          eventType,
          "failed",
          attempt,
          errorMsg,
        );
        logger.error("[Webhooks] Delivery failed permanently", {
          webhookId,
          eventType,
          attempts: attempt,
          error: errorMsg,
        });
      }

      return false;
    }
  }

  /**
   * Update delivery status in database
   */
  private async updateDeliveryStatus(
    webhookId: string,
    eventType: string,
    status: string,
    attempts: number,
    error?: string,
  ): Promise<void> {
    try {
      await this.db.query(
        `UPDATE calendar_webhook_events 
        SET delivery_status = $1, delivery_attempts = $2, last_attempt_at = CURRENT_TIMESTAMP, last_error_message = $3
        WHERE webhook_id = $4 AND event_type = $5 AND delivery_status = 'pending'
        LIMIT 1`,
        [status, attempts, error || null, webhookId, eventType],
      );
    } catch (error) {
      logger.error("[Webhooks] Failed to update delivery status:", error);
    }
  }

  /**
   * Test webhook delivery
   */
  async testWebhook(webhookId: string, orgId: string): Promise<boolean> {
    try {
      const webhook = await this.getWebhook(webhookId, orgId);
      if (!webhook) {
        throw new Error("Webhook not found");
      }

      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
      };

      const success = await this.deliverWebhook(
        webhookId,
        "test",
        testData,
        webhook.webhook_secret,
        webhook.webhook_url,
      );

      if (success) {
        // Update last tested timestamp
        await this.db.query(
          `UPDATE calendar_webhooks 
          SET last_tested_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
          [webhookId],
        );
      }

      return success;
    } catch (error) {
      logger.error("[Webhooks] Test failed:", error);
      return false;
    }
  }

  /**
   * Get webhook event history
   */
  async getWebhookHistory(
    webhookId: string,
    limit: number = 50,
  ): Promise<any[]> {
    try {
      const result = await this.db.query(
        `SELECT id, event_type, delivery_status, delivery_attempts, last_attempt_at, last_error_message, created_at
         FROM calendar_webhook_events
         WHERE webhook_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [webhookId, limit],
      );
      return result.rows;
    } catch (error) {
      logger.error("[Webhooks] Failed to get history:", error);
      return [];
    }
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(
      JSON.parse(payload),
      secret,
    );
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Generate webhook signature
   */
  private generateSignature(data: any, secret: string): string {
    const payload = JSON.stringify(data);
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  /**
   * Validate webhook URL
   */
  private isValidWebhookUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "https:" || urlObj.hostname === "localhost";
    } catch {
      return false;
    }
  }
}

// Export singleton
export const calendarWebhookManager = new CalendarWebhookManager();
