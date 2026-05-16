/**
 * Ecosystem Bootstrap
 * One-line initialization for LUCCCA ecosystem integration
 * Handles Builder.io import, Zora monitoring, and EchoAI cognition
 */

import { getBuilderIOImporter } from "./builder-io-importer";
import { getZoraMonitor } from "./zora-integration";
import { getEchoAICognition } from "./echo-ai-cognition";

export interface BootstrapConfig {
  builderIO?: {
    enabled?: boolean;
    path?: string;
    namespace?: string;
  };
  zora?: {
    enabled?: boolean;
    monitoring?: boolean;
    protection?: boolean;
  };
  echoAI?: {
    enabled?: boolean;
    autoIndex?: boolean;
  };
  verbose?: boolean;
}

export interface BootstrapResult {
  success: boolean;
  importer: ReturnType<typeof getBuilderIOImporter> | null;
  zora: ReturnType<typeof getZoraMonitor> | null;
  echo: ReturnType<typeof getEchoAICognition> | null;
  modules: {
    total: number;
    core: number;
    builderIO: number;
    generated: number;
  };
  timestamp: string;
  errors: string[];
}

/**
 * Bootstrap entire ecosystem in one call
 */
export async function bootstrapEcosystem(
  config: BootstrapConfig = {},
): Promise<BootstrapResult> {
  const errors: string[] = [];
  const startTime = performance.now();

  const options: BootstrapConfig = {
    builderIO: {
      enabled: true,
      path: "/ecosystem/builder-io",
      ...config.builderIO,
    },
    zora: { enabled: true, monitoring: true, protection: true, ...config.zora },
    echoAI: { enabled: true, autoIndex: true, ...config.echoAI },
    verbose: config.verbose ?? false,
  };

  const log = (msg: string) => {
    if (options.verbose) console.log(msg);
  };

  const result: BootstrapResult = {
    success: true,
    importer: null,
    zora: null,
    echo: null,
    modules: { total: 0, core: 0, builderIO: 0, generated: 0 },
    timestamp: new Date().toISOString(),
    errors: [],
  };

  try {
    log("🚀 LUCCCA Ecosystem Bootstrap Started");
    log("━".repeat(50));

    // Step 1: Initialize Builder.io Importer
    if (options.builderIO?.enabled) {
      log("\n📦 Step 1: Loading Builder.io Ecosystem");
      try {
        const importer = getBuilderIOImporter();
        result.importer = importer;

        // Try to load from configured path
        try {
          const ecosystem = await importer.loadEcosystem(
            options.builderIO.path!,
          );
          const registered = importer.registerModules();

          log(`   ✓ Loaded: ${ecosystem.name} v${ecosystem.version}`);
          log(`   ✓ Registered: ${registered.length} modules`);
          log(`   ✓ Storage: ${localStorage.length} keys`);

          result.modules.builderIO = registered.length;
        } catch (loadError) {
          // Builder.io import is optional
          log(`   ℹ️ Builder.io ecosystem not available (optional)`);
          log(`   └─ Reason: ${loadError}`);
        }

        result.modules.core = 16; // Known core modules
        result.modules.generated =
          importer.getRegisteredModules().length - result.modules.builderIO;
      } catch (error) {
        const msg = `Builder.io initialization failed: ${error}`;
        errors.push(msg);
        log(`   ✗ ${msg}`);
      }
    }

    // Step 2: Initialize Zora Monitor
    if (options.zora?.enabled) {
      log("\n🛡️ Step 2: Initializing Zora Protection");
      try {
        const zora = getZoraMonitor({
          enabled: true,
          monitoring: {
            collectMetrics: options.zora.monitoring,
            interval: 30000,
          },
          protection: {
            malwareDetection: options.zora.protection,
            integrityCheck: options.zora.protection,
            rateLimiting: options.zora.protection,
          },
        });

        await zora.initialize();

        if (options.zora.monitoring) {
          zora.startMonitoring();
          log(`   ✓ Health Monitoring: ACTIVE`);
        }

        const status = zora.getProtectionStatus();
        log(
          `   ✓ Malware Detection: ${status.malwareDetection ? "ON" : "OFF"}`,
        );
        log(`   ✓ Integrity Check: ${status.integrityCheck ? "ON" : "OFF"}`);
        log(`   ✓ Rate Limiting: ${status.rateLimiting ? "ON" : "OFF"}`);

        result.zora = zora;
      } catch (error) {
        const msg = `Zora initialization failed: ${error}`;
        errors.push(msg);
        log(`   ✗ ${msg}`);
      }
    }

    // Step 3: Initialize EchoAI Cognition
    if (options.echoAI?.enabled) {
      log("\n🧠 Step 3: Initializing EchoAI Cognition");
      try {
        const echo = getEchoAICognition();

        if (options.echoAI.autoIndex) {
          await echo.initialize();
        }

        const stats = echo.getStatistics();
        log(`   ✓ Modules Indexed: ${stats.totalModules}`);
        log(`   ✓ Intents Mapped: ${stats.totalIntents}`);
        log(`   ✓ Semantic Tokens: ${stats.totalTokens}`);
        log(`   ✓ Status: ${stats.isInitialized ? "READY" : "PENDING"}`);

        result.echo = echo;
        result.modules.total = stats.totalModules;
      } catch (error) {
        const msg = `EchoAI initialization failed: ${error}`;
        errors.push(msg);
        log(`   ✗ ${msg}`);
      }
    }

    // Final status
    log("\n" + "━".repeat(50));
    log("📊 ECOSYSTEM STATUS:");
    log(`   Core Modules: ${result.modules.core}`);
    log(`   Builder.io Modules: ${result.modules.builderIO}`);
    log(`   Generated Modules: ${result.modules.generated}`);
    log(`   TOTAL: ${result.modules.total}`);

    const elapsed = performance.now() - startTime;
    log(`\n⏱️  Bootstrap completed in ${elapsed.toFixed(2)}ms`);

    if (errors.length > 0) {
      log(`\n⚠️  ${errors.length} warning(s)`);
      result.success = false;
    } else {
      log("\n✅ ECOSYSTEM FULLY INITIALIZED");
    }

    result.errors = errors;
  } catch (fatalError) {
    const msg = `Fatal bootstrap error: ${fatalError}`;
    log(`\n❌ ${msg}`);
    errors.push(msg);
    result.success = false;
    result.errors = errors;
  }

  return result;
}

