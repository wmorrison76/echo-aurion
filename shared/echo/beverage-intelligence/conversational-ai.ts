/**
 * Conversational AI Sommelier Service
 * Natural language interface for wine and cocktail recommendations
 * 
 * Features:
 * - Intent classification
 * - Entity extraction
 * - Context management
 * - Multi-turn conversations
 * - Multi-language support
 */

import { wineIntelligenceService, type WineRecommendation, type RecommendationContext } from "./wine-intelligence";
import { mixologyIntelligenceService, type GeneratedRecipe, type RecipeGenerationRequest } from "./mixology-intelligence";
import { crossModuleIntelligenceService } from "./cross-module-intelligence";
import { inventoryAwareRecommendationsService } from "./inventory-aware-recommendations";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: Intent;
    entities?: Entity[];
    confidence?: number;
  };
}

export interface Intent {
  type: "wine_recommendation" | "cocktail_recommendation" | "pairing_request" | "inventory_query" | "recipe_request" | "general_query";
  confidence: number;
  parameters?: Record<string, any>;
}

export interface Entity {
  type: "wine" | "cocktail" | "dish" | "ingredient" | "price" | "occasion" | "preference";
  value: string;
  confidence: number;
  startIndex?: number;
  endIndex?: number;
}

export interface ConversationState {
  conversationId: string;
  userId?: string;
  venueId?: string;
  messages: ConversationMessage[];
  context: ConversationContext;
  currentIntent?: Intent;
}

export interface ConversationContext {
  customerId?: string;
  currentOrder?: string[];
  preferences?: Record<string, any>;
  inventoryStatuses?: any[];
  activeRecommendations?: any[];
}

export interface AIResponse {
  message: string;
  recommendations?: {
    wines?: WineRecommendation[];
    cocktails?: GeneratedRecipe[];
  };
  suggestions?: string[];
  confidence: number;
  nextActions?: string[];
}

// ============================================================================
// CONVERSATIONAL AI SERVICE
// ============================================================================

export class ConversationalAISommelierService {
  private conversations: Map<string, ConversationState> = new Map();
  private intentPatterns: Map<string, RegExp[]> = new Map();

  constructor() {
    this.initializeIntentPatterns();
  }

  /**
   * Process user message and generate response
   */
  async processMessage(
    conversationId: string,
    userMessage: string,
    context: Partial<ConversationContext> = {}
  ): Promise<AIResponse> {
    // 1. Get or create conversation state
    const conversation = this.getOrCreateConversation(conversationId, context);

    // 2. Classify intent
    const intent = await this.classifyIntent(userMessage);

    // 3. Extract entities
    const entities = await this.extractEntities(userMessage, intent);

    // 4. Build enriched context
    const enrichedContext = await this.buildContext(conversation, intent, entities, context);

    // 5. Generate response
    const response = await this.generateResponse(intent, enrichedContext, conversation);

    // 6. Update conversation state
    conversation.messages.push({
      role: "user",
      content: userMessage,
      timestamp: new Date(),
      metadata: { intent, entities },
    });

    conversation.messages.push({
      role: "assistant",
      content: response.message,
      timestamp: new Date(),
    });

    conversation.currentIntent = intent;
    conversation.context = enrichedContext;

    // 7. Learn from interaction
    await this.learnFromInteraction(conversationId, intent, entities, response);

    return response;
  }

  /**
   * Classify user intent
   */
  private async classifyIntent(message: string): Promise<Intent> {
    const lowerMessage = message.toLowerCase();

    // Wine recommendation
    if (this.matchesPattern(lowerMessage, this.intentPatterns.get("wine_recommendation") || [])) {
      return {
        type: "wine_recommendation",
        confidence: 0.9,
        parameters: this.extractWineParameters(message),
      };
    }

    // Cocktail recommendation
    if (this.matchesPattern(lowerMessage, this.intentPatterns.get("cocktail_recommendation") || [])) {
      return {
        type: "cocktail_recommendation",
        confidence: 0.9,
        parameters: this.extractCocktailParameters(message),
      };
    }

    // Pairing request
    if (this.matchesPattern(lowerMessage, this.intentPatterns.get("pairing_request") || [])) {
      return {
        type: "pairing_request",
        confidence: 0.85,
        parameters: this.extractPairingParameters(message),
      };
    }

    // Inventory query
    if (this.matchesPattern(lowerMessage, this.intentPatterns.get("inventory_query") || [])) {
      return {
        type: "inventory_query",
        confidence: 0.8,
      };
    }

    // Recipe request
    if (this.matchesPattern(lowerMessage, this.intentPatterns.get("recipe_request") || [])) {
      return {
        type: "recipe_request",
        confidence: 0.85,
      };
    }

    // General query
    return {
      type: "general_query",
      confidence: 0.7,
    };
  }

