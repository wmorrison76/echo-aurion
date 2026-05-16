/** * Phase 13: Real-Time Collaboration - Type Definitions * Core types for multi-user synchronization and presence */ export type PresenceStatus =
  "online" | "idle" | "offline" | "editing";
export interface UserPresence {
  userId: string;
  userName: string;
  userColor: string;
  status: PresenceStatus;
  lastSeen: number;
  cursorX?: number;
  cursorY?: number;
  selectedElementIds: string[];
  viewport: { x: number; y: number; zoom: number };
}
export interface RemoteChange {
  changeId: string;
  userId: string;
  timestamp: number;
  lamportClock: number;
  type: "insert" | "update" | "delete";
  elementId: string;
  elementType: string;
  previousValue?: any;
  newValue: any;
  sessionId: string;
}
export interface CRDTOperation {
  operationId: string;
  userId: string;
  lamportTimestamp: number;
  elementId: string;
  value: any;
  timestamp: number;
  siteId: string;
}
export interface SyncState {
  lastSyncTimestamp: number;
  pendingChanges: RemoteChange[];
  acknowledgedChangeIds: Set<string>;
  lamportClock: number;
  conflictResolutions: Map<string, "keep-local" | "keep-remote" | "merge">;
}
export interface CollaborationSession {
  sessionId: string;
  boardId: string;
  participants: string[];
  activeUsers: Map<string, UserPresence>;
  startTime: number;
  lastActivity: number;
  changeLog: RemoteChange[];
  syncState: SyncState;
}
export interface SyncMessage {
  type: "presence" | "change" | "ack" | "conflict" | "snapshot";
  payload: any;
  timestamp: number;
  userId: string;
  sessionId: string;
}
export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflictType?: "edit-edit" | "edit-delete" | "delete-delete";
  affectedElementId?: string;
  resolution?: "keep-local" | "keep-remote" | "merge";
}
export interface PresenceEvent {
  type:
    | "online"
    | "offline"
    | "cursor-move"
    | "selection-change"
    | "status-change";
  userId: string;
  timestamp: number;
  data: any;
}
export interface SyncAckMessage {
  changeId: string;
  userId: string;
  acknowledged: boolean;
  timestamp: number;
}
export interface OperationalTransform {
  operationId: string;
  clientId: string;
  timestamp: number;
  operation: {
    type: "insert" | "delete" | "modify";
    position: number;
    content?: any;
  };
  priority: number;
}
export interface CollaborationMetrics {
  totalParticipants: number;
  activeParticipants: number;
  totalChanges: number;
  conflictsDetected: number;
  averageSyncLatency: number;
  lastSyncTime: number;
}
export interface PresenceUpdate {
  userId: string;
  status: PresenceStatus;
  cursorX?: number;
  cursorY?: number;
  selectedElementIds?: string[];
  viewport?: { x: number; y: number; zoom: number };
  timestamp: number;
}
export interface BroadcastOptions {
  includeLocalUser?: boolean;
  targetUsers?: string[];
  priority?: "low" | "normal" | "high";
}
