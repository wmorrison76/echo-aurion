/**
 * Collaboration client (WebSocket) for EchoCanvasStudio Editor.
 * Gracefully degrades when the WS server is unavailable — callers
 * should never depend on live collaboration for core editing flows.
 */
export interface RemoteUserCursor {
  userId: string;
  userName: string;
  userColor: string;
  cursorX: number;
  cursorY: number;
}

export interface RemoteUserPresence {
  userId: string;
  userName: string;
  userColor: string;
}

export type CollaborationEventType =
  | "presence-update"
  | "cursor-update"
  | "layer-change"
  | "layer-add"
  | "layer-delete"
  | "lock"
  | "unlock"
  | "comment";

export type CollaborationEventHandler = (data: any) => void;

class CollaborationClient {
  private ws: WebSocket | null = null;
  private designId: string = "";
  private userId: string = "";
  private userName: string = "";
  private handlers: Map<CollaborationEventType, CollaborationEventHandler[]> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private cursorSendInterval: ReturnType<typeof setInterval> | null = null;
  private lastCursorX: number = 0;
  private lastCursorY: number = 0;
  private isConnected: boolean = false;

  connect(
    designId: string,
    userId: string,
    userName: string,
    wsUrl: string = "",
  ): Promise<void> {
    return new Promise((resolve) => {
      this.designId = designId;
      this.userId = userId;
      this.userName = userName;
      const url =
        wsUrl ||
        `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;

      // 15s connection timeout. If reached, gracefully degrade (resolve
      // without an active connection) so the editor remains usable.
      let connectionTimeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          console.warn("WebSocket connection timeout — collaboration unavailable");
          this.ws?.close();
          this.ws = null;
          this.isConnected = false;
          resolve();
        }
      }, 15000);

      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          if (connectionTimeout) clearTimeout(connectionTimeout);
          console.log("WebSocket connected for collaboration");
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.sendPresence();
          this.setupCursorTracking();
          this.emit("connected" as CollaborationEventType);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error("Failed to parse collaboration message:", error);
          }
        };

        this.ws.onerror = (error) => {
          console.warn("WebSocket error during collaboration:", error);
          if (connectionTimeout) clearTimeout(connectionTimeout);
          this.emit("error" as CollaborationEventType, { message: "Connection error" });
          // Gracefully degrade — don't reject
          this.isConnected = false;
        };

        this.ws.onclose = () => {
          console.log("WebSocket closed for collaboration");
          if (connectionTimeout) clearTimeout(connectionTimeout);
          this.isConnected = false;
          this.emit("disconnected" as CollaborationEventType);
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect(designId, userId, userName, wsUrl);
          }
        };
      } catch (error) {
        if (connectionTimeout) clearTimeout(connectionTimeout);
        console.warn("Failed to create WebSocket:", error);
        resolve();
      }
    });
  }

  private attemptReconnect(
    designId: string,
    userId: string,
    userName: string,
    wsUrl: string,
  ): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(
        "Max collaboration reconnection attempts reached. Collaboration unavailable.",
      );
      this.emit("reconnect-failed" as CollaborationEventType);
      return;
    }
    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000,
    );
    console.log(
      `Attempting collaboration reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`,
    );
    setTimeout(() => {
      this.connect(designId, userId, userName, wsUrl).catch((err) => {
        console.warn("Reconnection attempt failed:", err);
      });
    }, delay);
  }

  private sendPresence(): void {
    if (!this.isConnected || !this.ws) return;
    this.ws.send(
      JSON.stringify({
        type: "presence",
        payload: { designId: this.designId, userName: this.userName },
        userId: this.userId,
        timestamp: Date.now(),
      }),
    );
  }

  private setupCursorTracking(): void {
    document.addEventListener("mousemove", (e) => {
      this.lastCursorX = e.clientX;
      this.lastCursorY = e.clientY;
    });
    if (this.cursorSendInterval) clearInterval(this.cursorSendInterval);
    this.cursorSendInterval = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.ws.send(
          JSON.stringify({
            type: "cursor",
            payload: {
              designId: this.designId,
              cursorX: this.lastCursorX,
              cursorY: this.lastCursorY,
            },
            userId: this.userId,
            timestamp: Date.now(),
          }),
        );
      }
    }, 100);
  }

  private handleMessage(message: any): void {
    const { type, payload } = message;
    if (this.handlers.has(type as CollaborationEventType)) {
      const handlers = this.handlers.get(type as CollaborationEventType)!;
      for (const handler of handlers) handler(payload);
    }
    this.emit(type as CollaborationEventType, payload);
  }

  on(event: CollaborationEventType | string, handler: CollaborationEventHandler): void {
    const key = event as CollaborationEventType;
    if (!this.handlers.has(key)) this.handlers.set(key, []);
    this.handlers.get(key)!.push(handler);
  }

  off(event: CollaborationEventType | string, handler: CollaborationEventHandler): void {
    const key = event as CollaborationEventType;
    if (!this.handlers.has(key)) return;
    const handlers = this.handlers.get(key)!;
    const index = handlers.indexOf(handler);
    if (index > -1) handlers.splice(index, 1);
  }

  private emit(event: CollaborationEventType | string, data?: any): void {
    const key = event as CollaborationEventType;
    if (!this.handlers.has(key)) return;
    const handlers = this.handlers.get(key)!;
    for (const handler of handlers) handler(data);
  }

  sendLayerChange(layerId: string, changes: Record<string, any>): void {
    if (!this.isConnected || !this.ws) return;
    this.ws.send(
      JSON.stringify({
        type: "layer-change",
        payload: { designId: this.designId, layerId, changes },
        userId: this.userId,
        timestamp: Date.now(),
      }),
    );
  }

  sendLayerAdd(layer: any): void {
    if (!this.isConnected || !this.ws) return;
    this.ws.send(
      JSON.stringify({
        type: "layer-add",
        payload: { designId: this.designId, layer },
        userId: this.userId,
        timestamp: Date.now(),
      }),
    );
  }

  sendLayerDelete(layerId: string): void {
    if (!this.isConnected || !this.ws) return;
    this.ws.send(
      JSON.stringify({
        type: "layer-delete",
        payload: { designId: this.designId, layerId },
        userId: this.userId,
        timestamp: Date.now(),
      }),
    );
  }

  sendLock(layerId: string): void {
    if (!this.isConnected || !this.ws) return;
    this.ws.send(
      JSON.stringify({
        type: "lock",
        payload: { designId: this.designId, layerId },
        userId: this.userId,
        timestamp: Date.now(),
      }),
    );
  }

  sendUnlock(layerId: string): void {
    if (!this.isConnected || !this.ws) return;
    this.ws.send(
      JSON.stringify({
        type: "unlock",
        payload: { designId: this.designId, layerId },
        userId: this.userId,
        timestamp: Date.now(),
      }),
    );
  }

  disconnect(): void {
    if (this.cursorSendInterval) {
      clearInterval(this.cursorSendInterval);
      this.cursorSendInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  isOnline(): boolean {
    return this.isConnected;
  }
}

export default new CollaborationClient();
