/**
 * Multi-Outlet Consolidation Service
 * ──────────────────────────────────
 * Consolidates financial data from 40+ outlets into enterprise-wide reports.
 * Supports hierarchical organization, region/district rollups, and real-time
 * consolidation with variance analysis.
 *
 * FEATURES:
 * - Real-time multi-outlet aggregation
 * - Hierarchical rollup (outlet → district → region → enterprise)
 * - Variance analysis across outlets
 * - Performance benchmarking
 * - Automated exception reporting
 * - USALI-compliant consolidation
 */

import { pnlCalculatorRealtime } from "./pnl-calculator-realtime";

export interface OutletHierarchy {
  outlet_id: string;
  outlet_name: string;
  region?: string;
  district?: string;
  property_code?: string;
  parent_id?: string;
}

export interface ConsolidationResult {
  period: string;
  level: "outlet" | "district" | "region" | "enterprise";
  outlet_ids: string[];
  consolidated_revenue: number;
  consolidated_costs: number;
  consolidated_margin_percent: number;
  outlet_metrics: Array<{
    outlet_id: string;
    outlet_name: string;
    revenue: number;
    costs: number;
    margin_percent: number;
    variance_from_average: number;
    status: "on_track" | "concerning" | "critical";
  }>;
  variance_analysis: {
    best_performer: string;
    worst_performer: string;
    std_deviation: number;
    coefficient_of_variation: number;
  };
  exceptions: ConsolidationException[];
  last_updated: number;
}

export interface ConsolidationException {
  outlet_id: string;
  outlet_name: string;
  type:
    | "revenue_decline"
    | "cost_spike"
    | "margin_erosion"
    | "unusual_variance";
  severity: "warning" | "critical";
  message: string;
  metric_value: number;
  threshold: number;
  percentage_variance: number;
}

interface OutletCache {
  outlet_id: string;
  pnl: any;
  updated_at: number;
}

class MultiOutletConsolidator {
  private outletsHierarchy: Map<string, OutletHierarchy> = new Map();
  private outletCache: Map<string, OutletCache> = new Map();
  private consolidationCache: Map<string, ConsolidationResult> = new Map();
  private outletsPerDistrict: Map<string, string[]> = new Map();
  private outletsPerRegion: Map<string, string[]> = new Map();
  private globalOutletList: string[] = [];

  /**
   * Register outlets with hierarchy
   */
  public registerOutlets(outlets: OutletHierarchy[]): void {
    console.log(
      `[Consolidator] Registering ${outlets.length} outlets for enterprise consolidation`,
    );

    this.globalOutletList = [];

    outlets.forEach((outlet) => {
      this.outletsHierarchy.set(outlet.outlet_id, outlet);
      this.globalOutletList.push(outlet.outlet_id);

      // Build district map
      if (outlet.district) {
        if (!this.outletsPerDistrict.has(outlet.district)) {
          this.outletsPerDistrict.set(outlet.district, []);
        }
        this.outletsPerDistrict.get(outlet.district)!.push(outlet.outlet_id);
      }

      // Build region map
      if (outlet.region) {
        if (!this.outletsPerRegion.has(outlet.region)) {
          this.outletsPerRegion.set(outlet.region, []);
        }
        this.outletsPerRegion.get(outlet.region)!.push(outlet.outlet_id);
      }
    });

    console.log(
      `[Consolidator] ✓ Registered ${this.globalOutletList.length} outlets`,
    );
    console.log(
      `[Consolidator] Regions: ${this.outletsPerRegion.size}, Districts: ${this.outletsPerDistrict.size}`,
    );
  }

  /**
   * Consolidate at enterprise level (all outlets)
   */
  public async consolidateEnterprise(): Promise<ConsolidationResult> {
    return this.consolidateLevel("enterprise", this.globalOutletList);
  }

  /**
   * Consolidate at region level
   */
  public async consolidateRegion(region: string): Promise<ConsolidationResult> {
    const outletsInRegion = this.outletsPerRegion.get(region) || [];
    if (outletsInRegion.length === 0) {
      throw new Error(`No outlets found in region: ${region}`);
    }

    return this.consolidateLevel("region", outletsInRegion);
  }

