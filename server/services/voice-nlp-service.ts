/**
 * Advanced Voice Commands NLP Service
 * -----------------------------------
 * Provides advanced NLP capabilities for voice commands:
 * - Intent classification
 * - Entity extraction
 * - Multi-turn conversation management
 * - Context awareness
 */

import { logger } from "../lib/logger";

// OpenAI client - optional dependency
let openai: any = null;
try {
  const OpenAI = require("openai").default;
import { getOpenAIClient } from "../lib/env";
  openai = getOpenAIClient();
} catch (error) {
  logger.warn("OpenAI package not available, NLP service will be limited");
}

export interface VoiceIntent {
  intent: string;
  category: string; // "kitchen", "foh", "schedule", "inventory", "finance", etc.
  confidence: number;
  entities: ExtractedEntity[];
  parameters: Record<string, any>;
}

export interface ExtractedEntity {
  type: string; // "date", "time", "quantity", "recipe_name", "employee_name", "table_number", etc.
  value: any;
  confidence: number;
  text: string; // Original text span
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  orgId: string;
  history: ConversationTurn[];
  currentIntent?: string;
  currentEntities?: Record<string, any>;
  operationalState?: Record<string, any>; // Current operational state
}

export interface ConversationTurn {
  id: string;
  userInput: string;
  intent?: VoiceIntent;
  systemResponse?: string;
  timestamp: string;
}

export interface NLPResponse {
  intent: VoiceIntent;
  context: ConversationContext;
  suggestions?: string[]; // Suggested follow-up queries
}

/**
 * Hospitality Intent Taxonomy
 * 50+ intent categories organized hierarchically
 */
export const HOSPITALITY_INTENTS = {
  kitchen: [
    "order_prep",
    "order_status",
    "recipe_query",
    "recipe_cost",
    "ingredient_check",
    "equipment_status",
    "temperature_check",
    "waste_report",
    "prep_list",
    "inventory_check",
  ],
  foh: [
    "reservation_check",
    "reservation_create",
    "table_status",
    "guest_info",
    "order_place",
    "order_modify",
    "payment_process",
    "feedback_collect",
  ],
  schedule: [
    "schedule_view",
    "schedule_create",
    "shift_swap",
    "shift_cover",
    "time_off_request",
    "labor_cost",
    "staff_availability",
    "compliance_check",
  ],
  inventory: [
    "stock_check",
    "stock_order",
    "reorder_recommendation",
    "par_level_check",
    "waste_track",
    "supplier_contact",
    "invoice_match",
    "receiving_update",
  ],
  finance: [
    "cost_query",
    "p_l_query",
    "margin_check",
    "budget_check",
    "expense_report",
    "revenue_report",
    "financial_forecast",
    "invoice_status",
  ],
  general: [
    "help",
    "status",
    "report_generate",
    "settings_change",
    "notification_check",
    "search",
  ],
};

/**
 * Voice Commands NLP Service
 * Advanced NLP processing for hospitality voice commands
 */
export class VoiceNLPService {
  private conversationContexts: Map<string, ConversationContext> = new Map();

  /**
   * Process voice command transcript
   */
  async processCommand(
    transcript: string,
    userId: string,
    orgId: string,
    sessionId?: string
  ): Promise<NLPResponse> {
    // Get or create conversation context
    const context = this.getOrCreateContext(userId, orgId, sessionId);

    // Step 1: Intent Classification
    const intent = await this.classifyIntent(transcript, context);

    // Step 2: Entity Extraction
    const entities = await this.extractEntities(transcript, intent);

    // Step 3: Update intent with entities
    intent.entities = entities;
    intent.parameters = this.buildParameters(entities, context);

    // Step 4: Update conversation context
    context.history.push({
      id: `turn_${Date.now()}`,
      userInput: transcript,
      intent,
      timestamp: new Date().toISOString(),
    });
    context.currentIntent = intent.intent;
    context.currentEntities = intent.parameters;

    // Step 5: Generate response and suggestions
    const suggestions = await this.generateSuggestions(intent, context);

    return {
      intent,
      context,
      suggestions,
    };
  }

