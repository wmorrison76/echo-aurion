/**
 * EchoAI³ Cross-Domain Intelligence Engine
 * ----------------------------------------
 * Enables EchoAI³ to reason across multiple domains simultaneously
 * Example: "Based on forecasted demand, available inventory, and labor costs, recommend optimal menu pricing"
 */

import {
  CulinaryScienceEngine,
  FinanceEngine,
  InventoryEngine,
  LaborEngine,
  ForecastEngine,
  CRMEngine,
  HospitalityOpsEngine,
  BanquetOpsEngine,
} from "../engines";

export interface CrossDomainQuery {
  query: string;
  domains: string[]; // e.g., ["inventory", "finance", "labor"]
  context?: Record<string, any>;
}

export interface CrossDomainResponse {
  query: string;
  domains: string[];
  results: Record<string, any>; // Results from each domain
  reasoning: string; // Cross-domain reasoning chain
  recommendation?: string;
  confidence: number;
  timestamp: string;
}

export interface DomainResult {
  domain: string;
  result: any;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface KnowledgeGraphNode {
  id: string;
  type: "entity" | "concept" | "relationship";
  domain: string;
  properties: Record<string, any>;
  relationships: string[]; // IDs of connected nodes
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  type: string; // e.g., "influences", "depends_on", "affects"
  weight: number; // 0-1, strength of relationship
  properties?: Record<string, any>;
}

/**
 * Cross-Domain Intelligence Engine
 * Orchestrates queries across multiple domains and synthesizes results
 */
export class CrossDomainIntelligenceEngine {
  private knowledgeGraph: Map<string, KnowledgeGraphNode> = new Map();
  private graphEdges: Map<string, KnowledgeGraphEdge> = new Map();
  private domainEngines: Map<string, any> = new Map();

  constructor() {
    this.initializeDomainEngines();
    this.initializeKnowledgeGraph();
  }

  /**
   * Initialize domain engines
   */
  private initializeDomainEngines() {
    // Register all domain engines
    this.domainEngines.set("culinary", CulinaryScienceEngine);
    this.domainEngines.set("finance", FinanceEngine);
    this.domainEngines.set("inventory", InventoryEngine);
    this.domainEngines.set("labor", LaborEngine);
    this.domainEngines.set("forecast", ForecastEngine);
    this.domainEngines.set("crm", CRMEngine);
    this.domainEngines.set("hospitality", HospitalityOpsEngine);
    this.domainEngines.set("banquet", BanquetOpsEngine);
  }

  /**
   * Initialize knowledge graph with domain relationships
   */
  private initializeKnowledgeGraph() {
    // Recipe -> Inventory relationship
    this.addGraphNode({
      id: "recipe_inventory",
      type: "relationship",
      domain: "cross_domain",
      properties: {
        relationship: "recipe_uses_inventory",
        description: "Recipes consume inventory items",
      },
      relationships: [],
    });

    // Inventory -> Finance relationship
    this.addGraphNode({
      id: "inventory_finance",
      type: "relationship",
      domain: "cross_domain",
      properties: {
        relationship: "inventory_affects_cost",
        description: "Inventory costs affect financial P&L",
      },
      relationships: [],
    });

    // Labor -> Finance relationship
    this.addGraphNode({
      id: "labor_finance",
      type: "relationship",
      domain: "cross_domain",
      properties: {
        relationship: "labor_affects_cost",
        description: "Labor costs affect financial P&L",
      },
      relationships: [],
    });

    // Forecast -> Inventory relationship
    this.addGraphNode({
      id: "forecast_inventory",
      type: "relationship",
      domain: "cross_domain",
      properties: {
        relationship: "forecast_drives_ordering",
        description: "Demand forecasts drive inventory ordering",
      },
      relationships: [],
    });

    // Forecast -> Labor relationship
    this.addGraphNode({
      id: "forecast_labor",
      type: "relationship",
      domain: "cross_domain",
      properties: {
        relationship: "forecast_drives_scheduling",
        description: "Demand forecasts drive labor scheduling",
      },
      relationships: [],
    });

    // Add edges
    this.addGraphEdge({
      id: "recipe_to_inventory",
      source: "recipe_inventory",
      target: "inventory_finance",
      type: "influences",
      weight: 0.8,
    });

    this.addGraphEdge({
      id: "inventory_to_finance",
      source: "inventory_finance",
      target: "labor_finance",
      type: "affects",
      weight: 0.9,
    });

    this.addGraphEdge({
      id: "forecast_to_inventory",
      source: "forecast_inventory",
      target: "inventory_finance",
      type: "drives",
      weight: 0.85,
    });

    this.addGraphEdge({
      id: "forecast_to_labor",
      source: "forecast_labor",
      target: "labor_finance",
      type: "drives",
      weight: 0.9,
    });
  }

