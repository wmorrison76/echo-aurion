/**
 * Calendar Integrations REST API
 * OAuth flows, integration management, sync controls, and webhook management
 */

import { Router, Request, Response } from "express";
import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";
import { RBACEngine } from "../services/rbac-engine";
import { calendarSyncEngine } from "../services/calendar-integration-sync-engine";
import { calendarWebhookManager } from "../services/calendar-webhook-manager";
import { googleCalendarAuthClient } from "../integrations/google-calendar-auth";
import { azureAuthClient } from "../integrations/azure-auth";

const router = Router();
const db = new Database();
const rbacEngine = new RBACEngine(db);

// =====================================================
// MIDDLEWARE
// =====================================================

/**
 * Verify user organization context
 */
const verifyOrgContext = (req: Request, res: Response, next: Function) => {
  const userId = req.user?.id;
  const orgId = req.user?.org_id;

  if (!userId || !orgId) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized - missing user or organization context",
      timestamp: new Date().toISOString(),
    });
  }

  res.locals.userId = userId;
  res.locals.orgId = orgId;
  res.locals.ipAddress = req.ip;
  res.locals.userAgent = req.get("user-agent");

  next();
};

/**
 * Verify manage_integrations permission
 */
const verifyManageIntegrations = async (
  req: Request,
  res: Response,
  next: Function,
) => {
  const userId = res.locals.userId;
  const orgId = res.locals.orgId;

  const hasPermission = await rbacEngine.hasPermission(
    userId,
    orgId,
    "manage_integrations",
  );

  if (!hasPermission) {
    return res.status(403).json({
      success: false,
      error: "Forbidden - missing manage_integrations permission",
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

router.use(verifyOrgContext);

// =====================================================
// OAUTH & CONNECTION ENDPOINTS
// =====================================================

/**
 * POST /api/calendar/integrations/authorize/:provider
 * Initiate OAuth authorization with a provider
 */
router.post("/authorize/:provider", async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const { orgId, userId } = res.locals;

    if (!["outlook", "google"].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: "Invalid provider. Must be 'outlook' or 'google'",
        timestamp: new Date().toISOString(),
      });
    }

    let authUrl: string | null = null;

    if (provider === "outlook") {
      if (!azureAuthClient.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: "Outlook OAuth not configured",
          timestamp: new Date().toISOString(),
        });
      }
      authUrl = azureAuthClient.getAuthorizationUrl(orgId, userId);
    } else if (provider === "google") {
      if (!googleCalendarAuthClient.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: "Google OAuth not configured",
          timestamp: new Date().toISOString(),
        });
      }
      authUrl = googleCalendarAuthClient.getAuthorizationUrl(orgId, userId);
    }

    logger.info(`[Integrations] OAuth initiated for ${provider}`, {
      provider,
      userId,
      orgId,
    });

    res.json({
      success: true,
      data: {
        authorization_url: authUrl,
        provider,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Integrations] Authorization initiation failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to initiate authorization",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/calendar/integrations/callback/:provider
 * Handle OAuth callback
 */
router.get("/callback/:provider", async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const { code, state, error, error_description } = req.query;

    if (error) {
      logger.warn(`[Integrations] OAuth error from ${provider}:`, {
        error,
        error_description,
      });

      return res.redirect(
        `/?oauth_error=${encodeURIComponent(error_description || error)}`,
      );
    }

    if (!code || !state) {
      throw new Error("Missing authorization code or state");
    }

    let result: any = null;

    if (provider === "outlook") {
      result = await azureAuthClient.exchangeCode(
        code as string,
        state as string,
      );
    } else if (provider === "google") {
      result = await googleCalendarAuthClient.exchangeCode(
        code as string,
        state as string,
      );
    } else {
      throw new Error("Invalid provider");
    }

    if (!result) {
      throw new Error("Token exchange failed");
    }

    logger.info(`[Integrations] OAuth callback successful for ${provider}`, {
      provider,
      userId: result.user_id,
      orgId: result.org_id,
    });

    res.redirect("/?oauth_success=true");
  } catch (error) {
    logger.error(`[Integrations] OAuth callback failed:`, error);
    res.redirect("/?oauth_error=Authorization%20failed");
  }
});

/**
 * POST /api/calendar/integrations/disconnect/:integrationId
 * Disconnect an integration
 */
