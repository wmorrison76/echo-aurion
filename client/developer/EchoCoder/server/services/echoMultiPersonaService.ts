import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

let supabase: any = null;
let openai: any = null;

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials:", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
      });
      throw new Error("Supabase credentials not configured");
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.ECHO_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "CRITICAL: ECHO_OPENAI_API_KEY environment variable not set. " +
          "Cannot initialize OpenAI client. Set the environment variable and restart the server.",
      );
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export type PersonaType =
  | "developer"
  | "cpa"
  | "statistician"
  | "chef"
  | "teacher";

interface PersonaConfig {
  name: string;
  systemPrompt: string;
  knowledgeDomains: string[];
  tone: "technical" | "business" | "casual" | "educational";
  expertise: string[];
  capabilities: string[];
}

/**
 * EchoAI Multi-Persona Service
 * Dynamically switches AI behavior based on user context and needs
 * Each persona has specialized knowledge and communication style
 */
export class EchoMultiPersonaService {
  private personaConfigs: Map<PersonaType, PersonaConfig> = new Map();
  private currentPersona: PersonaType = "developer";
  private conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [];

  constructor() {
    this.initializePersonas();
  }

  /**
   * Initialize all persona configurations
   */
  private initializePersonas(): void {
    this.personaConfigs.set("developer", {
      name: "Developer Assistant",
      systemPrompt: `You are an expert software developer and systems architect specializing in LUCCCA Enterprise.
You have deep knowledge of:
- React, TypeScript, Node.js, SQL
- The complete LUCCCA codebase structure
- Database schemas and API design
- Code generation best practices
- Performance optimization

When helping with code:
1. Always spell out proposed changes clearly before applying
2. Ask for confirmation before modifying code
3. Explain the 'why' behind each change
4. Consider performance and security implications
5. Reference relevant modules and patterns

Your tone is technical but approachable. Use code examples freely.`,
      knowledgeDomains: [
        "code_generation",
        "debugging",
        "architecture",
        "performance",
        "testing",
      ],
      tone: "technical",
      expertise: [
        "React",
        "TypeScript",
        "Node.js",
        "SQL",
        "Database Design",
        "API Design",
        "Code Review",
      ],
      capabilities: [
        "Generate code",
        "Fix bugs",
        "Refactor code",
        "Suggest optimizations",
        "Explain architecture",
        "Review code quality",
      ],
    });

    this.personaConfigs.set("cpa", {
      name: "Financial Advisor",
      systemPrompt: `You are a Certified Public Accountant and financial analyst for hospitality businesses.
You specialize in:
- P&L analysis (Profit & Loss statements)
- Revenue optimization
- Cost control and margins
- Financial forecasting
- Cash flow management
- Variance analysis

When analyzing financials:
1. Always show detailed breakdowns by category
2. Highlight potential cost savings opportunities
3. Provide actionable recommendations
4. Compare against industry benchmarks
5. Calculate ROI for suggested changes

Your tone is professional and data-driven. Use clear financial metrics.
Assume the user may not be a financial expert and explain concepts clearly.`,
      knowledgeDomains: [
        "financial_analysis",
        "budgeting",
        "forecasting",
        "tax_optimization",
        "revenue_management",
      ],
      tone: "business",
      expertise: [
        "Financial Analysis",
        "P&L Statements",
        "Forecasting",
        "Cost Control",
        "Revenue Optimization",
        "Tax Strategy",
      ],
      capabilities: [
        "Analyze P&L",
        "Forecast revenue",
        "Identify cost savings",
        "Calculate margins",
        "Project growth",
        "Optimize pricing",
      ],
    });

    this.personaConfigs.set("statistician", {
      name: "Data Analyst",
      systemPrompt: `You are a data scientist and statistician specializing in hospitality industry metrics.
You excel at:
- Predictive analytics
- Trend analysis
- Customer behavior patterns
- Demand forecasting
- Statistical significance testing
- Anomaly detection

When analyzing data:
1. Provide specific predictions with confidence intervals
2. Explain the statistical reasoning
3. Highlight seasonal patterns and trends
4. Recommend data-driven actions
5. Identify anomalies and investigate causes

Your tone is analytical and data-focused.
Make predictions specific (e.g., "22 orders" not "some orders").
Always include confidence levels.`,
      knowledgeDomains: [
        "predictive_analytics",
        "trend_analysis",
        "forecasting",
        "anomaly_detection",
        "customer_behavior",
      ],
      tone: "technical",
      expertise: [
        "Predictive Analytics",
        "Time Series Forecasting",
        "Statistical Modeling",
        "Anomaly Detection",
        "Customer Analytics",
        "Trend Analysis",
      ],
      capabilities: [
        "Forecast demand",
        "Analyze trends",
        "Predict behavior",
        "Detect anomalies",
        "Calculate probabilities",
        "Provide recommendations",
      ],
    });

    this.personaConfigs.set("chef", {
      name: "Culinary & Pastry Master",
      systemPrompt: `You are a master chef and pastry expert with expertise in menu design,
food cost optimization, and culinary best practices for hospitality.

You specialize in:
- Menu engineering (profitability analysis)
- Recipe costing and pricing
- Ingredient sourcing and quality
- Culinary techniques and trends
- Food safety and compliance
- Kitchen operations optimization

When helping with culinary:
1. Explain food cost vs. selling price ratios
2. Suggest menu items based on margins and popularity
3. Recommend seasonal ingredients
4. Ensure compliance with food safety
5. Consider kitchen capacity and complexity

Your tone is knowledgeable but friendly.
Share practical tips and industry best practices.`,
      knowledgeDomains: [
        "menu_design",
        "food_costing",
        "culinary_techniques",
        "recipes",
        "kitchen_operations",
      ],
      tone: "casual",
      expertise: [
        "Menu Engineering",
        "Food Costing",
        "Culinary Techniques",
        "Pastry",
        "Ingredient Sourcing",
        "Food Safety",
      ],
      capabilities: [
        "Design menus",
        "Analyze food costs",
        "Suggest recipes",
        "Optimize ingredients",
        "Plan production",
        "Ensure compliance",
      ],
    });

    this.personaConfigs.set("teacher", {
      name: "Educational Guide",
      systemPrompt: `You are an expert educator specializing in teaching complex systems and business concepts.
You're patient, clear, and adaptive to different learning styles.

You teach by:
1. Starting with simple concepts, building to complex
2. Using relatable analogies and real examples
3. Asking clarifying questions to ensure understanding
4. Breaking topics into digestible chunks
5. Providing interactive exercises when helpful

When teaching:
- Ask the user's current knowledge level
- Use visuals and examples
- Encourage hands-on learning
- Check understanding frequently
- Adapt pace based on feedback

Your tone is warm, encouraging, and patient.
Make learning engaging and accessible.`,
      knowledgeDomains: [
        "system_education",
        "concept_explanation",
        "guided_learning",
        "interactive_teaching",
      ],
      tone: "educational",
      expertise: [
        "System Design",
        "Financial Concepts",
        "Business Operations",
        "Data Literacy",
        "Technical Concepts",
        "Change Management",
      ],
      capabilities: [
        "Explain concepts",
        "Guide learning",
        "Answer questions",
        "Provide examples",
        "Create exercises",
        "Assess understanding",
      ],
    });
  }

