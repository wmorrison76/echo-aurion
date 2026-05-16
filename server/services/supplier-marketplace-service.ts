/**
 * Supplier Marketplace & Bidding Platform Service
 * Moat #19: Collaborative Supplier Marketplace & Bidding Platform
 * 
 * Industry First: Marketplace + Procurement in Hospitality
 * - Multi-tenant supplier marketplace
 * - Reverse auction bidding for contracts
 * - Supplier performance tracking
 * - Collaborative purchasing (group buying power)
 * - Supplier diversity tracking
 */

import { logger } from "../lib/logger";

export interface Supplier {
  id: string;
  name: string;
  category: string[];
  rating: number;
  totalOrders: number;
  onTimeDeliveryRate: number;
  qualityScore: number;
  priceCompetitiveness: number;
  certifications: string[];
  diversityStatus?: "minority_owned" | "women_owned" | "veteran_owned" | "lgbtq_owned" | "none";
}

export interface MarketplaceListing {
  id: string;
  supplierId: string;
  supplierName: string;
  itemName: string;
  category: string;
  unit: string;
  price: number;
  minOrderQuantity: number;
  availability: "in_stock" | "limited" | "out_of_stock";
  deliveryTime: number; // days
  qualityRating: number;
  bulkDiscountAvailable: boolean;
  listedAt: Date;
}

export interface RFQRequest {
  id: string;
  organizationId: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  requirements: string[];
  deadline: Date;
  maxPrice?: number;
  qualityRequirements?: string[];
  deliveryDate: Date;
  status: "open" | "bidding" | "awarded" | "closed";
  createdAt: Date;
}

export interface Bid {
  id: string;
  rfqId: string;
  supplierId: string;
  supplierName: string;
  price: number;
  quantity: number;
  deliveryDate: Date;
  terms: string;
  certifications: string[];
  status: "submitted" | "under_review" | "accepted" | "rejected";
  submittedAt: Date;
}

export interface CollaborativePurchase {
  id: string;
  itemName: string;
  category: string;
  totalQuantity: number;
  unit: string;
  participatingOrganizations: string[];
  supplierId: string;
  negotiatedPrice: number;
  savingsPercent: number;
  status: "forming" | "active" | "completed";
  createdAt: Date;
}

export class SupplierMarketplaceService {
  private suppliers: Map<string, Supplier> = new Map();
  private listings: Map<string, MarketplaceListing[]> = new Map();
  private rfqs: Map<string, RFQRequest> = new Map();
  private bids: Map<string, Bid[]> = new Map();
  private collaborativePurchases: Map<string, CollaborativePurchase> = new Map();

  /**
   * Register supplier in marketplace
   */
  async registerSupplier(supplier: Supplier): Promise<Supplier> {
    this.suppliers.set(supplier.id, supplier);
    logger.info("[Supplier Marketplace] Supplier registered", {
      supplierId: supplier.id,
      name: supplier.name,
    });
    return supplier;
  }

  /**
   * List item in marketplace
   */
  async listItem(listing: MarketplaceListing): Promise<MarketplaceListing> {
    if (!this.listings.has(listing.supplierId)) {
      this.listings.set(listing.supplierId, []);
    }
    this.listings.get(listing.supplierId)!.push(listing);
    
    logger.info("[Supplier Marketplace] Item listed", {
      listingId: listing.id,
      supplierId: listing.supplierId,
      itemName: listing.itemName,
      price: listing.price,
    });
    
    return listing;
  }

