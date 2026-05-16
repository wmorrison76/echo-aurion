import { useState, useCallback } from "react";
import type { EventReference } from "shared/types/purchasing"; /** * Hook for managing event linkage in P&R workflows * Used to tag receiving sessions, invoice lines, or PO items with event references */
export function useEventLinking(initialEvent?: EventReference | null) {
  const [eventRef, setEventRef] = useState<EventReference | null>(
    initialEvent || null,
  );
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const setEvent = useCallback((event: EventReference | null) => {
    setEventRef(event);
    setLinkError(null);
  }, []);
  const clearEvent = useCallback(() => {
    setEventRef(null);
    setLinkError(null);
  }, []);
  const linkToEvent = useCallback(
    async (
      event: EventReference,
      onSuccess?: () => void,
      onError?: (err: string) => void,
    ) => {
      setIsLinking(true);
      setLinkError(null);
      try {
        setEventRef(event);
        onSuccess?.();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to link event";
        setLinkError(message);
        onError?.(message);
      } finally {
        setIsLinking(false);
      }
    },
    [],
  );
  const unlinkEvent = useCallback(
    async (onSuccess?: () => void, onError?: (err: string) => void) => {
      setIsLinking(true);
      setLinkError(null);
      try {
        setEventRef(null);
        onSuccess?.();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to unlink event";
        setLinkError(message);
        onError?.(message);
      } finally {
        setIsLinking(false);
      }
    },
    [],
  );
  return {
    eventRef,
    setEvent,
    clearEvent,
    linkToEvent,
    unlinkEvent,
    isLinking,
    linkError,
  };
} /** * Hook for syncing event costs to EchoAurum after invoice finalization */
export function useEventCostSync(organizationId: string) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncEventCosts = useCallback(
    async (
      payload: {
        propertyCode: string;
        outletId: string;
        eventId: string;
        beoId: string;
        invoiceId: string;
        allocations: {
          invoiceLineId: string;
          productCode: string;
          description: string;
          qtyBase: number;
          unitCostBase: number;
          totalCost: number;
          glAccount: string;
        }[];
      },
      onSuccess?: (result: any) => void,
      onError?: (err: string) => void,
    ) => {
      setIsSyncing(true);
      setSyncError(null);
      try {
        const response = await fetch("/api/bridge/event-costs/from-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId, ...payload }),
        });
        if (!response.ok) {
          throw new Error(
            `Sync failed: ${response.status} ${response.statusText}`,
          );
        }
        const result = await response.json();
        onSuccess?.(result);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to sync costs";
        setSyncError(message);
        onError?.(message);
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [organizationId],
  );
  const fetchAllocations = useCallback(
    async (filters?: {
      eventId?: string;
      invoiceId?: string;
      limit?: number;
      offset?: number;
    }) => {
      setIsSyncing(true);
      setSyncError(null);
      try {
        const params = new URLSearchParams();
        params.append("organizationId", organizationId);
        if (filters?.eventId) params.append("eventId", filters.eventId);
        if (filters?.invoiceId) params.append("invoiceId", filters.invoiceId);
        if (filters?.limit) params.append("limit", filters.limit.toString());
        if (filters?.offset) params.append("offset", filters.offset.toString());
        const response = await fetch(
          `/api/bridge/event-costs/allocations?${params}`,
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch allocations: ${response.status} ${response.statusText}`,
          );
        }
        const result = await response.json();
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch allocations";
        setSyncError(message);
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [organizationId],
  );
  return { syncEventCosts, fetchAllocations, isSyncing, syncError };
}
