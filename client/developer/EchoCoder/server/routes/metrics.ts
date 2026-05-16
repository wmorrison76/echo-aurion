import { Router, Request, Response } from "express";
import { performance } from "perf_hooks";

const router = Router();

interface Metrics {
  timestamp: Date;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  requestCount: number;
  requestErrors: number;
  avgResponseTime: number;
  activeConnections: number;
}

// Global metrics tracking
let requestCount = 0;
let requestErrors = 0;
let totalResponseTime = 0;
let requestMetrics: Array<{ duration: number; timestamp: number }> = [];
const startTime = Date.now();

/**
 * Middleware to track request metrics
 */
export function metricsMiddleware() {
  return (req: any, res: Response, next: any) => {
    const startMark = performance.now();

    // Track response
    const originalEnd = res.end;
    res.end = function (...args: any[]) {
      const duration = performance.now() - startMark;

      requestCount++;
      totalResponseTime += duration;
      requestMetrics.push({ duration, timestamp: Date.now() });

      // Keep last 1000 requests for averaging
      if (requestMetrics.length > 1000) {
        requestMetrics = requestMetrics.slice(-1000);
      }

      if (res.statusCode >= 400) {
        requestErrors++;
      }

      return originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * GET /metrics - Returns comprehensive system metrics
 */
router.get("/", (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  const uptime = (Date.now() - startTime) / 1000; // seconds

  // Calculate average response time from last 100 requests
  const recentMetrics = requestMetrics.slice(-100);
  const avgResponseTime =
    recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
      : 0;

  const metrics: Metrics = {
    timestamp: new Date(),
    uptime,
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      arrayBuffers: (memoryUsage as any).arrayBuffers || 0,
    },
    cpuUsage: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
    requestCount,
    requestErrors,
    avgResponseTime: Math.round(avgResponseTime * 100) / 100, // milliseconds
    activeConnections: (req.app.locals.activeConnections || 0) as number,
  };

  res.json({
    success: true,
    data: metrics,
  });
});

/**
 * GET /health/prometheus - Prometheus-compatible metrics format
 */
router.get("/prometheus", (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const uptime = (Date.now() - startTime) / 1000;
  const recentMetrics = requestMetrics.slice(-100);
  const avgResponseTime =
    recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
      : 0;

  const prometheusMetrics = `# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${uptime}

# HELP process_memory_rss_bytes Resident set size in bytes
# TYPE process_memory_rss_bytes gauge
process_memory_rss_bytes ${memoryUsage.rss}

# HELP process_memory_heap_used_bytes Heap memory used in bytes
# TYPE process_memory_heap_used_bytes gauge
process_memory_heap_used_bytes ${memoryUsage.heapUsed}

# HELP process_memory_heap_total_bytes Total heap memory in bytes
# TYPE process_memory_heap_total_bytes gauge
process_memory_heap_total_bytes ${memoryUsage.heapTotal}

# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{status="all"} ${requestCount}
http_requests_total{status="error"} ${requestErrors}

# HELP http_request_duration_ms HTTP request duration in milliseconds
# TYPE http_request_duration_ms histogram
http_request_duration_ms_sum ${totalResponseTime}
http_request_duration_ms_count ${requestCount}
http_request_duration_ms_avg ${avgResponseTime}
`;

  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send(prometheusMetrics);
});

/**
 * GET /health/detailed - Detailed health status
 */
router.get("/detailed", (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

  const healthStatus = {
    status: memoryPercent < 80 ? "healthy" : memoryPercent < 90 ? "degraded" : "unhealthy",
    timestamp: new Date(),
    uptime: ((Date.now() - startTime) / 1000 / 60).toFixed(2) + " minutes",
    memory: {
      heapUsedMB: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
      rssMB: (memoryUsage.rss / 1024 / 1024).toFixed(2),
      percentUsed: memoryPercent.toFixed(2) + "%",
    },
    requests: {
      total: requestCount,
      errors: requestErrors,
      errorRate: requestCount > 0 ? ((requestErrors / requestCount) * 100).toFixed(2) + "%" : "0%",
      avgResponseTimeMs: (totalResponseTime / Math.max(requestCount, 1)).toFixed(2),
    },
    checks: {
      memoryHealthy: memoryPercent < 90,
      errorRateAcceptable: requestErrors / Math.max(requestCount, 1) < 0.05,
      uptime: ((Date.now() - startTime) / 1000 / 60) > 1, // Been up for at least 1 minute
    },
  };

  res.json({
    success: true,
    data: healthStatus,
  });
});

/**
 * Reset metrics (for testing)
 */
router.post("/reset", (req: Request, res: Response) => {
  requestCount = 0;
  requestErrors = 0;
  totalResponseTime = 0;
  requestMetrics = [];

  res.json({
    success: true,
    message: "Metrics reset successfully",
  });
});

export default router;
