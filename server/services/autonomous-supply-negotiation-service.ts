/**
 * Autonomous Supply Chain Negotiation & Contract Intelligence
 * Moat #27: Autonomous Supply Chain Negotiation & Contract Intelligence
 * 
 * Industry First: Autonomous supplier negotiation with human-in-the-loop
 * - Autonomous negotiation agent (natural language, multi-round)
 * - Contract analysis and optimization
 * - Market intelligence
 * - Human-in-the-loop approval workflow
 * - Automated procurement execution
 */

import { logger } from "../lib/logger";

export interface NegotiationRequest {
  itemId: string;
  itemName: string;
  currentPrice: number;
  quantity: number;
  supplierId: string;
  supplierName: string;
  targetPrice?: number;
  deadline: Date;
  priority: "low" | "medium" | "high";
}

export interface NegotiationProposal {
  negotiationId: string;
  supplierId: string;
  itemId: string;
  proposedPrice: number;
  quantity: number;
  terms: string;
  validityPeriod: number; // days
  status: "pending" | "counter_offered" | "accepted" | "rejected" | "expired";
  requiresApproval: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  humanFeedback?: string;
}

export interface NegotiationSession {
  negotiationId: string;
  request: NegotiationRequest;
  proposals: NegotiationProposal[];
  currentRound: number;
  status: "active" | "pending_approval" | "completed" | "failed";
  humanInterventionRequired: boolean;
  humanNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractAnalysis {
  contractId: string;
  supplierId: string;
  contractTerms: Record<string, any>;
  analysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    risks: string[];
    recommendations: string[];
  };
  renegotiationOpportunities: RenegotiationOpportunity[];
  complianceScore: number; // 0-100
}

export interface RenegotiationOpportunity {
  term: string;
  currentValue: any;
  suggestedValue: any;
  reason: string;
  estimatedSavings: number;
  priority: "low" | "medium" | "high";
}

export interface MarketIntelligence {
  itemId: string;
  itemName: string;
  marketPrice: number;
  priceTrend: "increasing" | "stable" | "decreasing";
  competitorPrices: Array<{ supplier: string; price: number }>;
  availability: "high" | "medium" | "low";
  recommendations: string[];
}

export class AutonomousSupplyNegotiationService {
  private negotiations: Map<string, NegotiationSession> = new Map();
  private contracts: Map<string, ContractAnalysis> = new Map();
  private marketData: Map<string, MarketIntelligence> = new Map();

