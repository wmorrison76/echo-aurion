import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import type {
  MenuPerformance,
  MenuPerformanceQuery,
  POSSalesData,
  MenuPerformancePrediction,
  SimilarMenuAnalysis,
} from "@/client/types/menu";

export function useMenuPerformance() {
  const { toast } = useToast();
  const { user } = useSupabaseAuth();
  const [performance, setPerformance] = useState<MenuPerformance | null>(null);
  const [predictions, setPredictions] = useState<MenuPerformancePrediction | null>(null);
  const [similarMenus, setSimilarMenus] = useState<SimilarMenuAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch menu performance
  const fetchPerformance = useCallback(
    async (query: MenuPerformanceQuery) => {
      if (!user?.id) return;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          menuId: query.menuId,
          dateFrom: query.dateFrom.toISOString(),
          dateTo: query.dateTo.toISOString(),
          ...(query.groupBy && { groupBy: query.groupBy }),
        });

        const response = await fetch(`/api/menu-performance?${params.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) throw new Error("Failed to fetch menu performance");

        const data = await response.json();
        if (data.success && data.data) {
          setPerformance(data.data);
        } else {
          throw new Error(data.error || "Failed to fetch menu performance");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [user?.id, toast]
  );

  // Sync POS sales data
  const syncPOSSalesData = useCallback(
    async (menuId: string, salesData: POSSalesData[]) => {
      if (!user?.id) {
        setError("User not authenticated");
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/menu-performance/sync-pos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            menuId,
            userId: user.id,
            salesData,
          }),
        });

        if (!response.ok) throw new Error("Failed to sync POS data");

        const data = await response.json();
        if (data.success) {
          toast({
            title: "Success",
            description: "POS data synced successfully",
          });
          return true;
        } else {
          throw new Error(data.error || "Failed to sync POS data");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, toast]
  );

  // Predict menu performance
  const predictPerformance = useCallback(
    async (menuId: string, includeRisks: boolean = true) => {
      if (!user?.id) {
        setError("User not authenticated");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/menu-performance/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            menuId,
            userId: user.id,
            includeRisks,
          }),
        });

        if (!response.ok) throw new Error("Failed to predict menu performance");

        const data = await response.json();
        if (data.success && data.data) {
          setPredictions(data.data);
          return data.data;
        } else {
          throw new Error(data.error || "Failed to predict menu performance");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, toast]
  );

  // Find similar menus
  const findSimilarMenus = useCallback(
    async (menuId: string, comparePerformance: boolean = true) => {
      if (!user?.id) {
        setError("User not authenticated");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/menu-performance/similar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            menuId,
            userId: user.id,
            comparePerformance,
          }),
        });

        if (!response.ok) throw new Error("Failed to find similar menus");

        const data = await response.json();
        if (data.success && data.data) {
          setSimilarMenus(data.data);
          return data.data;
        } else {
          throw new Error(data.error || "Failed to find similar menus");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, toast]
  );

  // Get item performance
  const getItemPerformance = useCallback((itemId: string) => {
    if (!performance) return null;

    return performance.itemPerformance[itemId] || null;
  }, [performance]);

  // Get category performance
  const getCategoryPerformance = useCallback((categoryId: string) => {
    if (!performance) return null;

    return performance.categoryPerformance[categoryId] || null;
  }, [performance]);

  // Calculate ROI for menu item
  const calculateItemROI = useCallback(
    (itemId: string, cost: number) => {
      const itemPerf = getItemPerformance(itemId);
      if (!itemPerf) return 0;

      const revenue = itemPerf.revenue;
      const roi = ((revenue - cost) / cost) * 100;
      return Math.round(roi * 100) / 100;
    },
    [getItemPerformance]
  );

  // Get top performing items
  const getTopPerformingItems = useCallback(
    (limit: number = 10) => {
      if (!performance) return [];

      return Object.entries(performance.itemPerformance)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, limit)
        .map(([itemId, perf]) => ({
          itemId,
          ...perf,
        }));
    },
    [performance]
  );

  // Get low performing items
  const getLowPerformingItems = useCallback(
    (limit: number = 10) => {
      if (!performance) return [];

      return Object.entries(performance.itemPerformance)
        .filter(([, perf]) => perf.sold < 5)
        .sort(([, a], [, b]) => a.revenue - b.revenue)
        .slice(0, limit)
        .map(([itemId, perf]) => ({
          itemId,
          ...perf,
        }));
    },
    [performance]
  );

  return {
    performance,
    predictions,
    similarMenus,
    loading,
    error,
    fetchPerformance,
    syncPOSSalesData,
    predictPerformance,
    findSimilarMenus,
    getItemPerformance,
    getCategoryPerformance,
    calculateItemROI,
    getTopPerformingItems,
    getLowPerformingItems,
  };
}
