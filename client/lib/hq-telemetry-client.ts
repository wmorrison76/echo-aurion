import { EchoMemoryVault } from '@/core/ai3/EchoMemoryVault';

export interface TelemetryEvent {
  id: string;
  timestamp: number;
  type: 'usage' | 'error' | 'performance' | 'security' | 'compliance';
  userId: string;
  userName: string;
  module: string;
  action: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details: Record<string, any>;
  tags: string[];
}

export interface TelemetryBatch {
  id: string;
  batchNumber: number;
  startTime: number;
  endTime: number;
  events: TelemetryEvent[];
  environment: {
    userAgent: string;
    appVersion: string;
    buildNumber: string;
  };
}

export interface HQReport {
  id: string;
  reportDate: number;
  systemHealth: {
    uptime: number;
    totalRequests: number;
    successRate: number;
    errorRate: number;
    avgLatency: number;
  };
  topErrors: Array<{
    error: string;
    count: number;
    affectedUsers: number;
    lastOccurrence: number;
  }>;
  userActivity: {
    activeUsers: number;
    totalOperations: number;
    peakHours: number[];
    slowestEndpoints: string[];
  };
  securityEvents: Array<{
    event: string;
    count: number;
    severity: string;
    lastOccurrence: number;
  }>;
  recommendations: string[];
}

export class HQTelemetryClient {
  private static instance: HQTelemetryClient | null = null;
  private memoryVault = EchoMemoryVault.getInstance();

  private events: TelemetryEvent[] = [];
  private batches: TelemetryBatch[] = [];
  private hqEndpoint: string = '/api/telemetry/report';
  private batchSize: number = 100;
  private batchInterval: number = 60000; // 1 minute
  private maxRetries: number = 3;

  private batchTimer: NodeJS.Timeout | null = null;
  private uploadQueue: TelemetryBatch[] = [];

  private constructor() {
    this.initializeTelemetry();
  }

  static getInstance() {
    if (!HQTelemetryClient.instance) {
      HQTelemetryClient.instance = new HQTelemetryClient();
    }
    return HQTelemetryClient.instance;
  }

