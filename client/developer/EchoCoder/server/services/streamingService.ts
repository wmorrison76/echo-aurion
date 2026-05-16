import { Express, Request, Response } from "express";
import { WebSocketServer, WebSocket } from "ws";
import { Server as HTTPServer } from "http";

interface StreamConnection {
  id: string;
  userId: string;
  sessionId: string;
  ws: WebSocket;
  createdAt: Date;
}

interface StreamEvent {
  type:
    | "start"
    | "progress"
    | "chunk"
    | "error"
    | "complete"
    | "message"
    | "status";
  sessionId: string;
  userId: string;
  data?: any;
  message?: string;
  progress?: number;
  timestamp: number;
}

class StreamingService {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, StreamConnection> = new Map();
  private sessionSubscribers: Map<string, Set<string>> = new Map();

  initialize(server: HTTPServer) {
    this.wss = new WebSocketServer({ server, path: "/api/stream" });

    this.wss.on("connection", (ws: WebSocket, req: Request) => {
      const userId = req.query.userId as string;
      const sessionId = req.query.sessionId as string;

      if (!userId || !sessionId) {
        ws.close(1008, "Missing userId or sessionId");
        return;
      }

      const connectionId = `${userId}:${sessionId}:${Date.now()}`;
      const connection: StreamConnection = {
        id: connectionId,
        userId,
        sessionId,
        ws,
        createdAt: new Date(),
      };

      this.connections.set(connectionId, connection);

      if (!this.sessionSubscribers.has(sessionId)) {
        this.sessionSubscribers.set(sessionId, new Set());
      }
      this.sessionSubscribers.get(sessionId)!.add(connectionId);

      ws.on("message", (data: any) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(connectionId, message);
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      });

      ws.on("close", () => {
        this.connections.delete(connectionId);
        const subscribers = this.sessionSubscribers.get(sessionId);
        if (subscribers) {
          subscribers.delete(connectionId);
          if (subscribers.size === 0) {
            this.sessionSubscribers.delete(sessionId);
          }
        }
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });

      this.sendEvent({
        type: "start",
        sessionId,
        userId,
        message: "Connected to streaming service",
        timestamp: Date.now(),
      });
    });

    console.log("WebSocket streaming service initialized");
  }

  private handleMessage(connectionId: string, message: any) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    if (message.type === "ping") {
      connection.ws.send(
        JSON.stringify({
          type: "pong",
          timestamp: Date.now(),
        }),
      );
    }
  }

  private getReadyConnections(): WebSocket[] {
    const ready: WebSocket[] = [];
    for (const connection of this.connections.values()) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        ready.push(connection.ws);
      }
    }
    return ready;
  }

  sendEvent(event: StreamEvent) {
    const subscribers = this.sessionSubscribers.get(event.sessionId);
    if (!subscribers) return;

    const message = JSON.stringify(event);

    for (const connectionId of subscribers) {
      const connection = this.connections.get(connectionId);
      if (
        connection &&
        connection.ws.readyState === WebSocket.OPEN &&
        connection.userId === event.userId
      ) {
        connection.ws.send(message);
      }
    }
  }

  broadcastProgress(
    sessionId: string,
    userId: string,
    progress: number,
    message: string,
  ) {
    this.sendEvent({
      type: "progress",
      sessionId,
      userId,
      progress: Math.min(100, Math.max(0, progress)),
      message,
      timestamp: Date.now(),
    });
  }

  broadcastChunk(
    sessionId: string,
    userId: string,
    chunk: string,
    chunkType: string = "code",
  ) {
    this.sendEvent({
      type: "chunk",
      sessionId,
      userId,
      data: {
        chunk,
        chunkType,
      },
      timestamp: Date.now(),
    });
  }

  broadcastStatus(
    sessionId: string,
    userId: string,
    status: string,
    details?: any,
  ) {
    this.sendEvent({
      type: "status",
      sessionId,
      userId,
      message: status,
      data: details,
      timestamp: Date.now(),
    });
  }

  broadcastError(sessionId: string, userId: string, error: string) {
    this.sendEvent({
      type: "error",
      sessionId,
      userId,
      message: error,
      timestamp: Date.now(),
    });
  }

  broadcastComplete(sessionId: string, userId: string, result: any) {
    this.sendEvent({
      type: "complete",
      sessionId,
      userId,
      data: result,
      timestamp: Date.now(),
    });
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getSessionConnections(sessionId: string): number {
    return this.sessionSubscribers.get(sessionId)?.size || 0;
  }

  getStats() {
    return {
      totalConnections: this.connections.size,
      activeSessions: this.sessionSubscribers.size,
      uptime: new Date(),
      connectionsBySession: Array.from(this.sessionSubscribers.entries()).map(
        ([sessionId, subscribers]) => ({
          sessionId,
          subscribers: subscribers.size,
        }),
      ),
    };
  }
}

let streamingInstance: StreamingService | null = null;

export function getStreamingService(): StreamingService {
  if (!streamingInstance) {
    streamingInstance = new StreamingService();
  }
  return streamingInstance;
}

export function initializeStreaming(server: HTTPServer) {
  const service = getStreamingService();
  service.initialize(server);
  return service;
}

export type { StreamConnection, StreamEvent };