  /**
   * Search marketplace listings
   */
  async searchListings(
    query: string,
    category?: string,
    maxPrice?: number,
    minRating?: number
  ): Promise<MarketplaceListing[]> {
    const allListings: MarketplaceListing[] = [];
    
    for (const supplierListings of this.listings.values()) {
      allListings.push(...supplierListings);
    }
    
    let results = allListings.filter(listing => {
      // Text search
      const matchesQuery = !query || 
        listing.itemName.toLowerCase().includes(query.toLowerCase()) ||
        listing.category.toLowerCase().includes(query.toLowerCase());
      
      // Category filter
      const matchesCategory = !category || listing.category === category;
      
      // Price filter
      const matchesPrice = !maxPrice || listing.price <= maxPrice;
      
      // Rating filter
      const matchesRating = !minRating || listing.qualityRating >= minRating;
      
      return matchesQuery && matchesCategory && matchesPrice && matchesRating;
    });
    
    // Sort by relevance (rating, price, availability)
    results.sort((a, b) => {
      if (a.availability !== b.availability) {
        const availabilityOrder = { "in_stock": 0, "limited": 1, "out_of_stock": 2 };
        return availabilityOrder[a.availability] - availabilityOrder[b.availability];
      }
      if (Math.abs(a.qualityRating - b.qualityRating) > 0.5) {
        return b.qualityRating - a.qualityRating;
      }
      return a.price - b.price;
    });
    
    return results;
  }

  /**
   * Create RFQ (Request for Quote)
   */
  async createRFQ(rfq: RFQRequest): Promise<RFQRequest> {
    this.rfqs.set(rfq.id, rfq);
    logger.info("[Supplier Marketplace] RFQ created", {
      rfqId: rfq.id,
      itemName: rfq.itemName,
      quantity: rfq.quantity,
    });
    return rfq;
  }

  /**
   * Submit bid on RFQ
   */
  async submitBid(bid: Bid): Promise<Bid> {
    const rfq = this.rfqs.get(bid.rfqId);
    if (!rfq) {
      throw new Error("RFQ not found");
    }
    
    if (rfq.status !== "open" && rfq.status !== "bidding") {
      throw new Error("RFQ is not accepting bids");
    }
    
    if (!this.bids.has(bid.rfqId)) {
      this.bids.set(bid.rfqId, []);
    }
    this.bids.get(bid.rfqId)!.push(bid);
    
    // Update RFQ status
    rfq.status = "bidding";
    
    logger.info("[Supplier Marketplace] Bid submitted", {
      bidId: bid.id,
      rfqId: bid.rfqId,
      supplierId: bid.supplierId,
      price: bid.price,
    });
    
    return bid;
  }

  /**
   * Award bid (accept winning bid)
   */
  async awardBid(rfqId: string, bidId: string, organizationId: string): Promise<void> {
    const rfq = this.rfqs.get(rfqId);
    if (!rfq) {
      throw new Error("RFQ not found");
    }
    
    const bids = this.bids.get(rfqId) || [];
    const winningBid = bids.find(b => b.id === bidId);
    
    if (!winningBid) {
      throw new Error("Bid not found");
    }
    
    // Mark winning bid as accepted
    winningBid.status = "accepted";
    
    // Mark other bids as rejected
    bids.forEach(bid => {
      if (bid.id !== bidId) {
        bid.status = "rejected";
      }
    });
    
    // Update RFQ status
    rfq.status = "awarded";
    
    logger.info("[Supplier Marketplace] Bid awarded", {
      rfqId,
      bidId,
      supplierId: winningBid.supplierId,
      price: winningBid.price,
    });
  }

  /**
   * Get bids for RFQ
   */
  async getBidsForRFQ(rfqId: string): Promise<Bid[]> {
    return this.bids.get(rfqId) || [];
  }

  /**
   * Compare bids for RFQ
   */
  async compareBids(rfqId: string): Promise<{
    bids: Bid[];
    recommendedBid?: Bid;
    comparison: {
      lowestPrice: Bid;
      fastestDelivery: Bid;
      highestRating: Bid;
    };
  }> {
    const bids = this.bids.get(rfqId) || [];
    
    if (bids.length === 0) {
      return { bids, comparison: {} as any };
    }
    
    const lowestPrice = bids.reduce((min, bid) => bid.price < min.price ? bid : min, bids[0]);
    const fastestDelivery = bids.reduce((min, bid) => 
      bid.deliveryDate < min.deliveryDate ? bid : min, bids[0]
    );
    
    // Get supplier ratings
    const bidsWithRatings = bids.map(bid => {
      const supplier = this.suppliers.get(bid.supplierId);
      return {
        bid,
        rating: supplier?.rating || 0,
      };
    });
    
    const highestRating = bidsWithRatings.reduce((max, item) => 
      item.rating > max.rating ? item : max, bidsWithRatings[0]
    ).bid;
    
    // Recommend based on weighted score (price 40%, delivery 30%, rating 30%)
    const scoredBids = bidsWithRatings.map(item => {
      const priceScore = (1 - (item.bid.price - lowestPrice.price) / lowestPrice.price) * 0.4;
      const deliveryScore = (1 - (item.bid.deliveryDate.getTime() - fastestDelivery.deliveryDate.getTime()) / 
        (fastestDelivery.deliveryDate.getTime() - new Date().getTime())) * 0.3;
      const ratingScore = (item.rating / 5) * 0.3;
      return {
        bid: item.bid,
        score: priceScore + deliveryScore + ratingScore,
      };
    });
    
    const recommendedBid = scoredBids.reduce((max, item) => 
      item.score > max.score ? item : max, scoredBids[0]
    ).bid;
    
    return {
      bids,
      recommendedBid,
      comparison: {
        lowestPrice,
        fastestDelivery,
        highestRating,
      },
    };
  }

