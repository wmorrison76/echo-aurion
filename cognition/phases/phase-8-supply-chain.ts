import { EventEmitter } from "events";

/**
 * Phase 8: Supply Chain Management
 * Manages vendor relationships, procurement, inventory forecasting,
 * logistics optimization, and supplier performance across 40+ outlets.
 */

export interface Vendor {
  id: string;
  name: string;
  category: string;
  isPreferred: boolean;
  rating: number;
  leadTime: number;
  minOrder: number;
  terms: string;
  contacts: Contact[];
  performanceScore: number;
}

export interface Contact {
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface ProcurementOrder {
  id: string;
  vendorId: string;
  status: "draft" | "pending" | "approved" | "ordered" | "shipped" | "received";
  items: ProcurementItem[];
  totalAmount: number;
  createdDate: Date;
  expectedDelivery: Date;
  actualDelivery?: Date;
}

export interface ProcurementItem {
  id: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
}

export interface InventoryForecast {
  outletId: string;
  sku: string;
  currentLevel: number;
  reorderPoint: number;
  safetyStock: number;
  predictedDemand: number;
  recommendedOrder: number;
  optimizationScore: number;
}

export interface LogisticsRoute {
  id: string;
  name: string;
  outlets: string[];
  vendor: string;
  frequency: "daily" | "weekly" | "biweekly";
  cost: number;
  efficiency: number;
  co2Emissions: number;
}

export interface SupplierPerformance {
  vendorId: string;
  deliveryOnTime: number;
  qualityScore: number;
  priceCompetitiveness: number;
  responsiveness: number;
  overallScore: number;
  lastReview: Date;
  trend: "improving" | "stable" | "declining";
}

export interface CommodityPrice {
  commodity: string;
  currentPrice: number;
  previousPrice: number;
  priceChange: number;
  forecastTrend: "up" | "down" | "stable";
  market: "domestic" | "international";
}

export class SupplyChainManager extends EventEmitter {
  private vendors: Map<string, Vendor> = new Map();
  private orders: Map<string, ProcurementOrder> = new Map();
  private forecasts: Map<string, InventoryForecast[]> = new Map();
  private routes: Map<string, LogisticsRoute> = new Map();
  private performances: Map<string, SupplierPerformance> = new Map();

  constructor() {
    super();
    this.initializeSampleVendors();
  }

  private initializeSampleVendors() {
    const vendors: Vendor[] = [
      {
        id: "vendor-1",
        name: "Premium Foods Inc",
        category: "Produce",
        isPreferred: true,
        rating: 4.8,
        leadTime: 2,
        minOrder: 500,
        terms: "Net 30",
        contacts: [
          {
            name: "John Smith",
            email: "john@premiumfoods.com",
            phone: "555-0100",
            role: "Sales Manager",
          },
        ],
        performanceScore: 94,
      },
      {
        id: "vendor-2",
        name: "Beverage Logistics Ltd",
        category: "Beverages",
        isPreferred: true,
        rating: 4.6,
        leadTime: 1,
        minOrder: 100,
        terms: "Net 15",
        contacts: [
          {
            name: "Sarah Johnson",
            email: "sarah@bevlogistics.com",
            phone: "555-0101",
            role: "Account Manager",
          },
        ],
        performanceScore: 91,
      },
      {
        id: "vendor-3",
        name: "Meat & Seafood Partners",
        category: "Proteins",
        isPreferred: true,
        rating: 4.7,
        leadTime: 3,
        minOrder: 300,
        terms: "Net 7",
        contacts: [
          {
            name: "Mike Davis",
            email: "mike@meatseafood.com",
            phone: "555-0102",
            role: "Supply Manager",
          },
        ],
        performanceScore: 89,
      },
    ];

    vendors.forEach((v) => this.vendors.set(v.id, v));
  }

  async getVendors(): Promise<Vendor[]> {
    return Array.from(this.vendors.values());
  }

  async getVendor(vendorId: string): Promise<Vendor | null> {
    return this.vendors.get(vendorId) || null;
  }

  async createProcurementOrder(
    vendorId: string,
    items: ProcurementItem[],
  ): Promise<string> {
    const id = `po-${Date.now()}`;
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    const order: ProcurementOrder = {
      id,
      vendorId,
      status: "draft",
      items,
      totalAmount,
      createdDate: new Date(),
      expectedDelivery: new Date(Date.now() + 48 * 60 * 60 * 1000),
    };

    this.orders.set(id, order);
    this.emit("order:created", { orderId: id, vendorId, amount: totalAmount });
    return id;
  }

  async approveProcurementOrder(orderId: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Order not found");

    order.status = "approved";
    this.emit("order:approved", { orderId });
  }

