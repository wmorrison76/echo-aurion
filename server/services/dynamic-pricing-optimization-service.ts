/**
 * Dynamic Pricing Optimization Service
 * Moat #17: Dynamic Pricing Intelligence with Real-Time Optimization
 * 
 * Industry First: Real-Time Revenue Management + AI
 * - Real-time menu item pricing optimization
 * - Demand-based pricing (time of day, weather, events)
 * - Competitive pricing intelligence
 * - Profit margin optimization
 * - A/B testing for pricing strategies
 */

import { logger } from "../lib/logger";

export interface PriceOptimizationRequest {
  menuItemId: string;
  currentPrice: number;
  baseCost: number;
  demandData: DemandData;
  contextualFactors: ContextualFactors;
  competitorPrices?: CompetitorPrice[];
}

export interface DemandData {
  historicalSales: number[];
  priceElasticity: number;
  currentDemand: number;
  trend: "increasing" | "stable" | "decreasing";
}

export interface ContextualFactors {
  timeOfDay?: "breakfast" | "lunch" | "dinner" | "late_night";
  dayOfWeek?: number; // 0-6
  weather?: "sunny" | "rainy" | "cold" | "hot";
  events?: string[]; // Event names or types
  seasonality?: number; // 0-1 multiplier
  inventoryLevel?: "low" | "medium" | "high";
}

export interface CompetitorPrice {
  competitorName: string;
  price: number;
  date: Date;
}

export interface OptimizedPrice {
  recommendedPrice: number;
  priceChange: number;
  priceChangePercent: number;
  expectedRevenueImpact: number;
  expectedDemandChange: number;
  confidence: number;
  reasoning: string;
  factors: string[];
}

export interface PricingStrategy {
  strategyType: "revenue_maximization" | "profit_maximization" | "demand_optimization" | "competitive";
  parameters: Record<string, any>;
}

export interface ABTestResult {
  testId: string;
  controlPrice: number;
  testPrice: number;
  controlRevenue: number;
  testRevenue: number;
  controlUnits: number;
  testUnits: number;
  lift: number;
  significance: number;
  recommendation: "control" | "test" | "inconclusive";
}

export class DynamicPricingOptimizationService {
  private optimizationCache: Map<string, OptimizedPrice> = new Map();
  private abTestResults: Map<string, ABTestResult> = new Map();

