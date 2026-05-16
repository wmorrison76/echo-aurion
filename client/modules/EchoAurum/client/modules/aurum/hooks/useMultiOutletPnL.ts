import { useState, useCallback, useEffect } from "react";
import type { Outlet, ConsolidatedPnL, OutletPnLReport } from "@shared/outlets";
interface MultiOutletPnLState {
  status: "idle" | "loading" | "ready" | "error";
  outlets: Outlet[] | null;
  consolidated: ConsolidatedPnL | null;
  error: string | null;
}
export function useMultiOutletPnL(year: number = 2024) {
  const [state, setState] = useState<MultiOutletPnLState>({
    status: "idle",
    outlets: null,
    consolidated: null,
    error: null,
  });
  const loadOutlets = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "loading" }));
    try {
      const response = await fetch("/api/outlets");
      if (response.ok) {
        const data = await response.json();
        setState((prev) => ({
          ...prev,
          outlets: data.outlets,
          status: "ready",
        }));
        return data.outlets;
      } else {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: "Failed to load outlets",
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, []);
  const loadConsolidatedPnL = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "loading" }));
    try {
      const response = await fetch(
        `/api/outlets/consolidated/pnl?year=${year}`,
      );
      if (response.ok) {
        const data = await response.json();
        setState((prev) => ({
          ...prev,
          consolidated: data.consolidated,
          status: "ready",
        }));
        return data.consolidated;
      } else {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: "Failed to load P&L data",
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, [year]);
  const loadOutletPnL = useCallback(
    async (outletId: string): Promise<OutletPnLReport | null> => {
      try {
        const response = await fetch(
          `/api/outlets/${outletId}/pnl-report?year=${year}`,
        );
        if (response.ok) {
          const data = await response.json();
          return data.report;
        }
        return null;
      } catch (error) {
        console.error("Failed to load outlet P&L:", error);
        return null;
      }
    },
    [year],
  );
  useEffect(() => {
    loadConsolidatedPnL();
  }, [year, loadConsolidatedPnL]);
  return { ...state, loadOutlets, loadConsolidatedPnL, loadOutletPnL };
}
