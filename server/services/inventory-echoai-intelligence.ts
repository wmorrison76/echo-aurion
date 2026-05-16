/**
 * Inventory EchoAI Intelligence Service
 * -------------------------------------
 * Advanced AI intelligence for inventory ordering decisions
 * Features:
 * - Delivery scheduling vs pricing optimization
 * - Cost/availability/delivery optimization for chef approval
 * - Product substitution intelligence (specific vs flexible)
 * - Chef prep needs vs pricing/availability balance
 * - Shortage prevention for BEO/inventory needs
 */

import { logger } from "../lib/logger";

// OpenAI client - optional dependency
let openai: any = null;
try {
  const OpenAI = require("openai").default;
import { getOpenAIClient } from "../lib/env";
  openai = process.env.OPENAI_API_KEY ? getOpenAIClient() : null;
} catch (error) {
  logger.warn("OpenAI package not available for inventory intelligence");
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  parLevel: number;
  unit: string;
  avgCost: number;
  leadTimeDays: number;
  requiredBy?: string; // ISO date - when needed for BEO/prep
  requiredFor?: "beo" | "prep" | "inventory" | "general";
  specificProductRequired?: boolean; // true = this exact product, false = high-quality substitute OK
  chefNotes?: string; // Chef's specific requirements
}

export interface SupplierOption {
  id: string;
  name: string;
  itemId: string;
  itemName: string;
  price: number;
  unit: string;
  availability: "in_stock" | "limited" | "out_of_stock" | "pre_order";
  deliveryDays: number;
  minOrderQty: number;
  quality: "high" | "medium" | "standard";
  reliability: number; // 0-1 score
  deliverySchedule?: {
    earliest: string; // ISO date
    latest: string; // ISO date
    frequency: "daily" | "weekly" | "bi_weekly" | "monthly";
  };
}

export interface OrderDecision {
  recommendation: "order_now" | "schedule_delivery" | "substitute" | "wait" | "manual_review";
  reasoning: string;
  priority: "critical" | "high" | "medium" | "low";
  selectedSupplier?: SupplierOption;
  recommendedQty: number;
  estimatedCost: number;
  deliveryDate?: string; // ISO date
  substitutionOptions?: SubstitutionOption[];
  requiresApproval: boolean;
  approvalReason?: string;
  factors: {
    price: number; // 0-1 weight
    delivery: number; // 0-1 weight
    availability: number; // 0-1 weight
    quality: number; // 0-1 weight
    urgency: number; // 0-1 weight
  };
}

export interface SubstitutionOption {
  itemId: string;
  itemName: string;
  supplierOption: SupplierOption;
  substitutionReason: string;
  qualityMatch: "exact" | "high" | "acceptable" | "compromise";
  costDifference: number; // positive = more expensive, negative = cheaper
  deliveryDifference: number; // days difference
  chefApprovalRequired: boolean;
}

export interface OrderContext {
  orgId: string;
  outletId?: string;
  chefId?: string;
  beoId?: string;
  prepNeededBy?: string; // ISO date
  budget?: number;
  priority: "critical" | "high" | "medium" | "low";
  approvalThreshold?: number; // Amount requiring approval
}

/**
 * Inventory EchoAI Intelligence Service
 * Provides intelligent ordering decisions using AI
 */
export class InventoryEchoAIIntelligenceService {
  /**
   * Make intelligent ordering decision
   */
  async makeOrderDecision(
    item: InventoryItem,
    supplierOptions: SupplierOption[],
    context: OrderContext
  ): Promise<OrderDecision> {
    // Filter available suppliers
    const availableOptions = supplierOptions.filter(
      (opt) => opt.availability !== "out_of_stock" && opt.itemId === item.id
    );

    if (availableOptions.length === 0) {
      // Check for substitutions if specific product not required
      if (!item.specificProductRequired) {
        return await this.findSubstitution(item, supplierOptions, context);
      }

      return {
        recommendation: "manual_review",
        reasoning: "No available suppliers for this specific item and substitutions not allowed",
        priority: context.priority,
        recommendedQty: this.calculateOrderQty(item),
        estimatedCost: 0,
        requiresApproval: true,
        approvalReason: "No available suppliers",
        factors: {
          price: 0,
          delivery: 0,
          availability: 0,
          quality: 0,
          urgency: this.getUrgencyScore(item, context),
        },
      };
    }

    // Calculate urgency
    const urgency = this.getUrgencyScore(item, context);

    // Determine if delivery scheduling vs immediate ordering
    const needsDeliveryScheduling = this.needsDeliveryScheduling(item, context);

    // Calculate optimal decision
    const decision = await this.calculateOptimalDecision(
      item,
      availableOptions,
      context,
      urgency,
      needsDeliveryScheduling
    );

    // Check if chef approval needed
    decision.requiresApproval = this.requiresChefApproval(decision, context, item);

    if (decision.requiresApproval) {
      decision.approvalReason = this.generateApprovalReason(decision, item, context);
    }

    logger.info("[InventoryEchoAI] Order decision made", {
      itemId: item.id,
      itemName: item.name,
      recommendation: decision.recommendation,
      priority: decision.priority,
      requiresApproval: decision.requiresApproval,
    });

    return decision;
  }

