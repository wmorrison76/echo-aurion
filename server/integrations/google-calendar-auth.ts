/**
 * Google Calendar OAuth 2.0 Authentication
 * Handles OAuth authorization flow, token exchange, refresh, and management
 *
 * Token Storage:
 * - Primary: Neon database
 * - Fallback: In-memory (development only)
 *
 * Environment Variables Required:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - GOOGLE_REDIRECT_URI
 */

import { randomBytes } from "crypto";
import { logger } from "../lib/logger";
import { Database } from "../lib/database-client";

export interface GoogleToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  expires_at?: number;
}

export interface UserGoogleAuth {
  org_id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  created_at: number;
  scopes: string[];
  email?: string;
}

export interface AuthorizationState {
  state: string;
  org_id: string;
  user_id: string;
  created_at: number;
  expires_at: number;
}

// In-memory storage (fallback for development)
const tokenStore = new Map<string, UserGoogleAuth>();
const stateStore = new Map<string, AuthorizationState>();

export class GoogleCalendarAuthClient {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private scopes: string[];
  private db: Database;

  private readonly GOOGLE_AUTH_BASE =
    "https://accounts.google.com/o/oauth2/v2/auth";
  private readonly GOOGLE_TOKEN_ENDPOINT =
    "https://oauth2.googleapis.com/token";
  private readonly GOOGLE_REVOKE_ENDPOINT =
    "https://oauth2.googleapis.com/revoke";
  private readonly STATE_EXPIRY = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || "";
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || "";
    this.db = new Database();

