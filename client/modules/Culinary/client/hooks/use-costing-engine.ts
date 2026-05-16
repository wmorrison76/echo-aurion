import { useState, useCallback, useMemo } from "react";
import {
  calculateCostPerPortion,
  calculateGrossProfit,
  calculateProfitMargin,
  calculateFoodCostPercent,
  calculateVariance,
  getProfitabilityMetrics,
  generateDailyReport,
  generateTrendData,
  identifyRiskRecipes,
  calculateSavingsOpportunity,
  type CostEntry,
  type RecipeCostSnapshot,
  type CostVariance,
  type ProfitabilityMetrics,
  type DailyFoodCostReport,
  type CostTrendData,
} from "@/lib/costing-engine";

interface UseCostingEngineReturn {
  // State
  entries: CostEntry[];
  snapshots: Map<string, RecipeCostSnapshot>;
  selectedRecipeId: string | null;

  // Actions
  addCostEntry: (entry: Omit<CostEntry, "id" | "timestamp">) => void;
  removeCostEntry: (entryId: string) => void;
  updateSnapshot: (recipeId: string, snapshot: RecipeCostSnapshot) => void;
  selectRecipe: (recipeId: string | null) => void;

  // Computed
  selectedSnapshot: RecipeCostSnapshot | undefined;
  selectedVariance: CostVariance | undefined;
  allMetrics: ProfitabilityMetrics[];
  riskRecipes: ProfitabilityMetrics[];
  dailyReport: DailyFoodCostReport | undefined;
  trendData: CostTrendData | undefined;
  potentialSavings: number;

  // Utilities
  getRecipeMetrics: (recipeId: string) => ProfitabilityMetrics | undefined;
  getDailyReportForDate: (date: string) => DailyFoodCostReport | undefined;
}

const STORAGE_KEY = "costing:entries";
const SNAPSHOTS_KEY = "costing:snapshots";

export function useCostingEngine(): UseCostingEngineReturn {
  const [entries, setEntries] = useState<CostEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [snapshots, setSnapshots] = useState<Map<string, RecipeCostSnapshot>>(() => {
    try {
      const raw = localStorage.getItem(SNAPSHOTS_KEY);
      if (!raw) return new Map();
      const data = JSON.parse(raw) as Array<[string, RecipeCostSnapshot]>;
      return new Map(data);
    } catch {
      return new Map();
    }
  });

  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  // Persist entries
  const addCostEntry = useCallback(
    (entry: Omit<CostEntry, "id" | "timestamp">) => {
      const newEntry: CostEntry = {
        ...entry,
        id: `cost-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
      };

      const updated = [newEntry, ...entries];
      setEntries(updated);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        console.warn("Failed to persist cost entry");
      }
    },
    [entries],
  );

  const removeCostEntry = useCallback((entryId: string) => {
    setEntries((prev) => {
      const updated = prev.filter((e) => e.id !== entryId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        console.warn("Failed to persist after entry removal");
      }
      return updated;
    });
  }, []);

  const updateSnapshot = useCallback(
    (recipeId: string, snapshot: RecipeCostSnapshot) => {
      setSnapshots((prev) => {
        const updated = new Map(prev);
        updated.set(recipeId, snapshot);
        try {
          localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(Array.from(updated.entries())));
        } catch {
          console.warn("Failed to persist snapshot");
        }
        return updated;
      });
    },
    [],
  );

  const selectRecipe = useCallback((recipeId: string | null) => {
    setSelectedRecipeId(recipeId);
  }, []);

  // Computed values
  const selectedSnapshot = useMemo(() => {
    return selectedRecipeId ? snapshots.get(selectedRecipeId) : undefined;
  }, [selectedRecipeId, snapshots]);

  const selectedVariance = useMemo(() => {
    if (!selectedSnapshot || selectedSnapshot.history.length < 2) return undefined;

    const current = selectedSnapshot.history[0];
    const previous = selectedSnapshot.history[1];

    if (!current || !previous) return undefined;

    return {
      recipeId: selectedSnapshot.recipeId,
      recipeName: selectedSnapshot.recipeName,
      ...calculateVariance(current.costPerPortion, previous.costPerPortion),
    };
  }, [selectedSnapshot]);

  const allMetrics = useMemo(() => {
    return Array.from(snapshots.values()).map((snapshot) => {
      const latestEntry = snapshot.history[0];
      if (!latestEntry) {
        return getProfitabilityMetrics(
          snapshot.recipeId,
          snapshot.recipeName,
          snapshot.baselineCost,
          snapshot.baselineCost,
          snapshot.baselinePrice,
          1,
        );
      }

      return getProfitabilityMetrics(
        snapshot.recipeId,
        snapshot.recipeName,
        latestEntry.totalRecipeCost,
        latestEntry.costPerPortion,
        latestEntry.sellingPrice,
        latestEntry.portionCount,
      );
    });
  }, [snapshots]);

  const riskRecipes = useMemo(() => identifyRiskRecipes(allMetrics), [allMetrics]);

  const dailyReport = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayEntries = entries.filter((e) => {
      const entryDate = new Date(e.timestamp).toISOString().split("T")[0];
      return entryDate === today;
    });

    if (todayEntries.length === 0) return undefined;

    return generateDailyReport(todayEntries, today);
  }, [entries]);

  const trendData = useMemo(() => {
    // Group entries by date
    const reportsByDate = new Map<string, DailyFoodCostReport>();

    entries.forEach((entry) => {
      const date = new Date(entry.timestamp).toISOString().split("T")[0];

      if (!reportsByDate.has(date)) {
        reportsByDate.set(date, generateDailyReport([], date));
      }

      const report = reportsByDate.get(date)!;
      report.totalCosts += entry.totalRecipeCost;
      report.totalRevenue += entry.sellingPrice * entry.portionCount;
    });

    const reports = Array.from(reportsByDate.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    if (reports.length === 0) return undefined;

    return generateTrendData(reports, "daily");
  }, [entries]);

  const potentialSavings = useMemo(() => {
    if (!dailyReport) return 0;
    return calculateSavingsOpportunity(dailyReport.foodCostPercent, 30, dailyReport.totalRevenue);
  }, [dailyReport]);

  const getRecipeMetrics = useCallback(
    (recipeId: string): ProfitabilityMetrics | undefined => {
      return allMetrics.find((m) => m.recipeId === recipeId);
    },
    [allMetrics],
  );

  const getDailyReportForDate = useCallback(
    (date: string): DailyFoodCostReport | undefined => {
      const dateEntries = entries.filter((e) => {
        const entryDate = new Date(e.timestamp).toISOString().split("T")[0];
        return entryDate === date;
      });

      if (dateEntries.length === 0) return undefined;

      return generateDailyReport(dateEntries, date);
    },
    [entries],
  );

  return {
    entries,
    snapshots,
    selectedRecipeId,
    addCostEntry,
    removeCostEntry,
    updateSnapshot,
    selectRecipe,
    selectedSnapshot,
    selectedVariance,
    allMetrics,
    riskRecipes,
    dailyReport,
    trendData,
    potentialSavings,
    getRecipeMetrics,
    getDailyReportForDate,
  };
}
