/**
 * Server-side Supabase Client
 * Handles database operations for OAuth token storage and audit logging
 * 
 * Usage:
 * ```
 * const client = getSupabaseClient();
 * await client.storeAuthToken(orgId, userId, token);
 * const token = await client.getAuthToken(orgId, userId);
 * ```
 */

import { logger } from './logger';

export interface StoredAuthToken {
  id: string;
  org_id: string;
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string;
  scopes: string[];
  expires_at: number;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
}

export interface TokenAuditLog {
  id: string;
  org_id: string;
  user_id: string;
  provider: string;
  action: 'created' | 'refreshed' | 'used' | 'deleted' | 'failed';
  status: 'success' | 'failure';
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Supabase client for server-side operations
 */
class SupabaseTokenClient {
  private supabase: any = null;
  private isInitialized = false;

  /**
   * Initialize Supabase client (called once at startup)
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        logger.warn('[Supabase] URL or key not configured, using in-memory token storage');
        return false;
      }

      // Dynamic import to avoid build-time dependency issues
      try {
        const { createClient } = await import('@supabase/supabase-js');
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.isInitialized = true;

        logger.info('[Supabase] Client initialized successfully');
        return true;
      } catch (importError) {
        logger.warn('[Supabase] Failed to import client, install with: npm install @supabase/supabase-js');
        return false;
      }
    } catch (error) {
      logger.error('[Supabase] Initialization error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Check if Supabase is available
   */
  isAvailable(): boolean {
    return this.isInitialized && !!this.supabase;
  }

  /**
   * Store OAuth token in database
   */
  async storeAuthToken(
    orgId: string,
    userId: string,
    token: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      scope?: string;
      token_type?: string;
    },
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      logger.warn('[Supabase] Token storage not available');
      return false;
    }

