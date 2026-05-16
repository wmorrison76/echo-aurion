/** * Phase 13: Real-Time Collaboration Manager * Orchestrates multi-user synchronization and presence */ import {
  UserPresence,
  RemoteChange,
  CollaborationSession,
  PresenceStatus,
  SyncMessage,
  ConflictDetectionResult,
  PresenceEvent,
  SyncAckMessage,
  CollaborationMetrics,
} from "./types/CollaborationTypes";
import { v4 as uuidv4 } from "uuid";
class RealtimeCollaborationManager {
  private sessions: Map<string, CollaborationSession> = new Map();
  private presenceMap: Map<string, Map<string, UserPresence>> = new Map();
  private lamportClock: Map<string, number> = new Map();
  private changeBuffer: Map<string, RemoteChange[]> = new Map();
  private listeners: Map<string, Set<(msg: SyncMessage) => void>> = new Map();
  private conflictResolutionStrategies: Map<string, "lww" | "crdt" | "manual"> =
    new Map();
  constructor() {
    this.initializeDefaults();
  }
  private initializeDefaults(): void {
    this.conflictResolutionStrategies.set("default", "lww");
  }
  /** * Initialize a collaboration session */ initializeSession(
    sessionId: string,
    boardId: string,
    userId: string,
  ): CollaborationSession {
    const session: CollaborationSession = {
      sessionId,
      boardId,
      participants: [userId],
      activeUsers: new Map(),
      startTime: Date.now(),
      lastActivity: Date.now(),
      changeLog: [],
      syncState: {
        lastSyncTimestamp: Date.now(),
        pendingChanges: [],
        acknowledgedChangeIds: new Set(),
        lamportClock: 1,
        conflictResolutions: new Map(),
      },
    };
    this.sessions.set(sessionId, session);
    this.presenceMap.set(sessionId, new Map());
    this.lamportClock.set(sessionId, 1);
    this.changeBuffer.set(sessionId, []);
    this.listeners.set(sessionId, new Set());
    return session;
  }
  /** * Register user presence */ registerUserPresence(
    sessionId: string,
    userId: string,
    userName: string,
    userColor: string,
  ): UserPresence {
    const presence: UserPresence = {
      userId,
      userName,
      userColor,
      status: "online",
      lastSeen: Date.now(),
      selectedElementIds: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    if (!this.presenceMap.has(sessionId)) {
      this.presenceMap.set(sessionId, new Map());
    }
    const sessionPresence = this.presenceMap.get(sessionId)!;
    sessionPresence.set(userId, presence);
    const session = this.sessions.get(sessionId);
    if (session && !session.participants.includes(userId)) {
      session.participants.push(userId);
    }
    return presence;
  }
  /** * Update user presence */ updateUserPresence(
    sessionId: string,
    userId: string,
    updates: Partial<UserPresence>,
  ): UserPresence | null {
    const sessionPresence = this.presenceMap.get(sessionId);
    if (!sessionPresence) return null;
    const presence = sessionPresence.get(userId);
    if (!presence) return null;
    const updated = { ...presence, ...updates, lastSeen: Date.now() };
    sessionPresence.set(userId, updated);
    return updated;
  }
  /** * Record a change from a user */ recordChange(
    sessionId: string,
    userId: string,
    change: Omit<RemoteChange, "changeId" | "lamportClock" | "sessionId">,
  ): RemoteChange {
    const clock = this.lamportClock.get(sessionId) || 0;
    const newClock = clock + 1;
    this.lamportClock.set(sessionId, newClock);
    const remoteChange: RemoteChange = {
      ...change,
      changeId: uuidv4(),
      lamportClock: newClock,
      sessionId,
      userId,
    };
    const session = this.sessions.get(sessionId);
    if (session) {
      session.changeLog.push(remoteChange);
      session.syncState.pendingChanges.push(remoteChange);
      session.lastActivity = Date.now();
    }
    const buffer = this.changeBuffer.get(sessionId);
    if (buffer) {
      buffer.push(remoteChange);
    }
    return remoteChange;
  }
  /** * Detect conflicts in changes */ detectConflict(
    change1: RemoteChange,
    change2: RemoteChange,
  ): ConflictDetectionResult {
    const sameElement = change1.elementId === change2.elementId;
    if (!sameElement) {
      return { hasConflict: false };
    }
    const isEditEdit = change1.type !== "delete" && change2.type !== "delete";
    const isEditDelete =
      (change1.type === "delete" && change2.type !== "delete") ||
      (change1.type !== "delete" && change2.type === "delete");
    const isDeleteDelete =
      change1.type === "delete" && change2.type === "delete";
    if (isEditEdit) {
      return {
        hasConflict: true,
        conflictType: "edit-edit",
        affectedElementId: change1.elementId,
        resolution: "lww",
      };
    }
    if (isEditDelete) {
      return {
        hasConflict: true,
        conflictType: "edit-delete",
        affectedElementId: change1.elementId,
        resolution:
          change1.timestamp > change2.timestamp ? "keep-local" : "keep-remote",
      };
    }
    if (isDeleteDelete) {
      return {
        hasConflict: true,
        conflictType: "delete-delete",
        affectedElementId: change1.elementId,
        resolution: "merge",
      };
    }
    return { hasConflict: false };
  }
  /** * Resolve conflicts using Last-Write-Wins strategy */ resolveConflictLWW(
    change1: RemoteChange,
    change2: RemoteChange,
  ): RemoteChange {
    if (change1.lamportClock > change2.lamportClock) {
      return change1;
    }
    if (change2.lamportClock > change1.lamportClock) {
      return change2;
    }
    return change1.timestamp > change2.timestamp ? change1 : change2;
  }
  /** * Acknowledge changes */ acknowledgeChanges(
    sessionId: string,
    changeIds: string[],
  ): SyncAckMessage[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return changeIds.map((changeId) => {
      session.syncState.acknowledgedChangeIds.add(changeId);
      return {
        changeId,
        userId: "system",
        acknowledged: true,
        timestamp: Date.now(),
      };
    });
  }
  /** * Get active users in session */ getActiveUsers(
    sessionId: string,
  ): UserPresence[] {
    const sessionPresence = this.presenceMap.get(sessionId);
    if (!sessionPresence) return [];
    return Array.from(sessionPresence.values()).filter(
      (p) => p.status !== "offline",
    );
  }
  /** * Get user presence */ getUserPresence(
    sessionId: string,
    userId: string,
  ): UserPresence | null {
    const sessionPresence = this.presenceMap.get(sessionId);
    return sessionPresence?.get(userId) || null;
  }
  /** * Broadcast message to session participants */ broadcastMessage(
    sessionId: string,
    message: SyncMessage,
    excludeUserId?: string,
  ): void {
    const listeners = this.listeners.get(sessionId);
    if (!listeners) return;
    listeners.forEach((listener) => {
      if (excludeUserId && message.userId === excludeUserId) {
        return;
      }
      listener(message);
    });
  }
  /** * Subscribe to session changes */ subscribe(
    sessionId: string,
    callback: (msg: SyncMessage) => void,
  ): () => void {
    const listeners = this.listeners.get(sessionId);
    if (!listeners) return () => {};
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }
  /** * Get session metrics */ getSessionMetrics(
    sessionId: string,
  ): CollaborationMetrics | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    const activeUsers = this.getActiveUsers(sessionId);
    const totalChanges = session.changeLog.length;
    const conflictCount = session.changeLog.filter((c) => {
      const resolutions = session.syncState.conflictResolutions;
      return resolutions.has(c.changeId);
    }).length;
    return {
      totalParticipants: session.participants.length,
      activeParticipants: activeUsers.length,
      totalChanges,
      conflictsDetected: conflictCount,
      averageSyncLatency: this.calculateAverageLatency(session.changeLog),
      lastSyncTime: session.syncState.lastSyncTimestamp,
    };
  }
  /** * Calculate average sync latency */ private calculateAverageLatency(
    changes: RemoteChange[],
  ): number {
    if (changes.length === 0) return 0;
    const latencies = changes.map((c) => Date.now() - c.timestamp);
    const sum = latencies.reduce((a, b) => a + b, 0);
    return sum / changes.length;
  }
  /** * Get pending changes */ getPendingChanges(
    sessionId: string,
  ): RemoteChange[] {
    const session = this.sessions.get(sessionId);
    return session?.syncState.pendingChanges || [];
  }
  /** * Clear pending changes */ clearPendingChanges(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.syncState.pendingChanges = [];
    }
  }
  /** * Get session by ID */ getSession(
    sessionId: string,
  ): CollaborationSession | null {
    return this.sessions.get(sessionId) || null;
  }
  /** * Leave session */ leaveSession(
    sessionId: string,
    userId: string,
  ): boolean {
    const sessionPresence = this.presenceMap.get(sessionId);
    if (!sessionPresence) return false;
    const presence = sessionPresence.get(userId);
    if (presence) {
      presence.status = "offline";
    }
    const session = this.sessions.get(sessionId);
    if (session) {
      session.participants = session.participants.filter((id) => id !== userId);
      if (session.participants.length === 0) {
        this.sessions.delete(sessionId);
        this.presenceMap.delete(sessionId);
        this.listeners.delete(sessionId);
      }
    }
    return true;
  }
  /** * Sync state with server */ syncState(sessionId: string): {
    changes: RemoteChange[];
    acknowledgedIds: string[];
    timestamp: number;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { changes: [], acknowledgedIds: [], timestamp: Date.now() };
    }
    const pendingChanges = session.syncState.pendingChanges;
    const acknowledgedIds = Array.from(session.syncState.acknowledgedChangeIds);
    session.syncState.lastSyncTimestamp = Date.now();
    session.syncState.pendingChanges = [];
    return {
      changes: pendingChanges,
      acknowledgedIds,
      timestamp: session.syncState.lastSyncTimestamp,
    };
  }
}
export const realtimeCollaborationManager = new RealtimeCollaborationManager();
export default RealtimeCollaborationManager;
