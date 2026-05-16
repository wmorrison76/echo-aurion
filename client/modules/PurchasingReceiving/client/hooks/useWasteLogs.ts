/** * useWasteLogs - React hooks for waste tracking * Provides waste log fetching, creation, and analytics */ import {
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  WasteLog,
  WasteDailySummary,
  WasteMonthlyMetrics,
  WasteCategory,
} from "@shared/types/waste";
import * as wasteAPI from "@shared/api/waste-logs";
interface UseWasteLogsOptions {
  organizationId: string;
  outletId?: string;
  wasteCategory?: WasteCategory;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
export function useWasteLogs(options: UseWasteLogsOptions) {
  const [logs, setLogs] = useState<WasteLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await wasteAPI.getWasteLogs(options.organizationId, {
        outletId: options.outletId,
        wasteCategory: options.wasteCategory,
        limit: 100,
      });
      setLogs(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch waste logs"),
      );
    } finally {
      setLoading(false);
    }
  }, [options.organizationId, options.outletId, options.wasteCategory]);
  useEffect(() => {
    fetchLogs();
    if (options.autoRefresh) {
      const interval = setInterval(
        fetchLogs,
        (options.refreshInterval || 300) * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchLogs, options.autoRefresh, options.refreshInterval]);
  const createLog = useCallback(
    async (log: Omit<WasteLog, "id" | "created_at" | "logged_at">) => {
      try {
        const newLog = await wasteAPI.createWasteLog(log);
        setLogs([newLog, ...logs]);
        return newLog;
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("Failed to create waste log");
      }
    },
    [logs],
  );
  const updateLog = useCallback(
    async (logId: string, updates: Partial<WasteLog>) => {
      try {
        const updated = await wasteAPI.updateWasteLog(logId, updates);
        setLogs(logs.map((l) => (l.id === logId ? updated : l)));
        return updated;
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("Failed to update waste log");
      }
    },
    [logs],
  );
  const deleteLog = useCallback(
    async (logId: string) => {
      try {
        await wasteAPI.deleteWasteLog(logId);
        setLogs(logs.filter((l) => l.id !== logId));
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("Failed to delete waste log");
      }
    },
    [logs],
  );
  const summary = {
    total: logs.length,
    totalCost: logs.reduce((sum, l) => sum + (l.total_waste_cost || 0), 0),
    byCategory: logs.reduce(
      (acc, l) => {
        acc[l.waste_category] = (acc[l.waste_category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  };
  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
    createLog,
    updateLog,
    deleteLog,
    summary,
  };
}
interface UseWasteDailySummaryOptions {
  organizationId: string;
  outletId?: string;
  startDate?: string;
  endDate?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
export function useWasteDailySummary(options: UseWasteDailySummaryOptions) {
  const [summaries, setSummaries] = useState<WasteDailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchSummaries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await wasteAPI.getWasteDailySummary(options.organizationId, {
        outletId: options.outletId,
        startDate: options.startDate,
        endDate: options.endDate,
      });
      setSummaries(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch daily summary"),
      );
    } finally {
      setLoading(false);
    }
  }, [
    options.organizationId,
    options.outletId,
    options.startDate,
    options.endDate,
  ]);
  useEffect(() => {
    fetchSummaries();
    if (options.autoRefresh) {
      const interval = setInterval(
        fetchSummaries,
        (options.refreshInterval || 3600) * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchSummaries, options.autoRefresh, options.refreshInterval]);
  const avgDailyCost =
    summaries.length > 0
      ? summaries.reduce((sum, s) => sum + (s.net_waste_cost || 0), 0) /
        summaries.length
      : 0;
  return { summaries, loading, error, refetch: fetchSummaries, avgDailyCost };
}
interface UseWasteMonthlyMetricsOptions {
  organizationId: string;
  outletId?: string;
  months?: number;
}
export function useWasteMonthlyMetrics(options: UseWasteMonthlyMetricsOptions) {
  const [metrics, setMetrics] = useState<WasteMonthlyMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await wasteAPI.getWasteMonthlyMetrics(
          options.organizationId,
          { outletId: options.outletId },
        );
        setMetrics(data.slice(0, options.months || 12));
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch monthly metrics"),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [options.organizationId, options.outletId, options.months]);
  const trend =
    metrics.length >= 2
      ? metrics[0].net_waste_cost > metrics[1].net_waste_cost
        ? "worsening"
        : "improving"
      : "stable";
  return { metrics, loading, error, trend };
}
interface UseWasteCategoryBreakdownOptions {
  organizationId: string;
  outletId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
export function useWasteCategoryBreakdown(
  options: UseWasteCategoryBreakdownOptions,
) {
  const [breakdown, setBreakdown] = useState<Record<WasteCategory, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchBreakdown = useCallback(async () => {
    try {
      setLoading(true);
      const data = await wasteAPI.getWasteCategoryBreakdown(
        options.organizationId,
        { outletId: options.outletId },
      );
      setBreakdown(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch category breakdown"),
      );
    } finally {
      setLoading(false);
    }
  }, [options.organizationId, options.outletId]);
  useEffect(() => {
    fetchBreakdown();
    if (options.autoRefresh) {
      const interval = setInterval(
        fetchBreakdown,
        (options.refreshInterval || 300) * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchBreakdown, options.autoRefresh, options.refreshInterval]);
  return { breakdown, loading, error, refetch: fetchBreakdown };
}
interface UseWasteMetricsOptions {
  organizationId: string;
  outletId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
export function useWasteMetrics(options: UseWasteMetricsOptions) {
  const [metrics, setMetrics] = useState<{
    total_waste_cost: number;
    avg_daily_waste: number;
    waste_percentage: number;
    spoilage_percentage: number;
    trend: "improving" | "stable" | "worsening";
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await wasteAPI.getWasteMetrics(
        options.organizationId,
        options.outletId,
      );
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch waste metrics"),
      );
    } finally {
      setLoading(false);
    }
  }, [options.organizationId, options.outletId]);
  useEffect(() => {
    fetchMetrics();
    if (options.autoRefresh) {
      const interval = setInterval(
        fetchMetrics,
        (options.refreshInterval || 300) * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchMetrics, options.autoRefresh, options.refreshInterval]);
  return { metrics, loading, error, refetch: fetchMetrics };
}
interface UseTopWastedProductsOptions {
  organizationId: string;
  outletId?: string;
  limit?: number;
}
export function useTopWastedProducts(options: UseTopWastedProductsOptions) {
  const [products, setProducts] = useState<
    {
      product_id: string;
      product_name: string;
      total_waste_cost: number;
      waste_count: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await wasteAPI.getTopWastedProducts(
          options.organizationId,
          { outletId: options.outletId, limit: options.limit || 10 },
        );
        setProducts(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch top wasted products"),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [options.organizationId, options.outletId, options.limit]);
  return { products, loading, error };
}