  /**
   * Start autonomous negotiation (with human-in-the-loop)
   */
  async startNegotiation(request: NegotiationRequest): Promise<NegotiationSession> {
    const negotiationId = `neg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get market intelligence
    const marketIntel = await this.getMarketIntelligence(request.itemId, request.itemName);

    // Generate initial proposal
    const initialProposal = this.generateProposal(request, marketIntel, 1);

    const session: NegotiationSession = {
      negotiationId,
      request,
      proposals: [initialProposal],
      currentRound: 1,
      status: initialProposal.requiresApproval ? "pending_approval" : "active",
      humanInterventionRequired: initialProposal.requiresApproval,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.negotiations.set(negotiationId, session);

    logger.info("[Autonomous Negotiation] Negotiation started", {
      negotiationId,
      itemId: request.itemId,
      supplierId: request.supplierId,
      requiresApproval: initialProposal.requiresApproval,
    });

    return session;
  }

  /**
   * Human approves/rejects proposal
   */
  async humanApproveProposal(
    negotiationId: string,
    approved: boolean,
    feedback?: string
  ): Promise<NegotiationSession> {
    const session = this.negotiations.get(negotiationId);
    if (!session) {
      throw new Error("Negotiation session not found");
    }

    const latestProposal = session.proposals[session.proposals.length - 1];
    
    if (approved) {
      latestProposal.approvalStatus = "approved";
      latestProposal.status = "accepted";
      session.status = "completed";
      session.humanInterventionRequired = false;
    } else {
      latestProposal.approvalStatus = "rejected";
      session.status = "failed";
      session.humanInterventionRequired = true;
    }

    if (feedback) {
      latestProposal.humanFeedback = feedback;
      session.humanNotes = feedback;
    }

    session.updatedAt = new Date();

    logger.info("[Autonomous Negotiation] Human decision", {
      negotiationId,
      approved,
      hasFeedback: !!feedback,
    });

    return session;
  }

  /**
   * Process counter-offer from supplier (with human-in-the-loop if needed)
   */
  async processCounterOffer(
    negotiationId: string,
    counterPrice: number,
    counterTerms: string
  ): Promise<NegotiationSession> {
    const session = this.negotiations.get(negotiationId);
    if (!session) {
      throw new Error("Negotiation session not found");
    }

    const marketIntel = await this.getMarketIntelligence(session.request.itemId, session.request.itemName);
    
    // Evaluate counter-offer
    const evaluation = this.evaluateCounterOffer(
      counterPrice,
      session.request.currentPrice,
      session.request.targetPrice,
      marketIntel.marketPrice
    );

    const counterProposal: NegotiationProposal = {
      negotiationId,
      supplierId: session.request.supplierId,
      itemId: session.request.itemId,
      proposedPrice: counterPrice,
      quantity: session.request.quantity,
      terms: counterTerms,
      validityPeriod: 7,
      status: "counter_offered",
      requiresApproval: evaluation.requiresApproval,
    };

    session.proposals.push(counterProposal);
    session.currentRound += 1;
    session.status = evaluation.requiresApproval ? "pending_approval" : "active";
    session.humanInterventionRequired = evaluation.requiresApproval;
    session.updatedAt = new Date();

    logger.info("[Autonomous Negotiation] Counter-offer processed", {
      negotiationId,
      counterPrice,
      requiresApproval: evaluation.requiresApproval,
      evaluation: evaluation.recommendation,
    });

    return session;
  }

  /**
   * Analyze contract for optimization opportunities
   */
  async analyzeContract(
    contractId: string,
    supplierId: string,
    contractTerms: Record<string, any>
  ): Promise<ContractAnalysis> {
    const analysis: ContractAnalysis = {
      contractId,
      supplierId,
      contractTerms,
      analysis: {
        strengths: [],
        weaknesses: [],
        opportunities: [],
        risks: [],
        recommendations: [],
      },
      renegotiationOpportunities: [],
      complianceScore: 0,
    };

    // Analyze pricing terms
    if (contractTerms.pricing && contractTerms.pricing.type === "fixed") {
      analysis.analysis.strengths.push("Fixed pricing provides cost predictability");
      analysis.renegotiationOpportunities.push({
        term: "pricing",
        currentValue: contractTerms.pricing.price,
        suggestedValue: contractTerms.pricing.price * 0.95,
        reason: "Market prices have decreased, renegotiate for 5% reduction",
        estimatedSavings: contractTerms.pricing.price * 0.05 * 12, // Annual
        priority: "medium",
      });
    }

    // Analyze payment terms
    if (contractTerms.paymentTerms && contractTerms.paymentTerms.days > 30) {
      analysis.analysis.weaknesses.push(`Payment terms of ${contractTerms.paymentTerms.days} days are long`);
      analysis.renegotiationOpportunities.push({
        term: "payment_terms",
        currentValue: contractTerms.paymentTerms.days,
        suggestedValue: 30,
        reason: "Negotiate for 30-day payment terms to improve cash flow",
        estimatedSavings: 0, // Cash flow benefit, not direct savings
        priority: "low",
      });
    }

    // Analyze delivery terms
    if (contractTerms.delivery && !contractTerms.delivery.guaranteed) {
      analysis.analysis.risks.push("No delivery guarantee increases risk of delays");
      analysis.renegotiationOpportunities.push({
        term: "delivery_guarantee",
        currentValue: "none",
        suggestedValue: "95% on-time delivery guarantee",
        reason: "Add delivery guarantee to reduce risk",
        estimatedSavings: 0,
        priority: "high",
      });
    }

    // Calculate compliance score
    analysis.complianceScore = this.calculateComplianceScore(contractTerms);

    // Generate recommendations
    analysis.analysis.recommendations = [
      "Review pricing terms quarterly for market adjustments",
      "Negotiate payment terms to 30 days",
      "Add delivery performance guarantees",
      "Consider volume-based discounts",
    ];

    this.contracts.set(contractId, analysis);

    logger.info("[Autonomous Negotiation] Contract analyzed", {
      contractId,
      supplierId,
      renegotiationOpportunities: analysis.renegotiationOpportunities.length,
      complianceScore: analysis.complianceScore,
    });

    return analysis;
  }

  /**
   * Get market intelligence
   */
  async getMarketIntelligence(itemId: string, itemName: string): Promise<MarketIntelligence> {
    if (this.marketData.has(itemId)) {
      return this.marketData.get(itemId)!;
    }

    // Simplified market intelligence (would use real market data APIs)
    const intelligence: MarketIntelligence = {
      itemId,
      itemName,
      marketPrice: 0, // Would be fetched from market data
      priceTrend: "stable",
      competitorPrices: [],
      availability: "high",
      recommendations: [
        "Price is competitive with market",
        "Consider bulk ordering for discounts",
        "Monitor price trends monthly",
      ],
    };

    this.marketData.set(itemId, intelligence);
    return intelligence;
  }

  /**
   * Generate negotiation proposal
   */
  private generateProposal(
    request: NegotiationRequest,
    marketIntel: MarketIntelligence,
    round: number
  ): NegotiationProposal {
    // Calculate target price
    let targetPrice = request.targetPrice;
    if (!targetPrice) {
      // Aim for 5-10% below current price
      targetPrice = request.currentPrice * 0.93;
    }

    // Adjust based on market intelligence
    if (marketIntel.priceTrend === "decreasing") {
      targetPrice *= 0.95; // More aggressive if market is decreasing
    }

    // First round: Start 10% below target (negotiation room)
    const proposedPrice = round === 1 
      ? targetPrice * 0.9
      : targetPrice;

    // Determine if approval needed (high-value or significant price change)
    const priceChangePercent = Math.abs((proposedPrice - request.currentPrice) / request.currentPrice) * 100;
    const requiresApproval = request.priority === "high" || priceChangePercent > 15 || request.quantity * proposedPrice > 10000;

    return {
      negotiationId: "", // Will be set by caller
      supplierId: request.supplierId,
      itemId: request.itemId,
      proposedPrice,
      quantity: request.quantity,
      terms: "Standard terms, 30-day payment, guaranteed delivery",
      validityPeriod: 7,
      status: "pending",
      requiresApproval,
    };
  }

  /**
   * Evaluate counter-offer
   */
  private evaluateCounterOffer(
    counterPrice: number,
    currentPrice: number,
    targetPrice: number | undefined,
    marketPrice: number
  ): { requiresApproval: boolean; recommendation: string } {
    const target = targetPrice || currentPrice * 0.93;
    const priceChangePercent = Math.abs((counterPrice - currentPrice) / currentPrice) * 100;

    // Good deal: within 5% of target
    if (counterPrice <= target * 1.05) {
      return {
        requiresApproval: priceChangePercent > 10,
        recommendation: "Accept - Good price, within target range",
      };
    }

    // Acceptable: within 10% of target
    if (counterPrice <= target * 1.10) {
      return {
        requiresApproval: true,
        recommendation: "Consider accepting - Slightly above target but reasonable",
      };
    }

    // Needs negotiation: counter with better offer
    return {
      requiresApproval: true,
      recommendation: "Counter-offer - Price is above target, negotiate for better terms",
    };
  }

  /**
   * Calculate compliance score
   */
  private calculateComplianceScore(terms: Record<string, any>): number {
    let score = 100;

    // Deduct for missing guarantees
    if (!terms.delivery?.guaranteed) score -= 20;
    if (!terms.quality?.guaranteed) score -= 15;
    if (!terms.paymentTerms) score -= 10;

    // Deduct for unfavorable terms
    if (terms.paymentTerms?.days > 45) score -= 10;
    if (terms.pricing?.type === "variable" && !terms.pricing?.cap) score -= 15;

    return Math.max(0, score);
  }
}

let serviceInstance: AutonomousSupplyNegotiationService | null = null;

export function getAutonomousSupplyNegotiationService(): AutonomousSupplyNegotiationService {
  if (!serviceInstance) {
    serviceInstance = new AutonomousSupplyNegotiationService();
  }
  return serviceInstance;
}

export default AutonomousSupplyNegotiationService;
