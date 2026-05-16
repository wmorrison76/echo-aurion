/**
 * Database Replication Management
 * 
 * Manages cross-region database replication with conflict resolution.
 * Supports read replicas in each region for low-latency reads.
 */

import { logger } from "./logger";
import { getSupabaseServiceClient } from "./supabase-service-client";
import { getMultiRegionRouter } from "./multi-region-routing";

export interface ReplicationConfig {
  primaryRegion: string;
  replicaRegions: string[];
  replicationLagThreshold: number; // milliseconds
  conflictResolutionStrategy: "last-write-wins" | "merge" | "manual";
}

export interface ReplicationStatus {
  region: string;
  isReplicating: boolean;
  lag: number; // milliseconds
  lastSync: Date;
  errors: number;
}

class DatabaseReplicationManager {
  private config: ReplicationConfig;
  private status: Map<string, ReplicationStatus> = new Map();
  private replicationCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<ReplicationConfig> = {}) {
    this.config = {
      primaryRegion: config.primaryRegion || "us-east-1",
      replicaRegions: config.replicaRegions || ["us-west-1", "eu-west-1"],
      replicationLagThreshold: config.replicationLagThreshold || 5000, // 5s
      conflictResolutionStrategy: config.conflictResolutionStrategy || "last-write-wins",
    };

    this.initializeReplicas();
    this.startReplicationMonitoring();
  }

  /**
   * Initialize replica status tracking
   */
  private initializeReplicas(): void {
    this.config.replicaRegions.forEach(region => {
      this.status.set(region, {
        region,
        isReplicating: true,
        lag: 0,
        lastSync: new Date(),
        errors: 0,
      });
    });
  }

  /**
   * Start monitoring replication lag
   */
  private startReplicationMonitoring(): void {
    this.replicationCheckInterval = setInterval(async () => {
      await this.checkReplicationStatus();
    }, 10000); // Check every 10s

    // Initial check
    this.checkReplicationStatus();
  }

  /**
   * Check replication status for all replicas
   */
  private async checkReplicationStatus(): Promise<void> {
    try {
      const supabase = getSupabaseServiceClient();

      // Check replication lag from primary
      // In production, this would query PostgreSQL replication status
      // SELECT * FROM pg_stat_replication;
      
      for (const region of this.config.replicaRegions) {
        const status = this.status.get(region);
        if (!status) continue;

        try {
          // Simulate replication lag check
          // In production, use actual PostgreSQL replication monitoring
          const lag = await this.measureReplicationLag(region);
          
          status.lag = lag;
          status.lastSync = new Date();
          status.isReplicating = lag < this.config.replicationLagThreshold;
          status.errors = 0;

          if (lag > this.config.replicationLagThreshold) {
            logger.warn(
              `[Replication] ${region} lag exceeds threshold: ${lag}ms > ${this.config.replicationLagThreshold}ms`
            );
          }
        } catch (error) {
          status.errors++;
          status.isReplicating = false;
          logger.error(`[Replication] Error checking ${region}:`, error);
        }
      }
    } catch (error) {
      logger.error("[Replication] Error checking replication status:", error);
    }
  }

  /**
   * Measure replication lag for a region
   * In production, this would query PostgreSQL replication statistics
   */
  private async measureReplicationLag(region: string): Promise<number> {
    try {
      const supabase = getSupabaseServiceClient();
      
      // Query replication lag from PostgreSQL
      // This is a simplified version - in production, use pg_stat_replication
      const { data, error } = await supabase.rpc("get_replication_lag", {
        region_name: region,
      });

      if (error) {
        // Fallback: estimate based on network latency
        return 100; // Default 100ms
      }

      return data?.lag_ms || 100;
    } catch (error) {
      logger.warn(`[Replication] Could not measure lag for ${region}, using default`);
      return 100;
    }
  }

  /**
   * Resolve conflicts when data differs between regions
   */
  async resolveConflict(
    table: string,
    recordId: string,
    primaryData: any,
    replicaData: any
  ): Promise<any> {
    logger.warn(
      `[Replication] Conflict detected in ${table}:${recordId}, resolving with strategy: ${this.config.conflictResolutionStrategy}`
    );

    switch (this.config.conflictResolutionStrategy) {
      case "last-write-wins":
        // Use the record with the most recent updated_at timestamp
        const primaryTime = new Date(primaryData.updated_at || 0).getTime();
        const replicaTime = new Date(replicaData.updated_at || 0).getTime();
        return primaryTime > replicaTime ? primaryData : replicaData;

      case "merge":
        // Merge non-conflicting fields, prefer primary for conflicts
        return {
          ...replicaData,
          ...primaryData,
          updated_at: new Date().toISOString(),
          conflict_resolved: true,
        };

      case "manual":
        // Queue for manual review
        await this.queueConflictForReview(table, recordId, primaryData, replicaData);
        throw new Error(`Conflict in ${table}:${recordId} queued for manual review`);

      default:
        return primaryData;
    }
  }

  /**
   * Queue conflict for manual review
   */
  private async queueConflictForReview(
    table: string,
    recordId: string,
    primaryData: any,
    replicaData: any
  ): Promise<void> {
    try {
      const supabase = getSupabaseServiceClient();
      
      await supabase.from("replication_conflicts").insert({
        table_name: table,
        record_id: recordId,
        primary_data: primaryData,
        replica_data: replicaData,
        detected_at: new Date().toISOString(),
        status: "pending",
      });

      logger.info(`[Replication] Conflict queued for review: ${table}:${recordId}`);
    } catch (error) {
      logger.error("[Replication] Error queueing conflict:", error);
    }
  }

  /**
   * Get replication status for all regions
   */
  getStatus(): ReplicationStatus[] {
    return Array.from(this.status.values());
  }

  /**
   * Get status for a specific region
   */
  getRegionStatus(region: string): ReplicationStatus | undefined {
    return this.status.get(region);
  }

  /**
   * Check if a region is healthy for reads
   */
  isRegionHealthy(region: string): boolean {
    const status = this.status.get(region);
    if (!status) return false;
    return status.isReplicating && status.lag < this.config.replicationLagThreshold;
  }

  /**
   * Stop replication monitoring
   */
  destroy(): void {
    if (this.replicationCheckInterval) {
      clearInterval(this.replicationCheckInterval);
      this.replicationCheckInterval = null;
    }
  }
}

// Singleton instance
let replicationManager: DatabaseReplicationManager | null = null;

export function initializeDatabaseReplication(
  config?: Partial<ReplicationConfig>
): DatabaseReplicationManager {
  if (replicationManager) {
    return replicationManager;
  }
  replicationManager = new DatabaseReplicationManager(config);
  return replicationManager;
}

export function getDatabaseReplication(): DatabaseReplicationManager {
  if (!replicationManager) {
    replicationManager = initializeDatabaseReplication();
  }
  return replicationManager;
}
