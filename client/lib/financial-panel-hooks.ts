/**
 * Financial Panel Hooks
 * React hooks for fetching and subscribing to financial data
 * Manages WebSocket subscriptions, caching, and real-time updates
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { financialEventBus } from "./financial-event-bus";
import { logger } from "./logger";
import { get as apiGet } from "./api-client";

/**
 * Financial health data structure
 */
export interface FinancialHealth {
  grade: "A" | "B" | "C" | "D" | "F";
  score: number;
  revenue: number;
  cogs_percentage: number;
  labor_percentage: number;
  net_margin: number;
  trend: "improving" | "stable" | "declining";
  last_updated: number;
  risks: string[];
}

/**
 * P&L data structure
 */
export interface PayrollDataBreakdown {
  payroll_run_id: string | null;
  wages: number;
  taxes: number;
  benefits: number;
  deductions: number;
  employee_count: number | null;
  total: number;
  source: "payroll" | "scheduled";
  scheduled_labor_cost: number;
}

export interface PnLData {
  outlet_id: string;
  period: string;
  revenue: number;
  cogs: number;
  cogs_percentage: number;
  labor_cost: number;
  labor_percentage: number;
  overhead_cost: number;
  overhead_percentage: number;
  net_profit: number;
  net_margin: number;
  health_grade?: FinancialHealth;
  last_updated: number;
  payroll_data?: PayrollDataBreakdown;
}

/**
 * Hook for fetching and subscribing to financial health
 * Auto-updates when WebSocket broadcasts changes
 */
export function useFinancialHealth(
  outletId?: string,
  period?: string,
): {
  health: FinancialHealth | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [health, setHealth] = useState<FinancialHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<() => void | null>(null);

  // Derive current period if not provided
  const currentPeriod =
    period ||
    (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })();

  const fetchHealth = useCallback(async () => {
    if (!outletId) {
      setError("Outlet ID required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        outlet_id: outletId,
        period: currentPeriod,
      });

      const data = await apiGet<FinancialHealth>(
        `/api/dashboard/financial/health?${params}`,
      );
      setHealth(data);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to fetch health";
      if (
        errorMsg.includes("Network unavailable") ||
        errorMsg.includes("Request failed: 503") ||
        errorMsg.includes("Failed to fetch")
      ) {
        setHealth(null);
        setError(null);
        return;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [outletId, currentPeriod]);

  // Initial fetch
  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Subscribe to financial events for real-time updates
  useEffect(() => {
    if (!outletId) return;

    const unsubscribe = financialEventBus.onAll((event) => {
      if (event.outlet_id === outletId) {
        // Refetch health on any financial event
        fetchHealth();
      }
    });

    subscriptionRef.current = unsubscribe;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
      }
    };
  }, [outletId, fetchHealth]);

  return {
    health,
    loading,
    error,
    refetch: fetchHealth,
  };
}

/**
 * Hook for fetching detailed P&L data
 */
