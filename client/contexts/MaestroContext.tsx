/**
 * Maestro Context Provider
 *
 * Central state management for the Maestro Banquets Unified Dashboard.
 * Provides Event-centric data model with real-time subscriptions.
 *
 * Features:
 * - Event hydration from API
 * - Real-time changelog synchronization
 * - Auto-action execution
 * - Change notifications to subscribers
 * - Fallback to local cache when offline
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import type {
  Event,
  ChangelogEntry,
  RiskFlag,
  ChangelogStatus,
} from "@shared/types/maestro";
import { get, post, patch } from "@/lib/api-client";
import { MaestroRealtimeClient } from "@/lib/maestro-realtime";
import { maestroEventBus, EVENT_TYPES } from "@/lib/maestro-event-bus";

export interface MaestroContextType {
  // Current state
  currentEvent: Event | null;
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;

  // Event management
  selectEvent: (eventId: string) => Promise<void>;
  updateEvent: (patch: Partial<Event>) => Promise<void>;
  refreshEvent: () => Promise<void>;

  // Changelog management
  addChangelogEntry: (
    entry: Omit<ChangelogEntry, "id" | "timestamp">,
  ) => Promise<ChangelogEntry>;
  applyChange: (changelogId: string) => Promise<void>;
  rejectChange: (changelogId: string, reason: string) => Promise<void>;

  // Risk management
  getRiskFlags: () => RiskFlag[];
  dismissRisk: (riskId: string) => void;

  // Real-time subscriptions
  subscribeToChanges: (
    callback: (change: ChangelogEntry) => void,
  ) => () => void;
  subscribeToRisks: (callback: (risks: RiskFlag[]) => void) => () => void;
}

const MaestroContext = createContext<MaestroContextType | null>(null);

export const useMaestro = (): MaestroContextType => {
  const context = useContext(MaestroContext);
  if (!context) {
    throw new Error("useMaestro must be used within MaestroProvider");
  }
  return context;
};

interface MaestroProviderProps {
  children: ReactNode;
}

export const MaestroProvider: React.FC<MaestroProviderProps> = ({
  children,
}) => {
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" && navigator.onLine,
  );

  // Change subscribers
  const [changeSubscribers, setChangeSubscribers] = useState<
    Set<(change: ChangelogEntry) => void>
  >(new Set());
  const [riskSubscribers, setRiskSubscribers] = useState<
    Set<(risks: RiskFlag[]) => void>
  >(new Set());

  // Real-time connection (stored in ref to persist across renders)
  const realtimeRef = React.useRef<MaestroRealtimeClient | null>(null);

  // Handle online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /**
   * Fetch and hydrate event from API
   */
  const selectEvent = useCallback(async (eventId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await get<{ success: boolean; event: Event }>(
        `/api/maestro/events/${eventId}`,
      );

      if (response.success && response.event) {
        setCurrentEvent(response.event);

        // Initialize real-time connection for this event
        if (realtimeRef.current) {
          realtimeRef.current.disconnect();
        }

        realtimeRef.current = new MaestroRealtimeClient({ eventId });
        await realtimeRef.current.connect();

        // Emit event bus notification
        maestroEventBus.emit(EVENT_TYPES.EVENT_SELECTED, {
          eventId,
          eventName: response.event.name,
        });
      } else {
        setError("Event not found");
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load event";
      setError(errorMsg);
      console.error("[MAESTRO-CONTEXT] selectEvent error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update event with partial changes
   */
  const updateEvent = useCallback(
    async (eventPatch: Partial<Event>) => {
      if (!currentEvent) return;

      try {
        setError(null);

        const response = await patch<{ success: boolean; event: Event }>(
          `/api/maestro/events/${currentEvent.id}`,
          eventPatch,
        );

        if (response.success && response.event) {
          setCurrentEvent(response.event);
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to update event";
        setError(errorMsg);
        console.error("[MAESTRO-CONTEXT] updateEvent error:", err);
      }
    },
    [currentEvent],
  );

  /**
   * Refresh current event from server
   */
  const refreshEvent = useCallback(async () => {
    if (!currentEvent) return;
    await selectEvent(currentEvent.id);
  }, [currentEvent, selectEvent]);

  /**
   * Create and record a changelog entry
   */
  const addChangelogEntry = useCallback(
    async (entryData: Omit<ChangelogEntry, "id" | "timestamp">) => {
      if (!currentEvent) throw new Error("No event selected");

      try {
        const response = await post<{
          success: boolean;
          change: ChangelogEntry;
        }>("/api/maestro/changelog", {
          eventId: currentEvent.id,
          ...entryData,
        });

        if (response.success && response.change) {
          // Update local event changelog
          setCurrentEvent((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              changelog: [...prev.changelog, response.change],
            };
          });

          // Notify subscribers
          changeSubscribers.forEach((callback) => callback(response.change));

          return response.change;
        }

        throw new Error("Failed to create changelog entry");
      } catch (err) {
        console.error("[MAESTRO-CONTEXT] addChangelogEntry error:", err);
        throw err;
      }
    },
    [currentEvent, changeSubscribers],
  );

  /**
   * Apply a pending changelog entry (trigger auto-actions)
   */
  const applyChange = useCallback(
    async (changelogId: string) => {
      if (!currentEvent) return;

      try {
        const response = await post<{ success: boolean }>(
          `/api/maestro/changelog/${changelogId}/apply`,
          { eventId: currentEvent.id },
        );

        if (response.success) {
          // Refresh event to get updated state from auto-actions
          await refreshEvent();
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to apply change";
        setError(errorMsg);
        console.error("[MAESTRO-CONTEXT] applyChange error:", err);
      }
    },
    [currentEvent, refreshEvent],
  );

  /**
   * Reject a pending changelog entry
   */
  const rejectChange = useCallback(
    async (changelogId: string, reason: string) => {
      if (!currentEvent) return;

      try {
        const response = await post<{ success: boolean }>(
          `/api/maestro/changelog/${changelogId}/reject`,
          { eventId: currentEvent.id, reason },
        );

        if (response.success) {
          await refreshEvent();
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to reject change";
        setError(errorMsg);
        console.error("[MAESTRO-CONTEXT] rejectChange error:", err);
      }
    },
    [currentEvent, refreshEvent],
  );

  /**
   * Get current risk flags
   */
  const getRiskFlags = useCallback((): RiskFlag[] => {
    return currentEvent?.riskFlags || [];
  }, [currentEvent?.riskFlags]);

  /**
   * Dismiss a risk flag
   */
  const dismissRisk = useCallback((riskId: string) => {
    setCurrentEvent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        riskFlags: prev.riskFlags.filter((r) => r.id !== riskId),
      };
    });
  }, []);

  /**
   * Subscribe to changelog changes
   */
  const subscribeToChanges = useCallback(
    (callback: (change: ChangelogEntry) => void) => {
      setChangeSubscribers((prev) => new Set([...prev, callback]));

      return () => {
        setChangeSubscribers((prev) => {
          const next = new Set(prev);
          next.delete(callback);
          return next;
        });
      };
    },
    [],
  );

  /**
   * Subscribe to risk flag changes
   */
  const subscribeToRisks = useCallback(
    (callback: (risks: RiskFlag[]) => void) => {
      setRiskSubscribers((prev) => new Set([...prev, callback]));

      return () => {
        setRiskSubscribers((prev) => {
          const next = new Set(prev);
          next.delete(callback);
          return next;
        });
      };
    },
    [],
  );

  const value = useMemo<MaestroContextType>(
    () => ({
      currentEvent,
      isLoading,
      error,
      isOnline,
      selectEvent,
      updateEvent,
      refreshEvent,
      addChangelogEntry,
      applyChange,
      rejectChange,
      getRiskFlags,
      dismissRisk,
      subscribeToChanges,
      subscribeToRisks,
    }),
    [
      currentEvent,
      isLoading,
      error,
      isOnline,
      selectEvent,
      updateEvent,
      refreshEvent,
      addChangelogEntry,
      applyChange,
      rejectChange,
      getRiskFlags,
      dismissRisk,
      subscribeToChanges,
      subscribeToRisks,
    ],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeRef.current) {
        realtimeRef.current.disconnect();
      }
    };
  }, []);

  return (
    <MaestroContext.Provider value={value}>{children}</MaestroContext.Provider>
  );
};
