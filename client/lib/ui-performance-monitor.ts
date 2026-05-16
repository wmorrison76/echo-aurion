/**
 * UI Performance Monitor
 * Tracks performance budgets, panel load times, memory usage, and render performance
 * 
 * Features:
 * - Performance budgets (TTI, memory, rerender budgets)
 * - Panel performance tracking
 * - Virtual scrolling support
 * - Performance regression detection
 */

import { logger } from "../../server/lib/logger";

/**
 * Performance Budgets
 */
export interface PerformanceBudgets {
  tti: number; // Time to Interactive (ms) - default: 3000ms
  memory: number; // Memory usage per panel (MB) - default: 100MB
  rerender: number; // Max rerenders per second - default: 60
  paint: number; // First Contentful Paint (ms) - default: 1500ms
  lcp: number; // Largest Contentful Paint (ms) - default: 2500ms
}

const DEFAULT_BUDGETS: PerformanceBudgets = {
  tti: 3000,
  memory: 100,
  rerender: 60,
  paint: 1500,
  lcp: 2500,
};

/**
 * Performance Metrics
 */
export interface PanelPerformanceMetrics {
  panelId: string;
  panelName: string;
  loadTime: number;
  tti: number;
  memoryUsage: number;
  rerenderCount: number;
  paintTime: number;
  lcp: number;
  violations: string[];
  timestamp: string;
}

/**
 * UI Performance Monitor
 */
export class UIPerformanceMonitor {
  private budgets: PerformanceBudgets;
  private panelMetrics: Map<string, PanelPerformanceMetrics> = new Map();
  private rerenderCounts: Map<string, number> = new Map();
  private rerenderTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(budgets?: Partial<PerformanceBudgets>) {
    this.budgets = { ...DEFAULT_BUDGETS, ...budgets };
    this.initializePerformanceObserver();
  }

