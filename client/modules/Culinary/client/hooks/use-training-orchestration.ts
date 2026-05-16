import { useState, useCallback, useEffect } from "react";

export type TrainingMode = "sequential" | "parallel";
export type TrainingSource =
  | "master-dictionary"
  | "pinecone-migration"
  | "pdf-library"
  | "web-crawler"
  | "recipe-imports";
export type TrainingStatus = "pending" | "running" | "completed" | "failed";

export interface TrainingSourceProgress {
  source: TrainingSource;
  status: TrainingStatus;
  startTime?: number;
  endTime?: number;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  progress: number; // 0-100
  message: string;
  error?: string;
}

export interface TrainingSessionState {
  id: string;
  mode: TrainingMode;
  startTime: number;
  endTime?: number;
  status: TrainingStatus;
  sources: Record<TrainingSource, TrainingSourceProgress>;
  overallProgress: number;
  message: string;
}

interface TrainingHookState {
  session: TrainingSessionState | null;
  isRunning: boolean;
  error: string | null;
  summary: any | null;
}

export function useTrainingOrchestration() {
  const [state, setState] = useState<TrainingHookState>({
    session: null,
    isRunning: false,
    error: null,
    summary: null,
  });

  const [pollInterval, setPollInterval] = useState<number | null>(null);

  // Fetch current session status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/training/session/status");

      const data = await response.json();

      if (!response.ok) {
        console.warn(
          "[TrainingOrchestration] Status fetch returned error:",
          response.status,
          data?.error || data?.details,
        );
        setState((prev) => ({
          ...prev,
          error: data?.error || `HTTP ${response.status}`,
        }));
        return;
      }

      if (data.success) {
        setState((prev) => ({
          ...prev,
          session: data.session,
          error: null,
        }));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn("[TrainingOrchestration] Error fetching status:", error);
      setState((prev) => ({
        ...prev,
        error: `Failed to connect: ${errorMsg}`,
      }));
    }
  }, []);

  // Initialize a new training session
  const initializeSession = useCallback(
    async (mode: TrainingMode = "sequential") => {
      try {
        setState((prev) => ({ ...prev, error: null }));

        const response = await fetch("/api/training/session/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMsg =
            data?.error ||
            `HTTP ${response.status}: Failed to initialize session`;
          setState((prev) => ({ ...prev, error: errorMsg }));
          return;
        }

        if (data.success) {
          setState((prev) => ({
            ...prev,
            session: data.session,
            error: null,
          }));
          // Start polling after successful session initialization
          setPollInterval(1000);
          return data.session;
        } else {
          setState((prev) => ({
            ...prev,
            error: data.error || "Failed to initialize training",
          }));
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Failed to initialize";
        setState((prev) => ({ ...prev, error: errorMsg }));
      }
    },
    [],
  );

  // Start training
  const startTraining = useCallback(
    async (mode: TrainingMode = "sequential", sources?: TrainingSource[]) => {
      try {
        setState((prev) => ({ ...prev, error: null, isRunning: true }));

        const response = await fetch("/api/training/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, sources }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMsg =
            data?.error || `HTTP ${response.status}: Failed to start training`;
          setState((prev) => ({
            ...prev,
            error: errorMsg,
            isRunning: false,
          }));
          return;
        }

        if (data.success) {
          setState((prev) => ({
            ...prev,
            session: data.session,
            isRunning: true,
            error: null,
          }));

          // Start polling for updates
          setPollInterval(1000);

          return data.session;
        } else {
          setState((prev) => ({
            ...prev,
            error: data.error || "Failed to start training",
            isRunning: false,
          }));
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Failed to start";
        setState((prev) => ({ ...prev, error: errorMsg, isRunning: false }));
      }
    },
    [],
  );

  // Ingest recipes
  const ingestRecipes = useCallback(async (recipeCount: number) => {
    try {
      const response = await fetch("/api/training/ingest-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeCount }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.warn(
          "[TrainingOrchestration] Ingest recipes failed:",
          response.status,
          data?.error,
        );
        return false;
      }

      return data.success ?? false;
    } catch (error) {
      console.warn("[TrainingOrchestration] Error ingesting recipes:", error);
      return false;
    }
  }, []);

  // Ingest PDFs
  const ingestPDFs = useCallback(
    async (pdfCount: number, documentCount: number) => {
      try {
        const response = await fetch("/api/training/ingest-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfCount, documentCount }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.warn(
            "[TrainingOrchestration] Ingest PDFs failed:",
            response.status,
            data?.error,
          );
          return false;
        }

        return data.success ?? false;
      } catch (error) {
        console.warn("[TrainingOrchestration] Error ingesting PDFs:", error);
        return false;
      }
    },
    [],
  );

  // Fetch summary
  const getSummary = useCallback(async () => {
    try {
      const response = await fetch("/api/training/summary");
      const data = await response.json();

      if (!response.ok) {
        console.warn(
          "[TrainingOrchestration] Summary fetch failed:",
          response.status,
          data?.error,
        );
        return;
      }

      if (data.success) {
        setState((prev) => ({
          ...prev,
          summary: data.summary,
        }));
        return data.summary;
      }
    } catch (error) {
      console.warn("[TrainingOrchestration] Error fetching summary:", error);
    }
  }, []);

  // Polling effect
  useEffect(() => {
    if (!pollInterval) return;

    const interval = setInterval(() => {
      fetchStatus();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval, fetchStatus]);

  // Stop polling when training completes
  useEffect(() => {
    if (state.session?.status === "completed") {
      setPollInterval(null);
      setState((prev) => ({ ...prev, isRunning: false }));
      getSummary();
    }
  }, [state.session?.status, getSummary]);

  const stopPolling = useCallback(() => {
    setPollInterval(null);
  }, []);

  return {
    ...state,
    initializeSession,
    startTraining,
    ingestRecipes,
    ingestPDFs,
    getSummary,
    fetchStatus,
    stopPolling,
  };
}