  /**
   * Extract entities from message
   */
  private async extractEntities(message: string, intent: Intent): Promise<Entity[]> {
    const entities: Entity[] = [];

    // Extract wine names
    const winePattern = /\b(chardonnay|pinot noir|cabernet|merlot|sauvignon blanc|riesling|prosecco|champagne)\b/gi;
    const wineMatches = message.match(winePattern);
    if (wineMatches) {
      for (const match of wineMatches) {
        entities.push({
          type: "wine",
          value: match,
          confidence: 0.8,
        });
      }
    }

    // Extract cocktail names
    const cocktailPattern = /\b(old fashioned|martini|manhattan|negroni|moscow mule|margarita|cosmopolitan)\b/gi;
    const cocktailMatches = message.match(cocktailPattern);
    if (cocktailMatches) {
      for (const match of cocktailMatches) {
        entities.push({
          type: "cocktail",
          value: match,
          confidence: 0.8,
        });
      }
    }

    // Extract dish names
    const dishPattern = /\b(steak|chicken|fish|pasta|salmon|lamb|beef)\b/gi;
    const dishMatches = message.match(dishPattern);
    if (dishMatches) {
      for (const match of dishMatches) {
        entities.push({
          type: "dish",
          value: match,
          confidence: 0.7,
        });
      }
    }

    // Extract price
    const pricePattern = /\$(\d+)/g;
    const priceMatches = message.match(pricePattern);
    if (priceMatches) {
      for (const match of priceMatches) {
        entities.push({
          type: "price",
          value: match.replace("$", ""),
          confidence: 0.9,
        });
      }
    }

    // Extract occasion
    const occasionPattern = /\b(dinner|date|party|celebration|business|casual)\b/gi;
    const occasionMatches = message.match(occasionPattern);
    if (occasionMatches) {
      for (const match of occasionMatches) {
        entities.push({
          type: "occasion",
          value: match,
          confidence: 0.8,
        });
      }
    }

    return entities;
  }

  /**
   * Build enriched context
   */
  private async buildContext(
    conversation: ConversationState,
    intent: Intent,
    entities: Entity[],
    additionalContext: Partial<ConversationContext>
  ): Promise<ConversationContext> {
    const context: ConversationContext = {
      ...conversation.context,
      ...additionalContext,
    };

    // Extract preferences from conversation history
    const preferences = this.extractPreferencesFromHistory(conversation.messages);
    if (preferences) {
      context.preferences = { ...context.preferences, ...preferences };
    }

    // Extract dish context from entities
    const dishEntity = entities.find(e => e.type === "dish");
    if (dishEntity && intent.type === "pairing_request") {
      // Would fetch dish details
      // context.currentDish = await getDish(dishEntity.value);
    }

    return context;
  }

  /**
   * Generate response based on intent
   */
  private async generateResponse(
    intent: Intent,
    context: ConversationContext,
    conversation: ConversationState
  ): Promise<AIResponse> {
    switch (intent.type) {
      case "wine_recommendation":
        return await this.handleWineRecommendation(intent, context);

      case "cocktail_recommendation":
        return await this.handleCocktailRecommendation(intent, context);

      case "pairing_request":
        return await this.handlePairingRequest(intent, context);

      case "inventory_query":
        return await this.handleInventoryQuery(intent, context);

      case "recipe_request":
        return await this.handleRecipeRequest(intent, context);

      default:
        return await this.handleGeneralQuery(intent, context, conversation);
    }
  }

  /**
   * Handle wine recommendation request
   */
  private async handleWineRecommendation(
    intent: Intent,
    context: ConversationContext
  ): Promise<AIResponse> {
    const recContext: RecommendationContext = {
      customerId: context.customerId,
      preferences: context.preferences as any,
      inventory: context.inventoryStatuses as any[],
    };

    const recommendations = await wineIntelligenceService.getRecommendations(recContext);

    const topRecommendation = recommendations[0];
    const alternatives = recommendations.slice(1, 4);

    const message = this.formatWineRecommendationMessage(topRecommendation, alternatives);

    return {
      message,
      recommendations: {
        wines: recommendations.slice(0, 5),
      },
      suggestions: this.generateSuggestions(topRecommendation),
      confidence: topRecommendation?.confidence || 0.8,
      nextActions: [
        "Would you like more details about any of these?",
        "I can also suggest cocktails if you prefer.",
      ],
    };
  }

