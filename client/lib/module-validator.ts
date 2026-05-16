/**
 * Module Validator (Client-side)
 * Tests module loading readiness and backend connectivity
 */

import { addBreadcrumb, captureMessage } from "@/lib/sentry-init";

export interface ModuleStatus {
  name: string;
  status: "healthy" | "warning" | "unhealthy";
  loadTime?: number;
  error?: string;
}

export interface ValidationResult {
  timestamp: string;
  systemHealth: "healthy" | "degraded" | "critical";
  backendConnected: boolean;
  modules: ModuleStatus[];
  issues: string[];
  warnings: string[];
}

/**
 * Safe fetch that never throws - always returns a Response or null
 * CRITICAL: This must suppress errors before they reach Sentry
 */
function getRawFetch(): typeof fetch | null {
  return (
    (globalThis as any).__rawFetch ??
    (globalThis as any).__nativeFetch ??
    (typeof window !== "undefined" ? window.fetch.bind(window) : null)
  );
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response | null> {
  const fetchImpl = getRawFetch();
  if (!fetchImpl) return null;

  try {
    const response = await fetchImpl(url, init);
    return response;
  } catch {
    return null;
  }
}

/**
 * Test backend connectivity (non-critical, always succeeds)
 * Returns graceful degradation if backend is unreachable
 * CRITICAL: Very short timeout since this is just a connectivity check
 */
export async function testBackendConnection(): Promise<{
  connected: boolean;
  latency: number;
  error?: string;
}> {
  const startTime = performance.now();
  const backendTimeout = 2000; // 2s timeout - quick check

  try {
    // Use Promise.race for timeout instead of AbortController to avoid 'signal is aborted without reason' errors
    let timedOut = false;
    const result = (await Promise.race([
      safeFetch("/api/health", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }),
      new Promise<Response | null>((_, reject) => {
        setTimeout(
          () => {
            timedOut = true;
            reject(new Error("Backend health check timeout"));
          },
          backendTimeout,
        );
      }),
    ])) as Response | null;

    const latency = performance.now() - startTime;

    if (!result) {
      return {
        connected: false,
        latency,
        error: "Backend unavailable",
      };
    }

    if (result.ok) {
      return { connected: true, latency };
    } else {
      return {
        connected: false,
        latency,
        error: `Backend returned ${result.status}`,
      };
    }
  } catch (error) {
    const latency = performance.now() - startTime;

    // Gracefully handle all errors (network, timeout, CORS, etc.)
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      connected: false,
      latency,
      error: "Backend unavailable",
    };
  }
}

/**
 * Get module health from server
 * Gracefully degrades if backend is unavailable
 * CRITICAL: Keep timeouts short to prevent startup blocking
 */
const HARD_TIMEOUT_MS =
  typeof import.meta !== "undefined" && import.meta.env?.DEV ? 5000 : 8000;

const CACHE_MS = 60_000;
let cachedResult: { result: ValidationResult; at: number } | null = null;

function shouldCacheResult(result: ValidationResult) {
  return result.systemHealth === "healthy";
}

const isDev =
  typeof import.meta !== "undefined" && import.meta.env?.DEV === true;

/**
 * In dev, try a single quick GET /api/health. If it succeeds, return healthy
 * immediately so the stub satisfies the check and we never hit the 15s timeout.
 * CRITICAL: This must complete within 2 seconds or fail gracefully
 */
async function devQuickHealthCheck(
  timestamp: string,
): Promise<ValidationResult | null> {
  if (!isDev || typeof window === "undefined") return null;

  try {
    const res = (await Promise.race([
      safeFetch("/api/health", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }),
      new Promise<Response | null>((_, reject) => {
        setTimeout(() => reject(new Error("Dev quick health check timeout")), 2000);
      }),
    ])) as Response | null;

    if (res?.ok) {
      return {
        timestamp,
        systemHealth: "healthy",
        backendConnected: true,
        modules: [],
        issues: [],
        warnings: [],
      };
    }
  } catch (_) {
    // Silently fail - this is a fast-path check, not critical
  }
  return null;
}

export async function getModuleHealth(): Promise<ValidationResult> {
  const now = Date.now();
  if (cachedResult && now - cachedResult.at < CACHE_MS) {
    return cachedResult.result;
  }
  const timestamp = new Date().toISOString();

  if (isDev) {
    const quick = await devQuickHealthCheck(timestamp);
    if (quick) {
      cachedResult = { result: quick, at: Date.now() };
      return quick;
    }
  }

  // Wrap entire operation in a Promise.race to enforce hard timeout
  // Shorter in dev (8s) so we fail fast when backend/stub is slow
  return Promise.race([
    performModuleHealthCheck(timestamp),
    new Promise<ValidationResult>((resolve) => {
      setTimeout(() => {
        console.debug(
          `[Module Validator] Health check timeout after ${HARD_TIMEOUT_MS / 1000}s (backend may be slow or unavailable)`
        );
        // Non-critical: just return degraded status without alerting
        const degradedResult: ValidationResult = {
          timestamp,
          systemHealth: "degraded",
          backendConnected: false,
          modules: [],
          issues: [],
          warnings: [
            "Module health check timed out - running with degraded status",
          ],
        };
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("module-health-degraded", { detail: degradedResult }));
        }
        resolve(degradedResult);
      }, HARD_TIMEOUT_MS);
    }),
  ]).then((result) => {
    if (shouldCacheResult(result)) {
      cachedResult = { result, at: Date.now() };
    }
    return result;
  }).catch((error) => {
    // Silently degrade on error
    console.debug(
      "[Module Validator] Health check error - using degraded mode"
    );
    const result: ValidationResult = {
      timestamp,
      systemHealth: "degraded",
      backendConnected: false,
      modules: [],
      issues: [],
      warnings: ["Health check failed - running with degraded status"],
    };
    return result;
  });
}

