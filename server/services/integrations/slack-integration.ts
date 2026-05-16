/**
 * Slack Integration
 * 
 * OAuth-based integration with Slack
 * All features are optional - native features work independently
 * All text is i18n-ready with translation keys
 */

import { logger } from '../../utils/logger.js';
import { integrationFramework, type Integration } from './integration-framework.js';

export interface SlackConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

export interface SlackOAuthResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
  scope: string;
  teamId: string;
  teamName: string;
  userId: string;
  botUserId?: string;
  botAccessToken?: string;
}

class SlackIntegration {
  private readonly AUTH_URL = 'https://slack.com/oauth/v2/authorize';
  private readonly TOKEN_URL = 'https://slack.com/api/oauth.v2.access';
  private readonly API_URL = 'https://slack.com/api';

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(config: SlackConfig, state: string): string {
    const scopes = config.scopes || [
      'chat:write',
      'chat:write.public',
      'channels:read',
      'channels:write',
      'users:read',
      'files:write',
      'webhook:write',
    ];

    const params = new URLSearchParams({
      client_id: config.clientId,
      scope: scopes.join(','),
      redirect_uri: config.redirectUri,
      state,
      response_type: 'code',
    });

    return `${this.AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    config: SlackConfig
  ): Promise<SlackOAuthResponse> {
    try {
      const response = await fetch(this.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.redirectUri,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Slack OAuth error: ${error}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return {
        accessToken: data.authed_user.access_token,
        refreshToken: data.authed_user.refresh_token,
        expiresIn: data.authed_user.expires_in,
        tokenType: 'Bearer',
        scope: data.authed_user.scope,
        teamId: data.team.id,
        teamName: data.team.name,
        userId: data.authed_user.id,
        botUserId: data.bot_user_id,
        botAccessToken: data.access_token,
      };
    } catch (error) {
      logger.error('[SlackIntegration] Error exchanging code for token:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    refreshToken: string,
    config: SlackConfig
  ): Promise<SlackOAuthResponse> {
    try {
      const response = await fetch(`${this.API_URL}/oauth.v2.access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh Slack token');
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return {
        accessToken: data.authed_user.access_token,
        refreshToken: data.authed_user.refresh_token || refreshToken,
        expiresIn: data.authed_user.expires_in,
        tokenType: 'Bearer',
        scope: data.authed_user.scope,
        teamId: data.team.id,
        teamName: data.team.name,
        userId: data.authed_user.id,
      };
    } catch (error) {
      logger.error('[SlackIntegration] Error refreshing token:', error);
      throw error;
    }
  }

  /**
   * Send message to Slack channel
   */
  async sendChannelMessage(
    accessToken: string,
    channelId: string,
    message: {
      title: string;
      titleKey?: string; // i18n key
      content: string;
      contentKey?: string; // i18n key
      blocks?: any[];
    }
  ): Promise<void> {
    try {
      const url = `${this.API_URL}/chat.postMessage`;

      const blocks = message.blocks || [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: message.title,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message.content,
          },
        },
      ];

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channelId,
          blocks,
          text: message.title, // Fallback text
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      logger.info('[SlackIntegration] Message sent to Slack channel');
    } catch (error) {
      logger.error('[SlackIntegration] Error sending Slack message:', error);
      throw error;
    }
  }

  /**
   * Send direct message to user
   */
  async sendDirectMessage(
    botAccessToken: string,
    userId: string,
    message: {
      title: string;
      titleKey?: string; // i18n key
      content: string;
      contentKey?: string; // i18n key
    }
  ): Promise<void> {
    try {
      // Open DM channel
      const dmChannel = await this.openDMChannel(botAccessToken, userId);

      // Send message
      await this.sendChannelMessage(botAccessToken, dmChannel.id, message);

      logger.info('[SlackIntegration] Direct message sent to Slack user');
    } catch (error) {
      logger.error('[SlackIntegration] Error sending Slack direct message:', error);
      throw error;
    }
  }

  /**
   * Open DM channel with user
   */
  private async openDMChannel(accessToken: string, userId: string): Promise<{ id: string }> {
    try {
      const url = `${this.API_URL}/conversations.open`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          users: userId,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return data.channel;
    } catch (error) {
      logger.error('[SlackIntegration] Error opening DM channel:', error);
      throw error;
    }
  }

  /**
   * List channels
   */
  async listChannels(accessToken: string): Promise<any[]> {
    try {
      const url = `${this.API_URL}/conversations.list?types=public_channel,private_channel`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return data.channels || [];
    } catch (error) {
      logger.error('[SlackIntegration] Error listing channels:', error);
      throw error;
    }
  }

  /**
   * Create webhook URL for incoming messages (optional)
   */
  async createWebhook(
    accessToken: string,
    channelId: string,
    name: string
  ): Promise<string> {
    try {
      const url = `${this.API_URL}/webhooks.create`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channelId,
          name,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
      }

      return data.url;
    } catch (error) {
      logger.error('[SlackIntegration] Error creating webhook:', error);
      throw error;
    }
  }

  /**
   * Register Slack integration
   */
  async registerIntegration(
    orgId: string,
    config: SlackConfig,
    oauthResponse: SlackOAuthResponse
  ): Promise<Integration> {
    const expiresAt = oauthResponse.expiresIn
      ? new Date(Date.now() + oauthResponse.expiresIn * 1000).toISOString()
      : undefined;

    return await integrationFramework.registerIntegration({
      orgId,
      type: 'slack',
      name: `Slack - ${oauthResponse.teamName}`,
      nameKey: 'integrations.slack', // i18n key
      enabled: true,
      config: {
        teamId: oauthResponse.teamId,
        teamName: oauthResponse.teamName,
        userId: oauthResponse.userId,
        redirectUri: config.redirectUri,
        scopes: config.scopes,
      },
      credentials: {
        accessToken: oauthResponse.accessToken,
        refreshToken: oauthResponse.refreshToken,
        expiresAt,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        webhookUrl: oauthResponse.botAccessToken ? `slack:${oauthResponse.botUserId}` : undefined,
      },
      permissions: [
        { resource: 'notifications', action: 'write', granted: true },
        { resource: 'channels', action: 'read', granted: true },
        { resource: 'channels', action: 'write', granted: true },
        { resource: 'chat', action: 'write', granted: true },
        { resource: 'webhooks', action: 'write', granted: true },
      ],
      syncStatus: 'success',
      lastSync: new Date().toISOString(),
    });
  }
}

export const slackIntegration = new SlackIntegration();
