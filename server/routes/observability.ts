/**
 * Observability Routes
 * Provides metrics and health endpoints for monitoring
 */

import { Router } from "express";
import { observabilityService } from "../services/observability-service";
import { logger } from "../lib/logger";
import { register } from "prom-client";

const router = Router();

/**
 * GET /metrics
 * Prometheus metrics endpoint
 */
router.get("/metrics", async (req, res) => {
  try {
    const metrics = await observabilityService.getMetrics();
    res.set("Content-Type", register.contentType);
    res.end(metrics);
  } catch (error) {
    logger.error("[Observability] Failed to get metrics", { error });
    res.status(500).json({
      error: "METRICS_ERROR",
      message: "Failed to retrieve metrics",
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
router.get("/health", async (req, res) => {
  try {
    const health = await observabilityService.performHealthChecks();

    const statusCode = health.overall === "healthy" ? 200 : health.overall === "degraded" ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error("[Observability] Health check failed", { error });
    res.status(503).json({
      overall: "unhealthy",
      timestamp: new Date().toISOString(),
      checks: [],
      error: "Health check failed",
    });
  }
});

/**
 * GET /health/status
 * Quick health status (cached)
 */
router.get("/health/status", (req, res) => {
  const health = observabilityService.getHealthStatus();
  if (!health) {
    return res.status(503).json({
      overall: "unhealthy",
      message: "Health checks not yet available",
    });
  }

  const statusCode = health.overall === "healthy" ? 200 : health.overall === "degraded" ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