  /**
   * Auto-detect appropriate persona based on context
   */
  autoDetectPersona(
    query: string,
    currentModule?: string,
    userRole?: string,
  ): PersonaType {
    // Default to current persona if no clear indicators
    if (!query && !currentModule) return this.currentPersona;

    const lowerQuery = query.toLowerCase();

    // Check for financial terms
    if (
      lowerQuery.includes("p&l") ||
      lowerQuery.includes("profit") ||
      lowerQuery.includes("cost") ||
      lowerQuery.includes("revenue") ||
      lowerQuery.includes("margin") ||
      lowerQuery.includes("pricing")
    ) {
      return "cpa";
    }

    // Check for statistical/forecast terms
    if (
      lowerQuery.includes("forecast") ||
      lowerQuery.includes("predict") ||
      lowerQuery.includes("trend") ||
      lowerQuery.includes("analytics") ||
      lowerQuery.includes("should prep") ||
      lowerQuery.includes("orders of")
    ) {
      return "statistician";
    }

    // Check for culinary terms
    if (
      lowerQuery.includes("menu") ||
      lowerQuery.includes("recipe") ||
      lowerQuery.includes("dish") ||
      lowerQuery.includes("food") ||
      lowerQuery.includes("pastry") ||
      lowerQuery.includes("ingredient") ||
      lowerQuery.includes("kitchen")
    ) {
      return "chef";
    }

    // Check for teaching/explanation
    if (
      lowerQuery.includes("explain") ||
      lowerQuery.includes("teach") ||
      lowerQuery.includes("how do") ||
      lowerQuery.includes("what is") ||
      lowerQuery.includes("help me understand")
    ) {
      return "teacher";
    }

    // Check module context
    if (currentModule) {
      if (
        currentModule.includes("Analytics") ||
        currentModule.includes("Finance")
      ) {
        return "cpa";
      }
      if (currentModule.includes("Menu") || currentModule.includes("Recipe")) {
        return "chef";
      }
    }

    // Default to developer
    return "developer";
  }

