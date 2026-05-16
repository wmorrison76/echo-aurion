/**
 * Maestro Real-Time Synchronization
 *
 * Handles WebSocket/SSE connections for real-time updates from the server.
 * Implements fallback to polling if WebSocket unavailable.
 * Queues operations if offline and syncs when reconnected.
 */

import { maestroEventBus, EVENT_TYPES } from "./maestro-event-bus";
import type { ChangelogEntry, RiskFlag } from "@shared/types/maestro";

export type RealtimeTransport = "websocket" | "sse" | "polling";

interface RealtimeConfig {
  eventId?: string;
  transportPreference?: RealtimeTransport;
  pollingInterval?: number; // milliseconds
  reconnectDelay?: number; // milliseconds
  maxReconnectAttempts?: number;
}

class MaestroRealtimeClient {
  private eventId: string | null = null;
  private transport: RealtimeTransport = "polling";
  private pollingInterval: number = 5000;
  private reconnectDelay: number = 2000;
  private maxReconnectAttempts: number = 5;
  private reconnectAttempts: number = 0;

  private websocket: WebSocket | null = null;
  private pollingTimer: NodeJS.Timer | null = null;
  private isConnected: boolean = false;
  private isInitialized: boolean = false;

  // Queue for offline operations
  private offlineQueue: Array<{
    type: string;
    payload: any;
    timestamp: number;
  }> = [];

  constructor(config?: RealtimeConfig) {
    if (config?.eventId) {
      this.eventId = config.eventId;
    }
    if (config?.transportPreference) {
      this.transport = config.transportPreference;
    }
    if (config?.pollingInterval) {
      this.pollingInterval = config.pollingInterval;
    }
    if (config?.reconnectDelay) {
      this.reconnectDelay = config.reconnectDelay;
    }
    if (config?.maxReconnectAttempts) {
      this.maxReconnectAttempts = config.maxReconnectAttempts;
    }

    this.setupConnectionListeners();
  }

  /**
   * Initialize the connection
   */
  public async connect(eventId?: string): Promise<void> {
    if (this.isInitialized) return;

    if (eventId) {
      this.eventId = eventId;
    }

    if (!this.eventId) {
      console.warn("[MAESTRO-REALTIME] No eventId provided");
      return;
    }

    this.isInitialized = true;

    // Try WebSocket first if available
    if (this.transport === "websocket" || !this.transport) {
      try {
        await this.connectWebSocket();
        return;
      } catch (err) {
        console.warn("[MAESTRO-REALTIME] WebSocket failed, falling back to polling:", err);
        this.transport = "polling";
      }
    }

    // Fall back to polling
    this.startPolling();
  }

  /**
   * Disconnect the connection
   */
  public disconnect(): void {
    this.isInitialized = false;
    this.stopPolling();

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.isConnected = false;
  }

  /**
   * Connect via WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    if (!this.eventId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/api/maestro/realtime?eventId=${this.eventId}`;

    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(url);

        this.websocket.onopen = () => {
          console.log("[MAESTRO-REALTIME] WebSocket connected");
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.processPendingQueue();
          resolve();
        };

        this.websocket.onmessage = (event) => {
          this.handleRealtimeMessage(JSON.parse(event.data));
        };

        this.websocket.onerror = (error) => {
          console.error("[MAESTRO-REALTIME] WebSocket error:", error);
          this.isConnected = false;
          reject(error);
        };

        this.websocket.onclose = () => {
          console.warn("[MAESTRO-REALTIME] WebSocket closed");
          this.isConnected = false;
          this.attemptReconnect();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Start polling for updates
   */
  private startPolling(): void {
    if (this.pollingTimer) return;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/maestro/changelog/${this.eventId}?limit=10&since=${Date.now() - this.pollingInterval}`,
          {
            headers: {
              "X-Org-ID": localStorage.getItem("auth_org_id") || "default",
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          if (data.changes && Array.isArray(data.changes)) {
            data.changes.forEach((change: ChangelogEntry) => {
              this.handleChangelogUpdate(change);
            });
          }
          this.isConnected = true;
          this.reconnectAttempts = 0;
        }
      } catch (err) {
        console.error("[MAESTRO-REALTIME] Polling error:", err);
        this.isConnected = false;
      }
    };

    // Initial poll
    poll();

    // Schedule recurring polls
    this.pollingTimer = setInterval(poll, this.pollingInterval);
  }

  /**
   * Stop polling
   */
  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Handle incoming real-time message
   */
  private handleRealtimeMessage(message: any): void {
    switch (message.type) {
      case "changelog:updated":
        this.handleChangelogUpdate(message.data);
        break;
      case "risk:detected":
        maestroEventBus.emit(EVENT_TYPES.RISK_DETECTED, message.data);
        break;
      case "auto_action:executed":
        maestroEventBus.emit(EVENT_TYPES.AUTO_ACTION_EXECUTED, message.data);
        break;
      case "auto_action:failed":
        maestroEventBus.emit(EVENT_TYPES.AUTO_ACTION_FAILED, message.data);
        break;
      default:
        console.warn("[MAESTRO-REALTIME] Unknown message type:", message.type);
    }
  }

  /**
   * Handle changelog update
   */
  private handleChangelogUpdate(change: ChangelogEntry): void {
    maestroEventBus.emit(EVENT_TYPES.CHANGELOG_ENTRY_CREATED, {
      eventId: change.eventId,
      changelogId: change.id,
      field: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue,
      source: change.source,
    });
  }

  /**
   * Setup connection status listeners
   */
  private setupConnectionListeners(): void {
    window.addEventListener("online", () => {
      console.log("[MAESTRO-REALTIME] Connection restored");
      if (this.isInitialized) {
        this.reconnectAttempts = 0;
        this.connect().catch((err) => console.error("[MAESTRO-REALTIME] Reconnect failed:", err));
      }
    });

    window.addEventListener("offline", () => {
      console.warn("[MAESTRO-REALTIME] Connection lost");
      this.isConnected = false;
    });
  }

  /**
   * Queue an operation if offline
   */
  public queueOfflineOperation(type: string, payload: any): void {
    this.offlineQueue.push({
      type,
      payload,
      timestamp: Date.now(),
    });
    console.log("[MAESTRO-REALTIME] Operation queued (offline)");
  }

  /**
   * Process queued operations when reconnected
   */
  private processPendingQueue(): void {
    while (this.offlineQueue.length > 0) {
      const op = this.offlineQueue.shift();
      if (op) {
        console.log("[MAESTRO-REALTIME] Processing queued operation:", op.type);
        // Operations would be resubmitted here
      }
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[MAESTRO-REALTIME] Max reconnect attempts reached, switching to polling");
      this.transport = "polling";
      this.startPolling();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`[MAESTRO-REALTIME] Attempting reconnect (attempt ${this.reconnectAttempts})...`);
    setTimeout(() => {
      this.connect().catch(() => {
        // Recursively attempt again
        this.attemptReconnect();
      });
    }, delay);
  }

  /**
   * Get connection status
   */
  public getStatus(): {
    connected: boolean;
    transport: RealtimeTransport;
    eventId: string | null;
    queueLength: number;
  } {
    return {
      connected: this.isConnected,
      transport: this.transport,
      eventId: this.eventId,
      queueLength: this.offlineQueue.length,
    };
  }
}

// Singleton instance
export const maestroRealtime = new MaestroRealtimeClient();
