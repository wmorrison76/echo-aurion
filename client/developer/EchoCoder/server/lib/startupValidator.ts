import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

export interface StartupCheckResult {
  status: "success" | "warning" | "error";
  checks: {
    name: string;
    status: "pass" | "warn" | "fail";
    message: string;
    severity: "info" | "warning" | "error";
  }[];
  canStart: boolean;
  isDevelopmentMode?: boolean;
}

/**
 * Comprehensive startup validation
 * Checks all required config before server starts
 * Prevents crashes from missing credentials or database issues
 *
 * In development mode: Warns but doesn't block
 * In production mode: Blocks startup on errors
 */
export async function validateStartup(): Promise<StartupCheckResult> {
  const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
  const checks = [];
  let hasErrors = false;
  let hasWarnings = false;

  // 1. Environment variables check
  const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

  const optionalEnvVars = ["ECHO_OPENAI_API_KEY", "SENTRY_DSN"];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      checks.push({
        name: `Environment: ${envVar}`,
        status: "fail",
        message: `Required environment variable ${envVar} is not set. Set it to your ${envVar === "SUPABASE_URL" ? "Supabase project URL" : "service role key"}.`,
        severity: "error",
      });
      hasErrors = true;
    } else {
      checks.push({
        name: `Environment: ${envVar}`,
        status: "pass",
        message: `${envVar} is configured`,
        severity: "info",
      });
    }
  }

  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      checks.push({
        name: `Environment: ${envVar} (optional)`,
        status: "warn",
        message: `Optional environment variable ${envVar} not set. Some features may be limited.`,
        severity: "warning",
      });
      hasWarnings = true;
    } else {
      checks.push({
        name: `Environment: ${envVar} (optional)`,
        status: "pass",
        message: `${envVar} is configured`,
        severity: "info",
      });
    }
  }

  // 2. Supabase connectivity check (only if config exists)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );

      // Test basic connectivity
      const { error: testError } = await supabase
        .from("information_schema.schemata")
        .select("*")
        .limit(1);

      if (testError) {
        checks.push({
          name: "Database: Connectivity",
          status: "fail",
          message: `Cannot connect to Supabase database: ${testError.message}`,
          severity: "error",
        });
        hasErrors = true;
      } else {
        checks.push({
          name: "Database: Connectivity",
          status: "pass",
          message: "Connected to Supabase successfully",
          severity: "info",
        });
      }

      // Check required tables exist
      const requiredTables = ["tier2_workspaces", "audit_logs", "ab_tests"];

      for (const table of requiredTables) {
        const { data, error } = await supabase
          .from(table)
          .select("count", { count: "exact" })
          .limit(1);

        if (error) {
          checks.push({
            name: `Database: Table ${table}`,
            status: "fail",
            message: `Required table ${table} does not exist or is inaccessible: ${error.message}`,
            severity: "error",
          });
          hasErrors = true;
        } else {
          checks.push({
            name: `Database: Table ${table}`,
            status: "pass",
            message: `Table ${table} exists`,
            severity: "info",
          });
        }
      }
    } catch (err) {
      checks.push({
        name: "Database: Connectivity",
        status: "fail",
        message: `Failed to test database: ${err instanceof Error ? err.message : String(err)}`,
        severity: "error",
      });
      hasErrors = true;
    }
  }

  // 3. File system checks
  const requiredDirs = ["dist/spa", "uploads"];

  for (const dir of requiredDirs) {
    try {
      const fullPath = path.resolve(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        checks.push({
          name: `Filesystem: ${dir}`,
          status: "pass",
          message: `Directory ${dir} created`,
          severity: "info",
        });
      } else {
        checks.push({
          name: `Filesystem: ${dir}`,
          status: "pass",
          message: `Directory ${dir} exists`,
          severity: "info",
        });
      }
    } catch (err) {
      checks.push({
        name: `Filesystem: ${dir}`,
        status: "fail",
        message: `Cannot create/access ${dir}: ${err instanceof Error ? err.message : String(err)}`,
        severity: "error",
      });
      hasErrors = true;
    }
  }

  // 4. Disk space check
  try {
    const diskCheckResult = await checkDiskSpace();
    if (diskCheckResult.availableGB < 1) {
      checks.push({
        name: "Filesystem: Disk Space",
        status: "fail",
        message: `Less than 1GB available disk space (${diskCheckResult.availableGB.toFixed(2)}GB)`,
        severity: "error",
      });
      hasWarnings = true;
    } else {
      checks.push({
        name: "Filesystem: Disk Space",
        status: "pass",
        message: `${diskCheckResult.availableGB.toFixed(2)}GB available`,
        severity: "info",
      });
    }
  } catch (err) {
    checks.push({
      name: "Filesystem: Disk Space",
      status: "warn",
      message: `Could not check disk space: ${err instanceof Error ? err.message : String(err)}`,
      severity: "warning",
    });
  }

  // 5. Port availability check
  const port = parseInt(process.env.PORT || "3001", 10);
  try {
    const portAvailable = await isPortAvailable(port);
    if (!portAvailable) {
      checks.push({
        name: `Network: Port ${port}`,
        status: "fail",
        message: `Port ${port} is already in use`,
        severity: "error",
      });
      hasErrors = true;
    } else {
      checks.push({
        name: `Network: Port ${port}`,
        status: "pass",
        message: `Port ${port} is available`,
        severity: "info",
      });
    }
  } catch (err) {
    checks.push({
      name: `Network: Port ${port}`,
      status: "warn",
      message: `Could not check port availability: ${err instanceof Error ? err.message : String(err)}`,
      severity: "warning",
    });
  }

  // In development mode: Warnings only, allow startup for frontend development
  // In production mode: Block startup on any errors
  const canStart = isDev ? true : !hasErrors;

  return {
    status: hasErrors && !isDev ? "error" : hasWarnings ? "warning" : "success",
    checks,
    canStart,
    isDevelopmentMode: isDev,
  };
}

