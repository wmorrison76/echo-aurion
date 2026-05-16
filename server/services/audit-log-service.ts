// @ts-nocheck
/**
 * Audit Log Service
 * 
 * TODO-014, TODO-015: Enterprise audit log service with:
 * - Tamper-evident storage (hash-based verification)
 * - Comprehensive query API
 * - Multi-tenant isolation
 * - Full audit trail for compliance
 * 
 * Uses audit_logs table (create migration if needed)
 */

import { getSupabaseServiceClient } from '../lib/supabase-service-client';
import { logger } from '../lib/logger';
import crypto from 'crypto';

export interface AuditLogEntry {
  id: string;
  tenant_id: string;
  org_id: string;
  user_id?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'EXPORT' | 'LOGIN' | 'LOGOUT' | 'SECURITY_EVENT';
  entity_type: string;
  entity_id: string;
  changes?: Record<string, any>; // Before/after values
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  hash: string; // Tamper-evident hash
  previous_hash?: string; // Chain of audit entries
}

export interface AuditLogQuery {
  tenant_id: string;
  org_id?: string;
  user_id?: string;
  entity_type?: string;
  entity_id?: string;
  action?: AuditLogEntry['action'];
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

/**
 * Generate tamper-evident hash for audit entry
 * TODO-014: Tamper-evident storage
 */
function generateAuditHash(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'hash' | 'previous_hash'>): string {
  const canonical = JSON.stringify({
    tenant_id: entry.tenant_id,
    org_id: entry.org_id,
    user_id: entry.user_id,
    action: entry.action,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    changes: entry.changes,
    metadata: entry.metadata,
    timestamp: entry.timestamp,
  });

  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Generate hash chain (previous_hash points to last entry)
 * TODO-014: Tamper-evident storage with hash chaining
 */
async function getPreviousHash(
  supabase: any,
  tenantId: string,
  orgId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('hash')
      .eq('tenant_id', tenantId)
      .eq('org_id', orgId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No previous entry
        return null;
      }
      logger.error('[AuditLog] Error getting previous hash', { error });
      throw error;
    }

    return data?.hash || null;
  } catch (error) {
    logger.error('[AuditLog] Error getting previous hash', { error });
    return null;
  }
}

/**
 * Audit Log Service
 */
