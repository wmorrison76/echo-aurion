import type { Server as HTTPServer } from "http";
import type { Server as SocketIOServer, Socket } from "socket.io";
import { Server } from "socket.io";
export interface GLUpdateEvent {
  type: "balance-update" | "transaction-posted" | "consolidation-complete";
  accountCode?: string;
  entityId?: string;
  balance?: number;
  debitBalance?: number;
  creditBalance?: number;
  timestamp: string;
  source: string;
}
export interface WebSocketSubscription {
  userId: string;
  entityId: string;
  accountCodes?: string[];
  events: GLUpdateEvent["type"][];
}
export class WebSocketService {
  private io: SocketIOServer;
  private subscriptions: Map<string, WebSocketSubscription[]> = new Map();
  private clientToUserId: Map<string, string> = new Map();
  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: { origin: process.env.CORS_ORIGIN || "*", credentials: true },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });
    this.setupConnectionHandlers();
  }
  private setupConnectionHandlers() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`[WebSocket] Client connected: ${socket.id}`);
      socket.on("subscribe", (subscription: WebSocketSubscription) => {
        console.log(
          `[WebSocket] User ${subscription.userId} subscribed to ${subscription.entityId}`,
        );
        this.clientToUserId.set(socket.id, subscription.userId);
        if (!this.subscriptions.has(subscription.userId)) {
          this.subscriptions.set(subscription.userId, []);
        }
        const userSubs = this.subscriptions.get(subscription.userId)!;
        userSubs.push({
          ...subscription,
          events: subscription.events || [
            "balance-update",
            "transaction-posted",
            "consolidation-complete",
          ],
        });
        socket.join(`entity:${subscription.entityId}`);
        if (subscription.accountCodes) {
          subscription.accountCodes.forEach((code) => {
            socket.join(`account:${code}`);
          });
        }
        socket.emit("subscribed", {
          success: true,
          entityId: subscription.entityId,
          message: "Successfully subscribed to GL updates",
        });
      });
      socket.on("unsubscribe", (data: { entityId: string }) => {
        console.log(`[WebSocket] Unsubscribe from entity: ${data.entityId}`);
        const userId = this.clientToUserId.get(socket.id);
        if (userId) {
          const subs = this.subscriptions.get(userId) || [];
          const index = subs.findIndex((s) => s.entityId === data.entityId);
          if (index > -1) {
            subs.splice(index, 1);
          }
        }
        socket.leave(`entity:${data.entityId}`);
        socket.emit("unsubscribed", { entityId: data.entityId });
      });
      socket.on("disconnect", () => {
        const userId = this.clientToUserId.get(socket.id);
        console.log(
          `[WebSocket] Client disconnected: ${socket.id}${userId ? ` (user: ${userId})` : ""}`,
        );
        if (userId) {
          this.clientToUserId.delete(socket.id);
          const subs = this.subscriptions.get(userId);
          if (subs && subs.length === 0) {
            this.subscriptions.delete(userId);
          }
        }
      });
      socket.on("ping", () => {
        socket.emit("pong");
      });
      socket.on("error", (error: Error) => {
        console.error(`[WebSocket] Socket error for ${socket.id}:`, error);
      });
    });
  }
  /** * Broadcast a GL balance update to subscribed clients */ public broadcastBalanceUpdate(
    event: GLUpdateEvent,
  ) {
    if (event.accountCode) {
      this.io.to(`account:${event.accountCode}`).emit("gl:balance-update", {
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
      });
      console.log(
        `[WebSocket] Broadcasted balance update for account ${event.accountCode}`,
      );
    }
    if (event.entityId) {
      this.io.to(`entity:${event.entityId}`).emit("gl:balance-update", {
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
      });
    }
  }
  /** * Broadcast transaction posted event */ public broadcastTransactionPosted(
    event: GLUpdateEvent,
  ) {
    if (event.entityId) {
      this.io.to(`entity:${event.entityId}`).emit("gl:transaction-posted", {
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
      });
      console.log(
        `[WebSocket] Broadcasted transaction posted for entity ${event.entityId}`,
      );
    }
  }
  /** * Broadcast consolidation completion event */ public broadcastConsolidationComplete(
    event: GLUpdateEvent,
  ) {
    if (event.entityId) {
      this.io.to(`entity:${event.entityId}`).emit("gl:consolidation-complete", {
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
      });
      console.log(
        `[WebSocket] Broadcasted consolidation complete for entity ${event.entityId}`,
      );
    }
  }
  /** * Send an alert to specific user (if logged in) */ public sendAlertToUser(
    userId: string,
    alert: any,
  ) {
    const sockets = this.io.sockets.sockets;
    for (const [socketId, socket] of sockets) {
      if (this.clientToUserId.get(socketId) === userId) {
        socket.emit("gl:alert", {
          ...alert,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
  /** * Send status update (e.g.,"Live" indicator) */ public broadcastStatus(
    entityId: string,
    status: "live" | "offline",
  ) {
    this.io.to(`entity:${entityId}`).emit("gl:status", {
      status,
      entityId,
      timestamp: new Date().toISOString(),
    });
  }
  /** * Get connected client count */ public getConnectedClientCount(): number {
    return this.io.engine.clientsCount;
  }
  /** * Get active subscriptions count */ public getActiveSubscriptionsCount(): number {
    return Array.from(this.subscriptions.values()).reduce(
      (sum, subs) => sum + subs.length,
      0,
    );
  }
  /** * Get clients subscribed to an entity */ public getClientsForEntity(
    entityId: string,
  ): number {
    const room = this.io.sockets.adapter.rooms.get(`entity:${entityId}`);
    return room ? room.size : 0;
  }
  /** * Graceful shutdown */ public close() {
    console.log("[WebSocket] Shutting down WebSocket service...");
    this.subscriptions.clear();
    this.clientToUserId.clear();
    this.io.close();
  }
} // Singleton instance
let webSocketService: WebSocketService | null = null;
export function initializeWebSocket(httpServer: HTTPServer): WebSocketService {
  if (!webSocketService) {
    webSocketService = new WebSocketService(httpServer);
  }
  return webSocketService;
}
export function getWebSocketService(): WebSocketService {
  if (!webSocketService) {
    throw new Error(
      "WebSocket service not initialized. Call initializeWebSocket first.",
    );
  }
  return webSocketService;
}
