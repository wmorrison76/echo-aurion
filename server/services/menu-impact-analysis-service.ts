/**
 * Menu Impact Analysis Service
 * 
 * Provides comprehensive impact analysis for menu version changes
 * - Revenue impact analysis
 * - Cost impact analysis
 * - Performance impact prediction
 * - Risk assessment
 */

import { logger } from "../lib/logger";
import { supabase } from "../lib/supabase";
import type { MenuVersion, VersionDifference } from "./menu-versioning";

export interface ImpactAnalysis {
  revenue: {
    estimatedMonthlyImpact: number;
    estimatedYearlyImpact: number;
    confidence: number;
    factors: Array<{
      itemId?: string;
      itemName?: string;
      impact: number;
      reason: string;
    }>;
  };
  cost: {
    estimatedMonthlyImpact: number;
    estimatedYearlyImpact: number;
    confidence: number;
    factors: Array<{
      itemId?: string;
      itemName?: string;
      impact: number;
      reason: string;
    }>;
  };
  performance: {
    impact: "positive" | "neutral" | "negative";
    score: number;
    predictedSalesChange: number;
    predictedCustomerSatisfactionChange: number;
    factors: Array<{
      type: string;
      impact: number;
      description: string;
    }>;
  };
  risk: {
    level: "low" | "medium" | "high" | "critical";
    score: number;
    factors: Array<{
      risk: string;
      severity: "low" | "medium" | "high";
      description: string;
      mitigation?: string;
    }>;
  };
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    category: string;
    recommendation: string;
    expectedImpact: string;
  }>;
}

/**
 * Menu Impact Analysis Service
 */
export class MenuImpactAnalysisService {
  /**
   * Analyze comprehensive impact of menu version changes
   */
  async analyzeMenuImpact(
    menuId: string,
    version1: MenuVersion,
    version2: MenuVersion,
    differences: VersionDifference[],
    orgId: string
  ): Promise<ImpactAnalysis> {
    try {
      // Get menu performance data
      const menuPerformance = await this.getMenuPerformance(menuId, orgId);

      // Analyze revenue impact
      const revenueAnalysis = await this.analyzeRevenueImpact(
        differences,
        version1,
        version2,
        menuPerformance,
        orgId
      );

      // Analyze cost impact
      const costAnalysis = await this.analyzeCostImpact(
        differences,
        version1,
        version2,
        menuPerformance,
        orgId
      );

      // Analyze performance impact
      const performanceAnalysis = await this.analyzePerformanceImpact(
        differences,
        version1,
        version2,
        menuPerformance
      );

      // Analyze risk
      const riskAnalysis = await this.analyzeRisk(
        differences,
        version1,
        version2,
        revenueAnalysis,
        costAnalysis
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        differences,
        revenueAnalysis,
        costAnalysis,
        performanceAnalysis,
        riskAnalysis
      );

      return {
        revenue: revenueAnalysis,
        cost: costAnalysis,
        performance: performanceAnalysis,
        risk: riskAnalysis,
        recommendations,
      };
    } catch (error) {
      logger.error("[MenuImpactAnalysis] Error analyzing impact", { error, menuId, orgId });
      throw error;
    }
  }

  /**
   * Get menu performance data
   */
  private async getMenuPerformance(menuId: string, orgId: string): Promise<{
    itemPerformance: Record<string, any>;
    totalRevenue: number;
    totalItemsSold: number;
    averageOrderValue: number;
    periodDays: number;
  }> {
    try {
      const { data, error } = await supabase
        .from("menu_performance")
        .select("*")
        .eq("menu_id", menuId)
        .eq("org_id", orgId)
        .order("data_to", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return {
          itemPerformance: {},
          totalRevenue: 0,
          totalItemsSold: 0,
          averageOrderValue: 0,
          periodDays: 30,
        };
      }

      const periodDays = Math.max(
        1,
        Math.ceil((new Date(data.data_to).getTime() - new Date(data.data_from).getTime()) / (1000 * 60 * 60 * 24))
      );

      return {
        itemPerformance: data.item_performance || {},
        totalRevenue: parseFloat(data.total_revenue || 0),
        totalItemsSold: parseInt(data.total_items_sold || 0),
        averageOrderValue: parseFloat(data.average_order_value || 0),
        periodDays,
      };
    } catch (error) {
      logger.warn("[MenuImpactAnalysis] Error getting menu performance", { error, menuId });
      return {
        itemPerformance: {},
        totalRevenue: 0,
        totalItemsSold: 0,
        averageOrderValue: 0,
        periodDays: 30,
      };
    }
  }

