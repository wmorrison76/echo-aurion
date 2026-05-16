import { useEffect, useState } from "react";
import type { BudgetAnalysis } from "../../../../shared/budget";
import { fetchWithSession, useSession } from "@/modules/auth";
interface BudgetAnalysisState {
  status: "loading" | "ready" | "error" | "unauthenticated";
  data?: BudgetAnalysis;
  message?: string;
}
export function useBudgetAnalysis() {
  const { session, status: sessionStatus, sessionError } = useSession();
  const [state, setState] = useState<BudgetAnalysisState>({
    status: "loading",
  });
  useEffect(() => {
    let cancelled = false;
    if (sessionStatus === "loading") {
      setState({ status: "loading" });
      return () => {
        cancelled = true;
      };
    }
    if (sessionStatus === "error") {
      setState({
        status: "error",
        message: sessionError ?? "Unable to resolve session.",
      });
      return () => {
        cancelled = true;
      };
    }
    if (!session) {
      setState({
        status: "unauthenticated",
        message:
          "Authenticate with a controller persona to view budget analysis.",
      });
      return () => {
        cancelled = true;
      };
    }
    async function load() {
      setState({ status: "loading" });
      try {
        const response = await fetchWithSession("/api/budget/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            typeof errorBody?.error === "string"
              ? errorBody.error
              : "Unable to load budget analysis.";
          throw new Error(message);
        }
        const payload = (await response.json()) as { analysis: BudgetAnalysis };
        if (!cancelled) {
          setState({ status: "ready", data: payload.analysis });
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load budget analysis.";
          setState({ status: "error", message });
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session, sessionStatus, sessionError]);
  return state;
}
