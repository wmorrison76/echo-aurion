/**
 * Real-Time Error Monitor
 * Monitors errors and triggers automatic fixes or alerts
 */

import { moduleLoadDiagnostics } from "./module-load-diagnostics";
import { autoErrorFixer } from "./auto-error-fixer";

export interface MonitoringConfig {
  enableAutoFix: boolean;
  enableAlerts: boolean;
  errorThreshold: number; // Alert after N errors
  checkInterval: number; // Check for new errors every N ms
}

class ErrorMonitor {
  private config: MonitoringConfig = {
    enableAutoFix: true,
    enableAlerts: true,
    errorThreshold: 3,
    checkInterval: 2000, // Check every 2 seconds
  };

  private lastErrorCount = 0;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private errorCallbacks: Array<(error: any) => void> = [];

  /**
   * Start monitoring for errors
   */
  start(config?: Partial<MonitoringConfig>) {
    if (typeof window === "undefined") return;

    this.config = { ...this.config, ...config };

    // Start auto-fixer if enabled
    if (this.config.enableAutoFix) {
      autoErrorFixer.startMonitoring();
    }

    // Start periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.checkForNewErrors();
    }, this.config.checkInterval);

    console.log("[ERROR-MONITOR] Started monitoring", this.config);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log("[ERROR-MONITOR] Stopped monitoring");
  }

  /**
   * Check for new errors and handle them
   */
  private checkForNewErrors() {
    const stats = moduleLoadDiagnostics.getStats();
    const currentErrorCount = stats.failed;

    if (currentErrorCount > this.lastErrorCount) {
      const newErrors = currentErrorCount - this.lastErrorCount;
      const recentErrors = moduleLoadDiagnostics.getRecentErrors(newErrors);

      console.log(`[ERROR-MONITOR] Detected ${newErrors} new error(s)`);

      // Process each new error
      recentErrors.forEach((error) => {
        this.handleError(error);
      });

      // Alert if threshold exceeded
      if (
        this.config.enableAlerts &&
        currentErrorCount >= this.config.errorThreshold
      ) {
        this.triggerAlert(recentErrors);
      }
    }

    this.lastErrorCount = currentErrorCount;
  }

  /**
   * Handle a new error
   */
  private async handleError(error: any) {
    // Notify callbacks
    this.errorCallbacks.forEach((callback) => {
      try {
        callback(error);
      } catch (e) {
        console.error("[ERROR-MONITOR] Callback error:", e);
      }
    });

    // Attempt auto-fix if enabled
    if (this.config.enableAutoFix && error.error) {
      const errorObj = error.error instanceof Error ? error.error : new Error(String(error.error));
      await autoErrorFixer.attemptFix(errorObj, error.moduleKey, error.context);
    }
  }

  /**
   * Trigger alert for multiple errors
   */
  private triggerAlert(errors: any[]) {
    const errorSummary = errors.map((e) => ({
      module: e.moduleKey,
      message: e.errorMessage,
      timestamp: new Date(e.timestamp).toLocaleTimeString(),
    }));

    console.group("🔴 [ERROR-MONITOR] Error Alert");
    console.error(`Multiple errors detected (${errors.length} recent errors):`);
    console.table(errorSummary);
    console.log("Run getModuleDiagnostics() for full details");
    console.groupEnd();

    // Also log to window for easy access
    if (typeof window !== "undefined") {
      (window as any).__errorAlert = {
        count: errors.length,
        errors: errorSummary,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Register a callback for new errors
   */
  onError(callback: (error: any) => void) {
    this.errorCallbacks.push(callback);
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.monitoringInterval !== null,
      config: this.config,
      stats: moduleLoadDiagnostics.getStats(),
      lastErrorCount: this.lastErrorCount,
    };
  }
}

export const errorMonitor = new ErrorMonitor();

// Auto-start monitoring in browser
if (typeof window !== "undefined") {
  errorMonitor.start();
  (window as any).errorMonitor = errorMonitor;
}