  /**
   * Classify intent from transcript
   */
  private async classifyIntent(
    transcript: string,
    context: ConversationContext
  ): Promise<VoiceIntent> {
    try {
      // Use OpenAI GPT-4 for intent classification
      const systemPrompt = `You are an AI assistant specialized in hospitality voice commands. 
Analyze the user's voice command and classify the intent.

Available intent categories:
${Object.entries(HOSPITALITY_INTENTS)
  .map(([category, intents]) => `- ${category}: ${intents.join(", ")}`)
  .join("\n")}

${context.history.length > 0 ? `Conversation history:\n${context.history.slice(-3).map(t => `User: ${t.userInput}\n${t.intent ? `Intent: ${t.intent.intent}` : ""}`).join("\n\n")}` : ""}

Return JSON:
{
  "intent": "specific_intent_name",
  "category": "kitchen|foh|schedule|inventory|finance|general",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");

      return {
        intent: result.intent || "unknown",
        category: result.category || "general",
        confidence: result.confidence || 0.5,
        entities: [],
        parameters: {},
      };
    } catch (error) {
      logger.error("[VoiceNLP] Intent classification error:", error);

      // Fallback to keyword matching
      return this.classifyIntentFallback(transcript);
    }
  }

  /**
   * Fallback intent classification using keyword matching
   */
  private classifyIntentFallback(transcript: string): VoiceIntent {
    const lowerTranscript = transcript.toLowerCase();

    // Kitchen intents
    if (
      lowerTranscript.includes("prep") ||
      lowerTranscript.includes("order") ||
      lowerTranscript.includes("recipe")
    ) {
      return {
        intent: "order_prep",
        category: "kitchen",
        confidence: 0.7,
        entities: [],
        parameters: {},
      };
    }

    // Inventory intents
    if (
      lowerTranscript.includes("inventory") ||
      lowerTranscript.includes("stock") ||
      lowerTranscript.includes("order")
    ) {
      return {
        intent: "stock_check",
        category: "inventory",
        confidence: 0.7,
        entities: [],
        parameters: {},
      };
    }

    // Schedule intents
    if (
      lowerTranscript.includes("schedule") ||
      lowerTranscript.includes("shift") ||
      lowerTranscript.includes("staff")
    ) {
      return {
        intent: "schedule_view",
        category: "schedule",
        confidence: 0.7,
        entities: [],
        parameters: {},
      };
    }

    // Finance intents
    if (
      lowerTranscript.includes("cost") ||
      lowerTranscript.includes("price") ||
      lowerTranscript.includes("margin")
    ) {
      return {
        intent: "cost_query",
        category: "finance",
        confidence: 0.7,
        entities: [],
        parameters: {},
      };
    }

    // Default
    return {
      intent: "help",
      category: "general",
      confidence: 0.5,
      entities: [],
      parameters: {},
    };
  }

  /**
   * Extract entities from transcript
   */
  private async extractEntities(
    transcript: string,
    intent: VoiceIntent
  ): Promise<ExtractedEntity[]> {
    try {
      // Use OpenAI GPT-4 for entity extraction
      const systemPrompt = `You are an AI assistant specialized in extracting entities from hospitality voice commands.

Extract entities such as:
- dates: "today", "tomorrow", "next week", "January 15th"
- times: "3pm", "noon", "evening", "night"
- quantities: "5 pounds", "10 cases", "20 people"
- recipe_names: recipe names from menu
- employee_names: staff member names
- table_numbers: "table 5", "table 12"
- locations: "walk-in cooler", "dry storage", "freezer"
- menu_items: dish names from menu
- amounts: "$50", "15 percent", "100 dollars"

Return JSON array:
[
  {
    "type": "entity_type",
    "value": "extracted_value",
    "confidence": 0.0-1.0,
    "text": "original_text_span"
  }
]`;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const entities = JSON.parse(response.choices[0].message.content || "[]");

      return entities.map((e: any) => ({
        type: e.type || "unknown",
        value: e.value,
        confidence: e.confidence || 0.7,
        text: e.text || "",
      }));
    } catch (error) {
      logger.error("[VoiceNLP] Entity extraction error:", error);

      // Fallback to regex-based extraction
      return this.extractEntitiesFallback(transcript);
    }
  }

  /**
   * Fallback entity extraction using regex
   */
  private extractEntitiesFallback(transcript: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Extract dates
    const dateRegex = /\b(today|tomorrow|yesterday|next week|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})?\b/gi;
    const dates = transcript.match(dateRegex);
    if (dates) {
      dates.forEach((date) => {
        entities.push({
          type: "date",
          value: date,
          confidence: 0.6,
          text: date,
        });
      });
    }

    // Extract times
    const timeRegex = /\b(\d{1,2})(:(\d{2}))?\s*(am|pm|noon|evening|night|morning)?\b/gi;
    const times = transcript.match(timeRegex);
    if (times) {
      times.forEach((time) => {
        entities.push({
          type: "time",
          value: time,
          confidence: 0.6,
          text: time,
        });
      });
    }

    // Extract quantities
    const quantityRegex = /\b(\d+)\s+(pounds?|lbs?|cases?|boxes?|gallons?|liters?|each|dozen|people|guests)\b/gi;
    const quantities = transcript.match(quantityRegex);
    if (quantities) {
      quantities.forEach((qty) => {
        entities.push({
          type: "quantity",
          value: qty,
          confidence: 0.6,
          text: qty,
        });
      });
    }

    // Extract table numbers
    const tableRegex = /\btable\s+(\d+)\b/gi;
    const tables = transcript.match(tableRegex);
    if (tables) {
      tables.forEach((table) => {
        entities.push({
          type: "table_number",
          value: table.match(/\d+/)?.[0] || "",
          confidence: 0.7,
          text: table,
        });
      });
    }

    // Extract amounts/money
    const moneyRegex = /\$(\d+(?:\.\d{2})?)\b|\b(\d+)\s*(percent|%)\b/gi;
    const money = transcript.match(moneyRegex);
    if (money) {
      money.forEach((amount) => {
        entities.push({
          type: "amount",
          value: amount,
          confidence: 0.7,
          text: amount,
        });
      });
    }

    return entities;
  }

  /**
   * Build parameters object from entities and context
   */
  private buildParameters(
    entities: ExtractedEntity[],
    context: ConversationContext
  ): Record<string, any> {
    const parameters: Record<string, any> = {};

    // Extract parameters from entities
    entities.forEach((entity) => {
      parameters[entity.type] = entity.value;
    });

    // Inherit from conversation context if needed
    if (context.currentEntities) {
      Object.assign(parameters, context.currentEntities);
    }

    return parameters;
  }

  /**
   * Generate suggestions for follow-up queries
   */
  private async generateSuggestions(
    intent: VoiceIntent,
    context: ConversationContext
  ): Promise<string[]> {
    // Generate context-aware suggestions based on intent
    const suggestions: string[] = [];

    switch (intent.intent) {
      case "stock_check":
        suggestions.push("What's the par level for this item?");
        suggestions.push("Should I order more?");
        suggestions.push("Show me supplier options");
        break;

      case "recipe_cost":
        suggestions.push("Show me margin breakdown");
        suggestions.push("Compare with menu price");
        suggestions.push("Suggest cost optimizations");
        break;

      case "schedule_view":
        suggestions.push("Show me who's working today");
        suggestions.push("Find available coverage");
        suggestions.push("Calculate labor costs");
        break;

      default:
        suggestions.push("What else can I help you with?");
        suggestions.push("Tell me more about your needs");
    }

    return suggestions;
  }

  /**
   * Get or create conversation context
   */
  private getOrCreateContext(
    userId: string,
    orgId: string,
    sessionId?: string
  ): ConversationContext {
    const key = sessionId || `session_${userId}_${orgId}`;

    if (!this.conversationContexts.has(key)) {
      this.conversationContexts.set(key, {
        sessionId: key,
        userId,
        orgId,
        history: [],
      });
    }

    return this.conversationContexts.get(key)!;
  }

  /**
   * Clear conversation context
   */
  clearContext(sessionId: string): void {
    this.conversationContexts.delete(sessionId);
  }

  /**
   * Get conversation context
   */
  getContext(sessionId: string): ConversationContext | undefined {
    return this.conversationContexts.get(sessionId);
  }
}

// Singleton instance
let voiceNLPServiceInstance: VoiceNLPService | null = null;

export function getVoiceNLPService(): VoiceNLPService {
  if (!voiceNLPServiceInstance) {
    voiceNLPServiceInstance = new VoiceNLPService();
  }
  return voiceNLPServiceInstance;
}

export default VoiceNLPService;