  async submitProcurementOrder(orderId: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Order not found");

    order.status = "ordered";
    this.emit("order:submitted", { orderId, vendorId: order.vendorId });
  }

  async getProcurementOrders(status?: string): Promise<ProcurementOrder[]> {
    const orders = Array.from(this.orders.values());
    return status ? orders.filter((o) => o.status === status) : orders;
  }

  async generateInventoryForecasts(
    outletId: string,
  ): Promise<InventoryForecast[]> {
    const key = `forecast-${outletId}`;
    if (this.forecasts.has(key)) {
      return this.forecasts.get(key)!;
    }

    const forecasts: InventoryForecast[] = [
      {
        outletId,
        sku: "PROD-001",
        currentLevel: 45,
        reorderPoint: 20,
        safetyStock: 10,
        predictedDemand: 35,
        recommendedOrder: 75,
        optimizationScore: 92,
      },
      {
        outletId,
        sku: "PROD-002",
        currentLevel: 120,
        reorderPoint: 50,
        safetyStock: 25,
        predictedDemand: 85,
        recommendedOrder: 150,
        optimizationScore: 88,
      },
      {
        outletId,
        sku: "PROD-003",
        currentLevel: 15,
        reorderPoint: 30,
        safetyStock: 15,
        predictedDemand: 40,
        recommendedOrder: 200,
        optimizationScore: 65,
      },
    ];

    this.forecasts.set(key, forecasts);
    return forecasts;
  }

  async optimizeLogisticsRoutes(): Promise<LogisticsRoute[]> {
    const routes: LogisticsRoute[] = [
      {
        id: "route-1",
        name: "Downtown Loop",
        outlets: ["outlet-1", "outlet-2", "outlet-7"],
        vendor: "vendor-1",
        frequency: "daily",
        cost: 450,
        efficiency: 92,
        co2Emissions: 28.5,
      },
      {
        id: "route-2",
        name: "Suburban Express",
        outlets: ["outlet-15", "outlet-19", "outlet-22"],
        vendor: "vendor-2",
        frequency: "daily",
        cost: 380,
        efficiency: 88,
        co2Emissions: 24.2,
      },
      {
        id: "route-3",
        name: "Airport Corridor",
        outlets: ["outlet-12", "outlet-25"],
        vendor: "vendor-3",
        frequency: "biweekly",
        cost: 650,
        efficiency: 95,
        co2Emissions: 19.8,
      },
    ];

    return routes;
  }

  async getSupplierPerformance(
    vendorId: string,
  ): Promise<SupplierPerformance | null> {
    if (this.performances.has(vendorId)) {
      return this.performances.get(vendorId)!;
    }

    const performance: SupplierPerformance = {
      vendorId,
      deliveryOnTime: 96,
      qualityScore: 94,
      priceCompetitiveness: 87,
      responsiveness: 91,
      overallScore: 92,
      lastReview: new Date(),
      trend: "improving",
    };

    this.performances.set(vendorId, performance);
    return performance;
  }

  async getCommodityPrices(): Promise<CommodityPrice[]> {
    return [
      {
        commodity: "Wheat",
        currentPrice: 7.85,
        previousPrice: 7.92,
        priceChange: -0.9,
        forecastTrend: "stable",
        market: "domestic",
      },
      {
        commodity: "Chicken",
        currentPrice: 4.12,
        previousPrice: 4.08,
        priceChange: 0.98,
        forecastTrend: "up",
        market: "domestic",
      },
      {
        commodity: "Dairy",
        currentPrice: 28.45,
        previousPrice: 27.89,
        priceChange: 2.0,
        forecastTrend: "up",
        market: "international",
      },
      {
        commodity: "Oils",
        currentPrice: 89.2,
        previousPrice: 91.5,
        priceChange: -2.51,
        forecastTrend: "down",
        market: "international",
      },
    ];
  }

  async negotiateVendorTerms(
    vendorId: string,
    proposedTerms: Partial<Vendor>,
  ): Promise<boolean> {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) throw new Error("Vendor not found");

    Object.assign(vendor, proposedTerms);
    this.emit("vendor:termsUpdated", { vendorId, terms: proposedTerms });
    return true;
  }

  async getSupplyChainMetrics() {
    return {
      totalVendors: this.vendors.size,
      activeOrders: Array.from(this.orders.values()).filter(
        (o) => o.status !== "received",
      ).length,
      averageDeliveryTime: 2.4,
      onTimeDeliveryRate: 96.2,
      costSavingsYTD: 245000,
      sustainabilityScore: 78,
      riskLevel: "low",
    };
  }
}

export const supplyChainManager = new SupplyChainManager();
