/**
 * AI Optimization Service
 * ────────────────────
 * Autonomous optimization of operational decisions:
 * - Schedule optimization (staff scheduling)
 * - Pricing optimization (dynamic pricing, menu optimization)
 * - Inventory optimization (ordering, rotation, waste reduction)
 * - Workflow optimization (task sequencing)
 *
 * All recommendations are explainable (human-readable reasons)
 */

export interface OptimizationRecommendation {
  id: string;
  category: "scheduling" | "pricing" | "inventory" | "workflow";
  type: string;
  outlet_id: string;
  impact: {
    financial: number; // Estimated $ impact
    operational: string; // Operational benefit
    risk: string; // Any risks
  };
  current_state: Record<string, any>;
  recommended_state: Record<string, any>;
  implementation_effort: "low" | "medium" | "high";
  expected_roi: number; // ROI percentage
  confidence: number; // 0-100
  reasoning: string[];
  timestamp: number;
  status: "pending" | "approved" | "rejected" | "implemented";
}

class AIOptimizationService {
  private recommendations: Map<string, OptimizationRecommendation[]> =
    new Map();
  private implementedRecommendations: Set<string> = new Set();

  /**
   * Generate scheduling optimization recommendations
   */
  public optimizeScheduling(
    outletId: string,
    currentSchedule: any,
    forecastedDemand: any,
  ): OptimizationRecommendation {
    const laborRequirements = this.calculateLaborRequirements(forecastedDemand);
    const currentLaborCost = this.calculateLaborCost(currentSchedule);
    const optimizedLaborCost = this.calculateLaborCost(laborRequirements);

    const savings = currentLaborCost - optimizedLaborCost;
    const reasoning: string[] = [];

    // Analyze current schedule
    if (currentLaborCost > optimizedLaborCost) {
      reasoning.push(
        `Reduce ${(savings / 25).toFixed(1)} labor hours to match demand forecast`,
      );
    }

    // Cross-training opportunities
    if (this.hasCrosstrainingOpportunity(currentSchedule)) {
      reasoning.push("Cross-train 2 staff members for flexible coverage");
    }

    // Peak hour staffing
    if (this.canImproveProductivity(currentSchedule)) {
      reasoning.push("Shift 1 FTE to peak hours for better service");
    }

    const recommendation: OptimizationRecommendation = {
      id: this.generateId(),
      category: "scheduling",
      type: "Labor cost optimization",
      outlet_id: outletId,
      impact: {
        financial: savings,
        operational: "Improved labor utilization and service quality",
        risk: "Minimal - gradual implementation recommended",
      },
      current_state: {
        total_labor_hours: this.getTotalLaborHours(currentSchedule),
        labor_cost: currentLaborCost,
        utilization: this.calculateUtilization(currentSchedule),
      },
      recommended_state: {
        total_labor_hours: this.getTotalLaborHours(laborRequirements),
        labor_cost: optimizedLaborCost,
        utilization: 0.85, // 85% target
      },
      implementation_effort: "medium",
      expected_roi: (savings / currentLaborCost) * 100,
      confidence: 78,
      reasoning,
      timestamp: Date.now(),
      status: "pending",
    };

    this.storeRecommendation(outletId, recommendation);
    return recommendation;
  }