    // Scopes for calendar and email access
    this.scopes = [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];
  }

  /**
   * Check if Google OAuth credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.redirectUri);
  }

  /**
   * Generate authorization URL for OAuth login
   * User clicks this link to authenticate with Google
   */
  getAuthorizationUrl(orgId: string, userId: string): string {
    const state = this.generateState(orgId, userId);
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: this.scopes.join(" "),
      state,
      access_type: "offline", // Request refresh token
      prompt: "consent", // Force consent screen
    });

    return `${this.GOOGLE_AUTH_BASE}?${params.toString()}`;
  }

  /**
   * Generate and store authorization state
   * State is used to prevent CSRF attacks
   */
  private generateState(orgId: string, userId: string): string {
    const state = randomBytes(32).toString("hex");
    const expiresAt = Date.now() + this.STATE_EXPIRY;

    stateStore.set(state, {
      state,
      org_id: orgId,
      user_id: userId,
      created_at: Date.now(),
      expires_at: expiresAt,
    });

    // Cleanup expired states
    this.cleanupExpiredStates();

    return state;
  }

  /**
   * Verify authorization state
   * Ensures the state matches and hasn't expired
   */
  private verifyState(state: string): { orgId: string; userId: string } | null {
    const stateData = stateStore.get(state);

    if (!stateData) {
      logger.warn("[Google Auth] Invalid state parameter");
      return null;
    }

    if (stateData.expires_at < Date.now()) {
      stateStore.delete(state);
      logger.warn("[Google Auth] State expired");
      return null;
    }

    stateStore.delete(state);
    return { orgId: stateData.org_id, userId: stateData.user_id };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(
    code: string,
    state: string,
  ): Promise<UserGoogleAuth | null> {
    try {
      const stateData = this.verifyState(state);
      if (!stateData) {
        throw new Error("Invalid or expired state");
      }

      const tokenResponse = await fetch(this.GOOGLE_TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: this.redirectUri,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        throw new Error(
          `Token exchange failed: ${tokenResponse.status} ${await tokenResponse.text()}`,
        );
      }

      const tokens = (await tokenResponse.json()) as GoogleToken;
      const expiresAt = Date.now() + tokens.expires_in * 1000;

      // Get user email from Google
      const userInfo = await this.getUserInfo(tokens.access_token);

      const userAuth: UserGoogleAuth = {
        org_id: stateData.orgId,
        user_id: stateData.userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || "",
        expires_at: expiresAt,
        created_at: Date.now(),
        scopes: this.scopes,
        email: userInfo?.email,
      };

      // Store in database
      await this.storeToken(userAuth);

      logger.info("[Google Auth] Token exchanged successfully", {
        orgId: stateData.orgId,
        userId: stateData.userId,
        email: userInfo?.email,
      });

      return userAuth;
    } catch (error) {
      logger.error("[Google Auth] Token exchange failed:", error);
      return null;
    }
  }

  /**
   * Get user information from Google
   */
  private async getUserInfo(
    accessToken: string,
  ): Promise<{ email: string; name: string } | null> {
    try {
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      logger.error("[Google Auth] Failed to get user info:", error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string | null> {
    try {
      const response = await fetch(this.GOOGLE_TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const tokens = (await response.json()) as GoogleToken;
      return tokens.access_token;
    } catch (error) {
      logger.error("[Google Auth] Token refresh failed:", error);
      return null;
    }
  }

  /**
   * Store user authentication in database
   */
  async storeToken(userAuth: UserGoogleAuth): Promise<void> {
    try {
      const expiresAt = new Date(userAuth.expires_at).toISOString();

      await this.db.query(
        `INSERT INTO calendar_integrations 
        (org_id, user_id, provider, provider_account_id, access_token, refresh_token, 
         token_expires_at, token_type, scopes, sync_enabled, created_by)
        VALUES ($1, $2, 'google', $3, $4, $5, $6, 'Bearer', $7, true, $2)
        ON CONFLICT (org_id, user_id, provider) 
        DO UPDATE SET 
          access_token = $4,
          refresh_token = $5,
          token_expires_at = $6,
          updated_at = CURRENT_TIMESTAMP`,
        [
          userAuth.org_id,
          userAuth.user_id,
          userAuth.email,
          userAuth.access_token,
          userAuth.refresh_token,
          expiresAt,
          userAuth.scopes,
        ],
      );

      // Also store in memory for fallback
      const key = `${userAuth.org_id}:${userAuth.user_id}`;
      tokenStore.set(key, userAuth);
    } catch (error) {
      logger.error("[Google Auth] Failed to store token:", error);
      // Store in memory as fallback
      const key = `${userAuth.org_id}:${userAuth.user_id}`;
      tokenStore.set(key, userAuth);
    }
  }

  /**
   * Retrieve stored user authentication
   */
  async getToken(
    orgId: string,
    userId: string,
  ): Promise<UserGoogleAuth | null> {
    const key = `${orgId}:${userId}`;

    // Try database first
    try {
      const result = await this.db.query(
        `SELECT access_token, refresh_token, token_expires_at, created_at, scopes, provider_account_id
         FROM calendar_integrations
         WHERE org_id = $1 AND user_id = $2 AND provider = 'google' AND is_active = true`,
        [orgId, userId],
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          org_id: orgId,
          user_id: userId,
          access_token: row.access_token,
          refresh_token: row.refresh_token || "",
          expires_at: new Date(row.token_expires_at).getTime(),
          created_at: new Date(row.created_at).getTime(),
          scopes: row.scopes || this.scopes,
          email: row.provider_account_id,
        };
      }
    } catch (error) {
      logger.error(
        "[Google Auth] Database query failed, using fallback:",
        error,
      );
    }

    // Fallback to in-memory
    return tokenStore.get(key) || null;
  }

  /**
   * Revoke access token (for disconnection)
   */
  async revokeToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(this.GOOGLE_REVOKE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: accessToken }).toString(),
      });

      if (!response.ok) {
        logger.warn(`[Google Auth] Revoke returned status: ${response.status}`);
      }

      return true;
    } catch (error) {
      logger.error("[Google Auth] Token revocation failed:", error);
      return false;
    }
  }

  /**
   * Clean up expired states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, data] of stateStore.entries()) {
      if (data.expires_at < now) {
        stateStore.delete(state);
      }
    }
  }
}

// Export singleton instance
export const googleCalendarAuthClient = new GoogleCalendarAuthClient();