  /**
   * Execute cross-domain query
   */
  async executeQuery(query: CrossDomainQuery): Promise<CrossDomainResponse> {
    const startTime = Date.now();
    const results: Record<string, DomainResult> = {};

    // Step 1: Determine relevant domains if not specified
    const domains =
      query.domains.length > 0
        ? query.domains
        : this.identifyRelevantDomains(query.query);

    // Step 2: Execute queries in parallel for each domain
    const domainPromises = domains.map((domain) =>
      this.queryDomain(domain, query.query, query.context || {}),
    );

    const domainResults = await Promise.all(domainPromises);

    // Step 3: Build results map
    domainResults.forEach((result, index) => {
      results[domains[index]] = result;
    });

    // Step 4: Cross-domain reasoning
    const reasoning = await this.generateCrossDomainReasoning(
      query.query,
      domains,
      results,
    );

    // Step 5: Generate recommendation
    const recommendation = await this.generateRecommendation(
      query.query,
      results,
      reasoning,
    );

    // Step 6: Calculate overall confidence
    const confidence = this.calculateConfidence(results);

    const responseTime = Date.now() - startTime;

    return {
      query: query.query,
      domains,
      results: this.formatResults(results),
      reasoning,
      recommendation,
      confidence,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Identify relevant domains from query text
   */
  private identifyRelevantDomains(query: string): string[] {
    const domainKeywords: Record<string, string[]> = {
      inventory: ["inventory", "stock", "supplies", "items", "products"],
      finance: [
        "cost",
        "price",
        "revenue",
        "profit",
        "margin",
        "budget",
        "financial",
        "p&l",
      ],
      labor: [
        "labor",
        "staff",
        "schedule",
        "shift",
        "employee",
        "workforce",
        "hours",
      ],
      forecast: [
        "forecast",
        "prediction",
        "demand",
        "future",
        "trend",
        "projection",
      ],
      culinary: ["recipe", "menu", "dish", "ingredient", "cooking", "culinary"],
      hospitality: ["service", "guest", "table", "reservation", "hospitality"],
      banquet: ["banquet", "event", "catering", "beo"],
      crm: ["customer", "guest", "visitor", "loyalty", "preference"],
    };

    const lowerQuery = query.toLowerCase();
    const relevantDomains: string[] = [];

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some((keyword) => lowerQuery.includes(keyword))) {
        relevantDomains.push(domain);
      }
    }

    // Default to all domains if no keywords found
    return relevantDomains.length > 0
      ? relevantDomains
      : ["inventory", "finance", "labor", "forecast"];
  }

  /**
   * Query a specific domain
   */
  private async queryDomain(
    domain: string,
    query: string,
    context: Record<string, any>,
  ): Promise<DomainResult> {
    const engine = this.domainEngines.get(domain);

    if (!engine) {
      return {
        domain,
        result: { error: `Domain engine not found: ${domain}` },
        confidence: 0,
      };
    }

    try {
      // Parse query intent for domain-specific query
      const domainQuery = this.parseDomainQuery(domain, query, context);

      // Execute domain-specific query
      const result = await this.executeDomainQuery(engine, domain, domainQuery);

      return {
        domain,
        result,
        confidence: 0.85, // Base confidence, can be improved with ML
        metadata: {
          query: domainQuery,
          executionTime: Date.now(),
        },
      };
    } catch (error) {
      console.error(
        `[CrossDomainEngine] Domain query error (${domain}):`,
        error,
      );
      return {
        domain,
        result: { error: (error as Error).message },
        confidence: 0,
      };
    }
  }

