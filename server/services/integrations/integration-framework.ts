/**
 * Integration Framework
 * 
 * Generic plugin architecture for integrations (Teams, Slack, etc.)
 * All integrations are optional - native features work independently
 * All text is i18n-ready with translation keys
 */

import { logger } from '../../utils/logger.js';
import { supabase } from '../../lib/supabase.js';

export interface Integration {
  id: string;
  orgId: string;
  type: 'teams' | 'slack' | 'webhook' | 'custom';
  name: string;
  nameKey?: string; // i18n key: "integrations.teams"
  enabled: boolean;
  config: Record<string, any>;
  credentials: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string;
    clientId?: string;
    clientSecret?: string;
    webhookUrl?: string;
  };
  permissions: IntegrationPermission[];
  lastSync?: string;
  syncStatus?: 'success' | 'error' | 'pending';
  syncError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationPermission {
  resource: string;
  action: 'read' | 'write' | 'admin';
  granted: boolean;
}

export interface IntegrationEvent {
  id: string;
  integrationId: string;
  type: string;
  payload: any;
  status: 'pending' | 'sent' | 'failed';
  retryCount: number;
  error?: string;
  timestamp: string;
}

export interface Webhook {
  id: string;
  orgId: string;
  name: string;
  nameKey?: string; // i18n key
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  headers?: Record<string, string>;
  retryCount: number;
  lastTriggered?: string;
  lastSuccess?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

class IntegrationFramework {
  private integrations: Map<string, Integration> = new Map();
  private webhooks: Map<string, Webhook> = new Map();
  private eventQueue: IntegrationEvent[] = [];

  /**
   * Register integration
   */
  async registerIntegration(integration: Omit<Integration, 'id' | 'createdAt' | 'updatedAt'>): Promise<Integration> {
    try {
      const integrationRecord: Integration = {
        id: `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...integration,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to database
      await this.saveIntegration(integrationRecord);

      // Store in memory
      this.integrations.set(integrationRecord.id, integrationRecord);

      logger.info(`[IntegrationFramework] Registered integration: ${integrationRecord.type}`);

      return integrationRecord;
    } catch (error) {
      logger.error('[IntegrationFramework] Error registering integration:', error);
      throw error;
    }
  }

  /**
   * Update integration
   */
  async updateIntegration(
    integrationId: string,
    updates: Partial<Integration>,
    orgId: string
  ): Promise<Integration> {
    try {
      const integration = this.integrations.get(integrationId);
      if (!integration || integration.orgId !== orgId) {
        throw new Error('Integration not found');
      }

      const updated: Integration = {
        ...integration,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Save to database
      await this.updateIntegrationInDB(updated);

      // Update in memory
      this.integrations.set(integrationId, updated);

      return updated;
    } catch (error) {
      logger.error('[IntegrationFramework] Error updating integration:', error);
      throw error;
    }
  }

  /**
   * Delete integration
   */
  async deleteIntegration(integrationId: string, orgId: string): Promise<void> {
    try {
      const integration = this.integrations.get(integrationId);
      if (!integration || integration.orgId !== orgId) {
        throw new Error('Integration not found');
      }

      // Delete from database
      await this.deleteIntegrationFromDB(integrationId, orgId);

      // Remove from memory
      this.integrations.delete(integrationId);

      logger.info(`[IntegrationFramework] Deleted integration: ${integrationId}`);
    } catch (error) {
      logger.error('[IntegrationFramework] Error deleting integration:', error);
      throw error;
    }
  }

  /**
   * Get integrations for organization
   */
  async getIntegrations(orgId: string, type?: string): Promise<Integration[]> {
    try {
      let query = supabase
        .from('integrations')
        .select('*')
        .eq('org_id', orgId);

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(row => this.mapRowToIntegration(row));
    } catch (error) {
      logger.error('[IntegrationFramework] Error getting integrations:', error);
      throw error;
    }
  }

  /**
   * Create webhook
   */
  async createWebhook(webhook: Omit<Webhook, 'id' | 'createdAt' | 'updatedAt'>): Promise<Webhook> {
    try {
      const webhookRecord: Webhook = {
        id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...webhook,
        secret: webhook.secret || this.generateSecret(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to database
      await this.saveWebhook(webhookRecord);

      // Store in memory
      this.webhooks.set(webhookRecord.id, webhookRecord);

      logger.info(`[IntegrationFramework] Created webhook: ${webhookRecord.name}`);

      return webhookRecord;
    } catch (error) {
      logger.error('[IntegrationFramework] Error creating webhook:', error);
      throw error;
    }
  }

  /**
   * Trigger webhook
   */
  async triggerWebhook(webhookId: string, event: string, payload: any): Promise<void> {
    try {
      const webhook = this.webhooks.get(webhookId);
      if (!webhook || !webhook.enabled) {
        throw new Error('Webhook not found or disabled');
      }

      // Check if webhook listens to this event
      if (!webhook.events.includes(event) && !webhook.events.includes('*')) {
        return; // Webhook doesn't listen to this event
      }

      // Sign payload
      const signature = this.signPayload(payload, webhook.secret);

      // Send webhook
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Signature': signature,
          'X-Webhook-Id': webhook.id,
          ...webhook.headers,
        },
        body: JSON.stringify({
          event,
          payload,
          timestamp: new Date().toISOString(),
        }),
      });

      // Update webhook stats
      await this.updateWebhookStats(webhookId, response.ok);

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.statusText}`);
      }

      logger.info(`[IntegrationFramework] Webhook triggered: ${webhookId} - ${event}`);
    } catch (error: any) {
      logger.error('[IntegrationFramework] Error triggering webhook:', error);
      
      // Update webhook error stats
      await this.updateWebhookStats(webhookId, false, error.message);
      
      throw error;
    }
  }

