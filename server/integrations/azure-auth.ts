/**
 * Azure Active Directory (Azure AD) OAuth 2.0 Authentication
 * Handles OAuth authorization flow, token exchange, refresh, and management
 * Supports Microsoft Graph API for Outlook, Teams, and OneDrive integration
 *
 * Token Storage:
 * - Primary: Supabase database (production)
 * - Fallback: In-memory (development, if Supabase unavailable)
 */

import { randomBytes } from 'crypto';
import { logger } from '../lib/logger';
import { getSupabaseClient } from '../lib/supabase-client';

export interface AzureToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  expires_at?: number;
}

export interface UserAzureAuth {
  org_id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  created_at: number;
  scopes: string[];
}

export interface AuthorizationState {
  state: string;
  org_id: string;
  user_id: string;
  created_at: number;
  expires_at: number;
}

// In-memory token storage (in production, use database)
const tokenStore = new Map<string, UserAzureAuth>();
const stateStore = new Map<string, AuthorizationState>();

export class AzureAuthClient {
  private clientId: string;
  private clientSecret: string;
  private tenantId: string;
  private redirectUri: string;
  private scopes: string[];

  constructor(
    clientId?: string,
    clientSecret?: string,
    tenantId?: string,
    redirectUri?: string,
  ) {
    this.clientId = clientId || process.env.OUTLOOK_CLIENT_ID || '';
    this.clientSecret = clientSecret || process.env.OUTLOOK_CLIENT_SECRET || '';
    this.tenantId = tenantId || process.env.OUTLOOK_TENANT_ID || 'common';
    this.redirectUri = redirectUri || process.env.OUTLOOK_REDIRECT_URI || '';
    this.scopes = [
      'Mail.Read',
      'Calendar.Read',
      'User.Read',
      'offline_access',
    ];
  }

