/**
 * Beverage Intelligence Module - Main Export
 * Unified export for all beverage AI services
 */

export * from "./wine-intelligence";
export * from "./mixology-intelligence";
export * from "./inventory-aware-recommendations";
export * from "./cross-module-intelligence";
export * from "./conversational-ai";
export * from "./real-time-learning";

// Export singleton instances
export { wineIntelligenceService } from "./wine-intelligence";
export { mixologyIntelligenceService } from "./mixology-intelligence";
export { inventoryAwareRecommendationsService } from "./inventory-aware-recommendations";
export { crossModuleIntelligenceService } from "./cross-module-intelligence";
export { conversationalAISommelierService } from "./conversational-ai";
export { realTimeLearningService } from "./real-time-learning";
