/**
 * Email Event Webhook Route
 * Receives emails from Outlook and parses them into mandatory calendar events
 * Supports both direct webhook and polling mechanisms
 */

import { Router, Request, Response } from "express";
import {
  emailEventParser,
  EmailMessage,
  ParsedEmailEvent,
} from "../services/email-event-parser";
import { calendarService } from "../services/EnterpriseCalendarService";
import { mandatoryEventService } from "../services/mandatory-event-service";
import { outlookSyncService } from "../services/outlook-sync-service";
import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";

const router = Router();
const db = new Database();

// =====================================================
// WEBHOOK HANDLERS
// =====================================================

/**
 * POST /api/email-webhook/outlook
 * Receive webhook notifications from Outlook when emails arrive
 * This handles Microsoft Graph subscription notifications
 */
router.post("/outlook", async (req: Request, res: Response) => {
  try {
    // Outlook sends validation request during subscription setup
    if (req.query.validationToken) {
      return res
        .set("Content-Type", "text/plain")
        .send(req.query.validationToken);
    }

    const { value } = req.body;

    if (!value || !Array.isArray(value)) {
      return res.status(400).json({
        success: false,
        error: "Invalid webhook payload",
      });
    }

    // Process each notification asynchronously
    for (const notification of value) {
      processOutlookNotification(notification).catch((error) => {
        logger.error("[EmailWebhook] Failed to process notification:", error);
      });
    }

    // Return 202 Accepted immediately
    res.status(202).json({ success: true });
  } catch (error) {
    logger.error("[EmailWebhook] Webhook processing failed:", error);
    res.status(500).json({
      success: false,
      error: "Webhook processing failed",
    });
  }
});

/**
 * POST /api/email-webhook/parse
 * Manually trigger email parsing via API
 * Can be used for testing or manual email submission
 */
router.post("/parse", async (req: Request, res: Response) => {
  try {
    const { orgId, userId, email } = req.body;

    if (!orgId || !userId || !email) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: orgId, userId, email",
      });
    }

    const emailMessage: EmailMessage = {
      messageId: email.id || `manual-${Date.now()}`,
      from: email.from || "unknown@example.com",
      fromName: email.fromName,
      subject: email.subject || "(No Subject)",
      bodyPreview: email.body || email.bodyPreview || "",
      receivedAt: email.receivedAt || new Date().toISOString(),
    };

    const parsed = await emailEventParser.parseEmail(orgId, emailMessage);

    if (!parsed) {
      return res.status(400).json({
        success: false,
        error: "Failed to parse email into calendar event",
      });
    }

    // Show parsed result but don't auto-create
    res.json({
      success: true,
      data: {
        parsed,
        message: "Email parsed successfully. Review and create manually.",
        preview: {
          title: parsed.title,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
          departments: parsed.departments,
          isMandatory: parsed.isMandatory,
          confidence: parsed.confidenceScore,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[EmailWebhook] Parse endpoint failed:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Parsing failed",
    });
  }
});

/**
 * POST /api/email-webhook/create-from-parsed
 * Create calendar event from parsed email data
 * Called after user reviews the parsed result
 */
router.post("/create-from-parsed", async (req: Request, res: Response) => {
  try {
    const { orgId, userId, parsed, autoAcknowledge } = req.body;

    if (!orgId || !userId || !parsed) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: orgId, userId, parsed",
      });
    }

    // Get default outlet
    const outletsResult = await db.query(
      `
      SELECT id FROM calendar_outlets
      WHERE org_id = $1 AND is_system = true
      LIMIT 1
    `,
      [orgId],
    );

    if (outletsResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No system outlet configured",
      });
    }

    const outletId = outletsResult.rows[0].id;

    // Create calendar event
    const event = await calendarService.createEvent(
      orgId,
      {
        title: parsed.title,
        outlet_id: outletId,
        start_time: parsed.startTime,
        end_time: parsed.endTime,
        description: parsed.description,
        location_room: parsed.location,
        department: parsed.departments[0] || "General",
        notes: `Email: ${parsed.rawParsing?.email_subject || ""}`,
      },
      userId,
      req.ip || "webhook",
      req.get("user-agent") || "email-webhook",
    );

    // If mandatory, make it mandatory and add dependencies
    if (parsed.isMandatory) {
      const deptDeps = parsed.departments.map((dept: string, idx: number) => ({
        name: dept,
        isPrimaryOrganizer: idx === 0,
        requiredRole: "ALL_STAFF",
        notificationType: "email_and_in_app" as const,
        reminderHoursBefore: 24,
        autoEscalateAfterHours: 48,
      }));

      await mandatoryEventService.createMandatoryEvent({
        eventId: event.id,
        orgId,
        createdBy: userId,
        departments: deptDeps,
        enforcementPolicy: "notify",
        enforcementEnabled: true,
      });
    }

    // Store email source mapping
    await db.query(
      `
      INSERT INTO calendar_event_email_sources (
        event_id, email_message_id, email_from, email_subject,
        email_received_at, parsed_by_ai, ai_confidence_score
      ) VALUES ($1, $2, $3, $4, $5, true, $6)
    `,
      [
        event.id,
        parsed.messageId || `email-${Date.now()}`,
        parsed.rawParsing?.email_from || "unknown",
        parsed.rawParsing?.email_subject || parsed.title,
        new Date(),
        parsed.confidenceScore,
      ],
    );

    res.status(201).json({
      success: true,
      data: {
        event_id: event.id,
        title: event.title,
        is_mandatory: parsed.isMandatory,
        message: "Event created from parsed email",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      "[EmailWebhook] Failed to create event from parsed email:",
      error,
    );
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create event",
    });
  }
});