  /**
   * Analyze revenue impact
   */
  private async analyzeRevenueImpact(
    differences: VersionDifference[],
    version1: MenuVersion,
    version2: MenuVersion,
    performance: any,
    orgId: string
  ): Promise<ImpactAnalysis["revenue"]> {
    const priceChanges = differences.filter((d) => d.type === "price_changed");
    const itemsRemoved = differences.filter((d) => d.path.startsWith("items[") && d.type === "removed");
    const itemsAdded = differences.filter((d) => d.path.startsWith("items[") && d.type === "added");

    let estimatedMonthlyImpact = 0;
    const factors: ImpactAnalysis["revenue"]["factors"] = [];
    let totalConfidence = 0;
    let confidenceCount = 0;

    const avgDailyRevenue = performance.periodDays > 0 ? performance.totalRevenue / performance.periodDays : 0;
    const avgDailySales = performance.periodDays > 0 ? performance.totalItemsSold / performance.periodDays : 0;
    const avgDailySalesPerItem =
      version1.menuState?.items?.length > 0 ? avgDailySales / version1.menuState.items.length : 0;

    // Analyze price changes
    for (const change of priceChanges) {
      const oldPrice = parseFloat(change.oldValue || 0);
      const newPrice = parseFloat(change.newValue || 0);
      const priceDiff = newPrice - oldPrice;

      const itemIdMatch = change.path.match(/items\[([^\]]+)\]/);
      const itemId = itemIdMatch ? itemIdMatch[1] : null;
      const itemName =
        (itemId && version2.menuState?.items?.find((i: any) => i.id === itemId)?.name) || "Unknown Item";

      let monthlySales = 0;
      let confidence = 0.5;

      if (itemId && performance.itemPerformance[itemId]) {
        // Use historical data
        const itemSales = performance.itemPerformance[itemId].sold || 0;
        monthlySales = (itemSales / performance.periodDays) * 30;
        confidence = 0.9;
      } else {
        // Estimate based on average
        monthlySales = avgDailySalesPerItem * 30;
        confidence = 0.6;
      }

      const itemImpact = priceDiff * monthlySales;
      estimatedMonthlyImpact += itemImpact;

      factors.push({
        itemId,
        itemName,
        impact: itemImpact,
        reason: `Price changed from $${oldPrice.toFixed(2)} to $${newPrice.toFixed(2)}`,
      });

      totalConfidence += confidence;
      confidenceCount++;
    }

    // Analyze removed items (loss of revenue)
    for (const removed of itemsRemoved) {
      const item = removed.oldValue;
      const itemIdMatch = removed.path.match(/items\[([^\]]+)\]/);
      const itemId = itemIdMatch ? itemIdMatch[1] : null;
      const itemName = item?.name || "Unknown Item";
      const itemPrice = parseFloat(item?.price || 0);

      let monthlySales = 0;
      let confidence = 0.5;

      if (itemId && performance.itemPerformance[itemId]) {
        const itemSales = performance.itemPerformance[itemId].sold || 0;
        monthlySales = (itemSales / performance.periodDays) * 30;
        confidence = 0.9;
      } else {
        monthlySales = avgDailySalesPerItem * 30;
        confidence = 0.6;
      }

