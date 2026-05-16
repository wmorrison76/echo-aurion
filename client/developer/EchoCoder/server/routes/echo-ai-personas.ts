import express, { Router, Request, Response } from "express";
import { EchoMultiPersonaService } from "../services/echoMultiPersonaService";

const router = express.Router();

// Singleton instance
let personaService: EchoMultiPersonaService | null = null;

function getPersonaService(): EchoMultiPersonaService {
  if (!personaService) {
    personaService = new EchoMultiPersonaService();
  }
  return personaService;
}

/**
 * POST /api/echo-ai/process-message
 * Process user message through multi-persona AI
 * Body: { message: string, persona: PersonaType, conversationContext: Message[] }
 */
router.post("/process-message", async (req: Request, res: Response) => {
  try {
    const {
      message,
      persona = "developer",
      conversationContext = [],
    } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Message is required and must be a string",
      });
    }

    const service = getPersonaService();

    // Switch to requested persona
    service.switchPersona(persona);

    // Process message with context
    const response = await service.processMessage(message, {
      conversationHistory: conversationContext,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      response: response.content,
      confidence: response.confidence,
      persona: response.persona,
      metadata: {
        processingTime: response.processingTimeMs,
        tokensUsed: response.tokensUsed,
      },
    });
  } catch (error: any) {
    console.error("Message processing error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to process message",
    });
  }
});

/**
 * POST /api/echo-ai/switch-persona
 * Switch to a different persona
 * Body: { persona: PersonaType }
 */
router.post("/switch-persona", async (req: Request, res: Response) => {
  try {
    const { persona } = req.body;

    if (!persona) {
      return res.status(400).json({
        success: false,
        error: "Persona is required",
      });
    }

    const service = getPersonaService();
    const config = service.switchPersona(persona);

    res.json({
      success: true,
      persona: config.name,
      description: config.systemPrompt.substring(0, 200),
      expertise: config.expertise,
      capabilities: config.capabilities,
    });
  } catch (error: any) {
    console.error("Persona switch error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to switch persona",
    });
  }
});

/**
 * GET /api/echo-ai/personas
 * Get list of all available personas
 */
router.get("/personas", async (req: Request, res: Response) => {
  try {
    const service = getPersonaService();
    const personas = service.getAvailablePersonas();

    res.json({
      success: true,
      personas: personas.map((p) => ({
        id: p.id,
        name: p.config.name,
        description: p.config.systemPrompt.substring(0, 150),
        expertise: p.config.expertise,
        tone: p.config.tone,
      })),
    });
  } catch (error: any) {
    console.error("Get personas error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get personas",
    });
  }
});

/**
 * POST /api/echo-ai/clear-context
 * Clear conversation history for current persona
 */
router.post("/clear-context", async (req: Request, res: Response) => {
  try {
    const service = getPersonaService();
    service.clearConversationHistory();

    res.json({
      success: true,
      message: "Conversation history cleared",
    });
  } catch (error: any) {
    console.error("Clear context error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to clear context",
    });
  }
});

/**
 * GET /api/echo-ai/persona-stats
 * Get current persona statistics
 */
router.get("/persona-stats", async (req: Request, res: Response) => {
  try {
    const service = getPersonaService();
    const stats = service.getPersonaStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error("Persona stats error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get persona stats",
    });
  }
});

export default router;
