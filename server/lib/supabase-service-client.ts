/**
 * LUCCCA Framework - Persistent Supabase Service Client
 * 
 * Provides a persistent database client for server-side operations.
 * This client uses the SERVICE_ROLE_KEY for full database access and ensures
 * all data is persisted to the Supabase database.
 * 
 * IMPORTANT: This is the client to use for all persistent database operations.
 * DO NOT use server/lib/supabase.ts (in-memory) or server/lib/supabase-client.ts (token-only).
 * 
 * Usage:
 * ```typescript
 * import { getSupabaseServiceClient } from '../lib/supabase-service-client';
 * const supabase = getSupabaseServiceClient();
 * const { data, error } = await supabase.from('table').select('*');
 * ```
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';
import { getReadReplicaRouter } from './read-replica-router';

// ============================================================================
// PERSISTENT DATABASE CLIENT
// ============================================================================

let supabaseServiceClient: SupabaseClient | null = null;

/**
 * Get or create a persistent Supabase service client
 * 
 * This client uses the SERVICE_ROLE_KEY for full database access.
 * All operations using this client are persisted to the database.
 * 
 * For production: Uses connection pooling and read replica routing.
 * 
 * @param useReadReplica - If true, routes to read replica (for GET operations)
 * @returns Supabase client instance
 * @throws Error if Supabase credentials are not configured
 */
export function getSupabaseServiceClient(useReadReplica: boolean = false): SupabaseClient {
  // Use read replica router for read operations
  if (useReadReplica) {
    try {
      const router = getReadReplicaRouter();
      const replicaClient = router.getReadClient();
      if (replicaClient) {
        return replicaClient;
      }
      logger.warn('[SupabaseServiceClient] Read replica unavailable, falling back to primary');
      // Fall through to primary
    } catch (error) {
      logger.warn('[SupabaseServiceClient] Read replica unavailable, falling back to primary', { error });
      // Fall through to primary
    }
  }

  // Primary client (for writes or fallback)
  if (supabaseServiceClient) {
    return supabaseServiceClient;
  }

  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    const error = new Error(
      'Missing Supabase credentials: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
    );
    logger.error('[SupabaseServiceClient] Missing credentials', { error });
    throw error;
  }

  try {
    supabaseServiceClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    logger.info('[SupabaseServiceClient] Persistent database client initialized', {
      url: url.replace(/\/\/[^@]+@/, '//***@'), // Mask credentials in logs
    });

    return supabaseServiceClient;
  } catch (error) {
    logger.error('[SupabaseServiceClient] Failed to initialize client', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Check if the Supabase service client is initialized
 */
export function isSupabaseServiceClientAvailable(): boolean {
  return supabaseServiceClient !== null;
}