  /**
   * Create collaborative purchase (group buying)
   */
  async createCollaborativePurchase(
    itemName: string,
    category: string,
    organizationIds: string[],
    quantity: number,
    unit: string
  ): Promise<CollaborativePurchase> {
    const purchase: CollaborativePurchase = {
      id: `collab-${Date.now()}`,
      itemName,
      category,
      totalQuantity: quantity,
      unit,
      participatingOrganizations: organizationIds,
      supplierId: "", // To be determined
      negotiatedPrice: 0, // To be negotiated
      savingsPercent: 0, // To be calculated
      status: "forming",
      createdAt: new Date(),
    };
    
    this.collaborativePurchases.set(purchase.id, purchase);
    
    logger.info("[Supplier Marketplace] Collaborative purchase created", {
      purchaseId: purchase.id,
      itemName,
      quantity,
      organizations: organizationIds.length,
    });
    
    return purchase;
  }

  /**
   * Get supplier performance metrics
   */
  async getSupplierPerformance(supplierId: string): Promise<{
    supplier: Supplier;
    metrics: {
      totalOrders: number;
      onTimeDeliveryRate: number;
      qualityScore: number;
      averageRating: number;
      totalRevenue: number;
      responseTime: number; // hours
    };
  }> {
    const supplier = this.suppliers.get(supplierId);
    if (!supplier) {
      throw new Error("Supplier not found");
    }
    
    return {
      supplier,
      metrics: {
        totalOrders: supplier.totalOrders,
        onTimeDeliveryRate: supplier.onTimeDeliveryRate,
        qualityScore: supplier.qualityScore,
        averageRating: supplier.rating,
        totalRevenue: 0, // Would be calculated from orders
        responseTime: 24, // Average response time in hours
      },
    };
  }

  /**
   * Track supplier diversity
   */
  async getDiversityMetrics(): Promise<{
    totalSuppliers: number;
    minorityOwned: number;
    womenOwned: number;
    veteranOwned: number;
    lgbtqOwned: number;
    diversityPercentage: number;
  }> {
    const suppliers = Array.from(this.suppliers.values());
    const total = suppliers.length;
    
    const minorityOwned = suppliers.filter(s => s.diversityStatus === "minority_owned").length;
    const womenOwned = suppliers.filter(s => s.diversityStatus === "women_owned").length;
    const veteranOwned = suppliers.filter(s => s.diversityStatus === "veteran_owned").length;
    const lgbtqOwned = suppliers.filter(s => s.diversityStatus === "lgbtq_owned").length;
    
    const diverseCount = suppliers.filter(s => 
      s.diversityStatus && s.diversityStatus !== "none"
    ).length;
    
    return {
      totalSuppliers: total,
      minorityOwned,
      womenOwned,
      veteranOwned,
      lgbtqOwned,
      diversityPercentage: total > 0 ? (diverseCount / total) * 100 : 0,
    };
  }
}

let serviceInstance: SupplierMarketplaceService | null = null;

export function getSupplierMarketplaceService(): SupplierMarketplaceService {
  if (!serviceInstance) {
    serviceInstance = new SupplierMarketplaceService();
  }
  return serviceInstance;
}

export default SupplierMarketplaceService;
