import { useState, useEffect, useCallback, useRef } from "react";
import {
  CanvasState,
  WhiteboardEvent,
  DrawingStroke,
  ShapeElement,
} from "@/modules/Whiteboard/types";
import { realtimeManager, syncQueue, resolveConflicts } from "@/lib/supabase";

interface UseWhiteboardSyncOptions {
  sessionId: string;
  userId: string;
  onRemoteUpdate?: (state: CanvasState) => void;
  onSyncStatusChange?: (isSynced: boolean) => void;
  onError?: (error: Error) => void;
}

interface SyncStatus {
  isSynced: boolean;
  isOnline: boolean;
  pendingChanges: number;
  lastSyncTime?: number;
}

/**
 * Hook for managing Whiteboard real-time sync and offline support
 *
 * Features:
 * - Real-time collaborative editing via Supabase Realtime
 * - Offline-first: works without internet, syncs when reconnected
 * - Automatic conflict resolution using Operational Transformation
 * - Pending changes queue with retry logic
 * - Connection status tracking
 */
export function useWhiteboardSync({
  sessionId,
  userId,
  onRemoteUpdate,
  onSyncStatusChange,
  onError,
}: UseWhiteboardSyncOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSynced: true,
    isOnline: typeof window !== "undefined" && navigator.onLine,
    pendingChanges: 0,
    lastSyncTime: Date.now(),
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const syncRetryRef = useRef<NodeJS.Timeout>();

  // Initialize real-time subscriptions
  useEffect(() => {
    // Subscribe to stroke events
    const unsubscribeStroke = realtimeManager.subscribe(
      sessionId,
      "stroke",
      (payload: DrawingStroke) => {
        if (payload.userId !== userId) {
          onRemoteUpdate?.({
            strokes: [payload],
            texts: [],
            shapes: [],
            stickyNotes: [],
            panelEmbeds: [],
            viewportX: 0,
            viewportY: 0,
            zoomLevel: 1,
            backgroundColor: "#ffffff",
            gridSize: 20,
            showGrid: false,
            showRulers: false,
          });
        }
      },
    );

    // Subscribe to shape events
    const unsubscribeShape = realtimeManager.subscribe(
      sessionId,
      "shape",
      (payload: ShapeElement) => {
        if (payload.userId !== userId) {
          onRemoteUpdate?.({
            strokes: [],
            texts: [],
            shapes: [payload],
            stickyNotes: [],
            panelEmbeds: [],
            viewportX: 0,
            viewportY: 0,
            zoomLevel: 1,
            backgroundColor: "#ffffff",
            gridSize: 20,
            showGrid: false,
            showRulers: false,
          });
        }
      },
    );

    // Subscribe to delete events
    const unsubscribeDelete = realtimeManager.subscribe(
      sessionId,
      "delete",
      (payload: { id: string; type: string }) => {
        // Handle deletion from other users
      },
    );

    unsubscribeRef.current = () => {
      unsubscribeStroke();
      unsubscribeShape();
      unsubscribeDelete();
    };

    return () => {
      unsubscribeRef.current?.();
    };
  }, [sessionId, userId, onRemoteUpdate]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus((prev) => ({ ...prev, isOnline: true }));
      syncPendingChanges();
    };

    const handleOffline = () => {
      setSyncStatus((prev) => ({ ...prev, isOnline: false, isSynced: false }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [sessionId]);

  // Sync pending changes when online
  const syncPendingChanges = useCallback(async () => {
    if (!syncStatus.isOnline) return;

    try {
      const pending = syncQueue.getPending();
      const sessionPending = pending.filter(
        (item) => item.event.sessionId === sessionId,
      );

      if (sessionPending.length === 0) {
        setSyncStatus((prev) => ({
          ...prev,
          isSynced: true,
          pendingChanges: 0,
          lastSyncTime: Date.now(),
        }));
        return;
      }

      const flushed = await syncQueue.flushSession(sessionId);

      if (flushed === 0 && sessionPending.length > 0) {
        return;
      }

      setSyncStatus((prev) => ({
        ...prev,
        isSynced: true,
        pendingChanges: 0,
        lastSyncTime: Date.now(),
      }));

      onSyncStatusChange?.(true);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);

      // Retry after 5 seconds
      if (syncRetryRef.current) {
        clearTimeout(syncRetryRef.current);
      }
      syncRetryRef.current = setTimeout(() => syncPendingChanges(), 5000);
    }
  }, [sessionId, syncStatus.isOnline, onSyncStatusChange, onError]);

  // Send event for real-time sync
  const sendEvent = useCallback(
    (type: WhiteboardEvent["type"], data: any) => {
      const event: WhiteboardEvent = {
        type,
        userId,
        sessionId,
        timestamp: Date.now(),
        data,
      };

      // Add to sync queue (offline-first)
      realtimeManager.sendEvent(sessionId, event);

      // Update pending count
      const pending = syncQueue.getPending();
      setSyncStatus((prev) => ({
        ...prev,
        isSynced: false,
        pendingChanges: pending.length,
      }));

      // Try to sync immediately if online
      if (syncStatus.isOnline) {
        syncPendingChanges();
      }
    },
    [userId, sessionId, syncStatus.isOnline, syncPendingChanges],
  );

  // Merge remote changes with local changes
  const mergeRemoteChanges = useCallback(
    (local: DrawingStroke[], remote: DrawingStroke[]) => {
      return resolveConflicts(local, remote);
    },
    [],
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (syncRetryRef.current) {
        clearTimeout(syncRetryRef.current);
      }
    };
  }, []);

  return {
    syncStatus,
    sendEvent,
    syncPendingChanges,
    mergeRemoteChanges,
  };
}

export default useWhiteboardSync;