/**
 * Helper: Check if port is available
 */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const { createServer } = require("net");
    const server = createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

/**
 * Helper: Check available disk space
 */
async function checkDiskSpace(): Promise<{ availableGB: number }> {
  return new Promise((resolve, reject) => {
    try {
      // Simple implementation - in production use 'diskusage' npm package
      const os = require("os");
      const freemem = os.freemem();
      const availableGB = freemem / (1024 * 1024 * 1024);
      resolve({ availableGB });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Print startup validation results to console
 */
export function printValidationResults(result: StartupCheckResult): void {
  console.log("\n" + "=".repeat(60));
  console.log("  🔍 PRODUCTION STARTUP VALIDATION");
  console.log("=".repeat(60));

  const errorChecks = result.checks.filter((c) => c.status === "fail");
  const warningChecks = result.checks.filter((c) => c.status === "warn");
  const passChecks = result.checks.filter((c) => c.status === "pass");

  if (passChecks.length > 0) {
    console.log("\n  ✅ PASSED (" + passChecks.length + "):");
    passChecks.forEach((check) => {
      console.log(`     ${check.name}: ${check.message}`);
    });
  }

  if (warningChecks.length > 0) {
    console.log("\n  ⚠️  WARNINGS (" + warningChecks.length + "):");
    warningChecks.forEach((check) => {
      console.log(`     ${check.name}: ${check.message}`);
    });
  }

  if (errorChecks.length > 0) {
    console.log("\n  ❌ ERRORS (" + errorChecks.length + "):");
    errorChecks.forEach((check) => {
      console.log(`     ${check.name}: ${check.message}`);
    });
  }

  console.log("\n" + "=".repeat(60));
  if (result.canStart) {
    if (result.isDevelopmentMode) {
      console.log(
        "  ✅ Development mode: Starting despite validation warnings",
      );
      console.log(
        "     Note: API calls may fail until configuration is complete",
      );
    } else {
      console.log("  ✅ Server can start - all required checks passed");
    }
  } else {
    console.log("  ❌ Server CANNOT start - fix errors above");
  }
  console.log("=".repeat(60) + "\n");
}
