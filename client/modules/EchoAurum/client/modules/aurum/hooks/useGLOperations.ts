import { useState, useCallback } from "react";
import type { JournalEntry, JournalLine } from "@shared/aurum";
export interface GLError {
  message: string;
  code?: string;
}
export function useGLOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GLError | null>(null);
  const clearError = useCallback(() => setError(null), []);
  const createJournalEntry = useCallback(
    async (entryData: {
      entityId: string;
      periodDate: string;
      source: string;
      referenceId?: string;
      description?: string;
      lines: Array<{
        accountCode: string;
        debitAmount?: number;
        creditAmount?: number;
        memo?: string;
      }>;
      createdBy: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/aurum/journal-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entryData),
        });
        if (!res.ok)
          throw new Error(`Failed to create journal entry: ${res.statusText}`);
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create journal entry";
        setError({ message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const postJournalEntry = useCallback(
    async (id: string, approvedBy: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/aurum/journal-entries/${id}/post`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approvedBy }),
        });
        if (!res.ok)
          throw new Error(`Failed to post journal entry: ${res.statusText}`);
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to post journal entry";
        setError({ message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const reverseJournalEntry = useCallback(
    async (id: string, reason: string, reversedBy: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/aurum/journal-entries/${id}/reverse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason, reversedBy }),
        });
        if (!res.ok)
          throw new Error(`Failed to reverse journal entry: ${res.statusText}`);
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to reverse journal entry";
        setError({ message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const getTrialBalance = useCallback(
    async (entityId: string, periodDate: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ entityId, periodDate });
        const res = await fetch(
          `/api/aurum/trial-balance?${params.toString()}`,
        );
        if (!res.ok)
          throw new Error(`Failed to get trial balance: ${res.statusText}`);
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to get trial balance";
        setError({ message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const getGeneralLedger = useCallback(
    async (
      entityId: string,
      accountCode: string,
      startDate: string,
      endDate: string,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ entityId, startDate, endDate });
        const res = await fetch(
          `/api/aurum/general-ledger/${accountCode}?${params.toString()}`,
        );
        if (!res.ok)
          throw new Error(`Failed to get general ledger: ${res.statusText}`);
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to get general ledger";
        setError({ message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const createReconciliation = useCallback(
    async (reconciliationData: {
      type: string;
      entityId: string;
      accountCode: string;
      periodDate: string;
      systemBalance: number;
      externalBalance: number;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/aurum/reconciliations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reconciliationData),
        });
        if (!res.ok)
          throw new Error(`Failed to create reconciliation: ${res.statusText}`);
        const data = await res.json();
        return data;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to create reconciliation";
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
    createJournalEntry,
    postJournalEntry,
    reverseJournalEntry,
    getTrialBalance,
    getGeneralLedger,
    createReconciliation,
  };
}
