/** * useCalendarWebSocket Hook * Manages WebSocket connection and real-time calendar updates * Handles subscriptions, event broadcasting, and conflict notifications */ import {
  useEffect,
  useCallback,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useCalendarStore } from "../stores/useCalendarStore";
import { useChangeFeedStore } from "@/stores/useChangeFeedStore";
import { publishEvent, EVENT_TYPES } from "@/modules/MaestroBQT/event-bus";
interface UseCalendarWebSocketOptions {
  enabled?: boolean;
  orgId: string;
  userId: string;
  outletIds?: string[];
  reconnect?: boolean;
}
interface CalendarEventMessage {
  eventId: string;
  outletId: string;
  orgId: string;
  userId: string;
  action: "created" | "updated" | "deleted" | "shared" | "acknowledged";
  data: Record<string, any>;
  timestamp: number;
}
interface CalendarConflictMessage {
  conflictId: string;
  eventId1: string;
  eventId2: string;
  outletIds: string[];
  orgId: string;
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: number;
} /** * Hook to manage WebSocket connection for calendar */
export function useCalendarWebSocket({
  enabled = true,
  orgId,
  userId,
  outletIds = [],
  reconnect = true,
}: UseCalendarWebSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null); // Store actions const setEvents = useCalendarStore((state) => state.setEvents); const setConflicts = useCalendarStore((state) => state.setConflicts); const publishChangeFeed = useChangeFeedStore((state) => state.publish); /** * Initialize WebSocket connection */ const connect = useCallback(() => { if (!enabled || socketRef.current?.connected) { return; } try { console.log("[CalendarWS] Connecting...", { userId, orgId }); const token = localStorage.getItem("auth_token") ||""; socketRef.current = io(`${window.location.origin}/api/calendar`, { auth: { token, userId, orgId, outlet_ids: outletIds, role: localStorage.getItem("user_role") ||"member", }, reconnection: reconnect, reconnectionDelay: 100, reconnectionDelayMax: 500, reconnectionAttempts: 50, transports: ["websocket","polling"], }); const socket = socketRef.current; /** * Connection success */ socket.on("connect", () => { console.log("[CalendarWS] Connected", { socketId: socket.id }); setConnected(true); setError(null); // Subscribe to org calendar socket.emit("subscribe-org", { org_id: orgId }, (ack: any) => { if (ack?.error) { console.error("[CalendarWS] Org subscription failed:", ack.error); setError(ack.message); } else { console.log("[CalendarWS] Org subscription confirmed"); } }); // Subscribe to all accessible outlets outletIds.forEach((outletId) => { socket.emit("subscribe-outlet", { outlet_id: outletId }, (ack: any) => { if (ack?.error) { console.error("[CalendarWS] Outlet subscription failed:", ack.error, ); } else { console.log("[CalendarWS] Outlet subscription confirmed:", outletId, ); } }, ); }); }); /** * Connection error */ socket.on("connect_error", (err) => { console.error("[CalendarWS] Connection error:", err.message); setError(err.message); }); /** * Disconnection */ socket.on("disconnect", () => { console.log("[CalendarWS] Disconnected"); setConnected(false); }); /** * Listen to calendar events */ socket.on("calendar-event", (message: CalendarEventMessage) => { console.log("[CalendarWS] Received event update:", message); handleCalendarEvent(message); }); /** * Listen to conflict detection */ socket.on("calendar-conflict", (conflict: CalendarConflictMessage) => { console.log("[CalendarWS] Received conflict:", conflict); handleConflict(conflict); }); /** * Listen to conflict resolution */ socket.on("calendar-conflict-resolved", (resolution: any) => { console.log("[CalendarWS] Conflict resolved:", resolution); publishChangeFeed({ type:"conflict", action:"resolved", source:"Calendar", severity:"info", message: `Conflict resolved: ${resolution.resolution_notes}`, }); }); /** * Listen to event sync */ socket.on("calendar-event-sync", (sync: any) => { console.log("[CalendarWS] Event sync received:", sync); // Update store with synced event data publishChangeFeed({ type:"event", action:"synchronized", source:"Calendar", severity:"info", message: `Event synchronized: ${sync.eventId}`, }); }); } catch (err) { console.error("[CalendarWS] Connection failed:", err); setError(err instanceof Error ? err.message :"Connection failed"); } }, [enabled, orgId, userId, outletIds, reconnect]); /** * Handle incoming calendar event */ const handleCalendarEvent = useCallback( (message: CalendarEventMessage) => { switch (message.action) { case"created": publishEvent( EVENT_TYPES.EVENT_CREATED, { eventId: message.eventId, outletId: message.outletId, ...message.data, },"Calendar-WS", ); publishChangeFeed({ type:"event", action:"created", source:"Calendar-WS", severity:"info", message: `Event"${message.data.title}" created by ${message.userId}`, }); break; case"updated": publishEvent( EVENT_TYPES.EVENT_UPDATED, { eventId: message.eventId, outletId: message.outletId, ...message.data, },"Calendar-WS", ); publishChangeFeed({ type:"event", action:"updated", source:"Calendar-WS", severity:"info", message: `Event"${message.data.title}" updated by ${message.userId}`, }); break; case"deleted": publishEvent( EVENT_TYPES.EVENT_DELETED, { eventId: message.eventId, outletId: message.outletId },"Calendar-WS", ); publishChangeFeed({ type:"event", action:"deleted", source:"Calendar-WS", severity:"warn", message: `Event"${message.data.title}" deleted by ${message.userId}`, }); break; case"shared": publishChangeFeed({ type:"event", action:"shared", source:"Calendar-WS", severity:"info", message: `Event"${message.data.title}" shared with you by ${message.userId}`, }); break; case"acknowledged": publishChangeFeed({ type:"event", action:"acknowledged", source:"Calendar-WS", severity:"info", message: `Conflict acknowledged on event"${message.data.title}"`, }); break; } }, [publishChangeFeed], ); /** * Handle conflict detection */ const handleConflict = useCallback( (conflict: CalendarConflictMessage) => { // Add to store setConflicts((prev) => [...(prev || []), conflict]); // Publish to Maestro event bus publishEvent( EVENT_TYPES.SPACE_CONFLICT_DETECTED, { conflictId: conflict.conflictId, event1Id: conflict.eventId1, event2Id: conflict.eventId2, severity: conflict.severity, outletIds: conflict.outletIds, },"Calendar-WS", ); // Publish to change feed const severityMap = { critical:"danger", warning:"warn", info:"info", } as const; publishChangeFeed({ type:"conflict", action:"detected", source:"Calendar-WS", severity: severityMap[conflict.severity], message: conflict.message, }); }, [setConflicts, publishChangeFeed], ); /** * Subscribe to specific event updates */ const subscribeToEvent = useCallback((eventId: string) => { if (socketRef.current?.connected) { socketRef.current.emit("subscribe-event", { event_id: eventId }, (ack: any) => { if (ack?.error) { console.error("[CalendarWS] Event subscription failed:", ack.error); } else { console.log("[CalendarWS] Event subscription confirmed:", eventId); } }, ); } }, []); /** * Unsubscribe from event */ const unsubscribeFromEvent = useCallback((eventId: string) => { if (socketRef.current?.connected) { socketRef.current.emit("unsubscribe-event", { event_id: eventId }); } }, []); /** * Disconnect and cleanup */ const disconnect = useCallback(() => { if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; setConnected(false); } }, []); /** * Initialize on mount */ useEffect(() => { if (enabled) { connect(); } return () => { disconnect(); }; }, [enabled, connect, disconnect]); return { connected, error, subscribeToEvent, unsubscribeFromEvent, socket: socketRef.current, };
}
