import express, { Router, Request, Response } from "express";
import {
  verifySupabaseAuth,
  auditLog,
  AuthenticatedRequest,
} from "../middleware/supabaseAuth";
import { rateLimiter, tierBasedRateLimiter } from "../middleware/rateLimiter";
import { featureGate } from "../middleware/featureGate";

// Use environment variable directly - ECHO_OPENAI_API_KEY is set during build
const ECHO_OPENAI_API_KEY = process.env.ECHO_OPENAI_API_KEY;

const router = Router();

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
}

interface ChatResponse {
  success: boolean;
  message: string;
  cost?: number;
}

// Initialize message history (in production, use database)
const conversationHistory: { [key: string]: ChatMessage[] } = {};

/**
 * POST /api/chat
 * Send a message to the AI chat
 * Requires: Authentication + Feature gate
 */
router.post(
  "/",
  verifySupabaseAuth,
  rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  }),
  featureGate("chat"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || !req.org_id) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      if (!ECHO_OPENAI_API_KEY) {
        res.status(500).json({ error: "Chat service not configured" });
        return;
      }

      const { messages } = req.body as ChatRequest;

      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "Invalid messages format" });
        return;
      }

      // Initialize conversation history if needed
      const conversationKey = `${req.org_id}:${req.user.id}`;
      if (!conversationHistory[conversationKey]) {
        conversationHistory[conversationKey] = [];
      }

      // Add new messages to history
      conversationHistory[conversationKey].push(...messages);

      // Limit history to last 20 messages to save tokens
      if (conversationHistory[conversationKey].length > 20) {
        conversationHistory[conversationKey] =
          conversationHistory[conversationKey].slice(-20);
      }

      // Call OpenAI API
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ECHO_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4-turbo-preview",
            messages: conversationHistory[conversationKey],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("OpenAI API error:", error);
        res.status(response.status).json({
          error: "AI service error",
          message: error.error?.message || "Unknown error",
        });
        return;
      }

      const data = (await response.json()) as any;
      const assistantMessage = data.choices[0]?.message;

      if (assistantMessage) {
        conversationHistory[conversationKey].push(assistantMessage);
      }

      // Calculate API cost (rough estimate)
      const promptTokens = data.usage?.prompt_tokens || 0;
      const completionTokens = data.usage?.completion_tokens || 0;
      const cost = (promptTokens * 0.01 + completionTokens * 0.03) / 1000; // Rough estimate

      // Audit log
      await auditLog(req.org_id, req.user.id, "chat_message", "message", null, {
        promptTokens,
        completionTokens,
        cost,
      });

      res.json({
        success: true,
        message: assistantMessage?.content || "",
        cost,
      } as ChatResponse);
    } catch (error) {
      console.error("Chat error:", error);

      if (req.user && req.org_id) {
        await auditLog(
          req.org_id,
          req.user.id,
          "chat_message",
          "message",
          null,
          null,
          "failure",
          (error as Error).message,
        );
      }

      res.status(500).json({
        error: "Chat failed",
        message: (error as Error).message,
      } as ChatResponse);
    }
  },
);

/**
 * GET /api/chat/history
 * Get conversation history
 * Requires: Authentication
 */
router.get(
  "/history",
  verifySupabaseAuth,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      if (!req.user || !req.org_id) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const conversationKey = `${req.org_id}:${req.user.id}`;
      const history = conversationHistory[conversationKey] || [];

      res.json({
        success: true,
        messages: history,
      });
    } catch (error) {
      console.error("History retrieval error:", error);
      res.status(500).json({
        error: "Failed to retrieve history",
      });
    }
  },
);

/**
 * DELETE /api/chat/history
 * Clear conversation history
 * Requires: Authentication
 */
router.delete(
  "/history",
  verifySupabaseAuth,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      if (!req.user || !req.org_id) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const conversationKey = `${req.org_id}:${req.user.id}`;
      delete conversationHistory[conversationKey];

      res.json({
        success: true,
        message: "History cleared",
      });
    } catch (error) {
      console.error("History deletion error:", error);
      res.status(500).json({
        error: "Failed to clear history",
      });
    }
  },
);

export default router;
