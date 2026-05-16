/**
 * Calendar Webhook Receiver
 * Receives webhook events from Zapier and custom integrations
 * Verifies signatures and processes events
 */

import { Router, Request, Response } from "express";
import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";
import { calendarWebhookManager } from "../services/calendar-webhook-manager";

const router = Router();
const db = new Database();

// =====================================================
// WEBHOOK RECEIVER ENDPOINT
// =====================================================

/**
 * POST /api/calendar/webhooks/receive/:webhookId
 * Receive webhook event from external service
 * Verifies signature and processes event
 */
router.post("/receive/:webhookId", async (req: Request, res: Response) => {
  const webhookId = req.params.webhookId;

  try {
    // Get webhook details from database
    const webhookResult = await db.query(
      "SELECT * FROM calendar_webhooks WHERE id = $1",
      [webhookId],
    );

    if (webhookResult.rows.length === 0) {
      logger.warn("[Webhook] Webhook not found", { webhookId });
      return res.status(404).json({
        success: false,
        error: "Webhook not found",
      });
    }

    const webhook = webhookResult.rows[0];

    // Verify signature
    const signature = req.headers["x-webhook-signature"] as string;
    const timestamp = req.headers["x-webhook-timestamp"] as string;

    if (!signature || !timestamp) {
      logger.warn("[Webhook] Missing signature or timestamp", { webhookId });
      return res.status(401).json({
        success: false,
        error: "Missing signature or timestamp",
      });
    }

    // Get raw body for signature verification
    const rawBody = req.rawBody || JSON.stringify(req.body);

    // Verify signature
    const isValid = calendarWebhookManager.verifySignature(
      rawBody,
      signature,
      webhook.webhook_secret,
    );

    if (!isValid) {
      logger.warn("[Webhook] Invalid signature", { webhookId });
      return res.status(401).json({
        success: false,
        error: "Invalid signature",
      });
    }

    // Verify timestamp is not too old (prevent replay attacks)
    const webhookTimestamp = parseInt(timestamp, 10);
    const currentTime = Date.now();
    const timeDiff = Math.abs(currentTime - webhookTimestamp);
    const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

    if (timeDiff > MAX_AGE_MS) {
      logger.warn("[Webhook] Timestamp too old (possible replay attack)", {
        webhookId,
        timeDiff,
      });
      return res.status(401).json({
        success: false,
        error: "Timestamp expired",
      });
    }

    // Log receipt
    logger.info("[Webhook] Event received", {
      webhookId,
      eventType: req.body.type,
      timestamp: new Date(webhookTimestamp).toISOString(),
    });

    // Process the webhook event asynchronously
    setImmediate(() => {
      processWebhookEvent(webhookId, webhook, req.body).catch((error) => {
        logger.error("[Webhook] Event processing failed:", error);
      });
    });

    // Respond immediately with 202 Accepted
    res.status(202).json({
      success: true,
      message: "Webhook received and queued for processing",
      webhook_id: webhookId,
    });
  } catch (error) {
    logger.error("[Webhook] Receiver error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * Process webhook event
 * This runs asynchronously after acknowledging receipt
 */
async function processWebhookEvent(
  webhookId: string,
  webhook: any,
  payload: any,
): Promise<void> {
  try {
    const { type, data, timestamp } = payload;

    // Route event based on type
    switch (type) {
      case "event.created":
        await handleEventCreated(webhook, data);
        break;
      case "event.updated":
        await handleEventUpdated(webhook, data);
        break;
      case "event.deleted":
        await handleEventDeleted(webhook, data);
        break;
      case "sync.requested":
        await handleSyncRequested(webhook, data);
        break;
      default:
        logger.warn("[Webhook] Unknown event type", { type });
    }

    logger.info("[Webhook] Event processed successfully", {
      webhookId,
      type,
      timestamp,
    });
  } catch (error) {
    logger.error("[Webhook] Event processing error:", error);
  }
}

/**
 * Handle event.created event
 */
async function handleEventCreated(webhook: any, data: any): Promise<void> {
  try {
    logger.info("[Webhook] Processing event.created", {
      webhookId: webhook.id,
      eventId: data.event_id,
    });

    // Data validation
    if (!data.event_id || !data.title || !data.start_time || !data.end_time) {
      throw new Error("Missing required event fields");
    }

    // Create event in calendar
    const result = await db.query(
      `INSERT INTO calendar_events 
      (org_id, outlet_id, title, description, start_time, end_time, location, created_by, external_id, external_provider)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        webhook.org_id,
        data.outlet_id || null,
        data.title,
        data.description || null,
        data.start_time,
        data.end_time,
        data.location || null,
        data.created_by,
        data.event_id,
        data.provider || "webhook",
      ],
    );

    logger.info("[Webhook] Event created successfully", {
      webhookId: webhook.id,
      externalEventId: data.event_id,
      localEventId: result.rows[0]?.id,
    });
  } catch (error) {
    logger.error("[Webhook] Failed to create event:", error);
    throw error;
  }
}

/**
 * Handle event.updated event
 */
async function handleEventUpdated(webhook: any, data: any): Promise<void> {
  try {
    logger.info("[Webhook] Processing event.updated", {
      webhookId: webhook.id,
      eventId: data.event_id,
    });

    // Find event by external ID
    const eventResult = await db.query(
      "SELECT id FROM calendar_events WHERE external_id = $1 AND org_id = $2",
      [data.event_id, webhook.org_id],
    );

    if (eventResult.rows.length === 0) {
      // Event doesn't exist locally, create it instead
      await handleEventCreated(webhook, data);
      return;
    }

    const localEventId = eventResult.rows[0].id;

    // Update event
    await db.query(
      `UPDATE calendar_events 
      SET title = $1, description = $2, start_time = $3, end_time = $4, location = $5, updated_by = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND org_id = $8`,
      [
        data.title,
        data.description || null,
        data.start_time,
        data.end_time,
        data.location || null,
        data.updated_by,
        localEventId,
        webhook.org_id,
      ],
    );

    logger.info("[Webhook] Event updated successfully", {
      webhookId: webhook.id,
      localEventId,
    });
  } catch (error) {
    logger.error("[Webhook] Failed to update event:", error);
    throw error;
  }
}

/**
 * Handle event.deleted event
 */
async function handleEventDeleted(webhook: any, data: any): Promise<void> {
  try {
    logger.info("[Webhook] Processing event.deleted", {
      webhookId: webhook.id,
      eventId: data.event_id,
    });

    // Find and soft-delete event
    const result = await db.query(
      `UPDATE calendar_events 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE external_id = $1 AND org_id = $2`,
      [data.event_id, webhook.org_id],
    );

    if (result.rowCount === 0) {
      logger.warn("[Webhook] Event not found for deletion", {
        webhookId: webhook.id,
        eventId: data.event_id,
      });
      return;
    }

    logger.info("[Webhook] Event deleted successfully", {
      webhookId: webhook.id,
      eventId: data.event_id,
    });
  } catch (error) {
    logger.error("[Webhook] Failed to delete event:", error);
    throw error;
  }
}

/**
 * Handle sync.requested event (from Zapier)
 */
async function handleSyncRequested(webhook: any, data: any): Promise<void> {
  try {
    logger.info("[Webhook] Processing sync.requested", {
      webhookId: webhook.id,
      integrationId: data.integration_id,
    });

    // Validate integration exists
    const integrationResult = await db.query(
      "SELECT id FROM calendar_integrations WHERE id = $1 AND org_id = $2",
      [data.integration_id, webhook.org_id],
    );

    if (integrationResult.rows.length === 0) {
      throw new Error("Integration not found");
    }

    // Trigger sync (async)
    logger.info("[Webhook] Sync requested", {
      webhookId: webhook.id,
      integrationId: data.integration_id,
    });

    // In production, you would queue this sync task
    // For now, log it and let the scheduler handle it
  } catch (error) {
    logger.error("[Webhook] Failed to process sync request:", error);
    throw error;
  }
}

/**
 * Health check endpoint for testing
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router;
