/**
 * Module Validator (Server-side)
 * Validates all modules at server startup
 * Checks for circular dependencies, missing entry points, etc.
 */

import * as fs from "fs";
import * as path from "path";

export interface ModuleHealthStatus {
  name: string;
  status: "healthy" | "warning" | "unhealthy";
  hasEntryPoint: boolean;
  hasManifest: boolean;
  issues: string[];
  lastValidated: string;
}

export interface ValidationReport {
  timestamp: string;
  serverStartTime: Date;
  modules: Record<string, ModuleHealthStatus>;
  systemStatus: "healthy" | "degraded" | "critical";
  issues: string[];
}

/**
 * Singleton validation cache
 */
let cachedValidationReport: ValidationReport | null = null;

/**
 * Check if module entry point exists
 */
function hasEntryPoint(modulePath: string): boolean {
  const possibleEntries = ["index.tsx", "index.ts", "App.tsx"];
  return possibleEntries.some((entry) =>
    fs.existsSync(path.join(modulePath, entry)),
  );
}

/**
 * Check if module has manifest
 */
function hasManifest(modulePath: string): boolean {
  return fs.existsSync(path.join(modulePath, "luccca-module.json"));
}

/**
 * Validate a single module
 */
function validateModule(
  modulePath: string,
  moduleName: string,
): ModuleHealthStatus {
  const issues: string[] = [];
  let status: "healthy" | "warning" | "unhealthy" = "healthy";

  const hasEntry = hasEntryPoint(modulePath);
  const hasManif = hasManifest(modulePath);

  // Check entry point
  if (!hasEntry) {
    issues.push("Missing entry point (index.tsx, index.ts, or App.tsx)");
    status = "unhealthy";
  }

  // Check nested node_modules (critical issue)
  const nestedNodeModules = path.join(modulePath, "node_modules");
  if (fs.existsSync(nestedNodeModules)) {
    issues.push("Nested node_modules detected (causes ENOSPC errors)");
    status = "unhealthy";
  }

  // Validate manifest if exists
  if (hasManif) {
    try {
      const manifestPath = path.join(modulePath, "luccca-module.json");
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (!manifest.name) {
        issues.push("Manifest missing 'name' field");
        status = "warning";
      }
    } catch (error) {
      issues.push(
        `Invalid manifest JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      status = "warning";
    }
  }

  return {
    name: moduleName,
    status,
    hasEntryPoint: hasEntry,
    hasManifest: hasManif,
    issues,
    lastValidated: new Date().toISOString(),
  };
}

/**
 * Validate all modules
 */
function validateAllModules(): ValidationReport {
  const startTime = Date.now();
  const modulesDir = path.join(process.cwd(), "client", "modules");
  const modules: Record<string, ModuleHealthStatus> = {};
  const issues: string[] = [];

  if (!fs.existsSync(modulesDir)) {
    return {
      timestamp: new Date().toISOString(),
      serverStartTime: new Date(),
      modules: {},
      systemStatus: "critical",
      issues: [`Modules directory not found: ${modulesDir}`],
    };
  }

  // Validate each module
  const moduleDirs = fs.readdirSync(modulesDir, { withFileTypes: true });
  for (const dir of moduleDirs) {
    if (dir.isDirectory()) {
      const modulePath = path.join(modulesDir, dir.name);
      const validation = validateModule(modulePath, dir.name);
      modules[dir.name] = validation;

      if (validation.status === "unhealthy") {
        issues.push(
          `Module '${dir.name}' is unhealthy: ${validation.issues.join(", ")}`,
        );
      }
    }
  }

  // Determine system status
  const totalModules = Object.keys(modules).length;
  const unhealthyModules = Object.values(modules).filter(
    (m) => m.status === "unhealthy",
  ).length;
  const warningModules = Object.values(modules).filter(
    (m) => m.status === "warning",
  ).length;

  let systemStatus: "healthy" | "degraded" | "critical" = "healthy";
  if (unhealthyModules > 0) {
    systemStatus = "critical";
  } else if (warningModules > totalModules * 0.3) {
    systemStatus = "degraded";
  }

  const duration = Date.now() - startTime;
  if (duration > 1000) {
    console.warn(`[Module Validator] Validation took ${duration}ms for ${totalModules} modules`);
  }

  return {
    timestamp: new Date().toISOString(),
    serverStartTime: new Date(),
    modules,
    systemStatus,
    issues,
  };
}

/**
 * Public API: Run validation (cached)
 */
export function getValidationReport(): ValidationReport {
  if (!cachedValidationReport) {
    cachedValidationReport = validateAllModules();
  }
  return cachedValidationReport;
}

/**
 * Public API: Refresh validation (force re-check)
 */
export function refreshValidation(): ValidationReport {
  cachedValidationReport = validateAllModules();
  return cachedValidationReport;
}

/**
 * Public API: Get single module status
 */
export function getModuleStatus(moduleName: string): ModuleHealthStatus | null {
  const report = getValidationReport();
  return report.modules[moduleName] || null;
}

/**
 * Public API: Check if module is healthy
 */
export function isModuleHealthy(moduleName: string): boolean {
  const status = getModuleStatus(moduleName);
  return status ? status.status === "healthy" : false;
}

/**
 * Public API: Get system health status
 */
export function getSystemHealth(): {
  status: "healthy" | "degraded" | "critical";
  issues: string[];
  modules: { [key: string]: "healthy" | "warning" | "unhealthy" };
} {
  const report = getValidationReport();
  const modules: { [key: string]: "healthy" | "warning" | "unhealthy" } = {};

  for (const [name, status] of Object.entries(report.modules)) {
    modules[name] = status.status;
  }

  return {
    status: report.systemStatus,
    issues: report.issues,
    modules,
  };
}

/**
 * Log validation results (for server startup)
 */
export function logValidationResults() {
  const report = getValidationReport();

  console.log("\n" + "=".repeat(80));
  console.log("📊 MODULE VALIDATION REPORT (Server Startup)");
  console.log("=".repeat(80));
  console.log(`Status: ${report.systemStatus.toUpperCase()}`);
  console.log(`Validated: ${Object.keys(report.modules).length} modules`);
  console.log("");

  const healthy = Object.values(report.modules).filter(
    (m) => m.status === "healthy",
  ).length;
  const warning = Object.values(report.modules).filter(
    (m) => m.status === "warning",
  ).length;
  const unhealthy = Object.values(report.modules).filter(
    (m) => m.status === "unhealthy",
  ).length;

  console.log(`✅ Healthy:   ${healthy}`);
  console.log(`⚠️  Warning:   ${warning}`);
  console.log(`🔴 Unhealthy: ${unhealthy}`);

  if (report.issues.length > 0) {
    console.log("\nIssues:");
    for (const issue of report.issues) {
      console.log(`  🔴 ${issue}`);
    }
  }

  console.log("=".repeat(80) + "\n");

  // Log warning if system is not healthy
  if (report.systemStatus !== "healthy") {
    console.warn(
      `⚠️  System is in ${report.systemStatus} mode. Some modules may not function correctly.`,
    );
  }
}

/**
 * Initialize validation at startup
 */
export function initializeValidation() {
  try {
    const report = getValidationReport();
    logValidationResults();
    return report;
  } catch (error) {
    console.error("❌ Module validation failed:", error);
    // Continue anyway - don't crash the server
    return {
      timestamp: new Date().toISOString(),
      serverStartTime: new Date(),
      modules: {},
      systemStatus: "critical" as const,
      issues: [
        `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
    };
  }
}
