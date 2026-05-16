/**
 * Advanced Voice Commands API Routes
 * ----------------------------------
 * Additional endpoints for multi-turn conversations, module integration, and advanced features
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { basicAuthMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";
import { getVoiceNLPService } from "../services/voice-nlp-service";

const router = Router();
router.use(basicAuthMiddleware);

// OpenAI client - optional dependency
let openai: any = null;
try {
  const OpenAI = require("openai").default;
  openai = getOpenAIClient();
} catch (error) {
  logger.warn("OpenAI package not available");
}

// ElevenLabs client - optional dependency
let elevenlabs: any = null;
try {
  const ElevenLabs = require("elevenlabs").default;
import { getOpenAIClient } from "../lib/env";
  elevenlabs = process.env.ELEVENLABS_API_KEY
    ? new ElevenLabs({ apiKey: process.env.ELEVENLABS_API_KEY })
    : null;
} catch (error) {
  logger.warn("ElevenLabs package not available");
}

const ConversationQuerySchema = z.object({
  message: z.string().min(1),
  sessionId: z.string(),
  context: z.record(z.any()).optional(),
});

const TextToSpeechSchema = z.object({
  text: z.string().min(1),
  voiceId: z.string().optional(),
  language: z.string().optional(),
});

/**
 * POST /api/voice-commands/conversation
 * Multi-turn conversation endpoint
 */
router.post("/conversation", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    const userId = (req as any).user?.id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const validated = ConversationQuerySchema.parse(req.body);
    const nlpService = getVoiceNLPService();

    // Process command with conversation context
    const nlpResponse = await nlpService.processCommand(
      validated.message,
      userId || "unknown",
      orgId,
      validated.sessionId
    );

    // Generate contextual response based on conversation history
    const contextualResponse = await generateContextualResponse(
      nlpResponse,
      validated.context
    );

    logger.info("[Voice Commands] Multi-turn conversation", {
      orgId,
      sessionId: validated.sessionId,
      intent: nlpResponse.intent.intent,
      historyLength: nlpResponse.context.history.length,
    });

    res.json({
      success: true,
      intent: nlpResponse.intent,
      response: contextualResponse,
      suggestions: nlpResponse.suggestions,
      conversationContext: {
        sessionId: nlpResponse.context.sessionId,
        historyLength: nlpResponse.context.history.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }

    logger.error("[Voice Commands] Conversation error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /api/voice-commands/text-to-speech
 * Generate audio response using ElevenLabs
 */
router.post("/text-to-speech", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    if (!elevenlabs) {
      return res.status(503).json({
        success: false,
        error: "Text-to-speech service not configured",
      });
    }

    const validated = TextToSpeechSchema.parse(req.body);

    // Generate audio using ElevenLabs
    const voiceId = validated.voiceId || "21m00Tcm4TlvDq8ikWAM"; // Default voice

    const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
      text: validated.text,
      model_id: "eleven_multilingual_v2",
    });

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    const audioBuffer = Buffer.concat(chunks);

    logger.info("[Voice Commands] Audio generated", {
      orgId,
      textLength: validated.text.length,
      voiceId,
    });

    // Return audio buffer with appropriate headers
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.length);
    res.send(audioBuffer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors,
      });
    }

    logger.error("[Voice Commands] Text-to-speech error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * DELETE /api/voice-commands/conversation/:sessionId
 * Clear conversation context
 */
router.delete("/conversation/:sessionId", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { sessionId } = req.params;
    const nlpService = getVoiceNLPService();

    nlpService.clearContext(sessionId);

    logger.info("[Voice Commands] Conversation cleared", {
      orgId,
      sessionId,
    });

    res.json({
      success: true,
    });
  } catch (error) {
    logger.error("[Voice Commands] Clear conversation error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/voice-commands/conversation/:sessionId
 * Get conversation context
 */
router.get("/conversation/:sessionId", async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.org_id;
    if (!orgId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { sessionId } = req.params;
    const nlpService = getVoiceNLPService();

    const context = nlpService.getContext(sessionId);

    if (!context) {
      return res.status(404).json({
        success: false,
        error: "Conversation context not found",
      });
    }

    res.json({
      success: true,
      context: {
        sessionId: context.sessionId,
        history: context.history,
        currentIntent: context.currentIntent,
        currentEntities: context.currentEntities,
      },
    });
  } catch (error) {
    logger.error("[Voice Commands] Get conversation error", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * Generate contextual response based on conversation history
 */
async function generateContextualResponse(
  nlpResponse: any,
  additionalContext?: Record<string, any>
): Promise<string> {
  const { intent, context } = nlpResponse;

  // Use GPT-4 to generate contextual response
  try {
    const systemPrompt = `You are an AI assistant for a hospitality operations system.
Generate a natural, conversational response to the user's voice command.

User intent: ${intent.intent}
Category: ${intent.category}
Entities: ${JSON.stringify(intent.entities)}

${context.history.length > 0 ? `Conversation history:\n${context.history.slice(-3).map((t: any) => `User: ${t.userInput}\n${t.intent ? `Intent: ${t.intent.intent}` : ""}`).join("\n\n")}` : ""}

Generate a helpful, concise response (1-2 sentences max).`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: context.history[context.history.length - 1]?.userInput || "" },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0].message.content || "I understand. How can I help you further?";
  } catch (error) {
    logger.error("[Voice Commands] Contextual response generation error", { error });
    // Fallback response
    return `I understand you want to ${intent.intent.replace(/_/g, " ")}. How can I help you with that?`;
  }
}

export default router;
