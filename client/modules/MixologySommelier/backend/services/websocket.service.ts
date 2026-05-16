import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
export interface RealTimeEvent {
  type: string;
  venue_id: string;
  timestamp: Date;
  data: any;
  severity?: "info" | "warning" | "critical";
}
export interface VenueSubscription {
  venue_id: string;
  user_id: string;
  subscriptions: Set<string>;
}
class WebSocketService {
  private io: SocketIOServer | null = null;
  private activeConnections = new Map<string, Set<string>>();
  private venueSubscriptions = new Map<string, VenueSubscription>();
  initialize(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });
    this.io.on("connection", (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);
      socket.on(
        "subscribe:venue",
        (data: { venue_id: string; user_id: string }) => {
          this.subscribeToVenue(socket, data.venue_id, data.user_id);
        },
      );
      socket.on("unsubscribe:venue", (data: { venue_id: string }) => {
        this.unsubscribeFromVenue(socket, data.venue_id);
      });
      socket.on("disconnect", () => {
        this.handleDisconnect(socket);
      });
    });
    console.log("WebSocket service initialized");
  }
  private subscribeToVenue(socket: Socket, venue_id: string, user_id: string) {
    const room = `venue:${venue_id}`;
    socket.join(room);
    if (!this.activeConnections.has(venue_id)) {
      this.activeConnections.set(venue_id, new Set());
    }
    this.activeConnections.get(venue_id)!.add(socket.id);
    const key = `${venue_id}:${user_id}`;
    this.venueSubscriptions.set(key, {
      venue_id,
      user_id,
      subscriptions: new Set(["sales", "inventory", "alerts", "pricing"]),
    });
    console.log(`User ${user_id} subscribed to venue ${venue_id}`);
  }
  private unsubscribeFromVenue(socket: Socket, venue_id: string) {
    const room = `venue:${venue_id}`;
    socket.leave(room);
    const connections = this.activeConnections.get(venue_id);
    if (connections) {
      connections.delete(socket.id);
      if (connections.size === 0) {
        this.activeConnections.delete(venue_id);
      }
    }
    console.log(`User unsubscribed from venue ${venue_id}`);
  }
  private handleDisconnect(socket: Socket) {
    for (const [venue_id, connections] of this.activeConnections) {
      connections.delete(socket.id);
      if (connections.size === 0) {
        this.activeConnections.delete(venue_id);
      }
    }
    console.log(`Client disconnected: ${socket.id}`);
  }
  broadcastEvent(event: RealTimeEvent) {
    if (!this.io) return;
    const room = `venue:${event.venue_id}`;
    this.io
      .to(room)
      .emit("event", { ...event, timestamp: new Date(event.timestamp) });
  }
  broadcastToUser(user_id: string, event: any) {
    if (!this.io) return;
    this.io.to(`user:${user_id}`).emit("notification", event);
  }
  broadcastSalesUpdate(venue_id: string, data: any) {
    this.broadcastEvent({
      type: "sales:update",
      venue_id,
      timestamp: new Date(),
      data,
    });
  }
  broadcastInventoryUpdate(venue_id: string, data: any) {
    this.broadcastEvent({
      type: "inventory:update",
      venue_id,
      timestamp: new Date(),
      data,
      severity: data.low_stock ? "warning" : "info",
    });
  }
  broadcastPricingAdjustment(venue_id: string, data: any) {
    this.broadcastEvent({
      type: "pricing:adjustment",
      venue_id,
      timestamp: new Date(),
      data,
    });
  }
  broadcastAlert(venue_id: string, alert: any) {
    this.broadcastEvent({
      type: "alert",
      venue_id,
      timestamp: new Date(),
      data: alert,
      severity: alert.severity || "warning",
    });
  }
  broadcastSyncStatus(venue_id: string, status: any) {
    this.broadcastEvent({
      type: "sync:status",
      venue_id,
      timestamp: new Date(),
      data: status,
    });
  }
  getActiveConnectionsForVenue(venue_id: string): number {
    return this.activeConnections.get(venue_id)?.size || 0;
  }
  getHealthMetrics() {
    return {
      total_venues: this.activeConnections.size,
      total_connections: Array.from(this.activeConnections.values()).reduce(
        (sum, set) => sum + set.size,
        0,
      ),
      venues: Object.fromEntries(
        Array.from(this.activeConnections).map(([venue_id, connections]) => [
          venue_id,
          connections.size,
        ]),
      ),
    };
  }
}
export default new WebSocketService();
