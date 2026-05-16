/**
 * Metric Semantic Layer
 * Provides unified metric definitions, calculations, and reporting
 * 
 * Features:
 * - Centralized metric registry
 * - Standardized metric calculations
 * - Shared query library
 * - Report template system
 * - Consistent metric definitions across modules
 */

import { Database } from "../lib/database-client";
import { logger } from "../lib/logger";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Metric Definition Types
 */
export type MetricType = "count" | "sum" | "avg" | "min" | "max" | "percentile" | "rate" | "ratio";
export type MetricGranularity = "hour" | "day" | "week" | "month" | "quarter" | "year";

export interface MetricDefinition {
  id: string;
  orgId?: string; // If null, system-wide metric
  name: string;
  displayName: string;
  description?: string;
  category: string; // e.g., "revenue", "labor", "inventory", "guest_experience"
  type: MetricType;
  granularity: MetricGranularity[];
  formula?: string; // SQL or calculation formula
  sqlQuery?: string; // SQL query for the metric
  unit?: string; // e.g., "USD", "hours", "count", "%"
  format?: "number" | "currency" | "percentage" | "duration";
  dimensions?: string[]; // e.g., ["outlet_id", "department", "employee_id"]
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MetricValue {
  metricId: string;
  orgId: string;
  timestamp: string;
  value: number;
  dimensions?: Record<string, string>; // e.g., { outlet_id: "...", department: "kitchen" }
  metadata?: Record<string, any>;
}

export interface ReportTemplate {
  id: string;
  orgId?: string;
  name: string;
  description?: string;
  category: string;
  metrics: string[]; // Metric IDs
  timeRange: {
    default: string; // e.g., "last_30_days"
    options: string[];
  };
  grouping?: string[]; // Dimensions to group by
  format: "table" | "chart" | "dashboard";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Metric Semantic Layer Service
 */
export class MetricSemanticLayer {
  private metricCache: Map<string, MetricDefinition> = new Map();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor(private db: Database) {}

