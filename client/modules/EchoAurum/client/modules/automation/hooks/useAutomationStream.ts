import { useEffect, useState } from "react";
import type { AutomationFeedResult } from "@shared/automation";
import { fetchWithSession, useSession } from "@/modules/auth";
import { operaCharges, toastChecks, vendorTriads } from "../data";
interface AutomationStreamState {
  status: "loading" | "ready" | "error" | "unauthenticated";
  data?: AutomationFeedResult;
  message?: string;
}
export function useAutomationStream() {
  const { session, status: sessionStatus, sessionError } = useSession();
  const [state, setState] = useState<AutomationStreamState>({
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
          "Authenticate with a controller persona to stream automation telemetry.",
      });
      return () => {
        cancelled = true;
      };
    }
    async function load() {
      setState({ status: "loading" });
      try {
        const response = await fetchWithSession("/api/automation/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ledgerId: "ledger-luccca",
            vendorTriads,
            operaCharges,
            toastChecks,
          }),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            typeof errorBody?.error === "string"
              ? errorBody.error
              : "Unable to load automation stream.";
          throw new Error(message);
        }
        const payload = (await response.json()) as {
          feed: AutomationFeedResult;
        };
        if (!cancelled) {
          setState({ status: "ready", data: payload.feed });
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load automation stream.";
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
