// Types for interacting with supplier APIs and managing real-time data

export type SupplierAPIType = "sysco" | "us-foods" | "gfs" | "pfg" | "mclane" | "kehe" | "shamrock" | "ben-e-keith" | "golden-state" | "generic-rest";

export type PriceHistoryEntry = {
  date: number;
  pricePerUnit: number;
  source: "api" | "manual" | "order";
};

// Real supplier product entry
export type SupplierProduct = {
  id: string;
  supplierId: string;
  sku: string;
  productName: string;
  description?: string;
  category: string;
  packSize: number;
  packUnit: string;
  currentPrice: number;
  currency: string;
  priceHistory: PriceHistoryEntry[];
  minOrderQuantity: number;
  minOrderUnit: string;
  leadTimeDays: number;
  availability: "in-stock" | "limited" | "out-of-stock" | "discontinued";
  lastUpdated: number;
  apiSync: boolean;
};

// Order line item
export type OrderLineItem = {
  id: string;
  supplierProductId: string;
  sku: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string;
  deliveryDate?: number;
};

// Purchase order
export type PurchaseOrder = {
  id: string;
  orderId: string; // Supplier's order ID, assigned after submission
  supplierId: string;
  supplierName: string;
  status: "draft" | "submitted" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled";
  lineItems: OrderLineItem[];
  totalAmount: number;
  estimatedDeliveryDate: number;
  actualDeliveryDate?: number;
  deliveryAddress?: string;
  instructions?: string;
  createdAt: number;
  submittedAt?: number;
  createdBy?: string;
  notes?: string;
};

// Supplier price feed - cached real-time prices
export type SupplierPriceFeed = {
  supplierId: string;
  lastUpdated: number;
  products: SupplierProduct[];
  syncStatus: "syncing" | "success" | "failed" | "never-synced";
  lastSyncError?: string;
};

// API connection configuration
export type SupplierAPIConfig = {
  supplierId: string;
  apiType: SupplierAPIType;
  baseUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
  enabled: boolean;
  syncFrequency: "manual" | "daily" | "weekly" | "bi-weekly";
  lastSync?: number;
  nextScheduledSync?: number;
  connectionStatus: "connected" | "failed" | "unauthorized" | "timeout" | "pending";
  errorMessage?: string;
};

// Request/response for price list API call
export type PriceListRequest = {
  supplierId: string;
  category?: string;
  searchTerm?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
};

export type PriceListResponse = {
  success: boolean;
  products: Array<{
    sku: string;
    name: string;
    description?: string;
    category: string;
    packSize: number;
    packUnit: string;
    price: number;
    currency: string;
    minOrder: number;
    leadTime: number;
    availability: string;
  }>;
  timestamp: number;
  error?: string;
};

// Request/response for placing order
export type SubmitOrderRequest = {
  supplierId: string;
  lineItems: Array<{
    sku: string;
    quantity: number;
    unit: string;
  }>;
  deliveryDate?: number;
  specialInstructions?: string;
  contactEmail?: string;
  contactPhone?: string;
};

export type SubmitOrderResponse = {
  success: boolean;
  orderId: string;
  estimatedDeliveryDate: number;
  totalAmount: number;
  confirmationNumber: string;
  message?: string;
  error?: string;
};

// Inventory sync request/response
export type InventorySyncRequest = {
  supplierId: string;
  forceRefresh?: boolean;
};

export type InventorySyncResponse = {
  success: boolean;
  productsCount: number;
  newProducts: number;
  updatedProducts: number;
  timestamp: number;
  error?: string;
};

// Price comparison for ingredient sourcing
export type PriceComparison = {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  suppliers: Array<{
    supplierId: string;
    supplierName: string;
    sku: string;
    packSize: number;
    packUnit: string;
    unitPrice: number;
    totalPackPrice: number;
    availability: string;
    leadTimeDays: number;
    reliability: number; // 0-1 score
  }>;
  timestamp: number;
};

// Supplier reliability metrics
export type SupplierMetrics = {
  supplierId: string;
  supplierName: string;
  onTimeDeliveryPercent: number;
  qualityScore: number; // 1-5
  priceCompetitiveness: number; // 1-5
  responseTime: number; // hours
  minOrderReliability: number; // % orders meet minimum
  averageLeadTime: number;
  totalOrdersHistory: number;
  successfulOrdersPercent: number;
  lastUpdated: number;
};

// Cost tracking against supplier
export type SupplierCostAnalysis = {
  supplierId: string;
  period: { startDate: number; endDate: number };
  totalOrderAmount: number;
  totalOrderCount: number;
  averageOrderSize: number;
  topProducts: Array<{
    sku: string;
    productName: string;
    quantity: number;
    totalSpent: number;
  }>;
  priceVariation: {
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
  };
};

// Delivery performance tracking
export type DeliveryPerformance = {
  orderId: string;
  supplierId: string;
  orderDate: number;
  estimatedDeliveryDate: number;
  actualDeliveryDate?: number;
  daysLate: number;
  itemsDelivered: number;
  itemsOrdered: number;
  discrepancies?: string[];
  qualityIssues?: string[];
  timestamp: number;
};

// API sync log for audit trail
export type APISyncLog = {
  id: string;
  supplierId: string;
  syncType: "price-list" | "inventory" | "order-status" | "delivery-tracking";
  startTime: number;
  endTime: number;
  duration: number; // milliseconds
  status: "success" | "partial-success" | "failure";
  recordsProcessed: number;
  recordsFailed: number;
  error?: string;
  details?: string;
};

// RFQ (Request for Quote) functionality
export type RFQRequest = {
  id: string;
  status: "draft" | "sent" | "responded" | "accepted" | "expired";
  recipients: string[]; // Supplier IDs
  items: Array<{
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    targetDeliveryDate: number;
  }>;
  createdAt: number;
  sentAt?: number;
  expiresAt: number;
  responses: RFQResponse[];
};

export type RFQResponse = {
  id: string;
  rfqId: string;
  supplierId: string;
  supplierName: string;
  items: Array<{
    ingredientId: string;
    sku: string;
    price: number;
    leadTime: number;
    availability: string;
  }>;
  totalPrice: number;
  notes?: string;
  validUntil: number;
  respondedAt: number;
};
