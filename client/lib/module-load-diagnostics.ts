/**
 * Module Loading Diagnostics
 * Comprehensive error tracking and diagnostic information for module loading failures
 */

export interface ModuleLoadError {
  moduleKey: string;
  timestamp: number;
  error: Error;
  errorMessage: string;
  stack?: string;
  importPath?: string;
  userAgent?: string;
  url?: string;
  context?: Record<string, unknown>;
}

export interface ModuleLoadAttempt {
  moduleKey: string;
  timestamp: number;
  status: "pending" | "loading" | "success" | "error";
  duration?: number;
  error?: ModuleLoadError;
}

class ModuleLoadDiagnostics {
  private errors: ModuleLoadError[] = [];
  private attempts: ModuleLoadAttempt[] = [];
  private maxErrors = 100;
  private maxAttempts = 200;

  /**
   * Log a module load attempt start
   */
  logAttemptStart(moduleKey: string): (success: boolean, error?: Error, duration?: number) => void {
    const attempt: ModuleLoadAttempt = {
      moduleKey,
      timestamp: Date.now(),
      status: "loading",
    };

    this.attempts.push(attempt);
    if (this.attempts.length > this.maxAttempts) {
      this.attempts.shift();
    }

    // Return a function to mark attempt as complete
    return (success: boolean, error?: Error, duration?: number) => {
      attempt.status = success ? "success" : "error";
      attempt.duration = duration || Date.now() - attempt.timestamp;

      if (error) {
        attempt.error = this.createErrorRecord(moduleKey, error);
      }
    };
  }

  /**
   * Log a module load error with full context
   */
  logError(
    moduleKey: string,
    error: Error | unknown,
    context?: Record<string, unknown>,
  ): void {
    const errorRecord = this.createErrorRecord(moduleKey, error, context);

    this.errors.push(errorRecord);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Enhanced console logging with full context
    console.group(`🔴 Module Load Error: ${moduleKey}`);
    console.error("Error:", errorRecord.error);
    console.error("Message:", errorRecord.errorMessage);
    if (errorRecord.stack) {
      console.error("Stack:", errorRecord.stack);
    }
    if (errorRecord.importPath) {
      console.error("Import Path:", errorRecord.importPath);
    }
    if (context) {
      console.error("Context:", context);
    }
    console.error("Timestamp:", new Date(errorRecord.timestamp).toISOString());
    console.error("URL:", errorRecord.url);
    console.groupEnd();

    // Also log to window for easy access
    if (typeof window !== "undefined") {
      (window as any).__moduleLoadErrors = this.errors;
      (window as any).__moduleLoadAttempts = this.attempts;
      (window as any).__lastModuleError = errorRecord;
    }
  }

  /**
   * Create a comprehensive error record
   */
  private createErrorRecord(
    moduleKey: string,
    error: Error | unknown,
    context?: Record<string, unknown>,
  ): ModuleLoadError {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const errorMessage = errorObj.message || String(error);
    const stack = errorObj.stack;

    // Extract import path from error message if possible
    let importPath: string | undefined;
    if (errorMessage.includes("Failed to fetch")) {
      const match = errorMessage.match(/http[^\s"]+/);
      if (match) importPath = match[0];
    } else if (errorMessage.includes("Cannot find module")) {
      const match = errorMessage.match(/["']([^"']+)["']/);
      if (match) importPath = match[1];
    }

    return {
      moduleKey,
      timestamp: Date.now(),
      error: errorObj,
      errorMessage,
      stack,
      importPath,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      context: context || {},
    };
  }

  /**
   * Get all errors for a specific module
   */
  getErrorsForModule(moduleKey: string): ModuleLoadError[] {
    return this.errors.filter((e) => e.moduleKey === moduleKey);
  }

  /**
   * Get recent errors (last N)
   */
  getRecentErrors(count: number = 10): ModuleLoadError[] {
    return this.errors.slice(-count).reverse();
  }

  /**
   * Get all errors
   */
  getAllErrors(): ModuleLoadError[] {
    return [...this.errors];
  }

  /**
   * Get all module load attempts
   */
  getAllAttempts(): ModuleLoadAttempt[] {
    return [...this.attempts];
  }

  /**
   * Get attempts for a specific module
   */
  getAttemptsForModule(moduleKey: string): ModuleLoadAttempt[] {
    return this.attempts.filter((a) => a.moduleKey === moduleKey);
  }

  /**
   * Get module load statistics
   */
  getStats(): {
    totalAttempts: number;
    successful: number;
    failed: number;
    failureRate: number;
    errorsByModule: Record<string, number>;
    recentErrors: ModuleLoadError[];
  } {
    const successful = this.attempts.filter((a) => a.status === "success").length;
    const failed = this.attempts.filter((a) => a.status === "error").length;
    const total = this.attempts.length;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;

    const errorsByModule: Record<string, number> = {};
    this.errors.forEach((e) => {
      errorsByModule[e.moduleKey] = (errorsByModule[e.moduleKey] || 0) + 1;
    });

    return {
      totalAttempts: total,
      successful,
      failed,
      failureRate,
      errorsByModule,
      recentErrors: this.getRecentErrors(10),
    };
  }

  /**
   * Clear all diagnostics
   */
  clear(): void {
    this.errors = [];
    this.attempts = [];
  }

  /**
   * Generate diagnostic report
   */
  generateReport(): string {
    const stats = this.getStats();
    const report = [
      "=== MODULE LOAD DIAGNOSTICS REPORT ===",
      `Generated: ${new Date().toISOString()}`,
      "",
      "STATISTICS:",
      `  Total Attempts: ${stats.totalAttempts}`,
      `  Successful: ${stats.successful}`,
      `  Failed: ${stats.failed}`,
      `  Failure Rate: ${stats.failureRate.toFixed(2)}%`,
      "",
      "ERRORS BY MODULE:",
      ...Object.entries(stats.errorsByModule)
        .sort(([, a], [, b]) => b - a)
        .map(([module, count]) => `  ${module}: ${count} error(s)`),
      "",
      "RECENT ERRORS:",
      ...stats.recentErrors.map((err, idx) => {
        return [
          `${idx + 1}. ${err.moduleKey} (${new Date(err.timestamp).toISOString()})`,
          `   Message: ${err.errorMessage}`,
          err.importPath ? `   Import: ${err.importPath}` : "",
          err.stack ? `   Stack: ${err.stack.split("\n")[0]}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      }),
    ].join("\n");

    return report;
  }
}

// Singleton instance
export const moduleLoadDiagnostics = new ModuleLoadDiagnostics();

// Export for easy console access
if (typeof window !== "undefined") {
  (window as any).moduleDiagnostics = moduleLoadDiagnostics;
  (window as any).getModuleDiagnostics = () => moduleLoadDiagnostics.generateReport();
  (window as any).clearModuleDiagnostics = () => moduleLoadDiagnostics.clear();
}