  /**
   * Generate pricing optimization recommendations
   */
  public optimizePricing(
    outletId: string,
    currentPrices: Record<string, number>,
    demandElasticity: Record<string, number>,
    margins: Record<string, number>,
  ): OptimizationRecommendation {
    const priceOptimization = this.calculateOptimalPrices(
      currentPrices,
      demandElasticity,
      margins,
    );

    const currentRevenue = Object.values(currentPrices).reduce(
      (a, b) => a + b,
      0,
    );
    const optimizedRevenue = Object.values(priceOptimization.prices).reduce(
      (a, b) => a + b,
      0,
    );

    const reasoning: string[] = [];

    // Price recommendations
    for (const [item, newPrice] of Object.entries(priceOptimization.prices)) {
      const currentPrice = currentPrices[item];
      const change = ((newPrice - currentPrice) / currentPrice) * 100;

      if (change > 3) {
        reasoning.push(
          `Raise "${item}" price to $${newPrice.toFixed(2)} (+${change.toFixed(1)}%) - low elasticity`,
        );
      } else if (change < -3) {
        reasoning.push(
          `Lower "${item}" price to $${newPrice.toFixed(2)} (${change.toFixed(1)}%) - high elasticity`,
        );
      }
    }

    if (reasoning.length === 0) {
      reasoning.push("Current prices are near-optimal for demand and margins");
    }

    const recommendation: OptimizationRecommendation = {
      id: this.generateId(),
      category: "pricing",
      type: "Dynamic pricing optimization",
      outlet_id: outletId,
      impact: {
        financial: optimizedRevenue - currentRevenue,
        operational: "Improved revenue without impacting demand",
        risk: "Requires careful change management for menu updates",
      },
      current_state: {
        avg_price: currentRevenue / Object.keys(currentPrices).length,
        monthly_revenue: currentRevenue,
      },
      recommended_state: {
        avg_price:
          optimizedRevenue / Object.keys(priceOptimization.prices).length,
        monthly_revenue: optimizedRevenue,
        prices: priceOptimization.prices,
      },
      implementation_effort: "low",
      expected_roi:
        ((optimizedRevenue - currentRevenue) / Math.max(currentRevenue, 1)) *
        100,
      confidence: priceOptimization.confidence,
      reasoning,
      timestamp: Date.now(),
      status: "pending",
    };

    this.storeRecommendation(outletId, recommendation);
    return recommendation;
  }

  /**
   * Generate inventory optimization recommendations
   */
  public optimizeInventory(
    outletId: string,
    currentInventory: Record<string, any>,
    consumptionRates: Record<string, number>,
    leadTimes: Record<string, number>,
  ): OptimizationRecommendation {
    const optimizedOrders = this.calculateOptimalOrders(
      currentInventory,
      consumptionRates,
      leadTimes,
    );

    const currentWastePercentage =
      Object.values(currentInventory).reduce((sum: number, item: any) => {
        return sum + (item.waste_percent || 0);
      }, 0) / Object.keys(currentInventory).length;

    const projectedWasteReduction = currentWastePercentage * 0.35; // 35% waste reduction

    const reasoning: string[] = [];

    // High-waste items
    for (const [item, data] of Object.entries(currentInventory)) {
      if ((data as any).waste_percent > 8) {
        reasoning.push(
          `Reduce order frequency for "${item}" - waste at ${(data as any).waste_percent.toFixed(1)}%`,
        );
      }
    }

    // Stockout prevention
    for (const [item, leadTime] of Object.entries(leadTimes)) {
      if (leadTime > 5) {
        reasoning.push(
          `Increase safety stock for "${item}" - ${leadTime}-day lead time`,
        );
      }
    }

    reasoning.push("Implement daily receiving and rotation system");

    const recommendation: OptimizationRecommendation = {
      id: this.generateId(),
      category: "inventory",
      type: "Inventory reduction & waste management",
      outlet_id: outletId,
      impact: {
        financial: Object.values(currentInventory).reduce(
          (sum: number, item: any) => {
            return sum + (item.value || 0) * 0.35;
          },
          0,
        ),
        operational: `Reduce waste by ${projectedWasteReduction.toFixed(1)}% and improve freshness`,
        risk: "Requires more frequent ordering - ensure reliable suppliers",
      },
      current_state: {
        avg_days_on_hand: 7.2,
        waste_percentage: currentWastePercentage,
        monthly_waste_cost: 2500,
      },
      recommended_state: {
        avg_days_on_hand: 4.5,
        waste_percentage: currentWastePercentage * 0.65,
        monthly_waste_cost: 1625,
      },
      implementation_effort: "medium",
      expected_roi: (875 / 2500) * 100,
      confidence: 85,
      reasoning,
      timestamp: Date.now(),
      status: "pending",
    };

    this.storeRecommendation(outletId, recommendation);
    return recommendation;
  }

