import { useCallback, useState, useEffect } from "react";

interface IngestionProgress {
  totalTerms: number;
  processedTerms: number;
  supabaseSuccess: number;
  supabaseErrors: number;
  pineconeSuccess: number;
  pineconeErrors: number;
  overallProgress: number;
  currentPhase: "fetching" | "embedding" | "supabase" | "pinecone" | "complete";
  message: string;
  errors: string[];
  startTime: number;
  estimatedTimeRemaining: number;
}

interface IngestionStatus {
  status: "idle" | "in_progress";
  progress?: IngestionProgress;
  error?: string;
}

export function useTermsIngestion() {
  const [status, setStatus] = useState<IngestionStatus>({ status: "idle" });
  const [isPolling, setIsPolling] = useState(false);

  // Check terms count
  const getTermsCount = useCallback(async () => {
    try {
      const response = await fetch("/api/terms/count");

      if (!response.ok) {
        console.error(
          "[TermsIngestion] Terms count fetch failed:",
          response.status,
          response.statusText,
        );
        return 0;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error(
          "[TermsIngestion] Terms count response is not JSON:",
          contentType,
        );
        return 0;
      }

      const data = await response.json();
      return data.success ? data.totalTerms : 0;
    } catch (error) {
      console.error("[TermsIngestion] Error fetching terms count:", error);
      return 0;
    }
  }, []);

  // Start ingestion
  const startIngestion = useCallback(async () => {
    try {
      const response = await fetch("/api/terms/ingest/start", {
        method: "POST",
      });

      if (!response.ok) {
        console.error(
          "[TermsIngestion] Start ingestion failed:",
          response.status,
          response.statusText,
        );
        setStatus({
          status: "idle",
          error: `HTTP ${response.status}: Failed to start ingestion`,
        });
        return false;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error(
          "[TermsIngestion] Start ingestion response is not JSON:",
          contentType,
        );
        setStatus({
          status: "idle",
          error: "Server returned invalid response format",
        });
        return false;
      }

      const data = await response.json();

      if (!data.success) {
        setStatus({
          status: "idle",
          error: data.error || "Failed to start ingestion",
        });
        return false;
      }

      setStatus({ status: "in_progress" });
      setIsPolling(true);
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[TermsIngestion] Error starting ingestion:", error);
      setStatus({
        status: "idle",
        error: errorMsg,
      });
      return false;
    }
  }, []);

  // Poll for progress
  useEffect(() => {
    if (!isPolling) return;

    const poll = async () => {
      try {
        const response = await fetch("/api/terms/ingestion/progress");

        if (!response.ok) {
          console.error(
            "[TermsIngestion] Progress polling failed:",
            response.status,
            response.statusText,
          );
          setIsPolling(false);
          return;
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error(
            "[TermsIngestion] Progress response is not JSON:",
            contentType,
          );
          setIsPolling(false);
          return;
        }

        const data = await response.json();

        setStatus(data);

        if (
          data.status === "in_progress" &&
          data.progress?.currentPhase === "complete"
        ) {
          setIsPolling(false);
        } else if (data.status === "idle") {
          setIsPolling(false);
        }
      } catch (error) {
        console.error("[TermsIngestion] Error polling progress:", error);
      }
    };

    const interval = setInterval(poll, 1000);

    return () => clearInterval(interval);
  }, [isPolling]);

  // Auto-start ingestion if terms were just uploaded
  const autoStartIfTermsAvailable = useCallback(async () => {
    const count = await getTermsCount();
    if (count > 0) {
      return await startIngestion();
    }
    return false;
  }, [getTermsCount, startIngestion]);

  return {
    status,
    isPolling,
    getTermsCount,
    startIngestion,
    autoStartIfTermsAvailable,
  };
}