      const itemImpact = -itemPrice * monthlySales; // Negative because removed
      estimatedMonthlyImpact += itemImpact;

      factors.push({
        itemId,
        itemName,
        impact: itemImpact,
        reason: "Item removed from menu",
      });

      totalConfidence += confidence;
      confidenceCount++;
    }

    // Analyze added items (potential revenue gain)
    for (const added of itemsAdded) {
      const item = added.newValue;
      const itemId = item?.id;
      const itemName = item?.name || "Unknown Item";
      const itemPrice = parseFloat(item?.price || 0);

      // Estimate sales for new items (conservative estimate)
      const monthlySales = avgDailySalesPerItem * 30 * 0.5; // 50% of average (new item)
      const itemImpact = itemPrice * monthlySales;
      estimatedMonthlyImpact += itemImpact;

      factors.push({
        itemId,
        itemName,
        impact: itemImpact,
        reason: "New item added (estimated sales)",
      });

      totalConfidence += 0.4; // Lower confidence for new items
      confidenceCount++;
    }

    const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0.5;

    return {
      estimatedMonthlyImpact: Math.round(estimatedMonthlyImpact * 100) / 100,
      estimatedYearlyImpact: Math.round(estimatedMonthlyImpact * 12 * 100) / 100,
      confidence: Math.round(avgConfidence * 100) / 100,
      factors,
    };
  }

  /**
   * Analyze cost impact
   */
  private async analyzeCostImpact(
    differences: VersionDifference[],
    version1: MenuVersion,
    version2: MenuVersion,
    performance: any,
    orgId: string
  ): Promise<ImpactAnalysis["cost"]> {
    const itemsRemoved = differences.filter((d) => d.path.startsWith("items[") && d.type === "removed");
    const itemsAdded = differences.filter((d) => d.path.startsWith("items[") && d.type === "added");
    const itemsModified = differences.filter((d) => d.path.startsWith("items[") && d.type === "modified");

    let estimatedMonthlyImpact = 0;
    const factors: ImpactAnalysis["cost"]["factors"] = [];
    let totalConfidence = 0;
    let confidenceCount = 0;

    const avgDailySales = performance.periodDays > 0 ? performance.totalItemsSold / performance.periodDays : 0;
    const avgDailySalesPerItem =
      version1.menuState?.items?.length > 0 ? avgDailySales / version1.menuState.items.length : 0;

    // Analyze removed items (cost savings)
    for (const removed of itemsRemoved) {
      const item = removed.oldValue;
      const itemIdMatch = removed.path.match(/items\[([^\]]+)\]/);
      const itemId = itemIdMatch ? itemIdMatch[1] : null;
      const itemName = item?.name || "Unknown Item";
      const itemCost = parseFloat(item?.cost || item?.recipe_cost || 0);

      let monthlySales = 0;
      let confidence = 0.5;

      if (itemId && performance.itemPerformance[itemId]) {
        const itemSales = performance.itemPerformance[itemId].sold || 0;
        monthlySales = (itemSales / performance.periodDays) * 30;
        confidence = 0.9;
      } else {
        monthlySales = avgDailySalesPerItem * 30;
        confidence = 0.6;
      }

      const itemImpact = -itemCost * monthlySales; // Negative = cost savings
      estimatedMonthlyImpact += itemImpact;

      factors.push({
        itemId,
        itemName,
        impact: itemImpact,
        reason: "Item removed (COGS savings)",
      });

      totalConfidence += confidence;
      confidenceCount++;
    }

    // Analyze added items (additional costs)
    for (const added of itemsAdded) {
      const item = added.newValue;
      const itemId = item?.id;
      const itemName = item?.name || "Unknown Item";
      const itemCost = parseFloat(item?.cost || item?.recipe_cost || 0);

      // Estimate sales for new items
      const monthlySales = avgDailySalesPerItem * 30 * 0.5;
      const itemImpact = itemCost * monthlySales;
      estimatedMonthlyImpact += itemImpact;

      factors.push({
        itemId,
        itemName,
        impact: itemImpact,
        reason: "New item added (estimated COGS)",
      });

      totalConfidence += 0.4;
      confidenceCount++;
    }

    // Analyze cost changes in modified items
    for (const modified of itemsModified) {
      if (modified.field === "cost" || modified.field === "recipe_cost" || modified.field === "recipe_id") {
        const oldCost = parseFloat(modified.oldValue || 0);
        const newCost = parseFloat(modified.newValue || 0);
        const costDiff = newCost - oldCost;

        const itemIdMatch = modified.path.match(/items\[([^\]]+)\]/);
        const itemId = itemIdMatch ? itemIdMatch[1] : null;
        const itemName =
          (itemId && version2.menuState?.items?.find((i: any) => i.id === itemId)?.name) || "Unknown Item";

        let monthlySales = 0;
        let confidence = 0.5;

        if (itemId && performance.itemPerformance[itemId]) {
          const itemSales = performance.itemPerformance[itemId].sold || 0;
          monthlySales = (itemSales / performance.periodDays) * 30;
          confidence = 0.9;
        } else {
          monthlySales = avgDailySalesPerItem * 30;
          confidence = 0.6;
        }

        const itemImpact = costDiff * monthlySales;
        estimatedMonthlyImpact += itemImpact;

        factors.push({
          itemId,
          itemName,
          impact: itemImpact,
          reason: `Cost changed from $${oldCost.toFixed(2)} to $${newCost.toFixed(2)}`,
        });

        totalConfidence += confidence;
        confidenceCount++;
      }
    }

    const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0.5;

    return {
      estimatedMonthlyImpact: Math.round(estimatedMonthlyImpact * 100) / 100,
      estimatedYearlyImpact: Math.round(estimatedMonthlyImpact * 12 * 100) / 100,
      confidence: Math.round(avgConfidence * 100) / 100,
      factors,
    };
  }

  /**
   * Analyze performance impact
   */
  private async analyzePerformanceImpact(
    differences: VersionDifference[],
    version1: MenuVersion,
    version2: MenuVersion,
    performance: any
  ): Promise<ImpactAnalysis["performance"]> {
    const itemsRemoved = differences.filter((d) => d.path.startsWith("items[") && d.type === "removed");
    const itemsAdded = differences.filter((d) => d.path.startsWith("items[") && d.type === "added");
    const priceChanges = differences.filter((d) => d.type === "price_changed");

    let score = 0;
    const factors: ImpactAnalysis["performance"]["factors"] = [];

    // Analyze removed items
    for (const removed of itemsRemoved) {
      const itemIdMatch = removed.path.match(/items\[([^\]]+)\]/);
      const itemId = itemIdMatch ? itemIdMatch[1] : null;

      if (itemId && performance.itemPerformance[itemId]) {
        const popularityScore = performance.itemPerformance[itemId].popularity_score || 0;
        score -= popularityScore; // Negative impact for removing popular items
        factors.push({
          type: "item_removed",
          impact: -popularityScore,
          description: `Removed item with popularity score ${popularityScore}`,
        });
      } else {
        score -= 0.5; // Neutral impact for items without data
        factors.push({
          type: "item_removed",
          impact: -0.5,
          description: "Removed item (no historical data)",
        });
      }
    }

    // Analyze added items (positive for innovation)
    for (const added of itemsAdded) {
      score += 1.0; // Positive impact for adding new items
      factors.push({
        type: "item_added",
        impact: 1.0,
        description: "New item added (innovation)",
      });
    }

    // Analyze price changes (negative if prices increased significantly)
    for (const change of priceChanges) {
      const oldPrice = parseFloat(change.oldValue || 0);
      const newPrice = parseFloat(change.newValue || 0);
      const priceIncreasePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;

      if (priceIncreasePercent > 20) {
        score -= 2.0; // Significant negative impact for large price increases
        factors.push({
          type: "price_increase",
          impact: -2.0,
          description: `Large price increase: ${priceIncreasePercent.toFixed(0)}%`,
        });
      } else if (priceIncreasePercent > 10) {
        score -= 1.0; // Moderate negative impact
        factors.push({
          type: "price_increase",
          impact: -1.0,
          description: `Moderate price increase: ${priceIncreasePercent.toFixed(0)}%`,
        });
      } else if (priceIncreasePercent < -10) {
        score += 1.5; // Positive impact for price decreases
        factors.push({
          type: "price_decrease",
          impact: 1.5,
          description: `Price decrease: ${Math.abs(priceIncreasePercent).toFixed(0)}%`,
        });
      }
    }

    // Determine overall impact
    let impact: "positive" | "neutral" | "negative" = "neutral";
    if (score > 3) {
      impact = "positive";
    } else if (score < -3) {
      impact = "negative";
    }

    // Predict sales and customer satisfaction changes
    const predictedSalesChange = score > 0 ? Math.min(10, score * 2) : Math.max(-10, score * 2);
    const predictedCustomerSatisfactionChange = score > 0 ? Math.min(5, score) : Math.max(-5, score);

    return {
      impact,
      score: Math.round(score * 100) / 100,
      predictedSalesChange: Math.round(predictedSalesChange * 100) / 100,
      predictedCustomerSatisfactionChange: Math.round(predictedCustomerSatisfactionChange * 100) / 100,
      factors,
    };
  }

  /**
   * Analyze risk
   */
  private async analyzeRisk(
    differences: VersionDifference[],
    version1: MenuVersion,
    version2: MenuVersion,
    revenueAnalysis: ImpactAnalysis["revenue"],
    costAnalysis: ImpactAnalysis["cost"]
  ): Promise<ImpactAnalysis["risk"]> {
    const priceChanges = differences.filter((d) => d.type === "price_changed");
    const itemsRemoved = differences.filter((d) => d.path.startsWith("items[") && d.type === "removed");
    const itemsAdded = differences.filter((d) => d.path.startsWith("items[") && d.type === "added");

    let riskScore = 0;
    const factors: ImpactAnalysis["risk"]["factors"] = [];

    // High risk: Removing many items
    if (itemsRemoved.length > 5) {
      riskScore += 3;
      factors.push({
        risk: "Excessive item removal",
        severity: "high",
        description: `Removing ${itemsRemoved.length} items may impact menu variety`,
        mitigation: "Consider phasing out items gradually",
      });
    } else if (itemsRemoved.length > 2) {
      riskScore += 1.5;
      factors.push({
        risk: "Multiple item removals",
        severity: "medium",
        description: `Removing ${itemsRemoved.length} items`,
        mitigation: "Monitor customer feedback closely",
      });
    }

    // High risk: Many price increases
    const significantPriceIncreases = priceChanges.filter((change) => {
      const oldPrice = parseFloat(change.oldValue || 0);
      const newPrice = parseFloat(change.newValue || 0);
      return oldPrice > 0 && ((newPrice - oldPrice) / oldPrice) * 100 > 15;
    });

    if (significantPriceIncreases.length > 5) {
      riskScore += 4;
      factors.push({
        risk: "Excessive price increases",
        severity: "high",
        description: `${significantPriceIncreases.length} items with >15% price increase`,
        mitigation: "Consider gradual price increases or value-add promotions",
      });
    } else if (significantPriceIncreases.length > 2) {
      riskScore += 2;
      factors.push({
        risk: "Multiple price increases",
        severity: "medium",
        description: `${significantPriceIncreases.length} items with significant price increases`,
        mitigation: "Monitor customer response and adjust if needed",
      });
    }

    // Medium risk: Large revenue impact
    if (Math.abs(revenueAnalysis.estimatedMonthlyImpact) > 10000) {
      riskScore += 2;
      factors.push({
        risk: "Significant revenue impact",
        severity: "medium",
        description: `Estimated monthly revenue impact: $${Math.abs(revenueAnalysis.estimatedMonthlyImpact).toFixed(2)}`,
        mitigation: "Review pricing strategy and monitor actual results",
      });
    }

    // Medium risk: Adding many new items at once
    if (itemsAdded.length > 10) {
      riskScore += 2;
      factors.push({
        risk: "Too many new items",
        severity: "medium",
        description: `Adding ${itemsAdded.length} new items may overwhelm customers`,
        mitigation: "Consider introducing new items gradually",
      });
    }

    // High risk: Large negative performance impact
    if (revenueAnalysis.estimatedMonthlyImpact < -5000 && itemsRemoved.length > 3) {
      riskScore += 3;
      factors.push({
        risk: "High revenue risk",
        severity: "high",
        description: "Large negative revenue impact combined with item removals",
        mitigation: "Reconsider removals or offset with promotions",
      });
    }

    // Determine risk level
    let level: "low" | "medium" | "high" | "critical" = "low";
    if (riskScore >= 8) {
      level = "critical";
    } else if (riskScore >= 5) {
      level = "high";
    } else if (riskScore >= 2) {
      level = "medium";
    }

    return {
      level,
      score: Math.round(riskScore * 100) / 100,
      factors,
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    differences: VersionDifference[],
    revenueAnalysis: ImpactAnalysis["revenue"],
    costAnalysis: ImpactAnalysis["cost"],
    performanceAnalysis: ImpactAnalysis["performance"],
    riskAnalysis: ImpactAnalysis["risk"]
  ): ImpactAnalysis["recommendations"] {
    const recommendations: ImpactAnalysis["recommendations"] = [];

    // Revenue recommendations
    if (revenueAnalysis.estimatedMonthlyImpact < -2000) {
      recommendations.push({
        priority: "high",
        category: "revenue",
        recommendation: "Consider adjusting prices or adding value items to offset revenue loss",
        expectedImpact: `Could mitigate ${Math.abs(revenueAnalysis.estimatedMonthlyImpact * 0.3).toFixed(2)} monthly revenue loss`,
      });
    } else if (revenueAnalysis.estimatedMonthlyImpact > 2000) {
      recommendations.push({
        priority: "medium",
        category: "revenue",
        recommendation: "Monitor customer response to price changes",
        expectedImpact: "Ensure revenue gains are sustainable",
      });
    }

    // Cost recommendations
    if (costAnalysis.estimatedMonthlyImpact > 1000) {
      recommendations.push({
        priority: "high",
        category: "cost",
        recommendation: "Review recipe costs and consider ingredient substitutions",
        expectedImpact: `Could reduce monthly costs by ${(costAnalysis.estimatedMonthlyImpact * 0.2).toFixed(2)}`,
      });
    } else if (costAnalysis.estimatedMonthlyImpact < -1000) {
      recommendations.push({
        priority: "medium",
        category: "cost",
        recommendation: "Cost savings identified - monitor quality",
        expectedImpact: "Ensure cost savings don't impact quality",
      });
    }

    // Performance recommendations
    if (performanceAnalysis.impact === "negative") {
      recommendations.push({
        priority: "high",
        category: "performance",
        recommendation: "Consider adding popular items or adjusting pricing strategy",
        expectedImpact: "Could improve customer satisfaction and sales",
      });
    }

    // Risk-based recommendations
    if (riskAnalysis.level === "critical" || riskAnalysis.level === "high") {
      recommendations.push({
        priority: "high",
        category: "risk",
        recommendation: "Consider A/B testing menu changes or gradual rollout",
        expectedImpact: "Reduces risk of negative customer response",
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  }
}

export const menuImpactAnalysisService = new MenuImpactAnalysisService();
