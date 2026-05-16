/**
 * Real-time Collaboration Cursor Tracker
 * Tracks and syncs remote user cursors in real-time
 */

export interface RemoteUserCursor {
  userId: string;
  userName: string;
  x: number;
  y: number;
  timestamp: number;
  color: string;
  isActive: boolean;
}

export interface CursorTrackingMessage {
  type: "cursor-move" | "cursor-click" | "selection-change";
  userId: string;
  userName: string;
  x: number;
  y: number;
  data?: any;
}

class CollaborationCursorTracker {
  private websocket: WebSocket | null = null;
  private userId: string;
  private userName: string;
  private remoteCursors: Map<string, RemoteUserCursor> = new Map();
  private cursorColors: Map<string, string> = new Map();
  private cursorTimeout: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  private readonly CURSOR_TIMEOUT = 5000; // 5 seconds
  private readonly UPDATE_INTERVAL = 100; // 100ms
  private readonly COLOR_PALETTE = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
  ];

  constructor(userId: string, userName: string) {
    this.userId = userId;
    this.userName = userName;
  }

  /**
   * Connect to collaboration server
   */
  connect(websocketUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(websocketUrl);

        this.websocket.onopen = () => {
          this.sendMessage({
            type: "cursor-move",
            userId: this.userId,
            userName: this.userName,
            x: 0,
            y: 0,
          });
          resolve();
        };

        this.websocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as CursorTrackingMessage;
            this.handleRemoteMessage(message);
          } catch (error) {
            console.error("Failed to parse collaboration message:", error);
          }
        };

        this.websocket.onerror = (error) => {
          reject(error);
        };

        this.websocket.onclose = () => {
          this.cleanup();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Track local cursor movement
   */
  trackLocalCursor(x: number, y: number): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.sendMessage({
      type: "cursor-move",
      userId: this.userId,
      userName: this.userName,
      x,
      y,
    });
  }

  /**
   * Track local selection changes
   */
  trackSelectionChange(selectionData: any): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.sendMessage({
      type: "selection-change",
      userId: this.userId,
      userName: this.userName,
      x: 0,
      y: 0,
      data: selectionData,
    });
  }

  /**
   * Handle incoming remote cursor messages
   */
  private handleRemoteMessage(message: CursorTrackingMessage): void {
    if (message.userId === this.userId) {
      return; // Ignore own messages
    }

    // Clear existing timeout
    const existingTimeout = this.cursorTimeout.get(message.userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Update remote cursor
    const color = this.getColorForUser(message.userId);
    const cursor: RemoteUserCursor = {
      userId: message.userId,
      userName: message.userName,
      x: message.x,
      y: message.y,
      timestamp: Date.now(),
      color,
      isActive: true,
    };

    this.remoteCursors.set(message.userId, cursor);

    // Emit cursor update event
    this.emit("cursor-update", cursor);

    // Set timeout to hide inactive cursors
    const timeout = setTimeout(() => {
      const inactive = this.remoteCursors.get(message.userId);
      if (inactive) {
        inactive.isActive = false;
        this.emit("cursor-inactive", message.userId);
      }
    }, this.CURSOR_TIMEOUT);

    this.cursorTimeout.set(message.userId, timeout);

    // Handle specific message types
    if (message.type === "selection-change") {
      this.emit("selection-change", {
        userId: message.userId,
        userName: message.userName,
        data: message.data,
      });
    }
  }

  /**
   * Send message to server
   */
  private sendMessage(message: CursorTrackingMessage): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.websocket.send(JSON.stringify(message));
    } catch (error) {
      console.error("Failed to send collaboration message:", error);
    }
  }

  /**
   * Get color for user (consistent across session)
   */
  private getColorForUser(userId: string): string {
    if (!this.cursorColors.has(userId)) {
      const color = this.COLOR_PALETTE[this.cursorColors.size % this.COLOR_PALETTE.length];
      this.cursorColors.set(userId, color);
    }
    return this.cursorColors.get(userId) || "#00f0ff";
  }

  /**
   * Get all remote cursors
   */
  getRemoteCursors(): RemoteUserCursor[] {
    return Array.from(this.remoteCursors.values()).filter((c) => c.isActive);
  }

  /**
   * Subscribe to events
   */
  on(event: string, handler: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(handler);
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, handler: (data: any) => void): void {
    this.listeners.get(event)?.delete(handler);
  }

  /**
   * Emit events
   */
  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Disconnect from collaboration server
   */
  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
    }
    this.cleanup();
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.cursorTimeout.forEach((timeout) => clearTimeout(timeout));
    this.cursorTimeout.clear();
    this.remoteCursors.clear();
    this.listeners.clear();
    this.websocket = null;
  }
}

// Export singleton instance
export function createCollaborationTracker(userId: string, userName: string): CollaborationCursorTracker {
  return new CollaborationCursorTracker(userId, userName);
}
