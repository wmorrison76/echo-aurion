/**
 * Database Connection Pool Manager
 * 
 * Manages PostgreSQL connection pooling with health monitoring.
 * Target: Zero connection exhaustion, <50ms query latency
 * 
 * Configuration:
 * - Min connections: 20
 * - Max connections: 200 per instance
 * - Connection health monitoring (ping every 30s)
 * - Query timeout: 5s for critical paths, 30s default
 * - Slow query logging (>100ms) with automatic alerting
 */

import { logger } from "./logger";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getReadReplicaRouter } from "./read-replica-router";

const SAFE_MODE = process.env.SAFE_MODE === "true";
const ENABLE_DB_HEALTH_CHECKS = process.env.ENABLE_DB_HEALTH_CHECKS === "true";

export interface PoolConfig {
  minConnections: number;
  maxConnections: number;
  connectionTimeout: number; // milliseconds
  idleTimeout: number; // milliseconds
  healthCheckInterval: number; // milliseconds
  slowQueryThreshold: number; // milliseconds
}

export interface PoolStats {
  active: number;
  idle: number;
  total: number;
  utilization: number; // percentage
  slowQueries: number;
  errors: number;
}

class DatabasePool {
  private config: PoolConfig;
  private clients: SupabaseClient[] = [];
  private activeClients: Set<SupabaseClient> = new Set();
  private slowQueries: Array<{ query: string; duration: number; timestamp: Date }> = [];
  private errorCount = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = {
      minConnections: config.minConnections || 20,
      maxConnections: config.maxConnections || 200,
      connectionTimeout: config.connectionTimeout || 5000,
      idleTimeout: config.idleTimeout || 30000,
      healthCheckInterval: config.healthCheckInterval || 30000, // 30s
      slowQueryThreshold: config.slowQueryThreshold || 100, // 100ms
    };

