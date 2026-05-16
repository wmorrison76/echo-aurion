import { Router, Request, Response } from "express";
import type { RequestHandler } from "express";

const router = Router();

interface ChatUser {
  id: string;
  name: string;
  status: "online" | "offline" | "away";
  lastSeen: number;
  isLocal: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  senderId: string;
  content: string;
  timestamp: number;
  isLocal: boolean;
  recipientId?: string;
  reactions?: Record<string, string[]>;
  threadId?: string;
  parentMessageId?: string;
  isPinned?: boolean;
}

const users = new Map<string, ChatUser>();
const messages: ChatMessage[] = [];
const USER_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const handleChatInit: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { userName } = req.body;

    if (!userName) {
      return res.status(400).json({ error: "Missing userName" });
    }

    const userId = req.ip || `user-${Math.random().toString(36).substr(2, 9)}`;
    const user: ChatUser = {
      id: userId,
      name: userName,
      status: "online",
      lastSeen: Date.now(),
      isLocal: true,
    };

    users.set(userId, user);

    // Clean up stale users
    const now = Date.now();
    for (const [id, u] of users.entries()) {
      if (now - u.lastSeen > USER_TIMEOUT && u.id !== userId) {
        users.set(id, { ...u, status: "offline" });
      }
    }

    res.json({
      success: true,
      userId,
      user,
    });
  } catch (error) {
    console.error("Chat init error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Chat initialization failed",
    });
  }
};

const handleGetUsers: RequestHandler = async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    const userList = Array.from(users.values()).map(u => ({
      ...u,
      status: now - u.lastSeen > USER_TIMEOUT ? "offline" : u.status,
    }));

    res.json({
      users: userList,
      count: userList.length,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get users",
    });
  }
};

const handleGetMessages: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { limit = 100, days = 1 } = req.query;
    const cutoffTime = Date.now() - (Number(days) * 24 * 60 * 60 * 1000);

    const recentMessages = messages
      .filter(m => m.timestamp > cutoffTime)
      .slice(-Number(limit));

    res.json({
      messages: recentMessages,
      total: messages.length,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get messages",
    });
  }
};

const handlePostMessage: RequestHandler = async (req: Request, res: Response) => {
  try {
    const message = req.body as ChatMessage;

    if (!message.sender || !message.content) {
      return res.status(400).json({
        error: "Missing required fields: sender, content",
      });
    }

    const newMessage: ChatMessage = {
      ...message,
      id: message.id || `msg-${Date.now()}`,
      timestamp: message.timestamp || Date.now(),
      isLocal: true,
    };

    messages.push(newMessage);

    // Keep only last 1000 messages in memory
    if (messages.length > 1000) {
      messages.shift();
    }

    // Update user's lastSeen time
    const userId = req.ip || "unknown";
    const user = users.get(userId);
    if (user) {
      users.set(userId, { ...user, lastSeen: Date.now(), status: "online" });
    }

    res.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error("Post message error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to post message",
    });
  }
};

const handleClearMessages: RequestHandler = async (req: Request, res: Response) => {
  try {
    const cleared = messages.length;
    messages.length = 0;

    res.json({
      success: true,
      cleared,
    });
  } catch (error) {
    console.error("Clear messages error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to clear messages",
    });
  }
};

const handleAddReaction: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { messageId, emoji, userId } = req.body;

    const message = messages.find((m) => m.id === messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (!message.reactions) {
      message.reactions = {};
    }

    if (!message.reactions[emoji]) {
      message.reactions[emoji] = [];
    }

    if (!message.reactions[emoji].includes(userId)) {
      message.reactions[emoji].push(userId);
    }

    res.json({ success: true, message });
  } catch (error) {
    console.error("Add reaction error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to add reaction",
    });
  }
};

const handleRemoveReaction: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { messageId, emoji, userId } = req.body;

    const message = messages.find((m) => m.id === messageId);
    if (!message || !message.reactions || !message.reactions[emoji]) {
      return res.status(404).json({ error: "Reaction not found" });
    }

    message.reactions[emoji] = message.reactions[emoji].filter((id) => id !== userId);

    if (message.reactions[emoji].length === 0) {
      delete message.reactions[emoji];
    }

    res.json({ success: true, message });
  } catch (error) {
    console.error("Remove reaction error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to remove reaction",
    });
  }
};

const handlePinMessage: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { messageId, isPinned } = req.body;

    const message = messages.find((m) => m.id === messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    message.isPinned = isPinned;

    res.json({ success: true, message });
  } catch (error) {
    console.error("Pin message error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to pin message",
    });
  }
};

const handleGetThreadReplies: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    const replies = messages.filter((m) => m.parentMessageId === messageId);

    res.json({
      replies,
      count: replies.length,
    });
  } catch (error) {
    console.error("Get thread replies error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get thread replies",
    });
  }
};

const handlePostThreadReply: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const reply = req.body as ChatMessage;

    const parentMessage = messages.find((m) => m.id === messageId);
    if (!parentMessage) {
      return res.status(404).json({ error: "Parent message not found" });
    }

    const newReply: ChatMessage = {
      ...reply,
      id: reply.id || `msg-${Date.now()}`,
      timestamp: reply.timestamp || Date.now(),
      isLocal: true,
      parentMessageId: messageId,
    };

    messages.push(newReply);

    if (!parentMessage.threadCount) {
      parentMessage.threadCount = 0;
    }
    parentMessage.threadCount++;

    res.json({
      success: true,
      message: newReply,
    });
  } catch (error) {
    console.error("Post thread reply error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to post thread reply",
    });
  }
};

const handleAddUserToChat: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({ error: "Missing userId or userName" });
    }

    const user: ChatUser = {
      id: userId,
      name: userName,
      status: "online",
      lastSeen: Date.now(),
      isLocal: true,
    };

    users.set(userId, user);

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Add user error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to add user",
    });
  }
};

const handleRemoveUserFromChat: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    users.delete(userId);

    res.json({
      success: true,
    });
  } catch (error) {
    console.error("Remove user error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to remove user",
    });
  }
};

router.post("/chat/init", handleChatInit);
router.get("/chat/users", handleGetUsers);
router.get("/chat/messages", handleGetMessages);
router.post("/chat/messages", handlePostMessage);
router.post("/chat/clear", handleClearMessages);

// Reactions
router.post("/chat/messages/:messageId/reactions", handleAddReaction);
router.delete("/chat/messages/:messageId/reactions", handleRemoveReaction);

// Pin messages
router.put("/chat/messages/:messageId/pin", handlePinMessage);

// Threads
router.get("/chat/messages/:messageId/replies", handleGetThreadReplies);
router.post("/chat/messages/:messageId/replies", handlePostThreadReply);

// User management
router.post("/chat/users/add", handleAddUserToChat);
router.post("/chat/users/remove", handleRemoveUserFromChat);

export default router;
