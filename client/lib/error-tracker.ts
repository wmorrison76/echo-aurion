export interface ErrorLog {
  id: string;
  timestamp: number;
  level: "error" | "warning" | "info";
  category: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
  url?: string;
  userAgent?: string;
  context?: Record<string, any>;
}

const MAX_LOCAL_ERRORS = 100;
const STORAGE_KEY = "error_logs";

class ErrorTracker {
  private logs: ErrorLog[] = [];

  constructor() {
    this.loadFromStorage();
    this.setupGlobalHandlers();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (err) {
      console.warn("Failed to load error logs from storage", err);
    }
  }

  private saveToStorage(): void {
    try {
      // Keep only latest errors
      const recentLogs = this.logs.slice(-MAX_LOCAL_ERRORS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentLogs));
    } catch (err) {
      console.warn("Failed to save error logs to storage", err);
    }
  }

  private async sendToServer(log: ErrorLog): Promise<void> {
    try {
      await fetch("/api/logs/error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      });
    } catch {
      // Silently fail - don't create error logs about error logs
    }
  }

  private setupGlobalHandlers(): void {
    // Unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.logError(
        "unhandled-rejection",
        event.reason?.message || String(event.reason),
        {
          reason: event.reason,
        }
      );
    });

    // Global errors
    window.addEventListener("error", (event) => {
      this.logError("uncaught-error", event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    });
  }

  logError(
    category: string,
    message: string,
    details?: Record<string, any>,
    stack?: string
  ): ErrorLog {
    const log: ErrorLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      level: "error",
      category,
      message,
      details,
      stack,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };

    this.logs.push(log);
    this.saveToStorage();
    this.sendToServer(log);

    console.error(`[${category}] ${message}`, details);

    return log;
  }

  logWarning(
    category: string,
    message: string,
    details?: Record<string, any>
  ): ErrorLog {
    const log: ErrorLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      level: "warning",
      category,
      message,
      details,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    };

    this.logs.push(log);
    this.saveToStorage();

    console.warn(`[${category}] ${message}`, details);

    return log;
  }

  logInfo(
    category: string,
    message: string,
    context?: Record<string, any>
  ): ErrorLog {
    const log: ErrorLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      level: "info",
      category,
      message,
      context,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    };

    this.logs.push(log);

    console.log(`[${category}] ${message}`, context);

    return log;
  }

  getLogs(filter?: { category?: string; level?: string; limit?: number }): ErrorLog[] {
    let filtered = [...this.logs];

    if (filter?.category) {
      filtered = filtered.filter((l) => l.category === filter.category);
    }

    if (filter?.level) {
      filtered = filtered.filter((l) => l.level === filter.level);
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem(STORAGE_KEY);
    console.log("Error logs cleared");
  }

  getStats(): Record<string, any> {
    const stats = {
      total: this.logs.length,
      byLevel: {
        error: this.logs.filter((l) => l.level === "error").length,
        warning: this.logs.filter((l) => l.level === "warning").length,
        info: this.logs.filter((l) => l.level === "info").length,
      },
      byCategory: {} as Record<string, number>,
      recentErrors: this.logs
        .filter((l) => l.level === "error")
        .slice(-5)
        .map((l) => ({
          id: l.id,
          timestamp: l.timestamp,
          category: l.category,
          message: l.message,
        })),
    };

    this.logs.forEach((log) => {
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    });

    return stats;
  }
}

export const errorTracker = new ErrorTracker();

// Make available globally for debugging
if (typeof window !== "undefined") {
  (window as any).errorTracker = errorTracker;
}
