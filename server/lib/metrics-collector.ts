/**
 * Metrics Collector
 * 
 * Collects Prometheus-compatible metrics for monitoring.
 * Target: Real-time visibility, <1min alert latency
 */

import { logger } from "./logger";

export interface Metric {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp?: Date;
}

export type MetricType = "counter" | "gauge" | "histogram";

class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  /**
   * Increment counter
   */
  increment(name: string, labels?: Record<string, string>, value: number = 1): void {
    const key = this.getKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  /**
   * Set gauge value
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    this.gauges.set(key, value);
  }

  /**
   * Record histogram value
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    
    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
    
    this.histograms.set(key, values);
  }

  /**
   * Get counter value
   */
  getCounter(name: string, labels?: Record<string, string>): number {
    const key = this.getKey(name, labels);
    return this.counters.get(key) || 0;
  }

  /**
   * Get gauge value
   */
  getGauge(name: string, labels?: Record<string, string>): number {
    const key = this.getKey(name, labels);
    return this.gauges.get(key) || 0;
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(name: string, labels?: Record<string, string>): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const key = this.getKey(name, labels);
    const values = this.histograms.get(key) || [];
    
    if (values.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    return { count: values.length, sum, avg, min, max, p50, p95, p99 };
  }

  /**
   * Generate Prometheus format
   */
  toPrometheusFormat(): string {
    const lines: string[] = [];

    // Counters
    this.counters.forEach((value, key) => {
      const { name, labels } = this.parseKey(key);
      const labelStr = labels ? `{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(",")}}` : "";
      lines.push(`${name}_total${labelStr} ${value}`);
    });

    // Gauges
    this.gauges.forEach((value, key) => {
      const { name, labels } = this.parseKey(key);
      const labelStr = labels ? `{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(",")}}` : "";
      lines.push(`${name}${labelStr} ${value}`);
    });

    // Histograms
    this.histograms.forEach((values, key) => {
      const { name, labels } = this.parseKey(key);
      const stats = this.getHistogramStats(name, labels);
      const labelStr = labels ? `{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(",")}}` : "";
      lines.push(`${name}_count${labelStr} ${stats.count}`);
      lines.push(`${name}_sum${labelStr} ${stats.sum}`);
      lines.push(`${name}_avg${labelStr} ${stats.avg}`);
      lines.push(`${name}_p95${labelStr} ${stats.p95}`);
      lines.push(`${name}_p99${labelStr} ${stats.p99}`);
    });

    return lines.join("\n");
  }

  /**
   * Get key for metric
   */
  private getKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels).sort().map(([k, v]) => `${k}=${v}`).join(",");
    return `${name}{${labelStr}}`;
  }

  /**
   * Parse key to name and labels
   */
  private parseKey(key: string): { name: string; labels?: Record<string, string> } {
    const match = key.match(/^(.+?)(\{(.+)\})?$/);
    if (!match) return { name: key };

    const name = match[1];
    const labelsStr = match[3];
    
    if (!labelsStr) return { name };

    const labels: Record<string, string> = {};
    labelsStr.split(",").forEach(pair => {
      const [k, v] = pair.split("=");
      if (k && v) {
        labels[k] = v.replace(/^"|"$/g, "");
      }
    });

    return { name, labels };
  }
}

// Singleton instance
let metricsCollector: MetricsCollector | null = null;

export function getMetricsCollector(): MetricsCollector {
  if (!metricsCollector) {
    metricsCollector = new MetricsCollector();
  }
  return metricsCollector;
}
