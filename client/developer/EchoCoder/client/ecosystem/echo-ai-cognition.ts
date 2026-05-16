/**
 * EchoAI Module Cognition System
 * Enables EchoAI to understand, analyze, and interact with all system modules
 * Provides semantic understanding, intent recognition, and module orchestration
 */

export interface ModuleSignature {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  inputs: { name: string; type: string; required: boolean }[];
  outputs: { name: string; type: string }[];
  dependencies: string[];
  apiEndpoints?: string[];
}

export interface ModuleKnowledge {
  moduleId: string;
  signature: ModuleSignature;
  semanticTokens: string[];
  intents: string[];
  relatedModules: string[];
  indexedAt: number;
  lastUpdated: number;
}

export interface CognitionQuery {
  intent: string;
  context?: Record<string, any>;
  targetModules?: string[];
  parameters?: Record<string, any>;
}

export interface CognitionResult {
  matchedModules: string[];
  suggestedAction: string;
  confidence: number;
  reasoning: string;
}

const COGNITION_INDEX_KEY = "echo-ai.cognition.index";
const MODULE_KNOWLEDGE_KEY = "echo-ai.module.knowledge";

export class EchoAICognition {
  private moduleIndex: Map<string, ModuleKnowledge> = new Map();
  private semanticIndex: Map<string, string[]> = new Map(); // token -> moduleIds
  private intentMap: Map<string, string[]> = new Map(); // intent -> moduleIds
  private isInitialized = false;

  constructor() {
    this.loadFromCache();
  }

  /**
   * Initialize cognition system with all available modules
   */
  async initialize(): Promise<void> {
    console.log("🧠 Initializing EchoAI Cognition System...");

    try {
      // Load core modules
      const coreModules = this.getSystemModules();

      // Load Builder.io imported modules
      const importedModules = this.getImportedModules();

      // Index all modules
      const allModules = [...coreModules, ...importedModules];

      for (const module of allModules) {
        await this.indexModule(module);
      }

      this.isInitialized = true;
      this.saveToCache();

      console.log(`✅ EchoAI indexed ${this.moduleIndex.size} modules`);
    } catch (error) {
      console.error("Error initializing EchoAI cognition:", error);
    }
  }

  /**
   * Index a module for cognition
   */
  async indexModule(module: any): Promise<void> {
    try {
      const signature = this.extractModuleSignature(module);
      const semanticTokens = this.generateSemanticTokens(module);
      const intents = this.extractIntents(module);
      const relatedModules = this.findRelatedModules(module);

      const knowledge: ModuleKnowledge = {
        moduleId: module.id,
        signature,
        semanticTokens,
        intents,
        relatedModules,
        indexedAt: Date.now(),
        lastUpdated: Date.now(),
      };

      this.moduleIndex.set(module.id, knowledge);

      // Update semantic index
      for (const token of semanticTokens) {
        if (!this.semanticIndex.has(token)) {
          this.semanticIndex.set(token, []);
        }
        this.semanticIndex.get(token)!.push(module.id);
      }

      // Update intent map
      for (const intent of intents) {
        if (!this.intentMap.has(intent)) {
          this.intentMap.set(intent, []);
        }
        this.intentMap.get(intent)!.push(module.id);
      }

      console.log(
        `📚 Indexed module: ${module.name} (${signature.capabilities.length} capabilities)`,
      );
    } catch (error) {
      console.error(`Error indexing module ${module.id}:`, error);
    }
  }

  /**
   * Process a cognition query
   */
  async query(q: CognitionQuery): Promise<CognitionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log(`🔍 Processing EchoAI query: "${q.intent}"`);

