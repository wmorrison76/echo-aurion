/**
 * Startup Diagnostics
 * Monitors and reports on app initialization performance and issues
 */

import { moduleCache } from "./module-cache";
import { usePanelStoreEnhanced } from "./stores/panel-store-enhanced";

export interface StartupDiagnostic {
  timestamp: Date;
  phase: number;
  duration: number;
  memoryUsageMB: number;
  memoryUsagePercent: number;
  panelsLoaded: number;
  failedModules: string[];
  warnings: string[];
}

interface DiagnosticSession {
  startTime: number;
  phases: StartupDiagnostic[];
  totalDuration: number;
  peakMemory: number;
}

class StartupDiagnostics {
  private session: DiagnosticSession | null = null;
  private phaseStartTime: number = 0;
  private failedModules: Set<string> = new Set();
  private warningThresholds = {
    phaseTimeoutMs: 5000,
    memoryThresholdMB: 180,
    moduleFailureRate: 0.1, // 10%
  };

  /**
   * Initialize a new diagnostic session
   */
  startSession(): void {
    this.session = {
      startTime: Date.now(),
      phases: [],
      totalDuration: 0,
      peakMemory: 0,
    };
    this.failedModules.clear();
    console.debug("[StartupDiagnostics] Session started");
  }

  /**
   * Record the start of a restoration phase
   */
  beginPhase(phaseNumber: number): void {
    this.phaseStartTime = Date.now();
  }

  /**
   * Record the completion of a restoration phase
   */
  endPhase(phaseNumber: number, panelsLoaded: number): void {
    if (!this.session) return;

    const duration = Date.now() - this.phaseStartTime;
    const memoryUsageMB = moduleCache.getMemoryUsageMB();
    const memoryUsagePercent = moduleCache.getMemoryUsagePercent();

    const warnings: string[] = [];

    // Check for issues
    if (duration > this.warningThresholds.phaseTimeoutMs) {
      warnings.push(
        `Phase ${phaseNumber} took ${duration}ms (threshold: ${this.warningThresholds.phaseTimeoutMs}ms)`
      );
    }

    if (memoryUsageMB > this.warningThresholds.memoryThresholdMB) {
      warnings.push(
        `Memory usage high: ${memoryUsageMB.toFixed(1)}MB (threshold: ${this.warningThresholds.memoryThresholdMB}MB)`
      );
    }

    const diagnostic: StartupDiagnostic = {
      timestamp: new Date(),
      phase: phaseNumber,
      duration,
      memoryUsageMB,
      memoryUsagePercent,
      panelsLoaded,
      failedModules: Array.from(this.failedModules),
      warnings,
    };

    this.session.phases.push(diagnostic);

    if (memoryUsageMB > this.session.peakMemory) {
      this.session.peakMemory = memoryUsageMB;
    }

    if (warnings.length > 0 && process.env.NODE_ENV === "development") {
      console.warn(
        `[StartupDiagnostics] Phase ${phaseNumber} warnings:`,
        warnings
      );
    }

    console.debug(`[StartupDiagnostics] Phase ${phaseNumber} completed in ${duration}ms`);
  }

  /**
   * Record a module load failure
   */
  recordModuleFailure(moduleName: string, error: Error): void {
    this.failedModules.add(moduleName);
    console.warn(`[StartupDiagnostics] Module failed to load: ${moduleName}`, error);
  }

  /**
   * Finish the diagnostic session and generate report
   */
  endSession(): DiagnosticSession | null {
    if (!this.session) return null;

    this.session.totalDuration = Date.now() - this.session.startTime;

    const report = this.generateReport();
    console.debug("[StartupDiagnostics] Session completed:", report);

    return this.session;
  }

  /**
   * Generate a diagnostic report
   */
  generateReport(): {
    success: boolean;
    totalDurationMs: number;
    peakMemoryMB: number;
    phaseDurations: Record<string, number>;
    failedModules: string[];
    warnings: string[];
  } {
    if (!this.session) {
      return {
        success: false,
        totalDurationMs: 0,
        peakMemoryMB: 0,
        phaseDurations: {},
        failedModules: [],
        warnings: ["No session data available"],
      };
    }

    const phaseDurations: Record<string, number> = {};
    const allWarnings: string[] = [];

    for (const phase of this.session.phases) {
      phaseDurations[`phase_${phase.phase}`] = phase.duration;
      allWarnings.push(...phase.warnings);
    }

    return {
      success: this.failedModules.size === 0,
      totalDurationMs: this.session.totalDuration,
      peakMemoryMB: this.session.peakMemory,
      phaseDurations,
      failedModules: Array.from(this.failedModules),
      warnings: allWarnings,
    };
  }

  /**
   * Send diagnostics to the server (optional, non-blocking, non-throwing)
   * CRITICAL: This is fire-and-forget; never throws or logs errors
   * The /api/metrics endpoint may not exist, backend may be down - all OK
   */
  async sendDiagnosticsToServer(): Promise<void> {
    if (!this.session) return;

    // CRITICAL: Delay sending diagnostics until after page loads
    // This prevents network errors during startup from reaching Sentry
    const sendDiagnostics = () => {
      // CRITICAL: Wrap in try-catch at the outermost level
      try {
        const report = this.generateReport();

        const rawFetch = (globalThis as any).__nativeFetch ?? (globalThis as any).__rawFetch ?? fetch;

        // Wrap fetch in its own promise chain to isolate errors
        Promise.resolve()
          .then(() => {
            return rawFetch("/api/metrics", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                type: "startup",
                data: report,
                sessionDuration: this.session?.totalDuration || 0,
                timestamp: new Date().toISOString(),
              }),
            }).catch(() => {
              // Catch any fetch errors and suppress
              return undefined;
            });
          })
          .catch(() => {
            // Catch any promise chain errors and suppress
            return undefined;
          });
      } catch (err) {
        // Final catch-all - suppress any errors at any level
        // This should never happen but ensures we NEVER throw
      }
    };

    // Schedule after DOM is ready
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", sendDiagnostics, { once: true });
      } else {
        setTimeout(sendDiagnostics, 100);
      }
    }
  }

  /**
   * Get the current session data
   */
  getSession(): DiagnosticSession | null {
    return this.session;
  }

  /**
   * Reset diagnostics
   */
  reset(): void {
    this.session = null;
    this.failedModules.clear();
    this.phaseStartTime = 0;
  }
}

// Singleton instance
export const startupDiagnostics = new StartupDiagnostics();

// Expose to window for debugging
if (typeof window !== "undefined") {
  (window as any).__startupDiagnostics = startupDiagnostics;
}