  /**
   * Consolidate at district level
   */
  public async consolidateDistrict(
    district: string,
  ): Promise<ConsolidationResult> {
    const outletsInDistrict = this.outletsPerDistrict.get(district) || [];
    if (outletsInDistrict.length === 0) {
      throw new Error(`No outlets found in district: ${district}`);
    }

    return this.consolidateLevel("district", outletsInDistrict);
  }

  /**
   * Core consolidation logic
   */
  private async consolidateLevel(
    level: "outlet" | "district" | "region" | "enterprise",
    outletIds: string[],
  ): Promise<ConsolidationResult> {
    const cacheKey = `${level}:${outletIds.join(",")}`;
    const cached = this.consolidationCache.get(cacheKey);

    // Return cached if fresh (within 5 minutes)
    if (cached && Date.now() - cached.last_updated < 5 * 60 * 1000) {
      return cached;
    }

    console.log(
      `[Consolidator] Consolidating ${level} with ${outletIds.length} outlets...`,
    );

    const period = this.getPeriodString();
    const outletsMetrics: ConsolidationResult["outlet_metrics"] = [];

    let totalRevenue = 0;
    let totalCosts = 0;

    // Fetch P&L for each outlet
    for (const outletId of outletIds) {
      try {
        const pnl = await pnlCalculatorRealtime.calculateOutletPnL(outletId);

        // Update outlet cache
        this.outletCache.set(outletId, {
          outlet_id: outletId,
          pnl,
          updated_at: Date.now(),
        });

        const revenue = pnl.revenue.total;
        const costs = pnl.costs.total;
        const marginPercent =
          revenue > 0 ? ((revenue - costs) / revenue) * 100 : 0;

        totalRevenue += revenue;
        totalCosts += costs;

        const outletName =
          this.outletsHierarchy.get(outletId)?.outlet_name || outletId;

        outletsMetrics.push({
          outlet_id: outletId,
          outlet_name: outletName,
          revenue,
          costs,
          margin_percent: marginPercent,
          variance_from_average: 0, // Will calculate below
          status: "on_track",
        });
      } catch (error) {
        console.error(
          `[Consolidator] Error fetching P&L for outlet ${outletId}:`,
          error,
        );
      }
    }

    // Calculate derived metrics
    const consolidatedMarginPercent =
      totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : 0;

    const avgMargin =
      outletsMetrics.length > 0
        ? outletsMetrics.reduce((sum, m) => sum + m.margin_percent, 0) /
          outletsMetrics.length
        : 0;

    // Calculate variance and update status
    for (const metric of outletsMetrics) {
      metric.variance_from_average = metric.margin_percent - avgMargin;

      if (metric.variance_from_average < -5) {
        metric.status = "critical";
      } else if (metric.variance_from_average < -2) {
        metric.status = "concerning";
      } else {
        metric.status = "on_track";
      }
    }

    // Variance analysis
    const varianceAnalysis = this.calculateVarianceAnalysis(outletsMetrics);

    // Exception detection
    const exceptions = this.detectExceptions(outletsMetrics);

    const result: ConsolidationResult = {
      period,
      level,
      outlet_ids: outletIds,
      consolidated_revenue: totalRevenue,
      consolidated_costs: totalCosts,
      consolidated_margin_percent: consolidatedMarginPercent,
      outlet_metrics: outletsMetrics.sort(
        (a, b) => b.margin_percent - a.margin_percent,
      ),
      variance_analysis: varianceAnalysis,
      exceptions,
      last_updated: Date.now(),
    };

    // Cache result
    this.consolidationCache.set(cacheKey, result);

    console.log(
      `[Consolidator] ✓ Consolidation complete: ${totalRevenue.toFixed(2)} revenue, ${consolidatedMarginPercent.toFixed(2)}% margin`,
    );

    return result;
  }

