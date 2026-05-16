/**
 * Realtime Manager
 * Handles WebSocket and Supabase Realtime connections for collaborative design
 * 
 * Features:
 * - WebSocket connection with automatic reconnection
 * - Event broadcasting and listening
 * - Presence tracking
 * - Error handling and recovery
 * - Connection state management
 */

import type {
  CollaborationMessage,
  RemoteUserCursor,
  RemoteUserPresence,
  CollaborationEventType,
} from "../../shared/types";

export interface RealtimeManagerConfig {
  wsUrl: string;
  userId: string;
  userName: string;
  userColor: string;
}

export interface RealtimeManagerState {
  isConnected: boolean;
  isSyncing: boolean;
  messageQueue: CollaborationMessage[];
}

type EventHandler = (data: any) => void;

class RealtimeManager {
  private ws: WebSocket | null = null;
  private wsUrl: string = "";
  private userId: string = "";
  private userName: string = "";
  private userColor: string = "";
  private designId: string = "";
  private sessionId: string = "";

  private eventHandlers: Map<CollaborationEventType, Set<EventHandler>> =
    new Map();
  private presenceHandlers: Set<EventHandler> = new Set();
  private cursorHandlers: Set<EventHandler> = new Set();

  private state: RealtimeManagerState = {
    isConnected: false,
    isSyncing: false,
    messageQueue: [],
  };

  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private reconnectBackoffMultiplier: number = 1.5;

  private cursorUpdateInterval: NodeJS.Timeout | null = null;
  private lastCursorX: number = 0;
  private lastCursorY: number = 0;
  private presenceUpdateInterval: NodeJS.Timeout | null = null;

  private remotePresence: Map<string, RemoteUserPresence> = new Map();
  private remoteCursors: Map<string, RemoteUserCursor> = new Map();

  /**
   * Initialize realtime manager with configuration
   */
  initialize(config: RealtimeManagerConfig): void {
    this.wsUrl = config.wsUrl;
    this.userId = config.userId;
    this.userName = config.userName;
    this.userColor = config.userColor;

    if (process.env.NODE_ENV === "development") {
      console.log("[Realtime] Manager initialized", {
        userId: this.userId,
        userName: this.userName,
      });
    }
  }

  /**
   * Connect to a specific design session
   */
  async connect(designId: string, sessionId?: string): Promise<void> {
    if (this.state.isConnected && this.designId === designId) {
      console.log(`[Realtime] Already connected to design ${designId}`);
      return;
    }

    this.designId = designId;
    this.sessionId = sessionId || "";

    return new Promise((resolve, reject) => {
      try {
        const url = new URL(this.wsUrl);
        url.searchParams.set("userId", this.userId);
        url.searchParams.set("designId", designId);
        if (sessionId) url.searchParams.set("sessionId", sessionId);

        this.ws = new WebSocket(url.toString());

        this.ws.addEventListener("open", () => {
          this.onConnect();
          resolve();
        });

        this.ws.addEventListener("message", (event) => {
          this.onMessage(event);
        });

        this.ws.addEventListener("close", () => {
          this.onDisconnect();
        });

        this.ws.addEventListener("error", (error) => {
          console.error("[Realtime] WebSocket error", error);
          reject(error);
        });

        // Connection timeout
        setTimeout(() => {
          if (!this.state.isConnected) {
            reject(new Error("WebSocket connection timeout"));
          }
        }, 10000);
      } catch (error) {
        console.error("[Realtime] Failed to create WebSocket", error);
        reject(error);
      }
    });
  }

  /**
   * Handle WebSocket connection open
   */
  private onConnect(): void {
    this.state.isConnected = true;
    this.reconnectAttempts = 0;

    console.log(
      `[Realtime] Connected to design session: ${this.designId}`
    );

    // Notify listeners
    this.emit("connection", { connected: true });

    // Send initial presence
    this.broadcastPresence();

    // Start cursor updates
    this.startCursorUpdates();
  }

  /**
   * Handle WebSocket message
   */
  private onMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as CollaborationMessage;

      // Route message to appropriate handler
      switch (message.type) {
        case "presence-update":
          this.handlePresenceUpdate(message.payload);
          this.cursorHandlers.forEach((handler) =>
            handler(message.payload)
          );
          break;

        case "cursor-update":
          this.handleCursorUpdate(message.payload);
          this.cursorHandlers.forEach((handler) =>
            handler(message.payload)
          );
          break;

        default:
          // Route to event type handlers
          const handlers = this.eventHandlers.get(message.type);
          if (handlers) {
            handlers.forEach((handler) => handler(message.payload));
          }
          break;
      }

