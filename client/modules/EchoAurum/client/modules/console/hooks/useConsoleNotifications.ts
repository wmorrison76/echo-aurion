import { useEffect, useState } from "react";
import type { ConsoleNotification } from "@shared/notifications";
import { fetchWithLucccaSession, useSession } from "../../auth";
interface NotificationsState {
  status: "loading" | "ready" | "error" | "unauthenticated";
  data?: ConsoleNotification[];
  message?: string;
}
export function useConsoleNotifications() {
  const { session, status: sessionStatus, sessionError } = useSession();
  const [state, setState] = useState<NotificationsState>({ status: "loading" });
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
        message: "Authenticate to view live console notifications.",
      });
      return () => {
        cancelled = true;
      };
    }
    async function load() {
      setState({ status: "loading" });
      try {
        const response = await fetchWithLucccaSession(
          "/api/console/notifications",
          { method: "POST" },
        );
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            typeof errorBody?.error === "string"
              ? errorBody.error
              : "Unable to load console notifications.";
          throw new Error(message);
        }
        const payload = (await response.json()) as {
          notifications: ConsoleNotification[];
        };
        if (!cancelled) {
          setState({ status: "ready", data: payload.notifications });
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load console notifications.";
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
