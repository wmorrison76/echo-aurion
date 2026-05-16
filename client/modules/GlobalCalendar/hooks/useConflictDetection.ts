/**
 * useConflictDetection
 * Manages conflict detection, polling, and basic acknowledge/resolve actions.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useCalendarStore,
  useSelectedOutlets,
} from "../stores/useCalendarStore";
import type { CalendarConflict } from "@/types/calendar";
import { ConflictSeverity } from "@/types/calendar";

export interface UseConflictDetectionOptions {
  autoDetect?: boolean;
  pollIntervalMs?: number;
  includeAllOutlets?: boolean;
}

export interface UseConflictDetectionResult {
  conflicts: CalendarConflict[];
  isDetecting: boolean;
  error: Error | null;
  detectConflicts: (outletIds?: string[]) => Promise<void>;
  acknowledgeConflict: (conflictId: string) => Promise<void>;
  resolveConflict: (conflictId: string, notes: string) => Promise<void>;
  summary: { total: number; critical: number; warning: number; info: number };
}

export function useConflictDetection(
  options: UseConflictDetectionOptions = {},
): UseConflictDetectionResult {
  const {
    autoDetect = true,
    pollIntervalMs = 30_000,
    includeAllOutlets = true,
  } = options;

  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const conflicts = useCalendarStore((s) => s.conflicts);
  const setConflicts = useCalendarStore((s) => s.setConflicts);
  const selectedOutlets = useSelectedOutlets();

  const detectConflicts = useCallback(
    async (outletIds: string[] = selectedOutlets) => {
      if (!outletIds || outletIds.length === 0) return;
      try {
        setIsDetecting(true);
        setError(null);

        const response = await fetch("/api/calendar/conflicts/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outlet_ids: outletIds,
            include_all_outlets: includeAllOutlets,
          }),
        });

        if (!response.ok)
          throw new Error(`Failed to detect conflicts: ${response.statusText}`);

        const data = await response.json();
        if (data?.success && data?.data) {
          setConflicts(data.data.conflicts || []);
        } else {
          throw new Error(data?.error || "Failed to detect conflicts");
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error("Unknown error");
        setError(e);
        // eslint-disable-next-line no-console
        console.error("Error detecting conflicts:", e);
      } finally {
        setIsDetecting(false);
      }
    },
    [includeAllOutlets, selectedOutlets, setConflicts],
  );

  const acknowledgeConflict = useCallback(
    async (conflictId: string) => {
      const response = await fetch(
        `/api/calendar/conflicts/${conflictId}/acknowledge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!response.ok)
        throw new Error(
          `Failed to acknowledge conflict: ${response.statusText}`,
        );

      const data = await response.json();
      if (!(data?.success && data?.data))
        throw new Error(data?.error || "Failed to acknowledge conflict");

      const updated = conflicts.map((c) =>
        c.id === conflictId ? data.data : c,
      );
      setConflicts(updated);
    },
    [conflicts, setConflicts],
  );

  const resolveConflict = useCallback(
    async (conflictId: string, notes: string = "") => {
      const response = await fetch(
        `/api/calendar/conflicts/${conflictId}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolution_notes: notes }),
        },
      );
      if (!response.ok)
        throw new Error(`Failed to resolve conflict: ${response.statusText}`);

      const data = await response.json();
      if (!(data?.success && data?.data))
        throw new Error(data?.error || "Failed to resolve conflict");

      const updated = conflicts.map((c) =>
        c.id === conflictId ? data.data : c,
      );
      setConflicts(updated);
    },
    [conflicts, setConflicts],
  );

  const summary = useMemo(() => {
    const s = { total: conflicts.length, critical: 0, warning: 0, info: 0 };
    for (const c of conflicts) {
      if (c.resolved_at) continue;
      if (c.severity === ConflictSeverity.CRITICAL) s.critical++;
      else if (c.severity === ConflictSeverity.WARNING) s.warning++;
      else s.info++;
    }
    return s;
  }, [conflicts]);

  useEffect(() => {
    if (!autoDetect || selectedOutlets.length === 0) return;
    void detectConflicts();
    const interval = window.setInterval(
      () => void detectConflicts(),
      pollIntervalMs,
    );
    return () => window.clearInterval(interval);
  }, [autoDetect, detectConflicts, pollIntervalMs, selectedOutlets.length]);

  return {
    conflicts,
    isDetecting,
    error,
    detectConflicts,
    acknowledgeConflict,
    resolveConflict,
    summary,
  };
}

export function useEventConflicts(eventId: string | null) {
  const [eventConflicts, setEventConflicts] = useState<CalendarConflict[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!eventId) {
      setEventConflicts([]);
      return;
    }

    const fetchConflicts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(
          `/api/calendar/events/${eventId}/conflicts`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          },
        );
        if (!response.ok)
          throw new Error(`Failed to fetch conflicts: ${response.statusText}`);
        const data = await response.json();
        if (data?.success && Array.isArray(data?.data)) {
          setEventConflicts(data.data);
        } else {
          throw new Error(data?.error || "Failed to fetch conflicts");
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error("Unknown error");
        setError(e);
        // eslint-disable-next-line no-console
        console.error("Error fetching event conflicts:", e);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchConflicts();
  }, [eventId]);

  return { conflicts: eventConflicts, isLoading, error };
}

/**
 * useRealtimeConflicts
 * Future: integrate with WebSocket; for now, indicates polling is available.
 */
export function useRealtimeConflicts(_outletIds: string[]) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(true);
    return () => setIsConnected(false);
  }, []);

  return { isConnected };
}