  /**
   * Calculate optimal decision using AI
   */
  private async calculateOptimalDecision(
    item: InventoryItem,
    options: SupplierOption[],
    context: OrderContext,
    urgency: number,
    needsDeliveryScheduling: boolean
  ): Promise<OrderDecision> {
    // Score each option
    const scoredOptions = options.map((opt) => {
      const score = this.scoreSupplierOption(opt, item, context, urgency, needsDeliveryScheduling);
      return { option: opt, score };
    });

    // Sort by score (highest first)
    scoredOptions.sort((a, b) => b.score.total - a.score.total);

    const bestOption = scoredOptions[0];

    // Determine recommendation
    let recommendation: OrderDecision["recommendation"];
    let reasoning: string;

    if (bestOption.score.total > 0.8) {
      recommendation = needsDeliveryScheduling ? "schedule_delivery" : "order_now";
      reasoning = `Optimal supplier selected: ${bestOption.option.name}. ${bestOption.score.reasoning}`;
    } else if (bestOption.score.total > 0.6) {
      recommendation = needsDeliveryScheduling ? "schedule_delivery" : "order_now";
      reasoning = `Good supplier option: ${bestOption.option.name}. ${bestOption.score.reasoning}`;
    } else if (bestOption.score.total > 0.4) {
      recommendation = "manual_review";
      reasoning = `Marginal supplier options. Review recommended: ${bestOption.score.reasoning}`;
    } else {
      recommendation = "wait";
      reasoning = `Poor supplier options. Consider waiting or finding alternatives: ${bestOption.score.reasoning}`;
    }

    const recommendedQty = this.calculateOrderQty(item);
    const estimatedCost = recommendedQty * bestOption.option.price;

    // Calculate delivery date
    let deliveryDate: string | undefined;
    if (bestOption.option.deliverySchedule) {
      deliveryDate = this.calculateDeliveryDate(bestOption.option, item, context);
    } else {
      const deliveryDateObj = new Date();
      deliveryDateObj.setDate(deliveryDateObj.getDate() + bestOption.option.deliveryDays);
      deliveryDate = deliveryDateObj.toISOString().split("T")[0];
    }

    return {
      recommendation,
      reasoning,
      priority: context.priority,
      selectedSupplier: bestOption.option,
      recommendedQty,
      estimatedCost,
      deliveryDate,
      requiresApproval: false,
      factors: bestOption.score.factors,
    };
  }

  /**
   * Score supplier option
   */
  private scoreSupplierOption(
    option: SupplierOption,
    item: InventoryItem,
    context: OrderContext,
    urgency: number,
    needsDeliveryScheduling: boolean
  ): {
    total: number;
    factors: OrderDecision["factors"];
    reasoning: string;
  } {
    // Price factor (0-1, lower is better, normalized)
    const prices = [option.price];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceScore = maxPrice > minPrice ? 1 - (option.price - minPrice) / (maxPrice - minPrice) : 1;

    // Delivery factor (0-1, faster is better)
    let deliveryScore = 1;
    if (item.requiredBy) {
      const requiredDate = new Date(item.requiredBy).getTime();
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + option.deliveryDays);
      const deliveryDateMs = deliveryDate.getTime();

      if (deliveryDateMs <= requiredDate) {
        deliveryScore = 1; // On time
      } else {
        const daysLate = (deliveryDateMs - requiredDate) / (1000 * 60 * 60 * 24);
        deliveryScore = Math.max(0, 1 - daysLate / 7); // Penalize up to 7 days late
      }
    } else {
      deliveryScore = Math.max(0.5, 1 - option.deliveryDays / 14); // Prefer faster delivery
    }

    // Availability factor (0-1)
    const availabilityScore = option.availability === "in_stock" ? 1 : option.availability === "limited" ? 0.7 : 0.5;

