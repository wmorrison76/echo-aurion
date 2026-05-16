import { useState, useCallback } from "react";
import { fetchWithLucccaSession } from "../../auth";
import type { APInvoice } from "../../../../shared/aurum";
export interface APError {
  message: string;
  code?: string;
}
export function useAPOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<APError | null>(null);
  const clearError = useCallback(() => setError(null), []);
  const listInvoices = useCallback(
    async (
      entityId: string,
      filters?: { status?: string; matchStatus?: string },
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ entityId });
        if (filters?.status) params.append("status", filters.status);
        if (filters?.matchStatus)
          params.append("matchStatus", filters.matchStatus);
        const res = await fetchWithLucccaSession(
          `/api/aurum/ap/invoices?${params.toString()}`,
        );
        if (!res.ok)
          throw new Error(`Failed to list invoices: ${res.statusText}`);
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to list invoices";
        setError({ message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const getInvoice = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithLucccaSession(`/api/aurum/ap/invoices/${id}`);
      if (!res.ok) throw new Error(`Failed to get invoice: ${res.statusText}`);
      const data = await res.json();
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to get invoice";
      setError({ message });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  const createInvoice = useCallback(
    async (invoiceData: Omit<APInvoice, "id" | "createdAt" | "updatedAt">) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithLucccaSession("/api/aurum/ap/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invoiceData),
        });
        if (!res.ok)
          throw new Error(`Failed to create invoice: ${res.statusText}`);
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create invoice";
        setError({ message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const matchInvoice = useCallback(
    async (
      invoiceId: string,
      poNumber?: string,
      receiptNumber?: string,
      tolerance?: number,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithLucccaSession(
          `/api/aurum/ap/invoices/${invoiceId}/match`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              poNumber,
              receiptNumber,
              tolerancePercentage: tolerance,
            }),
          },
        );
        if (!res.ok)
          throw new Error(`Failed to match invoice: ${res.statusText}`);
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to match invoice";
        setError({ message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const approveInvoice = useCallback(
    async (invoiceId: string, approvedBy: string, notes?: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithLucccaSession(
          `/api/aurum/ap/invoices/${invoiceId}/approve`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ approvedBy, notes }),
          },
        );
        if (!res.ok)
          throw new Error(`Failed to approve invoice: ${res.statusText}`);
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to approve invoice";
        setError({ message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const rejectInvoice = useCallback(
    async (invoiceId: string, rejectedBy: string, reason: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithLucccaSession(
          `/api/aurum/ap/invoices/${invoiceId}/reject`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rejectedBy, reason }),
          },
        );
        if (!res.ok)
          throw new Error(`Failed to reject invoice: ${res.statusText}`);
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to reject invoice";
        setError({ message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const getAPSummary = useCallback(
    async (entityId: string, periodDate?: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ entityId });
        if (periodDate) params.append("periodDate", periodDate);
        const res = await fetchWithLucccaSession(
          `/api/aurum/ap/summary?${params.toString()}`,
        );
        if (!res.ok)
          throw new Error(`Failed to get AP summary: ${res.statusText}`);
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to get AP summary";
        setError({ message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const getAPAgingReport = useCallback(
    async (entityId: string, asOfDate?: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ entityId });
        if (asOfDate) params.append("asOfDate", asOfDate);
        const res = await fetchWithLucccaSession(
          `/api/aurum/ap/aging-report?${params.toString()}`,
        );
        if (!res.ok)
          throw new Error(`Failed to get aging report: ${res.statusText}`);
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to get aging report";
        setError({ message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  return {
    loading,
    error,
    clearError,
    listInvoices,
    getInvoice,
    createInvoice,
    matchInvoice,
    approveInvoice,
    rejectInvoice,
    getAPSummary,
    getAPAgingReport,
  };
}