/**
 * Get ecosystem initialization status
 */
export function getEcosystemStatus() {
  return {
    builder: {
      loaded: !!localStorage.getItem("builder-io.ecosystem"),
      modules: (
        JSON.parse(localStorage.getItem("builder-io.modules") || "[]") as any[]
      ).length,
    },
    zora: {
      monitoring: !!localStorage.getItem("zora.monitoring"),
      eventCount:
        (JSON.parse(localStorage.getItem("zora.monitoring") || "{}") as any)
          ?.securityEvents?.length || 0,
    },
    echoAI: {
      indexed: !!localStorage.getItem("echo-ai.cognition.index"),
      moduleCount:
        (
          JSON.parse(
            localStorage.getItem("echo-ai.cognition.index") || "{}",
          ) as any
        )?.moduleIndex?.length || 0,
    },
  };
}

/**
 * Reset ecosystem to defaults
 */
export function resetEcosystem() {
  localStorage.removeItem("builder-io.ecosystem");
  localStorage.removeItem("builder-io.modules");
  localStorage.removeItem("zora.monitoring");
  localStorage.removeItem("echo-ai.cognition.index");

  console.log("🔄 Ecosystem reset to defaults");
}

/**
 * Export ecosystem snapshot for debugging
 */
export function exportEcosystemSnapshot() {
  return {
    timestamp: new Date().toISOString(),
    builder: {
      ecosystem: localStorage.getItem("builder-io.ecosystem"),
      modules: localStorage.getItem("builder-io.modules"),
    },
    zora: localStorage.getItem("zora.monitoring"),
    echoAI: localStorage.getItem("echo-ai.cognition.index"),
  };
}

/**
 * Health check for ecosystem
 */
export function checkEcosystemHealth(): {
  healthy: boolean;
  checks: Record<string, boolean>;
  issues: string[];
} {
  const issues: string[] = [];
  const checks = {
    localStorage: typeof localStorage !== "undefined",
    builderIO: !!localStorage.getItem("builder-io.ecosystem"),
    zora: !!localStorage.getItem("zora.monitoring"),
    echoAI: !!localStorage.getItem("echo-ai.cognition.index"),
  };

  if (!checks.localStorage) issues.push("localStorage not available");
  if (!checks.builderIO)
    issues.push("Builder.io ecosystem not loaded (optional)");
  if (!checks.zora) issues.push("Zora monitoring not initialized (optional)");
  if (!checks.echoAI)
    issues.push("EchoAI cognition not initialized (optional)");

  return {
    healthy: checks.localStorage && (checks.zora || checks.echoAI),
    checks,
    issues,
  };
}
