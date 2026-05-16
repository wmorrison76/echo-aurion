/**
 * EchoAi³ /echo Index
 * -------------------
 * Simple barrel file to make imports nicer.
 *
 * Usage:
 *   import { EchoAI3, bootstrapEcho } from "@/echo/index.js";
 *   import { runCognitiveAction } from "@/echo/cognition/echo-cognition-engine.js";
 */

// Core exports
export { EchoAI3, bootstrapEcho } from "./echo-bootstrap.js";
export { getEchoInstance, resetEchoInstance } from "./core/echo-core.js";

// Cognition exports
export {
  buildCognitiveRequest,
  runCognitiveAction,
} from "./cognition/echo-cognition-engine.js";
export {
  registerModuleKnowledge,
  buildKnowledgeSummary,
  registerCulinaryKnowledge,
  getCulinaryKnowledge,
} from "./cognition/echo-knowledge-loader.js";
export {
  registerModuleLink,
  getLinkedModules,
  describeModuleGraph,
  getRDLabInfluencers,
  canAccessModuleKnowledge,
} from "./cognition/echo-crossmodule.js";

// Interaction exports
export {
  handleEchoAction,
  handleIngredientQuery,
  handleExperimentQuestion,
  EchoToolbarEvents,
} from "./interaction/echo-ui-hooks.js";
export {
  echoToolbarConfig,
  echoRDLabsToolbarConfig,
  runToolbarAction,
  runRDLabsToolbarAction,
} from "./interaction/echo-toolbar-bindings.js";
export {
  buildModuleContextDescriptor,
  getModuleContext,
  buildRDLabsContext,
} from "./interaction/echo-module-context.js";

// Expansions exports
export {
  enableTronExpansions,
  buildTronGraphFromModules,
  buildCulinaryKnowledgeGraph,
} from "./expansions/tron-expansion.js";
export {
  enableSandboxRecovery,
  saveSnapshot,
  restoreSnapshot,
  listSnapshots,
  saveExperimentSnapshot,
  compareExperimentSnapshots,
} from "./expansions/sandbox-restore.js";
export {
  configureSecurity,
  getSecurityContext,
  withAuthHeaders,
  canAccessModule,
  hasRole,
  canModifyRecipes,
  canAccessAllergenData,
  canUsePredictions,
} from "./expansions/security-wiring.js";
export {
  recordEchoEvent,
  getRecentEvents,
  recordExperimentEvent,
  getExperimentHistory,
  recordAIReasoning,
  getEventSummary,
} from "./expansions/resilience-suite.js";
export {
  runEchoCiChecks,
  validateCulinaryKnowledge,
  validateExperimentConfig,
} from "./expansions/ci-guardrails.js";
