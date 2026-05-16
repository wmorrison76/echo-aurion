/**
 * PHASE 0: ENTERPRISE FOUNDATION - Day 8
 * Health Check Endpoints
 *
 * Endpoints:
 * - GET /health: General health status (public)
 * - GET /health/ready: Readiness probe (Kubernetes)
 * - GET /health/live: Liveness probe (Kubernetes)
 *
 * Used by Kubernetes for:
 * - readinessProbe: determines if pod should receive traffic
 * - livenessProbe: determines if pod should be restarted
 */

import { Router } from "express";
import os from "os";

const router = Router();

// Start time for uptime calculation
const startTime = Date.now();

/**
 * GET /health
 * General health status endpoint
 * Returns basic health information and uptime
 */
router.get("/health", (req: any, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const uptimeMinutes = Math.floor(uptime / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);
  const uptimeDays = Math.floor(uptimeHours / 24);

  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptime,
      minutes: uptimeMinutes,
      hours: uptimeHours,
      days: uptimeDays,
      formatted: `${uptimeDays}d ${uptimeHours % 24}h ${uptimeMinutes % 60}m`,
    },
    version: process.env.APP_VERSION || "0.1.0-phase0",
    environment: process.env.NODE_ENV || "development",
    region: process.env.REGION || "us-east-1",
    checks: {
      memory: checkMemory(),
      // TODO: Add database, cache, and external service checks in Phase 1
    },
  };

  // Add any warnings if near limits
  const warnings = [];
  if (health.checks.memory.percentUsed > 80) {
    warnings.push("High memory usage");
  }

  if (warnings.length > 0) {
    health.warnings = warnings;
  }

  res.status(200).json(health);
});

/**
 * GET /health/ready
 * Kubernetes readiness probe
 * Returns 200 if service is ready to handle requests
 * Returns 503 if service is initializing or degraded
 */
router.get("/health/ready", async (req: any, res) => {
  const { getHealthCheckService } = await import("../lib/health-check-service");
  const healthService = getHealthCheckService();
  
  const checks = await healthService.runAllChecks();
  const criticalChecks = checks.filter(c => 
    c.name === "database" || c.name === "cache"
  );

  const allReady = criticalChecks.every(check => check.status === "ok");

  const readiness = {
    ready: allReady,
    timestamp: new Date().toISOString(),
    checks: {
      database: checks.find(c => c.name === "database")?.status || "unknown",
      cache: checks.find(c => c.name === "cache")?.status || "unknown",
      queue: checks.find(c => c.name === "queue")?.status || "unknown",
      connection_pool: checks.find(c => c.name === "connection_pool")?.status || "unknown",
      memory: checkMemory().status,
    },
  };

  const statusCode = allReady ? 200 : 503;
  res.status(statusCode).json(readiness);
});

/**
 * GET /health/live
 * Kubernetes liveness probe
 * Returns 200 if service is alive
 * Returns 503 if service is stuck or unrecoverable
 */
router.get("/health/live", (req: any, res) => {
  const liveness = {
    live: true,
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    // Simple liveliness indicators
    checks: {
      responsive: true,
      memory_not_critical: checkMemory().percentUsed < 95,
      // TODO: In Phase 1, add checks for:
      // - event loop lag (high lag = stuck)
      // - graceful shutdown in progress
    },
  };

  const isLive = Object.values(liveness.checks).every((check) => {
    if (typeof check === "boolean") return check;
    return check !== "stuck" && check !== "shutdown";
  });

  const statusCode = isLive ? 200 : 503;
  res.status(statusCode).json(liveness);
});

/**
 * Memory usage check helper
 */
function checkMemory() {
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  return {
    heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
    externalMB: Math.round(memUsage.external / 1024 / 1024),
    systemTotalMB: Math.round(totalMem / 1024 / 1024),
    systemFreeMB: Math.round(freeMem / 1024 / 1024),
    systemUsedMB: Math.round((totalMem - freeMem) / 1024 / 1024),
    percentUsed: Math.round(((totalMem - freeMem) / totalMem) * 100),
    status:
      Math.round(((totalMem - freeMem) / totalMem) * 100) > 80
        ? "warning"
        : "ok",
  };
}

/**
 * Optional: Advanced health check with dependencies
 * GET /health/detailed
 * Requires authentication
 */
router.get("/health/detailed", (req: any, res) => {
  const detailed = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "0.1.0-phase0",
    services: {
      api: {
        status: "up",
        responseTime: "<100ms",
      },
      // TODO: Add in Phase 1:
      // database: checkDatabase(),
      // cache: checkRedis(),
      // externalAPIs: {
      //   toast: checkToast(),
      //   rippling: checkRippling(),
      // }
    },
    performance: {
      requestsPerSecond: "N/A", // TODO: Calculate from metrics
      avgResponseTime: "N/A",
      errorRate: "0%",
    },
  };

  res.status(200).json(detailed);
});

export default router;