  /**
   * Check if Azure AD credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.redirectUri);
  }

  /**
   * Generate authorization URL for OAuth login
   * User clicks this link to authenticate with Microsoft
   */
  getAuthorizationUrl(orgId: string, userId: string): string {
    const state = this.generateState(orgId, userId);
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      state,
      prompt: 'select_account',
    });

    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * Called during OAuth callback
   */
  async exchangeCodeForToken(
    code: string,
    orgId: string,
    userId: string,
  ): Promise<AzureToken> {
    if (!this.isConfigured()) {
      throw new Error('Azure AD credentials not configured');
    }

    try {
      const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;

      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
        scope: this.scopes.join(' '),
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error('[Azure] Token exchange failed', {
          status: response.status,
          error: errorData,
        });
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const tokenData = (await response.json()) as AzureToken;

      // Store token with user context (async)
      await this.storeToken(orgId, userId, tokenData);

      logger.info('[Azure] Token exchange successful', {
        userId,
        orgId,
        expiresIn: tokenData.expires_in,
      });

      return tokenData;
    } catch (error) {
      logger.error('[Azure] Error during token exchange', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(
    orgId: string,
    userId: string,
  ): Promise<AzureToken | null> {
    const auth = await this.getStoredToken(orgId, userId);

    if (!auth || !auth.refresh_token) {
      logger.warn('[Azure] No refresh token available', { userId, orgId });
      return null;
    }

    if (!this.isConfigured()) {
      throw new Error('Azure AD credentials not configured');
    }

    try {
      const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;

      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: auth.refresh_token,
        grant_type: 'refresh_token',
        scope: this.scopes.join(' '),
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error('[Azure] Token refresh failed', {
          status: response.status,
          error: errorData,
        });
        // Clear invalid token
        await this.clearToken(orgId, userId);
        return null;
      }

      const tokenData = (await response.json()) as AzureToken;

      // Update stored token (async)
      await this.storeToken(orgId, userId, tokenData);

      logger.info('[Azure] Token refreshed successfully', {
        userId,
        orgId,
      });

      return tokenData;
    } catch (error) {
      logger.error('[Azure] Error refreshing token', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        orgId,
      });
      return null;
    }
  }

  /**
   * Get valid access token (refresh if expired)
   */
  async getValidToken(
    orgId: string,
    userId: string,
  ): Promise<string | null> {
    const auth = await this.getStoredToken(orgId, userId);

    if (!auth) {
      return null;
    }

    // Check if token is expired (with 5-minute buffer)
    const now = Date.now();
    const bufferMs = 5 * 60 * 1000;

    if (auth.expires_at && auth.expires_at - bufferMs < now) {
      const refreshed = await this.refreshToken(orgId, userId);
      return refreshed?.access_token || null;
    }

    return auth.access_token;
  }

  /**
   * Store token in database (Supabase) with in-memory fallback
   */
  private async storeToken(
    orgId: string,
    userId: string,
    tokenData: AzureToken,
  ): Promise<void> {
    const key = `${orgId}:${userId}`;
    const expiresAt = Date.now() + tokenData.expires_in * 1000;

    const auth: UserAzureAuth = {
      org_id: orgId,
      user_id: userId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || '',
      expires_at: expiresAt,
      created_at: Date.now(),
      scopes: this.scopes,
    };

    // Try to store in Supabase (production)
    const supabase = getSupabaseClient();
    if (supabase.isAvailable()) {
      const success = await supabase.storeAuthToken(orgId, userId, {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || '',
        expires_in: tokenData.expires_in,
        scope: this.scopes.join(' '),
        token_type: tokenData.token_type,
      });

      if (success) {
        logger.debug('[Azure] Token stored in Supabase', {
          userId,
          orgId,
          expiresAt: new Date(expiresAt).toISOString(),
        });
        return;
      }
    }

    // Fallback to in-memory storage (development)
    tokenStore.set(key, auth);
    logger.debug('[Azure] Token stored in memory (Supabase unavailable)', {
      userId,
      orgId,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  }

  /**
   * Retrieve stored token from database or memory
   */
  async getStoredToken(orgId: string, userId: string): Promise<UserAzureAuth | null> {
    // Try Supabase first (production)
    const supabase = getSupabaseClient();
    if (supabase.isAvailable()) {
      const dbToken = await supabase.getAuthToken(orgId, userId);
      if (dbToken) {
        return {
          org_id: dbToken.org_id,
          user_id: dbToken.user_id,
          access_token: dbToken.access_token,
          refresh_token: dbToken.refresh_token,
          expires_at: dbToken.expires_at,
          created_at: new Date(dbToken.created_at).getTime(),
          scopes: dbToken.scopes,
        };
      }
    }

    // Fallback to in-memory (development)
    const key = `${orgId}:${userId}`;
    return tokenStore.get(key) || null;
  }

  /**
   * Clear stored token (logout)
   */
  async clearToken(orgId: string, userId: string): Promise<void> {
    // Try to clear from Supabase
    const supabase = getSupabaseClient();
    if (supabase.isAvailable()) {
      await supabase.deleteAuthToken(orgId, userId);
    }

    // Clear from in-memory storage
    const key = `${orgId}:${userId}`;
    tokenStore.delete(key);
    logger.info('[Azure] Token cleared', { userId, orgId });
  }

  /**
   * Generate state parameter for OAuth flow
   */
  private generateState(orgId: string, userId: string): string {
    const state = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10-minute expiry

    stateStore.set(state, {
      state,
      org_id: orgId,
      user_id: userId,
      created_at: Date.now(),
      expires_at: expiresAt,
    });

    return state;
  }

  /**
   * Validate state parameter (CSRF protection)
   */
  validateState(state: string): AuthorizationState | null {
    const authState = stateStore.get(state);

    if (!authState) {
      logger.warn('[Azure] Invalid state parameter');
      return null;
    }

    // Check if state is expired
    if (authState.expires_at < Date.now()) {
      logger.warn('[Azure] State parameter expired');
      stateStore.delete(state);
      return null;
    }

    // Remove used state
    stateStore.delete(state);
    return authState;
  }

  /**
   * Validate token (basic checks)
   */
  isTokenValid(auth: UserAzureAuth): boolean {
    if (!auth.access_token) {
      return false;
    }

    const now = Date.now();
    const bufferMs = 5 * 60 * 1000;

    return auth.expires_at - bufferMs > now;
  }

  /**
   * Get all stored tokens (admin/debug only)
   */
  async getAllTokens(): Promise<UserAzureAuth[]> {
    const supabase = getSupabaseClient();
    const result: UserAzureAuth[] = [];

    // Try to get from Supabase
    if (supabase.isAvailable()) {
      // Get all orgs' tokens (would need to implement)
      // For now, return from memory
    }

    // Return in-memory tokens as fallback
    return Array.from(tokenStore.values());
  }

  /**
   * Get stored tokens for organization
   */
  async getOrgTokens(orgId: string): Promise<UserAzureAuth[]> {
    const supabase = getSupabaseClient();

    // Try to get from Supabase
    if (supabase.isAvailable()) {
      const dbTokens = await supabase.getOrgTokens(orgId);
      return dbTokens.map((dbToken) => ({
        org_id: dbToken.org_id,
        user_id: dbToken.user_id,
        access_token: dbToken.access_token,
        refresh_token: dbToken.refresh_token,
        expires_at: dbToken.expires_at,
        created_at: new Date(dbToken.created_at).getTime(),
        scopes: dbToken.scopes,
      }));
    }

    // Fallback to in-memory
    return Array.from(tokenStore.values()).filter((t) => t.org_id === orgId);
  }
}

// Singleton instance
export const azureAuthClient = new AzureAuthClient();

/**
 * Default export for backwards compatibility
 */
export default azureAuthClient;