  /**
   * Handle cocktail recommendation request
   */
  private async handleCocktailRecommendation(
    intent: Intent,
    context: ConversationContext
  ): Promise<AIResponse> {
    const request: RecipeGenerationRequest = {
      availableIngredients: [], // Would be populated from inventory
      style: intent.parameters?.style || "modern",
    };

    const recommendation = await mixologyIntelligenceService.generateFromFlavors(request);

    const message = this.formatCocktailRecommendationMessage(recommendation);

    return {
      message,
      recommendations: {
        cocktails: [recommendation, ...recommendation.alternatives],
      },
      suggestions: this.generateCocktailSuggestions(recommendation),
      confidence: recommendation.confidence,
      nextActions: [
        "Would you like the recipe details?",
        "I can suggest variations or substitutions.",
      ],
    };
  }

  /**
   * Handle pairing request
   */
  private async handlePairingRequest(
    intent: Intent,
    context: ConversationContext
  ): Promise<AIResponse> {
    const recContext: RecommendationContext = {
      customerId: context.customerId,
      dish: intent.parameters?.dish as any,
      preferences: context.preferences as any,
    };

    const unified = await crossModuleIntelligenceService.getUnifiedRecommendations(recContext);

    const message = this.formatPairingMessage(unified.recommendations.foodPairings?.[0]);

    return {
      message,
      recommendations: {
        wines: unified.recommendations.wines.slice(0, 3),
        cocktails: unified.recommendations.cocktails.slice(0, 3),
      },
      confidence: unified.confidence,
      nextActions: [
        "Would you like to see more pairing options?",
        "I can adjust based on your preferences.",
      ],
    };
  }

  /**
   * Handle inventory query
   */
  private async handleInventoryQuery(
    intent: Intent,
    context: ConversationContext
  ): Promise<AIResponse> {
    // Query inventory status
    const message = "I can check inventory status. What item are you looking for?";

    return {
      message,
      confidence: 0.8,
      nextActions: ["Specify the wine or ingredient you're looking for"],
    };
  }

  /**
   * Handle recipe request
   */
  private async handleRecipeRequest(
    intent: Intent,
    context: ConversationContext
  ): Promise<AIResponse> {
    const message = "I can help you create a new cocktail recipe. What flavors are you interested in?";

    return {
      message,
      confidence: 0.8,
      nextActions: [
        "Describe the flavors you want",
        "Or tell me what ingredients you have available",
      ],
    };
  }

