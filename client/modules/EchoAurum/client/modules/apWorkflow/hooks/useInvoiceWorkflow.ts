import { useEffect, useState } from "react";
import type { InvoiceWorkflowResult } from "@shared/invoiceWorkflow";
import { fetchWithLucccaSession, useSession } from "../../auth";
import { invoiceWorkflowSeed } from "../data";
interface InvoiceWorkflowState {
  status: "loading" | "ready" | "error" | "unauthenticated";
  data?: InvoiceWorkflowResult;
  message?: string;
}
export function useInvoiceWorkflow() {
  const { session, status: sessionStatus, sessionError } = useSession();
  const [state, setState] = useState<InvoiceWorkflowState>({
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
          "Authenticate with a controller persona to run the invoice workflow.",
      });
      return () => {
        cancelled = true;
      };
    }
    async function load() {
      setState({ status: "loading" });
      try {
        const response = await fetchWithLucccaSession("/api/ap/workflow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invoiceWorkflowSeed),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            typeof errorBody?.error === "string"
              ? errorBody.error
              : "Unable to load invoice workflow.";
          throw new Error(message);
        }
        const payload = (await response.json()) as {
          workflow: InvoiceWorkflowResult;
        };
        if (!cancelled) {
          setState({ status: "ready", data: payload.workflow });
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load invoice workflow.";
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
