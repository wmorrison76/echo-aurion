/**
 * Inventory Analytics & Reporting
 * Provides insights and analytics for inventory management
 */

import { supabase } from "@/lib/auth-service";
import type { InventoryTransaction } from "@/lib/inventory-service";

export interface StockTrend {
  date: string;
  average: number;
  minimum: number;
  maximum: number;
  itemCount: number;
}

export interface InventoryMetrics {
  totalItems: number;
  totalValue: number;
  averageValue: number;
  lowStockItems: number;
  outOfStock: number;
  expiringItems: number;
}

export interface ItemPerformance {
  itemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  value: number;
  turnoverRate: number;
  lastUsedDate?: number;
  daysInStock: number;
  category?: string;
}

export interface TransactionSummary {
  period: string;
  scans: number;
  adjustments: number;
  uses: number;
  transfers: number;
  damage: number;
  returns: number;
  totalTransactions: number;
}

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  totalValue: number;
  averageDeliveryTime: number; // days
  onTimeDeliveryRate: number; // percentage
  defectRate: number; // percentage
  lastOrderDate?: number;
}

export interface CostAnalysis {
  period: string;
  totalCost: number;
  averageCostPerItem: number;
  highestCostItems: Array<{ name: string; cost: number }>;
  lowestCostItems: Array<{ name: string; cost: number }>;
  costByCategory: Record<string, number>;
}

/**
 * Get inventory metrics for outlet
 */
export async function getInventoryMetrics(
  outletId: string,
): Promise<InventoryMetrics> {
  if (!supabase) {
    return {
      totalItems: 0,
      totalValue: 0,
      averageValue: 0,
      lowStockItems: 0,
      outOfStock: 0,
      expiringItems: 0,
    };
  }

  try {
    const { data: items } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("outlet_id", outletId);

    if (!items || items.length === 0) {
      return {
        totalItems: 0,
        totalValue: 0,
        averageValue: 0,
        lowStockItems: 0,
        outOfStock: 0,
        expiringItems: 0,
      };
    }

    const totalValue = items.reduce(
      (sum, item) => sum + item.quantity * item.unit_cost,
      0,
    );
    const lowStockCount = items.filter(
      (item) => item.quantity > 0 && item.quantity <= item.minimum_stock,
    ).length;
    const outOfStockCount = items.filter((item) => item.quantity === 0).length;
    const expiringCount = items.filter(
      (item) =>
        item.expiry_date &&
        new Date(item.expiry_date).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000, // Next 7 days
    ).length;

    return {
      totalItems: items.length,
      totalValue,
      averageValue: totalValue / items.length,
      lowStockItems: lowStockCount,
      outOfStock: outOfStockCount,
      expiringItems: expiringCount,
    };
  } catch (error) {
    console.error("Error calculating metrics:", error);
    return {
      totalItems: 0,
      totalValue: 0,
      averageValue: 0,
      lowStockItems: 0,
      outOfStock: 0,
      expiringItems: 0,
    };
  }
}

/**
 * Get item performance analysis
 */
export async function getItemPerformance(
  outletId: string,
  limit: number = 20,
): Promise<ItemPerformance[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data: items } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("outlet_id", outletId)
      .order("quantity", { ascending: false })
      .limit(limit);

    if (!items) {
      return [];
    }

    const performance: ItemPerformance[] = [];

    for (const item of items) {
      // Get last transaction date
      const { data: lastTx } = await supabase
        .from("inventory_transactions")
        .select("created_at")
        .eq("inventory_item_id", item.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const lastUsedDate = lastTx
        ? new Date(lastTx.created_at).getTime()
        : undefined;
      const daysInStock = lastUsedDate
        ? Math.floor((Date.now() - lastUsedDate) / (24 * 60 * 60 * 1000))
        : 0;

      // Calculate turnover rate (transactions per week)
      const { data: monthTransactions } = await supabase
        .from("inventory_transactions")
        .select("*")
        .eq("inventory_item_id", item.id)
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const turnoverRate = monthTransactions
        ? monthTransactions.length / 4.3 // weeks
        : 0;

      performance.push({
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        quantity: item.quantity,
        value: item.quantity * item.unit_cost,
        turnoverRate,
        lastUsedDate,
        daysInStock,
        category: item.category,
      });
    }

    return performance;
  } catch (error) {
    console.error("Error analyzing item performance:", error);
    return [];
  }
}

/**
 * Get stock trends over time
 */
