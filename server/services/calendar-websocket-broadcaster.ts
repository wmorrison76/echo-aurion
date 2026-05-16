/**
 * Calendar WebSocket Broadcaster Service
 * Manages real-time broadcasting of calendar events and conflicts to connected clients
 * Integrates with Socket.io namespaces and rooms
 */

import { Server as SocketIOServer } from "socket.io";
import { CalendarEvent, CalendarConflict } from "@/types/calendar";

/**
 * Global socket.io instance (set during server initialization)
 */
let globalIO: SocketIOServer | null = null;

/**
 * Initialize the broadcaster with the Socket.io instance
 */
export function initializeBroadcaster(io: SocketIOServer) {
  globalIO = io;
  console.log("[CalendarBroadcaster] Initialized");
}

/**
 * Get the Socket.io instance
 */
export function getBroadcasterIO(): SocketIOServer | null {
  return globalIO;
}

/**
 * Broadcast calendar event to organization
 */
export function broadcastCalendarEventToOrg(
  orgId: string,
  event: CalendarEvent,
  action: "created" | "updated" | "deleted",
  userId: string,
) {
  if (!globalIO) {
    console.warn("[CalendarBroadcaster] Socket.io not initialized");
    return;
  }

  const roomId = `calendar:org:${orgId}`;
  const message = {
    eventId: event.id,
    outletId: event.outlet_id,
    orgId,
    userId,
    action,
    data: event,
    timestamp: Date.now(),
  };

  globalIO.to(roomId).emit("calendar-event", message);
  console.log("[CalendarBroadcaster] Sent event to org", {
    roomId,
    eventId: event.id,
    action,
  });
}

/**
 * Broadcast calendar event to specific outlet
 */
export function broadcastCalendarEventToOutlet(
  outletId: string,
  event: CalendarEvent,
  action: "created" | "updated" | "deleted",
  userId: string,
) {
  if (!globalIO) {
    console.warn("[CalendarBroadcaster] Socket.io not initialized");
    return;
  }

  const roomId = `calendar:outlet:${outletId}`;
  const message = {
    eventId: event.id,
    outletId: event.outlet_id,
    orgId: event.org_id,
    userId,
    action,
    data: event,
    timestamp: Date.now(),
  };

  globalIO.to(roomId).emit("calendar-event", message);
  console.log("[CalendarBroadcaster] Sent event to outlet", {
    roomId,
    eventId: event.id,
    action,
  });
}

/**
 * Broadcast conflict detection to organization
 */
export function broadcastConflictDetected(
  orgId: string,
  conflict: CalendarConflict,
  eventId1: string,
  eventId2: string,
  outletIds: string[],
) {
  if (!globalIO) {
    console.warn("[CalendarBroadcaster] Socket.io not initialized");
    return;
  }

  const roomId = `calendar:org:${orgId}`;
  const message = {
    conflictId: conflict.id,
    eventId1,
    eventId2,
    outletIds,
    orgId,
    severity: conflict.severity,
    message: conflict.message,
    conflictType: conflict.conflict_type,
    timestamp: Date.now(),
  };

  globalIO.to(roomId).emit("calendar-conflict", message);

  // Also broadcast to affected outlets
  outletIds.forEach((outletId) => {
    const outletRoomId = `calendar:outlet:${outletId}`;
    globalIO?.to(outletRoomId).emit("calendar-conflict", message);
  });

  console.log("[CalendarBroadcaster] Conflict broadcast", {
    roomId,
    conflictId: conflict.id,
    eventIds: [eventId1, eventId2],
  });
}

/**
 * Broadcast conflict resolution
 */
export function broadcastConflictResolved(
  orgId: string,
  conflictId: string,
  resolution: { resolved_at: string; resolution_notes: string },
) {
  if (!globalIO) {
    console.warn("[CalendarBroadcaster] Socket.io not initialized");
    return;
  }

  const roomId = `calendar:org:${orgId}`;
  const message = {
    conflictId,
    ...resolution,
    timestamp: Date.now(),
  };

  globalIO.to(roomId).emit("calendar-conflict-resolved", message);

  console.log("[CalendarBroadcaster] Conflict resolved broadcast", {
    roomId,
    conflictId,
  });
}

/**
 * Broadcast permission change
 */
export function broadcastPermissionChanged(
  orgId: string,
  eventId: string,
  userId: string,
  accessLevel: string,
) {
  if (!globalIO) {
    console.warn("[CalendarBroadcaster] Socket.io not initialized");
    return;
  }

  const orgRoomId = `calendar:org:${orgId}`;
  const eventRoomId = `calendar:event:${eventId}`;

  const message = {
    eventId,
    userId,
    accessLevel,
    timestamp: Date.now(),
  };

  globalIO.to(orgRoomId).emit("calendar-permission-changed", message);
  globalIO.to(eventRoomId).emit("calendar-permission-changed", message);

  console.log("[CalendarBroadcaster] Permission changed", {
    eventId,
    userId,
    accessLevel,
  });
}

/**
 * Sync event state to specific event subscribers
 */
export function broadcastEventSync(
  eventId: string,
  event: CalendarEvent,
  timestamp: number = Date.now(),
) {
  if (!globalIO) {
    console.warn("[CalendarBroadcaster] Socket.io not initialized");
    return;
  }

  const roomId = `calendar:event:${eventId}`;
  const message = {
    eventId,
    data: event,
    timestamp,
  };

  globalIO.to(roomId).emit("calendar-event-sync", message);

  console.log("[CalendarBroadcaster] Event sync broadcast", { eventId });
}

/**
 * Notify users of event status change
 */
export function broadcastEventStatusChange(
  orgId: string,
  eventId: string,
  oldStatus: string,
  newStatus: string,
  userId: string,
) {
  if (!globalIO) {
    console.warn("[CalendarBroadcaster] Socket.io not initialized");
    return;
  }

  const roomId = `calendar:org:${orgId}`;
  const message = {
    eventId,
    oldStatus,
    newStatus,
    changedBy: userId,
    timestamp: Date.now(),
  };

  globalIO.to(roomId).emit("calendar-event-status-changed", message);

  console.log("[CalendarBroadcaster] Event status changed", {
    eventId,
    oldStatus,
    newStatus,
  });
}

/**
 * Broadcast bulk event update (e.g., from sync)
 */
export function broadcastBulkEventUpdate(
  orgId: string,
  events: CalendarEvent[],
  action: "synced" | "imported",
  userId: string,
) {
  if (!globalIO) {
    console.warn("[CalendarBroadcaster] Socket.io not initialized");
    return;
  }

  const roomId = `calendar:org:${orgId}`;
  const message = {
    eventIds: events.map((e) => e.id),
    eventCount: events.length,
    action,
    userId,
    timestamp: Date.now(),
  };

  globalIO.to(roomId).emit("calendar-bulk-event-update", message);

  console.log("[CalendarBroadcaster] Bulk update broadcast", {
    eventCount: events.length,
    action,
  });
}

export default {
  initializeBroadcaster,
  getBroadcasterIO,
  broadcastCalendarEventToOrg,
  broadcastCalendarEventToOutlet,
  broadcastConflictDetected,
  broadcastConflictResolved,
  broadcastPermissionChanged,
  broadcastEventSync,
  broadcastEventStatusChange,
  broadcastBulkEventUpdate,
};
