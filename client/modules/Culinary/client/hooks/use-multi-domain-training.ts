import { useCallback, useState, useEffect } from "react";
import type {
  MultiDomainTrainingSession,
  DomainTrainingState,
} from "@/shared/multi-domain-training";

interface UseMultiDomainTrainingReturn {
  session: MultiDomainTrainingSession | null;
  isRunning: boolean;
  isInitializing: boolean;
  error: string | null;
  initializeSession: () => Promise<void>;
  startSequentialTraining: () => Promise<void>;
  getSessionStatus: (
    sessionId: string,
  ) => Promise<MultiDomainTrainingSession | null>;
  getDomainStatus: (
    sessionId: string,
    profileId: string,
  ) => DomainTrainingState | null;
  getProgressPercentage: () => number;
  getTotalKnowledgeLearned: () => number;
  getCompletedDomains: () => number;
  getTotalDomains: () => number;
}

export function useMultiDomainTraining(): UseMultiDomainTrainingReturn {
  const [session, setSession] = useState<MultiDomainTrainingSession | null>(
    null,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storedVectorCount, setStoredVectorCount] = useState(0);

  // Load stored vector count on mount
  useEffect(() => {
    const loadStoredVectors = async () => {
      try {
        const response = await fetch(
          "/api/multi-domain-training/pinecone/status",
        );

        if (!response.ok) {
          console.warn(
            `[useMultiDomainTraining] Status endpoint returned ${response.status}: ${response.statusText}`,
          );
          // Gracefully degrade - set count to 0 if status check fails
          setStoredVectorCount(0);
          return;
        }

        const data = await response.json();
        const count = data.pinecone?.trainingDataVectors?.total ?? 0;
        setStoredVectorCount(count);
        console.log(`[useMultiDomainTraining] Loaded ${count} stored vectors`);
      } catch (err) {
        console.error(
          "[useMultiDomainTraining] Failed to load stored vector count:",
          err instanceof Error ? err.message : String(err),
        );
        // Gracefully degrade on error
        setStoredVectorCount(0);
      }
    };

    loadStoredVectors();
  }, []);

  // Poll for session updates every 2 seconds
  useEffect(() => {
    if (!session || !isRunning) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/multi-domain-training/session/${session.id}`,
        );
        if (response.ok) {
          const data = await response.json();
          setSession(data.session);

          // Check if all domains are completed
          const allCompleted = Object.values(data.session.domainStates).every(
            (state: DomainTrainingState) =>
              state.status === "completed" || state.status === "failed",
          );

          if (allCompleted) {
            setIsRunning(false);
          }
        }
      } catch (err) {
        console.error("Failed to poll session status:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [session, isRunning]);

  // Poll for stored vector count updates every 5 seconds during training
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          "/api/multi-domain-training/pinecone/status",
        );

        if (!response.ok) {
          console.warn(
            `[useMultiDomainTraining] Status endpoint returned ${response.status}`,
          );
          return;
        }

        const data = await response.json();
        const count = data.pinecone?.trainingDataVectors?.total ?? 0;

        if (count !== storedVectorCount) {
          console.log(`[useMultiDomainTraining] Updated stored vectors from ${storedVectorCount} to ${count}`);
          setStoredVectorCount(count);
        }
      } catch (err) {
        console.error(
          "[useMultiDomainTraining] Failed to refresh stored vector count:",
          err instanceof Error ? err.message : String(err),
        );
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isRunning, storedVectorCount]);

  const initializeSession = useCallback(async () => {
    setIsInitializing(true);
    setError(null);

    try {
      const response = await fetch("/api/multi-domain-training/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to initialize training session");
      }

      const data = await response.json();
      setSession(data.session);
    } catch (err: any) {
      const errorMsg = err.message || "Failed to initialize session";
      setError(errorMsg);
      console.error("Initialization error:", err);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const startSequentialTraining = useCallback(async () => {
    if (!session) {
      setError("No active session. Initialize first.");
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/multi-domain-training/run-all-sequential",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: session.id }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to start sequential training");
      }

      const data = await response.json();
      console.log("Sequential training started:", data);
      // Session will be updated via polling
    } catch (err: any) {
      const errorMsg = err.message || "Failed to start training";
      setError(errorMsg);
      setIsRunning(false);
      console.error("Training error:", err);
    }
  }, [session]);

  const getSessionStatus = useCallback(
    async (sessionId: string): Promise<MultiDomainTrainingSession | null> => {
      try {
        const response = await fetch(
          `/api/multi-domain-training/session/${sessionId}`,
        );

        if (response.ok) {
          const data = await response.json();
          return data.session;
        }
      } catch (err) {
        console.error("Failed to get session status:", err);
      }

      return null;
    },
    [],
  );

  const getDomainStatus = useCallback(
    (sessionId: string, profileId: string): DomainTrainingState | null => {
      if (!session || session.id !== sessionId) {
        return null;
      }

      return session.domainStates[profileId] || null;
    },
    [session],
  );

  const getProgressPercentage = useCallback(() => {
    return session?.overallProgress || 0;
  }, [session]);

  const getTotalKnowledgeLearned = useCallback(() => {
    const currentSessionKnowledge = session?.totalKnowledgeLearned || 0;
    return currentSessionKnowledge + storedVectorCount;
  }, [session, storedVectorCount]);

  const getCompletedDomains = useCallback(() => {
    if (!session) return 0;

    return Object.values(session.domainStates).filter(
      (state) => state.status === "completed",
    ).length;
  }, [session]);

  const getTotalDomains = useCallback(() => {
    if (!session) return 0;
    return Object.keys(session.domainStates).length;
  }, [session]);

  return {
    session,
    isRunning,
    isInitializing,
    error,
    initializeSession,
    startSequentialTraining,
    getSessionStatus,
    getDomainStatus,
    getProgressPercentage,
    getTotalKnowledgeLearned,
    getCompletedDomains,
    getTotalDomains,
  };
}