export async function getStockTrends(
  outletId: string,
  days: number = 30,
): Promise<StockTrend[]> {
  if (!supabase) {
    return [];
  }

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: transactions } = await supabase
      .from("inventory_transactions")
      .select("*, inventory_items(*)")
      .gte("created_at", startDate.toISOString())
      .eq("outlet_id", outletId)
      .order("created_at", { ascending: true });

    if (!transactions || transactions.length === 0) {
      return [];
    }

    // Group by date
    const trendMap = new Map<string, { values: number[]; items: Set<string> }>();

    for (const tx of transactions) {
      const date = new Date(tx.created_at).toISOString().split("T")[0];
      if (!trendMap.has(date)) {
        trendMap.set(date, { values: [], items: new Set() });
      }

      const trend = trendMap.get(date)!;
      trend.values.push(tx.inventory_items?.quantity || 0);
      trend.items.add(tx.inventory_item_id);
    }

    const trends: StockTrend[] = [];
    for (const [date, data] of trendMap) {
      const avg = data.values.length > 0
        ? data.values.reduce((a, b) => a + b, 0) / data.values.length
        : 0;

      trends.push({
        date,
        average: avg,
        minimum: Math.min(...data.values),
        maximum: Math.max(...data.values),
        itemCount: data.items.size,
      });
    }

    return trends;
  } catch (error) {
    console.error("Error calculating stock trends:", error);
    return [];
  }
}

/**
 * Get transaction summary
 */
