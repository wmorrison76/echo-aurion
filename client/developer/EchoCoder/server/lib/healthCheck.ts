import { createClient } from "@supabase/supabase-js";
import { Request, Response } from "express";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: {
    name: string;
    status: "pass" | "fail" | "warn";
    responseTime: number;
    message?: string;
  }[];
  services: {
    database: { status: "connected" | "disconnected"; responseTime: number };
    memory: { status: "ok" | "high"; usedMB: number; totalMB: number };
    cpu: { status: "ok" | "high"; usage: number };
  };
}

/**
 * Comprehensive health check for all services
 * Used by: Load balancers, Kubernetes, monitoring dashboards
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const startTime = Date.now();
  const checks = [];

  // 1. Database connectivity check
  const dbCheckStart = Date.now();
  let dbStatus: "connected" | "disconnected" = "disconnected";
  let dbResponseTime = 0;

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );

      const { error } = await supabase
        .rpc("ping", {}, { count: "exact" })
        .catch(() => ({
          error: { message: "Query failed" },
        }));

      dbResponseTime = Date.now() - dbCheckStart;

      if (!error) {
        dbStatus = "connected";
        checks.push({
          name: "Database Connectivity",
          status: dbResponseTime > 1000 ? "warn" : "pass",
          responseTime: dbResponseTime,
          message: `Connected in ${dbResponseTime}ms`,
        });
      } else {
        checks.push({
          name: "Database Connectivity",
          status: "fail",
          responseTime: dbResponseTime,
          message: `Failed: ${error.message}`,
        });
      }
    } catch (err) {
      dbResponseTime = Date.now() - dbCheckStart;
      checks.push({
        name: "Database Connectivity",
        status: "fail",
        responseTime: dbResponseTime,
        message: `Error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  } else {
    checks.push({
      name: "Database Connectivity",
      status: "warn",
      responseTime: 0,
      message: "Supabase credentials not configured",
    });
  }

  // 2. Memory usage check
  const memCheck = process.memoryUsage();
  const usedMB = Math.round(memCheck.heapUsed / 1024 / 1024);
  const totalMB = Math.round(memCheck.heapTotal / 1024 / 1024);
  const memoryStatus = usedMB > totalMB * 0.9 ? "high" : "ok";

  checks.push({
    name: "Memory Usage",
    status: memoryStatus === "high" ? "warn" : "pass",
    responseTime: 0,
    message: `${usedMB}MB / ${totalMB}MB (${Math.round((usedMB / totalMB) * 100)}%)`,
  });

  // 3. CPU usage check (approximate)
  const cpuUsage = process.cpuUsage();
  const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000) * 100;
  const cpuStatus = cpuPercent > 80 ? "high" : "ok";

  checks.push({
    name: "CPU Usage",
    status: cpuStatus === "high" ? "warn" : "pass",
    responseTime: 0,
    message: `${Math.round(cpuPercent)}% usage`,
  });

  // 4. Uptime check
  const uptime = process.uptime();
  checks.push({
    name: "Service Uptime",
    status: "pass",
    responseTime: 0,
    message: `${Math.floor(uptime / 60)} minutes`,
  });

  // Determine overall health status
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const status: "healthy" | "degraded" | "unhealthy" =
    failCount > 0 ? "unhealthy" : warnCount > 0 ? "degraded" : "healthy";

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime,
    checks,
    services: {
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
      },
      memory: {
        status: memoryStatus,
        usedMB,
        totalMB,
      },
      cpu: {
        status: cpuStatus,
        usage: cpuPercent,
      },
    },
  };
}

/**
 * HTTP endpoint handler for health checks
 */
export async function handleHealthCheck(
  req: Request,
  res: Response,
): Promise<void> {
  const health = await getHealthStatus();

  // Return appropriate status code
  const statusCode =
    health.status === "healthy"
      ? 200
      : health.status === "degraded"
        ? 503
        : 500;

  res.status(statusCode).json(health);
}

/**
 * Simple liveness probe (pod is running)
 */
export function handleLiveness(req: Request, res: Response): void {
  res.status(200).json({ alive: true, timestamp: new Date().toISOString() });
}

/**
 * Simple readiness probe (ready to accept traffic)
 */
export async function handleReadiness(
  req: Request,
  res: Response,
): Promise<void> {
  const health = await getHealthStatus();

  // Ready if healthy OR degraded (but not if unhealthy)
  const isReady = health.status !== "unhealthy";

  res.status(isReady ? 200 : 503).json({
    ready: isReady,
    status: health.status,
    timestamp: new Date().toISOString(),
  });
}
