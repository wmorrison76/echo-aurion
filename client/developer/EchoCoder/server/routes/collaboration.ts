import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "http://localhost:5432",
  process.env.VITE_SUPABASE_ANON_KEY || "test-key",
);

// In-memory collaboration state (for demo; use Redis in production)
interface ClientSession {
  userId: string;
  fileId: string;
  sessionId: string;
  lastActivity: Date;
  name: string;
  email: string;
  color: string;
  isOnline: boolean;
}

interface CollaborationRoom {
  fileId: string;
  clients: Map<string, ClientSession>;
  createdAt: Date;
}

const rooms: Map<string, CollaborationRoom> = new Map();
const clients: Map<string, any> = new Map(); // WebSocket connections

// Generate colors for collaborators
const colors = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
  "#F8B88B",
  "#A3E4D7",
];

function getRandomColor(): string {
  return colors[Math.floor(Math.random() * colors.length)];
}

// Get or create collaboration room
function getOrCreateRoom(fileId: string): CollaborationRoom {
  if (!rooms.has(fileId)) {
    rooms.set(fileId, {
      fileId,
      clients: new Map(),
      createdAt: new Date(),
    });
  }
  return rooms.get(fileId)!;
}

// Broadcast message to all clients in a room
function broadcastToRoom(fileId: string, message: any, excludeUserId?: string) {
  const room = rooms.get(fileId);
  if (!room) return;

  room.clients.forEach((client) => {
    if (excludeUserId && client.userId === excludeUserId) return;

    const ws = clients.get(client.sessionId);
    if (ws && ws.readyState === 1) {
      // WebSocket.OPEN
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    }
  });
}

// Get all collaborators in a room
function getCollaborators(fileId: string): ClientSession[] {
  const room = rooms.get(fileId);
  if (!room) return [];
  return Array.from(room.clients.values());
}

// HTTP endpoint to upgrade to WebSocket
router.get("/ws", (req: Request, res: Response) => {
  // This would be handled by the WebSocket upgrade in the Express server
  res.status(400).send("WebSocket connection required");
});

// ===== COLLABORATION API ENDPOINTS =====

// Get collaborators in a file
router.get("/:fileId/collaborators", async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const collaborators = getCollaborators(fileId);

    return res.status(200).json({
      success: true,
      data: collaborators,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get collaborators",
    });
  }
});

// Save collaboration activity to database
router.post("/activity", async (req: Request, res: Response) => {
  try {
    const { fileId, userId, action, description, details } = req.body;

    const { error } = await supabase
      .from("figma_collaboration_activity")
      .insert({
        file_id: fileId,
        user_id: userId,
        action,
        description,
        details,
        timestamp: new Date(),
      });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Activity logged",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to log activity",
    });
  }
});

// Save comment to database
router.post("/comments", async (req: Request, res: Response) => {
  try {
    const { fileId, elementId, userId, content, x, y } = req.body;

    const { data, error } = await supabase.from("figma_comments").insert({
      file_id: fileId,
      element_id: elementId,
      user_id: userId,
      content,
      x,
      y,
      resolved: false,
      created_at: new Date(),
    });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save comment",
    });
  }
});

// Get comments for a file
router.get("/:fileId/comments", async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    const { data, error } = await supabase
      .from("figma_comments")
      .select("*")
      .eq("file_id", fileId)
      .eq("resolved", false);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get comments",
    });
  }
});

// Resolve comment
router.put(
  "/comments/:commentId/resolve",
  async (req: Request, res: Response) => {
    try {
      const { commentId } = req.params;

      const { error } = await supabase
        .from("figma_comments")
        .update({ resolved: true })
        .eq("id", commentId);

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: "Comment resolved",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to resolve comment",
      });
    }
  },
);

// Track presence
router.post("/presence", async (req: Request, res: Response) => {
  try {
    const { fileId, userId, status, lastAction } = req.body;

    await supabase.from("figma_presence").upsert(
      {
        file_id: fileId,
        user_id: userId,
        status,
        last_action: lastAction,
        last_activity: new Date(),
      },
      {
        onConflict: "file_id,user_id",
      },
    );

    return res.status(200).json({
      success: true,
      message: "Presence updated",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update presence",
    });
  }
});

// Get presence
router.get("/:fileId/presence", async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;

    const { data, error } = await supabase
      .from("figma_presence")
      .select("*")
      .eq("file_id", fileId);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to get presence",
    });
  }
});

export default router;
export {
  ClientSession,
  CollaborationRoom,
  getOrCreateRoom,
  broadcastToRoom,
  getCollaborators,
};
