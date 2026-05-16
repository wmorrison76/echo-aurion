import { useState, useCallback } from "react";
import { fetchWithLucccaSession } from "../../auth";
import type { GuardianCheckResult } from "../../../../shared/aurum";
export interface GuardianError {
  message: string;
  code?: string;
}
export function useGuardianChecks() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GuardianError | null>(null);
  const clearError = useCallback(() => setError(null), []);
  const getAPGuardianChecks = useCallback(async (invoiceId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithLucccaSession(
        `/api/aurum/ap/invoices/${invoiceId}/guardian-checks`,
      );
      if (!res.ok)
        throw new Error(`Failed to get Guardian checks: ${res.statusText}`);
      const data = await res.json();
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to get Guardian checks";
      setError({ message });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  const runFullAudit = useCallback(async (entityId: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ entityId });
      const res = await fetchWithLucccaSession(
        `/api/aurum/guardian/audit?${params.toString()}`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      if (!res.ok)
        throw new Error(`Failed to run Guardian audit: ${res.statusText}`);
      const data = await res.json();
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to run Guardian audit";
      setError({ message });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  return { loading, error, clearError, getAPGuardianChecks, runFullAudit };
}
