/**
 * Performance Optimizer
 * Real-time performance monitoring and profiling for the entire system
 */

interface PerfMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  category: "render" | "network" | "load" | "drag" | "resize" | "interaction";
  metadata?: Record<string, any>;
}

interface PerfReport {
  metrics: PerfMetric[];
  averages: Record<string, number>;
  slowest: PerfMetric[];
  summary: string;
}

class PerformanceOptimizer {
  private metrics: PerfMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics in memory
  private performanceThresholds = {
    drag: 16, // 60fps = 16.67ms per frame
    resize: 16,
    load: 300, // 300ms for panel load
    render: 16.67, // React default
    network: 500, // 500ms for network requests
  };

  /**
   * Start measuring a performance metric
   */
  mark(
    name: string,
    category: PerfMetric["category"],
    metadata?: Record<string, any>,
  ) {
    const metric: PerfMetric = {
      name,
      startTime: performance.now(),
      category,
      metadata,
    };
    // Store for later retrieval
    (window as any).__perfMetric = metric;
    return metric;
  }

  /**
   * End measuring and record the metric
   */
  measure(metric: PerfMetric, metadata?: Record<string, any>) {
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    if (metadata) {
      metric.metadata = { ...metric.metadata, ...metadata };
    }

    this.metrics.push(metric);

    // Keep array size manageable
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log slow operations
    const threshold = this.performanceThresholds[metric.category];
    if (metric.duration > threshold) {
      console.warn(
        `[PERF] Slow ${metric.category}: "${metric.name}" took ${metric.duration.toFixed(2)}ms (threshold: ${threshold}ms)`,
        metric.metadata,
      );
    }

    return metric;
  }

  /**
   * Quick mark and measure in one call
   */
  time<T>(
    name: string,
    category: PerfMetric["category"],
    fn: () => T,
    metadata?: Record<string, any>,
  ): T {
    const startTime = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - startTime;
      const metric: PerfMetric = {
        name,
        startTime,
        endTime: performance.now(),
        duration,
        category,
        metadata,
      };
      this.metrics.push(metric);

      if (this.metrics.length > this.maxMetrics) {
        this.metrics.shift();
      }

      const threshold = this.performanceThresholds[category];
      if (duration > threshold) {
        console.warn(
          `[PERF] Slow ${category}: "${name}" took ${duration.toFixed(2)}ms`,
          metadata,
        );
      }
    }
  }

  /**
   * Async version of time()
   */
  async timeAsync<T>(
    name: string,
    category: PerfMetric["category"],
    fn: () => Promise<T>,
    metadata?: Record<string, any>,
  ): Promise<T> {
    const startTime = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - startTime;
      const metric: PerfMetric = {
        name,
        startTime,
        endTime: performance.now(),
        duration,
        category,
        metadata,
      };
      this.metrics.push(metric);

      if (this.metrics.length > this.maxMetrics) {
        this.metrics.shift();
      }

      const threshold = this.performanceThresholds[category];
      if (duration > threshold) {
        console.warn(
          `[PERF] Slow ${category}: "${name}" took ${duration.toFixed(2)}ms`,
          metadata,
        );
      }
    }
  }

  /**
   * Get performance report
   */
  getReport(): PerfReport {
    const averages: Record<string, number> = {};
    const categories = [
      "drag",
      "resize",
      "load",
      "render",
      "network",
      "interaction",
    ] as const;

    for (const category of categories) {
      const categoryMetrics = this.metrics.filter(
        (m) => m.category === category,
      );
      if (categoryMetrics.length > 0) {
        const avg =
          categoryMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) /
          categoryMetrics.length;
        averages[category] = parseFloat(avg.toFixed(2));
      }
    }

    const slowest = [...this.metrics]
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10);

    const summary = `
Drag avg: ${averages.drag?.toFixed(2) || "N/A"}ms
Resize avg: ${averages.resize?.toFixed(2) || "N/A"}ms
Load avg: ${averages.load?.toFixed(2) || "N/A"}ms
Network avg: ${averages.network?.toFixed(2) || "N/A"}ms
Render avg: ${averages.render?.toFixed(2) || "N/A"}ms
    `.trim();

    return {
      metrics: this.metrics,
      averages,
      slowest,
      summary,
    };
  }

  /**
   * Print performance report to console
   */
  printReport() {
    const report = this.getReport();
    console.log("╔════════════════════════════════════════╗");
    console.log("║   PERFORMANCE REPORT                   ║");
    console.log("╠════════════════════════════════════════╣");
    console.log(report.summary);
    console.log("╠════════════════════════════════════════╣");
    console.log("TOP 10 SLOWEST OPERATIONS:");
    report.slowest.forEach((m, i) => {
      console.log(
        `${i + 1}. "${m.name}" (${m.category}): ${m.duration?.toFixed(2)}ms`,
        m.metadata,
      );
    });
    console.log("╚════════════════════════════════════════╝");
  }

  /**
   * Clear metrics
   */
  clear() {
    this.metrics = [];
  }

  /**
   * Export metrics as JSON
   */
  export() {
    return JSON.stringify(this.getReport(), null, 2);
  }
}

// Singleton instance
export const perfOptimizer = new PerformanceOptimizer();

// Expose to window for debugging
if (typeof window !== "undefined") {
  (window as any).__perfOptimizer = perfOptimizer;
}
