/**
 * Analytics Service for LUCCCA Framework
 * Tracks module usage, code generation, performance, and provides predictions
 */

// Lazy initialization of Supabase client
let supabase: any = null;

function getSupabaseClient() {
  if (!supabase) {
    try {
      const { createClient } = require("@supabase/supabase-js");
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!url || !key) {
        console.warn("Supabase credentials not configured");
        return null;
      }

      supabase = createClient(url, key);
    } catch (e) {
      console.warn("Supabase client not available");
      return null;
    }
  }
  return supabase;
}

export interface ModuleAnalyticsEvent {
  module_name: string;
  action: "open" | "close" | "generate" | "deploy";
  user_id?: string;
  duration_ms?: number;
  status?: "success" | "error" | "pending";
  metadata?: Record<string, unknown>;
}

export interface CodeGenerationMetrics {
  module_name: string;
  description: string;
  generated_code_lines: number;
  generation_time_ms: number;
  success: boolean;
  error_message?: string;
  model_used: string;
  tokens_used: number;
  cost_usd: number;
  user_id?: string;
}

export interface PerformanceMetric {
  module_name: string;
  metric_type: "render_time" | "load_time" | "memory" | "cpu";
  value: number;
  unit: "ms" | "kb" | "%";
  browser?: string;
  device_type?: "desktop" | "tablet" | "mobile";
}

export interface AnalyticsPredictions {
  next_most_used_module: string;
  predicted_generation_time_ms: number;
  predicted_error_rate: number;
  recommended_optimizations: string[];
  trend: "improving" | "declining" | "stable";
}

class AnalyticsService {
  /**
   * Track module usage event
   */
  async trackModuleEvent(event: ModuleAnalyticsEvent): Promise<void> {
    try {
      const client = getSupabaseClient();
      if (!client) return;

      const { error } = await client.from("module_analytics").insert([
        {
          module_name: event.module_name,
          action: event.action,
          user_id: event.user_id || "anonymous",
          duration_ms: event.duration_ms,
          status: event.status,
          metadata: event.metadata,
        },
      ]);

      if (error) {
        console.error("Error tracking module event:", error);
      }
    } catch (err) {
      console.error("Failed to track module event:", err);
    }
  }

  /**
   * Track code generation metrics
   */
  async trackCodeGeneration(metrics: CodeGenerationMetrics): Promise<void> {
    try {
      const client = getSupabaseClient();
      if (!client) return;

      const { error } = await client.from("code_generation_analytics").insert([
        {
          module_name: metrics.module_name,
          description: metrics.description,
          generated_code_lines: metrics.generated_code_lines,
          generation_time_ms: metrics.generation_time_ms,
          success: metrics.success,
          error_message: metrics.error_message,
          model_used: metrics.model_used,
          tokens_used: metrics.tokens_used,
          cost_usd: metrics.cost_usd,
          user_id: metrics.user_id || "anonymous",
        },
      ]);

      if (error) {
        console.error("Error tracking code generation:", error);
      }
    } catch (err) {
      console.error("Failed to track code generation:", err);
    }
  }

  /**
   * Track performance metrics
   */
  async trackPerformanceMetric(metric: PerformanceMetric): Promise<void> {
    try {
      const client = getSupabaseClient();
      if (!client) return;

      const { error } = await client.from("performance_metrics").insert([
        {
          module_name: metric.module_name,
          metric_type: metric.metric_type,
          value: metric.value,
          unit: metric.unit,
          browser: metric.browser,
          device_type: metric.device_type,
        },
      ]);

      if (error) {
        console.error("Error tracking performance metric:", error);
      }
    } catch (err) {
      console.error("Failed to track performance metric:", err);
    }
  }

