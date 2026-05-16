import { Router } from "express";
import { authenticateUser } from "../../middleware/auth";
import {
  getPerformanceStats,
  resetMetrics,
  getMetrics,
  getQueryMetrics,
} from "../../middleware/performanceMonitor";
const router =
  Router(); /** * GET /api/performance/stats * Get comprehensive performance statistics */
router.get("/stats", authenticateUser, (req, res) => {
  const stats = getPerformanceStats();
  res.json({ success: true, stats, timestamp: new Date() });
}); /** * GET /api/performance/metrics * Get recent request metrics * Query params: limit (optional, default 100), since (optional, ISO timestamp) */
router.get("/metrics", authenticateUser, (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const since = req.query.since ? new Date(req.query.since as string) : null;
  let metrics = getMetrics();
  if (since) {
    metrics = metrics.filter((m) => m.timestamp > since);
  }
  metrics = metrics.slice(-limit);
  res.json({ success: true, count: metrics.length, metrics });
}); /** * GET /api/performance/query-metrics * Get database query performance metrics * Query params: limit (optional, default 100) */
router.get("/query-metrics", authenticateUser, (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const metrics = getQueryMetrics().slice(-limit);
  res.json({ success: true, count: metrics.length, metrics });
}); /** * POST /api/performance/reset * Reset performance metrics (admin only) */
router.post("/reset", authenticateUser, (req, res) => {
  resetMetrics();
  res.json({ success: true, message: "Performance metrics have been reset" });
}); /** * GET /api/performance/recommendations * Get performance optimization recommendations based on current metrics */
router.get("/recommendations", authenticateUser, (req, res) => {
  const stats = getPerformanceStats();
  const recommendations: Array<{
    priority: "high" | "medium" | "low";
    area: string;
    issue: string;
    recommendation: string;
    estimated_improvement?: string;
  }> = []; // Check request performance if (stats.requests.avgDuration > 500) { recommendations.push({ priority:"high", area:"Request Handling", issue: `Average request duration is ${Math.round(stats.requests.avgDuration)}ms`, recommendation:"Implement caching, optimize database queries, or reduce middleware overhead", estimated_improvement:"20-40%", }); } if (stats.requests.errorRate > 5) { recommendations.push({ priority:"high", area:"Error Rate", issue: `Error rate is ${stats.requests.errorRate.toFixed(2)}%`, recommendation:"Review error logs and add better error handling and validation", }); } if (stats.requests.percentiles.p99 > 5000) { recommendations.push({ priority:"medium", area:"Latency Outliers", issue: `P99 latency is ${stats.requests.percentiles.p99}ms`, recommendation:"Investigate and optimize slowest endpoints", estimated_improvement:"30-50%", }); } // Check query performance if (stats.queries.avgDuration > 200) { recommendations.push({ priority:"high", area:"Database Queries", issue: `Average query duration is ${Math.round(stats.queries.avgDuration)}ms`, recommendation:"Add database indices, optimize query logic, or implement query result caching", estimated_improvement:"40-60%", }); } if (stats.queries.slowQueries > 0) { recommendations.push({ priority:"medium", area:"Slow Queries", issue: `${stats.queries.slowQueries} queries exceeded 500ms threshold`, recommendation:"Review slow queries in query metrics and add indices where appropriate", }); } // Check endpoint-specific issues const slowEndpoints = stats.endpoints.filter((e) => e.avgDuration > 1000); if (slowEndpoints.length > 0) { recommendations.push({ priority:"medium", area:"Slow Endpoints", issue: `${slowEndpoints.length} endpoints have average duration >1000ms`, recommendation: `Focus on optimizing: ${slowEndpoints .slice(0, 3) .map((e) => `${e.method} ${e.path}`) .join(",")}`, }); } // Check for high error endpoints const errorEndpoints = stats.endpoints.filter((e) => e.errorCount > 0); if (errorEndpoints.length > 0) { recommendations.push({ priority:"high", area:"Error Endpoints", issue: `${errorEndpoints.length} endpoints returning errors`, recommendation: `Investigate: ${errorEndpoints .slice(0, 3) .map((e) => `${e.method} ${e.path}`) .join(",")}`, }); } res.json({ success: true, recommendations: recommendations.sort((a, b) => { const priorityOrder = { high: 0, medium: 1, low: 2 }; return priorityOrder[a.priority] - priorityOrder[b.priority]; }), });
}); /** * GET /api/performance/endpoints * Get detailed performance metrics by endpoint * Query params: sort_by (count|avgDuration|errorCount), limit (optional) */
router.get("/endpoints", authenticateUser, (req, res) => {
  const stats = getPerformanceStats();
  const sortBy = (req.query.sort_by as string) || "count";
  const limit = parseInt(req.query.limit as string) || 20;
  let endpoints = [...stats.endpoints];
  if (sortBy === "avgDuration") {
    endpoints.sort((a, b) => b.avgDuration - a.avgDuration);
  } else if (sortBy === "errorCount") {
    endpoints.sort((a, b) => b.errorCount - a.errorCount);
  } else {
    endpoints.sort((a, b) => b.count - a.count);
  }
  res.json({ success: true, endpoints: endpoints.slice(0, limit) });
});
export default router;