    try {
      // Find modules matching intent
      const intentMatches = this.intentMap.get(q.intent.toLowerCase()) || [];

      // Find modules matching semantic tokens
      const tokens = this.tokenize(q.intent);
      const semanticMatches = new Set<string>();
      for (const token of tokens) {
        const matches = this.semanticIndex.get(token) || [];
        matches.forEach((m) => semanticMatches.add(m));
      }

      // Combine and rank results
      const candidates = new Set([...intentMatches, ...semanticMatches]);

      // Filter by target modules if specified
      let matchedModules = Array.from(candidates);
      if (q.targetModules && q.targetModules.length > 0) {
        matchedModules = matchedModules.filter((m) =>
          q.targetModules!.includes(m),
        );
      }

      // Score and rank
      const ranked = this.rankModules(matchedModules, q);
      const topMatch = ranked[0];

      const confidence =
        ranked.length > 0 ? Math.min(100, 50 + matched.length * 10) : 0;

      const result: CognitionResult = {
        matchedModules: ranked.slice(0, 3), // Top 3 matches
        suggestedAction: topMatch
          ? `Execute ${this.moduleIndex.get(topMatch)?.signature.name} module`
          : "No suitable module found",
        confidence: Math.min(100, confidence),
        reasoning: this.generateReasoning(q, ranked),
      };

      console.log(
        `✨ EchoAI matched ${result.matchedModules.length} modules (confidence: ${result.confidence}%)`,
      );

      return result;
    } catch (error) {
      console.error("Error processing cognition query:", error);
      return {
        matchedModules: [],
        suggestedAction: "Error processing query",
        confidence: 0,
        reasoning: `Error: ${error}`,
      };
    }
  }

  /**
   * Extract module signature
   */
  private extractModuleSignature(module: any): ModuleSignature {
    return {
      id: module.id,
      name: module.name,
      description: module.description || "",
      capabilities: module.capabilities || this.inferCapabilities(module),
      inputs: module.inputs || [],
      outputs: module.outputs || [],
      dependencies: module.dependencies || [],
      apiEndpoints: module.apiEndpoints || [],
    };
  }

  /**
   * Infer module capabilities
   */
  private inferCapabilities(module: any): string[] {
    const capabilities = [];

    // Infer from module name and description
    const text = `${module.name} ${module.description || ""}`.toLowerCase();

    if (text.includes("recipe") || text.includes("culinary"))
      capabilities.push("recipe_management");
    if (text.includes("schedule") || text.includes("timeline"))
      capabilities.push("scheduling");
    if (text.includes("inventory")) capabilities.push("inventory_tracking");
    if (text.includes("crm") || text.includes("customer"))
      capabilities.push("customer_management");
    if (text.includes("chat") || text.includes("message"))
      capabilities.push("communication");
    if (text.includes("payment") || text.includes("order"))
      capabilities.push("transaction");
    if (text.includes("report") || text.includes("analytics"))
      capabilities.push("analytics");
    if (text.includes("design") || text.includes("canvas"))
      capabilities.push("design");
    if (text.includes("video")) capabilities.push("video_streaming");
    if (text.includes("team") || text.includes("collaboration"))
      capabilities.push("collaboration");

    return capabilities.length > 0 ? capabilities : ["general"];
  }

  /**
   * Generate semantic tokens
   */
  private generateSemanticTokens(module: any): string[] {
    const text = `${module.name} ${module.description || ""}`.toLowerCase();
    const words = text.split(/\s+/);

    // Filter out common words
    const stopwords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "is",
      "it",
      "of",
      "to",
      "for",
    ]);

    return words.filter((w) => w.length > 2 && !stopwords.has(w));
  }

  /**
   * Extract intents
   */
  private extractIntents(module: any): string[] {
    const intents: string[] = [];

    // Map module names/descriptions to intents
    const nameTokens =
      `${module.name} ${module.description || ""}`.toLowerCase();

    if (
      nameTokens.includes("recipe") ||
      nameTokens.includes("cook") ||
      nameTokens.includes("culinary")
    ) {
      intents.push("manage_recipes", "view_ingredients", "plan_meal");
    }
    if (nameTokens.includes("schedule") || nameTokens.includes("calendar")) {
      intents.push("schedule_task", "view_calendar", "plan_production");
    }
    if (nameTokens.includes("customer") || nameTokens.includes("crm")) {
      intents.push("manage_customers", "view_orders", "customer_analytics");
    }
    if (nameTokens.includes("inventory")) {
      intents.push("track_inventory", "manage_supplies", "stock_alert");
    }
    if (nameTokens.includes("team") || nameTokens.includes("collaboration")) {
      intents.push("collaborate", "share_data", "team_communication");
    }

    return intents.length > 0 ? intents : ["execute_module"];
  }

  /**
   * Find related modules
   */
  private findRelatedModules(module: any): string[] {
    // Would implement based on module dependencies and shared capabilities
    return module.dependencies || [];
  }

  /**
   * Tokenize query
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);
  }

  /**
   * Rank modules by relevance
   */
  private rankModules(modules: string[], query: CognitionQuery): string[] {
    return modules.sort((a, b) => {
      const aKnowledge = this.moduleIndex.get(a);
      const bKnowledge = this.moduleIndex.get(b);

      if (!aKnowledge || !bKnowledge) return 0;

      // Score based on intent matches
      const aIntentScore = query.intent
        ? (aKnowledge.intents.filter((i) => i.includes(query.intent)).length /
            aKnowledge.intents.length) *
          100
        : 0;

      const bIntentScore = query.intent
        ? (bKnowledge.intents.filter((i) => i.includes(query.intent)).length /
            bKnowledge.intents.length) *
          100
        : 0;

      return bIntentScore - aIntentScore;
    });
  }

  /**
   * Generate reasoning explanation
   */
  private generateReasoning(query: CognitionQuery, matched: string[]): string {
    if (matched.length === 0) {
      return "No modules matched the query intent or parameters";
    }

    const topModule = this.moduleIndex.get(matched[0]);
    if (!topModule) return "Unable to generate reasoning";

    const matchingIntents = topModule.intents.filter((i) =>
      i.includes(query.intent),
    );
    const reason =
      matchingIntents.length > 0
        ? `Matched intents: ${matchingIntents.join(", ")}`
        : `Module provides: ${topModule.signature.capabilities.join(", ")}`;

    return `Found ${matched.length} potential module(s). ${reason}`;
  }

  /**
   * Get all indexed modules
   */
  getIndexedModules(): ModuleKnowledge[] {
    return Array.from(this.moduleIndex.values());
  }

  /**
   * Get module knowledge
   */
  getModuleKnowledge(moduleId: string): ModuleKnowledge | undefined {
    return this.moduleIndex.get(moduleId);
  }

  /**
   * Get system modules (core modules)
   */
  private getSystemModules(): any[] {
    const coreModules = [
      {
        id: "culinary",
        name: "Culinary",
        description: "Recipe management and cooking techniques",
      },
      {
        id: "pastry",
        name: "Pastry",
        description: "Cake design and pastry management",
      },
      {
        id: "schedule",
        name: "Schedule",
        description: "Production timeline and scheduling",
      },
      {
        id: "inventory",
        name: "Inventory",
        description: "Supply and ingredient tracking",
      },
      {
        id: "crm",
        name: "CRM",
        description: "Customer relationship management",
      },
      {
        id: "maestro",
        name: "Maestro",
        description: "Kitchen management and operations",
      },
      {
        id: "mixology",
        name: "Mixology",
        description: "Bar management and drink creation",
      },
      {
        id: "chefnet",
        name: "ChefNet",
        description: "Team collaboration and communication",
      },
      {
        id: "support",
        name: "Support",
        description: "Help desk and customer support",
      },
      {
        id: "canvas",
        name: "Canvas",
        description: "Design canvas and visual creation",
      },
      {
        id: "whiteboard",
        name: "Whiteboard",
        description: "Collaborative whiteboarding",
      },
      {
        id: "video",
        name: "Video",
        description: "Video conferencing and streaming",
      },
      {
        id: "stickynotes",
        name: "StickyNotes",
        description: "Quick note taking",
      },
      {
        id: "echocoder",
        name: "EchoCoder",
        description: "AI module generation and coding",
      },
      {
        id: "aurum",
        name: "Aurum",
        description: "Financial tracking and management",
      },
      {
        id: "layout",
        name: "Layout",
        description: "Layout builder and design tools",
      },
    ];

    return coreModules;
  }

  /**
   * Get imported Builder.io modules
   */
  private getImportedModules(): any[] {
    try {
      const data = localStorage.getItem("builder-io.modules");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save cognition index to cache
   */
  private saveToCache(): void {
    try {
      const data = {
        moduleIndex: Array.from(this.moduleIndex.values()),
        semanticIndex: Array.from(this.semanticIndex.entries()),
        intentMap: Array.from(this.intentMap.entries()),
      };
      localStorage.setItem(COGNITION_INDEX_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save cognition index:", error);
    }
  }

  /**
   * Load cognition index from cache
   */
  private loadFromCache(): void {
    try {
      const cached = localStorage.getItem(COGNITION_INDEX_KEY);
      if (!cached) return;

      const data = JSON.parse(cached);

      // Rebuild maps
      for (const knowledge of data.moduleIndex) {
        this.moduleIndex.set(knowledge.moduleId, knowledge);
      }

      for (const [token, modules] of data.semanticIndex) {
        this.semanticIndex.set(token, modules);
      }

      for (const [intent, modules] of data.intentMap) {
        this.intentMap.set(intent, modules);
      }

      this.isInitialized = true;
      console.log(
        `✅ Loaded EchoAI cognition index (${this.moduleIndex.size} modules)`,
      );
    } catch (error) {
      console.error("Failed to load cognition index:", error);
    }
  }

  /**
   * Clear all cognition data
   */
  clearCache(): void {
    this.moduleIndex.clear();
    this.semanticIndex.clear();
    this.intentMap.clear();
    this.isInitialized = false;
    localStorage.removeItem(COGNITION_INDEX_KEY);
  }

  /**
   * Get cognition statistics
   */
  getStatistics(): {
    totalModules: number;
    totalIntents: number;
    totalTokens: number;
    isInitialized: boolean;
  } {
    return {
      totalModules: this.moduleIndex.size,
      totalIntents: this.intentMap.size,
      totalTokens: this.semanticIndex.size,
      isInitialized: this.isInitialized,
    };
  }
}

// Singleton instance
let cognitionEngine: EchoAICognition | null = null;

export function getEchoAICognition(): EchoAICognition {
  if (!cognitionEngine) {
    cognitionEngine = new EchoAICognition();
  }
  return cognitionEngine;
}
