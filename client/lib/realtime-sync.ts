/**
 * Real-time Sync Infrastructure
 * 
 * WebSocket/SSE-based real-time synchronization across modules
 * - Automatic reconnection
 * - Conflict resolution
 * - Event batching
 * - Offline support
 */

import { io, Socket } from "socket.io-client";

export type SyncEventType =
  | "inventory.update"
  | "inventory.transaction"
  | "schedule.update"
  | "schedule.shift"
  | "financials.transaction"
  | "financials.posting"
  | "culinary.recipe"
  | "purchasing.order"
  | "maestro.event"
  | "whiteboard.update";

export interface SyncEvent {
  type: SyncEventType;
  module: string;
  entityId: string;
  data: any;
  timestamp: string;
  userId: string;
  organizationId: string;
  outletId?: string;
}

export interface SyncConfig {
  url: string;
  organizationId: string;
  userId: string;
  outletId?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  eventBatchSize?: number;
  eventBatchDelay?: number;
}

export class RealtimeSync {
  private socket: Socket | null = null;
  private config: SyncConfig;
  private eventQueue: SyncEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private listeners: Map<SyncEventType, Set<(event: SyncEvent) => void>> = new Map();
  private isConnected = false;
  private isOffline = false;

  constructor(config: SyncConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      eventBatchSize: 10,
      eventBatchDelay: 100,
      ...config,
    };

    // Monitor online/offline status
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleOnline());
      window.addEventListener("offline", () => this.handleOffline());
    }
  }

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(this.config.url, {
      auth: {
        organizationId: this.config.organizationId,
        userId: this.config.userId,
        outletId: this.config.outletId,
      },
      reconnection: true,
      reconnectionDelay: this.config.reconnectInterval,
      reconnectionAttempts: this.config.maxReconnectAttempts,
      timeout: 10000,
    });

    this.socket.on("connect", () => {
      this.isConnected = true;
      this.isOffline = false;
      this.reconnectAttempts = 0;
      console.log("[RealtimeSync] Connected");
      
      // Process queued events
      this.processEventQueue();
    });

    this.socket.on("disconnect", (reason) => {
      this.isConnected = false;
      console.log("[RealtimeSync] Disconnected:", reason);
    });

    this.socket.on("reconnect_attempt", (attempt) => {
      this.reconnectAttempts = attempt;
      console.log(`[RealtimeSync] Reconnect attempt ${attempt}`);
    });

    this.socket.on("reconnect_failed", () => {
      this.isOffline = true;
      console.error("[RealtimeSync] Reconnection failed");
    });

    this.socket.on("sync.event", (event: SyncEvent) => {
      this.handleSyncEvent(event);
    });

    this.socket.on("sync.batch", (events: SyncEvent[]) => {
      events.forEach((event) => this.handleSyncEvent(event));
    });
  }

  disconnect(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
  }

  subscribe(eventType: SyncEventType, callback: (event: SyncEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  emit(event: SyncEvent): void {
    if (this.isConnected && this.socket) {
      this.eventQueue.push(event);
      this.scheduleBatchProcess();
    } else {
      // Queue for later when connected
      this.eventQueue.push(event);
    }
  }

  private scheduleBatchProcess(): void {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.processEventBatch();
      this.batchTimer = null;
    }, this.config.eventBatchDelay);
  }

  private processEventBatch(): void {
    if (this.eventQueue.length === 0 || !this.socket) return;

    const batch = this.eventQueue.splice(0, this.config.eventBatchSize!);
    
    if (batch.length === 1) {
      this.socket.emit("sync.event", batch[0]);
    } else {
      this.socket.emit("sync.batch", batch);
    }

    // Schedule next batch if queue not empty
    if (this.eventQueue.length > 0) {
      this.scheduleBatchProcess();
    }
  }

  private processEventQueue(): void {
    while (this.eventQueue.length > 0 && this.isConnected) {
      this.processEventBatch();
    }
  }

  private handleSyncEvent(event: SyncEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error(`[RealtimeSync] Error in listener for ${event.type}:`, error);
        }
      });
    }
  }

  private handleOnline(): void {
    if (this.isOffline) {
      console.log("[RealtimeSync] Back online, reconnecting...");
      this.connect();
    }
  }

  private handleOffline(): void {
    this.isOffline = true;
    console.log("[RealtimeSync] Offline, queuing events...");
  }

  getConnectionStatus(): { connected: boolean; offline: boolean; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      offline: this.isOffline,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Singleton instance
let syncInstance: RealtimeSync | null = null;

export function getRealtimeSync(config?: SyncConfig): RealtimeSync | null {
  if (!syncInstance && config) {
    syncInstance = new RealtimeSync(config);
    syncInstance.connect();
  }
  
  // Return null instead of throwing to allow graceful degradation
  return syncInstance;
}

export function initializeRealtimeSync(config: SyncConfig): RealtimeSync {
  syncInstance = new RealtimeSync(config);
  syncInstance.connect();
  return syncInstance;
}
