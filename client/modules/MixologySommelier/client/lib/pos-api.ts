const API_BASE_URL =
  import.meta.env.REACT_APP_API_URL || "http://localhost:8080/api";
async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...((options?.headers as any) || {}),
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}
export interface POSConfig {
  id: string;
  pos_type: "square" | "toast" | "margin_edge" | "other";
  webhook_url: string;
  sync_enabled: boolean;
  sync_frequency_minutes: number;
  last_sync_at?: string;
  active: boolean;
}
export interface SalesData {
  period: string;
  transaction_count: number;
  total_revenue: number;
  total_margin: number;
  avg_margin_percent: number;
  total_qty_sold: number;
  unique_servers: number;
}
export interface TopItem {
  item_id: string;
  item_name: string;
  total_qty: number;
  total_revenue: number;
  avg_price: number;
  transaction_count: number;
  total_margin: number;
}
export interface PricingRecommendation {
  current_price: number;
  recommended_price: number;
  demand_multiplier: number;
  inventory_multiplier: number;
  confidence_score: number;
  reason: string;
}
export interface RevenueReport {
  sale_date: string;
  transactions: number;
  total_revenue: number;
  total_margin: number;
  total_items_sold: number;
  avg_margin_percent: number;
  unique_servers: number;
  last_sale_time: string;
}
class POSAPIService {
  async configurePOS(
    venueId: string,
    config: {
      pos_type: string;
      api_key: string;
      api_secret: string;
      webhook_url: string;
      webhook_secret: string;
      sync_frequency_minutes?: number;
    },
  ): Promise<POSConfig> {
    try {
      const data = await fetchAPI<{ config: POSConfig }>(
        `${API_BASE_URL}/pos/config`,
        {
          method: "POST",
          body: JSON.stringify({ venue_id: venueId, ...config }),
        },
      );
      return data.config;
    } catch (error) {
      console.error("Failed to configure POS:", error);
      throw error;
    }
  }
  async getPOSConfig(venueId: string): Promise<POSConfig | null> {
    try {
      const data = await fetchAPI<{ config: POSConfig }>(
        `${API_BASE_URL}/pos/config/${venueId}`,
      );
      return data.config;
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return null;
      }
      console.error("Failed to fetch POS config:", error);
      throw error;
    }
  }
  async recordSale(
    venueId: string,
    saleData: {
      pos_id: string;
      item_id?: string;
      item_name: string;
      sku?: string;
      qty_sold: number;
      unit_price: number;
      total_amount: number;
      cost_price?: number;
      transaction_date: string;
      payment_method?: string;
      server_name?: string;
      table_number?: string;
    },
  ) {
    try {
      const data = await fetchAPI<{ transaction: any }>(
        `${API_BASE_URL}/pos/record-sale`,
        {
          method: "POST",
          body: JSON.stringify({ venue_id: venueId, ...saleData }),
        },
      );
      return data.transaction;
    } catch (error) {
      console.error("Failed to record sale:", error);
      throw error;
    }
  }
  async getSalesData(
    venueId: string,
    startDate: Date,
    endDate: Date,
    groupBy: "day" | "hour" = "day",
  ): Promise<SalesData[]> {
    try {
      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        group_by: groupBy,
      });
      const data = await fetchAPI<{ data: SalesData[] }>(
        `${API_BASE_URL}/pos/sales-data/${venueId}?${params}`,
      );
      return data.data;
    } catch (error) {
      console.error("Failed to fetch sales data:", error);
      throw error;
    }
  }
  async getTopSellingItems(
    venueId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10,
  ): Promise<TopItem[]> {
    try {
      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        limit: limit.toString(),
      });
      const data = await fetchAPI<{ items: TopItem[] }>(
        `${API_BASE_URL}/pos/top-items/${venueId}?${params}`,
      );
      return data.items;
    } catch (error) {
      console.error("Failed to fetch top-selling items:", error);
      throw error;
    }
  }
  async createPricingRule(
    itemId: string,
    config: {
      base_price: number;
      min_price?: number;
      max_price?: number;
      venue_id?: string;
      pricing_formula?: string;
    },
  ) {
    try {
      const data = await fetchAPI<{ rule: any }>(
        `${API_BASE_URL}/pos/pricing-rule`,
        {
          method: "POST",
          body: JSON.stringify({ item_id: itemId, ...config }),
        },
      );
      return data.rule;
    } catch (error) {
      console.error("Failed to create pricing rule:", error);
      throw error;
    }
  }
  async getOptimalPrice(
    itemId: string,
    venueId: string,
  ): Promise<PricingRecommendation> {
    try {
      const params = new URLSearchParams({ venue_id: venueId });
      const data = await fetchAPI<PricingRecommendation>(
        `${API_BASE_URL}/pos/optimal-price/${itemId}?${params}`,
      );
      return data;
    } catch (error) {
      console.error("Failed to get optimal price:", error);
      throw error;
    }
  }
  async getRevenueReport(
    venueId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<RevenueReport[]> {
    try {
      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });
      const data = await fetchAPI<{ report: RevenueReport[] }>(
        `${API_BASE_URL}/pos/revenue-report/${venueId}?${params}`,
      );
      return data.report;
    } catch (error) {
      console.error("Failed to fetch revenue report:", error);
      throw error;
    }
  }
}
export default new POSAPIService();
