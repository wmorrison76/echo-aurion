/**
 * EchoAi^3 Unified Brain
 * ----------------------
 * The complete understanding system for LUCCCA Framework
 * Understands every module, every integration, every line of code
 * Now includes forecasting and learning capabilities
 */

import { SYSTEM_KNOWLEDGE, getModuleKnowledge, getModuleIntegrations, getRoleKnowledge, getDomainKnowledge } from "./system-knowledge-index";
import { getEchoAi3ForecastingEngine } from "./forecasting-engine";

// ... existing code ...

export class EchoAi3UnifiedBrain {
  private knowledgeBase = SYSTEM_KNOWLEDGE;
  public conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
  private forecastingEngine = getEchoAi3ForecastingEngine();
  private lastError: string | null = null;

  /**
   * Main query method - understands any question about the system
   * Now includes forecasting capabilities
   */
  async understand(query: SystemQuery): Promise<SystemResponse> {
    const queryText = query.query.toLowerCase();
    const context = query.context || {};
    this.lastError = null;

    // Check if this is a forecasting question
    if (this.isForecastingQuery(queryText)) {
      return await this.handleForecastingQuery(query, context);
    }

    // Build comprehensive context
    const systemContext = this.buildSystemContext(context);

    // Analyze query intent
    const intent = this.analyzeIntent(queryText);

    // Get relevant knowledge
    const relevantKnowledge = this.getRelevantKnowledge(queryText, intent, context);

    // Generate response using OpenAI (if available) or system knowledge
    const answer = await this.generateAnswer(query, systemContext, relevantKnowledge, intent);

    return {
      answer,
      relatedModules: relevantKnowledge.modules,
      relatedIntegrations: relevantKnowledge.integrations,
      codeReferences: relevantKnowledge.codeReferences,
      documentation: relevantKnowledge.documentation,
      suggestedActions: relevantKnowledge.suggestedActions,
      confidence: relevantKnowledge.confidence,
      error: this.lastError || undefined,
    };
  }

  /**
   * Check if query is about forecasting
   */
  private isForecastingQuery(query: string): boolean {
    const forecastingKeywords = [
      "prep list",
      "what will",
      "forecast",
      "predict",
      "15 days",
      "in advance",
      "what do i need",
      "what should i prep",
      "inventory needs",
      "labor needs",
    ];

    return forecastingKeywords.some(keyword => query.includes(keyword));
  }

