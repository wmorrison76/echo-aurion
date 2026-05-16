import { Router, Request, Response } from 'express';

const router = Router();

interface TelemetryBatch {
  id: string;
  batchNumber: number;
  startTime: number;
  endTime: number;
  events: Array<{
    id: string;
    timestamp: number;
    type: string;
    userId: string;
    userName: string;
    module: string;
    action: string;
    severity: string;
    message: string;
    details: Record<string, any>;
    tags: string[];
  }>;
  environment: {
    userAgent: string;
    appVersion: string;
    buildNumber: string;
  };
}

interface StoredTelemetryData {
  batchCount: number;
  eventCount: number;
  startDate: number;
  endDate: number;
  events: Map<string, number>;
  errors: Map<string, number>;
  security: Array<{
    type: string;
    count: number;
    severity: string;
  }>;
}

// In-memory storage for telemetry (in production, use database)
const telemetryStore = new Map<string, TelemetryBatch>();
const telemetryStats: StoredTelemetryData = {
  batchCount: 0,
  eventCount: 0,
  startDate: Date.now(),
  endDate: Date.now(),
  events: new Map(),
  errors: new Map(),
  security: [],
};

/**
 * POST /api/telemetry/report
 * Receive telemetry batch from client
 */
router.post('/report', (req: Request, res: Response) => {
  try {
    const batch: TelemetryBatch = req.body;

    // Validate batch structure
    if (!batch.id || !batch.events || !Array.isArray(batch.events)) {
      return res.status(400).json({ error: 'Invalid telemetry batch format' });
    }

    // Store batch
    telemetryStore.set(batch.id, batch);

    // Update statistics
    telemetryStats.batchCount++;
    telemetryStats.eventCount += batch.events.length;
    telemetryStats.endDate = Date.now();

    // Analyze events
    for (const event of batch.events) {
      // Track event types
      const eventKey = `${event.module}:${event.action}`;
      telemetryStats.events.set(eventKey, (telemetryStats.events.get(eventKey) || 0) + 1);

      // Track errors
      if (event.type === 'error') {
        telemetryStats.errors.set(eventKey, (telemetryStats.errors.get(eventKey) || 0) + 1);
      }

      // Track security events
      if (event.type === 'security') {
        const existing = telemetryStats.security.find((s) => s.type === event.action);
        if (existing) {
          existing.count++;
        } else {
          telemetryStats.security.push({
            type: event.action,
            count: 1,
            severity: event.severity,
          });
        }
      }
    }

    // Log high-severity events
    const criticalEvents = batch.events.filter((e) => e.severity === 'critical');
    if (criticalEvents.length > 0) {
      console.warn(`[Telemetry] Critical events detected in batch ${batch.id}:`, criticalEvents);
    }

    // Return success
    res.json({
      success: true,
      batchId: batch.id,
      eventsProcessed: batch.events.length,
    });
  } catch (error) {
    console.error('[Telemetry] Error processing batch:', error);
    res.status(500).json({ error: 'Failed to process telemetry batch' });
  }
});

/**
 * GET /api/telemetry/stats
 * Get current telemetry statistics
 */
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const stats = {
      batchCount: telemetryStats.batchCount,
      eventCount: telemetryStats.eventCount,
      duration: telemetryStats.endDate - telemetryStats.startDate,
      topEvents: Array.from(telemetryStats.events.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([event, count]) => ({ event, count })),
      topErrors: Array.from(telemetryStats.errors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([error, count]) => ({ error, count })),
      securityEvents: telemetryStats.security,
    };

    res.json(stats);
  } catch (error) {
    console.error('[Telemetry] Error retrieving stats:', error);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

/**
 * GET /api/telemetry/batch/:batchId
 * Get specific batch details
 */
router.get('/batch/:batchId', (req: Request, res: Response) => {
  try {
    const batch = telemetryStore.get(req.params.batchId);

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    res.json(batch);
  } catch (error) {
    console.error('[Telemetry] Error retrieving batch:', error);
    res.status(500).json({ error: 'Failed to retrieve batch' });
  }
});

/**
 * GET /api/telemetry/health
 * Get system health report based on telemetry
 */
router.get('/health', (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;

    // Get recent batches
    const recentBatches = Array.from(telemetryStore.values()).filter((b) => b.endTime > last24h);

    // Calculate metrics
    let totalErrors = 0;
    let totalEvents = 0;
    const moduleErrors = new Map<string, number>();
    const slowEndpoints = new Map<string, number[]>();

    for (const batch of recentBatches) {
      totalEvents += batch.events.length;

      for (const event of batch.events) {
        if (event.type === 'error') {
          totalErrors++;
          moduleErrors.set(event.module, (moduleErrors.get(event.module) || 0) + 1);
        }

        if (event.type === 'performance' && event.details.latencyMs > 1000) {
          const key = `${event.module}.${event.action}`;
          if (!slowEndpoints.has(key)) {
            slowEndpoints.set(key, []);
          }
          slowEndpoints.get(key)!.push(event.details.latencyMs);
        }
      }
    }

    const health = {
      status: totalErrors / Math.max(1, totalEvents) < 0.05 ? 'healthy' : 'degraded',
      successRate: 1 - totalErrors / Math.max(1, totalEvents),
      errorCount: totalErrors,
      eventCount: totalEvents,
      moduleHealth: Array.from(moduleErrors.entries()).map(([module, errors]) => ({
        module,
        errorCount: errors,
      })),
      slowEndpoints: Array.from(slowEndpoints.entries())
        .map(([endpoint, latencies]) => ({
          endpoint,
          avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
          p95Latency: latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)],
        }))
        .sort((a, b) => b.avgLatency - a.avgLatency)
        .slice(0, 5),
      timestamp: now,
    };

    res.json(health);
  } catch (error) {
    console.error('[Telemetry] Error calculating health:', error);
    res.status(500).json({ error: 'Failed to calculate health' });
  }
});

/**
 * DELETE /api/telemetry/old
 * Clear telemetry data older than 7 days
 */
router.delete('/old', (_req: Request, res: Response) => {
  try {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const before = telemetryStore.size;

    for (const [id, batch] of telemetryStore.entries()) {
      if (batch.endTime < sevenDaysAgo) {
        telemetryStore.delete(id);
      }
    }

    const after = telemetryStore.size;

    res.json({
      success: true,
      batchesDeleted: before - after,
    });
  } catch (error) {
    console.error('[Telemetry] Error clearing old data:', error);
    res.status(500).json({ error: 'Failed to clear old data' });
  }
});

export default router;
