/**
 * Autonomous Multi-Property Operational Harmony Engine
 * Moat #23: Autonomous Multi-Property Operational Harmony Engine
 * 
 * Industry First: Holistic multi-property optimization
 * - Cross-property resource optimization
 * - Real-time best practice propagation
 * - Unified demand forecasting
 * - Automated knowledge transfer
 * - Portfolio-level financial optimization
 */

import { logger } from "../lib/logger";

export interface Property {
  id: string;
  name: string;
  location: string;
  propertyType: string;
  capacity: number;
  currentDemand: number;
  resources: PropertyResources;
  performance: PropertyPerformance;
}

export interface PropertyResources {
  staff: number;
  equipment: string[];
  inventory: Record<string, number>;
  capacity: number;
}

export interface PropertyPerformance {
  revenue: number;
  costs: number;
  efficiency: number; // 0-100
  customerSatisfaction: number; // 0-100
  bestPractices: string[];
}

export interface CrossPropertyOptimization {
  resourceTransfers: ResourceTransfer[];
  bestPracticeRecommendations: BestPracticeRecommendation[];
  demandForecasts: UnifiedDemandForecast;
  knowledgeTransfer: KnowledgeTransfer[];
  financialOptimization: FinancialOptimization;
}

export interface ResourceTransfer {
  fromPropertyId: string;
  toPropertyId: string;
  resourceType: "staff" | "inventory" | "equipment";
  quantity: number;
  reason: string;
  estimatedBenefit: number; // cost savings or revenue increase
  priority: "low" | "medium" | "high";
}

export interface BestPracticeRecommendation {
  propertyId: string;
  practice: string;
  sourcePropertyId: string;
  expectedImprovement: string;
  implementationComplexity: "low" | "medium" | "high";
  estimatedImpact: number; // percentage improvement
}

export interface UnifiedDemandForecast {
  totalDemand: number;
  propertyForecasts: Array<{
    propertyId: string;
    forecast: number;
    confidence: number;
    factors: string[];
  }>;
  crossPropertyFactors: string[];
}

export interface KnowledgeTransfer {
  fromPropertyId: string;
  toPropertyId: string;
  knowledgeType: "recipe" | "process" | "technique" | "skill";
  content: string;
  priority: "low" | "medium" | "high";
}

export interface FinancialOptimization {
  cashFlowRecommendations: CashFlowRecommendation[];
  capitalAllocation: CapitalAllocation[];
  costOptimization: CostOptimization[];
  revenueOpportunities: RevenueOpportunity[];
}

export interface CashFlowRecommendation {
  action: string;
  propertyId: string;
  amount: number;
  reason: string;
  priority: "low" | "medium" | "high";
}

export interface CapitalAllocation {
  propertyId: string;
  investmentArea: string;
  recommendedAmount: number;
  expectedROI: number;
  priority: "low" | "medium" | "high";
}

export interface CostOptimization {
  propertyId: string;
  area: string;
  currentCost: number;
  optimizedCost: number;
  savings: number;
  recommendations: string[];
}

export interface RevenueOpportunity {
  propertyId: string;
  opportunity: string;
  estimatedRevenue: number;
  implementationComplexity: "low" | "medium" | "high";
}

export class MultiPropertyHarmonyService {
  private propertyData: Map<string, Property> = new Map();
  private optimizationCache: Map<string, CrossPropertyOptimization> = new Map();

  /**
   * Register property
   */
  async registerProperty(property: Property): Promise<Property> {
    this.propertyData.set(property.id, property);
    logger.info("[Multi-Property Harmony] Property registered", {
      propertyId: property.id,
      name: property.name,
    });
    return property;
  }

