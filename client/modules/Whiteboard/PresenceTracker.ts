/** * Phase 13: Presence Tracker * Manages real-time user presence, cursor positions, and viewport sharing */ import {
  UserPresence,
  PresenceStatus,
  PresenceEvent,
} from "./types/CollaborationTypes";
import { v4 as uuidv4 } from "uuid";
class PresenceTracker {
  private presenceMap: Map<string, UserPresence> = new Map();
  private sessionId: string;
  private userId: string;
  private userName: string;
  private userColor: string;
  private statusUpdateInterval: NodeJS.Timeout | null = null;
  private presenceEventListeners: Set<(event: PresenceEvent) => void> =
    new Set();
  private cursorUpdateInterval: NodeJS.Timeout | null = null;
  private idleTimeout: NodeJS.Timeout | null = null;
  private lastActivityTime: number = Date.now();
  private IDLE_THRESHOLD = 30000;
  private UPDATE_INTERVAL = 1000;
  constructor(
    sessionId: string,
    userId: string,
    userName: string,
    userColor: string,
  ) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.userName = userName;
    this.userColor = userColor;
  }
  /** * Initialize presence tracking */ initialize(): UserPresence {
    const presence: UserPresence = {
      userId: this.userId,
      userName: this.userName,
      userColor: this.userColor,
      status: "online",
      lastSeen: Date.now(),
      selectedElementIds: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    };
    this.presenceMap.set(this.userId, presence);
    this.startStatusUpdates();
    this.startIdleDetection();
    return presence;
  }
  /** * Update cursor position */ updateCursor(x: number, y: number): void {
    const presence = this.presenceMap.get(this.userId);
    if (!presence) return;
    presence.cursorX = x;
    presence.cursorY = y;
    presence.lastSeen = Date.now();
    this.emitPresenceEvent({
      type: "cursor-move",
      userId: this.userId,
      timestamp: Date.now(),
      data: { x, y },
    });
    this.recordActivity();
  }
  /** * Update selected elements */ updateSelection(
    elementIds: string[],
  ): void {
    const presence = this.presenceMap.get(this.userId);
    if (!presence) return;
    presence.selectedElementIds = elementIds;
    presence.lastSeen = Date.now();
    this.emitPresenceEvent({
      type: "selection-change",
      userId: this.userId,
      timestamp: Date.now(),
      data: { elementIds },
    });
    this.recordActivity();
  }
  /** * Update viewport (pan/zoom) */ updateViewport(
    x: number,
    y: number,
    zoom: number,
  ): void {
    const presence = this.presenceMap.get(this.userId);
    if (!presence) return;
    presence.viewport = { x, y, zoom };
    presence.lastSeen = Date.now();
    this.emitPresenceEvent({
      type: "cursor-move",
      userId: this.userId,
      timestamp: Date.now(),
      data: { viewport: { x, y, zoom } },
    });
    this.recordActivity();
  }
  /** * Update presence status */ updateStatus(status: PresenceStatus): void {
    const presence = this.presenceMap.get(this.userId);
    if (!presence) return;
    presence.status = status;
    presence.lastSeen = Date.now();
    this.emitPresenceEvent({
      type: "status-change",
      userId: this.userId,
      timestamp: Date.now(),
      data: { status },
    });
  }
  /** * Register remote user presence */ registerRemotePresence(
    presence: UserPresence,
  ): void {
    this.presenceMap.set(presence.userId, presence);
    this.emitPresenceEvent({
      type: "online",
      userId: presence.userId,
      timestamp: Date.now(),
      data: presence,
    });
  }
  /** * Update remote user presence */ updateRemotePresence(
    userId: string,
    updates: Partial<UserPresence>,
  ): void {
    const presence = this.presenceMap.get(userId);
    if (!presence) return;
    Object.assign(presence, updates);
    presence.lastSeen = Date.now();
  }
  /** * Remove user presence (offline) */ removePresence(userId: string): void {
    const presence = this.presenceMap.get(userId);
    if (!presence) return;
    presence.status = "offline";
    this.emitPresenceEvent({
      type: "offline",
      userId,
      timestamp: Date.now(),
      data: presence,
    });
    setTimeout(() => {
      this.presenceMap.delete(userId);
    }, 5000);
  }
  /** * Get all active users */ getActiveUsers(): UserPresence[] {
    return Array.from(this.presenceMap.values()).filter(
      (p) => p.status !== "offline",
    );
  }
  /** * Get user presence by ID */ getPresence(
    userId: string,
  ): UserPresence | null {
    return this.presenceMap.get(userId) || null;
  }
  /** * Get all presence data */ getAllPresence(): Map<string, UserPresence> {
    return new Map(this.presenceMap);
  }
  /** * Subscribe to presence events */ subscribe(
    callback: (event: PresenceEvent) => void,
  ): () => void {
    this.presenceEventListeners.add(callback);
    return () => {
      this.presenceEventListeners.delete(callback);
    };
  }
  /** * Emit presence event */ private emitPresenceEvent(
    event: PresenceEvent,
  ): void {
    this.presenceEventListeners.forEach((listener) => {
      listener(event);
    });
  }
  /** * Record activity (for idle detection) */ private recordActivity(): void {
    this.lastActivityTime = Date.now();
    const presence = this.presenceMap.get(this.userId);
    if (presence && presence.status === "idle") {
      presence.status = "editing";
    }
  }
  /** * Start idle detection */ private startIdleDetection(): void {
    if (this.idleTimeout) clearInterval(this.idleTimeout);
    this.idleTimeout = setInterval(() => {
      const timeSinceActivity = Date.now() - this.lastActivityTime;
      const presence = this.presenceMap.get(this.userId);
      if (!presence) return;
      if (
        timeSinceActivity > this.IDLE_THRESHOLD &&
        presence.status === "editing"
      ) {
        presence.status = "idle";
        this.emitPresenceEvent({
          type: "status-change",
          userId: this.userId,
          timestamp: Date.now(),
          data: { status: "idle" },
        });
      }
    }, 10000);
  }
  /** * Start periodic status updates */ private startStatusUpdates(): void {
    if (this.statusUpdateInterval) clearInterval(this.statusUpdateInterval);
    this.statusUpdateInterval = setInterval(() => {
      const presence = this.presenceMap.get(this.userId);
      if (presence) {
        presence.lastSeen = Date.now();
      }
    }, this.UPDATE_INTERVAL);
  }
  /** * Get presence statistics */ getStatistics(): {
    total: number;
    online: number;
    idle: number;
    editing: number;
    offline: number;
  } {
    const allPresence = Array.from(this.presenceMap.values());
    return {
      total: allPresence.length,
      online: allPresence.filter((p) => p.status === "online").length,
      idle: allPresence.filter((p) => p.status === "idle").length,
      editing: allPresence.filter((p) => p.status === "editing").length,
      offline: allPresence.filter((p) => p.status === "offline").length,
    };
  }
  /** * Clean up old offline users */ cleanup(): void {
    const now = Date.now();
    const offlineThreshold = 60000;
    Array.from(this.presenceMap.entries()).forEach(([userId, presence]) => {
      if (
        presence.status === "offline" &&
        now - presence.lastSeen > offlineThreshold
      ) {
        this.presenceMap.delete(userId);
      }
    });
  }
  /** * Destroy tracker */ destroy(): void {
    if (this.statusUpdateInterval) clearInterval(this.statusUpdateInterval);
    if (this.idleTimeout) clearInterval(this.idleTimeout);
    if (this.cursorUpdateInterval) clearInterval(this.cursorUpdateInterval);
    this.presenceEventListeners.clear();
    this.presenceMap.clear();
  }
  /** * Get heartbeat data for transmission */ getHeartbeatData(): {
    userId: string;
    status: PresenceStatus;
    cursorX?: number;
    cursorY?: number;
    selectedElementIds: string[];
    viewport: { x: number; y: number; zoom: number };
    timestamp: number;
  } | null {
    const presence = this.presenceMap.get(this.userId);
    if (!presence) return null;
    return {
      userId: presence.userId,
      status: presence.status,
      cursorX: presence.cursorX,
      cursorY: presence.cursorY,
      selectedElementIds: presence.selectedElementIds,
      viewport: presence.viewport,
      timestamp: Date.now(),
    };
  }
  /** * Batch update multiple users */ batchUpdatePresence(
    updates: Map<string, Partial<UserPresence>>,
  ): void {
    updates.forEach((updateData, userId) => {
      const presence = this.presenceMap.get(userId);
      if (presence) {
        Object.assign(presence, updateData);
        presence.lastSeen = Date.now();
      }
    });
  }
}
export default PresenceTracker;