    this.initializePool();
    this.startHealthChecks();
  }

  /**
   * Initialize connection pool
   */
  private async initializePool(): Promise<void> {
    const url = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (SAFE_MODE || !url || !serviceRoleKey) {
      logger.info("[DatabasePool] Initialization skipped (safe mode or missing credentials)");
      return;
    }

    // Create minimum connections
    for (let i = 0; i < this.config.minConnections; i++) {
      const client = createClient(url, serviceRoleKey, {
        db: {
          schema: "public",
        },
      });
      this.clients.push(client);
    }

    logger.info(
      `[DatabasePool] Initialized with ${this.config.minConnections} connections (max: ${this.config.maxConnections})`
    );
  }

  /**
   * Get a connection from the pool
   */
  async acquire(): Promise<SupabaseClient> {
    // Try to find an idle connection
    const idleClient = this.clients.find(c => !this.activeClients.has(c));
    
    if (idleClient) {
      this.activeClients.add(idleClient);
      return idleClient;
    }

    // Check if we can create a new connection
    if (this.clients.length < this.config.maxConnections) {
      const url = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!url || !serviceRoleKey) {
        throw new Error("Missing Supabase credentials");
      }

      const newClient = createClient(url, serviceRoleKey, {
        db: {
          schema: "public",
        },
      });

      this.clients.push(newClient);
      this.activeClients.add(newClient);
      
      logger.debug(`[DatabasePool] Created new connection (total: ${this.clients.length})`);
      return newClient;
    }

    // Pool exhausted - wait for a connection to become available
    logger.warn("[DatabasePool] Pool exhausted, waiting for available connection...");
    return this.waitForConnection();
  }

  /**
   * Wait for a connection to become available
   */
  private async waitForConnection(): Promise<SupabaseClient> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.config.connectionTimeout) {
      const idleClient = this.clients.find(c => !this.activeClients.has(c));
      if (idleClient) {
        this.activeClients.add(idleClient);
        return idleClient;
      }
      
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Alert on connection pool exhaustion
    this.alertPoolExhaustion();
    throw new Error("Connection pool timeout: no connections available");
  }

  /**
   * Release a connection back to the pool
   */
  release(client: SupabaseClient): void {
    this.activeClients.delete(client);
  }

  /**
   * Execute a query with connection pooling and monitoring
   */
  async executeQuery<T>(
    queryFn: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>,
    timeout: number = 30000,
    queryType: 'read' | 'write' = 'read'
  ): Promise<{ data: T | null; error: any }> {
    const router = getReadReplicaRouter();
    const client = queryType === 'read' ? router.getReadClient() : router.getWriteClient();
    const startTime = Date.now();

    if (!client) {
      return {
        data: null,
        error: new Error("Database unavailable"),
      };
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Query timeout (${queryType})`)), timeout);
      });

      const result = await Promise.race([
        queryFn(client),
        timeoutPromise,
      ]);

      const duration = Date.now() - startTime;

      // Log slow queries
      if (duration > this.config.slowQueryThreshold) {
        this.logSlowQuery(`${queryType} query`, duration);
      }

      return result;
    } catch (error: any) {
      this.errorCount++;
      logger.error(`[DatabasePool] ${queryType} query error:`, error);
      throw error;
    }
  }

  /**
   * Log slow query
   */
  private logSlowQuery(query: string, duration: number): void {
    this.slowQueries.push({
      query,
      duration,
      timestamp: new Date(),
    });

    // Keep only last 100 slow queries
    if (this.slowQueries.length > 100) {
      this.slowQueries.shift();
    }

    logger.warn(`[DatabasePool] Slow query detected: ${duration}ms - ${query}`);

    // Alert if consistently slow
    if (this.slowQueries.length >= 10) {
      const avgDuration = this.slowQueries.reduce((sum, q) => sum + q.duration, 0) / this.slowQueries.length;
      if (avgDuration > this.config.slowQueryThreshold * 2) {
        logger.error(`[DatabasePool] ALERT: High number of slow queries (avg: ${avgDuration}ms)`);
      }
    }
  }

  /**
   * Alert on pool exhaustion
   */
  private alertPoolExhaustion(): void {
    const utilization = (this.activeClients.size / this.config.maxConnections) * 100;
    
    if (utilization > 80) {
      logger.error(
        `[DatabasePool] ALERT: Pool utilization at ${utilization.toFixed(1)}% (${this.activeClients.size}/${this.config.maxConnections})`
      );
    }
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    if (SAFE_MODE || !ENABLE_DB_HEALTH_CHECKS) {
      logger.info("[DatabasePool] Health checks disabled by default");
      return;
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);

    // Initial health check
    this.performHealthChecks();
  }

  /**
   * Perform health checks on all connections
   */
  private async performHealthChecks(): Promise<void> {
    if (SAFE_MODE || !ENABLE_DB_HEALTH_CHECKS) {
      return;
    }

    const checks = this.clients.map(client => this.checkConnectionHealth(client));
    await Promise.allSettled(checks);

    // Check pool utilization
    const utilization = (this.activeClients.size / this.config.maxConnections) * 100;
    if (utilization > 80) {
      this.alertPoolExhaustion();
    }
  }

  /**
   * Check health of a single connection
   */
  private async checkConnectionHealth(client: SupabaseClient): Promise<void> {
    if (SAFE_MODE || !ENABLE_DB_HEALTH_CHECKS) {
      return;
    }

    try {
      const startTime = Date.now();
      const { error } = await client.from("_health_check").select("1").limit(1);
      const duration = Date.now() - startTime;

      if (error && error.code !== "PGRST116") {
        const message = error.message || "";
        if (message.includes("fetch failed") || message.includes("ENOTFOUND") || message.includes("ECONNREFUSED")) {
          logger.debug(`[DatabasePool] Health check unavailable: ${message}`);
          return;
        }
        // PGRST116 is "relation does not exist" which is OK for health check
        logger.warn(`[DatabasePool] Health check failed:`, error);
      }

      if (duration > 100) {
        logger.warn(`[DatabasePool] Health check slow: ${duration}ms`);
      }
    } catch (error: any) {
      const message = error?.message || String(error);
      if (message.includes("fetch failed") || message.includes("ENOTFOUND") || message.includes("ECONNREFUSED")) {
        logger.debug(`[DatabasePool] Health check unavailable: ${message}`);
        return;
      }
      logger.error("[DatabasePool] Health check error:", error);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    return {
      active: this.activeClients.size,
      idle: this.clients.length - this.activeClients.size,
      total: this.clients.length,
      utilization: (this.activeClients.size / this.config.maxConnections) * 100,
      slowQueries: this.slowQueries.length,
      errors: this.errorCount,
    };
  }

  /**
   * Destroy pool and close all connections
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.clients = [];
    this.activeClients.clear();
    logger.info("[DatabasePool] Pool destroyed");
  }
}

// Singleton instance
let poolInstance: DatabasePool | null = null;

export function initializeDatabasePool(config?: Partial<PoolConfig>): DatabasePool {
  if (poolInstance) {
    return poolInstance;
  }
  poolInstance = new DatabasePool(config);
  return poolInstance;
}

export function getDatabasePool(): DatabasePool {
  if (!poolInstance) {
    poolInstance = initializeDatabasePool();
  }
  return poolInstance;
}