/**
 * Perform the actual module health check
 */
async function performModuleHealthCheck(
  timestamp: string,
): Promise<ValidationResult> {
  const issues: string[] = [];
  const warnings: string[] = [];
  const modules: ModuleStatus[] = [];

  try {
    // Test backend connection first (non-blocking)
    let connTest;
    try {
      connTest = await testBackendConnection();
    } catch (connError) {
      console.debug("Error during backend connection test:", connError);
      connTest = { connected: false, latency: 0 };
    }

    if (!connTest.connected) {
      console.debug(
        "Backend unavailable for health check, using degraded mode",
      );
      return {
        timestamp,
        systemHealth: "degraded",
        backendConnected: false,
        modules: [],
        issues: [],
        warnings: ["Backend unavailable - running in offline mode"],
      };
    }

    // Fetch module health from backend (with 4s timeout to fail fast)
    let data: any = null;
    const moduleHealthTimeout = 4000; // 4s - fail fast but not too aggressive

    try {
      // Use Promise.race for timeout with better error handling
      const response = (await Promise.race([
        safeFetch("/api/module-health", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }),
        new Promise<Response | null>((_, reject) => {
          setTimeout(
            () => {
              reject(new Error("Module health fetch timeout"));
            },
            moduleHealthTimeout,
          );
        }),
      ])) as Response | null;

      if (!response || !response.ok) {
        return {
          timestamp,
          systemHealth: "degraded",
          backendConnected: true,
          modules: [],
          issues: [],
          warnings: ["Module health endpoint returned an error"],
        };
      }

      data = await response.json();
    } catch (fetchError) {
      const isTimeout =
        fetchError instanceof Error && fetchError.message?.includes("timeout");

      console.debug(
        isTimeout
          ? `Module health fetch timed out (${moduleHealthTimeout / 1000}s)`
          : `Module health fetch error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
      );
      return {
        timestamp,
        systemHealth: "degraded",
        backendConnected: true,
        modules: [],
        issues: [],
        warnings: ["Module health check unavailable"],
      };
    }

    // Transform response to our format (supports array or object from stub)
    if (data?.modules) {
      if (Array.isArray(data.modules)) {
        for (const mod of data.modules) {
          modules.push({
            name: mod.name,
            status: mod.status || "warning",
          });
        }
      } else if (typeof data.modules === "object" && data.modules !== null) {
        for (const [name, status] of Object.entries(data.modules)) {
          modules.push({
            name,
            status: (status as string) || "warning",
          });
        }
      }
    }

    // Collect issues and warnings from server
    if (data?.issues && Array.isArray(data.issues)) {
      issues.push(...data.issues);
    }

    // Determine system health
    const healthyCount = modules.filter((m) => m.status === "healthy").length;
    const unhealthyCount = modules.filter(
      (m) => m.status === "unhealthy",
    ).length;

    let systemHealth: "healthy" | "degraded" | "critical" = "healthy";
    if (unhealthyCount > 0) {
      systemHealth = "critical";
    } else if (modules.length > 0 && healthyCount < modules.length * 0.7) {
      systemHealth = "degraded";
    }

    return {
      timestamp,
      systemHealth,
      backendConnected: true,
      modules,
      issues,
      warnings,
    };
  } catch (error) {
    console.debug(
      "Unexpected error in performModuleHealthCheck:",
      error instanceof Error ? error.message : String(error),
    );
    return {
      timestamp,
      systemHealth: "degraded",
      backendConnected: false,
      modules: [],
      issues: [],
      warnings: ["Health check failed - running with degraded status"],
    };
  }
}

/**
 * Check if a specific module can be loaded
 */
export async function canLoadModule(moduleName: string): Promise<boolean> {
  try {
    const result = await getModuleHealth();
    const module = result.modules.find((m) => m.name === moduleName);
    return module ? module.status === "healthy" : false;
  } catch {
    return false;
  }
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: ValidationResult): {
  healthIcon: string;
  healthText: string;
  summary: string;
  recommendations: string[];
} {
  let healthIcon = "✅";
  let healthText = "Healthy";
  let recommendations: string[] = [];

  if (result.systemHealth === "critical") {
    healthIcon = "🔴";
    healthText = "Critical";
    recommendations.push("Please review the system health dashboard");
    if (!result.backendConnected) {
      recommendations.push(
        "Ensure backend server is running (pnpm dev:backend)",
      );
    }
  } else if (result.systemHealth === "degraded") {
    healthIcon = "⚠️";
    healthText = "Degraded";
    recommendations.push("Some modules may not function correctly");
    recommendations.push("Run: pnpm validate:modules to identify issues");
  }

  const summary =
    result.modules.length > 0
      ? `${result.modules.filter((m) => m.status === "healthy").length}/${result.modules.length} modules healthy`
      : "Unable to determine module status";

  return { healthIcon, healthText, summary, recommendations };
}

/**
 * Log validation results to console
 */
export function logValidationResults(result: ValidationResult) {
  const { healthIcon, healthText, summary, recommendations } =
    formatValidationResult(result);

  console.log("📊 Module Validation Results:");
  console.log(`  Status: ${healthIcon} ${healthText}`);
  console.log(`  Summary: ${summary}`);

  if (result.issues.length > 0) {
    console.log("  Issues:");
    for (const issue of result.issues) {
      console.log(`    🔴 ${issue}`);
    }
  }

  if (recommendations.length > 0) {
    console.log("  Recommendations:");
    for (const rec of recommendations) {
      console.log(`    → ${rec}`);
    }
  }
}
