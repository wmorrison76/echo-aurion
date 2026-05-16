/**
 * Microsoft Teams Integration
 * 
 * OAuth-based integration with Microsoft Teams
 * All features are optional - native features work independently
 * All text is i18n-ready with translation keys
 */

import { logger } from '../../utils/logger.js';
import { integrationFramework, type Integration } from './integration-framework.js';

export interface TeamsConfig {
  clientId: string;
  clientSecret: string;
  tenantId?: string;
  redirectUri: string;
  scopes?: string[];
}

export interface TeamsOAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

class TeamsIntegration {
  private readonly AUTH_URL = 'https://login.microsoftonline.com';
  private readonly GRAPH_API_URL = 'https://graph.microsoft.com/v1.0';

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(config: TeamsConfig, state: string): string {
    const tenantId = config.tenantId || 'common';
    const scopes = config.scopes || [
      'https://graph.microsoft.com/User.Read',
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'https://graph.microsoft.com/TeamsAppInstallation.ReadWriteForUser',
      'https://graph.microsoft.com/Chat.ReadWrite',
    ];

    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: config.redirectUri,
      response_mode: 'query',
      scope: scopes.join(' '),
      state,
      prompt: 'consent',
    });

    return `${this.AUTH_URL}/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    config: TeamsConfig
  ): Promise<TeamsOAuthResponse> {
    try {
      const tenantId = config.tenantId || 'common';
      const url = `${this.AUTH_URL}/${tenantId}/oauth2/v2.0/token`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.redirectUri,
          grant_type: 'authorization_code',
          scope: 'https://graph.microsoft.com/.default',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Teams OAuth error: ${error}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope,
      };
    } catch (error) {
      logger.error('[TeamsIntegration] Error exchanging code for token:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    refreshToken: string,
    config: TeamsConfig
  ): Promise<TeamsOAuthResponse> {
    try {
      const tenantId = config.tenantId || 'common';
      const url = `${this.AUTH_URL}/${tenantId}/oauth2/v2.0/token`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: 'https://graph.microsoft.com/.default',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh Teams token');
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope,
      };
    } catch (error) {
      logger.error('[TeamsIntegration] Error refreshing token:', error);
      throw error;
    }
  }

  /**
   * Send message to Teams channel
   */
  async sendChannelMessage(
    accessToken: string,
    teamId: string,
    channelId: string,
    message: {
      title: string;
      titleKey?: string; // i18n key
      content: string;
      contentKey?: string; // i18n key
    }
  ): Promise<void> {
    try {
      const url = `${this.GRAPH_API_URL}/teams/${teamId}/channels/${channelId}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: {
            contentType: 'html',
            content: `<p><strong>${message.title}</strong></p><p>${message.content}</p>`,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send Teams message');
      }

      logger.info('[TeamsIntegration] Message sent to Teams channel');
    } catch (error) {
      logger.error('[TeamsIntegration] Error sending Teams message:', error);
      throw error;
    }
  }

  /**
   * Send personal message (chat)
   */
  async sendPersonalMessage(
    accessToken: string,
    userId: string,
    message: {
      title: string;
      titleKey?: string; // i18n key
      content: string;
      contentKey?: string; // i18n key
    }
  ): Promise<void> {
    try {
      // Create or get chat
      const chatId = await this.getOrCreateChat(accessToken, userId);

      const url = `${this.GRAPH_API_URL}/chats/${chatId}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: {
            contentType: 'html',
            content: `<p><strong>${message.title}</strong></p><p>${message.content}</p>`,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send Teams personal message');
      }

      logger.info('[TeamsIntegration] Personal message sent to Teams');
    } catch (error) {
      logger.error('[TeamsIntegration] Error sending Teams personal message:', error);
      throw error;
    }
  }

  /**
   * Get or create chat with user
   */
  private async getOrCreateChat(accessToken: string, userId: string): Promise<string> {
    try {
      // Try to find existing chat
      const url = `${this.GRAPH_API_URL}/chats?$filter=members/any(m: m/userId eq '${userId}')`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.value && data.value.length > 0) {
          return data.value[0].id;
        }
      }

      // Create new chat
      const createUrl = `${this.GRAPH_API_URL}/chats`;

      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatType: 'oneOnOne',
          members: [
            {
              '@odata.type': '#microsoft.graph.aadUserConversationMember',
              'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${userId}')`,
            },
          ],
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create Teams chat');
      }

      const chat = await createResponse.json();
      return chat.id;
    } catch (error) {
      logger.error('[TeamsIntegration] Error getting/creating chat:', error);
      throw error;
    }
  }

  /**
   * Sync Teams calendar
   */
  async syncCalendar(
    accessToken: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    try {
      const url = `${this.GRAPH_API_URL}/me/calendar/calendarView?startDateTime=${startDate}&endDateTime=${endDate}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Teams calendar');
      }

      const data = await response.json();
      return data.value || [];
    } catch (error) {
      logger.error('[TeamsIntegration] Error syncing calendar:', error);
      throw error;
    }
  }

  /**
   * Register Teams integration
   */
  async registerIntegration(
    orgId: string,
    config: TeamsConfig,
    oauthResponse: TeamsOAuthResponse
  ): Promise<Integration> {
    const expiresAt = new Date(Date.now() + oauthResponse.expiresIn * 1000).toISOString();

    return await integrationFramework.registerIntegration({
      orgId,
      type: 'teams',
      name: 'Microsoft Teams',
      nameKey: 'integrations.teams', // i18n key
      enabled: true,
      config: {
        tenantId: config.tenantId,
        redirectUri: config.redirectUri,
        scopes: config.scopes,
      },
      credentials: {
        accessToken: oauthResponse.accessToken,
        refreshToken: oauthResponse.refreshToken,
        expiresAt,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      },
      permissions: [
        { resource: 'notifications', action: 'write', granted: true },
        { resource: 'calendar', action: 'read', granted: true },
        { resource: 'calendar', action: 'write', granted: true },
        { resource: 'chat', action: 'write', granted: true },
      ],
      syncStatus: 'success',
      lastSync: new Date().toISOString(),
    });
  }
}

export const teamsIntegration = new TeamsIntegration();