  /**
   * Calculate variance statistics
   */
  private calculateVarianceAnalysis(
    metrics: ConsolidationResult["outlet_metrics"],
  ): ConsolidationResult["variance_analysis"] {
    if (metrics.length === 0) {
      return {
        best_performer: "N/A",
        worst_performer: "N/A",
        std_deviation: 0,
        coefficient_of_variation: 0,
      };
    }

    const margins = metrics.map((m) => m.margin_percent);
    const mean = margins.reduce((a, b) => a + b, 0) / margins.length;

    // Standard deviation
    const variance =
      margins.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) /
      margins.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation
    const coeffVar = mean > 0 ? (stdDev / mean) * 100 : 0;

    const bestPerformer = metrics.reduce((best, current) =>
      current.margin_percent > best.margin_percent ? current : best,
    );

    const worstPerformer = metrics.reduce((worst, current) =>
      current.margin_percent < worst.margin_percent ? current : worst,
    );

    return {
      best_performer: bestPerformer.outlet_id,
      worst_performer: worstPerformer.outlet_id,
      std_deviation: stdDev,
      coefficient_of_variation: coeffVar,
    };
  }

  /**
   * Detect financial exceptions
   */
  private detectExceptions(
    metrics: ConsolidationResult["outlet_metrics"],
  ): ConsolidationException[] {
    const exceptions: ConsolidationException[] = [];

    const avgMargin =
      metrics.reduce((sum, m) => sum + m.margin_percent, 0) / metrics.length;

    for (const metric of metrics) {
      const variance = metric.margin_percent - avgMargin;
      const percentVariance = avgMargin > 0 ? (variance / avgMargin) * 100 : 0;

      // Critical: More than 5% below average
      if (variance < -5) {
        exceptions.push({
          outlet_id: metric.outlet_id,
          outlet_name: metric.outlet_name,
          type: "margin_erosion",
          severity: "critical",
          message: `Margin ${metric.margin_percent.toFixed(1)}% is critically low vs. average ${avgMargin.toFixed(1)}%`,
          metric_value: metric.margin_percent,
          threshold: avgMargin - 5,
          percentage_variance: percentVariance,
        });
      }

      // Warning: 2-5% below average
      if (variance < -2 && variance >= -5) {
        exceptions.push({
          outlet_id: metric.outlet_id,
          outlet_name: metric.outlet_name,
          type: "margin_erosion",
          severity: "warning",
          message: `Margin trending below average (${percentVariance.toFixed(1)}% variance)`,
          metric_value: metric.margin_percent,
          threshold: avgMargin - 2,
          percentage_variance: percentVariance,
        });
      }
    }

    return exceptions;
  }

  /**
   * Get all regions
   */
  public getRegions(): string[] {
    return Array.from(this.outletsPerRegion.keys());
  }

  /**
   * Get all districts
   */
  public getDistricts(): string[] {
    return Array.from(this.outletsPerDistrict.keys());
  }

  /**
   * Get outlets in region
   */
  public getOutletsInRegion(region: string): OutletHierarchy[] {
    const ids = this.outletsPerRegion.get(region) || [];
    return ids
      .map((id) => this.outletsHierarchy.get(id))
      .filter((h) => h !== undefined) as OutletHierarchy[];
  }

  /**
   * Get outlets in district
   */
  public getOutletsInDistrict(district: string): OutletHierarchy[] {
    const ids = this.outletsPerDistrict.get(district) || [];
    return ids
      .map((id) => this.outletsHierarchy.get(id))
      .filter((h) => h !== undefined) as OutletHierarchy[];
  }

  /**
   * Get all outlets
   */
  public getAllOutlets(): OutletHierarchy[] {
    return this.globalOutletList
      .map((id) => this.outletsHierarchy.get(id))
      .filter((h) => h !== undefined) as OutletHierarchy[];
  }

  /**
   * Clear caches
   */
  public clearCaches(): void {
    this.outletCache.clear();
    this.consolidationCache.clear();
  }

  /**
   * Get period string
   */
  private getPeriodString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
}

export const multiOutletConsolidator = new MultiOutletConsolidator();