export async function getTransactionSummary(
  outletId: string,
  startDate: Date,
  endDate: Date,
): Promise<TransactionSummary> {
  if (!supabase) {
    return {
      period: `${startDate.toISOString()}-${endDate.toISOString()}`,
      scans: 0,
      adjustments: 0,
      uses: 0,
      transfers: 0,
      damage: 0,
      returns: 0,
      totalTransactions: 0,
    };
  }

  try {
    const { data: transactions } = await supabase
      .from("inventory_transactions")
      .select("transaction_type, quantity")
      .eq("outlet_id", outletId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (!transactions) {
      return {
        period: `${startDate.toISOString()}-${endDate.toISOString()}`,
        scans: 0,
        adjustments: 0,
        uses: 0,
        transfers: 0,
        damage: 0,
        returns: 0,
        totalTransactions: 0,
      };
    }

    const summary = {
      scans: 0,
      adjustments: 0,
      uses: 0,
      transfers: 0,
      damage: 0,
      returns: 0,
    };

    for (const tx of transactions) {
      switch (tx.transaction_type) {
        case "scan":
          summary.scans++;
          break;
        case "adjustment":
          summary.adjustments++;
          break;
        case "use":
          summary.uses++;
          break;
        case "transfer_out":
        case "transfer_in":
          summary.transfers++;
          break;
        case "damage":
          summary.damage++;
          break;
        case "return":
          summary.returns++;
          break;
      }
    }

    return {
      period: `${startDate.toISOString()}-${endDate.toISOString()}`,
      ...summary,
      totalTransactions: transactions.length,
    };
  } catch (error) {
    console.error("Error calculating transaction summary:", error);
    return {
      period: `${startDate.toISOString()}-${endDate.toISOString()}`,
      scans: 0,
      adjustments: 0,
      uses: 0,
      transfers: 0,
      damage: 0,
      returns: 0,
      totalTransactions: 0,
    };
  }
}

/**
 * Get cost analysis
 */
export async function getCostAnalysis(
  outletId: string,
  days: number = 30,
): Promise<CostAnalysis> {
  if (!supabase) {
    return {
      period: `Last ${days} days`,
      totalCost: 0,
      averageCostPerItem: 0,
      highestCostItems: [],
      lowestCostItems: [],
      costByCategory: {},
    };
  }

  try {
    const { data: items } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("outlet_id", outletId);

    if (!items || items.length === 0) {
      return {
        period: `Last ${days} days`,
        totalCost: 0,
        averageCostPerItem: 0,
        highestCostItems: [],
        lowestCostItems: [],
        costByCategory: {},
      };
    }

    const costs = items.map((item) => ({
      name: item.name,
      cost: item.quantity * item.unit_cost,
      category: item.category,
    }));

    const totalCost = costs.reduce((sum, item) => sum + item.cost, 0);
    const averageCost = totalCost / costs.length;

    // Cost by category
    const costByCategory: Record<string, number> = {};
    for (const cost of costs) {
      if (cost.category) {
        costByCategory[cost.category] =
          (costByCategory[cost.category] || 0) + cost.cost;
      }
    }

    // Sort for highest and lowest
    const sorted = [...costs].sort((a, b) => b.cost - a.cost);

    return {
      period: `Last ${days} days`,
      totalCost,
      averageCostPerItem: averageCost,
      highestCostItems: sorted.slice(0, 5),
      lowestCostItems: sorted.slice(-5).reverse(),
      costByCategory,
    };
  } catch (error) {
    console.error("Error calculating cost analysis:", error);
    return {
      period: `Last ${days} days`,
      totalCost: 0,
      averageCostPerItem: 0,
      highestCostItems: [],
      lowestCostItems: [],
      costByCategory: {},
    };
  }
}

/**
 * Get inventory health score (0-100)
 */
export async function getInventoryHealthScore(
  outletId: string,
): Promise<{
  score: number;
  status: "good" | "fair" | "poor";
  factors: Record<string, number>;
}> {
  if (!supabase) {
    return { score: 0, status: "poor", factors: {} };
  }

  try {
    const metrics = await getInventoryMetrics(outletId);

    // Calculate factors (0-100 each)
    const factors: Record<string, number> = {};

    // Stock availability (fewer out-of-stock items = higher score)
    factors.stockAvailability = metrics.outOfStock === 0 ? 100 : Math.max(0, 100 - metrics.outOfStock * 10);

    // Item freshness (fewer expiring items = higher score)
    factors.freshness = metrics.expiringItems === 0 ? 100 : Math.max(0, 100 - metrics.expiringItems * 5);

    // Stock levels (fewer low-stock items = higher score)
    factors.stockLevels = metrics.lowStockItems === 0 ? 100 : Math.max(0, 100 - metrics.lowStockItems * 5);

    // Average score
    const score =
      (factors.stockAvailability +
        factors.freshness +
        factors.stockLevels) /
      3;

    const status: "good" | "fair" | "poor" =
      score >= 80 ? "good" : score >= 50 ? "fair" : "poor";

    return { score: Math.round(score), status, factors };
  } catch (error) {
    console.error("Error calculating health score:", error);
    return { score: 0, status: "poor", factors: {} };
  }
}

/**
 * Get waste and loss report
 */
export async function getWasteReport(
  outletId: string,
  days: number = 30,
): Promise<{
  totalWaste: number;
  wasteByType: Record<string, { quantity: number; cost: number }>;
  wasteByItem: Array<{ itemName: string; quantity: number; cost: number }>;
}> {
  if (!supabase) {
    return {
      totalWaste: 0,
      wasteByType: {},
      wasteByItem: [],
    };
  }

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: transactions } = await supabase
      .from("inventory_transactions")
      .select("*, inventory_items(*)")
      .eq("outlet_id", outletId)
      .gte("created_at", startDate.toISOString())
      .in("transaction_type", ["damage", "return"]);

    if (!transactions || transactions.length === 0) {
      return {
        totalWaste: 0,
        wasteByType: {},
        wasteByItem: [],
      };
    }

    const wasteByType: Record<string, { quantity: number; cost: number }> = {};
    const wasteByItem: Record<string, { quantity: number; cost: number }> = {};

    for (const tx of transactions) {
      const cost = tx.quantity * (tx.inventory_items?.unit_cost || 0);

      // By type
      if (!wasteByType[tx.transaction_type]) {
        wasteByType[tx.transaction_type] = { quantity: 0, cost: 0 };
      }
      wasteByType[tx.transaction_type].quantity += tx.quantity;
      wasteByType[tx.transaction_type].cost += cost;

      // By item
      const itemName = tx.inventory_items?.name || "Unknown";
      if (!wasteByItem[itemName]) {
        wasteByItem[itemName] = { quantity: 0, cost: 0 };
      }
      wasteByItem[itemName].quantity += tx.quantity;
      wasteByItem[itemName].cost += cost;
    }

    const totalWaste = Object.values(wasteByType).reduce(
      (sum, item) => sum + item.cost,
      0,
    );

    return {
      totalWaste,
      wasteByType,
      wasteByItem: Object.entries(wasteByItem)
        .map(([name, data]) => ({ itemName: name, ...data }))
        .sort((a, b) => b.cost - a.cost),
    };
  } catch (error) {
    console.error("Error calculating waste report:", error);
    return {
      totalWaste: 0,
      wasteByType: {},
      wasteByItem: [],
    };
  }
}
