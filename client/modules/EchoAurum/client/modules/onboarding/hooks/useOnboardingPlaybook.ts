import { useEffect, useState } from "react";
import type { OnboardingPlaybookSummary } from "@shared/onboarding";
import { fetchWithSession, useSession } from "@/modules/auth";
import { phases } from "../data";
interface OnboardingPlaybookState {
  status: "loading" | "ready" | "error" | "unauthenticated";
  data?: OnboardingPlaybookSummary;
  message?: string;
}
export function useOnboardingPlaybook() {
  const { session, status: sessionStatus, sessionError } = useSession();
  const [state, setState] = useState<OnboardingPlaybookState>({
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
          "Authenticate with a controller persona to view onboarding playbook telemetry.",
      });
      return () => {
        cancelled = true;
      };
    }
    async function load() {
      setState({ status: "loading" });
      try {
        const response = await fetchWithSession("/api/onboarding/playbook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phases }),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            typeof errorBody?.error === "string"
              ? errorBody.error
              : "Unable to load onboarding playbook.";
          throw new Error(message);
        }
        const payload = (await response.json()) as {
          playbook: OnboardingPlaybookSummary;
        };
        if (!cancelled) {
          setState({ status: "ready", data: payload.playbook });
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load onboarding playbook.";
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