      // Log in development
      if (process.env.NODE_ENV === "development") {
        console.log(`[Realtime] Received ${message.type}`, message.payload);
      }
    } catch (error) {
      console.error("[Realtime] Failed to parse message", error);
    }
  }

  /**
   * Handle disconnection and reconnect
   */
  private onDisconnect(): void {
    this.state.isConnected = false;
    this.ws = null;

    console.log(`[Realtime] Disconnected from design session`);

    // Notify listeners
    this.emit("connection", { connected: false });

    // Clear intervals
    if (this.cursorUpdateInterval) {
      clearInterval(this.cursorUpdateInterval);
      this.cursorUpdateInterval = null;
    }

    // Attempt reconnection
    this.attemptReconnect();
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        "[Realtime] Max reconnection attempts reached",
        this.maxReconnectAttempts
      );
      this.emit("error", {
        message: "Failed to reconnect after multiple attempts",
        fatal: true,
      });
      return;
    }

    this.reconnectAttempts++;
    const delay =
      this.reconnectDelay *
      Math.pow(this.reconnectBackoffMultiplier, this.reconnectAttempts - 1);

    console.log(
      `[Realtime] Reconnecting attempt ${this.reconnectAttempts} in ${delay}ms`
    );

    setTimeout(() => {
      this.connect(this.designId, this.sessionId).catch((error) => {
        console.error("[Realtime] Reconnection failed", error);
      });
    }, delay);
  }

  /**
   * Broadcast design change event
   */
  broadcastChange(
    change: Partial<any>,
    eventType: CollaborationEventType = "design_changed"
  ): void {
    const message: CollaborationMessage = {
      type: eventType,
      payload: change,
      userId: this.userId,
      timestamp: Date.now(),
    };

    this.send(message);
  }

  /**
   * Broadcast user presence
   */
  broadcastPresence(): void {
    const message: CollaborationMessage = {
      type: "presence-update",
      payload: {
        userId: this.userId,
        userName: this.userName,
        userColor: this.userColor,
      },
      userId: this.userId,
      timestamp: Date.now(),
    };

    this.send(message);
  }

  /**
   * Send cursor position
   */
  sendCursor(x: number, y: number): void {
    this.lastCursorX = x;
    this.lastCursorY = y;

    const message: CollaborationMessage = {
      type: "cursor-update",
      payload: {
        userId: this.userId,
        userName: this.userName,
        userColor: this.userColor,
        cursorX: x,
        cursorY: y,
      },
      userId: this.userId,
      timestamp: Date.now(),
    };

    this.send(message);
  }

  /**
   * Start periodic cursor updates
   */
  private startCursorUpdates(): void {
    if (this.cursorUpdateInterval) {
      clearInterval(this.cursorUpdateInterval);
    }

    // Update cursor position every 100ms if it has changed
    this.cursorUpdateInterval = setInterval(() => {
      if (this.state.isConnected) {
        this.broadcastPresence();
      }
    }, 5000); // Presence ping every 5 seconds
  }

  /**
   * Handle incoming presence update
   */
  private handlePresenceUpdate(payload: RemoteUserPresence): void {
    this.remotePresence.set(payload.userId, payload);

    const presenceArray = Array.from(this.remotePresence.values());
    this.presenceHandlers.forEach((handler) => handler(presenceArray));
  }

  /**
   * Handle incoming cursor update
   */
  private handleCursorUpdate(payload: RemoteUserCursor): void {
    if (payload.userId === this.userId) return; // Ignore own cursor

    this.remoteCursors.set(payload.userId, payload);
  }

  /**
   * Send message to server
   */
  private send(message: CollaborationMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue message for later
      this.state.messageQueue.push(message);

      if (this.state.messageQueue.length > 100) {
        // Remove oldest message if queue gets too large
        this.state.messageQueue.shift();
      }

      if (!this.state.isConnected) {
        // Try to reconnect
        this.connect(this.designId, this.sessionId).catch(() => {
          console.error("[Realtime] Failed to send message - not connected");
        });
      }

      return;
    }

    try {
      this.ws.send(JSON.stringify(message));

      if (process.env.NODE_ENV === "development") {
        console.log(`[Realtime] Sent ${message.type}`);
      }
    } catch (error) {
      console.error("[Realtime] Failed to send message", error);
      this.state.messageQueue.push(message);
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    while (this.state.messageQueue.length > 0 && this.state.isConnected) {
      const message = this.state.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  /**
   * Register event handler
   */
  on(eventType: CollaborationEventType, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)?.add(handler);
  }

  /**
   * Register presence handler
   */
  onPresence(handler: EventHandler): void {
    this.presenceHandlers.add(handler);
  }

  /**
   * Register cursor handler
   */
  onCursor(handler: EventHandler): void {
    this.cursorHandlers.add(handler);
  }

  /**
   * Remove event handler
   */
  off(eventType: CollaborationEventType, handler: EventHandler): void {
    this.eventHandlers.get(eventType)?.delete(handler);
  }

  /**
   * Emit internal event
   */
  private emit(eventType: string, payload: any): void {
    const handlers = this.eventHandlers.get(eventType as CollaborationEventType);
    if (handlers) {
      handlers.forEach((handler) => handler(payload));
    }
  }

  /**
   * Get remote presence
   */
  getRemotePresence(): RemoteUserPresence[] {
    return Array.from(this.remotePresence.values());
  }

  /**
   * Get remote cursors
   */
  getRemoteCursors(): RemoteUserCursor[] {
    return Array.from(this.remoteCursors.values());
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.state.isConnected;
  }

  /**
   * Disconnect and clean up
   */
  disconnect(): void {
    if (this.cursorUpdateInterval) {
      clearInterval(this.cursorUpdateInterval);
      this.cursorUpdateInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.state.isConnected = false;
    this.remotePresence.clear();
    this.remoteCursors.clear();

    console.log("[Realtime] Manager disconnected");
  }
}

// Export singleton instance
export const realtimeManager = new RealtimeManager();

export default realtimeManager;
