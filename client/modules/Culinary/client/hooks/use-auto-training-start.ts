import { useEffect, useRef } from "react";
import { useTrainingOrchestration } from "./use-training-orchestration";

/**
 * Hook to automatically start training when component mounts
 * Used to begin training process without user interaction
 */
export function useAutoTrainingStart(
  shouldAutoStart: boolean = true,
  mode: "sequential" | "parallel" = "sequential",
  sources?: string[]
) {
  const {
    session,
    initializeSession,
    startTraining,
  } = useTrainingOrchestration();

  const hasInitiated = useRef(false);

  useEffect(() => {
    if (!shouldAutoStart || hasInitiated.current || session) {
      return;
    }

    // Mark as initiated to prevent double-start
    hasInitiated.current = true;

    // Wait a moment for component to fully mount
    const timer = setTimeout(async () => {
      console.log(
        "[AutoTrainingStart] Starting training automatically in",
        mode,
        "mode"
      );

      try {
        // Initialize session
        await initializeSession(mode);

        // Wait a moment then start
        setTimeout(async () => {
          const defaultSources = [
            "master-dictionary",
            "pinecone-migration",
          ];

          await startTraining(mode, (sources || defaultSources) as any);
        }, 500);
      } catch (error) {
        console.error("[AutoTrainingStart] Failed to start:", error);
        hasInitiated.current = false;
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [shouldAutoStart, mode, sources, session, initializeSession, startTraining]);

  return {
    autoStartInitiated: hasInitiated.current,
    sessionActive: session !== null,
  };
}
