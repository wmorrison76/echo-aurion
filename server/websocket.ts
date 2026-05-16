import { Server, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { websocketOptimizationService } from "./services/websocket-optimization-service";
import { logger } from "./lib/logger";

export let io: Server | null = null;

export interface WorkOrderEvent {
  id: string;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  timestamp: number;
  outlet_id: string;
  data: Record<string, unknown>;
}

export interface ProductionUpdateEvent {
  outlet_id: string;
  timestamp: number;
  workOrders: WorkOrderEvent[];
  metrics: {
    avgCompletionTime: number;
    pendingCount: number;
    completedCount: number;
  };
}

export interface InventoryDeltaEvent {
  outlet_id: string;
  item_id: string;
  qty_change: number;
  timestamp: number;
  reason: string;
}

export interface StaffAssignmentEvent {
  outlet_id: string;
  employee_id: string;
  position: string;
  timestamp: number;
  shift_start: string;
  shift_end: string;
}

// Track active connections per outlet
const outletSockets: Map<string, Set<Socket>> = new Map();
const userSockets: Map<string, Socket> = new Map();

export function initializeWebSocket(server: HTTPServer) {
  const serverIO = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 200, // Optimized: 200ms initial delay
    reconnectionDelayMax: 1000, // Optimized: max 1s delay for <1s target
    reconnectionAttempts: 50,
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000, // 25 seconds (before timeout)
    maxHttpBufferSize: 1e6, // 1MB max message size
  });

  // Initialize Redis adapter for distributed scaling (Disney-level)
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        serverIO.adapter(createAdapter(pubClient, subClient));
        logger.info("[WEBSOCKET] Redis adapter initialized");
      })
      .catch((err) => {
        logger.warn("[WEBSOCKET] Redis adapter initialization failed:", err);
      });
  } else {
    logger.warn(
      "[WEBSOCKET] REDIS_URL not set, running with local adapter (non-scalable)",
    );
  }

  io = serverIO;

  // Initialize optimization service
  websocketOptimizationService.initialize(serverIO);
  logger.info("[WEBSOCKET] Optimization service initialized");

  serverIO.on("connection", (socket: Socket) => {
    logger.info(`[WEBSOCKET] Client connected: ${socket.id}`);

    // Track user connection
    const userId = socket.handshake.query.userId as string;
    if (userId) {
      userSockets.set(userId, socket);
    }

    // Subscribe to outlet updates
    socket.on("subscribe-outlet", (outletId: string) => {
      logger.debug(`[WEBSOCKET] ${socket.id} subscribed to outlet: ${outletId}`);

      // Add socket to outlet group
      if (!outletSockets.has(outletId)) {
        outletSockets.set(outletId, new Set());
      }
      outletSockets.get(outletId)!.add(socket);

      // Join room for targeted broadcasts
      socket.join(`outlet:${outletId}`);
    });

    // Unsubscribe from outlet
    socket.on("unsubscribe-outlet", (outletId: string) => {
      logger.debug(
        `[WEBSOCKET] ${socket.id} unsubscribed from outlet: ${outletId}`,
      );
      outletSockets.get(outletId)?.delete(socket);
      socket.leave(`outlet:${outletId}`);
    });

    // Handle work-order updates from API
    socket.on("work-order-update", (event: WorkOrderEvent) => {
      logger.debug(
        `[WEBSOCKET] Work order update: ${event.id} → ${event.status}`,
      );

      // Use optimized broadcast with queuing and retry
      websocketOptimizationService.broadcast(
        `outlet:${event.outlet_id}`,
        "work-order-updated",
        {
          ...event,
          timestamp: Date.now(),
        },
        {
          priority: "high",
          timeout: 5000,
          retryOnFailure: true,
          maxRetries: 3,
          batch: false,
        }
      );
    });

    // Handle production status updates
    socket.on("production-update", (event: ProductionUpdateEvent) => {
      logger.debug(
        `[WEBSOCKET] Production update for outlet: ${event.outlet_id}`,
      );

      // Use optimized broadcast with batching for high-frequency updates
      websocketOptimizationService.broadcast(
        `outlet:${event.outlet_id}`,
        "production-updated",
        {
          ...event,
          timestamp: Date.now(),
        },
        {
          priority: "medium",
          timeout: 5000,
          retryOnFailure: true,
          batch: true, // Enable batching for production updates
        }
      );

      // Dashboard updates (lower priority)
      websocketOptimizationService.broadcast(
        "dashboard",
        "dashboard-metric-update",
        {
          outlet_id: event.outlet_id,
          metrics: event.metrics,
          timestamp: Date.now(),
        },
        {
          priority: "low",
          batch: true,
        }
      );
    });

    // Handle inventory deltas
    socket.on("inventory-delta", (event: InventoryDeltaEvent) => {
      logger.debug(
        `[WEBSOCKET] Inventory delta: ${event.item_id} ${event.qty_change > 0 ? "+" : ""}${event.qty_change}`,
      );

      websocketOptimizationService.broadcast(
        `outlet:${event.outlet_id}`,
        "inventory-changed",
        {
          ...event,
          timestamp: Date.now(),
        },
        {
          priority: "high",
          timeout: 3000,
          retryOnFailure: true,
          batch: true, // Batch inventory updates for efficiency
        }
      );
    });

    // Handle staff assignments
    socket.on("staff-assignment", (event: StaffAssignmentEvent) => {
      logger.debug(
        `[WEBSOCKET] Staff assignment: ${event.employee_id} → ${event.position}`,
      );

      websocketOptimizationService.broadcast(
        `outlet:${event.outlet_id}`,
        "staff-assigned",
        {
          ...event,
          timestamp: Date.now(),
        },
        {
          priority: "medium",
          timeout: 5000,
          retryOnFailure: true,
        }
      );
    });

    // Handle batch updates (multiple work orders at once)
    socket.on("batch-work-orders", (batch: WorkOrderEvent[]) => {
      logger.debug(`[WEBSOCKET] Batch update: ${batch.length} work orders`);

      // Group by outlet for efficient batching
      const outletBatches = new Map<string, WorkOrderEvent[]>();
      for (const event of batch) {
        if (!outletBatches.has(event.outlet_id)) {
          outletBatches.set(event.outlet_id, []);
        }
        outletBatches.get(event.outlet_id)!.push(event);
      }

      // Send batched updates using optimization service
      for (const [outletId, events] of outletBatches.entries()) {
        websocketOptimizationService.broadcast(
          `outlet:${outletId}`,
          "work-order-updated:batch",
          events.map((event) => ({
            ...event,
            timestamp: Date.now(),
          })),
          {
            priority: "high",
            timeout: 10000,
            retryOnFailure: true,
            batch: true,
          }
        );
      }
    });

    // Health check / ping (handled by optimization service)
    socket.on("ping", () => {
      const pingTime = Date.now();
      socket.emit("pong", { timestamp: pingTime });
    });

    // Handle disconnection
    socket.on("disconnect", (reason: string) => {
      logger.info(`[WEBSOCKET] Client disconnected: ${socket.id}`, { reason });

      // Remove from all outlet subscriptions
      outletSockets.forEach((sockets) => {
        sockets.delete(socket);
      });

      // Remove from user tracking
      if (userId) {
        userSockets.delete(userId);
      }
    });

    // Handle errors
    socket.on("error", (error: Error) => {
      logger.error(`[WEBSOCKET] Socket error: ${error.message}`, { socketId: socket.id, error });
    });
  });

  return serverIO;
}