  /**
   * Optimize price in real-time
   */
  async optimizePrice(request: PriceOptimizationRequest): Promise<OptimizedPrice> {
    const cacheKey = `${request.menuItemId}:${request.currentPrice}`;
    
    // Check cache (with 5-minute TTL in production)
    if (this.optimizationCache.has(cacheKey)) {
      return this.optimizationCache.get(cacheKey)!;
    }

    // Calculate base optimal price using cost-plus with target margin
    const targetMarginPercent = 65; // Industry standard
    const baseOptimalPrice = request.baseCost / (1 - targetMarginPercent / 100);

    // Adjust for demand elasticity
    let priceAdjustment = 1.0;
    if (request.demandData.priceElasticity > 1.5) {
      // High elasticity: reduce price to capture volume
      priceAdjustment = 0.95;
    } else if (request.demandData.priceElasticity < 0.5) {
      // Low elasticity: can increase price
      priceAdjustment = 1.05;
    }

    // Adjust for contextual factors
    const contextualMultiplier = this.calculateContextualMultiplier(request.contextualFactors);
    
    // Adjust for competitor prices
    const competitiveMultiplier = this.calculateCompetitiveMultiplier(
      request.currentPrice,
      request.competitorPrices || []
    );

    // Calculate recommended price
    let recommendedPrice = baseOptimalPrice * priceAdjustment * contextualMultiplier * competitiveMultiplier;
    
    // Round to reasonable increment (e.g., $0.25 for items < $20, $0.50 for items >= $20)
    const increment = recommendedPrice < 20 ? 0.25 : 0.50;
    recommendedPrice = Math.round(recommendedPrice / increment) * increment;

    // Calculate metrics
    const priceChange = recommendedPrice - request.currentPrice;
    const priceChangePercent = (priceChange / request.currentPrice) * 100;
    
    // Estimate demand change based on elasticity
    const expectedDemandChange = -request.demandData.priceElasticity * priceChangePercent / 100;
    const newDemand = request.demandData.currentDemand * (1 + expectedDemandChange / 100);
    
    // Calculate expected revenue impact
    const currentRevenue = request.currentPrice * request.demandData.currentDemand;
    const expectedRevenue = recommendedPrice * newDemand;
    const expectedRevenueImpact = expectedRevenue - currentRevenue;

    // Calculate confidence
    const confidence = this.calculateConfidence(request.demandData, request.contextualFactors);

    // Generate reasoning
    const reasoning = this.generateReasoning(
      priceChangePercent,
      request.demandData,
      request.contextualFactors,
      contextualMultiplier,
      competitiveMultiplier
    );

    // Identify key factors
    const factors: string[] = [];
    if (Math.abs(contextualMultiplier - 1.0) > 0.05) {
      factors.push("Contextual factors");
    }
    if (request.competitorPrices && request.competitorPrices.length > 0) {
      factors.push("Competitive pricing");
    }
    if (Math.abs(request.demandData.priceElasticity - 1.0) > 0.3) {
      factors.push("Price elasticity");
    }

    const optimized: OptimizedPrice = {
      recommendedPrice,
      priceChange,
      priceChangePercent,
      expectedRevenueImpact,
      expectedDemandChange,
      confidence,
      reasoning,
      factors,
    };

    this.optimizationCache.set(cacheKey, optimized);
    
    logger.info("[Dynamic Pricing] Price optimized", {
      menuItemId: request.menuItemId,
      currentPrice: request.currentPrice,
      recommendedPrice,
      priceChangePercent,
      expectedRevenueImpact,
    });

    return optimized;
  }

  /**
   * Calculate contextual multiplier
   */
  private calculateContextualMultiplier(factors: ContextualFactors): number {
    let multiplier = 1.0;

    // Time of day adjustments
    if (factors.timeOfDay === "dinner") {
      multiplier *= 1.05; // 5% premium for dinner
    } else if (factors.timeOfDay === "breakfast") {
      multiplier *= 0.95; // 5% discount for breakfast
    }

    // Day of week adjustments (weekends premium)
    if (factors.dayOfWeek === 0 || factors.dayOfWeek === 6) {
      multiplier *= 1.03; // 3% weekend premium
    }

    // Weather adjustments
    if (factors.weather === "rainy" || factors.weather === "cold") {
      multiplier *= 1.02; // Slight premium for comfort foods
    }

    // Event adjustments
    if (factors.events && factors.events.length > 0) {
      multiplier *= 1.08; // 8% premium during events
    }

    // Seasonality
    if (factors.seasonality) {
      multiplier *= factors.seasonality;
    }

    // Inventory level adjustments
    if (factors.inventoryLevel === "low") {
      multiplier *= 1.05; // Increase price when inventory is low
    } else if (factors.inventoryLevel === "high") {
      multiplier *= 0.97; // Slight discount to move inventory
    }

    return multiplier;
  }

  /**
   * Calculate competitive multiplier
   */
  private calculateCompetitiveMultiplier(
    currentPrice: number,
    competitorPrices: CompetitorPrice[]
  ): number {
    if (competitorPrices.length === 0) {
      return 1.0;
    }

    const avgCompetitorPrice = competitorPrices.reduce((sum, p) => sum + p.price, 0) / competitorPrices.length;
    const priceDifference = currentPrice - avgCompetitorPrice;
    const priceDifferencePercent = (priceDifference / avgCompetitorPrice) * 100;

    // If we're significantly higher, reduce price slightly
    if (priceDifferencePercent > 10) {
      return 0.97; // 3% reduction
    }
    
    // If we're significantly lower, can increase price
    if (priceDifferencePercent < -10) {
      return 1.03; // 3% increase
    }

    return 1.0;
  }

