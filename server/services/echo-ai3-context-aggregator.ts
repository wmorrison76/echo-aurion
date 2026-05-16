/**
 * EchoAI^3 Context Aggregator
 * Aggregates context across multiple modules for cross-domain reasoning
 */

import { logger } from "../lib/logger";

export interface ModuleContext {
  module: string;
  context: Record<string, any>;
  timestamp: string;
  relevanceScore: number;
}

export interface AggregatedContext {
  contexts: ModuleContext[];
  aggregatedData: Record<string, any>;
  crossDomainInsights: string[];
  confidence: number;
}

export class EchoAI3ContextAggregator {
  private moduleContexts: Map<string, ModuleContext[]> = new Map();

  /**
   * Add context from a module
   */
  addModuleContext(organizationId: string, moduleContext: ModuleContext): void {
    if (!this.moduleContexts.has(organizationId)) {
      this.moduleContexts.set(organizationId, []);
    }
    const contexts = this.moduleContexts.get(organizationId)!;
    contexts.push(moduleContext);
    
    // Keep only last 100 contexts per organization
    if (contexts.length > 100) {
      contexts.shift();
    }

    logger.debug("Module context added", { organizationId, module: moduleContext.module });
  }

  /**
   * Aggregate context across all modules for cross-domain reasoning
   */
  async aggregateContext(
    organizationId: string,
    query: string,
    relevantModules?: string[]
  ): Promise<AggregatedContext> {
    try {
      const contexts = this.moduleContexts.get(organizationId) || [];
      
      // Filter by relevant modules if specified
      const filteredContexts = relevantModules
        ? contexts.filter((c) => relevantModules.includes(c.module))
        : contexts;

      // Sort by relevance score and timestamp
      const sortedContexts = filteredContexts.sort((a, b) => {
        const scoreDiff = b.relevanceScore - a.relevanceScore;
        if (scoreDiff !== 0) return scoreDiff;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      // Take top 20 most relevant contexts
      const topContexts = sortedContexts.slice(0, 20);

      // Aggregate data across modules
      const aggregatedData = this.aggregateData(topContexts);

      // Generate cross-domain insights
      const crossDomainInsights = await this.generateCrossDomainInsights(
        query,
        topContexts,
        aggregatedData
      );

      // Calculate overall confidence
      const confidence = this.calculateConfidence(topContexts);

      return {
        contexts: topContexts,
        aggregatedData,
        crossDomainInsights,
        confidence,
      };
    } catch (error) {
      logger.error("Failed to aggregate context", { error, organizationId });
      return {
        contexts: [],
        aggregatedData: {},
        crossDomainInsights: [],
        confidence: 0,
      };
    }
  }

  /**
   * Aggregate data from multiple module contexts
   */
  private aggregateData(contexts: ModuleContext[]): Record<string, any> {
    const aggregated: Record<string, any> = {
      modules: contexts.map((c) => c.module),
      totalContexts: contexts.length,
      latestTimestamp: contexts[0]?.timestamp || new Date().toISOString(),
    };

    // Aggregate by module
    const moduleData: Record<string, any[]> = {};
    for (const context of contexts) {
      if (!moduleData[context.module]) {
        moduleData[context.module] = [];
      }
      moduleData[context.module].push(context.context);
    }

    aggregated.moduleData = moduleData;

    // Extract common patterns
    aggregated.commonFields = this.extractCommonFields(contexts);

    return aggregated;
  }

  /**
   * Extract common fields across contexts
   */
  private extractCommonFields(contexts: ModuleContext[]): string[] {
    if (contexts.length === 0) return [];

    const allKeys = new Set<string>();
    for (const context of contexts) {
      Object.keys(context.context).forEach((key) => allKeys.add(key));
    }

    // Find keys that appear in multiple contexts
    const commonKeys: string[] = [];
    for (const key of allKeys) {
      const count = contexts.filter((c) => key in c.context).length;
      if (count >= Math.ceil(contexts.length * 0.5)) {
        commonKeys.push(key);
      }
    }

    return commonKeys;
  }

  /**
   * Generate cross-domain insights
   */
  private async generateCrossDomainInsights(
    query: string,
    contexts: ModuleContext[],
    aggregatedData: Record<string, any>
  ): Promise<string[]> {
    const insights: string[] = [];

    // Analyze cross-module relationships
    const modules = new Set(contexts.map((c) => c.module));

    if (modules.has("inventory") && modules.has("purchasing")) {
      insights.push("Inventory and purchasing data available for order optimization");
    }

    if (modules.has("schedule") && modules.has("inventory")) {
      insights.push("Schedule and inventory data available for labor-cost optimization");
    }

    if (modules.has("echoaurum") && modules.has("purchasing")) {
      insights.push("Financial and purchasing data available for cost analysis");
    }

    if (modules.has("maestro") && modules.has("culinary")) {
      insights.push("Production and culinary data available for recipe optimization");
    }

    if (modules.has("echoaurum") && modules.has("schedule")) {
      insights.push("Financial and schedule data available for labor-cost analysis");
    }

    // TODO: Use AI to generate more sophisticated insights based on query and contexts

    return insights;
  }

  /**
   * Calculate overall confidence based on contexts
   */
  private calculateConfidence(contexts: ModuleContext[]): number {
    if (contexts.length === 0) return 0;

    const avgRelevance = contexts.reduce((sum, c) => sum + c.relevanceScore, 0) / contexts.length;
    const recencyFactor = this.calculateRecencyFactor(contexts);

    return Math.min(avgRelevance * recencyFactor, 1.0);
  }

  /**
   * Calculate recency factor (more recent = higher factor)
   */
  private calculateRecencyFactor(contexts: ModuleContext[]): number {
    if (contexts.length === 0) return 0;

    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    const avgAge = contexts.reduce((sum, c) => {
      const age = now - new Date(c.timestamp).getTime();
      return sum + Math.min(age / maxAge, 1);
    }, 0) / contexts.length;

    return 1 - avgAge; // More recent = higher factor
  }

  /**
   * Get contexts for a specific module
   */
  getModuleContexts(organizationId: string, module: string): ModuleContext[] {
    const contexts = this.moduleContexts.get(organizationId) || [];
    return contexts.filter((c) => c.module === module);
  }

  /**
   * Clear contexts for an organization
   */
  clearContexts(organizationId: string): void {
    this.moduleContexts.delete(organizationId);
    logger.info("Contexts cleared", { organizationId });
  }
}

let contextAggregatorInstance: EchoAI3ContextAggregator | null = null;

export function getEchoAI3ContextAggregator(): EchoAI3ContextAggregator {
  if (!contextAggregatorInstance) {
    contextAggregatorInstance = new EchoAI3ContextAggregator();
  }
  return contextAggregatorInstance;
}

export default EchoAI3ContextAggregator;
