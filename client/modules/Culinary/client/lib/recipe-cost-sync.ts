import type { RecipeExport } from "@shared/recipes";
import type { Recipe } from "@shared/recipes";
import {
  calculateIngredientCost,
  searchPurchasingInventory,
} from "./ingredient-purchasing-sync";

type CostThresholds = {
  warnPct: number;
  criticalPct: number;
};

export type RecipeCostAlert = {
  id: string;
  recipeId: string;
  recipeName: string;
  previousCost: number;
  newCost: number;
  changePct: number;
  severity: "warning" | "critical";
  createdAt: string;
  acknowledged: boolean;
};

const ALERTS_KEY = "recipe.cost.alerts";
const THRESHOLDS_KEY = "recipe.cost.thresholds";
const HISTORY_KEY = "recipe.cost.history";

export function getCostThresholds(): CostThresholds {
  if (typeof window === "undefined") {
    return { warnPct: 3, criticalPct: 8 };
  }
  const raw = localStorage.getItem(THRESHOLDS_KEY);
  if (!raw) return { warnPct: 3, criticalPct: 8 };
  try {
    const parsed = JSON.parse(raw);
    return {
      warnPct: Number(parsed.warnPct ?? 3),
      criticalPct: Number(parsed.criticalPct ?? 8),
    };
  } catch {
    return { warnPct: 3, criticalPct: 8 };
  }
}

export function getRecipeCostAlerts(): RecipeCostAlert[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(ALERTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveRecipeCostAlerts(alerts: RecipeCostAlert[]) {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

export function acknowledgeRecipeCostAlert(alertId: string) {
  const alerts = getRecipeCostAlerts().map((alert) =>
    alert.id === alertId ? { ...alert, acknowledged: true } : alert,
  );
  saveRecipeCostAlerts(alerts);
}

function calcIngredientCost(
  item: string,
  qty: string,
  unit: string,
  yieldText?: string,
) {
  const match = searchPurchasingInventory(item, 0.5)[0];
  if (!match) return 0;
  const qtyNum = Number(qty);
  if (!Number.isFinite(qtyNum) || qtyNum <= 0) return 0;
  const yieldPct = yieldText
    ? Number(String(yieldText).replace(/%/g, ""))
    : 100;
  return calculateIngredientCost(
    match,
    qtyNum,
    unit,
    Number.isFinite(yieldPct) ? yieldPct : 100,
  );
}

function updateRecipeExportCosts(exportData: RecipeExport): RecipeExport {
  const ingredients = exportData.ingredients.map((row) => {
    const cost = calcIngredientCost(row.item, row.qty, row.unit, row.yield);
    return { ...row, cost: cost ? cost.toFixed(2) : row.cost };
  });

  const fullRecipeCost = ingredients.reduce((sum, row) => {
    const numeric = parseFloat(String(row.cost || "0").replace(/[$,\s]/g, ""));
    return sum + (Number.isFinite(numeric) ? numeric : 0);
  }, 0);
  const portionCount = exportData.portionCount || 1;
  const portionCost =
    portionCount > 0 ? fullRecipeCost / portionCount : fullRecipeCost;

  return {
    ...exportData,
    ingredients,
    portionCost,
    totals: {
      ...(exportData.totals || { fullRecipeCost: 0 }),
      fullRecipeCost,
    },
  };
}

export function syncRecipeCosts(recipes: Recipe[]) {
  const thresholds = getCostThresholds();
  const alerts = getRecipeCostAlerts();
  const historyRaw = localStorage.getItem(HISTORY_KEY);
  const history: Record<
    string,
    Array<{ at: string; cost: number }>
  > = historyRaw ? JSON.parse(historyRaw) : {};

  const updatedRecipes = recipes.map((recipe) => {
    const extra = (recipe.extra ?? {}) as Record<string, unknown>;
    const serverNotes = extra.serverNotes as RecipeExport | undefined;
    if (!serverNotes?.ingredients?.length) return recipe;

    const updatedExport = updateRecipeExportCosts(serverNotes);
    const previousCost = serverNotes.totals?.fullRecipeCost ?? 0;
    const newCost = updatedExport.totals?.fullRecipeCost ?? 0;

    if (previousCost > 0 && newCost > 0) {
      const changePct = ((newCost - previousCost) / previousCost) * 100;
      const absChange = Math.abs(changePct);
      const severity =
        absChange >= thresholds.criticalPct
          ? "critical"
          : absChange >= thresholds.warnPct
            ? "warning"
            : null;
      if (severity) {
        alerts.unshift({
          id: `${recipe.id}:${Date.now()}`,
          recipeId: recipe.id,
          recipeName: serverNotes.title || recipe.title,
          previousCost,
          newCost,
          changePct,
          severity,
          createdAt: new Date().toISOString(),
          acknowledged: false,
        });
      }
    }

    const recipeHistory = history[recipe.id] || [];
    recipeHistory.unshift({ at: new Date().toISOString(), cost: newCost });
    history[recipe.id] = recipeHistory.slice(0, 50);

    return {
      ...recipe,
      extra: {
        ...extra,
        serverNotes: updatedExport,
      },
    };
  });

  saveRecipeCostAlerts(alerts);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return updatedRecipes;
}