export function useOutletPnL(
  outletId?: string,
  period?: string,
  includePayroll: boolean = false,
): {
  pnl: PnLData | null;
  loading: boolean;
  error: string | null;
  payrollAccessDenied: boolean;
  refetch: () => Promise<void>;
} {
  const [pnl, setPnL] = useState<PnLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payrollAccessDenied, setPayrollAccessDenied] = useState(false);

  const currentPeriod =
    period ||
    (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })();

  const fetchPnL = useCallback(async () => {
    if (!outletId) {
      setError("Outlet ID required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        outlet_id: outletId,
        period: currentPeriod,
      });

      if (includePayroll) {
        params.set("include_payroll", "true");
      }

      try {
        const data = await apiGet<PnLData>(`/api/dashboard/financial/pnl?${params}`,
          includePayroll
            ? { headers: { "x-payroll-verified": "true" } }
            : undefined,
        );
        setPayrollAccessDenied(false);
        setPnL(data);
      } catch (primaryError) {
        if (includePayroll) {
          const fallbackParams = new URLSearchParams({
            outlet_id: outletId,
            period: currentPeriod,
          });

          const fallback = await apiGet<PnLData>(
            `/api/dashboard/financial/pnl?${fallbackParams}`,
          );

          setPayrollAccessDenied(true);
          setPnL(fallback);
          setError(null);
          return;
        }

        throw primaryError;
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to fetch P&L";
      if (
        errorMsg.includes("Network unavailable") ||
        errorMsg.includes("Request failed: 503") ||
        errorMsg.includes("Failed to fetch")
      ) {
        setPnL(null);
        setError(null);
        return;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [outletId, currentPeriod, includePayroll]);

  useEffect(() => {
    fetchPnL();
  }, [fetchPnL]);

  return {
    pnl,
    loading,
    error,
    payrollAccessDenied,
    refetch: fetchPnL,
  };
}

/**
 * Hook for fetching list of accessible outlets
 */
export function useUserOutlets(): {
  outlets: Array<{ id: string; name: string }>;
  loading: boolean;
  error: string | null;
} {
  const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiGet<{
          outlets: Array<{ id: string; name: string }>;
        }>("/api/dashboard/financial/available-outlets");
        setOutlets(response.outlets || []);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to fetch outlets";
        if (
          errorMsg.includes("Network unavailable") ||
          errorMsg.includes("Request failed: 503") ||
          errorMsg.includes("Failed to fetch")
        ) {
          setOutlets([]);
          setError(null);
          return;
        }
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchOutlets();
  }, []);

  return {
    outlets,
    loading,
    error,
  };
}

/**
 * Hook for consolidated P&L across multiple outlets
 */
export function useConsolidatedPnL(
  outletIds: string[],
  period?: string,
): {
  pnl: PnLData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [pnl, setPnL] = useState<PnLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentPeriod =
    period ||
    (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })();

  const fetchConsolidated = useCallback(async () => {
    if (outletIds.length === 0) {
      setError("At least one outlet required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        outlets: outletIds.join(","),
        period: currentPeriod,
      });

      const data = await apiGet<PnLData>(
        `/api/dashboard/financial/pnl-consolidated?${params}`,
      );
      setPnL(data);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to fetch consolidated P&L";
      if (
        errorMsg.includes("Network unavailable") ||
        errorMsg.includes("Request failed: 503") ||
        errorMsg.includes("Failed to fetch")
      ) {
        setPnL(null);
        setError(null);
        return;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [outletIds, currentPeriod]);

  useEffect(() => {
    fetchConsolidated();
  }, [fetchConsolidated]);

  return {
    pnl,
    loading,
    error,
    refetch: fetchConsolidated,
  };
}

/**
 * Hook to check if payroll access session is verified
 */
export function usePayrollAccessVerification(): {
  isVerified: boolean;
  setVerified: (verified: boolean) => void;
  remainingTime: number; // seconds
} {
  const [isVerified, setIsVerified] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  const checkVerification = useCallback(() => {
    const stored = sessionStorage.getItem("payroll_verified");
    if (!stored) {
      setIsVerified(false);
      return;
    }

    try {
      const data = JSON.parse(stored);
      const now = Date.now();
      const remaining = data.expires - now;

      if (remaining > 0) {
        setIsVerified(true);
        setRemainingTime(Math.floor(remaining / 1000));
      } else {
        setIsVerified(false);
        sessionStorage.removeItem("payroll_verified");
      }
    } catch (error) {
      setIsVerified(false);
    }
  }, []);

  useEffect(() => {
    checkVerification();

    const interval = setInterval(() => {
      checkVerification();
    }, 1000);

    return () => clearInterval(interval);
  }, [checkVerification]);

  const setVerified = useCallback(
    (verified: boolean) => {
      if (verified) {
        sessionStorage.setItem(
          "payroll_verified",
          JSON.stringify({
            verified: true,
            timestamp: Date.now(),
            expires: Date.now() + 15 * 60 * 1000,
          }),
        );
      } else {
        sessionStorage.removeItem("payroll_verified");
      }
      checkVerification();
    },
    [checkVerification],
  );

  return {
    isVerified,
    setVerified,
    remainingTime,
  };
}
