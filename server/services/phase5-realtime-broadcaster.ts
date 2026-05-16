import { Server as SocketIOServer, Socket } from "socket.io";
import { logger } from "../lib/logger";

export interface CollaborationEvent {
  id: string;
  taskId: string;
  eventType: string;
  description: string;
  data?: Record<string, any>;
  triggeredBy: string;
  triggeredAt: string;
}

export interface CollaborationRoom {
  taskId: string;
  departmentId: string;
  orgId: string;
  connectedUsers: Map<string, string>; // userId -> socketId
}

class Phase5RealtimeBroadcaster {
  private io: SocketIOServer | null = null;
  private rooms: Map<string, CollaborationRoom> = new Map();
  private userSockets: Map<string, Socket> = new Map();

  /**
   * Initialize WebSocket server
   */
  initialize(io: SocketIOServer): void {
    this.io = io;

    io.on("connection", (socket: Socket) => {
      logger.info("[Phase5] User connected to real-time broadcast", {
        socketId: socket.id,
      });

      // Join a task collaboration room
      socket.on(
        "join-task",
        (
          data: { taskId: string; departmentId: string; orgId: string },
          callback,
        ) => {
          this.handleJoinTask(socket, data, callback);
        },
      );

      // Leave task room
      socket.on("leave-task", (data: { taskId: string }) => {
        this.handleLeaveTask(socket, data);
      });

      // Disconnect
      socket.on("disconnect", () => {
        logger.info("[Phase5] User disconnected from real-time broadcast", {
          socketId: socket.id,
        });
        this.userSockets.delete(socket.id);
      });
    });

    logger.info("[Phase5] Real-time broadcaster initialized with WebSocket");
  }

  /**
   * Handle user joining a task collaboration room
   */
  private handleJoinTask(
    socket: Socket,
    data: { taskId: string; departmentId: string; orgId: string },
    callback: any,
  ): void {
    const roomName = `task-${data.taskId}`;
    socket.join(roomName);

    const room = this.getOrCreateRoom(
      data.taskId,
      data.departmentId,
      data.orgId,
    );
    const userId = socket.handshake.headers["x-user-id"] as string;

    if (userId) {
      room.connectedUsers.set(userId, socket.id);
      this.userSockets.set(socket.id, socket);
    }

    logger.info("[Phase5] User joined task room", {
      taskId: data.taskId,
      userId,
      roomSize: room.connectedUsers.size,
    });

    // Notify others in room
    this.io?.to(roomName).emit("user-joined", {
      userId,
      connectedUsers: Array.from(room.connectedUsers.keys()),
      timestamp: new Date().toISOString(),
    });

    callback?.({
      success: true,
      connectedUsers: Array.from(room.connectedUsers.keys()),
    });
  }

