/**
 * Network Intelligence Types
 * The Bloomberg Terminal for Hospitality
 */

import { UUID, ISODate, Money } from './base';

// ============================================================================
// AGGREGATED DATA (Anonymized)
// ============================================================================

export interface AnonymizedRestaurantData {
  id: UUID; // Anonymized restaurant ID
  timestamp: ISODate;
  
  // Basic metrics (anonymized)
  category: 'casual_dining' | 'fine_dining' | 'fast_casual' | 'quick_service';
  location: {
    region: string; // "Northeast", "Southeast", etc.
    marketSize: 'metro' | 'suburban' | 'rural';
    zipPrefix: string; // First 3 digits only
  };
  
  // Performance metrics
  metrics: {
    // Revenue
    dailyRevenue: Money;
    coversServed: number;
    averageCheck: Money;
    
    // Costs
    foodCostPercent: number;
    laborCostPercent: number;
    
    // Efficiency
    tableTurnTime: number; // minutes
    ticketTime: number; // minutes
    
    // Inventory
    inventoryTurnover: number;
    wastePercent: number;
  };
  
  // Menu intelligence
  topSellingItems: {
    category: string;
    orderCount: number;
    averagePrice: Money;
  }[];
}

// ============================================================================
// PEER BENCHMARKING
// ============================================================================

export interface PeerBenchmark {
  metric: string;
  yourValue: number;
  peerAverage: number;
  peerMedian: number;
  peerTop10: number;
  percentile: number; // Where you rank (0-100)
  trend: 'improving' | 'declining' | 'stable';
}

export interface BenchmarkReport {
  restaurantId: UUID;
  generatedAt: ISODate;
  period: {
    start: ISODate;
    end: ISODate;
  };
  
  peerGroup: {
    category: string;
    region: string;
    totalPeers: number;
  };
  
  benchmarks: {
    revenue: PeerBenchmark;
    foodCost: PeerBenchmark;
    laborCost: PeerBenchmark;
    averageCheck: PeerBenchmark;
    tableTurn: PeerBenchmark;
    wastePercent: PeerBenchmark;
  };
  
  insights: string[];
  recommendations: string[];
}

// ============================================================================
// MARKET INTELLIGENCE
// ============================================================================

export interface MarketTrend {
  id: UUID;
  timestamp: ISODate;
  
  trend: {
    name: string;
    description: string;
    strength: number; // 0-1
    velocity: number; // Rate of change
  };
  
  metrics: {
    restaurantsAffected: number;
    averageImpact: number; // Percent change
    regions: string[];
    categories: string[];
  };
  
  predictions: {
    nextWeek: number;
    nextMonth: number;
    confidence: number;
  };
}

export interface MarketIntelligence {
  id: UUID;
  generatedAt: ISODate;
  
  // What's happening across the industry
  trends: MarketTrend[];
  
  // Pricing intelligence
  pricing: {
    category: string;
    averagePrice: Money;
    priceRange: { min: Money; max: Money };
    recommendedPrice: Money;
  }[];
  
  // Supply chain intelligence
  supplyChain: {
    ingredient: string;
    averageCost: Money;
    trend: 'rising' | 'falling' | 'stable';
    volatility: number;
    recommendation: string;
  }[];
  
  // Labor intelligence
  labor: {
    position: string;
    averageWage: Money;
    availability: 'high' | 'medium' | 'low';
    turnoverRate: number;
  }[];
}

// ============================================================================
// NETWORK INSIGHTS
// ============================================================================

export interface NetworkInsight {
  id: UUID;
  timestamp: ISODate;
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  type: 'opportunity' | 'threat' | 'trend' | 'anomaly';
  title: string;
  description: string;
  
  // Evidence from network
  evidence: {
    restaurantsObserved: number;
    averageImpact: number;
    confidence: number;
  };
  
  // Recommendation
  action: string;
  expectedImpact: {
    revenue: number;
    cost: number;
    netProfit: number;
  };
  
  timeframe: string;
}