  /**
   * Initialize Performance Observer for Web Vitals
   */
  private initializePerformanceObserver(): void {
    if (typeof window === "undefined" || !window.PerformanceObserver) {
      return;
    }

    // Observe Paint Timing (FCP, LCP)
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "paint") {
            const paintEntry = entry as PerformancePaintTiming;
            if (paintEntry.name === "first-contentful-paint") {
              this.recordPaintTime(paintEntry.startTime);
            }
          } else if (entry.entryType === "largest-contentful-paint") {
            const lcpEntry = entry as PerformanceEntry;
            this.recordLCP(lcpEntry.startTime);
          }
        }
      });

      paintObserver.observe({ entryTypes: ["paint", "largest-contentful-paint"] });
    } catch (error) {
      logger.warn("[UIPerformance] Performance Observer not supported", { error });
    }

    // Observe Long Tasks
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            logger.warn("[UIPerformance] Long task detected", {
              duration: entry.duration,
              name: entry.name,
            });
          }
        }
      });

      longTaskObserver.observe({ entryTypes: ["longtask"] });
    } catch (error) {
      // Long task observer not supported in all browsers
    }
  }

  /**
   * Track panel load
   */
  trackPanelLoad(panelId: string, panelName: string): void {
    const loadStartTime = performance.now();

    // Calculate memory usage
    const memoryUsage = this.getMemoryUsage();

    // Wait for TTI
    setTimeout(() => {
      const loadTime = performance.now() - loadStartTime;
      const tti = this.estimateTTI(panelId);

      const metrics: PanelPerformanceMetrics = {
        panelId,
        panelName,
        loadTime,
        tti,
        memoryUsage,
        rerenderCount: this.rerenderCounts.get(panelId) || 0,
        paintTime: this.getPaintTime(),
        lcp: this.getLCP(),
        violations: this.checkViolations(loadTime, tti, memoryUsage),
        timestamp: new Date().toISOString(),
      };

      this.panelMetrics.set(panelId, metrics);

      // Log violations
      if (metrics.violations.length > 0) {
        logger.warn("[UIPerformance] Performance violations", {
          panelId,
          panelName,
          violations: metrics.violations,
          metrics,
        });
      } else {
        logger.info("[UIPerformance] Panel loaded within budget", { panelId, panelName, metrics });
      }

      // Send metrics to backend (optional)
      this.sendMetricsToBackend(metrics);
    }, 100);
  }

  /**
   * Track rerender
   */
  trackRerender(panelId: string): void {
    const currentCount = this.rerenderCounts.get(panelId) || 0;
    this.rerenderCounts.set(panelId, currentCount + 1);

    // Reset count every second
    if (this.rerenderTimers.has(panelId)) {
      clearTimeout(this.rerenderTimers.get(panelId)!);
    }

    const timer = setTimeout(() => {
      const count = this.rerenderCounts.get(panelId) || 0;
      if (count > this.budgets.rerender) {
        logger.warn("[UIPerformance] Rerender budget exceeded", {
          panelId,
          rerenderCount: count,
          budget: this.budgets.rerender,
        });
      }
      this.rerenderCounts.set(panelId, 0);
    }, 1000);

    this.rerenderTimers.set(panelId, timer);
  }

  /**
   * Check performance violations
   */
  private checkViolations(loadTime: number, tti: number, memoryUsage: number): string[] {
    const violations: string[] = [];

    if (loadTime > this.budgets.tti) {
      violations.push(`Load time (${loadTime.toFixed(0)}ms) exceeds TTI budget (${this.budgets.tti}ms)`);
    }

    if (tti > this.budgets.tti) {
      violations.push(`TTI (${tti.toFixed(0)}ms) exceeds budget (${this.budgets.tti}ms)`);
    }

    if (memoryUsage > this.budgets.memory) {
      violations.push(
        `Memory usage (${memoryUsage.toFixed(0)}MB) exceeds budget (${this.budgets.memory}MB)`,
      );
    }

    const paintTime = this.getPaintTime();
    if (paintTime > this.budgets.paint) {
      violations.push(`Paint time (${paintTime.toFixed(0)}ms) exceeds budget (${this.budgets.paint}ms)`);
    }

    const lcp = this.getLCP();
    if (lcp > this.budgets.lcp) {
      violations.push(`LCP (${lcp.toFixed(0)}ms) exceeds budget (${this.budgets.lcp}ms)`);
    }

    return violations;
  }

  /**
   * Get memory usage in MB
   */
  private getMemoryUsage(): number {
    if (typeof window === "undefined" || !(performance as any).memory) {
      return 0;
    }

    const memory = (performance as any).memory;
    return (memory.usedJSHeapSize / 1024 / 1024) || 0; // Convert bytes to MB
  }

  /**
   * Estimate Time to Interactive (TTI)
   */
  private estimateTTI(panelId: string): number {
    // Simplified TTI estimation
    // In production, use proper TTI calculation
    const paintTime = this.getPaintTime();
    const loadTime = performance.now() - performance.timing?.navigationStart || 0;
    return Math.max(paintTime, loadTime);
  }

  /**
   * Get First Contentful Paint time
   */
  private getPaintTime(): number {
    if (typeof window === "undefined") return 0;

    const paintEntries = performance.getEntriesByType("paint") as PerformancePaintTiming[];
    const fcp = paintEntries.find((entry) => entry.name === "first-contentful-paint");
    return fcp?.startTime || 0;
  }

  /**
   * Get Largest Contentful Paint time
   */
  private getLCP(): number {
    if (typeof window === "undefined") return 0;

    const lcpEntries = performance.getEntriesByType("largest-contentful-paint") as PerformanceEntry[];
    if (lcpEntries.length === 0) return 0;

    const lastEntry = lcpEntries[lcpEntries.length - 1];
    return lastEntry.startTime || 0;
  }

  /**
   * Record paint time
   */
  private recordPaintTime(time: number): void {
    this.lastPaintTime = time;
  }

  private lastPaintTime = 0;

  /**
   * Record LCP
   */
  private recordLCP(time: number): void {
    this.lastLCP = time;
  }

  private lastLCP = 0;

  /**
   * Send metrics to backend
   */
  private async sendMetricsToBackend(metrics: PanelPerformanceMetrics): Promise<void> {
    try {
      // Optional: Send to backend for aggregation
      // await fetch('/api/performance/metrics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(metrics)
      // });
    } catch (error) {
      logger.warn("[UIPerformance] Failed to send metrics to backend", { error });
    }
  }

  /**
   * Get panel metrics
   */
  getPanelMetrics(panelId: string): PanelPerformanceMetrics | undefined {
    return this.panelMetrics.get(panelId);
  }

  /**
   * Get all panel metrics
   */
  getAllPanelMetrics(): PanelPerformanceMetrics[] {
    return Array.from(this.panelMetrics.values());
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalPanels: number;
    panelsWithinBudget: number;
    panelsWithViolations: number;
    averageLoadTime: number;
    averageMemoryUsage: number;
  } {
    const allMetrics = this.getAllPanelMetrics();
    const panelsWithViolations = allMetrics.filter((m) => m.violations.length > 0);

    return {
      totalPanels: allMetrics.length,
      panelsWithinBudget: allMetrics.length - panelsWithViolations.length,
      panelsWithViolations: panelsWithViolations.length,
      averageLoadTime:
        allMetrics.reduce((sum, m) => sum + m.loadTime, 0) / allMetrics.length || 0,
      averageMemoryUsage:
        allMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / allMetrics.length || 0,
    };
  }
}

// Export singleton instance
export const uiPerformanceMonitor = new UIPerformanceMonitor();

// Export React hook for performance tracking (if React is available)
// Note: Import React separately in components that use this hook
// export function usePanelPerformance(panelId: string, panelName: string) {
//   React.useEffect(() => {
//     uiPerformanceMonitor.trackPanelLoad(panelId, panelName);
//   }, [panelId, panelName]);
//
//   React.useEffect(() => {
//     uiPerformanceMonitor.trackRerender(panelId);
//   });
// }