  /**
   * Switch to a specific persona
   */
  switchPersona(persona: PersonaType): PersonaConfig {
    if (!this.personaConfigs.has(persona)) {
      console.warn(`Unknown persona: ${persona}`);
      return this.getCurrentPersona();
    }
    this.currentPersona = persona;
    this.conversationHistory = []; // Clear history on persona switch
    return this.getCurrentPersona();
  }

  /**
   * Get current persona information
   */
  getCurrentPersona(): PersonaConfig {
    return (
      this.personaConfigs.get(this.currentPersona) || {
        name: "Unknown",
        systemPrompt: "",
        knowledgeDomains: [],
        tone: "technical",
        expertise: [],
        capabilities: [],
      }
    );
  }

  /**
   * Process query with current persona
   */
  async processQuery(
    userQuery: string,
    contextInfo?: {
      module?: string;
      file?: string;
      selectedCode?: string;
      userRole?: string;
    },
  ): Promise<{
    persona: PersonaType;
    response: string;
    confidence: number;
    suggestedActions: string[];
    requiresCodeChange: boolean;
    proposedChange?: string;
  }> {
    try {
      // Auto-detect persona if not already set
      const detectedPersona = this.autoDetectPersona(
        userQuery,
        contextInfo?.module,
        contextInfo?.userRole,
      );

      if (detectedPersona !== this.currentPersona) {
        this.switchPersona(detectedPersona);
      }

      const personaConfig = this.getCurrentPersona();

      // Build context message
      let contextMessage = "";
      if (contextInfo?.module) {
        contextMessage += `\nCurrent Module: ${contextInfo.module}`;
      }
      if (contextInfo?.file) {
        contextMessage += `\nCurrent File: ${contextInfo.file}`;
      }
      if (contextInfo?.selectedCode) {
        contextMessage += `\nSelected Code:\n${contextInfo.selectedCode}`;
      }

      // Add to conversation history
      this.conversationHistory.push({
        role: "user",
        content: userQuery + contextMessage,
      });

      // Call OpenAI with persona system prompt
      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-4-turbo",
        system: personaConfig.systemPrompt,
        messages: this.conversationHistory,
        max_tokens: 2000,
        temperature: 0.7,
      });

      const aiResponse =
        response.choices[0].message.content || "Unable to generate response";

      // Add to history
      this.conversationHistory.push({
        role: "assistant",
        content: aiResponse,
      });

      // Limit history to last 10 messages
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      // Analyze response for actions
      const requiresCodeChange = this.analyzeForCodeChange(aiResponse);
      const suggestedActions = this.extractSuggestedActions(aiResponse);
      const confidence = this.calculateConfidenceScore(aiResponse);

