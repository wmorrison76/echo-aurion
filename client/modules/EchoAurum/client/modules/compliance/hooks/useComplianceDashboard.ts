import { useEffect, useState } from "react";
import type { ComplianceDashboard } from "@shared/compliance";
import { fetchWithSession, useSession } from "@/modules/auth";
import { controls } from "../data";
interface ComplianceDashboardState {
  status: "loading" | "ready" | "error" | "unauthenticated";
  data?: ComplianceDashboard;
  message?: string;
}
export function useComplianceDashboard() {
  const { session, status: sessionStatus, sessionError } = useSession();
  const [state, setState] = useState<ComplianceDashboardState>({
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
          "Authenticate with an auditor persona to review compliance evidence dashboards.",
      });
      return () => {
        cancelled = true;
      };
    }
    async function load() {
      setState({ status: "loading" });
      try {
        const response = await fetchWithSession("/api/compliance/dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            controls,
            currentTime: new Date().toISOString(),
          }),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            typeof errorBody?.error === "string"
              ? errorBody.error
              : "Unable to load compliance dashboard.";
          throw new Error(message);
        }
        const payload = (await response.json()) as {
          dashboard: ComplianceDashboard;
        };
        if (!cancelled) {
          setState({ status: "ready", data: payload.dashboard });
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load compliance dashboard.";
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
