import React, { useEffect, useRef } from "react";
import RealtimeSyncEngine from "./RealtimeSyncEngine";
import PresenceTracker from "./PresenceTracker";
import { realtimeCollaborationManager } from "./RealtimeCollaborationManager";
import { CollaborationStatusIndicator } from "./CollaborationStatusIndicator";
import { ConflictIndicatorBadge } from "./ConflictIndicatorBadge";
import { CollaborationHeader } from "./CollaborationHeader";
import { RemoteCursorOverlay } from "./RemoteCursorOverlay";
import { SelectionIndicator } from "./SelectionIndicator";
import { CanvasState } from "./types";
interface Phase13IntegrationProps {
  sessionId: string;
  userId: string;
  userName: string;
  userColor: string;
  canvasState: CanvasState;
  canvasRef: React.RefObject<HTMLDivElement>;
  onRemoteChange?: (change: any) => void;
}
interface Phase13CollaborationState {
  syncEngine: RealtimeSyncEngine | null;
  presenceTracker: PresenceTracker | null;
  isInitialized: boolean;
  participantCount: number;
}
export const Phase13Integration: React.FC<Phase13IntegrationProps> = ({
  sessionId,
  userId,
  userName,
  userColor,
  canvasState,
  canvasRef,
  onRemoteChange,
}) => {
  const stateRef = useRef<Phase13CollaborationState>({
    syncEngine: null,
    presenceTracker: null,
    isInitialized: false,
    participantCount: 0,
  });
  const [collaborationState, setCollaborationState] =
    React.useState<Phase13CollaborationState>({
      syncEngine: null,
      presenceTracker: null,
      isInitialized: false,
      participantCount: 0,
    }); // Initialize collaboration session and managers useEffect(() => { if (stateRef.current.isInitialized) return; try { // Initialize collaboration session const session = realtimeCollaborationManager.initializeSession( sessionId, sessionId, userId, ); // Register user presence const presence = realtimeCollaborationManager.registerUserPresence( sessionId, userId, userName, userColor, ); // Create sync engine const syncEngine = new RealtimeSyncEngine(sessionId, userId); syncEngine.initialize(); // Create presence tracker const presenceTracker = new PresenceTracker( sessionId, userId, userName, userColor, ); presenceTracker.initialize(); // Subscribe to sync changes const unsubscribeSync = syncEngine.subscribe((change) => { if (change.userId !== userId) { onRemoteChange?.(change); } }); // Subscribe to presence events const unsubscribePresence = presenceTracker.subscribe((event) => { // Broadcast presence events to other users realtimeCollaborationManager.broadcastMessage(sessionId, { type:"presence", userId, sessionId, timestamp: Date.now(), payload: event, }); }); // Subscribe to collaboration manager messages const unsubscribeBroadcast = realtimeCollaborationManager.subscribe( sessionId, (msg) => { if (msg.userId !== userId) { if (msg.type ==="change") { syncEngine.applyRemoteChange(msg.payload); } } }, ); stateRef.current = { syncEngine, presenceTracker, isInitialized: true, participantCount: session.participants.length, }; setCollaborationState(stateRef.current); // Cleanup on unmount return () => { unsubscribeSync(); unsubscribePresence(); unsubscribeBroadcast(); syncEngine.destroy(); presenceTracker.destroy(); realtimeCollaborationManager.leaveSession(sessionId, userId); }; } catch (error) { console.error("Phase 13 Integration Error:", error); } }, [sessionId, userId, userName, userColor, onRemoteChange]); // Track cursor movements useEffect(() => { if (!stateRef.current.presenceTracker || !canvasRef.current) return; const handleMouseMove = (e: MouseEvent) => { const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return; const x = e.clientX - rect.left; const y = e.clientY - rect.top; // Only track if within canvas if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) { stateRef.current.presenceTracker?.updateCursor(x, y); } }; const handleMouseLeave = () => { // Optionally mark as idle or offline stateRef.current.presenceTracker?.updateStatus("idle"); }; const handleMouseEnter = () => { stateRef.current.presenceTracker?.updateStatus("editing"); }; canvasRef.current?.addEventListener("mousemove", handleMouseMove); canvasRef.current?.addEventListener("mouseleave", handleMouseLeave); canvasRef.current?.addEventListener("mouseenter", handleMouseEnter); return () => { canvasRef.current?.removeEventListener("mousemove", handleMouseMove); canvasRef.current?.removeEventListener("mouseleave", handleMouseLeave); canvasRef.current?.removeEventListener("mouseenter", handleMouseEnter); }; }, [canvasRef]); // Render collaboration UI components return ( <div className="flex flex-col gap-2"> {/* Collaboration Header */} {collaborationState.presenceTracker && ( <CollaborationHeader presenceTracker={collaborationState.presenceTracker} className="mb-2" /> )} {/* Status and Conflict Indicators */} <div className="flex gap-2"> {collaborationState.syncEngine && ( <CollaborationStatusIndicator syncEngine={collaborationState.syncEngine} participantCount={collaborationState.participantCount} /> )} {collaborationState.syncEngine && ( <ConflictIndicatorBadge syncEngine={collaborationState.syncEngine} /> )} </div> {/* Remote Cursor Overlay */} {collaborationState.presenceTracker && canvasRef.current && ( <RemoteCursorOverlay presenceTracker={collaborationState.presenceTracker} currentUserId={userId} viewportX={canvasState.viewportX} viewportY={canvasState.viewportY} zoomLevel={canvasState.zoomLevel} canvasWidth={canvasRef.current.offsetWidth} canvasHeight={canvasRef.current.offsetHeight} className="absolute inset-0" /> )} {/* Selection Indicator */} {collaborationState.presenceTracker && canvasRef.current && ( <SelectionIndicator presenceTracker={collaborationState.presenceTracker} currentUserId={userId} elementPositions={new Map()} // TODO: Build from canvasState viewportX={canvasState.viewportX} viewportY={canvasState.viewportY} zoomLevel={canvasState.zoomLevel} className="absolute inset-0" /> )} </div> );
};
export default Phase13Integration;
