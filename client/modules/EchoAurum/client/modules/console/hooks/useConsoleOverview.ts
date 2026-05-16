import { useEffect, useState } from "react";
import type { ConsoleOverview } from "../../../../shared/console";
import { fetchWithLucccaSession, useSession } from "../../auth";
interface ConsoleOverviewState {
  status: "loading" | "ready" | "error" | "unauthenticated";
  data?: ConsoleOverview;
  message?: string;
}
export function useConsoleOverview() {
  const { session, status: sessionStatus, sessionError } = useSession();
  const [state, setState] = useState<ConsoleOverviewState>({
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
        message: "Authenticate to activate finance console intelligence feeds.",
      });
      return () => {
        cancelled = true;
      };
    }
    async function load() {
      setState({ status: "loading" });
      try {
        const response = await fetchWithLucccaSession("/api/console/overview", {
          method: "POST",
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            typeof errorBody?.error === "string"
              ? errorBody.error
              : "Unable to load console overview.";
          throw new Error(message);
        }
        const payload = (await response.json()) as {
          overview: ConsoleOverview;
        };
        if (cancelled) {
          return;
        }
        setState({ status: "ready", data: payload.overview });
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load console overview.";
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