  /**
   * Handle forecasting queries
   */
  private async handleForecastingQuery(
    query: SystemQuery,
    context: any
  ): Promise<SystemResponse> {
    const queryText = query.query.toLowerCase();

    // Extract date from query (default: 15 days if specified, else 2 days)
    let daysAhead = 2;
    let specificDate: string | undefined;

    if (queryText.includes("15 days") || queryText.includes("15 day")) {
      daysAhead = 15;
    } else if (queryText.includes("10 days")) {
      daysAhead = 10;
    } else if (queryText.includes("7 days") || queryText.includes("week")) {
      daysAhead = 7;
    }

    // Extract specific date if mentioned
    const dateMatch = queryText.match(/(\d{4}-\d{2}-\d{2})|(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i);
    if (dateMatch) {
      specificDate = dateMatch[0];
    }

    // Get forecast
    const forecasts = specificDate
      ? this.forecastingEngine.getForecast(specificDate, daysAhead)
      : this.forecastingEngine.getForecast(undefined, daysAhead);

    // Build comprehensive answer
    let answer = `Based on my forecasting analysis ${daysAhead} day(s) ahead, here's what I predict:\n\n`;

    // Group by type
    const prepForecasts = forecasts.filter(f => f.type === "prep_list");
    const inventoryForecasts = forecasts.filter(f => f.type === "inventory");
    const laborForecasts = forecasts.filter(f => f.type === "labor");

    if (queryText.includes("prep list") || queryText.includes("prep")) {
      prepForecasts.forEach(forecast => {
        answer += `**Prep List for ${forecast.date}** (${(forecast.confidence * 100).toFixed(0)}% confidence)\n`;
        answer += `\n*Assumptions:*\n`;
        forecast.assumptions.forEach(assumption => {
          answer += `- ${assumption}\n`;
        });
        answer += `\n*Predicted Items:*\n`;
        if (forecast.prediction.items) {
          forecast.prediction.items.slice(0, 20).forEach((item: string) => {
            answer += `- ${item}\n`;
          });
        }
        if (forecast.prediction.quantities) {
          answer += `\n*Quantities:*\n`;
          Object.entries(forecast.prediction.quantities).slice(0, 10).forEach(([item, qty]: [string, any]) => {
            answer += `- ${item}: ${qty}\n`;
          });
        }
        if (forecast.prediction.estimatedTime) {
          answer += `\n*Estimated Prep Time:* ${forecast.prediction.estimatedTime} hours\n`;
        }
        if (forecast.prediction.weatherImpact) {
          answer += `\n*Weather Impact:* ${forecast.prediction.weatherImpact}\n`;
        }
        answer += `\n*Data Sources Used:* ${forecast.dataSources.join(", ")}\n\n`;
      });
    }

    if (queryText.includes("inventory")) {
      inventoryForecasts.forEach(forecast => {
        answer += `**Inventory Needs for ${forecast.date}**\n`;
        answer += `Confidence: ${(forecast.confidence * 100).toFixed(0)}%\n\n`;
      });
    }

    if (queryText.includes("labor")) {
      laborForecasts.forEach(forecast => {
        answer += `**Labor Needs for ${forecast.date}**\n`;
        answer += `Confidence: ${(forecast.confidence * 100).toFixed(0)}%\n\n`;
      });
    }

    // Add trend analysis
    if (prepForecasts.length > 0) {
      const trend = this.forecastingEngine.getTrendAnalysis("prep_list");
      answer += `\n**Trend Analysis:**\n`;
      answer += `- Trend: ${trend.trend}\n`;
      answer += `- Strength: ${(trend.strength * 100).toFixed(0)}%\n`;
      answer += `- Confidence: ${(trend.confidence * 100).toFixed(0)}%\n`;
    }

    // Add learning insights
    const insights = this.forecastingEngine.getInsights().slice(0, 3);
    if (insights.length > 0) {
      answer += `\n**Recent Learning Insights:**\n`;
      insights.forEach(insight => {
        answer += `- ${insight.pattern} (${insight.trend}, ${(insight.strength * 100).toFixed(0)}% strength)\n`;
      });
    }

    answer += `\n*Note: Predictions are based on weather forecasts, 21-day reports, BEO/REO data, hotel guest forecasts, group business, historical sales, and menu mix analysis. Confidence decreases further into the future, but I'm constantly learning and adjusting my predictions daily.*`;

    return {
      answer,
      relatedModules: ["Culinary", "Inventory", "Schedule"],
      relatedIntegrations: ["Forecasting → Prep List", "Weather → Prep Needs"],
      codeReferences: [],
      documentation: ["Forecasting Engine", "Learning System"],
      suggestedActions: [
        "Review assumptions",
        "Check weather forecast",
        "Verify BEO/REO bookings",
        "Adjust based on actual data",
      ],
      confidence: forecasts.length > 0 ? forecasts[0].confidence : 0.5,
    };
  }

  /**
   * Build comprehensive system context
   */
  private buildSystemContext(context: {
    module?: string;
    activeModule?: string;
    moduleFamily?: string;
    userRole?: string;
    currentPage?: string;
    selectedOutlet?: string;
    permissions?: Record<string, any>;
    surface?: string;
  }): any {
    const systemContext: any = {
      totalModules: this.knowledgeBase.modules.length,
      modules: this.knowledgeBase.modules.map(m => ({
        id: m.id,
        name: m.name,
        type: m.type,
        description: m.description,
      })),
      integrations: this.knowledgeBase.integrations.map(i => ({
        from: i.from,
        to: i.to,
        type: i.type,
      })),
    };

    const resolvedModule = context.activeModule || context.module;

    if (resolvedModule) {
      const moduleKnowledge = getModuleKnowledge(resolvedModule);
      if (moduleKnowledge) {
        systemContext.currentModule = {
          ...moduleKnowledge,
          integrations: getModuleIntegrations(resolvedModule),
        };
      }
    }

    if (context.moduleFamily) {
      systemContext.moduleFamily = context.moduleFamily;
    }

    if (context.selectedOutlet) {
      systemContext.selectedOutlet = context.selectedOutlet;
    }

    if (context.surface) {
      systemContext.surface = context.surface;
    }

    if (context.permissions) {
      systemContext.permissionProfile = context.permissions;
    }

    if (context.userRole) {
      const roleKnowledge = getRoleKnowledge(context.userRole);
      if (roleKnowledge) {
        systemContext.userRole = roleKnowledge;
      }
    }

    return systemContext;
  }

  /**
   * Analyze query intent
   */
  private analyzeIntent(query: string): {
    type: "module" | "integration" | "workflow" | "role" | "code" | "general";
    keywords: string[];
  } {
    const keywords: string[] = [];
    let type: "module" | "integration" | "workflow" | "role" | "code" | "general" = "general";

    // Module-related queries
    if (query.match(/\b(module|recipe|inventory|schedule|financial|purchasing|ordering)\b/)) {
      type = "module";
      keywords.push(...query.match(/\b(module|recipe|inventory|schedule|financial|purchasing|ordering|culinary|pastry|genesis|echo-aurum|job-sharing|mixology)\b/g) || []);
    }

    // Integration queries
    if (query.match(/\b(integrate|connect|flow|data flow|workflow)\b/)) {
      type = "integration";
      keywords.push(...query.match(/\b(integrate|connect|flow|workflow|data flow)\b/g) || []);
    }

    // Role queries
    if (query.match(/\b(chef|manager|cpa|finance|purchasing|inventory|hr)\b/)) {
      type = "role";
      keywords.push(...query.match(/\b(chef|manager|cpa|finance|purchasing|inventory|hr|master|lead)\b/g) || []);
    }

    // Code queries
    if (query.match(/\b(code|function|component|service|api|route)\b/)) {
      type = "code";
      keywords.push(...query.match(/\b(code|function|component|service|api|route|file|import)\b/g) || []);
    }

    return { type, keywords };
  }

  /**
   * Get relevant knowledge for the query
   */
  private getRelevantKnowledge(
    query: string,
    intent: { type: string; keywords: string[] },
    context: { module?: string; activeModule?: string; moduleFamily?: string; userRole?: string; currentPage?: string }
  ): {
    modules: string[];
    integrations: string[];
    codeReferences: string[];
    documentation: string[];
    suggestedActions: string[];
    confidence: number;
  } {
    const modules: string[] = [];
    const integrations: string[] = [];
    const codeReferences: string[] = [];
    const documentation: string[] = [];
    const suggestedActions: string[] = [];

    // Find relevant modules
    const contextualModule = context.activeModule || context.module;
    if (contextualModule) {
      const moduleKnowledge = getModuleKnowledge(contextualModule);
      if (moduleKnowledge) {
        modules.push(moduleKnowledge.id);
        codeReferences.push(moduleKnowledge.path);
        documentation.push(`${moduleKnowledge.name} - ${moduleKnowledge.description}`);
      }
    }

    this.knowledgeBase.modules.forEach(module => {
      if (
        query.includes(module.id) ||
        query.includes(module.name.toLowerCase()) ||
        module.keyFeatures.some(feature => query.includes(feature.toLowerCase())) ||
        module.description.toLowerCase().includes(query.split(" ")[0])
      ) {
        modules.push(module.id);
        codeReferences.push(module.path);
        documentation.push(`${module.name} - ${module.description}`);
      }
    });

    // Find relevant integrations
    this.knowledgeBase.integrations.forEach(integration => {
      if (
        query.includes(integration.from.toLowerCase()) ||
        query.includes(integration.to.toLowerCase()) ||
        query.includes(integration.type)
      ) {
        integrations.push(`${integration.from} → ${integration.to}`);
        codeReferences.push(integration.implementation);
      }
    });

    // Find relevant roles
    if (intent.type === "role") {
      this.knowledgeBase.hospitalityDomain.roles.forEach(role => {
        if (query.includes(role.role.toLowerCase())) {
          suggestedActions.push(...role.tools);
          documentation.push(`${role.role} - ${role.responsibilities.join(", ")}`);
        }
      });
    }

    // Find relevant workflows
    this.knowledgeBase.hospitalityDomain.workflows.forEach(workflow => {
      if (query.includes(workflow.workflow.toLowerCase())) {
        suggestedActions.push(...workflow.steps);
        documentation.push(`${workflow.workflow} - ${workflow.description}`);
      }
    });

    if (context.moduleFamily === "finance") {
      suggestedActions.push("Check finance permissions before sharing payroll or compensation details");
    }

    if (context.moduleFamily === "hr") {
      suggestedActions.push("Use verified payroll access for salary or compensation questions");
    }

    // Calculate confidence based on matches
    const confidence = Math.min(1, (modules.length + integrations.length) * 0.3 + (codeReferences.length > 0 ? 0.4 : 0));

    return {
      modules: [...new Set(modules)],
      integrations: [...new Set(integrations)],
      codeReferences: [...new Set(codeReferences)],
      documentation: [...new Set(documentation)],
      suggestedActions: [...new Set(suggestedActions)],
      confidence,
    };
  }

  /**
   * Generate answer using OpenAI or system knowledge
   */
  private async generateAnswer(
    query: SystemQuery,
    systemContext: any,
    relevantKnowledge: any,
    intent: { type: string; keywords: string[] }
  ): Promise<string> {
    // 0) Hospitality-first retrieval: try Echo Culinary knowledge base (Pinecone/pgvector-backed)
    //    We keep this lightweight via dynamic import so non-culinary surfaces don't pay the cost.
    try {
      const likelyHospitality =
        /culinary|recipe|cook|bake|prep|sauce|mise en place|knife|station|menu|inventory|ordering|receiving|waste|labor|beverage|mixology|pastry|garde manger|serve|FOH|BOH|banquet/i.test(
          query.query,
        );
      if (likelyHospitality) {
        const { retrieveSmartly } = await import(
          "@/modules/Culinary/client/lib/echo-knowledge-retrieval"
        );
        const kb = await retrieveSmartly(query.query);
        if (kb && kb.answer && kb.confidence >= 0.6) {
          return `${kb.answer}\n\n(source: ${kb.source}${
            kb.sourceRecipe ? ` • ${kb.sourceRecipe}` : ""
          } • ${(kb.confidence * 100).toFixed(0)}% confidence)`;
        }
      }
    } catch (err) {
      // Non-fatal: continue with normal flow
      console.debug("[EchoAi^3] KB retrieval not available, continuing:", err);
    }

    // Build comprehensive prompt
    const systemPrompt = this.buildSystemPrompt(systemContext, relevantKnowledge);

    // Try OpenAI API via server endpoint (always try, server handles availability)
    try {
      const openAIResponse = await this.callOpenAI(query.query, systemPrompt, query.context);
      if (openAIResponse) {
        return openAIResponse;
      }
    } catch (error) {
      console.warn("[EchoAi^3] OpenAI call failed, using system knowledge:", error);
      this.lastError = error instanceof Error ? error.message : String(error);
    }

    // Fallback to system knowledge-based response
    return this.generateSystemResponse(query, systemContext, relevantKnowledge, intent);
  }

  /**
   * Build comprehensive system prompt for OpenAI
   */
  private buildSystemPrompt(systemContext: any, relevantKnowledge: any): string {
    return `You are EchoAi^3, the complete understanding system for LUCCCA Framework - a comprehensive hospitality management platform.

SYSTEM KNOWLEDGE:
${JSON.stringify(systemContext, null, 2)}

RELEVANT KNOWLEDGE:
${JSON.stringify(relevantKnowledge, null, 2)}

DOMAIN KNOWLEDGE:
- Master Chef: Recipe development, menu engineering, food cost control, kitchen operations
- Lead CPA/Finance: Financial reporting, budget management, cost control, AP/AR, audit compliance
- Purchasing Manager: Vendor management, purchase orders, receiving, inventory optimization
- Inventory Manager: Inventory tracking, par levels, storage organization, waste tracking
- HR Manager: Employee management, scheduling, payroll, compliance

MODULES:
${this.knowledgeBase.modules.map(m => `- ${m.name} (${m.id}): ${m.description}`).join("\n")}

INTEGRATIONS:
${this.knowledgeBase.integrations.map(i => `- ${i.from} → ${i.to}: ${i.description}`).join("\n")}

You understand every module, every integration, every workflow, every role, and every piece of code in the system.
Answer questions accurately, provide code references when relevant, and suggest actions when appropriate.
Be concise but comprehensive.`;
  }

  /**
   * Call OpenAI API via server endpoint (no client-side env vars)
   */
  private async callOpenAI(userQuery: string, systemPrompt: string, context?: any): Promise<string | null> {
    try {
      const actionContext = context?.actionContext as { orgId?: string; actor?: { userId: string; role: string }; sessionId?: string; traceId?: string } | undefined;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (actionContext?.traceId) headers["X-Trace-Id"] = actionContext.traceId;
      if (actionContext?.sessionId) headers["X-Session-Id"] = actionContext.sessionId;
      if (actionContext?.orgId) headers["X-Org-ID"] = actionContext.orgId;

      const response = await fetch("/api/echo-ai3/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: [
            ...this.conversationHistory,
            { role: "user", content: userQuery },
          ],
          systemPrompt,
          context,
          actionContext: actionContext ?? undefined,
          stream: false,
        }),
      });

      if (!response.ok) {
        let errorMsg = `OpenAI API error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch (e) {
          // If JSON parsing fails, try to get text
          try {
            const text = await response.text();
            if (text) errorMsg = `${errorMsg} - ${text.substring(0, 100)}`;
          } catch (_) { /* ignore */ }
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const answer = data.response;

      if (answer) {
        // Store in conversation history
        this.conversationHistory.push(
          { role: "user", content: userQuery },
          { role: "assistant", content: answer }
        );

        // Keep history manageable (last 10 exchanges)
        if (this.conversationHistory.length > 20) {
          this.conversationHistory = this.conversationHistory.slice(-20);
        }
      }

      return answer || null;
    } catch (error) {
      console.error("[EchoAi^3] OpenAI call error:", error);
      return null;
    }
  }

  /**
   * Generate response from system knowledge
   */
  private generateSystemResponse(
    query: SystemQuery,
    systemContext: any,
    relevantKnowledge: any,
    intent: { type: string; keywords: string[] }
  ): string {
    let response = "";

    if (relevantKnowledge.modules.length > 0) {
      const modules = relevantKnowledge.modules
        .map((id: string) => getModuleKnowledge(id))
        .filter(Boolean);

      response += `I found information about ${modules.length} module(s):\n\n`;
      modules.forEach((module: any) => {
        response += `**${module.name}**\n`;
        response += `${module.description}\n\n`;
        response += `Key Features: ${module.keyFeatures.slice(0, 3).join(", ")}\n\n`;
        if (module.integrations && module.integrations.length > 0) {
          response += `Integrations: ${module.integrations.slice(0, 3).join(", ")}\n\n`;
        }
      });
    }

    if (relevantKnowledge.integrations.length > 0) {
      response += `\n**Integrations:**\n`;
      relevantKnowledge.integrations.forEach((integration: string) => {
        response += `- ${integration}\n`;
      });
      response += "\n";
    }

    if (relevantKnowledge.codeReferences.length > 0) {
      response += `\n**Code References:**\n`;
      relevantKnowledge.codeReferences.slice(0, 5).forEach((ref: string) => {
        response += `- \`${ref}\`\n`;
      });
      response += "\n";
    }

    if (relevantKnowledge.suggestedActions.length > 0) {
      response += `\n**Suggested Actions:**\n`;
      relevantKnowledge.suggestedActions.slice(0, 5).forEach((action: string) => {
        response += `- ${action}\n`;
      });
    }

    if (!response) {
      response = `I understand you're asking about "${query.query}". Let me help you understand the LUCCCA Framework system.

The system consists of ${systemContext.totalModules} modules covering:
- Culinary operations (Recipes, Menu, R&D)
- Inventory management (Ordering, Receiving, Storage)
- Financial operations (GL, AP, Reporting)
- Human Resources (Scheduling, Job Sharing)
- And more...

Can you be more specific about what you'd like to know? For example:
- "How does recipe creation work?"
- "What modules integrate with Inventory?"
- "How do I create a purchase order?"
- "What tools does a Master Chef use?"
- "What will my prep list need to be in 15 days?"

${this.lastError ? `\n(Note: My AI brain returned an error: ${this.lastError}. I'm falling back to my core system knowledge for now.)` : ""}`;
    }

    return response;
  }

  /**
   * Get module understanding
   */
  getModuleUnderstanding(moduleId: string): string {
    const module = getModuleKnowledge(moduleId);
    if (!module) {
      return `Module "${moduleId}" not found in system knowledge.`;
    }

    const integrations = getModuleIntegrations(moduleId);

    return `**${module.name}**

${module.description}

**Type:** ${module.type}
**Path:** \`${module.path}\`

**Key Features:**
${module.keyFeatures.map(f => `- ${f}`).join("\n")}

**Integrations:**
${integrations.length > 0 ? integrations.map(i => `- ${i.from} → ${i.to}: ${i.description}`).join("\n") : "None"}

**Data Flows:**
${module.dataFlows.map(f => `- ${f}`).join("\n")}

**Components:**
${module.components.join(", ")}

**API Endpoints:**
${module.apiEndpoints.map(e => `- ${e}`).join("\n")}`;
  }

  /**
   * Get role understanding
   */
  getRoleUnderstanding(role: string): string {
    const roleKnowledge = getRoleKnowledge(role);
    if (!roleKnowledge) {
      return `Role "${role}" not found in system knowledge.`;
    }

    return `**${roleKnowledge.role}**

**Responsibilities:**
${roleKnowledge.responsibilities.map(r => `- ${r}`).join("\n")}

**Tools:**
${roleKnowledge.tools.map(t => `- ${t}`).join("\n")}

**Knowledge Required:**
${roleKnowledge.knowledgeRequired.map(k => `- ${k}`).join("\n")}

**Typical Questions:**
${roleKnowledge.typicalQuestions.map(q => `- "${q}"`).join("\n")}`;
  }
}

// Exports
export interface SystemQuery {
  query: string;
  context?: {
    module?: string;
    activeModule?: string;
    moduleFamily?: string;
    userRole?: string;
    currentPage?: string;
    selectedOutlet?: string;
    permissions?: Record<string, any>;
    surface?: string;
  };
}

export interface SystemResponse {
  answer: string;
  relatedModules?: string[];
  relatedIntegrations?: string[];
  codeReferences?: string[];
  documentation?: string[];
  suggestedActions?: string[];
  confidence: number;
  error?: string;
}

// Singleton instance
let unifiedBrainInstance: EchoAi3UnifiedBrain | null = null;

export function getEchoAi3UnifiedBrain(): EchoAi3UnifiedBrain {
  if (!unifiedBrainInstance) {
    unifiedBrainInstance = new EchoAi3UnifiedBrain();
  }
  return unifiedBrainInstance;
}
