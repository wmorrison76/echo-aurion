/**
 * SI (Semantic Intelligence) Layer - Complete System Export
 * 
 * This module exports all SI components for easy integration
 */

export { SIEngine } from './si-engine';
export type {
  PermissionSuggestion,
  ReasoningChain,
  PermissionEnforcementPolicy,
  EnforcementCondition,
} from './si-engine';

export { SILearningSystem } from './si-learning-system';
export type {
  APILogEntry,
  UserBehaviorProfile,
  AccessPattern,
  PermissionOptimization,
  SystemPinchPoint,
} from './si-learning-system';

export { HQTelemetryClient } from './hq-telemetry-client';
export type {
  TelemetryEvent,
  TelemetryBatch,
  HQReport,
} from './hq-telemetry-client';

/**
 * Initialize all SI systems at application startup
 */
export function initializeSILayer() {
  const siEngine = require('./si-engine').SIEngine.getInstance();
  const learningSystem = require('./si-learning-system').SILearningSystem.getInstance();
  const telemetry = require('./hq-telemetry-client').HQTelemetryClient.getInstance();

  console.log('[SI Layer] Initialized:');
  console.log('  ✓ SI Engine (Permission Suggestions & Enforcement)');
  console.log('  ✓ SI Learning System (API Log Analysis & Pattern Detection)');
  console.log('  ✓ HQ Telemetry Client (Usage & Error Reporting)');

  return {
    siEngine,
    learningSystem,
    telemetry,
  };
}

/**
 * Convenience wrapper for quick access
 */
export const SI = {
  engine: () => require('./si-engine').SIEngine.getInstance(),
  learning: () => require('./si-learning-system').SILearningSystem.getInstance(),
  telemetry: () => require('./hq-telemetry-client').HQTelemetryClient.getInstance(),
};