      return {
        persona: this.currentPersona,
        response: aiResponse,
        confidence,
        suggestedActions,
        requiresCodeChange,
        proposedChange: requiresCodeChange
          ? this.extractProposedChange(aiResponse)
          : undefined,
      };
    } catch (error) {
      console.error("Error processing query:", error);
      return {
        persona: this.currentPersona,
        response: `Error processing query: ${error}`,
        confidence: 0,
        suggestedActions: [],
        requiresCodeChange: false,
      };
    }
  }

  /**
   * Analyze if response involves code changes
   */
  private analyzeForCodeChange(response: string): boolean {
    const codeIndicators = [
      "change",
      "modify",
      "update",
      "fix",
      "add",
      "remove",
      "refactor",
      "replace",
      "implement",
      "```",
    ];

    const lowerResponse = response.toLowerCase();
    return codeIndicators.some((indicator) =>
      lowerResponse.includes(indicator),
    );
  }

  /**
   * Extract suggested actions from response
   */
  private extractSuggestedActions(response: string): string[] {
    const actions: string[] = [];
    const lines = response.split("\n");

    for (const line of lines) {
      if (
        line.includes("1.") ||
        line.includes("2.") ||
        line.includes("3.") ||
        line.includes("-")
      ) {
        const action = line.replace(/^[0-9\.\-\s]+/, "").trim();
        if (action.length > 0) {
          actions.push(action);
        }
      }
    }

    return actions.slice(0, 5); // Return top 5 actions
  }

  /**
   * Extract proposed code change
   */
  private extractProposedChange(response: string): string | undefined {
    const codeBlockRegex = /```[\s\S]*?```/g;
    const matches = response.match(codeBlockRegex);
    return matches ? matches[0] : undefined;
  }

  /**
   * Calculate confidence score for response
   */
  private calculateConfidenceScore(response: string): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence if detailed
    if (response.length > 500) confidence += 0.1;

    // Increase if includes code examples
    if (response.includes("```")) confidence += 0.1;

    // Decrease if includes uncertainty
    if (
      response.toLowerCase().includes("maybe") ||
      response.toLowerCase().includes("might") ||
      response.toLowerCase().includes("unsure")
    ) {
      confidence -= 0.1;
    }

    // Decrease if mentions need for human review
    if (
      response.toLowerCase().includes("manual review") ||
      response.toLowerCase().includes("human review")
    ) {
      confidence -= 0.05;
    }

    return Math.max(0, Math.min(1, confidence)); // Clamp 0-1
  }

  /**
   * Get all available personas
   */
  getAllPersonas(): Array<{
    type: PersonaType;
    name: string;
    expertise: string[];
  }> {
    const personas: Array<{
      type: PersonaType;
      name: string;
      expertise: string[];
    }> = [];

    for (const [type, config] of this.personaConfigs.entries()) {
      personas.push({
        type: type as PersonaType,
        name: config.name,
        expertise: config.expertise,
      });
    }

    return personas;
  }

  /**
   * Get all available personas (alias for route compatibility)
   */
  getAvailablePersonas(): Array<{
    id: PersonaType;
    config: PersonaConfig;
  }> {
    const personas: Array<{
      id: PersonaType;
      config: PersonaConfig;
    }> = [];

    for (const [type, config] of this.personaConfigs.entries()) {
      personas.push({
        id: type as PersonaType,
        config,
      });
    }

    return personas;
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Clear conversation history (alias for route compatibility)
   */
  clearConversationHistory(): void {
    this.clearHistory();
  }

  /**
   * Process a message through the current persona
   */
  async processMessage(
    message: string,
    context?: {
      conversationHistory?: Array<{ role: string; content: string }>;
      timestamp?: Date;
      module?: string;
      file?: string;
    },
  ): Promise<{
    content: string;
    confidence: number;
    persona: PersonaType;
    processingTimeMs: number;
    tokensUsed: number;
  }> {
    const startTime = Date.now();

    try {
      const result = await this.processQuery(message, {
        module: context?.module,
        file: context?.file,
      });

      return {
        content: result.response,
        confidence: result.confidence,
        persona: result.persona,
        processingTimeMs: Date.now() - startTime,
        tokensUsed: Math.ceil(message.length / 4), // Rough estimate
      };
    } catch (error: any) {
      return {
        content: `Error processing message: ${error.message}`,
        confidence: 0,
        persona: this.currentPersona,
        processingTimeMs: Date.now() - startTime,
        tokensUsed: 0,
      };
    }
  }

  /**
   * Get statistics about current persona usage
   */
  getPersonaStats(): {
    currentPersona: string;
    messageCount: number;
    averageConfidence: number;
    historySizeMs: number;
  } {
    return {
      currentPersona: this.currentPersona,
      messageCount: this.conversationHistory.length,
      averageConfidence: 0.8, // Placeholder
      historySizeMs: JSON.stringify(this.conversationHistory).length,
    };
  }
}

// Singleton export
export const echoMultiPersonaService = new EchoMultiPersonaService();
