import { query } from "../db/client";
interface SalesData {
  date: Date;
  item_id: string;
  qty_sold: number;
  revenue: number;
  margin: number;
}
interface ForecastData {
  item_id: string;
  date: Date;
  predicted_qty: number;
  confidence_lower: number;
  confidence_upper: number;
  confidence_score: number;
}
interface AnomalyAlert {
  item_id: string;
  date: Date;
  anomaly_type:
    | "unusual_sales_spike"
    | "unusual_low_sales"
    | "margin_anomaly"
    | "inventory_variance";
  confidence_score: number;
  description: string;
  recommended_action: string;
}
class AnalyticsService {
  async generateSalesForecasts(
    venue_id: string,
    days_ahead: number = 30,
  ): Promise<ForecastData[]> {
    try {
      const historicalData = await this.getHistoricalSalesData(venue_id, 90);
      const forecasts: ForecastData[] = [];
      const items = [...new Set(historicalData.map((d) => d.item_id))];
      for (const item_id of items) {
        const itemData = historicalData.filter((d) => d.item_id === item_id);
        for (let i = 1; i <= days_ahead; i++) {
          const forecast = this.calculateMovingAverageForecast(itemData, i);
          forecasts.push({
            item_id,
            date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
            predicted_qty: forecast.predicted_qty,
            confidence_lower: forecast.confidence_lower,
            confidence_upper: forecast.confidence_upper,
            confidence_score: forecast.confidence_score,
          });
        }
      }
      return forecasts;
    } catch (error) {
      console.error("Error generating forecasts:", error);
      return [];
    }
  }
  async detectAnomalies(venue_id: string): Promise<AnomalyAlert[]> {
    try {
      const recentData = await this.getHistoricalSalesData(venue_id, 30);
      const anomalies: AnomalyAlert[] = [];
      const items = [...new Set(recentData.map((d) => d.item_id))];
      for (const item_id of items) {
        const itemData = recentData.filter((d) => d.item_id === item_id);
        const spikeAnomaly = this.detectSalesSpike(itemData);
        if (spikeAnomaly) anomalies.push(spikeAnomaly);
        const lowSalesAnomaly = this.detectUnusuallyLowSales(itemData);
        if (lowSalesAnomaly) anomalies.push(lowSalesAnomaly);
        const marginAnomaly = this.detectMarginAnomaly(itemData);
        if (marginAnomaly) anomalies.push(marginAnomaly);
      }
      return anomalies;
    } catch (error) {
      console.error("Error detecting anomalies:", error);
      return [];
    }
  }
  private calculateMovingAverageForecast(data: SalesData[], daysAhead: number) {
    if (data.length === 0) {
      return {
        predicted_qty: 0,
        confidence_lower: 0,
        confidence_upper: 0,
        confidence_score: 0,
      };
    }
    const windowSize = Math.min(7, Math.floor(data.length / 2));
    const recentWindow = data.slice(-windowSize);
    const avgQty =
      recentWindow.reduce((sum, d) => sum + d.qty_sold, 0) / windowSize;
    const variance =
      recentWindow.reduce(
        (sum, d) => sum + Math.pow(d.qty_sold - avgQty, 2),
        0,
      ) / windowSize;
    const stdDev = Math.sqrt(variance);
    const trendFactor = 1 + daysAhead * 0.02;
    return {
      predicted_qty: Math.max(0, Math.round(avgQty * trendFactor)),
      confidence_lower: Math.max(0, Math.round(avgQty - 1.96 * stdDev)),
      confidence_upper: Math.round(avgQty + 1.96 * stdDev),
      confidence_score: Math.min(0.95, 0.7 + (windowSize / 10) * 0.25),
    };
  }
  private detectSalesSpike(data: SalesData[]): AnomalyAlert | null {
    if (data.length < 7) return null;
    const avgQty = data.reduce((sum, d) => sum + d.qty_sold, 0) / data.length;
    const recentAvg =
      data.slice(-7).reduce((sum, d) => sum + d.qty_sold, 0) / 7;
    const spikePercentage = ((recentAvg - avgQty) / avgQty) * 100;
    if (spikePercentage > 50) {
      return {
        item_id: data[0].item_id,
        date: new Date(),
        anomaly_type: "unusual_sales_spike",
        confidence_score: Math.min(0.95, 0.6 + Math.abs(spikePercentage) / 200),
        description: `Sales spike detected - 7-day average ${spikePercentage.toFixed(1)}% above historical average`,
        recommended_action:
          "Consider increasing stock levels to avoid stockouts",
      };
    }
    return null;
  }
  private detectUnusuallyLowSales(data: SalesData[]): AnomalyAlert | null {
    if (data.length < 14) return null;
    const avgQty = data.reduce((sum, d) => sum + d.qty_sold, 0) / data.length;
    const recentAvg =
      data.slice(-7).reduce((sum, d) => sum + d.qty_sold, 0) / 7;
    const decreasePercentage = ((avgQty - recentAvg) / avgQty) * 100;
    if (decreasePercentage > 40) {
      return {
        item_id: data[0].item_id,
        date: new Date(),
        anomaly_type: "unusual_low_sales",
        confidence_score: Math.min(0.95, 0.6 + decreasePercentage / 200),
        description: `Sales decline detected - 7-day average ${decreasePercentage.toFixed(1)}% below historical average`,
        recommended_action:
          "Review menu positioning or pricing; consider promotional action",
      };
    }
    return null;
  }
  private detectMarginAnomaly(data: SalesData[]): AnomalyAlert | null {
    if (data.length < 7) return null;
    const avgMargin = data.reduce((sum, d) => sum + d.margin, 0) / data.length;
    const recentMargin =
      data.slice(-7).reduce((sum, d) => sum + d.margin, 0) / 7;
    const marginDeviation = ((avgMargin - recentMargin) / avgMargin) * 100;
    if (Math.abs(marginDeviation) > 15) {
      const direction = marginDeviation > 0 ? "decreased" : "increased";
      return {
        item_id: data[0].item_id,
        date: new Date(),
        anomaly_type: "margin_anomaly",
        confidence_score: Math.min(0.9, 0.7 + Math.abs(marginDeviation) / 300),
        description: `Margin anomaly - margin ${direction} by ${Math.abs(marginDeviation).toFixed(1)}%`,
        recommended_action: "Review cost of goods or pricing strategy",
      };
    }
    return null;
  }
  async getInventoryOptimizationRecommendations(venue_id: string) {
    try {
      const result = await query(
        ` SELECT li.id, li.name, li.current_qty, li.reorder_level, li.lead_time_days, COALESCE(AVG(pt.qty_sold), 0) as avg_daily_sales, COALESCE(SUM(CASE WHEN pt.transaction_date >= NOW() - INTERVAL '30 days' THEN pt.qty_sold ELSE 0 END), 0) as sales_30d FROM liquor_inventory li LEFT JOIN pos_transactions pt ON li.id = pt.item_id AND pt.venue_id = $1 WHERE li.venue_id = $1 GROUP BY li.id, li.name, li.current_qty, li.reorder_level, li.lead_time_days HAVING COALESCE(AVG(pt.qty_sold), 0) > 0 `,
        [venue_id],
      );
      return result.rows.map((item) => {
        const daysOfStock = item.current_qty / (item.avg_daily_sales || 1);
        const optimalStock = item.avg_daily_sales * (item.lead_time_days + 7);
        return {
          item_id: item.id,
          item_name: item.name,
          current_qty: item.current_qty,
          avg_daily_sales: item.avg_daily_sales,
          days_of_stock: parseFloat(daysOfStock.toFixed(2)),
          optimal_stock: Math.ceil(optimalStock),
          reorder_recommendation:
            daysOfStock < 7
              ? "URGENT - Reorder immediately"
              : daysOfStock < 14
                ? "HIGH - Reorder soon"
                : "NORMAL - Current stock is adequate",
        };
      });
    } catch (error) {
      console.error("Error getting optimization recommendations:", error);
      return [];
    }
  }
  async getRevenueAnalysis(venue_id: string, days: number = 30) {
    try {
      const result = await query(
        ` SELECT DATE(pt.transaction_date) as date, COUNT(*) as transaction_count, SUM(pt.total_amount) as total_revenue, AVG(pt.total_amount) as avg_transaction_value, SUM(pt.total_amount - pt.cost_price * pt.qty_sold) as total_margin, COUNT(DISTINCT pt.item_id) as unique_items FROM pos_transactions pt WHERE pt.venue_id = $1 AND pt.transaction_date >= NOW() - INTERVAL $2 GROUP BY DATE(pt.transaction_date) ORDER BY date DESC `,
        [venue_id, `${days} days`],
      );
      return result.rows;
    } catch (error) {
      console.error("Error getting revenue analysis:", error);
      return [];
    }
  }
  async getTopPerformingItems(
    venue_id: string,
    days: number = 30,
    limit: number = 10,
  ) {
    try {
      const result = await query(
        ` SELECT pt.item_id, li.name, COUNT(*) as sales_count, SUM(pt.qty_sold) as total_qty_sold, SUM(pt.total_amount) as total_revenue, AVG(pt.total_amount) as avg_price, SUM(pt.total_amount - pt.cost_price * pt.qty_sold) as total_margin FROM pos_transactions pt JOIN liquor_inventory li ON pt.item_id = li.id WHERE pt.venue_id = $1 AND pt.transaction_date >= NOW() - INTERVAL $2 GROUP BY pt.item_id, li.name ORDER BY total_revenue DESC LIMIT $3 `,
        [venue_id, `${days} days`, limit],
      );
      return result.rows;
    } catch (error) {
      console.error("Error getting top items:", error);
      return [];
    }
  }
  private async getHistoricalSalesData(
    venue_id: string,
    days: number,
  ): Promise<SalesData[]> {
    try {
      const result = await query(
        ` SELECT pt.transaction_date as date, pt.item_id, pt.qty_sold, pt.total_amount as revenue, (pt.total_amount - pt.cost_price * pt.qty_sold) as margin FROM pos_transactions pt WHERE pt.venue_id = $1 AND pt.transaction_date >= NOW() - INTERVAL $2 ORDER BY pt.transaction_date `,
        [venue_id, `${days} days`],
      );
      return result.rows.map((row) => ({
        date: new Date(row.date),
        item_id: row.item_id,
        qty_sold: parseFloat(row.qty_sold),
        revenue: parseFloat(row.revenue),
        margin: parseFloat(row.margin),
      }));
    } catch (error) {
      console.error("Error fetching historical sales data:", error);
      return [];
    }
  }
}
export default new AnalyticsService();
