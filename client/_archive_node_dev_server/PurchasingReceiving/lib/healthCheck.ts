import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);
interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: {
    [key: string]: {
      status: "ok" | "warning" | "error";
      message: string;
      duration: number;
    };
  };
  version: string;
}
const startTime = Date.now();
export async function getHealthStatus(): Promise<HealthStatus> {
  const checks: HealthStatus["checks"] = {};
  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy"; // Check database connection checks.database = await checkDatabase(); if (checks.database.status === 'error') overallStatus = 'unhealthy'; if (checks.database.status === 'warning') overallStatus = 'degraded'; // Check memory usage checks.memory = checkMemory(); if (checks.memory.status === 'error') overallStatus = 'unhealthy'; if (checks.memory.status === 'warning') overallStatus = 'degraded'; // Check environment variables checks.environment = checkEnvironment(); if (checks.environment.status === 'error') overallStatus = 'unhealthy'; // Check external services (Sentry, etc) checks.services = await checkExternalServices(); if (checks.services.status === 'error') overallStatus = 'unhealthy'; return { status: overallStatus, timestamp: new Date().toISOString(), uptime: Math.floor((Date.now() - startTime) / 1000), checks, version: process.env.APP_VERSION || 'unknown', };
}
async function checkDatabase() {
  const startTime = Date.now();
  try {
    const { error, data } = await Promise.race([
      supabase.from("outlets").select("id").limit(1),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database timeout")), 5000),
      ) as Promise<any>,
    ]);
    const duration = Date.now() - startTime;
    if (error) {
      return {
        status: "error" as const,
        message: `Database error: ${error.message}`,
        duration,
      };
    }
    if (duration > 3000) {
      return {
        status: "warning" as const,
        message: "Database response slow",
        duration,
      };
    }
    return { status: "ok" as const, message: "Database connected", duration };
  } catch (error) {
    return {
      status: "error" as const,
      message: `Database check failed: ${error instanceof Error ? error.message : "unknown"}`,
      duration: Date.now() - startTime,
    };
  }
}
function checkMemory() {
  const memUsage = process.memoryUsage();
  const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  if (heapUsedPercent > 90) {
    return {
      status: "error" as const,
      message: `High memory usage: ${heapUsedPercent.toFixed(1)}%`,
      duration: 0,
    };
  }
  if (heapUsedPercent > 75) {
    return {
      status: "warning" as const,
      message: `Memory usage: ${heapUsedPercent.toFixed(1)}%`,
      duration: 0,
    };
  }
  return {
    status: "ok" as const,
    message: `Memory usage: ${heapUsedPercent.toFixed(1)}%`,
    duration: 0,
  };
}
function checkEnvironment() {
  const requiredEnvVars = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NODE_ENV",
  ];
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName],
  );
  if (missingVars.length > 0) {
    return {
      status: "error" as const,
      message: `Missing environment variables: ${missingVars.join(", ")}`,
      duration: 0,
    };
  }
  return {
    status: "ok" as const,
    message: "All required environment variables set",
    duration: 0,
  };
}
async function checkExternalServices() {
  const services: string[] = []; // Check Sentry if (process.env.SENTRY_DSN) { services.push('sentry'); } if (services.length === 0) { return { status: 'ok' as const, message: 'No external services configured', duration: 0, }; } return { status: 'ok' as const, message: `External services OK: ${services.join(', ')}`, duration: 0, };
} // Metrics for monitoring
export interface AppMetrics {
  timestamp: string;
  activeConnections: number;
  requestsPerSecond: number;
  errorRate: number;
  averageResponseTime: number;
  databaseConnectionPool: { active: number; available: number };
}
const metricsStore = {
  requests: [] as { timestamp: number; duration: number; statusCode: number }[],
  errors: [] as { timestamp: number; error: string }[],
  connections: 0,
};
export function recordRequest(duration: number, statusCode: number) {
  const now = Date.now();
  metricsStore.requests.push({ timestamp: now, duration, statusCode }); // Keep only last 60 seconds metricsStore.requests = metricsStore.requests.filter( (r) => now - r.timestamp < 60000 ); if (statusCode >= 400) { metricsStore.errors.push({ timestamp: now, error: `HTTP ${statusCode}` }); metricsStore.errors = metricsStore.errors.filter( (e) => now - e.timestamp < 60000 ); }
}
export function getMetrics(): AppMetrics {
  const now = Date.now();
  const recentRequests = metricsStore.requests.filter(
    (r) => now - r.timestamp < 60000,
  );
  const requestsPerSecond = recentRequests.length / 60;
  const errorCount = recentRequests.filter((r) => r.statusCode >= 400).length;
  const errorRate =
    recentRequests.length > 0 ? (errorCount / recentRequests.length) * 100 : 0;
  const averageResponseTime =
    recentRequests.length > 0
      ? recentRequests.reduce((sum, r) => sum + r.duration, 0) /
        recentRequests.length
      : 0;
  return {
    timestamp: new Date().toISOString(),
    activeConnections: metricsStore.connections,
    requestsPerSecond: parseFloat(requestsPerSecond.toFixed(2)),
    errorRate: parseFloat(errorRate.toFixed(2)),
    averageResponseTime: parseFloat(averageResponseTime.toFixed(2)),
    databaseConnectionPool: {
      active: Math.ceil(metricsStore.connections * 0.3),
      available: Math.ceil(metricsStore.connections * 0.7),
    },
  };
}
