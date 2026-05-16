/**
 * Maestro Hooks
 *
 * React hooks for panels to integrate with:
 * - Event bus (pub/sub system for reactive updates)
 * - Changelog entries (recording changes)
 * - Real-time sync (WebSocket/polling)
 * - RBAC (role-based permissions)
 */

import { useEffect, useCallback, useRef } from "react";
import { maestroEventBus, EVENT_TYPES } from "./maestro-event-bus";
import { useMaestro } from "@/contexts/MaestroContext";
import { useAuth } from "@/contexts/AuthContext";
import type { ChangelogEntry, ChangeSource } from "@shared/types/maestro";

/**
 * useEventBusSubscription
 * Subscribe to maestro event bus events
 *
 * @example
 * useEventBusSubscription(EVENT_TYPES.GUEST_COUNT_CHANGED, (payload) => {
 *   console.log("Guest count changed:", payload);
 * });
 */
export function useEventBusSubscription<T = any>(
  eventType: string,
  callback: (payload: T) => void,
) {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    unsubscribeRef.current = maestroEventBus.subscribeTo(eventType, callback);

    return () => {
      unsubscribeRef.current?.();
    };
  }, [eventType, callback]);
}

/**
 * useCreateChangelogEntry
 * Helper hook to create a changelog entry when an operation completes
 *
 * @example
 * const createEntry = useCreateChangelogEntry();
 * // Later in a handler:
 * await createEntry({
 *   field: "guestCount",
 *   oldValue: 100,
 *   newValue: 150,
 *   source: "event_planner",
 *   affectedSystems: ["production", "inventory", "labor"],
 * });
 */
export function useCreateChangelogEntry() {
  const { currentEvent, addChangelogEntry } = useMaestro();
  const { user } = useAuth();

  return useCallback(
    async (data: {
      field: string;
      oldValue?: any;
      newValue?: any;
      source: ChangeSource;
      affectedSystems: string[];
      delta?: Record<string, any>;
      requiresApproval?: boolean;
    }) => {
      if (!currentEvent) {
        console.warn("[MAESTRO-HOOKS] No event selected");
        return null;
      }

      try {
        const entry = await addChangelogEntry({
          eventId: currentEvent.id,
          field: data.field,
          oldValue: data.oldValue,
          newValue: data.newValue,
          source: data.source,
          userId: user?.id || "system",
          userName: user?.email || "System",
          affectedSystems: data.affectedSystems,
          delta: data.delta,
          requiresApproval: data.requiresApproval || false,
          status: "pending",
          autoActions: [],
        });

        // Emit event bus notification
        maestroEventBus.emit(EVENT_TYPES.CHANGELOG_ENTRY_CREATED, entry);

        return entry;
      } catch (err) {
        console.error("[MAESTRO-HOOKS] Failed to create changelog entry:", err);
        return null;
      }
    },
    [currentEvent, addChangelogEntry, user],
  );
}

/**
 * useApproveChange
 * Helper to approve a pending changelog entry
 */
export function useApproveChange() {
  const { applyChange } = useMaestro();

  return useCallback(
    async (changelogId: string) => {
      try {
        await applyChange(changelogId);
        maestroEventBus.emit(EVENT_TYPES.CHANGELOG_APPLIED, { changelogId });
        return true;
      } catch (err) {
        console.error("[MAESTRO-HOOKS] Failed to approve change:", err);
        return false;
      }
    },
    [applyChange],
  );
}

/**
 * useRejectChange
 * Helper to reject a pending changelog entry
 */
export function useRejectChange() {
  const { rejectChange } = useMaestro();

  return useCallback(
    async (changelogId: string, reason: string) => {
      try {
        await rejectChange(changelogId, reason);
        maestroEventBus.emit(EVENT_TYPES.CHANGE_REJECTED, {
          changelogId,
          reason,
        });
        return true;
      } catch (err) {
        console.error("[MAESTRO-HOOKS] Failed to reject change:", err);
        return false;
      }
    },
    [rejectChange],
  );
}

/**
 * useOnEventChange
 * Subscribe to a specific event field change
 * Useful for panels that react to specific changes
 *
 * @example
 * useOnEventChange((change) => {
 *   if (change.field === "guestCount") {
 *     // Recalculate production breakdown
 *   }
 * });
 */
export function useOnEventChange(callback: (change: ChangelogEntry) => void) {
  const { subscribeToChanges } = useMaestro();

  useEffect(() => {
    const unsubscribe = subscribeToChanges(callback);
    return unsubscribe;
  }, [subscribeToChanges, callback]);
}

/**
 * useOnRiskDetected
 * Subscribe to new risk flags
 */
export function useOnRiskDetected(
  callback: (severity: "critical" | "high" | "medium" | "low") => void,
) {
  return useEventBusSubscription(EVENT_TYPES.RISK_DETECTED, (risk) => {
    callback(risk.severity);
  });
}

/**
 * useEmitEvent
 * Emit events to the maestro event bus (for triggering cascades)
 */
export function useEmitEvent() {
  return useCallback((eventType: string, payload: any) => {
    maestroEventBus.emit(eventType, payload);
  }, []);
}

/**
 * useCheckPermission
 * Check if current user can perform an action on a panel
 */
export function useCheckPermission(
  action: "read" | "edit" | "approve",
): boolean {
  const { user } = useAuth();
  // TODO: Implement actual RBAC check
  // For now, return true for authenticated users
  return !!user;
}
