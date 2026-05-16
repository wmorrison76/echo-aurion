import { useEffect, useState } from "react";
import type { VarianceInsightResult } from "@shared/varianceInsights";
import { fetchWithLucccaSession, useSession } from "../../auth";
import { observations } from "../data";
interface VarianceInsightsState {
  status: "loading" | "ready" | "error" | "unauthenticated";
  data?: VarianceInsightResult;
  message?: string;
}
export function useVarianceInsights() {
  const { session, status: sessionStatus, sessionError } = useSession();
  const [state, setState] = useState<VarianceInsightsState>({
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
          "Authenticate with an auditor persona to analyze variance insights.",
      });
      return () => {
        cancelled = true;
      };
    }
    async function load() {
      setState({ status: "loading" });
      try {
        const response = await fetchWithLucccaSession(
          "/api/insights/variance",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ observations }),
          },
        );
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            typeof errorBody?.error === "string"
              ? errorBody.error
              : "Unable to load variance insights.";
          throw new Error(message);
        }
        const payload = (await response.json()) as {
          insights: VarianceInsightResult;
        };
        if (!cancelled) {
          setState({ status: "ready", data: payload.insights });
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load variance insights.";
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
