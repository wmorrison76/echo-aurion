/**
 * useDesignCollaboration Hook
 * Manages real-time collaboration for cake design
 * 
 * Usage:
 * const { session, remoteUsers, broadcastChange } = useDesignCollaboration(designId);
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { realtimeManager } from "../lib/realtime-manager";
import { collaborationManager } from "../lib/collaboration-manager";
import {
  getLUCCCAUser,
  getUserId,
  getUserDisplayName,
  getUserCursorColor,
  getWebSocketUrl,
} from "../lib/luccca-integration";
import type {
  DesignSession,
  RemoteUserPresence,
  CollaborationEventType,
} from "../../shared/types";

export interface UseDesignCollaborationOptions {
  mode?: "readonly" | "exclusive" | "shared";
  autoCreateSession?: boolean;
  autoJoinAsViewer?: boolean;
}

export interface UseDesignCollaborationReturn {
  session: DesignSession | null;
  remoteUsers: RemoteUserPresence[];
  isConnected: boolean;
  isSyncing: boolean;
  currentUser: ReturnType<typeof getLUCCCAUser> | null;
  broadcastChange: (change: any, eventType?: CollaborationEventType) => void;
  broadcastCursor: (x: number, y: number) => void;
  endSession: () => Promise<void>;
  transferControl: (userId: string) => Promise<void>;
  error: Error | null;
  loading: boolean;
}

export function useDesignCollaboration(
  designId: string,
  options: UseDesignCollaborationOptions = {}
): UseDesignCollaborationReturn {
  const {
    mode = "readonly",
    autoCreateSession = true,
    autoJoinAsViewer = true,
  } = options;

  const [session, setSession] = useState<DesignSession | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUserPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = useRef(getUserId());
  const userName = useRef(getUserDisplayName());
  const userColor = useRef(getUserCursorColor());
  const currentUser = useRef(getLUCCCAUser());
  const sessionIdRef = useRef<string | null>(null);

  /**
   * Initialize realtime manager
   */
  useEffect(() => {
    try {
      realtimeManager.initialize({
        wsUrl: getWebSocketUrl(),
        userId: userId.current,
        userName: userName.current,
        userColor: userColor.current,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to initialize realtime manager")
      );
    }
  }, []);

  /**
   * Handle incoming design changes
   */
  const handleDesignChange = useCallback((change: any) => {
    setIsSyncing(false);
  }, []);

  /**
   * Handle presence updates
   */
  const handlePresenceUpdate = useCallback((presence: RemoteUserPresence[]) => {
    setRemoteUsers(presence);
  }, []);

  /**
   * Create session if needed
   */
  const setupSession = useCallback(async () => {
    try {
      setLoading(true);

      // Check if active session exists
      let activeSession = await collaborationManager.getActiveSession(designId);

      if (!activeSession && autoCreateSession) {
        // Create new session if we're the primary chef
        activeSession = await collaborationManager.createSession({
          designId,
          mode,
          viewers: [],
        });
        sessionIdRef.current = activeSession.id;
      } else if (activeSession && autoJoinAsViewer) {
        // Join as viewer
        await collaborationManager.joinSession({
          sessionId: activeSession.id,
          userId: userId.current,
          userName: userName.current,
        });
        sessionIdRef.current = activeSession.id;
      }

      setSession(activeSession);

      // Connect realtime manager
      if (activeSession) {
        await realtimeManager.connect(designId, activeSession.id);
        setIsConnected(true);

        // Set up listeners
        realtimeManager.on("design_changed", handleDesignChange);
        realtimeManager.onPresence(handlePresenceUpdate);

        // Log initial presence
        realtimeManager.broadcastPresence();
      }
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to setup session");
      setError(error);
      console.error("[Collaboration] Setup failed", error);
    } finally {
      setLoading(false);
    }
  }, [designId, mode, autoCreateSession, autoJoinAsViewer, handleDesignChange, handlePresenceUpdate]);

  /**
   * Initialize collaboration on mount
   */
  useEffect(() => {
    setupSession();

    return () => {
      // Cleanup on unmount
      if (sessionIdRef.current) {
        collaborationManager
          .leaveSession(sessionIdRef.current, userId.current)
          .catch((err) => {
            console.error("[Collaboration] Failed to leave session", err);
          });
      }

      realtimeManager.disconnect();
    };
  }, [setupSession]);

  /**
   * Broadcast design change
   */
  const broadcastChange = useCallback(
    (change: any, eventType: CollaborationEventType = "design_changed") => {
      setIsSyncing(true);

      realtimeManager.broadcastChange(change, eventType);

      // Log event
      if (session) {
        collaborationManager.logEvent(designId, session.id, eventType, change);
      }
    },
    [designId, session]
  );

  /**
   * Broadcast cursor position
   */
  const broadcastCursor = useCallback((x: number, y: number) => {
    realtimeManager.sendCursor(x, y);
  }, []);

  /**
   * End collaboration session
   */
  const endSession = useCallback(async () => {
    if (session) {
      try {
        await collaborationManager.endSession(session.id);
        setSession(null);
        realtimeManager.disconnect();
        setIsConnected(false);
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("Failed to end session");
        setError(error);
      }
    }
  }, [session]);

  /**
   * Transfer control to another chef
   */
  const transferControl = useCallback(
    async (newUserId: string) => {
      if (session) {
        try {
          const updatedSession =
            await collaborationManager.transferControl(session.id, newUserId);
          setSession(updatedSession);
        } catch (err) {
          const error =
            err instanceof Error
              ? err
              : new Error("Failed to transfer control");
          setError(error);
        }
      }
    },
    [session]
  );

  return {
    session,
    remoteUsers,
    isConnected,
    isSyncing,
    currentUser: currentUser.current,
    broadcastChange,
    broadcastCursor,
    endSession,
    transferControl,
    error,
    loading,
  };
}

export default useDesignCollaboration;
