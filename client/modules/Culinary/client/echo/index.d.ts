/**
 * EchoAi³ Main TypeScript Declarations
 * All three layers + expansions
 */

// Core exports
export { EchoAI3, bootstrapEcho } from "./echo-bootstrap";
export type {
  EchoBootstrapOptions,
  EchoInstance,
  EchoAskArgs,
} from "./echo-bootstrap";

// Cognition exports
export {
  buildCognitiveRequest,
  runCognitiveAction,
} from "./cognition/echo-cognition-engine";

export type {
  CognitiveFrame,
  CognitiveActionResult,
} from "./cognition/echo-cognition-engine";

export {
  registerModuleKnowledge,
  buildKnowledgeSummary,
  registerCulinaryKnowledge,
  getCulinaryKnowledge,
} from "./cognition/echo-knowledge-loader";

export type {
  KnowledgeSummary,
  CulinaryKnowledge,
} from "./cognition/echo-knowledge-loader";

export {
  registerModuleLink,
  getLinkedModules,
  describeModuleGraph,
  getRDLabInfluencers,
  canAccessModuleKnowledge,
} from "./cognition/echo-crossmodule";

export type { ModuleLink } from "./cognition/echo-crossmodule";

// Interaction exports
export {
  handleEchoAction,
  handleIngredientQuery,
  handleExperimentQuestion,
  EchoToolbarEvents,
} from "./interaction/echo-ui-hooks";

export type {
  EchoActionState,
  ToolbarEventHandler,
} from "./interaction/echo-ui-hooks";

export {
  echoToolbarConfig,
  echoRDLabsToolbarConfig,
  runToolbarAction,
  runRDLabsToolbarAction,
} from "./interaction/echo-toolbar-bindings";

export type { ToolbarButton } from "./interaction/echo-toolbar-bindings";

export {
  buildModuleContextDescriptor,
  getModuleContext,
  buildRDLabsContext,
} from "./interaction/echo-module-context";

export type {
  ModuleContextDescriptor,
  RDLabsContext,
} from "./interaction/echo-module-context";

// Expansions exports
export {
  enableTronExpansions,
  buildTronGraphFromModules,
  buildCulinaryKnowledgeGraph,
} from "./expansions/tron-expansion";

export type { TronGraph, CulinaryGraph } from "./expansions/tron-expansion";

export {
  enableSandboxRecovery,
  saveSnapshot,
  restoreSnapshot,
  listSnapshots,
  saveExperimentSnapshot,
  compareExperimentSnapshots,
} from "./expansions/sandbox-restore";

export type {
  Snapshot,
  SnapshotComparison,
} from "./expansions/sandbox-restore";

export {
  configureSecurity,
  getSecurityContext,
  withAuthHeaders,
  canAccessModule,
  hasRole,
  canModifyRecipes,
  canAccessAllergenData,
  canUsePredictions,
} from "./expansions/security-wiring";

export type { SecurityContext } from "./expansions/security-wiring";

export {
  recordEchoEvent,
  getRecentEvents,
  recordExperimentEvent,
  getExperimentHistory,
  recordAIReasoning,
  getEventSummary,
} from "./expansions/resilience-suite";

export type { EchoEvent, EventSummary } from "./expansions/resilience-suite";

export {
  runEchoCiChecks,
  validateCulinaryKnowledge,
  validateExperimentConfig,
} from "./expansions/ci-guardrails";

export type {
  CICheckResult,
  ValidationResult,
} from "./expansions/ci-guardrails";

// Knowledge Management exports
export {
  KnowledgeCrawler,
  KnowledgeGapDetector,
  KnowledgeVettingEngine,
  KnowledgeManager,
  EchoChefBrainWithKnowledge,
} from './cognition/knowledgeCrawler" & "./cognition/gapDetector" & "./cognition/knowledgeVetting" & "./cognition/knowledgeManager" & "./brain/echoChefBrainKnowledge';

export type {
  CrawledKnowledge,
  ExtractedRecipe,
  ExtractedTechnique,
  KnowledgeSource,
  TriggerType,
  CrawlerConfig,
  CrawlerResult,
  GapAnalysisResult,
  KnowledgeGap,
  GapCategory,
  CurrentKnowledgeState,
  GapAnalysis,
  VettingResult,
  VettingLevel,
  ValidationCheck,
  ValidationIssue,
  VettingCriteria,
  KnowledgeTrustScoring,
  KnowledgeManagementConfig,
  KnowledgeIntegrationJob,
  KnowledgeMetrics,
  ChefBrainKnowledgeConfig,
  KnowledgeEnrichedSuggestion,
} from './cognition/knowledgeCrawler" & "./cognition/gapDetector" & "./cognition/knowledgeVetting" & "./cognition/knowledgeManager" & "./brain/echoChefBrainKnowledge';