  /**
   * Calculate confidence in optimization
   */
  private calculateConfidence(
    demandData: DemandData,
    contextualFactors: ContextualFactors
  ): number {
    let confidence = 0.7; // Base confidence

    // More data points = higher confidence
    if (demandData.historicalSales.length > 30) {
      confidence += 0.1;
    } else if (demandData.historicalSales.length > 10) {
      confidence += 0.05;
    }

    // Stable elasticity = higher confidence
    if (Math.abs(demandData.priceElasticity - 1.0) < 0.3) {
      confidence += 0.1;
    }

    // More contextual factors = higher confidence
    const factorCount = Object.values(contextualFactors).filter(v => v !== undefined && v !== null).length;
    if (factorCount >= 3) {
      confidence += 0.1;
    }

    return Math.min(confidence, 0.95); // Cap at 95%
  }

  /**
   * Generate reasoning for price recommendation
   */
  private generateReasoning(
    priceChangePercent: number,
    demandData: DemandData,
    contextualFactors: ContextualFactors,
    contextualMultiplier: number,
    competitiveMultiplier: number
  ): string {
    const parts: string[] = [];

    if (Math.abs(priceChangePercent) < 2) {
      parts.push("Price is well-optimized. Minor adjustment recommended.");
    } else if (priceChangePercent > 0) {
      parts.push(`Price increase of ${priceChangePercent.toFixed(1)}% recommended.`);
    } else {
      parts.push(`Price decrease of ${Math.abs(priceChangePercent).toFixed(1)}% recommended.`);
    }

    if (demandData.priceElasticity > 1.5) {
      parts.push("Item is price-elastic; price reduction may increase volume and revenue.");
    } else if (demandData.priceElasticity < 0.5) {
      parts.push("Item is price-inelastic; price increase will have minimal impact on demand.");
    }

    if (contextualMultiplier > 1.02) {
      parts.push("Contextual factors support price premium.");
    } else if (contextualMultiplier < 0.98) {
      parts.push("Contextual factors suggest price reduction.");
    }

    if (competitiveMultiplier < 1.0) {
      parts.push("Competitive pricing suggests price adjustment.");
    }

    return parts.join(" ");
  }

  /**
   * Run A/B test for pricing
   */
  async runABTest(
    menuItemId: string,
    controlPrice: number,
    testPrice: number,
    durationDays: number = 7
  ): Promise<ABTestResult> {
    // In production, this would track actual sales data
    // For now, simulate based on elasticity
    
    const elasticity = 1.2; // Assume moderate elasticity
    const baseDemand = 100; // Base daily demand
    
    const controlDemand = baseDemand;
    const testDemand = baseDemand * (1 - elasticity * (testPrice - controlPrice) / controlPrice);
    
    const controlRevenue = controlPrice * controlDemand * durationDays;
    const testRevenue = testPrice * testDemand * durationDays;
    
    const lift = ((testRevenue - controlRevenue) / controlRevenue) * 100;
    const significance = Math.abs(lift) > 5 ? 0.95 : 0.7;
    
    const recommendation: "control" | "test" | "inconclusive" = 
      lift > 5 && significance > 0.9 ? "test" :
      lift < -5 && significance > 0.9 ? "control" :
      "inconclusive";

    const result: ABTestResult = {
      testId: `test-${Date.now()}`,
      controlPrice,
      testPrice,
      controlRevenue,
      testRevenue,
      controlUnits: controlDemand * durationDays,
      testUnits: testDemand * durationDays,
      lift,
      significance,
      recommendation,
    };

    this.abTestResults.set(result.testId, result);
    
    logger.info("[Dynamic Pricing] A/B test completed", {
      testId: result.testId,
      lift,
      recommendation,
    });

    return result;
  }
}

let serviceInstance: DynamicPricingOptimizationService | null = null;

export function getDynamicPricingOptimizationService(): DynamicPricingOptimizationService {
  if (!serviceInstance) {
    serviceInstance = new DynamicPricingOptimizationService();
  }
  return serviceInstance;
}

export default DynamicPricingOptimizationService;