// Utility functions to emit from server (non-socket context)
// These now use the optimized broadcast service
export function emitWorkOrderUpdate(
  io: Server,
  outletId: string,
  event: WorkOrderEvent,
) {
  websocketOptimizationService.broadcast(
    `outlet:${outletId}`,
    "work-order-updated",
    {
      ...event,
      timestamp: Date.now(),
    },
    {
      priority: "high",
      timeout: 5000,
      retryOnFailure: true,
    }
  );
}

export function emitProductionUpdate(io: Server, event: ProductionUpdateEvent) {
  websocketOptimizationService.broadcast(
    `outlet:${event.outlet_id}`,
    "production-updated",
    {
      ...event,
      timestamp: Date.now(),
    },
    {
      priority: "medium",
      batch: true,
    }
  );

  websocketOptimizationService.broadcast(
    "dashboard",
    "dashboard-metric-update",
    {
      outlet_id: event.outlet_id,
      metrics: event.metrics,
      timestamp: Date.now(),
    },
    {
      priority: "low",
      batch: true,
    }
  );
}

export function emitInventoryDelta(io: Server, event: InventoryDeltaEvent) {
  websocketOptimizationService.broadcast(
    `outlet:${event.outlet_id}`,
    "inventory-changed",
    {
      ...event,
      timestamp: Date.now(),
    },
    {
      priority: "high",
      batch: true,
    }
  );
}

export function emitStaffAssignment(io: Server, event: StaffAssignmentEvent) {
  websocketOptimizationService.broadcast(
    `outlet:${event.outlet_id}`,
    "staff-assigned",
    {
      ...event,
      timestamp: Date.now(),
    },
    {
      priority: "medium",
      retryOnFailure: true,
    }
  );
}

// Get active socket count per outlet
export function getOutletActiveConnections(outletId: string): number {
  return outletSockets.get(outletId)?.size || 0;
}

// Get all active outlets
export function getActiveOutlets(): string[] {
  return Array.from(outletSockets.keys()).filter(
    (id) => (outletSockets.get(id)?.size || 0) > 0,
  );
}