  /**
   * Register a metric definition
   */
  async registerMetric(metric: Omit<MetricDefinition, "id" | "createdAt" | "updatedAt">): Promise<MetricDefinition> {
    try {
      const { data, error } = await supabase
        .from("metric_definitions")
        .insert({
          org_id: metric.orgId || null,
          name: metric.name,
          display_name: metric.displayName,
          description: metric.description || null,
          category: metric.category,
          type: metric.type,
          granularity: metric.granularity,
          formula: metric.formula || null,
          sql_query: metric.sqlQuery || null,
          unit: metric.unit || null,
          format: metric.format || "number",
          dimensions: metric.dimensions || [],
          tags: metric.tags || [],
          is_active: metric.isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const definition: MetricDefinition = {
        id: data.id,
        orgId: data.org_id || undefined,
        name: data.name,
        displayName: data.display_name,
        description: data.description || undefined,
        category: data.category,
        type: data.type,
        granularity: data.granularity,
        formula: data.formula || undefined,
        sqlQuery: data.sql_query || undefined,
        unit: data.unit || undefined,
        format: data.format || "number",
        dimensions: data.dimensions || [],
        tags: data.tags || [],
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Clear cache
      this.metricCache.delete(data.name);

      logger.info("[MetricSemantic] Metric registered", { metricId: definition.id, name: definition.name });
      return definition;
    } catch (error) {
      logger.error("[MetricSemantic] Failed to register metric", { error, metric });
      throw error;
    }
  }

  /**
   * Get metric definition by ID or name
   */
  async getMetric(identifier: string, orgId?: string): Promise<MetricDefinition | null> {
    // Check cache
    const cacheKey = `${identifier}-${orgId || "system"}`;
    const cached = this.metricCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      let query = supabase.from("metric_definitions").select("*").eq("is_active", true);

      // Try ID first
      if (identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        query = query.eq("id", identifier);
      } else {
        query = query.eq("name", identifier);
      }

      // Filter by org if provided
      if (orgId) {
        query = query.or(`org_id.eq.${orgId},org_id.is.null`);
      } else {
        query = query.is("org_id", null);
      }

      const { data, error } = await query.single();

      if (error || !data) return null;

      const definition: MetricDefinition = {
        id: data.id,
        orgId: data.org_id || undefined,
        name: data.name,
        displayName: data.display_name,
        description: data.description || undefined,
        category: data.category,
        type: data.type,
        granularity: data.granularity,
        formula: data.formula || undefined,
        sqlQuery: data.sql_query || undefined,
        unit: data.unit || undefined,
        format: data.format || "number",
        dimensions: data.dimensions || [],
        tags: data.tags || [],
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Cache definition
      this.metricCache.set(cacheKey, definition);

      return definition;
    } catch (error) {
      logger.error("[MetricSemantic] Failed to get metric", { error, identifier });
      return null;
    }
  }

  /**
   * List metrics by category
   */
  async listMetrics(category?: string, orgId?: string): Promise<MetricDefinition[]> {
    try {
      let query = supabase.from("metric_definitions").select("*").eq("is_active", true);

      if (category) {
        query = query.eq("category", category);
      }

      if (orgId) {
        query = query.or(`org_id.eq.${orgId},org_id.is.null`);
      } else {
        query = query.is("org_id", null);
      }

      const { data, error } = await query.order("category", { ascending: true }).order("name", { ascending: true });

      if (error) throw error;

      return (data || []).map((d) => ({
        id: d.id,
        orgId: d.org_id || undefined,
        name: d.name,
        displayName: d.display_name,
        description: d.description || undefined,
        category: d.category,
        type: d.type,
        granularity: d.granularity,
        formula: d.formula || undefined,
        sqlQuery: d.sql_query || undefined,
        unit: d.unit || undefined,
        format: d.format || "number",
        dimensions: d.dimensions || [],
        tags: d.tags || [],
        isActive: d.is_active,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    } catch (error) {
      logger.error("[MetricSemantic] Failed to list metrics", { error, category, orgId });
      return [];
    }
  }

  /**
   * Calculate metric value
   */
  async calculateMetric(
    metricId: string,
    orgId: string,
    timeRange: { start: string; end: string },
    dimensions?: Record<string, string>,
  ): Promise<number | null> {
    const metric = await this.getMetric(metricId, orgId);
    if (!metric) {
      logger.warn("[MetricSemantic] Metric not found", { metricId });
      return null;
    }

    try {
      // If SQL query provided, execute it
      if (metric.sqlQuery) {
        const result = await this.executeMetricQuery(metric, orgId, timeRange, dimensions);
        return result;
      }

      // If formula provided, evaluate it
      if (metric.formula) {
        const result = await this.evaluateMetricFormula(metric, orgId, timeRange, dimensions);
        return result;
      }

      // Try to get from metric_values table
      const result = await this.getMetricValue(metricId, orgId, timeRange, dimensions);
      return result;

    } catch (error) {
      logger.error("[MetricSemantic] Failed to calculate metric", { error, metricId, orgId });
      return null;
    }
  }

  /**
   * Execute SQL query for metric
   */
  private async executeMetricQuery(
    metric: MetricDefinition,
    orgId: string,
    timeRange: { start: string; end: string },
    dimensions?: Record<string, string>,
  ): Promise<number> {
    // Replace placeholders in SQL query
    let query = metric.sqlQuery!;
    query = query.replace(/\{org_id\}/g, `'${orgId}'`);
    query = query.replace(/\{start_date\}/g, `'${timeRange.start}'`);
    query = query.replace(/\{end_date\}/g, `'${timeRange.end}'`);

    // Add dimension filters
    if (dimensions) {
      for (const [key, value] of Object.entries(dimensions)) {
        query = query.replace(new RegExp(`\\{${key}\\}`, "g"), `'${value}'`);
      }
    }

    // Execute query (assuming database client supports raw queries)
    // In production, use parameterized queries for security
    const result = await this.db.query(query);

    if (result.rows.length === 0) return 0;

    const row = result.rows[0];
    return parseFloat(row.value || row.count || row.sum || row.avg || row.total || 0);
  }

  /**
   * Evaluate metric formula
   */
  private async evaluateMetricFormula(
    metric: MetricDefinition,
    orgId: string,
    timeRange: { start: string; end: string },
    dimensions?: Record<string, string>,
  ): Promise<number> {
    // Simple formula evaluation (in production, use a proper expression parser)
    // This is a simplified version - support basic operations
    const formula = metric.formula!;

    // Replace metric references with actual values
    // Example: "metric.revenue_total - metric.revenue_refunds"
    const metricRefRegex = /metric\.([\w_]+)/g;
    let evaluatedFormula = formula;
    let match;

    while ((match = metricRefRegex.exec(formula)) !== null) {
      const referencedMetricId = match[1];
      const referencedMetric = await this.getMetric(referencedMetricId, orgId);
      if (referencedMetric) {
        const value = await this.calculateMetric(referencedMetricId, orgId, timeRange, dimensions);
        evaluatedFormula = evaluatedFormula.replace(match[0], String(value || 0));
      }
    }

    // Evaluate formula (basic safety check)
    // In production, use a safe expression evaluator
    try {
      // eslint-disable-next-line no-eval
      return eval(evaluatedFormula);
    } catch (error) {
      logger.error("[MetricSemantic] Formula evaluation failed", { error, formula: evaluatedFormula });
      return 0;
    }
  }

  /**
   * Get metric value from storage
   */
  private async getMetricValue(
    metricId: string,
    orgId: string,
    timeRange: { start: string; end: string },
    dimensions?: Record<string, string>,
  ): Promise<number | null> {
    try {
      let query = supabase
        .from("metric_values")
        .select("value")
        .eq("metric_id", metricId)
        .eq("org_id", orgId)
        .gte("timestamp", timeRange.start)
        .lte("timestamp", timeRange.end)
        .order("timestamp", { ascending: false })
        .limit(1);

      // Add dimension filters
      if (dimensions) {
        for (const [key, value] of Object.entries(dimensions)) {
          query = query.eq(`dimensions->>${key}`, value);
        }
      }

      const { data, error } = await query.single();

      if (error || !data) return null;

      return parseFloat(data.value || 0);
    } catch (error) {
      logger.error("[MetricSemantic] Failed to get metric value", { error, metricId, orgId });
      return null;
    }
  }

  /**
   * Store metric value
   */
  async storeMetricValue(value: MetricValue): Promise<void> {
    try {
      await supabase.from("metric_values").insert({
        metric_id: value.metricId,
        org_id: value.orgId,
        timestamp: value.timestamp,
        value: value.value,
        dimensions: value.dimensions || null,
        metadata: value.metadata || null,
      });
    } catch (error) {
      logger.error("[MetricSemantic] Failed to store metric value", { error, value });
      throw error;
    }
  }

  /**
   * Create report template
   */
  async createReportTemplate(
    template: Omit<ReportTemplate, "id" | "createdAt" | "updatedAt">,
  ): Promise<ReportTemplate> {
    try {
      const { data, error } = await supabase
        .from("report_templates")
        .insert({
          org_id: template.orgId || null,
          name: template.name,
          description: template.description || null,
          category: template.category,
          metrics: template.metrics,
          time_range: template.timeRange,
          grouping: template.grouping || null,
          format: template.format,
          is_active: template.isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        orgId: data.org_id || undefined,
        name: data.name,
        description: data.description || undefined,
        category: data.category,
        metrics: data.metrics,
        timeRange: data.time_range,
        grouping: data.grouping || undefined,
        format: data.format,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      logger.error("[MetricSemantic] Failed to create report template", { error, template });
      throw error;
    }
  }

  /**
   * Generate report from template
   */
  async generateReport(
    templateId: string,
    orgId: string,
    timeRange?: { start: string; end: string },
    dimensions?: Record<string, string>,
  ): Promise<any> {
    // Get template
    const { data: template, error } = await supabase
      .from("report_templates")
      .select("*")
      .eq("id", templateId)
      .eq("is_active", true)
      .single();

    if (error || !template) {
      throw new Error("Report template not found");
    }

    // Use default time range if not provided
    const reportTimeRange = timeRange || this.getDefaultTimeRange(template.time_range.default);

    // Calculate all metrics in template
    const metricValues: Record<string, number> = {};
    for (const metricId of template.metrics) {
      const value = await this.calculateMetric(metricId, orgId, reportTimeRange, dimensions);
      metricValues[metricId] = value || 0;
    }

    // Group by dimensions if specified
    const groupedData = template.grouping
      ? await this.groupMetricValues(template.metrics, orgId, reportTimeRange, template.grouping)
      : null;

    return {
      templateId,
      templateName: template.name,
      timeRange: reportTimeRange,
      metrics: metricValues,
      groupedData,
      format: template.format,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get default time range
   */
  private getDefaultTimeRange(defaultRange: string): { start: string; end: string } {
    const now = new Date();
    const end = now.toISOString();

    let start: Date;
    switch (defaultRange) {
      case "last_7_days":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "last_30_days":
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "last_90_days":
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "last_month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case "last_quarter":
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3 - 3, 1);
        break;
      case "last_year":
        start = new Date(now.getFullYear() - 1, 0, 1);
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return {
      start: start.toISOString(),
      end,
    };
  }

  /**
   * Group metric values by dimensions
   */
  private async groupMetricValues(
    metricIds: string[],
    orgId: string,
    timeRange: { start: string; end: string },
    grouping: string[],
  ): Promise<Record<string, Record<string, number>>> {
    // This would query metric_values and group by the specified dimensions
    // Simplified implementation - in production, build proper SQL GROUP BY query
    return {};
  }
}

// Export singleton instance
export const metricSemanticLayer = new MetricSemanticLayer(null as any); // Will be initialized with actual DB
