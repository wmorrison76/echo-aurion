import { useEffect, useState } from "react";
import type { OutletPnlReport } from "../../../../shared/pnl";
import { fetchWithSession, useSession } from "@/modules/auth";
import { ledgerEntries, outlets, payments, period, schedules } from "../data";
interface OutletPnlState {
  status: "loading" | "ready" | "error" | "unauthenticated";
  data?: OutletPnlReport;
  message?: string;
}
export function useOutletPnl() {
  const { session, status: sessionStatus, sessionError } = useSession();
  const [state, setState] = useState<OutletPnlState>({ status: "loading" });
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
          "Authenticate with a controller persona to run outlet-level P&L.",
      });
      return () => {
        cancelled = true;
      };
    }
    async function load() {
      setState({ status: "loading" });
      try {
        const response = await fetchWithSession("/api/pnl/outlet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            period,
            outlets,
            ledgerEntries,
            schedules,
            payments,
          }),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            typeof errorBody?.error === "string"
              ? errorBody.error
              : "Unable to load outlet P&L.";
          throw new Error(message);
        }
        const payload = (await response.json()) as { report: OutletPnlReport };
        if (!cancelled) {
          setState({ status: "ready", data: payload.report });
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load outlet P&L.";
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
