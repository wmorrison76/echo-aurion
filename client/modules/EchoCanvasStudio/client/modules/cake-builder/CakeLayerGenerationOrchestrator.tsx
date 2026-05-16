/**
 * Cake Layer Generation Orchestrator
 * Main component that orchestrates Phase 0:
 * - Takes intake answers
 * - Generates prompts for all layers
 * - Creates generation queue
 * - Shows generation progress and approval UI
 * - Returns approved layers for composition
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { IntakeAnswers } from "./types";
import {
  generateAllCakePrompts,
  getPromptConfig,
} from "@/lib/cake-prompt-generator";
import {
  CakeLayerQueueManager,
  saveQueueToStorage,
  loadQueueFromStorage,
  clearQueueFromStorage,
} from "@/lib/cake-layer-queue";
import {
  CakeGenerationService,
  startGenerationInBackground,
} from "@/lib/cake-generation-service";
import CakeLayerApprovalPanel from "./CakeLayerApprovalPanel";

interface CakeLayerGenerationOrchestratorProps {
  intakeAnswers: IntakeAnswers;
  designId: string;
  onGenerationComplete?: (success: boolean) => void;
  onQueueCreated?: (queue: CakeLayerQueueManager) => void;
  autoStart?: boolean;
}

type Phase =
  | "initializing"
  | "queuing"
  | "generating"
  | "approving"
  | "complete";

interface OrchestratorState {
  phase: Phase;
  queue: CakeLayerQueueManager | null;
  generationService: CakeGenerationService | null;
  error: string | null;
  generatedPrompts: {
    tiers: string[];
    frostings: string[];
    fillings: string[];
  } | null;
}

export default function CakeLayerGenerationOrchestrator({
  intakeAnswers,
  designId,
  onGenerationComplete,
  onQueueCreated,
  autoStart = true,
}: CakeLayerGenerationOrchestratorProps) {
  const [state, setState] = useState<OrchestratorState>({
    phase: "initializing",
    queue: null,
    generationService: null,
    error: null,
    generatedPrompts: null,
  });

  /**
   * Phase 1: Initialize - Generate prompts and create queue
   */
  useEffect(() => {
    if (state.phase !== "initializing") return;

    try {
      // Generate prompts from intake answers
      const config = getPromptConfig(intakeAnswers);
      const prompts = generateAllCakePrompts(intakeAnswers, config);

      // Create queue
      const queue = new CakeLayerQueueManager(
        designId,
        intakeAnswers.tierCount || 1,
      );

      // Add all jobs to queue
      for (let i = 0; i < (intakeAnswers.tierCount || 1); i++) {
        // Add tier job
        if (prompts.tiers[i]) {
          queue.addJob("tier", i, prompts.tiers[i]);
        }

        // Add frosting job
        if (prompts.frostings[i]) {
          queue.addJob("frosting", i, prompts.frostings[i]);
        }

        // Add filling job (not for top tier)
        if (i < (intakeAnswers.tierCount || 1) - 1 && prompts.fillings[i]) {
          queue.addJob("filling", i, prompts.fillings[i]);
        }
      }

      // Clear old cache - always start fresh with new intake answers
      clearQueueFromStorage(designId);

      // Do NOT load saved queue - each new intake form should generate fresh images
      // (Uncomment below if you want to resume incomplete generations)
      // const savedQueue = loadQueueFromStorage(designId);
      // if (
      //   savedQueue &&
      //   savedQueue.jobs.length > 0 &&
      //   savedQueue.jobs.some(
      //     (j) => j.status === "completed" || j.status === "approved",
      //   )
      // ) {
      //   queue.importState(savedQueue);
      // }

      setState((prev) => ({
        ...prev,
        phase: "queuing",
        queue,
        generatedPrompts: prompts,
      }));

      onQueueCreated?.(queue);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to initialize";
      setState((prev) => ({
        ...prev,
        phase: "complete",
        error: errorMessage,
      }));
      onGenerationComplete?.(false);
    }
  }, [
    state.phase,
    intakeAnswers,
    designId,
    onQueueCreated,
    onGenerationComplete,
  ]);

  /**
   * Phase 2: Start generation if queue is ready
   */
  useEffect(() => {
    if (state.phase !== "queuing" || !state.queue) return;

    try {
      // Create generation service
      const service = startGenerationInBackground(state.queue, designId);

      setState((prev) => ({
        ...prev,
        phase: "generating",
        generationService: service,
      }));

      // Save queue state
      saveQueueToStorage(designId, state.queue.exportState());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to start generation";
      setState((prev) => ({
        ...prev,
        phase: "complete",
        error: errorMessage,
      }));
      onGenerationComplete?.(false);
    }
  }, [state.phase, state.queue, designId, onGenerationComplete]);

  /**
   * Handle approval complete
   */
  const handleApprovalComplete = useCallback(
    (allApproved: boolean) => {
      if (allApproved && state.queue) {
        // Save final state
        saveQueueToStorage(designId, state.queue.exportState());

        setState((prev) => ({
          ...prev,
          phase: "complete",
        }));

        onGenerationComplete?.(true);
      }
    },
    [state.queue, designId, onGenerationComplete],
  );

  /**
   * Get the approved layers for composition
   */
  const getApprovedLayers = useCallback(() => {
    if (state.queue && state.queue.areAllApproved()) {
      return state.queue.toApprovedLayers();
    }
    return [];
  }, [state.queue]);

  // Expose API to parent component
  useEffect(() => {
    // Store methods on component instance for parent to access
    if (state.queue && state.generationService) {
      (window as any).__cakeOrchestratorAPI = {
        getQueue: () => state.queue,
        getService: () => state.generationService,
        getApprovedLayers,
        getState: () => state,
      };
    }
  }, [state, getApprovedLayers]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        width: "100%",
      }}
    >
      {/* Status Header */}
      <div
        style={{
          padding: "16px",
          backgroundColor: "#1a1a1a",
          borderRadius: "8px",
          border: "1px solid #333",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          <span
            style={{
              fontSize: "20px",
              animation:
                state.phase === "generating"
                  ? "spin 1s linear infinite"
                  : "none",
            }}
          >
            {state.phase === "initializing" && "⚙"}
            {state.phase === "queuing" && "📋"}
            {state.phase === "generating" && "✨"}
            {state.phase === "approving" && "👀"}
            {state.phase === "complete" && "✅"}
          </span>
          <h3
            style={{
              color: "#00f0ff",
              fontSize: "16px",
              fontWeight: "bold",
              margin: 0,
            }}
          >
            {state.phase === "initializing" && "Preparing cake generation..."}
            {state.phase === "queuing" &&
              "Queue ready - preparing to generate..."}
            {state.phase === "generating" && "Generating your cake layers..."}
            {state.phase === "approving" &&
              "Review and approve your cake layers"}
            {state.phase === "complete" && "Generation complete!"}
          </h3>
        </div>
        {state.generatedPrompts && (
          <p
            style={{
              color: "#888",
              fontSize: "11px",
              margin: "8px 0 0 0",
            }}
          >
            Generating {state.generatedPrompts.tiers.length} tiers +{" "}
            {state.generatedPrompts.frostings.length} frostings +{" "}
            {state.generatedPrompts.fillings.length} fillings
          </p>
        )}
      </div>

      {/* Error State */}
      {state.error && (
        <div
          style={{
            padding: "16px",
            backgroundColor: "rgba(244, 63, 94, 0.1)",
            border: "1px solid #f43f5e",
            borderRadius: "8px",
          }}
        >
          <p
            style={{
              color: "#f43f5e",
              fontSize: "12px",
              margin: "0 0 8px 0",
              fontWeight: "bold",
            }}
          >
            ✕ Generation Error
          </p>
          <p
            style={{
              color: "#888",
              fontSize: "11px",
              margin: 0,
              lineHeight: "1.5",
            }}
          >
            {state.error}
          </p>
        </div>
      )}

      {/* Generation Progress & Approval */}
      {state.queue && state.generationService && (
        <CakeLayerApprovalPanel
          queue={state.queue}
          generationService={state.generationService}
          onApprovalComplete={handleApprovalComplete}
        />
      )}

      {/* Prompt Display (Debug) */}
      {state.generatedPrompts && process.env.NODE_ENV === "development" && (
        <details
          style={{
            padding: "12px",
            backgroundColor: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          <summary
            style={{
              color: "#888",
              fontSize: "11px",
              fontWeight: "bold",
              userSelect: "none",
            }}
          >
            📝 View Generated Prompts
          </summary>
          <div
            style={{
              marginTop: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {state.generatedPrompts.tiers.map((prompt, i) => (
              <div key={`tier-${i}`} style={{ fontSize: "10px" }}>
                <p
                  style={{
                    color: "#00f0ff",
                    fontWeight: "bold",
                    margin: "0 0 4px 0",
                  }}
                >
                  Tier {i + 1} Cake Prompt:
                </p>
                <p style={{ color: "#666", margin: 0, lineHeight: "1.4" }}>
                  {prompt}
                </p>
              </div>
            ))}
            {state.generatedPrompts.frostings.map((prompt, i) => (
              <div key={`frosting-${i}`} style={{ fontSize: "10px" }}>
                <p
                  style={{
                    color: "#00f0ff",
                    fontWeight: "bold",
                    margin: "0 0 4px 0",
                  }}
                >
                  Tier {i + 1} Frosting Prompt:
                </p>
                <p style={{ color: "#666", margin: 0, lineHeight: "1.4" }}>
                  {prompt}
                </p>
              </div>
            ))}
            {state.generatedPrompts.fillings.map((prompt, i) => (
              <div key={`filling-${i}`} style={{ fontSize: "10px" }}>
                <p
                  style={{
                    color: "#00f0ff",
                    fontWeight: "bold",
                    margin: "0 0 4px 0",
                  }}
                >
                  Tier {i + 1} Filling Prompt:
                </p>
                <p style={{ color: "#666", margin: 0, lineHeight: "1.4" }}>
                  {prompt}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
