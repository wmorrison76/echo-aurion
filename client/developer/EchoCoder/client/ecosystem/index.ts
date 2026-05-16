/**
 * LUCCCA Ecosystem Module
 * Central export point for all ecosystem systems
 */

// Builder.io Importer
export { BuilderIOImporter, getBuilderIOImporter } from "./builder-io-importer";
export type {
  BuilderIOModule,
  BuilderIOEcosystem,
} from "./builder-io-importer";

// Zora Monitor
export { ZoraMonitor, getZoraMonitor } from "./zora-integration";
export type {
  SystemHealthMetrics,
  SecurityEvent,
  ZoraConfig,
} from "./zora-integration";

// EchoAI Cognition
export { EchoAICognition, getEchoAICognition } from "./echo-ai-cognition";
export type {
  ModuleSignature,
  ModuleKnowledge,
  CognitionQuery,
  CognitionResult,
} from "./echo-ai-cognition";

// Module Manifest & Discovery
export {
  getAllModules,
  findModuleById,
  findModuleByRoute,
  getModulesBySource,
  getModuleStatistics,
  searchModules,
  getEcosystemManifest,
} from "./manifest";
export type { ModuleInfo } from "./manifest";

// Bootstrap & Setup
export {
  bootstrapEcosystem,
  getEcosystemStatus,
  resetEcosystem,
  exportEcosystemSnapshot,
  checkEcosystemHealth,
} from "./bootstrap";
export type { BootstrapConfig, BootstrapResult } from "./bootstrap";

/**
 * Quick Start - Initialize entire ecosystem in one line
 *
 * import { bootstrapEcosystem } from '@/ecosystem';
 *
 * const ecosystem = await bootstrapEcosystem({
 *   builderIO: { enabled: true },
 *   zora: { enabled: true },
 *   echoAI: { enabled: true },
 *   verbose: true
 * });
 */

/**
 * Usage Examples
 *
 * 1. Load Builder.io Ecosystem
 *    const importer = getBuilderIOImporter();
 *    await importer.loadEcosystem('/path/to/ecosystem');
 *    const modules = importer.registerModules();
 *
 * 2. Monitor with Zora
 *    const zora = getZoraMonitor();
 *    await zora.initialize();
 *    zora.startMonitoring();
 *
 * 3. Query with EchoAI
 *    const echo = getEchoAICognition();
 *    await echo.initialize();
 *    const result = await echo.query({ intent: 'manage_recipes' });
 *
 * 4. Find Modules
 *    const modules = getAllModules();
 *    const module = findModuleById('culinary');
 *    const byRoute = findModuleByRoute('/crm');
 */
