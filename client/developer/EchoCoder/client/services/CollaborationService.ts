import { nanoid } from "nanoid";

export interface Collaborator {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  cursorX: number;
  cursorY: number;
  color: string;
  isOnline: boolean;
  lastActive: Date;
}

export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  element?: string;
  timestamp: number;
}

export interface PresenceUpdate {
  userId: string;
  status: "online" | "idle" | "offline";
  lastAction?: string;
  editing?: {
    elementId: string;
    property: string;
  };
}

export interface CollaborationEvent {
  id: string;
  type:
    | "cursor"
    | "element-add"
    | "element-update"
    | "element-delete"
    | "selection"
    | "comment"
    | "presence";
  userId: string;
  fileId: string;
  data: any;
  timestamp: number;
}

export interface CommentThread {
  id: string;
  elementId: string;
  x: number;
  y: number;
  comments: Comment[];
  resolved: boolean;
  createdAt: Date;
  createdBy: string;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  edited: boolean;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  description: string;
  details: any;
  timestamp: Date;
}

class CollaborationService {
  private ws: WebSocket | null = null;
  private collaborators: Map<string, Collaborator> = new Map();
  private listeners: Map<string, Function[]> = new Map();
  private eventQueue: CollaborationEvent[] = [];
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sessionId = nanoid();

  constructor() {
    this.loadFromStorage();
  }

  // Connection Management
  async connect(
    fileId: string,
    userId: string,
    token: string,
  ): Promise<boolean> {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/collaboration/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.sendMessage("join", {
          fileId,
          userId,
          token,
          sessionId: this.sessionId,
        });
        this.startHeartbeat();
        this.emit("connected", { fileId, userId });
        this.processEventQueue();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.emit("error", error);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopHeartbeat();
        this.emit("disconnected", {});
        this.attemptReconnect(fileId, userId, token);
      };

      return true;
    } catch (error) {
      console.error("Connection failed:", error);
      return false;
    }
  }

  private attemptReconnect(fileId: string, userId: string, token: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect(fileId, userId, token);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopHeartbeat();
    this.isConnected = false;
  }

  // Heartbeat to keep connection alive
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendMessage("ping", {});
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Message handling
  private handleMessage(message: any): void {
    const { type, data } = message;

    switch (type) {
      case "cursor":
        this.handleCursorUpdate(data);
        break;
      case "presence":
        this.handlePresenceUpdate(data);
        break;
      case "element-update":
        this.handleElementUpdate(data);
        break;
      case "selection":
        this.handleSelectionUpdate(data);
        break;
      case "comment":
        this.handleComment(data);
        break;
      case "collaborators":
        this.handleCollaboratorsList(data);
        break;
      case "pong":
        this.emit("pong", {});
        break;
      default:
        this.emit("message", message);
    }
  }

  private handleCursorUpdate(data: CursorPosition): void {
    const collaborator = this.collaborators.get(data.userId);
    if (collaborator) {
      collaborator.cursorX = data.x;
      collaborator.cursorY = data.y;
      collaborator.lastActive = new Date();
      this.emit("cursor-update", data);
    }
  }

  private handlePresenceUpdate(data: PresenceUpdate): void {
    const collaborator = this.collaborators.get(data.userId);
    if (collaborator) {
      collaborator.isOnline = data.status !== "offline";
      collaborator.lastActive = new Date();
      this.emit("presence-update", data);
    }
  }

  private handleElementUpdate(data: any): void {
    this.emit("element-update", data);
  }

  private handleSelectionUpdate(data: any): void {
    this.emit("selection-update", data);
  }

  private handleComment(data: any): void {
    this.emit("comment", data);
  }

  private handleCollaboratorsList(data: Collaborator[]): void {
    this.collaborators.clear();
    data.forEach((collaborator) => {
      this.collaborators.set(collaborator.userId, {
        ...collaborator,
        lastActive: new Date(collaborator.lastActive),
      });
    });
    this.emit("collaborators-updated", data);
  }

  // Sending updates
  private sendMessage(type: string, data: any): void {
    if (this.isConnected && this.ws) {
      try {
        this.ws.send(JSON.stringify({ type, data }));
      } catch (error) {
        console.error("Failed to send message:", error);
        this.eventQueue.push({
          id: nanoid(),
          type: type as any,
          userId: "",
          fileId: "",
          data,
          timestamp: Date.now(),
        });
      }
    } else {
      this.eventQueue.push({
        id: nanoid(),
        type: type as any,
        userId: "",
        fileId: "",
        data,
        timestamp: Date.now(),
      });
    }
  }

  updateCursor(x: number, y: number, element?: string): void {
    this.sendMessage("cursor", { x, y, element, timestamp: Date.now() });
  }

  updatePresence(
    status: "online" | "idle" | "offline",
    lastAction?: string,
  ): void {
    this.sendMessage("presence", { status, lastAction, timestamp: Date.now() });
  }

  updateElement(elementId: string, updates: any): void {
    this.sendMessage("element-update", {
      elementId,
      updates,
      timestamp: Date.now(),
    });
  }

  updateSelection(selectedIds: string[]): void {
    this.sendMessage("selection", { selectedIds, timestamp: Date.now() });
  }

  addComment(elementId: string, x: number, y: number, content: string): void {
    this.sendMessage("comment", {
      elementId,
      x,
      y,
      content,
      timestamp: Date.now(),
    });
  }

  replyToComment(threadId: string, content: string): void {
    this.sendMessage("comment-reply", {
      threadId,
      content,
      timestamp: Date.now(),
    });
  }

  resolveCommentThread(threadId: string): void {
    this.sendMessage("comment-resolve", { threadId, timestamp: Date.now() });
  }

  // Collaborator Management
  getCollaborators(): Collaborator[] {
    return Array.from(this.collaborators.values());
  }

  getCollaborator(userId: string): Collaborator | undefined {
    return this.collaborators.get(userId);
  }

  getOnlineCollaborators(): Collaborator[] {
    return Array.from(this.collaborators.values()).filter((c) => c.isOnline);
  }

  getCollaboratorCount(): number {
    return this.collaborators.size;
  }

  // Activity Logging
  logActivity(action: string, description: string, details: any = {}): void {
    const activity: ActivityLog = {
      id: nanoid(),
      userId: "",
      action,
      description,
      details,
      timestamp: new Date(),
    };

    this.sendMessage("activity-log", activity);
    this.emit("activity", activity);
  }

  // Event Queue Processing
  private processEventQueue(): void {
    while (this.eventQueue.length > 0 && this.isConnected) {
      const event = this.eventQueue.shift();
      if (event) {
        this.sendMessage(event.type, event.data);
      }
    }
  }

  getEventQueueSize(): number {
    return this.eventQueue.length;
  }

  // State Management
  getConnectionStatus(): {
    connected: boolean;
    collaborators: number;
    queueSize: number;
  } {
    return {
      connected: this.isConnected,
      collaborators: this.collaborators.size,
      queueSize: this.eventQueue.length,
    };
  }

  // Event Listeners
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }

  // Storage
  private saveToStorage(): void {
    const collaboratorData = Array.from(this.collaborators.values());
    localStorage.setItem(
      "collaboration-collaborators",
      JSON.stringify(collaboratorData),
    );
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem("collaboration-collaborators");
      if (data) {
        const collaborators = JSON.parse(data) as Collaborator[];
        collaborators.forEach((c) => {
          this.collaborators.set(c.userId, c);
        });
      }
    } catch (error) {
      console.error("Failed to load collaboration data:", error);
    }
  }
}

export const collaborationService = new CollaborationService();
