import { useEffect, useState } from "react";
import type { MigrationToolkitReport } from "@shared/migration";
import { fetchWithSession, useSession } from "@/modules/auth";
import { exportsData } from "../data";
interface MigrationToolkitState {
  status: "loading" | "ready" | "error" | "unauthenticated";
  data?: MigrationToolkitReport;
  message?: string;
}
export function useMigrationToolkit() {
  const { session, status: sessionStatus, sessionError } = useSession();
  const [state, setState] = useState<MigrationToolkitState>({
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
          "Authenticate with an auditor persona to review migration toolkit readiness.",
      });
      return () => {
        cancelled = true;
      };
    }
    async function load() {
      setState({ status: "loading" });
      try {
        const response = await fetchWithSession("/api/migration/toolkit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exports: exportsData }),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            typeof errorBody?.error === "string"
              ? errorBody.error
              : "Unable to load migration toolkit.";
          throw new Error(message);
        }
        const payload = (await response.json()) as {
          toolkit: MigrationToolkitReport;
        };
        if (!cancelled) {
          setState({ status: "ready", data: payload.toolkit });
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load migration toolkit.";
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
