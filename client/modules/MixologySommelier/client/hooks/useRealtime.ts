import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
const WEBSOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
export interface RealTimeEvent {
  type: string;
  venue_id: string;
  timestamp: Date;
  data: any;
  severity?: "info" | "warning" | "critical";
}
interface UseRealtimeOptions {
  venueId: string;
  userId: string;
  onEvent?: (event: RealTimeEvent) => void;
  onSalesUpdate?: (data: any) => void;
  onInventoryUpdate?: (data: any) => void;
  onPricingAdjustment?: (data: any) => void;
  onAlert?: (data: any) => void;
  onSyncStatus?: (data: any) => void;
}
export function useRealtime(options: UseRealtimeOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeConnections, setActiveConnections] = useState(0);
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }
    const socket = io(WEBSOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
    socket.on("connect", () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      socket.emit("subscribe:venue", {
        venue_id: options.venueId,
        user_id: options.userId,
      });
    });
    socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    });
    socket.on("event", (event: RealTimeEvent) => {
      options.onEvent?.(event);
      if (event.type === "sales:update") {
        options.onSalesUpdate?.(event.data);
      } else if (event.type === "inventory:update") {
        options.onInventoryUpdate?.(event.data);
      } else if (event.type === "pricing:adjustment") {
        options.onPricingAdjustment?.(event.data);
      } else if (event.type === "alert") {
        options.onAlert?.(event.data);
      } else if (event.type === "sync:status") {
        options.onSyncStatus?.(event.data);
      }
    });
    socket.on("notification", (notification: any) => {
      console.log("Notification received:", notification);
    });
    socket.on("error", (error: any) => {
      console.error("WebSocket error:", error);
    });
    socketRef.current = socket;
  }, [options]);
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("unsubscribe:venue", {
        venue_id: options.venueId,
      });
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, [options.venueId]);
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);
  return { isConnected, activeConnections, socket: socketRef.current };
}
