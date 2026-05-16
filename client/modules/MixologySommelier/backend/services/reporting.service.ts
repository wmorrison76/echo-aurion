import { query } from "../db/client";
interface ReportConfig {
  venue_id: string;
  report_type:
    | "sales"
    | "inventory"
    | "variance"
    | "anomalies"
    | "forecasts"
    | "comprehensive";
  start_date: Date;
  end_date: Date;
  include_summary?: boolean;
  include_charts?: boolean;
}
class ReportingService {
  async generateSalesReport(
    venue_id: string,
    start_date: Date,
    end_date: Date,
  ): Promise<any> {
    try {
      const result = await query(
        ` SELECT DATE(transaction_date) as date, COUNT(*) as transaction_count, SUM(total_amount) as total_revenue, AVG(total_amount) as avg_transaction_value, SUM(total_amount - cost_price * qty_sold) as total_margin, COUNT(DISTINCT item_id) as unique_items, MAX(total_amount) as highest_transaction, MIN(total_amount) as lowest_transaction FROM pos_transactions WHERE venue_id = $1 AND transaction_date >= $2 AND transaction_date <= $3 GROUP BY DATE(transaction_date) ORDER BY date DESC `,
        [venue_id, start_date, end_date],
      );
      const summary = result.rows.reduce(
        (acc, row) => ({
          total_revenue: acc.total_revenue + parseFloat(row.total_revenue),
          total_margin: acc.total_margin + parseFloat(row.total_margin),
          total_transactions:
            acc.total_transactions + parseInt(row.transaction_count),
          total_unique_items:
            acc.total_unique_items + parseInt(row.unique_items),
        }),
        {
          total_revenue: 0,
          total_margin: 0,
          total_transactions: 0,
          total_unique_items: 0,
        },
      );
      return {
        report_type: "sales",
        venue_id,
        period: {
          start_date,
          end_date,
          days: Math.ceil(
            (end_date.getTime() - start_date.getTime()) / (1000 * 60 * 60 * 24),
          ),
        },
        summary: {
          ...summary,
          avg_daily_revenue:
            summary.total_revenue /
            Math.ceil(
              (end_date.getTime() - start_date.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          margin_percentage:
            summary.total_revenue > 0
              ? ((summary.total_margin / summary.total_revenue) * 100).toFixed(
                  2,
                )
              : "0",
        },
        daily_breakdown: result.rows,
        generated_at: new Date(),
      };
    } catch (error) {
      console.error("Error generating sales report:", error);
      throw error;
    }
  }
  async generateInventoryReport(
    venue_id: string,
    start_date: Date,
    end_date: Date,
  ): Promise<any> {
    try {
      const currentResult = await query(
        ` SELECT id, name, category, current_qty, reorder_level, current_price, cost_price, current_qty * current_price as inventory_value FROM liquor_inventory WHERE venue_id = $1 ORDER BY inventory_value DESC `,
        [venue_id],
      );
      const movementResult = await query(
        ` SELECT item_id, SUM(qty_sold) as total_sold, COUNT(*) as transaction_count, AVG(unit_price) as avg_price FROM pos_transactions WHERE venue_id = $1 AND transaction_date >= $2 AND transaction_date <= $3 GROUP BY item_id ORDER BY total_sold DESC `,
        [venue_id, start_date, end_date],
      );
      const totalInventoryValue = currentResult.rows.reduce(
        (sum, item) => sum + parseFloat(item.inventory_value),
        0,
      );
      return {
        report_type: "inventory",
        venue_id,
        period: { start_date, end_date },
        summary: {
          total_items: currentResult.rows.length,
          total_inventory_value: totalInventoryValue.toFixed(2),
          avg_item_value: (
            totalInventoryValue / currentResult.rows.length
          ).toFixed(2),
          low_stock_items: currentResult.rows.filter(
            (item) => item.current_qty < item.reorder_level,
          ).length,
        },
        current_inventory: currentResult.rows,
        movement_data: movementResult.rows,
        generated_at: new Date(),
      };
    } catch (error) {
      console.error("Error generating inventory report:", error);
      throw error;
    }
  }
  async generateVarianceReport(
    venue_id: string,
    start_date: Date,
    end_date: Date,
  ): Promise<any> {
    try {
      const result = await query(
        ` SELECT il.id, il.name, COUNT(va.id) as variance_count, SUM(CASE WHEN va.variance_percentage > 5 THEN 1 ELSE 0 END) as critical_variances, SUM(CASE WHEN va.variance_percentage > 1 AND va.variance_percentage <= 5 THEN 1 ELSE 0 END) as warning_variances, AVG(va.variance_percentage) as avg_variance_percentage FROM liquor_inventory il LEFT JOIN breakage_variance va ON il.id = va.item_id AND va.detected_at >= $2 AND va.detected_at <= $3 WHERE il.venue_id = $1 GROUP BY il.id, il.name HAVING COUNT(va.id) > 0 ORDER BY critical_variances DESC, avg_variance_percentage DESC `,
        [venue_id, start_date, end_date],
      );
      const summary = result.rows.reduce(
        (acc, row) => ({
          total_variances: acc.total_variances + parseInt(row.variance_count),
          critical: acc.critical + parseInt(row.critical_variances),
          warnings: acc.warnings + parseInt(row.warning_variances),
        }),
        { total_variances: 0, critical: 0, warnings: 0 },
      );
      return {
        report_type: "variance",
        venue_id,
        period: { start_date, end_date },
        summary: {
          ...summary,
          avg_variance_percentage:
            result.rows.length > 0
              ? (
                  result.rows.reduce(
                    (sum, row) =>
                      sum + parseFloat(row.avg_variance_percentage || 0),
                    0,
                  ) / result.rows.length
                ).toFixed(2)
              : "0",
        },
        variance_details: result.rows,
        generated_at: new Date(),
      };
    } catch (error) {
      console.error("Error generating variance report:", error);
      throw error;
    }
  }
  async generateAnomalyReport(
    venue_id: string,
    start_date: Date,
    end_date: Date,
  ): Promise<any> {
    try {
      const result = await query(
        ` SELECT item_id, anomaly_type, confidence_score, description, recommended_action, detected_at, resolved FROM anomaly_detections WHERE venue_id = $1 AND detected_at >= $2 AND detected_at <= $3 ORDER BY confidence_score DESC, detected_at DESC `,
        [venue_id, start_date, end_date],
      );
      const summary = result.rows.reduce(
        (acc, row) => ({
          total_anomalies: acc.total_anomalies + 1,
          critical: acc.critical + (row.confidence_score > 0.8 ? 1 : 0),
          resolved: acc.resolved + (row.resolved ? 1 : 0),
          by_type: {
            ...acc.by_type,
            [row.anomaly_type]: (acc.by_type[row.anomaly_type] || 0) + 1,
          },
        }),
        { total_anomalies: 0, critical: 0, resolved: 0, by_type: {} },
      );
      return {
        report_type: "anomalies",
        venue_id,
        period: { start_date, end_date },
        summary,
        anomalies: result.rows,
        generated_at: new Date(),
      };
    } catch (error) {
      console.error("Error generating anomaly report:", error);
      throw error;
    }
  }
  async generateForecastReport(
    venue_id: string,
    days_ahead: number = 30,
  ): Promise<any> {
    try {
      const result = await query(
        ` SELECT item_id, forecast_date, predicted_qty, confidence_score, confidence_lower, confidence_upper FROM sales_forecasts WHERE venue_id = $1 AND forecast_date >= CURRENT_DATE AND forecast_date <= CURRENT_DATE + INTERVAL $2 ORDER BY forecast_date, confidence_score DESC `,
        [venue_id, `${days_ahead} days`],
      );
      const summary = result.rows.reduce(
        (acc, row) => ({
          total_forecasts: acc.total_forecasts + 1,
          avg_confidence: acc.avg_confidence + row.confidence_score,
          high_confidence:
            acc.high_confidence + (row.confidence_score > 0.8 ? 1 : 0),
          by_date: {
            ...acc.by_date,
            [row.forecast_date]: (acc.by_date[row.forecast_date] || 0) + 1,
          },
        }),
        {
          total_forecasts: 0,
          avg_confidence: 0,
          high_confidence: 0,
          by_date: {},
        },
      );
      return {
        report_type: "forecasts",
        venue_id,
        period: {
          forecast_days: days_ahead,
          start_date: new Date(),
          end_date: new Date(Date.now() + days_ahead * 24 * 60 * 60 * 1000),
        },
        summary: {
          total_forecasts: summary.total_forecasts,
          avg_confidence_score: (
            summary.avg_confidence / summary.total_forecasts
          ).toFixed(2),
          high_confidence_percentage: (
            (summary.high_confidence / summary.total_forecasts) *
            100
          ).toFixed(2),
        },
        forecasts: result.rows,
        generated_at: new Date(),
      };
    } catch (error) {
      console.error("Error generating forecast report:", error);
      throw error;
    }
  }
  async generateComprehensiveReport(
    venue_id: string,
    start_date: Date,
    end_date: Date,
  ): Promise<any> {
    try {
      const [sales, inventory, variance, anomalies] = await Promise.all([
        this.generateSalesReport(venue_id, start_date, end_date),
        this.generateInventoryReport(venue_id, start_date, end_date),
        this.generateVarianceReport(venue_id, start_date, end_date),
        this.generateAnomalyReport(venue_id, start_date, end_date),
      ]);
      return {
        report_type: "comprehensive",
        venue_id,
        period: { start_date, end_date },
        reports: { sales, inventory, variance, anomalies },
        generated_at: new Date(),
      };
    } catch (error) {
      console.error("Error generating comprehensive report:", error);
      throw error;
    }
  }
  convertToCSV(data: any[]): string {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (value === null || value === undefined) return "";
            if (typeof value === "string" && value.includes(",")) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(","),
      ),
    ].join("\n");
    return csv;
  }
  generateCSVExport(
    report: any,
    filename: string,
  ): { csv: string; filename: string } {
    let csv = "";
    csv += `Report: ${report.report_type.toUpperCase()}\n`;
    csv += `Generated: ${new Date(report.generated_at).toISOString()}\n`;
    csv += `Venue ID: ${report.venue_id}\n\n`;
    if (report.summary) {
      csv += "SUMMARY\n";
      csv += this.convertToCSV([report.summary]) + "\n\n";
    }
    if (report.daily_breakdown) {
      csv += "DAILY BREAKDOWN\n";
      csv += this.convertToCSV(report.daily_breakdown) + "\n\n";
    }
    if (report.current_inventory) {
      csv += "CURRENT INVENTORY\n";
      csv += this.convertToCSV(report.current_inventory) + "\n\n";
    }
    if (report.variance_details) {
      csv += "VARIANCE DETAILS\n";
      csv += this.convertToCSV(report.variance_details) + "\n\n";
    }
    if (report.anomalies) {
      csv += "ANOMALIES\n";
      csv += this.convertToCSV(report.anomalies) + "\n\n";
    }
    return {
      csv,
      filename: `${filename}_${new Date().toISOString().split("T")[0]}.csv`,
    };
  }
  async storeReportInDatabase(
    venue_id: string,
    report_type: string,
    report_data: any,
  ): Promise<string> {
    try {
      const report_id = `report_${venue_id}_${Date.now()}`;
      await query(
        ` INSERT INTO stored_reports (id, venue_id, report_type, report_data, created_at) VALUES ($1, $2, $3, $4, NOW()) `,
        [report_id, venue_id, report_type, JSON.stringify(report_data)],
      );
      return report_id;
    } catch (error) {
      console.error("Error storing report in database:", error);
      throw error;
    }
  }
}
export default new ReportingService();
