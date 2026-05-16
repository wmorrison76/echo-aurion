import { useEffect, useState } from "react";
import type { ComplianceAutomationPlan } from "@shared/complianceAutomation";
import { fetchWithSession, useSession } from "@/modules/auth";
import { automationTelemetry, complianceIncidents } from "../data/automation";
import { controls } from "../data";
interface ComplianceAutomationState {
  status: "loading" | "ready" | "error" | "unauthenticated";
  data?: ComplianceAutomationPlan;
  message?: string;
}
export function useComplianceAutomationPlan() {
  const { session, status: sessionStatus, sessionError } = useSession();
  const [state, setState] = useState<ComplianceAutomationState>({
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
          "Authenticate with a controller persona to orchestrate compliance automations.",
      });
      return () => {
        cancelled = true;
      };
    }
    async function load() {
      setState({ status: "loading" });
      try {
        const response = await fetchWithSession("/api/compliance/automation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            controls,
            telemetry: automationTelemetry,
            incidents: complianceIncidents,
            currentTime: new Date().toISOString(),
          }),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            typeof errorBody?.error === "string"
              ? errorBody.error
              : "Unable to load compliance automations.";
          throw new Error(message);
        }
        const payload = (await response.json()) as {
          plan: ComplianceAutomationPlan;
        };
        if (!cancelled) {
          setState({ status: "ready", data: payload.plan });
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load compliance automations.";
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