/**
 * GET /api/email-webhook/pending-approvals
 * Get pending email parsing results awaiting approval
 */
router.get("/pending-approvals", async (req: Request, res: Response) => {
  try {
    const { orgId, userId } = req.query;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: "Missing orgId parameter",
      });
    }

    const result = await db.query(
      `
      SELECT
        cwhe.id,
        cwhe.email_from,
        cwhe.email_subject,
        cwhe.webhook_timestamp,
        cwhe.processing_status,
        cwhe.parsed_event_id,
        cpc.parsed_title,
        cpc.ai_confidence_score,
        cpc.parsed_is_mandatory
      FROM calendar_email_webhook_events cwhe
      LEFT JOIN calendar_email_parsing_cache cpc
        ON cwhe.email_message_id = cpc.email_message_id
      WHERE cwhe.org_id = $1
        AND cwhe.processing_status IN ('pending', 'needs_review')
      ORDER BY cwhe.webhook_timestamp DESC
      LIMIT 20
    `,
      [orgId],
    );

    res.json({
      success: true,
      data: result.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[EmailWebhook] Failed to fetch pending approvals:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch pending",
    });
  }
});

// =====================================================
// INTERNAL PROCESSING FUNCTIONS
// =====================================================

/**
 * Process a single Outlook webhook notification
 */
async function processOutlookNotification(notification: any): Promise<void> {
  try {
    const { changeType, resourceData } = notification;

    // Log webhook event
    await db.query(
      `
      INSERT INTO calendar_email_webhook_events (
        org_id, webhook_timestamp, email_from, email_subject,
        email_message_id, webhook_payload, processing_status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'processing')
    `,
      [
        "default-org", // Should extract from auth context
        new Date(),
        notification.from?.emailAddress?.address || "unknown",
        notification.subject || "(No Subject)",
        notification.id || `webhook-${Date.now()}`,
        JSON.stringify(notification),
      ],
    );

    // Only process created/updated events
    if (!["created", "updated"].includes(changeType)) {
      return;
    }

    // Skip if not an email (in email webhook context)
    if (!notification.subject) {
      return;
    }

    // Check for mandatory keywords
    const upperSubject = (notification.subject || "").toUpperCase();
    const isMandatoryCandidate = [
      "MENU_LAUNCH",
      "TRAINING",
      "MANDATORY",
      "REQUIRED",
    ].some((keyword) => upperSubject.includes(`[${keyword}]`));

    if (!isMandatoryCandidate) {
      logger.info("[EmailWebhook] Email not flagged as mandatory, skipping", {
        subject: notification.subject,
      });
      return;
    }

    // Parse the email
    const emailMessage: EmailMessage = {
      messageId: notification.id,
      from: notification.from?.emailAddress?.address || "unknown",
      fromName: notification.from?.emailAddress?.name,
      subject: notification.subject,
      bodyPreview: notification.bodyPreview || "",
      receivedAt: notification.receivedDateTime,
    };

    logger.info("[EmailWebhook] Processing mandatory email", {
      messageId: emailMessage.messageId,
      subject: emailMessage.subject,
    });

    // For now, just log and flag for review
    // Auto-creation could be enabled for high-confidence parses
    await db.query(
      `
      UPDATE calendar_email_webhook_events
      SET processing_status = 'needs_review',
          processed_at = NOW()
      WHERE email_message_id = $1
    `,
      [emailMessage.messageId],
    );
  } catch (error) {
    logger.error("[EmailWebhook] Error processing notification:", error);
  }
}

export default router;
