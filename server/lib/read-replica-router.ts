/**
 * Read Replica Router
 * 
 * Routes read queries to nearest read replica for optimal latency.
 * Writes always go to primary database.
 * 
 * Strategy:
 * - Writes: Always primary
 * - Reads: Nearest healthy replica
 * - Automatic failover if replica unavailable
 */

import { logger } from "./logger";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getMultiRegionRouter } from "./multi-region-routing";

const SAFE_MODE = process.env.SAFE_MODE === "true";
const ENABLE_DB_HEALTH_CHECKS = process.env.ENABLE_DB_HEALTH_CHECKS === "true";

export interface ReplicaConfig {
  id: string;
  region: string;
  endpoint: string;
  isPrimary: boolean;
  isHealthy: boolean;
  latency?: number;
}

class ReadReplicaRouter {
  private replicas: Map<string, ReplicaConfig> = new Map();
  private primaryClient: SupabaseClient | null = null;
  private replicaClients: Map<string, SupabaseClient> = new Map();
  private currentRegion: string;

  constructor() {
    this.currentRegion = process.env.REGION || "us-east-1";
    this.initializeReplicas();
  }

  /**
   * Initialize replica configurations
   */
  private initializeReplicas(): void {
    const url = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (SAFE_MODE || !url || !serviceRoleKey) {
      logger.info("[ReadReplicaRouter] Initialization skipped (safe mode or missing credentials)");
      return;
    }

    // Primary (write-only)
    const primaryConfig: ReplicaConfig = {
      id: "primary",
      region: this.currentRegion,
      endpoint: url,
      isPrimary: true,
      isHealthy: true,
    };

    this.replicas.set("primary", primaryConfig);
    this.primaryClient = createClient(url, serviceRoleKey);

    // Read replicas (configured via environment)
    const replicaEndpoints = [
      process.env.SUPABASE_READ_REPLICA_US_EAST,
      process.env.SUPABASE_READ_REPLICA_US_WEST,
      process.env.SUPABASE_READ_REPLICA_EU_WEST,
    ].filter(Boolean) as string[];

    replicaEndpoints.forEach((endpoint, index) => {
      const region = ["us-east-1", "us-west-1", "eu-west-1"][index] || `replica-${index}`;
      const replicaConfig: ReplicaConfig = {
        id: `replica-${region}`,
        region,
        endpoint,
        isPrimary: false,
        isHealthy: true,
      };

      this.replicas.set(replicaConfig.id, replicaConfig);
      this.replicaClients.set(replicaConfig.id, createClient(endpoint, serviceRoleKey));
    });

    logger.info(`[ReadReplicaRouter] Initialized with ${this.replicas.size} replicas`);
  }

  /**
   * Get client for read operation (prefers nearest replica)
   */
  getReadClient(): SupabaseClient | null {
    // Get best region for reads
    const router = getMultiRegionRouter();
    const bestRegion = router.getBestRegion("read");

    // Find replica in best region
    const replica = Array.from(this.replicas.values()).find(
      r => !r.isPrimary && r.region === bestRegion.id && r.isHealthy
    );

    if (replica) {
      const client = this.replicaClients.get(replica.id);
      if (client) {
        return client;
      }
    }

    // Fallback to primary if no healthy replica
    logger.warn("[ReadReplicaRouter] No healthy replica, using primary for read");
    if (!this.primaryClient) {
      return null;
    }
    return this.primaryClient;
  }

  /**
   * Get client for write operation (always primary)
   */
  getWriteClient(): SupabaseClient | null {
    if (!this.primaryClient) {
      return null;
    }
    return this.primaryClient;
  }

  /**
   * Execute read query on appropriate replica
   */
  async executeRead<T>(
    queryFn: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>
  ): Promise<{ data: T | null; error: any }> {
    const client = this.getReadClient();
    if (!client) {
      return { data: null, error: new Error("Read replica unavailable") };
    }
    return queryFn(client);
  }

  /**
   * Execute write query on primary
   */
  async executeWrite<T>(
    queryFn: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>
  ): Promise<{ data: T | null; error: any }> {
    const client = this.getWriteClient();
    if (!client) {
      return { data: null, error: new Error("Write database unavailable") };
    }
    return queryFn(client);
  }

  /**
   * Check health of all replicas
   */
  async checkReplicaHealth(): Promise<void> {
    if (SAFE_MODE || !ENABLE_DB_HEALTH_CHECKS) {
      return;
    }

    for (const [id, config] of this.replicas.entries()) {
      try {
        const client = config.isPrimary
          ? this.primaryClient
          : this.replicaClients.get(id);

        if (!client) continue;

        const startTime = Date.now();
        const { error } = await client.from("_health_check").select("1").limit(1);
        const latency = Date.now() - startTime;

        config.isHealthy = !error || error.code === "PGRST116"; // PGRST116 is OK
        config.latency = latency;

        if (!config.isHealthy) {
          logger.warn(`[ReadReplicaRouter] Replica ${id} is unhealthy`);
        }
      } catch (error: any) {
        config.isHealthy = false;
        const message = error?.message || String(error);
        if (message.includes("fetch failed") || message.includes("ENOTFOUND") || message.includes("ECONNREFUSED")) {
          logger.debug(`[ReadReplicaRouter] Health check unavailable for ${id}: ${message}`);
          continue;
        }
        logger.error(`[ReadReplicaRouter] Health check failed for ${id}:`, error);
      }
    }
  }

  /**
   * Get router statistics
   */
  getStats() {
    return {
      currentRegion: this.currentRegion,
      replicas: Array.from(this.replicas.values()).map(r => ({
        id: r.id,
        region: r.region,
        isPrimary: r.isPrimary,
        isHealthy: r.isHealthy,
        latency: r.latency,
      })),
    };
  }
}

// Singleton instance
let routerInstance: ReadReplicaRouter | null = null;

export function initializeReadReplicaRouter(): ReadReplicaRouter {
  if (routerInstance) {
    return routerInstance;
  }
  routerInstance = new ReadReplicaRouter();
  return routerInstance;
}

export function getReadReplicaRouter(): ReadReplicaRouter {
  if (!routerInstance) {
    routerInstance = initializeReadReplicaRouter();
  }
  return routerInstance;
}