  private initializeTelemetry(): void {
    // Start batch timer
    this.batchTimer = setInterval(() => {
      if (this.events.length > 0) {
        this.createAndQueueBatch();
      }
    }, this.batchInterval);

    // Ensure cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.events.length > 0) {
          this.createAndQueueBatch();
        }
        this.flushQueueSync();
      });
    }
  }

  /**
   * Record a telemetry event
   */
  recordEvent(
    type: TelemetryEvent['type'],
    userId: string,
    userName: string,
    module: string,
    action: string,
    severity: TelemetryEvent['severity'],
    message: string,
    details: Record<string, any> = {},
    tags: string[] = []
  ): void {
    const event: TelemetryEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      type,
      userId,
      userName,
      module,
      action,
      severity,
      message,
      details,
      tags,
    };

    this.events.push(event);

    // Auto-batch if threshold reached
    if (this.events.length >= this.batchSize) {
      this.createAndQueueBatch();
    }

    // Persist event for recovery
    this.persistEvent(event);
  }

  /**
   * Record usage event
   */
  recordUsage(userId: string, userName: string, module: string, action: string, details?: Record<string, any>): void {
    this.recordEvent('usage', userId, userName, module, action, 'info', `User performed ${action} in ${module}`, details || {}, ['normal']);
  }

  /**
   * Record error event
   */
  recordError(
    userId: string,
    userName: string,
    module: string,
    action: string,
    error: Error | string,
    severity: 'warning' | 'error' | 'critical' = 'error',
    details?: Record<string, any>
  ): void {
    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'string' ? undefined : error.stack;

    this.recordEvent(
      'error',
      userId,
      userName,
      module,
      action,
      severity,
      `Error in ${module}.${action}: ${message}`,
      {
        ...details,
        errorStack: stack,
      },
      ['error']
    );
  }

  /**
   * Record performance event
   */
  recordPerformance(
    userId: string,
    userName: string,
    module: string,
    action: string,
    latency: number,
    details?: Record<string, any>
  ): void {
    this.recordEvent(
      'performance',
      userId,
      userName,
      module,
      action,
      latency > 5000 ? 'warning' : 'info',
      `${action} took ${latency}ms`,
      {
        ...details,
        latencyMs: latency,
      },
      ['performance']
    );
  }

  /**
   * Record security event
   */
  recordSecurityEvent(
    userId: string,
    userName: string,
    eventType: string,
    message: string,
    severity: 'warning' | 'error' | 'critical' = 'warning',
    details?: Record<string, any>
  ): void {
    this.recordEvent(
      'security',
      userId,
      userName,
      'Security',
      eventType,
      severity,
      message,
      details || {},
      ['security']
    );
  }

  /**
   * Record compliance event
   */
  recordComplianceEvent(
    userId: string,
    userName: string,
    complianceType: string,
    message: string,
    details?: Record<string, any>
  ): void {
    this.recordEvent(
      'compliance',
      userId,
      userName,
      'Compliance',
      complianceType,
      'info',
      message,
      details || {},
      ['compliance']
    );
  }

  /**
   * Create batch from events
   */
  private createAndQueueBatch(): void {
    if (this.events.length === 0) return;

    const batchEvents = this.events.splice(0, this.batchSize);
    const batch: TelemetryBatch = {
      id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      batchNumber: this.batches.length + 1,
      startTime: Math.min(...batchEvents.map((e) => e.timestamp)),
      endTime: Math.max(...batchEvents.map((e) => e.timestamp)),
      events: batchEvents,
      environment: this.getEnvironmentInfo(),
    };

    this.batches.push(batch);
    this.uploadQueue.push(batch);
    this.persistBatch(batch);

    // Start async upload
    this.uploadBatch(batch);
  }

  /**
   * Upload batch to HQ
   */
  private async uploadBatch(batch: TelemetryBatch, retryCount = 0): Promise<void> {
    try {
      const response = await fetch(this.hqEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      if (response.ok) {
        // Remove from queue on success
        const index = this.uploadQueue.indexOf(batch);
        if (index > -1) {
          this.uploadQueue.splice(index, 1);
        }
      } else if (retryCount < this.maxRetries) {
        // Retry on failure
        setTimeout(() => this.uploadBatch(batch, retryCount + 1), 1000 * (retryCount + 1));
      }
    } catch (e) {
      if (retryCount < this.maxRetries) {
        setTimeout(() => this.uploadBatch(batch, retryCount + 1), 1000 * (retryCount + 1));
      }
    }
  }

  /**
   * Get pending batches
   */
  getPendingBatches(): TelemetryBatch[] {
    return [...this.uploadQueue];
  }

  /**
   * Generate HQ report from collected events
   */
  generateHQReport(): HQReport {
    const allEvents = [...this.events];
    for (const batch of this.batches) {
      allEvents.push(...batch.events);
    }

    const now = Date.now();
    const errors = allEvents.filter((e) => e.type === 'error');
    const usage = allEvents.filter((e) => e.type === 'usage');
    const security = allEvents.filter((e) => e.type === 'security');
    const performance = allEvents.filter((e) => e.type === 'performance');

    // Group errors
    const errorMap = new Map<string, TelemetryEvent[]>();
    errors.forEach((e) => {
      const key = `${e.module}.${e.action}`;
      if (!errorMap.has(key)) {
        errorMap.set(key, []);
      }
      errorMap.get(key)!.push(e);
    });

    const topErrors = Array.from(errorMap.entries())
      .map(([error, events]) => ({
        error,
        count: events.length,
        affectedUsers: new Set(events.map((e) => e.userId)).size,
        lastOccurrence: Math.max(...events.map((e) => e.timestamp)),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate metrics
    const totalRequests = usage.length;
    const successRate = totalRequests > 0 ? 1 - errors.length / totalRequests : 1;
    const avgLatency = performance.length > 0 ? performance.reduce((sum, e) => sum + (e.details.latencyMs || 0), 0) / performance.length : 0;

    // Peak hours
    const peakHours = new Map<number, number>();
    usage.forEach((e) => {
      const hour = new Date(e.timestamp).getHours();
      peakHours.set(hour, (peakHours.get(hour) || 0) + 1);
    });
    const sortedPeaks = Array.from(peakHours.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);

    // Security events
    const securityMap = new Map<string, TelemetryEvent[]>();
    security.forEach((e) => {
      const key = e.action;
      if (!securityMap.has(key)) {
        securityMap.set(key, []);
      }
      securityMap.get(key)!.push(e);
    });

    const securityEvents = Array.from(securityMap.entries()).map(([event, events]) => ({
      event,
      count: events.length,
      severity: events[0].severity,
      lastOccurrence: Math.max(...events.map((e) => e.timestamp)),
    }));

    // Generate recommendations
    const recommendations = this.generateRecommendations(topErrors, successRate, avgLatency, securityEvents);

    return {
      id: `report-${Date.now()}`,
      reportDate: now,
      systemHealth: {
        uptime: this.calculateUptime(),
        totalRequests,
        successRate,
        errorRate: 1 - successRate,
        avgLatency,
      },
      topErrors,
      userActivity: {
        activeUsers: new Set(usage.map((e) => e.userId)).size,
        totalOperations: usage.length,
        peakHours: sortedPeaks,
        slowestEndpoints: this.getSlowestEndpoints(performance),
      },
      securityEvents,
      recommendations,
    };
  }

  /**
   * Generate recommendations based on collected data
   */
  private generateRecommendations(
    topErrors: HQReport['topErrors'],
    successRate: number,
    avgLatency: number,
    securityEvents: HQReport['securityEvents']
  ): string[] {
    const recommendations: string[] = [];

    if (successRate < 0.95) {
      recommendations.push(`Success rate is ${(successRate * 100).toFixed(1)}% - investigate top errors: ${topErrors.slice(0, 3).map((e) => e.error).join(', ')}`);
    }

    if (avgLatency > 1000) {
      recommendations.push(`Average latency is ${avgLatency.toFixed(0)}ms - consider performance optimization for slow endpoints`);
    }

    if (securityEvents.length > 0) {
      const critical = securityEvents.filter((e) => e.severity === 'critical');
      if (critical.length > 0) {
        recommendations.push(`${critical.length} critical security events detected - review immediately`);
      }
    }

    if (topErrors.length > 0 && topErrors[0].count > 100) {
      recommendations.push(`Top error "${topErrors[0].error}" affecting ${topErrors[0].affectedUsers} users with ${topErrors[0].count} occurrences - urgent investigation required`);
    }

    recommendations.push('Continue monitoring system performance and user behavior patterns');

    return recommendations;
  }

  private getSlowestEndpoints(performance: TelemetryEvent[]): string[] {
    const endpointMap = new Map<string, number[]>();

    performance.forEach((e) => {
      const endpoint = `${e.module}.${e.action}`;
      if (!endpointMap.has(endpoint)) {
        endpointMap.set(endpoint, []);
      }
      endpointMap.get(endpoint)!.push(e.details.latencyMs || 0);
    });

    const slowest = Array.from(endpointMap.entries())
      .map(([endpoint, latencies]) => ({
        endpoint,
        avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      }))
      .sort((a, b) => b.avgLatency - a.avgLatency)
      .slice(0, 5)
      .map((e) => e.endpoint);

    return slowest;
  }

  private getEnvironmentInfo() {
    if (typeof window === 'undefined') {
      return {
        userAgent: 'server',
        appVersion: '1.0.0',
        buildNumber: '1',
      };
    }

    return {
      userAgent: navigator.userAgent,
      appVersion: typeof (window as any).__APP_VERSION__ === 'string' ? (window as any).__APP_VERSION__ : '1.0.0',
      buildNumber: typeof (window as any).__BUILD_NUMBER__ === 'string' ? (window as any).__BUILD_NUMBER__ : '1',
    };
  }

  private calculateUptime(): number {
    // This would be calculated based on deployment/start time
    // For now, return a placeholder
    return 99.9;
  }

  private async persistEvent(event: TelemetryEvent): Promise<void> {
    try {
      await this.memoryVault.storeMemory(`event-${event.id}`, event);
    } catch (e) {
      // Ignore persistence errors
    }
  }

  private async persistBatch(batch: TelemetryBatch): Promise<void> {
    try {
      await this.memoryVault.storeMemory(`batch-${batch.id}`, batch);
    } catch (e) {
      // Ignore persistence errors
    }
  }

  private flushQueueSync(): void {
    // Attempt synchronous flush for critical events before page unload
    if (this.uploadQueue.length > 0) {
      const batch = this.uploadQueue[0];
      try {
        const req = new XMLHttpRequest();
        req.open('POST', this.hqEndpoint, false);
        req.setRequestHeader('Content-Type', 'application/json');
        req.send(JSON.stringify(batch));
      } catch (e) {
        // Ignore sync send errors
      }
    }
  }

  /**
   * Clear old data (keep last 7 days)
   */
  clearOldData(): void {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.batches = this.batches.filter((b) => b.endTime > sevenDaysAgo);
  }
}
