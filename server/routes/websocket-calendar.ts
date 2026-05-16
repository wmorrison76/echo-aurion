/**
 * WebSocket Calendar Events
 * Real-time calendar updates for multi-user collaboration
 * Broadcasts event changes, conflicts, and status updates
 */

import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";

/**
 * Calendar WebSocket Events
 */
export interface CalendarEventMessage {
  eventId: string;
  outletId: string;
  orgId: string;
  userId: string;
  action: "created" | "updated" | "deleted" | "shared" | "acknowledged";
  data: Record<string, any>;
  timestamp: number;
}

export interface CalendarConflictMessage {
  conflictId: string;
  eventId1: string;
  eventId2: string;
  outletIds: string[];
  orgId: string;
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: number;
}

export interface CalendarSyncMessage {
  orgId: string;
  userId: string;
  eventIds: string[];
  action: "sync-request" | "sync-response";
  data?: Record<string, any>;
  timestamp: number;
}

/**
 * Initialize WebSocket for calendar
 */
export function initializeCalendarWebSocket(
  httpServer: HTTPServer,
): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.VITE_FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    namespace: "/api/calendar",
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 100,
    reconnectionDelayMax: 500,
    reconnectionAttempts: 50,
  });

  /**
   * Authentication middleware
   */
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const userId = socket.handshake.auth.userId;
    const orgId = socket.handshake.auth.orgId;

    if (!token || !userId || !orgId) {
      console.warn("[CalendarWS] Unauthorized connection attempt", {
        socketId: socket.id,
      });
      next(new Error("UNAUTHORIZED"));
      return;
    }

    // Store user context on socket
    socket.data.user = {
      id: userId,
      org_id: orgId,
      role: socket.handshake.auth.role || "member",
      outlet_ids: socket.handshake.auth.outlet_ids || [],
    };

    next();
  });

  /**
   * Connection handler
   */
  io.on("connection", (socket: Socket) => {
    console.log("[CalendarWS] Client connected", {
      socketId: socket.id,
      userId: socket.data.user?.id,
    });

    /**
     * Subscribe to calendar updates for specific org
     */
    socket.on(
      "subscribe-org",
      (payload: { org_id: string }, ack?: Function) => {
        try {
          const user = socket.data.user;
          const { org_id } = payload;

          // Verify org access
          if (user.org_id !== org_id) {
            console.warn("[CalendarWS] Org access denied", {
              userId: user.id,
              org_id,
            });
            ack?.({
              error: "ORG_ACCESS_DENIED",
              message: "You do not have access to this organization",
            });
            return;
          }

          // Join socket to org room
          const roomId = `calendar:org:${org_id}`;
          socket.join(roomId);

          console.log("[CalendarWS] Subscribed to org", {
            socketId: socket.id,
            roomId,
            org_id,
          });

          ack?.({
            success: true,
            message: "Subscribed to org calendar",
            roomId,
          });
        } catch (error) {
          console.error("[CalendarWS] Error subscribing to org:", error);
          ack?.({
            error: "SUBSCRIPTION_FAILED",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      },
    );

    /**
     * Subscribe to outlet-specific events
     */
    socket.on(
      "subscribe-outlet",
      (payload: { outlet_id: string }, ack?: Function) => {
        try {
          const user = socket.data.user;
          const { outlet_id } = payload;

          // Verify outlet access
          if (!user.outlet_ids.includes(outlet_id)) {
            console.warn("[CalendarWS] Outlet access denied", {
              userId: user.id,
              outlet_id,
            });
            ack?.({
              error: "OUTLET_ACCESS_DENIED",
              message: "You do not have access to this outlet",
            });
            return;
          }

          // Join socket to outlet room
          const roomId = `calendar:outlet:${outlet_id}`;
          socket.join(roomId);

          console.log("[CalendarWS] Subscribed to outlet", {
            socketId: socket.id,
            roomId,
            outlet_id,
          });

          ack?.({
            success: true,
            message: "Subscribed to outlet calendar",
            roomId,
          });
        } catch (error) {
          console.error("[CalendarWS] Error subscribing to outlet:", error);
          ack?.({
            error: "SUBSCRIPTION_FAILED",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      },
    );

    /**
     * Subscribe to event-specific updates
     */
    socket.on(
      "subscribe-event",
      (payload: { event_id: string }, ack?: Function) => {
        try {
          const { event_id } = payload;

          const roomId = `calendar:event:${event_id}`;
          socket.join(roomId);

          console.log("[CalendarWS] Subscribed to event", {
            socketId: socket.id,
            roomId,
            event_id,
          });

          ack?.({
            success: true,
            message: "Subscribed to event updates",
            roomId,
          });
        } catch (error) {
          console.error("[CalendarWS] Error subscribing to event:", error);
          ack?.({
            error: "SUBSCRIPTION_FAILED",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      },
    );

    /**
     * Unsubscribe from org
     */
    socket.on("unsubscribe-org", (payload: { org_id: string }) => {
      const { org_id } = payload;
      const roomId = `calendar:org:${org_id}`;
      socket.leave(roomId);
      console.log("[CalendarWS] Unsubscribed from org", { org_id });
    });

    /**
     * Unsubscribe from outlet
     */
    socket.on("unsubscribe-outlet", (payload: { outlet_id: string }) => {
      const { outlet_id } = payload;
      const roomId = `calendar:outlet:${outlet_id}`;
      socket.leave(roomId);
      console.log("[CalendarWS] Unsubscribed from outlet", { outlet_id });
    });

    /**
     * Unsubscribe from event
     */
    socket.on("unsubscribe-event", (payload: { event_id: string }) => {
      const { event_id } = payload;
      const roomId = `calendar:event:${event_id}`;
      socket.leave(roomId);
      console.log("[CalendarWS] Unsubscribed from event", { event_id });
    });

    /**
     * Handle disconnection
     */
    socket.on("disconnect", () => {
      console.log("[CalendarWS] Client disconnected", {
        socketId: socket.id,
        userId: socket.data.user?.id,
      });
    });
  });

  return io;
}

/**
 * Broadcast calendar event to org
 */
export function broadcastCalendarEvent(
  io: SocketIOServer,
  orgId: string,
  event: CalendarEventMessage,
) {
  const roomId = `calendar:org:${orgId}`;
  io.to(roomId).emit("calendar-event", event);
  console.log("[CalendarWS] Broadcast event", {
    roomId,
    eventId: event.eventId,
    action: event.action,
  });
}

/**
 * Broadcast to outlet
 */
export function broadcastOutletEvent(
  io: SocketIOServer,
  outletId: string,
  event: CalendarEventMessage,
) {
  const roomId = `calendar:outlet:${outletId}`;
  io.to(roomId).emit("calendar-event", event);
  console.log("[CalendarWS] Broadcast to outlet", {
    roomId,
    eventId: event.eventId,
  });
}

/**
 * Broadcast conflict detection
 */
export function broadcastConflict(
  io: SocketIOServer,
  orgId: string,
  conflict: CalendarConflictMessage,
) {
  const roomId = `calendar:org:${orgId}`;
  io.to(roomId).emit("calendar-conflict", conflict);
  console.log("[CalendarWS] Broadcast conflict", {
    roomId,
    conflictId: conflict.conflictId,
  });
}

/**
 * Broadcast conflict resolution
 */
export function broadcastConflictResolution(
  io: SocketIOServer,
  orgId: string,
  conflictId: string,
  resolution: { resolved_at: string; resolution_notes: string },
) {
  const roomId = `calendar:org:${orgId}`;
  io.to(roomId).emit("calendar-conflict-resolved", {
    conflictId,
    ...resolution,
    timestamp: Date.now(),
  });
  console.log("[CalendarWS] Broadcast conflict resolution", {
    roomId,
    conflictId,
  });
}

/**
 * Sync event to all users
 */
export function syncEventToClients(
  io: SocketIOServer,
  eventId: string,
  eventData: Record<string, any>,
) {
  const roomId = `calendar:event:${eventId}`;
  io.to(roomId).emit("calendar-event-sync", {
    eventId,
    data: eventData,
    timestamp: Date.now(),
  });
  console.log("[CalendarWS] Sync event to clients", { eventId });
}

export default initializeCalendarWebSocket;
