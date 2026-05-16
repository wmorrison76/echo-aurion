/**
 * Alert Manager
 * 
 * Manages alerts and notifications for critical issues.
 * Target: <1min alert latency, page on-call for critical
 */

import { logger } from "./logger";
import { getMetricsCollector } from "./metrics-collector";

export interface Alert {
  severity: "critical" | "warning" | "info";
  service: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AlertRule {
  name: string;
  condition: () => Promise<boolean> | boolean;
  severity: "critical" | "warning";
  cooldown?: number; // milliseconds
}

class AlertManager {
  private alerts: Alert[] = [];
  private rules: AlertRule[] = [];
  private lastAlertTimes: Map<string, number> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Register alert rule
   */
  registerRule(rule: AlertRule): void {
    this.rules.push(rule);
    logger.info(`[AlertManager] Registered rule: ${rule.name}`);
  }

  /**
   * Start alert checking
   */
  startChecking(interval: number = 60000): void {
    this.checkInterval = setInterval(async () => {
      await this.checkRules();
    }, interval);

    logger.info("[AlertManager] Started checking alerts");
  }

  /**
   * Check all alert rules
   */
  private async checkRules(): Promise<void> {
    for (const rule of this.rules) {
      try {
        const triggered = await rule.condition();
        
        if (triggered) {
          await this.triggerAlert({
            severity: rule.severity,
            service: "system",
            message: rule.name,
            timestamp: new Date(),
          }, rule);
        }
      } catch (error) {
        logger.error(`[AlertManager] Error checking rule ${rule.name}:`, error);
      }
    }
  }

  /**
   * Trigger alert
   */
  async triggerAlert(alert: Alert, rule?: AlertRule): Promise<void> {
    // Check cooldown
    if (rule) {
      const lastTime = this.lastAlertTimes.get(rule.name);
      if (lastTime && rule.cooldown) {
        if (Date.now() - lastTime < rule.cooldown) {
          return; // Still in cooldown
        }
      }
      this.lastAlertTimes.set(rule.name, Date.now());
    }

    this.alerts.push(alert);

    // Log alert
    if (alert.severity === "critical") {
      logger.error(`[AlertManager] CRITICAL: ${alert.message}`, alert.metadata);
      // TODO: Page on-call engineer
    } else if (alert.severity === "warning") {
      logger.warn(`[AlertManager] WARNING: ${alert.message}`, alert.metadata);
      // TODO: Send to Slack
    } else {
      logger.info(`[AlertManager] INFO: ${alert.message}`, alert.metadata);
    }
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 100): Alert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Stop checking
   */
  stopChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Singleton instance
let alertManager: AlertManager | null = null;

export function getAlertManager(): AlertManager {
  if (!alertManager) {
    alertManager = new AlertManager();
    
    // Register default alert rules
    const metrics = getMetricsCollector();
    
    alertManager.registerRule({
      name: "High error rate",
      severity: "critical",
      condition: () => {
        const errorRate = metrics.getGauge("error_rate_percent");
        return errorRate > 0.1; // >0.1% for 5 minutes
      },
      cooldown: 5 * 60 * 1000, // 5 minutes
    });

    alertManager.registerRule({
      name: "High API response time",
      severity: "critical",
      condition: () => {
        const stats = metrics.getHistogramStats("api_request_duration_seconds");
        return stats.p95 > 0.2; // p95 >200ms for 10 minutes
      },
      cooldown: 10 * 60 * 1000, // 10 minutes
    });

    alertManager.registerRule({
      name: "Database connection pool high utilization",
      severity: "warning",
      condition: () => {
        const utilization = metrics.getGauge("database_pool_utilization_percent");
        return utilization > 90;
      },
      cooldown: 5 * 60 * 1000,
    });

    alertManager.registerRule({
      name: "Queue depth high",
      severity: "warning",
      condition: () => {
        const depth = metrics.getGauge("queue_depth");
        return depth > 1000;
      },
      cooldown: 5 * 60 * 1000,
    });

    alertManager.startChecking();
  }
  return alertManager;
}