  /**
   * Handle general query
   */
  private async handleGeneralQuery(
    intent: Intent,
    context: ConversationContext,
    conversation: ConversationState
  ): Promise<AIResponse> {
    // Fallback to general assistance
    const message = "I'm your AI sommelier assistant. I can help you with:\n" +
      "• Wine recommendations\n" +
      "• Cocktail recipes\n" +
      "• Food and beverage pairings\n" +
      "• Inventory queries\n\n" +
      "What would you like help with?";

    return {
      message,
      confidence: 0.7,
      nextActions: [
        "Ask me to recommend a wine",
        "Ask for a cocktail recipe",
        "Request a pairing suggestion",
      ],
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private initializeIntentPatterns(): void {
    this.intentPatterns.set("wine_recommendation", [
      /recommend.*wine/i,
      /suggest.*wine/i,
      /what.*wine/i,
      /which.*wine/i,
      /wine.*for/i,
      /pair.*wine/i,
    ]);

    this.intentPatterns.set("cocktail_recommendation", [
      /recommend.*cocktail/i,
      /suggest.*cocktail/i,
      /make.*cocktail/i,
      /cocktail.*recipe/i,
      /drink.*recipe/i,
    ]);

    this.intentPatterns.set("pairing_request", [
      /pair.*with/i,
      /what.*goes.*with/i,
      /match.*with/i,
      /complement/i,
    ]);

    this.intentPatterns.set("inventory_query", [
      /inventory/i,
      /stock/i,
      /available/i,
      /do.*we.*have/i,
      /is.*in.*stock/i,
    ]);

    this.intentPatterns.set("recipe_request", [
      /recipe/i,
      /how.*make/i,
      /how.*create/i,
      /recipe.*for/i,
    ]);
  }

  private matchesPattern(text: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(text));
  }

  private extractWineParameters(message: string): Record<string, any> {
    const params: Record<string, any> = {};

    // Extract dish
    const dishMatch = message.match(/\b(steak|chicken|fish|pasta|salmon|lamb|beef)\b/i);
    if (dishMatch) {
      params.dish = dishMatch[0];
    }

    // Extract price
    const priceMatch = message.match(/\$(\d+)/);
    if (priceMatch) {
      params.price = parseInt(priceMatch[1]);
    }

    // Extract style
    const styleMatch = message.match(/\b(red|white|rosé|sparkling|bold|light|sweet|dry)\b/i);
    if (styleMatch) {
      params.style = styleMatch[0];
    }

    return params;
  }

  private extractCocktailParameters(message: string): Record<string, any> {
    const params: Record<string, any> = {};

    // Extract style
    const styleMatch = message.match(/\b(classic|modern|tropical|spirit-forward|sour)\b/i);
    if (styleMatch) {
      params.style = styleMatch[0].toLowerCase();
    }

    // Extract base spirit
    const spiritMatch = message.match(/\b(vodka|gin|rum|whiskey|tequila|bourbon)\b/i);
    if (spiritMatch) {
      params.baseSpirit = spiritMatch[0];
    }

    return params;
  }

  private extractPairingParameters(message: string): Record<string, any> {
    const params: Record<string, any> = {};

    // Extract dish
    const dishMatch = message.match(/\b(steak|chicken|fish|pasta|salmon|lamb|beef)\b/i);
    if (dishMatch) {
      params.dish = { dishName: dishMatch[0] };
    }

    return params;
  }

  private getOrCreateConversation(
    conversationId: string,
    context: Partial<ConversationContext>
  ): ConversationState {
    let conversation = this.conversations.get(conversationId);

    if (!conversation) {
      conversation = {
        conversationId,
        userId: context.customerId,
        messages: [],
        context: context as ConversationContext,
      };
      this.conversations.set(conversationId, conversation);
    }

    return conversation;
  }

  private extractPreferencesFromHistory(messages: ConversationMessage[]): Record<string, any> | null {
    // Extract preferences from conversation history
    // E.g., "I like bold wines" → preference: { style: "bold" }
    return null;
  }

  private formatWineRecommendationMessage(
    recommendation: WineRecommendation,
    alternatives: WineRecommendation[]
  ): string {
    if (!recommendation) {
      return "I'd be happy to recommend a wine! Could you tell me what dish you're having or your preferences?";
    }

    const priority = recommendation.priority;
    const badge = priority.visualIndicator.badge;

    let message = `${badge} **${recommendation.wine.name}** (${priority.visualIndicator.label})\n\n`;
    message += recommendation.reasoning.join("\n") + "\n\n";

    if (alternatives.length > 0) {
      message += "**Alternatives:**\n";
      alternatives.slice(0, 3).forEach(alt => {
        message += `• ${alt.wine.name}\n`;
      });
    }

    return message;
  }

  private formatCocktailRecommendationMessage(recommendation: GeneratedRecipe): string {
    let message = `Here's a cocktail I think you'll love: **${recommendation.recipe.name}**\n\n`;
    message += `**Ingredients:**\n`;
    recommendation.recipe.ingredients.forEach(ing => {
      message += `• ${ing.quantity} ${ing.unit} ${ing.name}\n`;
    });
    message += `\n**Flavor Profile:** ${recommendation.recipe.flavorProfile.primary.join(", ")}\n`;
    message += `**Confidence:** ${Math.round(recommendation.confidence * 100)}%`;

    return message;
  }

  private formatPairingMessage(pairing?: FoodBeveragePairing): string {
    if (!pairing) {
      return "I can suggest wine and cocktail pairings for your dish. What are you having?";
    }

    let message = `**Wine Pairings:**\n`;
    pairing.wineRecommendations.forEach(wine => {
      message += `• ${wine.wine.name} - ${wine.reasoning[0]}\n`;
    });

    if (pairing.cocktailRecommendations.length > 0) {
      message += `\n**Cocktail Pairings:**\n`;
      pairing.cocktailRecommendations.forEach(cocktail => {
        message += `• ${cocktail.recipe.name}\n`;
      });
    }

    return message;
  }

  private generateSuggestions(recommendation: WineRecommendation): string[] {
    const suggestions: string[] = [];

    if (recommendation.priority.priority === "medium") {
      suggestions.push("Consider ordering soon to maintain availability");
    }

    if (recommendation.foodPairings && recommendation.foodPairings.length > 0) {
      suggestions.push(`Pairs excellently with ${recommendation.foodPairings[0].dishName}`);
    }

    return suggestions;
  }

  private generateCocktailSuggestions(recommendation: GeneratedRecipe): string[] {
    const suggestions: string[] = [];

    if (recommendation.substitutions && recommendation.substitutions.length > 0) {
      suggestions.push("Substitutions available for unavailable ingredients");
    }

    if (recommendation.alternatives && recommendation.alternatives.length > 0) {
      suggestions.push(`${recommendation.alternatives.length} alternative recipes available`);
    }

    return suggestions;
  }

  private async learnFromInteraction(
    conversationId: string,
    intent: Intent,
    entities: Entity[],
    response: AIResponse
  ): Promise<void> {
    // Record interaction for learning
    // This would integrate with real-time learning service
  }
}

// Export singleton instance
export const conversationalAISommelierService = new ConversationalAISommelierService();