  /**
   * Handle user leaving a task room
   */
  private handleLeaveTask(socket: Socket, data: { taskId: string }): void {
    const roomName = `task-${data.taskId}`;
    socket.leave(roomName);

    const room = this.rooms.get(data.taskId);
    if (room) {
      const userId = Array.from(room.connectedUsers.entries()).find(
        ([_, socketId]) => socketId === socket.id,
      )?.[0];

      if (userId) {
        room.connectedUsers.delete(userId);

        logger.info("[Phase5] User left task room", {
          taskId: data.taskId,
          userId,
          roomSize: room.connectedUsers.size,
        });

        // Notify others
        this.io?.to(roomName).emit("user-left", {
          userId,
          connectedUsers: Array.from(room.connectedUsers.keys()),
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Broadcast a collaboration event to a task room
   */
  broadcastTaskUpdate(event: CollaborationEvent): void {
    if (!this.io) {
      logger.warn("[Phase5] WebSocket not initialized for broadcast");
      return;
    }

    const roomName = `task-${event.taskId}`;

    this.io.to(roomName).emit("task-update", {
      id: event.id,
      eventType: event.eventType,
      description: event.description,
      data: event.data,
      triggeredBy: event.triggeredBy,
      triggeredAt: event.triggeredAt,
    });

    logger.info("[Phase5] Broadcasted task update", {
      taskId: event.taskId,
      eventType: event.eventType,
    });
  }

  /**
   * Broadcast staff assignment change
   */
  broadcastStaffAssignment(event: {
    taskId: string;
    employeeId: string;
    employeeName: string;
    assignmentStatus: string;
    estimatedHours: number;
    role: string;
  }): void {
    if (!this.io) return;

    const roomName = `task-${event.taskId}`;

    this.io.to(roomName).emit("staff-assigned", {
      ...event,
      timestamp: new Date().toISOString(),
    });

    logger.info("[Phase5] Broadcasted staff assignment", {
      taskId: event.taskId,
      employeeId: event.employeeId,
    });
  }

  /**
   * Broadcast hours update
   */
  broadcastHoursUpdate(event: {
    taskId: string;
    estimatedHours: number;
    actualHours?: number;
    updatedBy: string;
  }): void {
    if (!this.io) return;

    const roomName = `task-${event.taskId}`;

    this.io.to(roomName).emit("hours-updated", {
      ...event,
      timestamp: new Date().toISOString(),
    });

    logger.info("[Phase5] Broadcasted hours update", {
      taskId: event.taskId,
      actualHours: event.actualHours,
    });
  }

  /**
   * Broadcast task status change
   */
  broadcastTaskStatusChange(event: {
    taskId: string;
    newStatus: string;
    previousStatus: string;
    reason?: string;
    updatedBy: string;
  }): void {
    if (!this.io) return;

    const roomName = `task-${event.taskId}`;

    this.io.to(roomName).emit("status-changed", {
      ...event,
      timestamp: new Date().toISOString(),
    });

    logger.info("[Phase5] Broadcasted status change", {
      taskId: event.taskId,
      newStatus: event.newStatus,
    });
  }

  /**
   * Broadcast schedule conflict warning
   */
  broadcastScheduleConflict(event: {
    taskId: string;
    employeeId: string;
    conflictDetails: string;
    suggestedResolution?: string;
  }): void {
    if (!this.io) return;

    const roomName = `task-${event.taskId}`;

    this.io.to(roomName).emit("schedule-conflict", {
      ...event,
      timestamp: new Date().toISOString(),
    });

    logger.info("[Phase5] Broadcasted schedule conflict", {
      taskId: event.taskId,
      employeeId: event.employeeId,
    });
  }

  /**
   * Get room for a task
   */
  private getOrCreateRoom(
    taskId: string,
    departmentId: string,
    orgId: string,
  ): CollaborationRoom {
    if (!this.rooms.has(taskId)) {
      this.rooms.set(taskId, {
        taskId,
        departmentId,
        orgId,
        connectedUsers: new Map(),
      });
    }
    return this.rooms.get(taskId)!;
  }

  /**
   * Get connected users for a task
   */
  getConnectedUsers(taskId: string): string[] {
    const room = this.rooms.get(taskId);
    return room ? Array.from(room.connectedUsers.keys()) : [];
  }

  /**
   * Get room info
   */
  getRoomInfo(taskId: string): CollaborationRoom | undefined {
    return this.rooms.get(taskId);
  }

  /**
   * Send direct message to a user
   */
  sendDirectMessage(
    userId: string,
    eventType: string,
    data: Record<string, any>,
  ): void {
    const sockets = Array.from(this.userSockets.entries())
      .filter(([_, socket]) => {
        const headerUserId = socket.handshake.headers["x-user-id"];
        return headerUserId === userId;
      })
      .map(([_, socket]) => socket);

    sockets.forEach((socket) => {
      socket.emit(eventType, {
        ...data,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastToAll(eventType: string, data: Record<string, any>): void {
    if (!this.io) return;

    this.io.emit(eventType, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}

export const phase5RealtimeBroadcaster = new Phase5RealtimeBroadcaster();
