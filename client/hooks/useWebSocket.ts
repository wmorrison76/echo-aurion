import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

export interface WebSocketOptions {
  outletId: string;
  userId?: string;
  reconnectionDelay?: number;
  reconnectionAttempts?: number;
  maxOfflineQueueSize?: number;
}

export interface WorkOrderUpdate {
  id: string;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  timestamp: number;
  outlet_id: string;
  data: Record<string, unknown>;
}

export interface ProductionUpdate {
  outlet_id: string;
  timestamp: number;
  workOrders: WorkOrderUpdate[];
  metrics: {
    avgCompletionTime: number;
    pendingCount: number;
    completedCount: number;
  };
}

export interface InventoryChange {
  outlet_id: string;
  item_id: string;
  qty_change: number;
  timestamp: number;
  reason: string;
}

export interface StaffAssignment {
  outlet_id: string;
  employee_id: string;
  position: string;
  timestamp: number;
  shift_start: string;
  shift_end: string;
}

interface QueuedEvent {
  type:
    | "work-order"
    | "production"
    | "inventory"
    | "staff"
    | "batch-work-orders";
  data: any;
  timestamp: number;
}

export function useWebSocket(
  options: WebSocketOptions,
  onWorkOrderUpdate?: (event: WorkOrderUpdate) => void,
  onProductionUpdate?: (event: ProductionUpdate) => void,
  onInventoryChange?: (event: InventoryChange) => void,
  onStaffAssignment?: (event: StaffAssignment) => void,
) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);

  const offlineQueueRef = useRef<QueuedEvent[]>([]);
  const maxQueueSize = options.maxOfflineQueueSize ?? 500;
  const reconnectAttemptsRef = useRef(0);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Process offline queue when reconnected
  const processOfflineQueue = useCallback((socket: Socket) => {
    if (offlineQueueRef.current.length === 0) return;

    console.log(
      `[useWebSocket] Processing offline queue: ${offlineQueueRef.current.length} events`,
    );

    const events = offlineQueueRef.current.splice(0);
    setOfflineQueueSize(0);

    events.forEach((event) => {
      try {
        if (event.type === "batch-work-orders") {
          socket.emit("batch-work-orders", event.data);
        } else if (event.type === "work-order") {
          socket.emit("work-order-update", event.data);
        } else if (event.type === "production") {
          socket.emit("production-update", event.data);
        } else if (event.type === "inventory") {
          socket.emit("inventory-delta", event.data);
        } else if (event.type === "staff") {
          socket.emit("staff-assignment", event.data);
        }
      } catch (err) {
        console.error("[useWebSocket] Error replaying event:", err);
      }
    });
  }, []);

  // Add event to offline queue
  const enqueueEvent = useCallback(
    (type: QueuedEvent["type"], data: any) => {
      if (offlineQueueRef.current.length >= maxQueueSize) {
        // Remove oldest event
        offlineQueueRef.current.shift();
        console.warn(
          `[useWebSocket] Offline queue full, dropping oldest event`,
        );
      }

      offlineQueueRef.current.push({
        type,
        data,
        timestamp: Date.now(),
      });

      setOfflineQueueSize(offlineQueueRef.current.length);
    },
    [maxQueueSize],
  );

  // Initialize WebSocket connection with exponential backoff
  useEffect(() => {
    if (!options.outletId) return;

    const socket = io(
      typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.host}`
        : "http://localhost:3000",
      {
        query: {
          userId: options.userId || "anonymous",
          outletId: options.outletId,
        },
        reconnection: true,
        reconnectionDelay: options.reconnectionDelay || 200, // Optimized: 200ms for <1s target
        reconnectionDelayMax: 1000, // Optimized: max 1s delay
        reconnectionAttempts: options.reconnectionAttempts || 100,
        transports: ["websocket", "polling"], // Prefer WebSocket, fallback to polling
        upgrade: true, // Allow transport upgrades
        rememberUpgrade: true, // Remember successful upgrade
        timeout: 5000, // 5s connection timeout
        forceNew: false, // Reuse existing connection if possible
      },
    );

    socketRef.current = socket;

    // Connection established
    socket.on("connect", () => {
      console.log(`[useWebSocket] Connected: ${socket.id}`);
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;

      // Subscribe to outlet updates
      socket.emit("subscribe-outlet", options.outletId);

      // Process any queued events
      processOfflineQueue(socket);

      // Start optimized heartbeat (faster for <1s target)
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
      const resetHeartbeat = () => {
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
        }
        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn("[useWebSocket] Heartbeat timeout, disconnecting");
          socket.disconnect();
        }, 10000); // Optimized: 10 second timeout (was 15s) for faster failure detection
      };
      resetHeartbeat();
      socket.on("pong", (data: any) => {
        resetHeartbeat();
        // Update latency if timestamp provided
        if (data?.timestamp) {
          const latencyMs = Date.now() - data.timestamp;
          setLatency(latencyMs);
        }
      });
    });

    // Connection lost
    socket.on("disconnect", (reason: string) => {
      console.log(`[useWebSocket] Disconnected: ${reason}`);
      setIsConnected(false);

      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }

      // Don't reconnect if disconnected intentionally
      if (reason === "io client namespace disconnect") {
        return;
      }

      // Log reconnection attempts
      reconnectAttemptsRef.current++;
      if (reconnectAttemptsRef.current % 10 === 0) {
        console.warn(
          `[useWebSocket] Reconnection attempt ${reconnectAttemptsRef.current}...`,
        );
      }
    });

    // Connection error
    socket.on("error", (error: any) => {
      console.error(
        "[useWebSocket] Error:",
        typeof error === "string"
          ? error
          : error?.message || JSON.stringify(error),
      );
    });

    // Work order updates
    if (onWorkOrderUpdate) {
      socket.on("work-order-updated", (event: WorkOrderUpdate) => {
        onWorkOrderUpdate(event);
      });
    }

    // Production updates
    if (onProductionUpdate) {
      socket.on("production-updated", (event: ProductionUpdate) => {
        onProductionUpdate(event);
      });
    }

    // Inventory changes
    if (onInventoryChange) {
      socket.on("inventory-changed", (event: InventoryChange) => {
        onInventoryChange(event);
      });
    }

    // Staff assignments
    if (onStaffAssignment) {
      socket.on("staff-assigned", (event: StaffAssignment) => {
        onStaffAssignment(event);
      });
    }

    // Measure latency with ping/pong (optimized for <1s target)
    pingIntervalRef.current = setInterval(() => {
      if (socket.connected) {
        const pingTime = Date.now();
        socket.emit("ping", { timestamp: pingTime }, () => {
          const pongTime = Date.now();
          const latencyMs = pongTime - pingTime;
          setLatency(latencyMs);

          // Log if latency exceeds target
          if (latencyMs > 1000) {
            console.warn(`[useWebSocket] High latency detected: ${latencyMs}ms`);
          }
        });
      }
    }, 5000); // Ping every 5 seconds

    // Cleanup
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
      if (socket) {
        socket.emit("unsubscribe-outlet", options.outletId);
        socket.disconnect();
      }
    };
  }, [options.outletId, options.userId, processOfflineQueue]);

  // Emit work order update (queue if offline)
  const updateWorkOrder = useCallback(
    (event: WorkOrderUpdate) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("work-order-update", event);
      } else {
        enqueueEvent("work-order", event);
      }
    },
    [enqueueEvent],
  );

  // Emit production update (queue if offline)
  const updateProduction = useCallback(
    (event: ProductionUpdate) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("production-update", event);
      } else {
        enqueueEvent("production", event);
      }
    },
    [enqueueEvent],
  );

  // Emit inventory delta (queue if offline)
  const updateInventory = useCallback(
    (event: InventoryChange) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("inventory-delta", event);
      } else {
        enqueueEvent("inventory", event);
      }
    },
    [enqueueEvent],
  );

  // Emit staff assignment (queue if offline)
  const assignStaff = useCallback(
    (event: StaffAssignment) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("staff-assignment", event);
      } else {
        enqueueEvent("staff", event);
      }
    },
    [enqueueEvent],
  );

  // Emit batch work orders (queue if offline)
  const updateBatchWorkOrders = useCallback(
    (events: WorkOrderUpdate[]) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("batch-work-orders", events);
      } else {
        enqueueEvent("batch-work-orders", events);
      }
    },
    [enqueueEvent],
  );

  return {
    isConnected,
    latency,
    offlineQueueSize,
    updateWorkOrder,
    updateProduction,
    updateInventory,
    assignStaff,
    updateBatchWorkOrders,
  };
}
