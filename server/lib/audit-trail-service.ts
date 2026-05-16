/**
 * Enhanced Audit Trail Service
 * 
 * Immutable audit trail with cryptographic hashing and point-in-time recovery.
 * Target: 100% audit coverage, tamper-proof
 */

import { createHash } from "crypto";
import { logger } from "./logger";
import { getSupabaseServiceClient } from "./supabase-service-client";

export interface AuditEntry {
  id: string;
  entityId: string;
  transactionType: string;
  transactionId: string;
  action: string;
  actor: string;
  actorRole?: string;
  occurredAt: Date;
  transactionData: any;
  transactionHash: string;
  prevHash?: string;
  chainVerified: boolean;
  immutable: boolean;
  metadata?: Record<string, any>;
}

class AuditTrailService {
  /**
   * Create audit entry with cryptographic hash
   */
  async createAuditEntry(entry: Omit<AuditEntry, "id" | "transactionHash" | "chainVerified" | "immutable">): Promise<AuditEntry> {
    const supabase = getSupabaseServiceClient();

    // Get previous hash for chain
    const prevHash = await this.getLastHash(entry.entityId);

    // Calculate hash
    const hashInput = JSON.stringify({
      entityId: entry.entityId,
      transactionType: entry.transactionType,
      transactionId: entry.transactionId,
      action: entry.action,
      actor: entry.actor,
      occurredAt: entry.occurredAt.toISOString(),
      transactionData: entry.transactionData,
      prevHash,
    });

    const transactionHash = createHash("sha256").update(hashInput).digest("hex");

    // Verify chain integrity
    const chainVerified = await this.verifyChain(entry.entityId, prevHash);

    const auditEntry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...entry,
      transactionHash,
      prevHash,
      chainVerified,
      immutable: true,
    };

    // Store in database (append-only)
    const { error } = await supabase.from("audit_trail").insert({
      id: auditEntry.id,
      entity_id: auditEntry.entityId,
      transaction_type: auditEntry.transactionType,
      transaction_id: auditEntry.transactionId,
      action: auditEntry.action,
      actor: auditEntry.actor,
      actor_role: entry.actorRole,
      occurred_at: auditEntry.occurredAt.toISOString(),
      transaction_data: auditEntry.transactionData,
      transaction_hash: auditEntry.transactionHash,
      prev_hash: auditEntry.prevHash,
      chain_verified: auditEntry.chainVerified,
      metadata: entry.metadata || {},
    });

    if (error) {
      logger.error("[AuditTrail] Error creating audit entry:", error);
      throw error;
    }

    logger.debug(`[AuditTrail] Created audit entry: ${auditEntry.id}`);
    return auditEntry;
  }

  /**
   * Get last hash for entity (for chain linking)
   */
  private async getLastHash(entityId: string): Promise<string | undefined> {
    const supabase = getSupabaseServiceClient();
    
    const { data, error } = await supabase
      .from("audit_trail")
      .select("transaction_hash")
      .eq("entity_id", entityId)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return undefined;
    }

    return data.transaction_hash;
  }

  /**
   * Verify hash chain integrity
   */
  async verifyChain(entityId: string, expectedPrevHash?: string): Promise<boolean> {
    const supabase = getSupabaseServiceClient();

    const { data: entries, error } = await supabase
      .from("audit_trail")
      .select("*")
      .eq("entity_id", entityId)
      .order("occurred_at", { ascending: true });

    if (error || !entries || entries.length === 0) {
      return true; // No entries, chain is valid
    }

    // Verify each entry's hash matches previous
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const prevEntry = i > 0 ? entries[i - 1] : null;

      // Verify prev_hash matches
      if (prevEntry && entry.prev_hash !== prevEntry.transaction_hash) {
        logger.error(`[AuditTrail] Chain broken at entry ${entry.id}`);
        return false;
      }

      // Verify hash matches calculated hash
      const hashInput = JSON.stringify({
        entityId: entry.entity_id,
        transactionType: entry.transaction_type,
        transactionId: entry.transaction_id,
        action: entry.action,
        actor: entry.actor,
        occurredAt: entry.occurred_at,
        transactionData: entry.transaction_data,
        prevHash: entry.prev_hash,
      });

      const calculatedHash = createHash("sha256").update(hashInput).digest("hex");
      if (calculatedHash !== entry.transaction_hash) {
        logger.error(`[AuditTrail] Hash mismatch for entry ${entry.id}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Point-in-time recovery: Get audit trail at specific timestamp
   */
  async getAuditTrailAtTime(entityId: string, timestamp: Date): Promise<AuditEntry[]> {
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("audit_trail")
      .select("*")
      .eq("entity_id", entityId)
      .lte("occurred_at", timestamp.toISOString())
      .order("occurred_at", { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []).map(this.mapToAuditEntry);
  }

  /**
   * Map database record to AuditEntry
   */
  private mapToAuditEntry(record: any): AuditEntry {
    return {
      id: record.id,
      entityId: record.entity_id,
      transactionType: record.transaction_type,
      transactionId: record.transaction_id,
      action: record.action,
      actor: record.actor,
      actorRole: record.actor_role,
      occurredAt: new Date(record.occurred_at),
      transactionData: record.transaction_data,
      transactionHash: record.transaction_hash,
      prevHash: record.prev_hash,
      chainVerified: record.chain_verified,
      immutable: true,
      metadata: record.metadata,
    };
  }

  /**
   * Export audit trail for compliance
   */
  async exportAuditTrail(
    entityId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditEntry[]> {
    const supabase = getSupabaseServiceClient();

    let query = supabase
      .from("audit_trail")
      .select("*")
      .eq("entity_id", entityId)
      .order("occurred_at", { ascending: true });

    if (startDate) {
      query = query.gte("occurred_at", startDate.toISOString());
    }

    if (endDate) {
      query = query.lte("occurred_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []).map(this.mapToAuditEntry);
  }
}

// Singleton instance
let auditTrailService: AuditTrailService | null = null;

export function getAuditTrailService(): AuditTrailService {
  if (!auditTrailService) {
    auditTrailService = new AuditTrailService();
  }
  return auditTrailService;
}
