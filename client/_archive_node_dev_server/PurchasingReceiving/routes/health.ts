import { Router, Request, Response } from 'express';
import { getHealthStatus, getMetrics, recordRequest } from '../lib/healthCheck'; const router = Router(); // Health check endpoint - for load balancers
router.get('/health', async (req: Request, res: Response) => { try { const health = await getHealthStatus(); const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 500; res.status(statusCode).json(health); } catch (error) { res.status(500).json({ status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString(), }); }
}); // Detailed health check - for monitoring systems
router.get('/health/detailed', async (req: Request, res: Response) => { try { const health = await getHealthStatus(); const metrics = getMetrics(); res.json({ health, metrics, system: { nodeVersion: process.version, platform: process.platform, arch: process.arch, pid: process.pid, }, }); } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error', }); }
}); // Metrics endpoint - for Prometheus/monitoring systems
router.get('/metrics', (req: Request, res: Response) => { const metrics = getMetrics(); // Prometheus format const prometheusMetrics = `
# HELP app_uptime_seconds Application uptime in seconds
# TYPE app_uptime_seconds gauge
app_uptime_seconds ${Math.floor(Date.now() / 1000)} # HELP app_requests_per_second Requests per second
# TYPE app_requests_per_second gauge
app_requests_per_second ${metrics.requestsPerSecond} # HELP app_error_rate_percent Error rate percentage
# TYPE app_error_rate_percent gauge
app_error_rate_percent ${metrics.errorRate} # HELP app_response_time_ms Average response time in milliseconds
# TYPE app_response_time_ms gauge
app_response_time_ms ${metrics.averageResponseTime} # HELP process_resident_memory_bytes Process memory usage in bytes
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes ${process.memoryUsage().rss} # HELP process_heap_used_bytes Heap memory used in bytes
# TYPE process_heap_used_bytes gauge
process_heap_used_bytes ${process.memoryUsage().heapUsed}
`; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.send(prometheusMetrics);
}); // Readiness check - for Kubernetes
router.get('/ready', async (req: Request, res: Response) => { try { const health = await getHealthStatus(); if (health.status === 'unhealthy') { return res.status(503).json({ ready: false, reason: 'health check failed' }); } res.json({ ready: true }); } catch (error) { res.status(503).json({ ready: false }); }
}); // Liveness check - for Kubernetes
router.get('/alive', (req: Request, res: Response) => { res.json({ alive: true });
}); export default router;