  /**
   * Parse query into domain-specific format
   */
  private parseDomainQuery(
    domain: string,
    query: string,
    context: Record<string, any>,
  ): any {
    // This is a simplified parser - in production, use NLP/LLM
    const lowerQuery = query.toLowerCase();

    switch (domain) {
      case "inventory":
        if (lowerQuery.includes("reorder") || lowerQuery.includes("order")) {
          return { type: "reorder_recommendation", context };
        }
        if (lowerQuery.includes("cost") || lowerQuery.includes("price")) {
          return { type: "cost_analysis", context };
        }
        return { type: "status", context };

      case "finance":
        if (lowerQuery.includes("cost") || lowerQuery.includes("recipe cost")) {
          return { type: "recipe_cost", context };
        }
        if (lowerQuery.includes("p&l") || lowerQuery.includes("profit")) {
          return { type: "pnl_analysis", context };
        }
        return { type: "financial_summary", context };

      case "labor":
        if (lowerQuery.includes("schedule") || lowerQuery.includes("shift")) {
          return { type: "labor_plan", context };
        }
        if (lowerQuery.includes("cost")) {
          return { type: "labor_cost", context };
        }
        return { type: "labor_status", context };

      case "forecast":
        return { type: "demand_forecast", context };

      default:
        return { type: "general_query", query, context };
    }
  }