  /**
   * Send notification via integration
   */
  async sendNotification(
    integrationId: string,
    notification: {
      title: string;
      titleKey?: string; // i18n key
      message: string;
      messageKey?: string; // i18n key
      priority: 'low' | 'normal' | 'high' | 'critical';
      actionUrl?: string;
      metadata?: Record<string, any>;
    },
    orgId: string
  ): Promise<void> {
    try {
      const integration = this.integrations.get(integrationId);
      if (!integration || integration.orgId !== orgId || !integration.enabled) {
        throw new Error('Integration not found or disabled');
      }

      // Route to appropriate handler based on type
      switch (integration.type) {
        case 'teams':
          await this.sendTeamsNotification(integration, notification);
          break;
        case 'slack':
          await this.sendSlackNotification(integration, notification);
          break;
        case 'webhook':
          await this.triggerWebhook(integrationId, 'notification', notification);
          break;
        default:
          throw new Error(`Unknown integration type: ${integration.type}`);
      }

      logger.info(`[IntegrationFramework] Notification sent via ${integration.type}`);
    } catch (error) {
      logger.error('[IntegrationFramework] Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Sync integration (OAuth refresh, data sync, etc.)
   */
  async syncIntegration(integrationId: string, orgId: string): Promise<void> {
    try {
      const integration = this.integrations.get(integrationId);
      if (!integration || integration.orgId !== orgId) {
        throw new Error('Integration not found');
      }

      // Update sync status
      await this.updateIntegration(integrationId, {
        syncStatus: 'pending',
        lastSync: new Date().toISOString(),
      }, orgId);

      // Route to appropriate sync handler
      switch (integration.type) {
        case 'teams':
          await this.syncTeamsIntegration(integration);
          break;
        case 'slack':
          await this.syncSlackIntegration(integration);
          break;
        default:
          // Generic sync
          break;
      }

      // Update sync status to success
      await this.updateIntegration(integrationId, {
        syncStatus: 'success',
        lastSync: new Date().toISOString(),
      }, orgId);

      logger.info(`[IntegrationFramework] Integration synced: ${integrationId}`);
    } catch (error: any) {
      logger.error('[IntegrationFramework] Error syncing integration:', error);
      
      // Update sync status to error
      await this.updateIntegration(integrationId, {
        syncStatus: 'error',
        syncError: error.message,
      }, orgId);
      
      throw error;
    }
  }

  /**
   * Teams-specific handlers
   */
  private async sendTeamsNotification(
    integration: Integration,
    notification: any
  ): Promise<void> {
    // In production, use Teams Graph API
    logger.info(`[IntegrationFramework] Teams notification: ${notification.title}`);
  }

  private async syncTeamsIntegration(integration: Integration): Promise<void> {
    // In production, refresh OAuth token, sync calendar, etc.
    logger.info(`[IntegrationFramework] Syncing Teams integration: ${integration.id}`);
  }

  /**
   * Slack-specific handlers
   */
  private async sendSlackNotification(
    integration: Integration,
    notification: any
  ): Promise<void> {
    // In production, use Slack Web API
    logger.info(`[IntegrationFramework] Slack notification: ${notification.title}`);
  }

  private async syncSlackIntegration(integration: Integration): Promise<void> {
    // In production, refresh OAuth token, sync channels, etc.
    logger.info(`[IntegrationFramework] Syncing Slack integration: ${integration.id}`);
  }

  /**
   * Helper methods
   */
  private generateSecret(): string {
    return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 32)}`;
  }

  private signPayload(payload: any, secret: string): string {
    // In production, use HMAC-SHA256
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  private mapRowToIntegration(row: any): Integration {
    return {
      id: row.id,
      orgId: row.org_id,
      type: row.type,
      name: row.name,
      nameKey: row.name_key,
      enabled: row.enabled,
      config: row.config || {},
      credentials: row.credentials || {},
      permissions: row.permissions || [],
      lastSync: row.last_sync,
      syncStatus: row.sync_status,
      syncError: row.sync_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async saveIntegration(integration: Integration): Promise<void> {
    try {
      const { error } = await supabase
        .from('integrations')
        .upsert({
          id: integration.id,
          org_id: integration.orgId,
          type: integration.type,
          name: integration.name,
          name_key: integration.nameKey,
          enabled: integration.enabled,
          config: integration.config,
          credentials: integration.credentials,
          permissions: integration.permissions,
          last_sync: integration.lastSync,
          sync_status: integration.syncStatus,
          sync_error: integration.syncError,
          created_at: integration.createdAt,
          updated_at: integration.updatedAt,
        });

      if (error) throw error;
    } catch (error) {
      logger.error('[IntegrationFramework] Error saving integration:', error);
      throw error;
    }
  }

  private async updateIntegrationInDB(integration: Integration): Promise<void> {
    await this.saveIntegration(integration);
  }

  private async deleteIntegrationFromDB(integrationId: string, orgId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', integrationId)
        .eq('org_id', orgId);

      if (error) throw error;
    } catch (error) {
      logger.error('[IntegrationFramework] Error deleting integration:', error);
      throw error;
    }
  }

  private async saveWebhook(webhook: Webhook): Promise<void> {
    try {
      const { error } = await supabase
        .from('webhooks')
        .upsert({
          id: webhook.id,
          org_id: webhook.orgId,
          name: webhook.name,
          name_key: webhook.nameKey,
          url: webhook.url,
          secret: webhook.secret,
          events: webhook.events,
          enabled: webhook.enabled,
          headers: webhook.headers,
          retry_count: webhook.retryCount,
          last_triggered: webhook.lastTriggered,
          last_success: webhook.lastSuccess,
          last_error: webhook.lastError,
          created_at: webhook.createdAt,
          updated_at: webhook.updatedAt,
        });

      if (error) throw error;
    } catch (error) {
      logger.error('[IntegrationFramework] Error saving webhook:', error);
      throw error;
    }
  }

  private async updateWebhookStats(
    webhookId: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      const webhook = this.webhooks.get(webhookId);
      if (!webhook) return;

      const updates: Partial<Webhook> = {
        lastTriggered: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (success) {
        updates.lastSuccess = new Date().toISOString();
        updates.lastError = undefined;
      } else {
        updates.lastError = error;
        updates.retryCount = (webhook.retryCount || 0) + 1;
      }

      const updated = { ...webhook, ...updates };
      await this.saveWebhook(updated);
      this.webhooks.set(webhookId, updated);
    } catch (error) {
      logger.error('[IntegrationFramework] Error updating webhook stats:', error);
    }
  }
}

export const integrationFramework = new IntegrationFramework();
