/**
 * Cake Orchestrator Utilities
 * Separated from component to avoid Fast Refresh issues
 */

import type { IntakeAnswers } from "./types";

/**
 * Hook to access the orchestrator API from parent components
 */
export function useCakeOrchestratorAPI() {
  return (window as any).__cakeOrchestratorAPI;
}

/**
 * Helper to integrate orchestrator into existing CakeStudio
 */
export function integrateOrchestratorWithStudio(
  intakeAnswers: IntakeAnswers,
  designId: string,
  onLayersGenerated?: (layers: any[]) => void,
) {
  // This can be called from CakeStudio to set up generation
  return {
    startGeneration: () => {
      // Generation starts automatically with autoStart=true
    },
    getApprovedLayers: () => {
      const api = (window as any).__cakeOrchestratorAPI;
      return api?.getApprovedLayers() || [];
    },
  };
}