router.post(
  "/disconnect/:integrationId",
  verifyManageIntegrations,
  async (req: Request, res: Response) => {
    try {
      const { integrationId } = req.params;
      const { orgId } = res.locals;

      // Get integration
      const integration = await db.query(
        "SELECT * FROM calendar_integrations WHERE id = $1 AND org_id = $2",
        [integrationId, orgId],
      );

      if (integration.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Integration not found",
          timestamp: new Date().toISOString(),
        });
      }

      const integ = integration.rows[0];

      // Revoke token if needed
      if (integ.provider === "google") {
        await googleCalendarAuthClient.revokeToken(integ.access_token);
      }

      // Mark as inactive
      await db.query(
        "UPDATE calendar_integrations SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [integrationId],
      );

      logger.info("[Integrations] Integration disconnected", {
        integrationId,
        provider: integ.provider,
        orgId,
      });

      res.json({
        success: true,
        message: "Integration disconnected",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[Integrations] Disconnect failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to disconnect integration",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

// =====================================================
// INTEGRATION MANAGEMENT ENDPOINTS
// =====================================================

/**
 * GET /api/calendar/integrations
 * List all integrations for the organization
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { orgId } = res.locals;

    const result = await db.query(
      `SELECT id, provider, provider_display_name, sync_enabled, last_sync_at, sync_status, is_active, created_at
       FROM calendar_integrations
       WHERE org_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [orgId],
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Integrations] List failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to list integrations",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/calendar/integrations/:integrationId
 * Get integration details
 */
router.get("/:integrationId", async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    const { orgId } = res.locals;

    const result = await db.query(
      `SELECT id, provider, provider_display_name, sync_enabled, last_sync_at, 
              sync_status, is_active, created_at, metadata
       FROM calendar_integrations
       WHERE id = $1 AND org_id = $2`,
      [integrationId, orgId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Integration not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Get sync logs
    const logsResult = await db.query(
      `SELECT sync_type, status, events_created, events_updated, events_deleted, 
              conflicts_detected, started_at, completed_at
       FROM calendar_integration_sync_logs
       WHERE integration_id = $1
       ORDER BY started_at DESC
       LIMIT 10`,
      [integrationId],
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        recent_syncs: logsResult.rows,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Integrations] Get failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get integration",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/calendar/integrations/:integrationId/sync
 * Trigger synchronization
 */
router.post(
  "/:integrationId/sync",
  verifyManageIntegrations,
  async (req: Request, res: Response) => {
    try {
      const { integrationId } = req.params;
      const { orgId } = res.locals;
      const { syncType = "incremental" } = req.body;

      // Verify integration exists
      const integration = await db.query(
        "SELECT * FROM calendar_integrations WHERE id = $1 AND org_id = $2",
        [integrationId, orgId],
      );

      if (integration.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Integration not found",
          timestamp: new Date().toISOString(),
        });
      }

      // Perform sync
      let syncResult;
      if (syncType === "full") {
        syncResult = await calendarSyncEngine.performFullSync(integrationId);
      } else {
        syncResult =
          await calendarSyncEngine.performIncrementalSync(integrationId);
      }

      logger.info("[Integrations] Sync triggered", {
        integrationId,
        syncType,
        result: syncResult.status,
      });

      res.json({
        success: true,
        data: {
          sync_id: integrationId,
          status: syncResult.status,
          events_created: syncResult.eventsCreated,
          events_updated: syncResult.eventsUpdated,
          events_deleted: syncResult.eventsDeleted,
          conflicts_detected: syncResult.conflictsDetected,
          conflicts_resolved: syncResult.conflictsResolved,
          duration_ms: syncResult.durationMs,
          errors: syncResult.errors,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[Integrations] Sync failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to trigger sync",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * GET /api/calendar/integrations/:integrationId/sync-status
 * Get current sync status
 */
router.get(
  "/:integrationId/sync-status",
  async (req: Request, res: Response) => {
    try {
      const { integrationId } = req.params;
      const { orgId } = res.locals;

      const result = await db.query(
        `SELECT sync_status, last_sync_at, last_error, error_count, consecutive_failures
       FROM calendar_integrations
       WHERE id = $1 AND org_id = $2`,
        [integrationId, orgId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Integration not found",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: result.rows[0],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[Integrations] Sync status check failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get sync status",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

// =====================================================
// WEBHOOK MANAGEMENT ENDPOINTS
// =====================================================

/**
 * POST /api/calendar/integrations/webhooks
 * Create a webhook
 */
router.post(
  "/webhooks",
  verifyManageIntegrations,
  async (req: Request, res: Response) => {
    try {
      const { webhookUrl, webhookSecret, events, name } = req.body;
      const { orgId, userId } = res.locals;

      if (!webhookUrl || !webhookSecret || !Array.isArray(events)) {
        return res.status(400).json({
          success: false,
          error:
            "Missing required fields: webhookUrl, webhookSecret, events (array)",
          timestamp: new Date().toISOString(),
        });
      }

      const webhookId = await calendarWebhookManager.createWebhook(
        orgId,
        webhookUrl,
        webhookSecret,
        events,
        userId,
        name,
      );

      if (!webhookId) {
        throw new Error("Failed to create webhook");
      }

      logger.info("[Integrations] Webhook created", { webhookId, orgId });

      res.status(201).json({
        success: true,
        data: { webhook_id: webhookId },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[Integrations] Webhook creation failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create webhook",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * GET /api/calendar/integrations/webhooks
 * List all webhooks
 */
router.get("/webhooks", async (req: Request, res: Response) => {
  try {
    const { orgId } = res.locals;

    const webhooks = await calendarWebhookManager.listWebhooks(orgId);

    res.json({
      success: true,
      data: webhooks,
      count: webhooks.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Integrations] Webhook list failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to list webhooks",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/calendar/integrations/webhooks/:webhookId
 * Get webhook details
 */
router.get("/webhooks/:webhookId", async (req: Request, res: Response) => {
  try {
    const { webhookId } = req.params;
    const { orgId } = res.locals;

    const webhook = await calendarWebhookManager.getWebhook(webhookId, orgId);

    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: "Webhook not found",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: webhook,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Integrations] Webhook get failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get webhook",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PATCH /api/calendar/integrations/webhooks/:webhookId
 * Update webhook
 */
router.patch(
  "/webhooks/:webhookId",
  verifyManageIntegrations,
  async (req: Request, res: Response) => {
    try {
      const { webhookId } = req.params;
      const { orgId } = res.locals;
      const updates = req.body;

      const success = await calendarWebhookManager.updateWebhook(
        webhookId,
        orgId,
        updates,
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          error: "Webhook not found",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        message: "Webhook updated",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[Integrations] Webhook update failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update webhook",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * DELETE /api/calendar/integrations/webhooks/:webhookId
 * Delete webhook
 */
router.delete(
  "/webhooks/:webhookId",
  verifyManageIntegrations,
  async (req: Request, res: Response) => {
    try {
      const { webhookId } = req.params;
      const { orgId } = res.locals;

      const success = await calendarWebhookManager.deleteWebhook(
        webhookId,
        orgId,
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          error: "Webhook not found",
          timestamp: new Date().toISOString(),
        });
      }

      logger.info("[Integrations] Webhook deleted", { webhookId, orgId });

      res.json({
        success: true,
        message: "Webhook deleted",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[Integrations] Webhook deletion failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete webhook",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * POST /api/calendar/integrations/webhooks/:webhookId/test
 * Test webhook delivery
 */
router.post(
  "/webhooks/:webhookId/test",
  async (req: Request, res: Response) => {
    try {
      const { webhookId } = req.params;
      const { orgId } = res.locals;

      const success = await calendarWebhookManager.testWebhook(
        webhookId,
        orgId,
      );

      res.json({
        success: true,
        data: { test_passed: success },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[Integrations] Webhook test failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to test webhook",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

/**
 * GET /api/calendar/integrations/webhooks/:webhookId/history
 * Get webhook event history
 */
router.get(
  "/webhooks/:webhookId/history",
  async (req: Request, res: Response) => {
    try {
      const { webhookId } = req.params;
      const { limit = 50 } = req.query;

      const history = await calendarWebhookManager.getWebhookHistory(
        webhookId,
        parseInt(limit as string),
      );

      res.json({
        success: true,
        data: history,
        count: history.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[Integrations] History fetch failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get history",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

export default router;
