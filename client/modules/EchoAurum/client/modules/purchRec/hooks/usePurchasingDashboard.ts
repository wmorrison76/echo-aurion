import { useEffect, useState } from "react";
import type {
  PurchasingDashboard,
  PurchasingSnapshot,
} from "@shared/purchasing";
import { fetchWithLucccaSession, useSession } from "../../auth";
import { formatCurrency } from "../services/metrics";
type PurchasingSnapshotView = PurchasingSnapshot & {
  varianceText: string;
  openOrdersText: string;
  awaitingReceivingText: string;
  spendText: string;
};
type PurchasingDashboardView = {
  snapshot: PurchasingSnapshotView;
  orders: PurchasingDashboard["orders"];
  grouped: PurchasingDashboard["grouped"];
  aging: PurchasingDashboard["aging"];
  vendorSpend: PurchasingDashboard["vendorSpend"];
  vendorSummary: PurchasingDashboard["vendorSummary"];
  variances: PurchasingDashboard["variances"];
  timeline: PurchasingDashboard["timeline"];
};
interface PurchasingDashboardState {
  status: "loading" | "ready" | "error" | "unauthenticated";
  data?: PurchasingDashboardView;
  message?: string;
}
export function usePurchasingDashboard() {
  const { session, status: sessionStatus, sessionError } = useSession();
  const [state, setState] = useState<PurchasingDashboardState>({
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
          "Authenticate with a controller persona to access purchasing intelligence.",
      });
      return () => {
        cancelled = true;
      };
    }
    async function load() {
      setState({ status: "loading" });
      try {
        const response = await fetchWithLucccaSession(
          "/api/purchasing/dashboard",
          { method: "POST" },
        );
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            typeof errorBody?.error === "string"
              ? errorBody.error
              : "Unable to load purchasing dashboard.";
          throw new Error(message);
        }
        const payload = (await response.json()) as {
          dashboard: PurchasingDashboard;
        };
        if (cancelled) {
          return;
        }
        const view = transformPurchasingDashboard(payload.dashboard);
        setState({ status: "ready", data: view });
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load purchasing dashboard.";
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
function transformPurchasingDashboard(
  dashboard: PurchasingDashboard,
): PurchasingDashboardView {
  const snapshotView: PurchasingSnapshotView = {
    ...dashboard.snapshot,
    varianceText: `${Math.round(dashboard.snapshot.varianceRate * 100)}% of open POs with variances`,
    openOrdersText: `${dashboard.snapshot.openOrders} open orders`,
    awaitingReceivingText: `${dashboard.snapshot.awaitingReceiving} awaiting receiving`,
    spendText: formatCurrency(dashboard.snapshot.monthlySpend),
  };
  return {
    snapshot: snapshotView,
    orders: dashboard.orders,
    grouped: dashboard.grouped,
    aging: dashboard.aging,
    vendorSpend: dashboard.vendorSpend,
    vendorSummary: dashboard.vendorSummary,
    variances: dashboard.variances,
    timeline: dashboard.timeline,
  };
}
