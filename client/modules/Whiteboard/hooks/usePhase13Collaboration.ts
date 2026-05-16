import { useEffect, useRef, useState, useCallback } from "react";
import RealtimeSyncEngine from "../RealtimeSyncEngine";
import PresenceTracker from "../PresenceTracker";
import { realtimeCollaborationManager } from "../RealtimeCollaborationManager";
import {
  RemoteChange,
  UserPresence,
  CollaborationMetrics,
} from "../types/CollaborationTypes";
interface UsePhase13CollaborationProps {
  sessionId: string;
  userId: string;
  userName: string;
  userColor: string;
  enabled?: boolean;
}
interface UsePhase13CollaborationReturn {
  syncEngine: RealtimeSyncEngine | null;
  presenceTracker: PresenceTracker | null;
  isInitialized: boolean;
  activeUsers: UserPresence[];
  metrics: CollaborationMetrics | null;
  recordChange: (
    change: Omit<RemoteChange, "changeId" | "lamportClock" | "sessionId">,
  ) => void;
  updateCursor: (x: number, y: number) => void;
  updateSelection: (elementIds: string[]) => void;
  updateViewport: (x: number, y: number, zoom: number) => void;
  broadcastChange: (change: RemoteChange) => void;
  cleanup: () => void;
}
export const usePhase13Collaboration = ({
  sessionId,
  userId,
  userName,
  userColor,
  enabled = true,
}: UsePhase13CollaborationProps): UsePhase13CollaborationReturn => {
  const [state, setState] = useState({
    syncEngine: null as RealtimeSyncEngine | null,
    presenceTracker: null as PresenceTracker | null,
    isInitialized: false,
    activeUsers: [] as UserPresence[],
    metrics: null as CollaborationMetrics | null,
  });
  const cleanupFunctionsRef = useRef<Array<() => void>>([]); // Initialize collaboration useEffect(() => { if (!enabled || state.isInitialized) return; try { // Initialize collaboration session realtimeCollaborationManager.initializeSession( sessionId, sessionId, userId, ); // Register user presence const presence = realtimeCollaborationManager.registerUserPresence( sessionId, userId, userName, userColor, ); // Create sync engine const syncEngine = new RealtimeSyncEngine(sessionId, userId); syncEngine.initialize(); // Create presence tracker const presenceTracker = new PresenceTracker( sessionId, userId, userName, userColor, ); presenceTracker.initialize(); // Subscribe to sync changes const unsubscribeSync = syncEngine.subscribe((change) => { // Handle remote changes if (change.userId !== userId) { // Trigger callback or update state as needed } }); cleanupFunctionsRef.current.push(unsubscribeSync); // Subscribe to presence updates const unsubscribePresence = presenceTracker.subscribe((event) => { // Update active users list const activeUsers = presenceTracker.getActiveUsers(); setState((prev) => ({ ...prev, activeUsers, })); // Broadcast presence to other users realtimeCollaborationManager.broadcastMessage(sessionId, { type:"presence", userId, sessionId, timestamp: Date.now(), payload: event, }); }); cleanupFunctionsRef.current.push(unsubscribePresence); // Subscribe to collaboration messages const unsubscribeBroadcast = realtimeCollaborationManager.subscribe( sessionId, (msg) => { if (msg.userId !== userId) { if (msg.type ==="change") { syncEngine.applyRemoteChange(msg.payload); } else if (msg.type ==="presence") { const activeUsers = presenceTracker.getActiveUsers(); setState((prev) => ({ ...prev, activeUsers, })); } } }, ); cleanupFunctionsRef.current.push(unsubscribeBroadcast); setState((prev) => ({ ...prev, syncEngine, presenceTracker, isInitialized: true, activeUsers: [presence], })); } catch (error) { console.error("usePhase13Collaboration Error:", error); } return () => { cleanup(); }; }, [enabled, sessionId, userId, userName, userColor]); // Update metrics periodically useEffect(() => { if (!state.isInitialized) return; const interval = setInterval(() => { const metrics = realtimeCollaborationManager.getSessionMetrics(sessionId); setState((prev) => ({ ...prev, metrics, })); }, 1000); return () => clearInterval(interval); }, [state.isInitialized, sessionId]); const recordChange = useCallback( (change: Omit<RemoteChange,"changeId" |"lamportClock" |"sessionId">) => { const remoteChange = realtimeCollaborationManager.recordChange( sessionId, userId, change, ); // Broadcast change to other users realtimeCollaborationManager.broadcastMessage(sessionId, { type:"change", userId, sessionId, timestamp: Date.now(), payload: remoteChange, }); // Also add to sync engine state.syncEngine?.addLocalChange({ ...change, userId, timestamp: Date.now(), }); }, [sessionId, userId, state.syncEngine], ); const updateCursor = useCallback( (x: number, y: number) => { state.presenceTracker?.updateCursor(x, y); }, [state.presenceTracker], ); const updateSelection = useCallback( (elementIds: string[]) => { state.presenceTracker?.updateSelection(elementIds); }, [state.presenceTracker], ); const updateViewport = useCallback( (x: number, y: number, zoom: number) => { state.presenceTracker?.updateViewport(x, y, zoom); }, [state.presenceTracker], ); const broadcastChange = useCallback( (change: RemoteChange) => { realtimeCollaborationManager.broadcastMessage(sessionId, { type:"change", userId, sessionId, timestamp: Date.now(), payload: change, }); }, [sessionId, userId], ); const cleanup = useCallback(() => { cleanupFunctionsRef.current.forEach((fn) => { try { fn(); } catch (error) { console.error("Cleanup error:", error); } }); cleanupFunctionsRef.current = []; state.syncEngine?.destroy(); state.presenceTracker?.destroy(); realtimeCollaborationManager.leaveSession(sessionId, userId); setState({ syncEngine: null, presenceTracker: null, isInitialized: false, activeUsers: [], metrics: null, }); }, [sessionId, userId, state.syncEngine, state.presenceTracker]); return { syncEngine: state.syncEngine, presenceTracker: state.presenceTracker, isInitialized: state.isInitialized, activeUsers: state.activeUsers, metrics: state.metrics, recordChange, updateCursor, updateSelection, updateViewport, broadcastChange, cleanup, };
};
export default usePhase13Collaboration;
