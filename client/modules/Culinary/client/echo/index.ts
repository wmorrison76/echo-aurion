// Core Codex Types - The Golden Culinary Knowledge Structure
export * from "./codex";

// Chemistry & Ingredient Analysis
export * from "./codex/ingredientChemistry";

// Services - Pinecone Integration & Vector Store
export * from "./services";

// Chef Brain - Recipe Suggestion & Reasoning Engine
export * from "./brain";

// Flavor Science - Balance calculations & corrections
export {
  FlavorMatrix,
  type IngredientAmount,
  type FlavorBalanceResult,
} from "./brain/flavorMatrix";

// Knowledge Management - Crawler, Gap Detection, Vetting
export { KnowledgeCrawler } from "./cognition/knowledgeCrawler";
export type {
  CrawledKnowledge,
  ExtractedRecipe,
  ExtractedTechnique,
  KnowledgeSource,
  TriggerType,
  CrawlerConfig,
  CrawlerResult,
  GapAnalysisResult,
} from "./cognition/knowledgeCrawler";

export { KnowledgeGapDetector } from "./cognition/gapDetector";
export type {
  KnowledgeGap,
  GapCategory,
  CurrentKnowledgeState,
  GapAnalysis,
} from "./cognition/gapDetector";

export { KnowledgeVettingEngine } from "./cognition/knowledgeVetting";
export type {
  VettingResult,
  VettingLevel,
  ValidationCheck,
  ValidationIssue,
  VettingCriteria,
  KnowledgeTrustScoring,
} from "./cognition/knowledgeVetting";

export { KnowledgeManager } from "./cognition/knowledgeManager";
export type {
  KnowledgeManagementConfig,
  KnowledgeIntegrationJob,
  KnowledgeMetrics,
} from "./cognition/knowledgeManager";

export { EchoChefBrainWithKnowledge } from "./brain/echoChefBrainKnowledge";
export type {
  ChefBrainKnowledgeConfig,
  KnowledgeEnrichedSuggestion,
} from "./brain/echoChefBrainKnowledge";

// UI Components - Builder-ready Panels
export * from "./ui";