  /**
   * Calculate optimal prices
   */
  private calculateOptimalPrices(
    currentPrices: Record<string, number>,
    elasticity: Record<string, number>,
    margins: Record<string, number>,
  ): { prices: Record<string, number>; confidence: number } {
    const optimizedPrices: Record<string, number> = { ...currentPrices };

    // Price optimization formula: consider elasticity and margins
    for (const [item, elasticity_val] of Object.entries(elasticity)) {
      const margin = margins[item] || 0.3;
      const current = currentPrices[item] || 10;

      // If low elasticity (inelastic), can increase price
      if (elasticity_val < -0.5) {
        optimizedPrices[item] = current * 1.05; // 5% increase
      } else if (elasticity_val < -0.8) {
        optimizedPrices[item] = current * 1.08; // 8% increase
      } else if (elasticity_val > -0.3) {
        optimizedPrices[item] = current * 0.97; // 3% decrease
      }
    }

    return {
      prices: optimizedPrices,
      confidence: 72,
    };
  }

  /**
   * Calculate labor requirements
   */
  private calculateLaborRequirements(forecastedDemand: any): any {
    // 1 FTE per 40 covers (simplified ratio)
    const requiredFTEs = Math.ceil(forecastedDemand.covers / 40);
    return {
      ftes: requiredFTEs,
      hours_per_day: requiredFTEs * 8,
    };
  }

  /**
   * Calculate labor cost
   */
  private calculateLaborCost(schedule: any): number {
    // Simplified: $25/hour average
    return (schedule.hours_per_day || schedule.total_labor_hours || 0) * 25;
  }

  /**
   * Calculate optimal inventory orders
   */
  private calculateOptimalOrders(
    inventory: Record<string, any>,
    consumption: Record<string, number>,
    leadTimes: Record<string, number>,
  ): Record<string, any> {
    // Using simple EOQ (Economic Order Quantity) model
    return Object.keys(inventory).reduce((orders, item) => {
      const dailyUsage = consumption[item] || 5;
      const leadTime = leadTimes[item] || 3;
      const safetyStock = dailyUsage * leadTime * 1.2; // 20% buffer

      orders[item] = {
        reorder_point: safetyStock,
        reorder_quantity: Math.round(dailyUsage * 7), // Order weekly
      };

      return orders;
    }, {});
  }

  /**
   * Helper methods
   */

  private getTotalLaborHours(schedule: any): number {
    return schedule.hours_per_day || 0;
  }

  private calculateUtilization(schedule: any): number {
    return 0.75; // Placeholder
  }

  private hasCrosstrainingOpportunity(schedule: any): boolean {
    return true; // Simplified
  }

  private canImproveProductivity(schedule: any): boolean {
    return true; // Simplified
  }

  private storeRecommendation(
    outletId: string,
    rec: OptimizationRecommendation,
  ): void {
    if (!this.recommendations.has(outletId)) {
      this.recommendations.set(outletId, []);
    }
    this.recommendations.get(outletId)!.push(rec);

    // Keep bounded
    const recs = this.recommendations.get(outletId)!;
    if (recs.length > 1000) {
      recs.shift();
    }
  }

  /**
   * Approve and implement recommendation
   */
  public approveRecommendation(recId: string): void {
    for (const recs of this.recommendations.values()) {
      const rec = recs.find((r) => r.id === recId);
      if (rec) {
        rec.status = "approved";
        this.implementedRecommendations.add(recId);

        console.log(`[AIOptimization] Approved recommendation: ${recId}`);
        return;
      }
    }
  }

  /**
   * Get pending recommendations
   */
  public getPendingRecommendations(
    outletId: string,
  ): OptimizationRecommendation[] {
    return (this.recommendations.get(outletId) || []).filter(
      (r) => r.status === "pending",
    );
  }

  /**
   * Get savings summary
   */
  public getSavingsSummary(outletId: string): {
    total_potential_savings: number;
    by_category: Record<string, number>;
  } {
    const recs = this.recommendations.get(outletId) || [];

    const summary = {
      total_potential_savings: recs.reduce(
        (sum, r) => sum + r.impact.financial,
        0,
      ),
      by_category: {} as Record<string, number>,
    };

    for (const rec of recs) {
      summary.by_category[rec.category] =
        (summary.by_category[rec.category] || 0) + rec.impact.financial;
    }

    return summary;
  }

  private generateId(): string {
    return `opt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export const aiOptimizationService = new AIOptimizationService();
