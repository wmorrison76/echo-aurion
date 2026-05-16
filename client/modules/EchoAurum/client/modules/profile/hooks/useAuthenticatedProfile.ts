import { useEffect, useState } from "react";
import type { AuthenticatedProfile } from "@shared/profile";
import { fetchWithSession, useSession } from "@/modules/auth";
import {
  profileAutomations,
  profileConnectors,
  profileControls,
  profileCurrentTime,
  profileSessions,
  profileTimeline,
  profileUser,
} from "../data";
interface AuthenticatedProfileState {
  status: "loading" | "ready" | "error";
  data?: AuthenticatedProfile;
  message?: string;
}
export function useAuthenticatedProfile() {
  const { session, status: sessionStatus, sessionError } = useSession();
  const [state, setState] = useState<AuthenticatedProfileState>({
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
        message: sessionError ?? "Unable to resolve authenticated session.",
      });
      return () => {
        cancelled = true;
      };
    }
    if (!session) {
      setState({
        status: "error",
        message:
          "Authenticate with a LUCCCA persona to load profile telemetry.",
      });
      return () => {
        cancelled = true;
      };
    }
    async function load() {
      setState({ status: "loading" });
      try {
        const response = await fetchWithSession("/api/profile/authenticated", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user: profileUser,
            sessions: profileSessions,
            connectors: profileConnectors,
            automations: profileAutomations,
            timeline: profileTimeline,
            controls: profileControls,
            currentTime: profileCurrentTime,
          }),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            typeof errorBody?.error === "string"
              ? errorBody.error
              : "Unable to load authenticated profile.";
          throw new Error(message);
        }
        const payload = (await response.json()) as {
          profile: AuthenticatedProfile;
        };
        if (!cancelled) {
          setState({ status: "ready", data: payload.profile });
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load authenticated profile.";
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