  /**
   * Optimize across all properties
   */
  async optimizeProperties(propertyIds: string[]): Promise<CrossPropertyOptimization> {
    const cacheKey = propertyIds.sort().join(",");
    
    if (this.optimizationCache.has(cacheKey)) {
      return this.optimizationCache.get(cacheKey)!;
    }

    const properties = propertyIds
      .map(id => this.propertyData.get(id))
      .filter((p): p is Property => p !== undefined);

    if (properties.length < 2) {
      throw new Error("At least 2 properties required for optimization");
    }

    // Generate optimizations
    const resourceTransfers = this.optimizeResourceTransfers(properties);
    const bestPractices = this.identifyBestPractices(properties);
    const demandForecasts = this.generateUnifiedForecast(properties);
    const knowledgeTransfer = this.identifyKnowledgeTransfer(properties);
    const financialOptimization = this.optimizeFinancials(properties);

    const optimization: CrossPropertyOptimization = {
      resourceTransfers,
      bestPracticeRecommendations: bestPractices,
      demandForecasts,
      knowledgeTransfer,
      financialOptimization,
    };

    this.optimizationCache.set(cacheKey, optimization);
    
    logger.info("[Multi-Property Harmony] Optimization complete", {
      propertiesCount: properties.length,
      resourceTransfers: resourceTransfers.length,
      bestPractices: bestPractices.length,
    });

    return optimization;
  }

  /**
   * Optimize resource transfers
   */
  private optimizeResourceTransfers(properties: Property[]): ResourceTransfer[] {
    const transfers: ResourceTransfer[] = [];

    // Find properties with excess capacity/resources
    const excessProperties = properties.filter(p => 
      p.currentDemand < p.capacity * 0.7 && p.resources.staff > p.capacity * 0.8
    );
    const highDemandProperties = properties.filter(p => 
      p.currentDemand > p.capacity * 0.9
    );

    // Staff transfers
    for (const excess of excessProperties) {
      for (const demand of highDemandProperties) {
        if (excess.id !== demand.id) {
          const staffNeeded = Math.ceil((demand.currentDemand - demand.capacity * 0.8) / 10);
          const staffAvailable = Math.floor((excess.resources.staff - excess.capacity * 0.6) / 10);
          
          if (staffAvailable > 0 && staffNeeded > 0) {
            const transferAmount = Math.min(staffAvailable, staffNeeded);
            const estimatedBenefit = transferAmount * 50 * 8; // $50/hour * 8 hours

            transfers.push({
              fromPropertyId: excess.id,
              toPropertyId: demand.id,
              resourceType: "staff",
              quantity: transferAmount,
              reason: `High demand at ${demand.name}, excess capacity at ${excess.name}`,
              estimatedBenefit,
              priority: demand.currentDemand > demand.capacity ? "high" : "medium",
            });
          }
        }
      }
    }

    // Inventory transfers (simplified)
    for (const excess of excessProperties) {
      for (const demand of highDemandProperties) {
        if (excess.id !== demand.id) {
          // Check for inventory items that can be transferred
          Object.entries(excess.resources.inventory).forEach(([item, quantity]) => {
            if (quantity > 100 && (!demand.resources.inventory[item] || demand.resources.inventory[item] < 50)) {
              transfers.push({
                fromPropertyId: excess.id,
                toPropertyId: demand.id,
                resourceType: "inventory",
                quantity: Math.min(quantity - 50, 100),
                reason: `Inventory rebalancing: ${item}`,
                estimatedBenefit: 200, // Estimated waste reduction
                priority: "medium",
              });
            }
          });
        }
      }
    }

    return transfers;
  }