    // Quality factor (0-1)
    const qualityScore = option.quality === "high" ? 1 : option.quality === "medium" ? 0.7 : 0.5;

    // Reliability factor (0-1)
    const reliabilityScore = option.reliability;

    // Weight factors based on urgency and needs
    let priceWeight = 0.3;
    let deliveryWeight = 0.2;
    let availabilityWeight = 0.2;
    let qualityWeight = 0.15;
    let reliabilityWeight = 0.15;

    // Adjust weights based on urgency
    if (urgency > 0.8) {
      // High urgency: prioritize delivery and availability
      deliveryWeight = 0.4;
      availabilityWeight = 0.3;
      priceWeight = 0.1;
      qualityWeight = 0.1;
      reliabilityWeight = 0.1;
    } else if (needsDeliveryScheduling) {
      // Delivery scheduling: balance price and delivery
      priceWeight = 0.35;
      deliveryWeight = 0.35;
      availabilityWeight = 0.15;
      qualityWeight = 0.1;
      reliabilityWeight = 0.05;
    } else if (item.requiredFor === "prep") {
      // Chef prep: prioritize quality and delivery
      qualityWeight = 0.3;
      deliveryWeight = 0.3;
      priceWeight = 0.2;
      availabilityWeight = 0.1;
      reliabilityWeight = 0.1;
    }

    // Calculate weighted total
    const total =
      priceScore * priceWeight +
      deliveryScore * deliveryWeight +
      availabilityScore * availabilityWeight +
      qualityScore * qualityWeight +
      reliabilityScore * reliabilityWeight;

    // Generate reasoning
    const reasoning = this.generateScoreReasoning(
      option,
      { priceScore, deliveryScore, availabilityScore, qualityScore, reliabilityScore },
      { priceWeight, deliveryWeight, availabilityWeight, qualityWeight, reliabilityWeight }
    );