  /**
   * Get module analytics for dashboard
   */
  async getModuleAnalytics(
    module_name: string,
    days: number = 30,
  ): Promise<ModuleAnalyticsEvent[]> {
    try {
      const client = getSupabaseClient();
      if (!client) return [];

      const { data, error } = await client
        .from("module_analytics")
        .select("*")
        .eq("module_name", module_name)
        .gte(
          "timestamp",
          new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order("timestamp", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Failed to get module analytics:", err);
      return [];
    }
  }

  /**
   * Get code generation analytics
   */
  async getCodeGenerationAnalytics(days: number = 30) {
    try {
      const client = getSupabaseClient();
      if (!client) return {};

      const { data, error } = await client
        .from("code_generation_analytics")
        .select("*")
        .gte(
          "timestamp",
          new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order("timestamp", { ascending: false });

      if (error) throw error;

      return {
        total_modules_generated: data?.length || 0,
        total_lines:
          data?.reduce((sum, d) => sum + (d.generated_code_lines || 0), 0) || 0,
        avg_generation_time:
          data?.reduce((sum, d) => sum + (d.generation_time_ms || 0), 0) /
            (data?.length || 1) || 0,
        success_rate: data
          ? (data.filter((d) => d.success).length / data.length) * 100
          : 0,
        total_cost: data?.reduce((sum, d) => sum + (d.cost_usd || 0), 0) || 0,
        most_used_model: data
          ? this.getMostFrequent(data.map((d) => d.model_used))
          : "",
      };
    } catch (err) {
      console.error("Failed to get code generation analytics:", err);
      return {};
    }
  }

  /**
   * Get performance metrics summary
   */
  async getPerformanceSummary(module_name?: string, days: number = 30) {
    try {
      const client = getSupabaseClient();
      if (!client) return {};

      let query = client
        .from("performance_metrics")
        .select("*")
        .gte(
          "timestamp",
          new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        );

      if (module_name) {
        query = query.eq("module_name", module_name);
      }

      const { data, error } = await query.order("timestamp", {
        ascending: false,
      });

      if (error) throw error;

      const groupedByType = this.groupBy(data || [], "metric_type");

      return Object.fromEntries(
        Object.entries(groupedByType).map(
          ([type, metrics]: [string, any[]]) => [
            type,
            {
              avg: metrics.reduce((s, m) => s + m.value, 0) / metrics.length,
              min: Math.min(...metrics.map((m) => m.value)),
              max: Math.max(...metrics.map((m) => m.value)),
              count: metrics.length,
            },
          ],
        ),
      );
    } catch (err) {
      console.error("Failed to get performance summary:", err);
      return {};
    }
  }

  /**
   * Get error logs from analytics
   */
  async getErrorLogs(days: number = 30, limit: number = 100) {
    try {
      const client = getSupabaseClient();
      if (!client) return [];

      const { data, error } = await client
        .from("error_logs")
        .select("*")
        .gte(
          "timestamp",
          new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        )
        .eq("resolved", false)
        .order("timestamp", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Failed to get error logs:", err);
      return [];
    }
  }

  /**
   * Generate analytics predictions using historical data
   */
  async generatePredictions(): Promise<AnalyticsPredictions> {
    try {
      // Get last 30 days of data
      const { data: summaryData } = await supabase
        .from("analytics_summary")
        .select("*")
        .gte(
          "metric_date",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order("metric_date", { ascending: true });

      // Get module usage
      const { data: moduleData } = await supabase
        .from("module_analytics")
        .select("module_name")
        .gte(
          "timestamp",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        );

      // Get code generation data
      const { data: codeGenData } = await supabase
        .from("code_generation_analytics")
        .select("generation_time_ms, success")
        .gte(
          "timestamp",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        );

      // Calculate trend
      let trend: "improving" | "declining" | "stable" = "stable";
      if (summaryData && summaryData.length >= 2) {
        const latest = summaryData[summaryData.length - 1];
        const previous = summaryData[summaryData.length - 2];

        if (
          (latest?.total_modules_used || 0) >
          (previous?.total_modules_used || 0)
        ) {
          trend = "improving";
        } else if (
          (latest?.total_modules_used || 0) <
          (previous?.total_modules_used || 0)
        ) {
          trend = "declining";
        }
      }

      // Calculate error rate
      const errorRate = codeGenData
        ? (codeGenData.filter((d) => !d.success).length / codeGenData.length) *
          100
        : 0;

      // Predict next most used module
      const moduleCounts = this.groupBy(moduleData || [], "module_name");
      const nextMostUsed =
        Object.entries(moduleCounts).sort(
          ([, a], [, b]) => (b as any).length - (a as any).length,
        )[0]?.[0] || "Unknown";

      // Predict generation time
      const avgGenTime = codeGenData
        ? codeGenData.reduce((s, d) => s + (d.generation_time_ms || 0), 0) /
          codeGenData.length
        : 0;

      const recommendations: string[] = [];
      if (errorRate > 10) {
        recommendations.push(
          "Error rate is high, consider code review process",
        );
      }
      if ((avgGenTime || 0) > 5000) {
        recommendations.push("Code generation is slow, optimize prompts");
      }
      if (trend === "declining") {
        recommendations.push(
          "Usage is declining, increase training and support",
        );
      }

      return {
        next_most_used_module: nextMostUsed,
        predicted_generation_time_ms: Math.round(avgGenTime),
        predicted_error_rate: Math.round(errorRate * 100) / 100,
        recommended_optimizations: recommendations,
        trend,
      };
    } catch (err) {
      console.error("Failed to generate predictions:", err);
      return {
        next_most_used_module: "Unknown",
        predicted_generation_time_ms: 0,
        predicted_error_rate: 0,
        recommended_optimizations: [],
        trend: "stable",
      };
    }
  }

  /**
   * Get user session analytics
   */
  async getUserSessions(user_id: string, limit: number = 50) {
    try {
      const client = getSupabaseClient();
      if (!client) return [];

      const { data, error } = await client
        .from("user_sessions")
        .select("*")
        .eq("user_id", user_id)
        .order("session_start", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Failed to get user sessions:", err);
      return [];
    }
  }

  /**
   * Get all analytics for export
   */
  async getFullAnalyticsExport(days: number = 90) {
    try {
      const client = getSupabaseClient();
      if (!client) return null;

      const moduleAnalytics = await client
        .from("module_analytics")
        .select("*")
        .gte(
          "timestamp",
          new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        );

      const codeGenAnalytics = await client
        .from("code_generation_analytics")
        .select("*")
        .gte(
          "timestamp",
          new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        );

      const perfMetrics = await client
        .from("performance_metrics")
        .select("*")
        .gte(
          "timestamp",
          new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        );

      return {
        module_analytics: moduleAnalytics.data || [],
        code_generation: codeGenAnalytics.data || [],
        performance_metrics: perfMetrics.data || [],
        export_date: new Date().toISOString(),
        period_days: days,
      };
    } catch (err) {
      console.error("Failed to export analytics:", err);
      return null;
    }
  }

  // Utility methods
  private getMostFrequent(arr: any[]): any {
    const counted = this.groupBy(arr, (x) => x);
    return Object.entries(counted).sort(
      ([, a]: any, [, b]: any) => b.length - a.length,
    )[0]?.[0];
  }

  private groupBy(
    arr: any[],
    key: string | ((x: any) => string),
  ): Record<string, any[]> {
    return arr.reduce((acc, item) => {
      const k = typeof key === "function" ? key(item) : item[key];
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    }, {});
  }
}

// Singleton instance
let instance: AnalyticsService | null = null;

export function getAnalyticsService(): AnalyticsService {
  if (!instance) {
    instance = new AnalyticsService();
  }
  return instance;
}

export default AnalyticsService;
