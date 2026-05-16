/**
 * Integration API Routes
 * 
 * Endpoints for managing integrations (Teams, Slack, webhooks, etc.)
 * All text is i18n-ready with translation keys
 */

import { Router, Request, Response } from 'express';
import { jwtAuthMiddleware } from '../middleware/auth-jwt.js';
import { integrationFramework } from '../services/integrations/integration-framework.js';
import { teamsIntegration } from '../services/integrations/teams-integration.js';
import { slackIntegration } from '../services/integrations/slack-integration.js';

const router = Router();

/**
 * GET /api/integrations
 * Get all integrations for organization
 */
router.get('/', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId || req.query.orgId as string;
    const type = req.query.type as string | undefined;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const integrations = await integrationFramework.getIntegrations(orgId, type);

    res.json({ success: true, data: integrations });
  } catch (error: any) {
    console.error('[Integrations] Error fetching integrations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/integrations
 * Register new integration
 */
router.post('/', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId || req.body.orgId;
    const { type, name, nameKey, config, credentials, permissions } = req.body;

    if (!orgId || !type) {
      return res.status(400).json({ success: false, error: 'orgId and type required' });
    }

    const integration = await integrationFramework.registerIntegration({
      orgId,
      type,
      name: name || type,
      nameKey,
      enabled: true,
      config: config || {},
      credentials: credentials || {},
      permissions: permissions || [],
      syncStatus: 'pending',
    });

    res.json({ success: true, data: integration });
  } catch (error: any) {
    console.error('[Integrations] Error registering integration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/integrations/:id
 * Update integration
 */
router.patch('/:id', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const integration = await integrationFramework.updateIntegration(id, updates, orgId);

    res.json({ success: true, data: integration });
  } catch (error: any) {
    console.error('[Integrations] Error updating integration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/integrations/:id
 * Delete integration
 */
router.delete('/:id', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user?.orgId || req.query.orgId as string;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    await integrationFramework.deleteIntegration(id, orgId);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Integrations] Error deleting integration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/integrations/:id/sync
 * Sync integration
 */
router.post('/:id/sync', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    await integrationFramework.syncIntegration(id, orgId);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Integrations] Error syncing integration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/integrations/:id/notifications
 * Send notification via integration
 */
router.post('/:id/notifications', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, titleKey, message, messageKey, priority, actionUrl, metadata } = req.body;
    const orgId = req.user?.orgId || req.body.orgId;

    if (!orgId || !title || !message) {
      return res.status(400).json({ success: false, error: 'orgId, title, and message required' });
    }

    await integrationFramework.sendNotification(
      id,
      { title, titleKey, message, messageKey, priority: priority || 'normal', actionUrl, metadata },
      orgId
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Integrations] Error sending notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Teams OAuth Routes
 */

/**
 * GET /api/integrations/teams/auth-url
 * Get Teams OAuth authorization URL
 */
router.get('/teams/auth-url', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { clientId, clientSecret, tenantId, redirectUri, scopes } = req.query;

    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(400).json({ success: false, error: 'clientId, clientSecret, and redirectUri required' });
    }

    const state = `${req.user?.orgId}_${Date.now()}`;
    const config = {
      clientId: clientId as string,
      clientSecret: clientSecret as string,
      tenantId: tenantId as string | undefined,
      redirectUri: redirectUri as string,
      scopes: scopes ? (scopes as string).split(',') : undefined,
    };

    const authUrl = teamsIntegration.generateAuthUrl(config, state);

    res.json({ success: true, data: { authUrl, state } });
  } catch (error: any) {
    console.error('[Integrations] Error generating Teams auth URL:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/integrations/teams/callback
 * Handle Teams OAuth callback
 */
router.post('/teams/callback', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { code, state, clientId, clientSecret, tenantId, redirectUri, scopes } = req.body;

    if (!code || !clientId || !clientSecret || !redirectUri) {
      return res.status(400).json({ success: false, error: 'code, clientId, clientSecret, and redirectUri required' });
    }

    const orgId = state?.split('_')[0] || req.user?.orgId;
    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const config = {
      clientId,
      clientSecret,
      tenantId,
      redirectUri,
      scopes,
    };

    const oauthResponse = await teamsIntegration.exchangeCodeForToken(code, config);
    const integration = await teamsIntegration.registerIntegration(orgId, config, oauthResponse);

    res.json({ success: true, data: integration });
  } catch (error: any) {
    console.error('[Integrations] Error handling Teams callback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Slack OAuth Routes
 */

/**
 * GET /api/integrations/slack/auth-url
 * Get Slack OAuth authorization URL
 */
router.get('/slack/auth-url', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { clientId, clientSecret, redirectUri, scopes } = req.query;

    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(400).json({ success: false, error: 'clientId, clientSecret, and redirectUri required' });
    }

    const state = `${req.user?.orgId}_${Date.now()}`;
    const config = {
      clientId: clientId as string,
      clientSecret: clientSecret as string,
      redirectUri: redirectUri as string,
      scopes: scopes ? (scopes as string).split(',') : undefined,
    };

    const authUrl = slackIntegration.generateAuthUrl(config, state);

    res.json({ success: true, data: { authUrl, state } });
  } catch (error: any) {
    console.error('[Integrations] Error generating Slack auth URL:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/integrations/slack/callback
 * Handle Slack OAuth callback
 */
router.post('/slack/callback', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { code, state, clientId, clientSecret, redirectUri, scopes } = req.body;

    if (!code || !clientId || !clientSecret || !redirectUri) {
      return res.status(400).json({ success: false, error: 'code, clientId, clientSecret, and redirectUri required' });
    }

    const orgId = state?.split('_')[0] || req.user?.orgId;
    if (!orgId) {
      return res.status(400).json({ success: false, error: 'orgId required' });
    }

    const config = {
      clientId,
      clientSecret,
      redirectUri,
      scopes,
    };

    const oauthResponse = await slackIntegration.exchangeCodeForToken(code, config);
    const integration = await slackIntegration.registerIntegration(orgId, config, oauthResponse);

    res.json({ success: true, data: integration });
  } catch (error: any) {
    console.error('[Integrations] Error handling Slack callback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Webhook Routes
 */

/**
 * POST /api/integrations/webhooks
 * Create webhook
 */
router.post('/webhooks', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId || req.body.orgId;
    const { name, nameKey, url, events, enabled, headers } = req.body;

    if (!orgId || !name || !url || !events) {
      return res.status(400).json({ success: false, error: 'orgId, name, url, and events required' });
    }

    const webhook = await integrationFramework.createWebhook({
      orgId,
      name,
      nameKey,
      url,
      events: Array.isArray(events) ? events : [events],
      enabled: enabled !== false,
      headers: headers || {},
      retryCount: 0,
    });

    res.json({ success: true, data: webhook });
  } catch (error: any) {
    console.error('[Integrations] Error creating webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/integrations/webhooks/:id/trigger
 * Trigger webhook manually (for testing)
 */
router.post('/webhooks/:id/trigger', jwtAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { event, payload } = req.body;

    if (!event || !payload) {
      return res.status(400).json({ success: false, error: 'event and payload required' });
    }

    await integrationFramework.triggerWebhook(id, event, payload);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Integrations] Error triggering webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