export class AuditLogService {
  /**
   * Create audit log entry
   * TODO-014: Tamper-evident storage
   * TODO-015: Comprehensive query API
   */
  async createAuditLog(
    tenantId: string,
    orgId: string,
    userId: string | undefined,
    action: AuditLogEntry['action'],
    entityType: string,
    entityId: string,
    changes?: Record<string, any>,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString();
      const entryId = `audit_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

      // Get previous hash for chain
      const supabase = getSupabaseServiceClient();
      const previousHash = await getPreviousHash(supabase, tenantId, orgId);

      // Generate hash (including previous_hash in canonical form)
      const entryForHash: Omit<AuditLogEntry, 'id' | 'timestamp' | 'hash' | 'previous_hash'> = {
        tenant_id: tenantId,
        org_id: orgId,
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        changes,
        metadata,
      };

      let hash = generateAuditHash({ ...entryForHash, timestamp });
      if (previousHash) {
        // Include previous hash in canonical form for chaining
        const chainedCanonical = JSON.stringify({
          ...entryForHash,
          timestamp,
          previous_hash: previousHash,
        });
        hash = crypto.createHash('sha256').update(chainedCanonical).digest('hex');
      }

      // Insert audit log entry
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          id: entryId,
          tenant_id: tenantId,
          org_id: orgId,
          user_id: userId || null,
          action,
          entity_type: entityType,
          entity_id: entityId,
          changes: changes || {},
          metadata: metadata || {},
          ip_address: ipAddress || null,
          user_agent: userAgent || null,
          timestamp,
          hash,
          previous_hash: previousHash || null,
        })
        .select('id')
        .single();

      if (error) {
        logger.error('[AuditLog] Failed to create audit log entry', { error });
        throw error;
      }

      logger.debug('[AuditLog] Audit log entry created', {
        entry_id: entryId,
        action,
        entity_type: entityType,
        entity_id: entityId,
      });

      return data.id;
    } catch (error) {
      logger.error('[AuditLog] Error creating audit log entry', { error });
      throw error;
    }
  }

  /**
   * Verify audit log integrity (tamper detection)
   * TODO-014: Tamper-evident verification
   */
  async verifyAuditLogIntegrity(tenantId: string, orgId: string, limit: number = 1000): Promise<{
    valid: boolean;
    invalidEntries: string[];
    error?: string;
  }> {
    try {
      const supabase = getSupabaseServiceClient();
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('org_id', orgId)
        .order('timestamp', { ascending: true })
        .limit(limit);

      if (error) {
        logger.error('[AuditLog] Failed to get audit logs for verification', { error });
        throw error;
      }

      const entries = (data || []) as AuditLogEntry[];
      const invalidEntries: string[] = [];

      // Verify each entry's hash
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const entryForHash: Omit<AuditLogEntry, 'id' | 'timestamp' | 'hash' | 'previous_hash'> = {
          tenant_id: entry.tenant_id,
          org_id: entry.org_id,
          user_id: entry.user_id,
          action: entry.action,
          entity_type: entry.entity_type,
          entity_id: entry.entity_id,
          changes: entry.changes,
          metadata: entry.metadata,
        };

        let expectedHash = generateAuditHash({ ...entryForHash, timestamp: entry.timestamp });
        if (entry.previous_hash) {
          const chainedCanonical = JSON.stringify({
            ...entryForHash,
            timestamp: entry.timestamp,
            previous_hash: entry.previous_hash,
          });
          expectedHash = crypto.createHash('sha256').update(chainedCanonical).digest('hex');
        }

        if (entry.hash !== expectedHash) {
          invalidEntries.push(entry.id);
        }

        // Verify previous_hash chain
        if (i > 0 && entry.previous_hash !== entries[i - 1].hash) {
          invalidEntries.push(entry.id);
        }
      }

      return {
        valid: invalidEntries.length === 0,
        invalidEntries,
        ...(invalidEntries.length > 0 && {
          error: `Found ${invalidEntries.length} invalid entries`,
        }),
      };
    } catch (error) {
      logger.error('[AuditLog] Error verifying audit log integrity', { error });
      return {
        valid: false,
        invalidEntries: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Query audit logs
   * TODO-015: Comprehensive query API
   */
  async queryAuditLogs(query: AuditLogQuery): Promise<{
    entries: AuditLogEntry[];
    total: number;
  }> {
    try {
      const supabase = getSupabaseServiceClient();
      let supabaseQuery = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('tenant_id', query.tenant_id)
        .order('timestamp', { ascending: false });

      if (query.org_id) {
        supabaseQuery = supabaseQuery.eq('org_id', query.org_id);
      }

      if (query.user_id) {
        supabaseQuery = supabaseQuery.eq('user_id', query.user_id);
      }

      if (query.entity_type) {
        supabaseQuery = supabaseQuery.eq('entity_type', query.entity_type);
      }

      if (query.entity_id) {
        supabaseQuery = supabaseQuery.eq('entity_id', query.entity_id);
      }

      if (query.action) {
        supabaseQuery = supabaseQuery.eq('action', query.action);
      }

      if (query.start_date) {
        supabaseQuery = supabaseQuery.gte('timestamp', query.start_date);
      }

      if (query.end_date) {
        supabaseQuery = supabaseQuery.lte('timestamp', query.end_date);
      }

      // Pagination
      const limit = query.limit || 100;
      const offset = query.offset || 0;
      supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);

      const { data, error, count } = await supabaseQuery;

      if (error) {
        logger.error('[AuditLog] Failed to query audit logs', { error });
        throw error;
      }

      return {
        entries: (data || []) as AuditLogEntry[],
        total: count || 0,
      };
    } catch (error) {
      logger.error('[AuditLog] Error querying audit logs', { error });
      throw error;
    }
  }

  /**
   * Get audit trail for specific entity
   * TODO-015: Comprehensive query API
   */
  async getEntityAuditTrail(
    tenantId: string,
    entityType: string,
    entityId: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    try {
      const result = await this.queryAuditLogs({
        tenant_id: tenantId,
        entity_type: entityType,
        entity_id: entityId,
        limit,
      });

      return result.entries;
    } catch (error) {
      logger.error('[AuditLog] Error getting entity audit trail', { error, entity_type: entityType, entity_id: entityId });
      throw error;
    }
  }

  /**
   * Get user activity log
   * TODO-015: Comprehensive query API
   */
  async getUserActivityLog(
    tenantId: string,
    userId: string,
    startDate?: string,
    endDate?: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    try {
      const result = await this.queryAuditLogs({
        tenant_id: tenantId,
        user_id: userId,
        start_date: startDate,
        end_date: endDate,
        limit,
      });

      return result.entries;
    } catch (error) {
      logger.error('[AuditLog] Error getting user activity log', { error, user_id: userId });
      throw error;
    }
  }
}

// Singleton instance
export const auditLogService = new AuditLogService();