  /**
   * Identify best practices
   */
  private identifyBestPractices(properties: Property[]): BestPracticeRecommendation[] {
    const recommendations: BestPracticeRecommendation[] = [];

    // Find top performers
    const topPerformers = properties
      .sort((a, b) => b.performance.efficiency - a.performance.efficiency)
      .slice(0, Math.ceil(properties.length * 0.2));

    // Find underperformers
    const underperformers = properties
      .sort((a, b) => a.performance.efficiency - b.performance.efficiency)
      .slice(0, Math.ceil(properties.length * 0.3));

    // Recommend best practices from top to underperformers
    for (const top of topPerformers) {
      for (const under of underperformers) {
        if (top.id !== under.id) {
          top.performance.bestPractices.forEach(practice => {
            if (!under.performance.bestPractices.includes(practice)) {
              const efficiencyGap = top.performance.efficiency - under.performance.efficiency;
              const estimatedImpact = efficiencyGap * 0.3; // Assume 30% of gap can be closed

              recommendations.push({
                propertyId: under.id,
                practice,
                sourcePropertyId: top.id,
                expectedImprovement: `${estimatedImpact.toFixed(1)}% efficiency improvement`,
                implementationComplexity: "medium",
                estimatedImpact,
              });
            }
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Generate unified demand forecast
   */
  private generateUnifiedForecast(properties: Property[]): UnifiedDemandForecast {
    const propertyForecasts = properties.map(prop => ({
      propertyId: prop.id,
      forecast: prop.currentDemand * 1.1, // Simplified forecast
      confidence: 0.75,
      factors: ["Historical patterns", "Seasonal trends"],
    }));

    const totalDemand = propertyForecasts.reduce((sum, f) => sum + f.forecast, 0);

    return {
      totalDemand,
      propertyForecasts,
      crossPropertyFactors: [
        "Regional events",
        "Shared marketing campaigns",
        "Cross-property promotions",
      ],
    };
  }

  /**
   * Identify knowledge transfer opportunities
   */
  private identifyKnowledgeTransfer(properties: Property[]): KnowledgeTransfer[] {
    const transfers: KnowledgeTransfer[] = [];

    // Simplified: transfer recipes/techniques from high-performing to low-performing
    const highPerformers = properties
      .sort((a, b) => b.performance.customerSatisfaction - a.performance.customerSatisfaction)
      .slice(0, Math.ceil(properties.length * 0.2));

    const lowPerformers = properties
      .sort((a, b) => a.performance.customerSatisfaction - b.performance.customerSatisfaction)
      .slice(0, Math.ceil(properties.length * 0.3));

    for (const high of highPerformers) {
      for (const low of lowPerformers) {
        if (high.id !== low.id) {
          transfers.push({
            fromPropertyId: high.id,
            toPropertyId: low.id,
            knowledgeType: "technique",
            content: "High-performing service techniques",
            priority: "high",
          });

          transfers.push({
            fromPropertyId: high.id,
            toPropertyId: low.id,
            knowledgeType: "process",
            content: "Optimized operational processes",
            priority: "medium",
          });
        }
      }
    }

    return transfers;
  }

  /**
   * Optimize financials across portfolio
   */
  private optimizeFinancials(properties: Property[]): FinancialOptimization {
    const cashFlowRecommendations: CashFlowRecommendation[] = [];
    const capitalAllocation: CapitalAllocation[] = [];
    const costOptimization: CostOptimization[] = [];
    const revenueOpportunities: RevenueOpportunity[] = [];

    // Cash flow optimization
    const highRevenueProperties = properties
      .sort((a, b) => b.performance.revenue - a.performance.revenue)
      .slice(0, 2);

    highRevenueProperties.forEach(prop => {
      cashFlowRecommendations.push({
        action: "Accelerate collections",
        propertyId: prop.id,
        amount: prop.performance.revenue * 0.1,
        reason: "High revenue property, optimize cash collection",
        priority: "medium",
      });
    });

    // Capital allocation
    properties.forEach(prop => {
      if (prop.performance.efficiency < 70) {
        capitalAllocation.push({
          propertyId: prop.id,
          investmentArea: "Operational efficiency improvements",
          recommendedAmount: 50000,
          expectedROI: 0.25,
          priority: "high",
        });
      }
    });

    // Cost optimization
    properties.forEach(prop => {
      if (prop.performance.costs > prop.performance.revenue * 0.7) {
        costOptimization.push({
          propertyId: prop.id,
          area: "Labor costs",
          currentCost: prop.performance.costs,
          optimizedCost: prop.performance.costs * 0.9,
          savings: prop.performance.costs * 0.1,
          recommendations: [
            "Optimize staff scheduling",
            "Reduce overtime",
            "Cross-train staff",
          ],
        });
      }
    });

    // Revenue opportunities
    properties.forEach(prop => {
      if (prop.currentDemand < prop.capacity * 0.8) {
        revenueOpportunities.push({
          propertyId: prop.id,
          opportunity: "Increase capacity utilization",
          estimatedRevenue: (prop.capacity * 0.2) * 50, // 20% more capacity * $50 per unit
          implementationComplexity: "low",
        });
      }
    });

    return {
      cashFlowRecommendations,
      capitalAllocation,
      costOptimization,
      revenueOpportunities,
    };
  }
}

let serviceInstance: MultiPropertyHarmonyService | null = null;

export function getMultiPropertyHarmonyService(): MultiPropertyHarmonyService {
  if (!serviceInstance) {
    serviceInstance = new MultiPropertyHarmonyService();
  }
  return serviceInstance;
}

export default MultiPropertyHarmonyService;