  /**
   * Execute domain-specific query
   */
  private async executeDomainQuery(
    engine: any,
    domain: string,
    query: any,
  ): Promise<any> {
    try {
      switch (domain) {
        case "inventory":
          if (query.type === "reorder_recommendation") {
            // Mock - would call InventoryEngine.recommendReorders
            return {
              recommendations: [],
              urgency: "low",
              reasoning:
                "Based on current inventory levels and consumption patterns",
            };
          }
          break;

        case "finance":
          if (query.type === "recipe_cost") {
            // Mock - would call FinanceEngine.calculateRecipeCost
            return {
              totalCost: 0,
              costPerPortion: 0,
              margin: 0,
            };
          }
          if (query.type === "pnl_analysis") {
            // Mock - would call FinanceEngine.analyzePnL
            return {
              revenue: 0,
              costs: 0,
              profit: 0,
              margin: 0,
            };
          }
          break;

        case "labor":
          if (query.type === "labor_plan") {
            // Mock - would call LaborEngine.assessLaborPlan
            return {
              recommendedHours: 0,
              estimatedCost: 0,
              coverage: "adequate",
            };
          }
          break;

        case "forecast":
          if (query.type === "demand_forecast") {
            // Mock - would call ForecastEngine.forecastFromHistory
            return {
              forecast: [],
              confidence: 0.8,
              factors: [],
            };
          }
          break;
      }

      // Default: return empty result
      return {
        message: `Query type ${query.type} not yet implemented for ${domain}`,
      };
    } catch (error) {
      throw new Error(
        `Domain query execution failed: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Generate cross-domain reasoning chain
   */
  private async generateCrossDomainReasoning(
    query: string,
    domains: string[],
    results: Record<string, DomainResult>,
  ): Promise<string> {
    // Build reasoning chain based on knowledge graph relationships
    const reasoningParts: string[] = [];

    // Analyze relationships between domains
    for (const domain of domains) {
      const result = results[domain];
      if (result && result.confidence > 0.5) {
        reasoningParts.push(
          `${domain}: ${JSON.stringify(result.result).substring(0, 100)}...`,
        );
      }
    }

    // Add cross-domain insights
    if (domains.includes("forecast") && domains.includes("inventory")) {
      reasoningParts.push(
        "Forecast results can inform inventory reordering decisions.",
      );
    }

    if (domains.includes("inventory") && domains.includes("finance")) {
      reasoningParts.push(
        "Inventory costs directly impact financial performance.",
      );
    }

    if (domains.includes("labor") && domains.includes("finance")) {
      reasoningParts.push("Labor costs significantly affect profit margins.");
    }

    return reasoningParts.join("\n\n");
  }

  /**
   * Generate recommendation from cross-domain results
   */
  private async generateRecommendation(
    query: string,
    results: Record<string, DomainResult>,
    reasoning: string,
  ): Promise<string | undefined> {
    // Simple recommendation generation - in production, use LLM
    const domains = Object.keys(results);

    if (domains.length === 0) {
      return undefined;
    }

    if (
      domains.includes("inventory") &&
      domains.includes("finance") &&
      domains.includes("forecast")
    ) {
      return `Based on demand forecast and current inventory levels, consider optimizing ordering to reduce costs while maintaining service levels. Financial analysis shows potential for $X in cost savings.`;
    }

    if (domains.includes("labor") && domains.includes("forecast")) {
      return `Based on demand forecast, recommended labor allocation is X hours at an estimated cost of $Y.`;
    }

    return `Based on analysis across ${domains.join(", ")}, review the detailed results above for actionable insights.`;
  }

  /**
   * Calculate overall confidence from domain results
   */
  private calculateConfidence(results: Record<string, DomainResult>): number {
    const confidences = Object.values(results).map((r) => r.confidence);
    if (confidences.length === 0) return 0;

    // Average confidence weighted by domain importance
    const avgConfidence =
      confidences.reduce((sum, c) => sum + c, 0) / confidences.length;

    // Penalize if any critical domain has low confidence
    const criticalDomains = ["finance", "inventory"];
    const criticalConfidences = criticalDomains
      .filter((d) => results[d])
      .map((d) => results[d].confidence);

    if (criticalConfidences.length > 0) {
      const minCriticalConfidence = Math.min(...criticalConfidences);
      if (minCriticalConfidence < 0.5) {
        return avgConfidence * 0.7; // Penalize
      }
    }

    return avgConfidence;
  }

  /**
   * Format results for response
   */
  private formatResults(
    results: Record<string, DomainResult>,
  ): Record<string, any> {
    const formatted: Record<string, any> = {};

    for (const [domain, result] of Object.entries(results)) {
      formatted[domain] = {
        result: result.result,
        confidence: result.confidence,
        metadata: result.metadata,
      };
    }

    return formatted;
  }

  /**
   * Add node to knowledge graph
   */
  private addGraphNode(node: KnowledgeGraphNode) {
    this.knowledgeGraph.set(node.id, node);
  }

  /**
   * Add edge to knowledge graph
   */
  private addGraphEdge(edge: KnowledgeGraphEdge) {
    this.graphEdges.set(edge.id, edge);
  }

  /**
   * Get knowledge graph node
   */
  getGraphNode(id: string): KnowledgeGraphNode | undefined {
    return this.knowledgeGraph.get(id);
  }

  /**
   * Get knowledge graph edges
   */
  getGraphEdges(): KnowledgeGraphEdge[] {
    return Array.from(this.graphEdges.values());
  }

  /**
   * Find relationships between domains
   */
  findDomainRelationships(
    domain1: string,
    domain2: string,
  ): KnowledgeGraphEdge[] {
    return Array.from(this.graphEdges.values()).filter(
      (edge) =>
        (edge.source.includes(domain1) && edge.target.includes(domain2)) ||
        (edge.source.includes(domain2) && edge.target.includes(domain1)),
    );
  }
}

// Singleton instance
let crossDomainEngineInstance: CrossDomainIntelligenceEngine | null = null;

export function getCrossDomainEngine(): CrossDomainIntelligenceEngine {
  if (!crossDomainEngineInstance) {
    crossDomainEngineInstance = new CrossDomainIntelligenceEngine();
  }
  return crossDomainEngineInstance;
}

export default CrossDomainIntelligenceEngine;
