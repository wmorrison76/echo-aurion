import { WebSocket, Server as WebSocketServer } from "ws";
export interface UserPresence {
  userId: string;
  userName: string;
  userColor: string;
  cursorX: number;
  cursorY: number;
  lastActive: number;
}
export interface CollaborationRoom {
  designId: string;
  users: Map<string, UserPresence>;
  createdAt: number;
}
export interface CollaborationMessage {
  type:
    | "presence"
    | "cursor"
    | "layer-change"
    | "layer-add"
    | "layer-delete"
    | "lock"
    | "unlock"
    | "comment";
  payload: any;
  userId: string;
  timestamp: number;
}
const CURSOR_UPDATE_INTERVAL = 100;
const PRESENCE_TIMEOUT = 30000;
const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
];
class WebSocketManager {
  private wss: WebSocketServer;
  private rooms: Map<string, CollaborationRoom> = new Map();
  private userConnections: Map<string, WebSocket> = new Map();
  private presenceIntervals: Map<string, NodeJS.Timeout> = new Map();
  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupCleanup();
  }
  private getRandomColor(): string {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  }
  handleConnection(ws: WebSocket, userId: string): void {
    ws.on("message", (data: string) => {
      try {
        const message = JSON.parse(data) as CollaborationMessage;
        this.handleMessage(ws, message, userId);
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    });
    ws.on("close", () => {
      this.handleDisconnect(userId);
    });
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      this.handleDisconnect(userId);
    });
  }
  private handleMessage(
    ws: WebSocket,
    message: CollaborationMessage,
    userId: string,
  ): void {
    const { type, payload } = message;
    const { designId } = payload;
    switch (type) {
      case "presence":
        this.handlePresence(ws, userId, designId, payload);
        break;
      case "cursor":
        this.handleCursor(userId, designId, payload);
        break;
      case "layer-change":
        this.broadcastToRoom(designId, userId, message);
        break;
      case "layer-add":
        this.broadcastToRoom(designId, userId, message);
        break;
      case "layer-delete":
        this.broadcastToRoom(designId, userId, message);
        break;
      case "lock":
        this.broadcastToRoom(designId, userId, message);
        break;
      case "unlock":
        this.broadcastToRoom(designId, userId, message);
        break;
      case "comment":
        this.broadcastToRoom(designId, userId, message);
        break;
    }
  }
  private handlePresence(
    ws: WebSocket,
    userId: string,
    designId: string,
    payload: any,
  ): void {
    const { userName } = payload;
    if (!this.rooms.has(designId)) {
      this.rooms.set(designId, {
        designId,
        users: new Map(),
        createdAt: Date.now(),
      });
    }
    const room = this.rooms.get(designId)!;
    const userColor = this.getRandomColor();
    room.users.set(userId, {
      userId,
      userName,
      userColor,
      cursorX: 0,
      cursorY: 0,
      lastActive: Date.now(),
    });
    this.userConnections.set(userId, ws);
    this.broadcastPresence(designId);
    if (this.presenceIntervals.has(userId)) {
      clearInterval(this.presenceIntervals.get(userId)!);
    }
    const interval = setInterval(() => {
      const room = this.rooms.get(designId);
      if (room && room.users.has(userId)) {
        const presence = room.users.get(userId)!;
        presence.lastActive = Date.now();
      }
    }, PRESENCE_TIMEOUT);
    this.presenceIntervals.set(userId, interval);
  }
  private handleCursor(userId: string, designId: string, payload: any): void {
    const { cursorX, cursorY } = payload;
    const room = this.rooms.get(designId);
    if (room && room.users.has(userId)) {
      const presence = room.users.get(userId)!;
      presence.cursorX = cursorX;
      presence.cursorY = cursorY;
    }
    this.broadcastCursor(designId, userId);
  }
  private broadcastPresence(designId: string): void {
    const room = this.rooms.get(designId);
    if (!room) return;
    const presenceData = Array.from(room.users.values()).map((p) => ({
      userId: p.userId,
      userName: p.userName,
      userColor: p.userColor,
    }));
    const message = JSON.stringify({
      type: "presence-update",
      payload: presenceData,
    });
    this.broadcast(designId, message);
  }
  private broadcastCursor(designId: string, userId: string): void {
    const room = this.rooms.get(designId);
    if (!room || !room.users.has(userId)) return;
    const presence = room.users.get(userId)!;
    const message = JSON.stringify({
      type: "cursor-update",
      payload: {
        userId,
        userName: presence.userName,
        userColor: presence.userColor,
        cursorX: presence.cursorX,
        cursorY: presence.cursorY,
      },
    });
    this.broadcast(designId, message);
  }
  private broadcastToRoom(
    designId: string,
    userId: string,
    message: CollaborationMessage,
  ): void {
    const msgStr = JSON.stringify(message);
    this.broadcast(designId, msgStr);
  }
  private broadcast(designId: string, message: string): void {
    const room = this.rooms.get(designId);
    if (!room) return;
    for (const userId of room.users.keys()) {
      const ws = this.userConnections.get(userId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }
  private handleDisconnect(userId: string): void {
    this.userConnections.delete(userId);
    const interval = this.presenceIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.presenceIntervals.delete(userId);
    }
    for (const [designId, room] of this.rooms.entries()) {
      if (room.users.has(userId)) {
        room.users.delete(userId);
        this.broadcastPresence(designId);
        if (room.users.size === 0) {
          this.rooms.delete(designId);
        }
      }
    }
  }
  private setupCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [designId, room] of this.rooms.entries()) {
        for (const [userId, presence] of room.users.entries()) {
          if (now - presence.lastActive > PRESENCE_TIMEOUT) {
            room.users.delete(userId);
            const ws = this.userConnections.get(userId);
            if (ws) {
              ws.close();
            }
          }
        }
        if (room.users.size === 0) {
          this.rooms.delete(designId);
        }
      }
    }, PRESENCE_TIMEOUT);
  }
}
export default WebSocketManager;
