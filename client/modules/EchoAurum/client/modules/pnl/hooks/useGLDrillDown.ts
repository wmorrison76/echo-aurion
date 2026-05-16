import { useEffect, useState } from "react";
import type { GLDrillDownContext } from "../../../../shared/gl";
import { fetchWithSession, useSession } from "@/modules/auth";
interface GLDrillDownState {
  status: "loading" | "ready" | "error" | "unauthenticated";
  data?: GLDrillDownContext;
  message?: string;
}
export function useGLDrillDown(accountCode: string | null) {
  const { session, status: sessionStatus, sessionError } = useSession();
  const [state, setState] = useState<GLDrillDownState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    if (!accountCode) {
      setState({ status: "loading" });
      return () => {
        cancelled = true;
      };
    }
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
        message: "Authenticate to drill into GL codes.",
      });
      return () => {
        cancelled = true;
      };
    }
    async function load() {
      setState({ status: "loading" });
      try {
        const response = await fetchWithSession("/api/gl/drilldown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountCode }),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            typeof errorBody?.error === "string"
              ? errorBody.error
              : "Unable to load GL drill-down.";
          throw new Error(message);
        }
        const payload = (await response.json()) as {
          drillDown: GLDrillDownContext;
        };
        if (!cancelled) {
          setState({ status: "ready", data: payload.drillDown });
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load GL drill-down.";
          setState({ status: "error", message });
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [accountCode, session, sessionStatus, sessionError]);
  return state;
}
