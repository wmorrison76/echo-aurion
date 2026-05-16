/**
 * Slow Query Monitor
 * 
 * Monitors and logs slow queries (>100ms) with automatic alerting.
 */

import { logger } from "./logger";
import { getSupabaseServiceClient } from "./supabase-service-client";

export interface SlowQuery {
  query: string;
  duration: number;
  organizationId?: string;
  timestamp: Date;
}

class SlowQueryMonitor {
  private slowQueries: SlowQuery[] = [];
  private readonly threshold = 100; // 100ms
  private readonly maxStored = 1000;

  /**
   * Log slow query
   */
  async logSlowQuery(
    query: string,
    duration: number,
    organizationId?: string
  ): Promise<void> {
    if (duration < this.threshold) {
      return;
    }

    const slowQuery: SlowQuery = {
      query: this.sanitizeQuery(query),
      duration,
      organizationId,
      timestamp: new Date(),
    };

    this.slowQueries.push(slowQuery);

    // Keep only last N queries
    if (this.slowQueries.length > this.maxStored) {
      this.slowQueries.shift();
    }

    logger.warn(
      `[SlowQuery] Query exceeded threshold: ${duration}ms - ${this.sanitizeQuery(query)}`
    );

    // Store in database
    try {
      const supabase = getSupabaseServiceClient();
      await supabase.rpc("log_slow_query", {
        p_query_text: slowQuery.query,
        p_duration_ms: duration,
        p_organization_id: organizationId || null,
      });
    } catch (error) {
      logger.error("[SlowQuery] Error storing slow query:", error);
    }

    // Alert if consistently slow
    this.checkForPatterns();
  }

  /**
   * Sanitize query for logging
   */
  private sanitizeQuery(query: string): string {
    // Remove sensitive data, limit length
    return query
      .replace(/'[^']*'/g, "'***'") // Replace string literals
      .replace(/\d+/g, "N") // Replace numbers
      .substring(0, 500); // Limit length
  }

  /**
   * Check for slow query patterns
   */
  private checkForPatterns(): void {
    if (this.slowQueries.length < 10) {
      return;
    }

    // Check if recent queries are consistently slow
    const recent = this.slowQueries.slice(-10);
    const avgDuration = recent.reduce((sum, q) => sum + q.duration, 0) / recent.length;

    if (avgDuration > this.threshold * 2) {
      logger.error(
        `[SlowQuery] ALERT: High number of slow queries detected (avg: ${avgDuration.toFixed(0)}ms)`
      );
    }

    // Group by query pattern
    const patterns = new Map<string, number>();
    recent.forEach(q => {
      const pattern = q.query.substring(0, 50);
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    });

    // Alert on repeated patterns
    patterns.forEach((count, pattern) => {
      if (count >= 5) {
        logger.warn(
          `[SlowQuery] Repeated slow query pattern detected: ${pattern} (${count} occurrences)`
        );
      }
    });
  }

  /**
   * Get slow query statistics
   */
  getStats() {
    if (this.slowQueries.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        maxDuration: 0,
        recent: [],
      };
    }

    const recent = this.slowQueries.slice(-20);
    const avgDuration = recent.reduce((sum, q) => sum + q.duration, 0) / recent.length;
    const maxDuration = Math.max(...recent.map(q => q.duration));

    return {
      count: this.slowQueries.length,
      avgDuration: Math.round(avgDuration),
      maxDuration,
      recent: recent.map(q => ({
        query: q.query.substring(0, 100),
        duration: q.duration,
        timestamp: q.timestamp,
      })),
    };
  }
}

// Singleton instance
let monitorInstance: SlowQueryMonitor | null = null;

export function getSlowQueryMonitor(): SlowQueryMonitor {
  if (!monitorInstance) {
    monitorInstance = new SlowQueryMonitor();
  }
  return monitorInstance;
}