    try {
      const expiresAt = Date.now() + token.expires_in * 1000;
      const scopes = token.scope ? token.scope.split(' ') : ['Mail.Read', 'Calendar.Read', 'User.Read', 'offline_access'];

      const { data, error } = await this.supabase
        .from('auth_tokens')
        .upsert({
          org_id: orgId,
          user_id: userId,
          provider: 'outlook',
          access_token: token.access_token,
          refresh_token: token.refresh_token,
          scopes,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'org_id,user_id,provider',
        });

      if (error) {
        logger.error('[Supabase] Failed to store token', {
          error: error.message,
          orgId,
          userId,
        });
        return false;
      }

      // Log token creation
      await this.logTokenAction(orgId, userId, 'created', 'success');

      logger.info('[Supabase] Token stored successfully', {
        orgId,
        userId,
        expiresAt: new Date(expiresAt).toISOString(),
      });

      return true;
    } catch (error) {
      logger.error('[Supabase] Error storing token', {
        error: error instanceof Error ? error.message : String(error),
        orgId,
        userId,
      });
      return false;
    }
  }

  /**
   * Retrieve OAuth token from database
   */
  async getAuthToken(orgId: string, userId: string): Promise<StoredAuthToken | null> {
    if (!this.isAvailable()) {
      logger.debug('[Supabase] Token retrieval not available');
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('auth_tokens')
        .select('*')
        .eq('org_id', orgId)
        .eq('user_id', userId)
        .eq('provider', 'outlook')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found - not an error
          logger.debug('[Supabase] Token not found', { orgId, userId });
          return null;
        }

        logger.error('[Supabase] Error retrieving token', {
          error: error.message,
          orgId,
          userId,
        });
        return null;
      }

      // Update last_used_at
      await this.supabase
        .from('auth_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);

      // Log token usage
      await this.logTokenAction(orgId, userId, 'used', 'success');

      return data;
    } catch (error) {
      logger.error('[Supabase] Error retrieving token', {
        error: error instanceof Error ? error.message : String(error),
        orgId,
        userId,
      });
      return null;
    }
  }

  /**
   * Update token after refresh
   */
  async updateAuthToken(
    orgId: string,
    userId: string,
    token: {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    },
  ): Promise<boolean> {
    if (!this.isAvailable()) {
      logger.warn('[Supabase] Token update not available');
      return false;
    }

    try {
      const expiresAt = Date.now() + token.expires_in * 1000;

      const { error } = await this.supabase
        .from('auth_tokens')
        .update({
          access_token: token.access_token,
          ...(token.refresh_token && { refresh_token: token.refresh_token }),
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('org_id', orgId)
        .eq('user_id', userId)
        .eq('provider', 'outlook');

      if (error) {
        logger.error('[Supabase] Failed to update token', {
          error: error.message,
          orgId,
          userId,
        });
        return false;
      }

      // Log token refresh
      await this.logTokenAction(orgId, userId, 'refreshed', 'success');

      logger.info('[Supabase] Token refreshed successfully', {
        orgId,
        userId,
        expiresAt: new Date(expiresAt).toISOString(),
      });

      return true;
    } catch (error) {
      logger.error('[Supabase] Error updating token', {
        error: error instanceof Error ? error.message : String(error),
        orgId,
        userId,
      });
      return false;
    }
  }

  /**
   * Delete token (logout)
   */
  async deleteAuthToken(orgId: string, userId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      logger.warn('[Supabase] Token deletion not available');
      return false;
    }

    try {
      const { error } = await this.supabase
        .from('auth_tokens')
        .delete()
        .eq('org_id', orgId)
        .eq('user_id', userId)
        .eq('provider', 'outlook');

      if (error) {
        logger.error('[Supabase] Failed to delete token', {
          error: error.message,
          orgId,
          userId,
        });
        return false;
      }

      // Log token deletion
      await this.logTokenAction(orgId, userId, 'deleted', 'success');

      logger.info('[Supabase] Token deleted successfully', {
        orgId,
        userId,
      });

      return true;
    } catch (error) {
      logger.error('[Supabase] Error deleting token', {
        error: error instanceof Error ? error.message : String(error),
        orgId,
        userId,
      });
      return false;
    }
  }

  /**
   * Get all tokens for an organization (admin only)
   */
  async getOrgTokens(orgId: string): Promise<StoredAuthToken[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('auth_tokens')
        .select('*')
        .eq('org_id', orgId)
        .eq('provider', 'outlook');

      if (error) {
        logger.error('[Supabase] Error retrieving org tokens', {
          error: error.message,
          orgId,
        });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('[Supabase] Error getting org tokens', {
        error: error instanceof Error ? error.message : String(error),
        orgId,
      });
      return [];
    }
  }

  /**
   * Get expired tokens for cleanup
   */
  async getExpiredTokens(maxAgeMs?: number): Promise<StoredAuthToken[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const now = Date.now();
      const { data, error } = await this.supabase
        .from('auth_tokens')
        .select('*')
        .lt('expires_at', now)
        .eq('provider', 'outlook');

      if (error) {
        logger.error('[Supabase] Error retrieving expired tokens', {
          error: error.message,
        });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('[Supabase] Error getting expired tokens', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Log token action to audit table
   */
  async logTokenAction(
    orgId: string,
    userId: string,
    action: 'created' | 'refreshed' | 'used' | 'deleted' | 'failed',
    status: 'success' | 'failure',
    errorMessage?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const { error } = await this.supabase
        .from('auth_token_audit')
        .insert({
          org_id: orgId,
          user_id: userId,
          provider: 'outlook',
          action,
          status,
          error_message: errorMessage,
          ip_address: ipAddress,
          user_agent: userAgent,
        });

      if (error) {
        logger.warn('[Supabase] Failed to log token action', {
          error: error.message,
          action,
        });
      }
    } catch (error) {
      // Don't log errors for audit logging to prevent infinite recursion
      console.warn('[Supabase] Error logging token action:', error);
    }
  }

  /**
   * Get audit logs for a user
   */
  async getAuditLogs(
    orgId: string,
    userId?: string,
    limit = 100,
  ): Promise<TokenAuditLog[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      let query = this.supabase
        .from('auth_token_audit')
        .select('*')
        .eq('org_id', orgId)
        .eq('provider', 'outlook')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('[Supabase] Error retrieving audit logs', {
          error: error.message,
          orgId,
        });
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('[Supabase] Error getting audit logs', {
        error: error instanceof Error ? error.message : String(error),
        orgId,
      });
      return [];
    }
  }
}

// Singleton instance
let supabaseTokenClient: SupabaseTokenClient | null = null;

/**
 * Get or create Supabase client
 */
export function getSupabaseClient(): SupabaseTokenClient {
  if (!supabaseTokenClient) {
    supabaseTokenClient = new SupabaseTokenClient();
    // Initialize asynchronously
    supabaseTokenClient.initialize().catch((error) => {
      logger.error('[Supabase] Failed to initialize on startup', { error });
    });
  }
  return supabaseTokenClient;
}

/**
 * Initialize Supabase at startup
 */
export async function initializeSupabaseTokenClient(): Promise<boolean> {
  const client = getSupabaseClient();
  return client.initialize();
}

/**
 * Export default
 */
export default getSupabaseClient;
