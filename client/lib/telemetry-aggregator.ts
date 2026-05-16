/**
 * Telemetry Aggregator
 *
 * Collects real-time KPIs from various modules:
 * - Culinary: Food costs, recipe count
 * - Labor: Efficiency, shift coverage
 * - Forecasting: Expected covers, revenue
 * - Inventory: Stock levels, costs
 * - Purchasing: Pending orders, delivery status
 *
 * Exposes unified interface for EchoAI and Dashboard components.
 */

import React from "react";
import { fetchWithFallback } from "@/lib/fetch-with-fallback";

export interface KPI {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "stable";
  severity?: "ok" | "warning" | "critical";
  source?: string;
}

export interface TelemetrySnapshot {
  timestamp: number;
  kpis: Record<string, KPI>;
  modules: {
    culinary?: { costPerPlate?: number; recipesCount?: number };
    labor?: { efficiency?: number; staffing?: number };
    forecasting?: { expectedCovers?: number; projectedRevenue?: number };
    inventory?: { stockHealth?: number; lowStockItems?: number };
    purchasing?: { pendingOrders?: number };
  };
}

/**
 * Fetch KPIs from various API endpoints
 *
 * NOTE: Optional KPI endpoints are disabled to prevent 502 errors
 * when Redis/Supabase are unavailable. Core functionality works
 * without these optional telemetry calls.
 */
async function fetchKPIs(): Promise<Record<string, KPI>> {
  const kpis: Record<string, KPI> = {};

  // Optional telemetry endpoints are disabled
  // Core app functionality does not depend on these metrics

  return kpis;
}

/**
 * Create a telemetry snapshot
 */
export async function createTelemetrySnapshot(): Promise<TelemetrySnapshot> {
  let kpis: Record<string, KPI> = {};

  try {
    kpis = await fetchKPIs();
  } catch (err) {
    // If fetchKPIs fails, only log in debug mode
    // Network errors during startup are expected and handled gracefully
    const isNetworkError =
      (err instanceof Error && err.message?.includes("Failed to fetch")) ||
      (err instanceof Error && err.message?.includes("timeout")) ||
      (err instanceof TypeError && err.message?.includes("fetch"));

    if (!isNetworkError && process.env.NODE_ENV === "development") {
      console.debug("[Telemetry] KPI fetch failed (expected during startup)");
    }
  }

  return {
    timestamp: Date.now(),
    kpis,
    modules: {
      culinary: {},
      labor: {},
      forecasting: {},
      inventory: {},
      purchasing: {},
    },
  };
}

/**
 * Telemetry service with caching and updates
 */
class TelemetryService {
  private snapshot: TelemetrySnapshot | null = null;
  private updateInterval: number | null = null;
  private subscribers: Set<(snapshot: TelemetrySnapshot) => void> = new Set();

  /**
   * Start periodic telemetry updates
   */
  startUpdates(intervalMs: number = 10000): void {
    if (this.updateInterval) return;

    console.log("[Telemetry] Starting updates every", intervalMs, "ms");

    // Initial fetch
    void this.update();

    // Periodic updates
    this.updateInterval = window.setInterval(() => {
      void this.update();
    }, intervalMs);
  }

  /**
   * Stop telemetry updates
   */
  stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log("[Telemetry] Stopped updates");
    }
  }

  /**
   * Fetch latest snapshot
   */
  async update(): Promise<TelemetrySnapshot> {
    try {
      this.snapshot = await createTelemetrySnapshot();
      this.notifySubscribers();
      return this.snapshot;
    } catch (err) {
      // Don't log network errors during startup - they're expected
      // Only log actual application errors
      const isNetworkError =
        (err instanceof Error && (
          err.message?.includes("Failed to fetch") ||
          err.message?.includes("timeout") ||
          err.message?.includes("offline")
        )) ||
        (err instanceof TypeError && err.message?.includes("fetch"));

      if (!isNetworkError) {
        console.debug("[Telemetry] Update encountered non-critical error");
      }

      return (
        this.snapshot || {
          timestamp: Date.now(),
          kpis: {},
          modules: {},
        }
      );
    }
  }

  /**
   * Get current snapshot
   */
  getSnapshot(): TelemetrySnapshot | null {
    return this.snapshot;
  }

  /**
   * Get specific KPI
   */
  getKPI(key: string): KPI | undefined {
    return this.snapshot?.kpis[key];
  }

  /**
   * Get all KPIs
   */
  getKPIs(): Record<string, KPI> {
    return this.snapshot?.kpis || {};
  }

  /**
   * Subscribe to telemetry updates
   */
  subscribe(callback: (snapshot: TelemetrySnapshot) => void): () => void {
    this.subscribers.add(callback);
    // Send initial snapshot if available
    if (this.snapshot) {
      callback(this.snapshot);
    }
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers
   */
  private notifySubscribers(): void {
    if (this.snapshot) {
      this.subscribers.forEach((callback) => {
        try {
          callback(this.snapshot!);
        } catch (err) {
          console.error("[Telemetry] Subscriber error:", err);
        }
      });
    }
  }
}

/**
 * Global telemetry service instance
 */
// CRITICAL: Wrap instantiation to ensure errors don't block app startup
let telemetryService: TelemetryService;
try {
  telemetryService = new TelemetryService();
} catch (err) {
  // If TelemetryService fails to instantiate, create a no-op implementation
  console.debug("[Telemetry] Failed to create service:", err);
  telemetryService = {
    startUpdates: () => {},
    stopUpdates: () => {},
    update: async () => ({
      timestamp: Date.now(),
      kpis: {},
      modules: {},
    }),
    getSnapshot: () => null,
    getKPI: () => undefined,
    getKPIs: () => ({}),
    subscribe: () => () => {},
  } as any as TelemetryService;
}

export { telemetryService };

/**
 * React hook for telemetry updates
 */
export function useTelemetry() {
  const [snapshot, setSnapshot] = React.useState<TelemetrySnapshot | null>(
    telemetryService.getSnapshot()
  );

  React.useEffect(() => {
    const unsubscribe = telemetryService.subscribe(setSnapshot);
    return unsubscribe;
  }, []);

  return snapshot;
}

/**
 * Initialize telemetry and start updates
 * CRITICAL: Wrapped to prevent network errors during startup from reaching Sentry
 */
export function initializeTelemetry(): void {
  if (typeof window !== "undefined") {
    try {
      // Delay telemetry updates until after page load
      // This prevents network errors during initialization from reaching Sentry
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
          try {
            telemetryService.startUpdates(10000); // Update every 10 seconds
          } catch {
            // Silently ignore telemetry errors
          }
        });
      } else {
        // Page already loaded
        telemetryService.startUpdates(10000);
      }
    } catch {
      // Silently ignore initialization errors
    }
  }
}

/**
 * Format KPI for display
 */
export function formatKPI(kpi: KPI): string {
  const parts: string[] = [];

  if (kpi.label) parts.push(kpi.label);
  parts.push(String(kpi.value));
  if (kpi.unit) parts.push(kpi.unit);

  return parts.join(" ");
}
