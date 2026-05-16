import React, { Suspense, useState, useEffect } from "react";
import { cn } from "@/lib/glass";
import { TrendingUp, Settings, Plus } from "lucide-react";

/**
 * Plate Costing Dashboard Module
 *
 * Provides comprehensive plate costing analysis with:
 * - Cost breakdown by plate/recipe
 * - Real-time inventory sync
 * - EchoAI optimization suggestions
 * - What-if scenario builder
 * - Historical trending
 */

// Lazy-load sub-components
const LazyCostAnalytics = React.lazy(() =>
  import("./components/CostAnalytics").then((m) => ({
    default: m.CostAnalytics,
  }))
);
const LazyScenarioBuilder = React.lazy(() =>
  import("./components/ScenarioBuilder").then((m) => ({
    default: m.ScenarioBuilder,
  }))
);

export interface PlateCostingState {
  selectedRecipeId: string | null;
  showScenarioBuilder: boolean;
  filterCategory?: string;
  sortBy: "cost" | "margin" | "name";
}

export default function PlateCostingDashboard() {
  const [state, setState] = useState<PlateCostingState>({
    selectedRecipeId: null,
    showScenarioBuilder: false,
    sortBy: "margin",
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-background">
      {/* Header */}
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Plate Costing Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Real-time cost analysis and margin optimization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  showScenarioBuilder: !prev.showScenarioBuilder,
                }))
              }
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                state.showScenarioBuilder
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              <Plus className="w-4 h-4" />
              What-If Scenario
            </button>

            <button
              type="button"
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Filter/Sort Controls */}
        <div className="flex flex-wrap gap-3">
          <select
            value={state.sortBy}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                sortBy: e.target.value as "cost" | "margin" | "name",
              }))
            }
            className="px-3 py-2 rounded-lg bg-secondary text-foreground text-sm"
          >
            <option value="margin">Sort by: Margin %</option>
            <option value="cost">Sort by: Cost</option>
            <option value="name">Sort by: Name</option>
          </select>
        </div>
      </header>

      {/* Main Content */}
      {state.showScenarioBuilder ? (
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              Loading scenario builder...
            </div>
          }
        >
          <LazyScenarioBuilder
            recipeId={state.selectedRecipeId}
            onClose={() =>
              setState((prev) => ({
                ...prev,
                showScenarioBuilder: false,
              }))
            }
          />
        </Suspense>
      ) : (
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              Loading cost analytics...
            </div>
          }
        >
          <LazyCostAnalytics
            sortBy={state.sortBy}
            onSelectRecipe={(recipeId) =>
              setState((prev) => ({
                ...prev,
                selectedRecipeId: recipeId,
              }))
            }
          />
        </Suspense>
      )}
    </div>
  );
}