    return {
      total,
      factors: {
        price: priceWeight,
        delivery: deliveryWeight,
        availability: availabilityWeight,
        quality: qualityWeight,
        urgency: urgency,
      },
      reasoning,
    };
  }

  /**
   * Generate score reasoning
   */
  private generateScoreReasoning(
    option: SupplierOption,
    scores: Record<string, number>,
    weights: Record<string, number>
  ): string {
    const reasons: string[] = [];

    if (scores.priceScore > 0.8) reasons.push("competitive pricing");
    if (scores.deliveryScore > 0.8) reasons.push("fast delivery");
    if (scores.availabilityScore > 0.8) reasons.push("available in stock");
    if (scores.qualityScore > 0.8) reasons.push("high quality");
    if (scores.reliabilityScore > 0.8) reasons.push("reliable supplier");

    if (reasons.length === 0) reasons.push("acceptable option");

    return `Strong points: ${reasons.join(", ")}`;
  }

  /**
   * Calculate order quantity
   */
  private calculateOrderQty(item: InventoryItem): number {
    const shortfall = Math.max(0, item.parLevel - item.currentStock);
    const buffer = item.parLevel * 0.2; // 20% safety buffer
    return Math.ceil(shortfall + buffer);
  }

  /**
   * Get urgency score
   */
  private getUrgencyScore(item: InventoryItem, context: OrderContext): number {
    let urgency = 0.5; // Base urgency

    // Check stock level
    const stockRatio = item.currentStock / item.parLevel;
    if (stockRatio < 0.2) urgency = 1.0; // Critical
    else if (stockRatio < 0.5) urgency = 0.8; // High
    else if (stockRatio < 0.8) urgency = 0.6; // Medium
    else urgency = 0.4; // Low

    // Check if required for BEO/prep
    if (item.requiredFor === "beo" || item.requiredFor === "prep") {
      urgency = Math.min(1.0, urgency + 0.3); // Increase urgency
    }

    // Check if required by date is soon
    if (item.requiredBy) {
      const requiredDate = new Date(item.requiredBy).getTime();
      const today = new Date().getTime();
      const daysUntil = (requiredDate - today) / (1000 * 60 * 60 * 24);

      if (daysUntil < item.leadTimeDays) {
        urgency = 1.0; // Critical - not enough time
      } else if (daysUntil < item.leadTimeDays * 1.5) {
        urgency = Math.min(1.0, urgency + 0.2); // High urgency
      }
    }

    // Priority from context
    const priorityUrgency: Record<string, number> = {
      critical: 1.0,
      high: 0.8,
      medium: 0.6,
      low: 0.4,
    };
    urgency = Math.max(urgency, priorityUrgency[context.priority] || 0.5);

    return Math.min(1.0, urgency);
  }

  /**
   * Determine if delivery scheduling is needed
   */
  private needsDeliveryScheduling(item: InventoryItem, context: OrderContext): boolean {
    // Schedule delivery if:
    // 1. Not urgent (can wait)
    // 2. Has delivery schedule options
    // 3. Price optimization is more important than speed

    const urgency = this.getUrgencyScore(item, context);
    if (urgency > 0.7) return false; // Too urgent for scheduling

    // Check if item is for general inventory (not BEO/prep)
    if (item.requiredFor === "inventory" || item.requiredFor === "general") {
      return true; // Can schedule for price optimization
    }

    return false;
  }

  /**
   * Find substitution options
   */
  private async findSubstitution(
    item: InventoryItem,
    allSupplierOptions: SupplierOption[],
    context: OrderContext
  ): Promise<OrderDecision> {
    // Find similar items (same category, different item)
    const substitutions = allSupplierOptions
      .filter((opt) => opt.itemId !== item.id)
      .filter((opt) => opt.availability !== "out_of_stock")
      .map((opt) => ({
        itemId: opt.itemId,
        itemName: opt.itemName,
        supplierOption: opt,
        substitutionReason: "Similar product available",
        qualityMatch: opt.quality === "high" ? ("high" as const) : ("acceptable" as const),
        costDifference: opt.price - item.avgCost,
        deliveryDifference: opt.deliveryDays - item.leadTimeDays,
        chefApprovalRequired: item.requiredFor === "prep" || item.requiredFor === "beo",
      }));

    if (substitutions.length === 0) {
      return {
        recommendation: "manual_review",
        reasoning: "No available suppliers and no substitution options found",
        priority: context.priority,
        recommendedQty: this.calculateOrderQty(item),
        estimatedCost: 0,
        requiresApproval: true,
        approvalReason: "No suppliers or substitutions available",
        factors: {
          price: 0,
          delivery: 0,
          availability: 0,
          quality: 0,
          urgency: this.getUrgencyScore(item, context),
        },
      };
    }

    // Sort by quality match and cost
    substitutions.sort((a, b) => {
      const qualityOrder = { exact: 0, high: 1, acceptable: 2, compromise: 3 };
      const qualityDiff = qualityOrder[a.qualityMatch] - qualityOrder[b.qualityMatch];
      if (qualityDiff !== 0) return qualityDiff;
      return a.costDifference - b.costDifference; // Prefer cheaper
    });

    const bestSubstitution = substitutions[0];

    return {
      recommendation: "substitute",
      reasoning: `Original item unavailable. Recommended substitution: ${bestSubstitution.itemName} from ${bestSubstitution.supplierOption.name}. ${bestSubstitution.substitutionReason}`,
      priority: context.priority,
      selectedSupplier: bestSubstitution.supplierOption,
      recommendedQty: this.calculateOrderQty(item),
      estimatedCost: this.calculateOrderQty(item) * bestSubstitution.supplierOption.price,
      substitutionOptions: substitutions.slice(0, 5), // Top 5 options
      requiresApproval: bestSubstitution.chefApprovalRequired,
      approvalReason: bestSubstitution.chefApprovalRequired
        ? "Substitution requires chef approval for BEO/prep"
        : undefined,
      factors: {
        price: 0.3,
        delivery: 0.3,
        availability: 0.2,
        quality: 0.2,
        urgency: this.getUrgencyScore(item, context),
      },
    };
  }

  /**
   * Calculate delivery date
   */
  private calculateDeliveryDate(option: SupplierOption, item: InventoryItem, context: OrderContext): string {
    if (!option.deliverySchedule) {
      const date = new Date();
      date.setDate(date.getDate() + option.deliveryDays);
      return date.toISOString().split("T")[0];
    }

    // Use delivery schedule if available
    if (item.requiredBy) {
      const requiredDate = new Date(item.requiredBy);
      const earliest = new Date(option.deliverySchedule.earliest);
      const latest = new Date(option.deliverySchedule.latest);

      // If required date is within schedule range, use it
      if (requiredDate >= earliest && requiredDate <= latest) {
        return item.requiredBy.split("T")[0];
      }

      // Otherwise use earliest available
      return option.deliverySchedule.earliest.split("T")[0];
    }

    return option.deliverySchedule.earliest.split("T")[0];
  }

  /**
   * Check if chef approval required
   */
  private requiresChefApproval(decision: OrderDecision, context: OrderContext, item: InventoryItem): boolean {
    // Require approval if:
    // 1. Cost exceeds threshold
    if (context.approvalThreshold && decision.estimatedCost > context.approvalThreshold) {
      return true;
    }

    // 2. Item is for BEO/prep and chef is specified
    if ((item.requiredFor === "beo" || item.requiredFor === "prep") && context.chefId) {
      return true;
    }

    // 3. Substitution is recommended
    if (decision.recommendation === "substitute") {
      return true;
    }

    // 4. Quality is below high
    if (decision.selectedSupplier && decision.selectedSupplier.quality !== "high" && item.requiredFor === "prep") {
      return true;
    }

    return false;
  }

  /**
   * Generate approval reason
   */
  private generateApprovalReason(decision: OrderDecision, item: InventoryItem, context: OrderContext): string {
    const reasons: string[] = [];

    if (context.approvalThreshold && decision.estimatedCost > context.approvalThreshold) {
      reasons.push(`Cost ($${decision.estimatedCost.toFixed(2)}) exceeds approval threshold ($${context.approvalThreshold})`);
    }

    if ((item.requiredFor === "beo" || item.requiredFor === "prep") && context.chefId) {
      reasons.push("Required for BEO/prep - chef approval needed");
    }

    if (decision.recommendation === "substitute") {
      reasons.push("Substitution recommended - chef approval required");
    }

    if (decision.selectedSupplier && decision.selectedSupplier.quality !== "high" && item.requiredFor === "prep") {
      reasons.push(`Quality (${decision.selectedSupplier.quality}) below high - chef approval recommended`);
    }

    return reasons.join(". ");
  }

  /**
   * Use AI to enhance decision (optional - uses OpenAI if available)
   */
  async enhanceDecisionWithAI(decision: OrderDecision, item: InventoryItem, context: OrderContext): Promise<OrderDecision> {
    if (!openai) {
      return decision; // Return as-is if OpenAI not available
    }

    try {
      const prompt = this.buildDecisionPrompt(decision, item, context);
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      });

      const aiReasoning = response.choices[0]?.message?.content || decision.reasoning;

      // Enhance reasoning with AI insights
      decision.reasoning = `${decision.reasoning}\n\nAI Insight: ${aiReasoning}`;

      logger.info("[InventoryEchoAI] Decision enhanced with AI", {
        itemId: item.id,
        itemName: item.name,
      });
    } catch (error) {
      logger.error("[InventoryEchoAI] AI enhancement error", { error });
      // Continue without AI enhancement
    }

    return decision;
  }

  /**
   * Build decision prompt for AI
   */
  private buildDecisionPrompt(decision: OrderDecision, item: InventoryItem, context: OrderContext): string {
    return `You are an intelligent inventory ordering system. Analyze this ordering decision:

Item: ${item.name}
Current Stock: ${item.currentStock} ${item.unit}
Par Level: ${item.parLevel} ${item.unit}
Required For: ${item.requiredFor || "general inventory"}
Required By: ${item.requiredBy || "not specified"}
Specific Product Required: ${item.specificProductRequired ? "Yes" : "No (high-quality substitute OK)"}

Decision: ${decision.recommendation}
Selected Supplier: ${decision.selectedSupplier?.name || "N/A"}
Recommended Quantity: ${decision.recommendation}
Estimated Cost: $${decision.estimatedCost.toFixed(2)}
Delivery Date: ${decision.deliveryDate || "not specified"}

Context:
Priority: ${context.priority}
Budget: ${context.budget ? `$${context.budget}` : "not specified"}
Chef ID: ${context.chefId || "N/A"}
BEO ID: ${context.beoId || "N/A"}

Provide a brief, actionable insight about this ordering decision, focusing on:
1. Cost optimization opportunities
2. Delivery timing considerations
3. Quality vs price trade-offs
4. Any risks or recommendations

Keep response under 100 words.`;
  }
}

// Singleton instance
let inventoryEchoAIIntelligenceInstance: InventoryEchoAIIntelligenceService | null = null;

export function getInventoryEchoAIIntelligenceService(): InventoryEchoAIIntelligenceService {
  if (!inventoryEchoAIIntelligenceInstance) {
    inventoryEchoAIIntelligenceInstance = new InventoryEchoAIIntelligenceService();
  }
  return inventoryEchoAIIntelligenceInstance;
}

export default InventoryEchoAIIntelligenceService;
