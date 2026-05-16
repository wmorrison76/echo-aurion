import { useMemo, useState } from "react";
import { Calculator, ChefHat, Loader2, TrendingUp } from "lucide-react";

import { PanelFrame } from "@/components/panels/PanelFrame";
import { useEchoActions } from "@/hooks/use-echo-actions";
import { useAudit } from "@/hooks/use-audit";
import { usePanelManager } from "@/hooks/use-panel-manager";
import { useToast } from "@/hooks/use-toast";

const ingredientColors = [
  "bg-[#c8a97e]/15 text-white/80",
  "bg-emerald-500/20 text-emerald-100",
  "bg-blue-500/20 text-blue-100",
  "bg-fuchsia-500/20 text-fuchsia-100",
];

export function RecipeCostingPanel() {
  const echo = useEchoActions();
  const audit = useAudit();
  const panelManager = usePanelManager();
  const { toast } = useToast();

  const [recipeId, setRecipeId] = useState("rec-scallops-001");
  const [portions, setPortions] = useState(36);
  const [menuPrice, setMenuPrice] = useState(24);
  const [targetFoodCostPct, setTargetFoodCostPct] = useState(0.28);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<NonNullable<typeof echo.costRecipe>>>>();

  const foodCostPercent = useMemo(() => {
    if (!result) return null;
    if (menuPrice <= 0) return null;
    return Number((result.costPerPortion / menuPrice).toFixed(3));
  }, [result, menuPrice]);

  const variance = useMemo(() => {
    if (foodCostPercent == null) return null;
    return Number(((foodCostPercent - targetFoodCostPct) * 100).toFixed(1));
  }, [foodCostPercent, targetFoodCostPct]);

  const handleCostRecipe = async () => {
    if (!echo.costRecipe) {
      toast({
        title: "Cost model offline",
        description: "Echo could not run costing right now. Try again soon.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const outcome = await echo.costRecipe({ recipeId, portions, targetFoodCostPct });
      setResult(outcome);
      toast({
        title: "Costing ready",
        description: `Portion cost ${outcome.currency} ${outcome.costPerPortion.toFixed(2)}.`,
      });
      await audit.log({
        action: "PANEL_ACTION",
        entity: "Recipe",
        entityId: recipeId,
        data: {
          panel: "RecipeCosting",
          portions,
          targetFoodCostPct,
          menuPrice,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Unable to cost recipe",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PanelFrame
      panelId="RecipeCosting"
      title="Recipe costing"
      subtitle="Project food cost, surface variances, and share drivers"
      areas={["ops", "kitchen"]}
      toolbar={
        <button
          type="button"
          onClick={() => panelManager.open("Forecast30", { context: { recipeId } })}
          className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 transition hover:border-slate-400 hover:bg-white dark:border-[#c8a97e]/25 dark:text-[#c8a97e]/80 dark:hover:border-[#c8a97e]/50 dark:hover:bg-[#c8a97e]-500/10"
        >
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          Forecast
        </button>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[1.1fr_1.2fr]">
        <section className="rounded-2xl border border-slate-200/70 bg-white/75 p-3 shadow-sm dark:border-[#c8a97e]/15 dark:bg-slate-900/60">
          <header className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
            <ChefHat className="h-4 w-4" aria-hidden />
            Parameters
          </header>
          <div className="mt-3 space-y-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
                Recipe ID
              </span>
              <input
                value={recipeId}
                onChange={(event) => setRecipeId(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-500 focus:outline-none dark:border-[#c8a97e]/25 dark:bg-slate-950/70 dark:text-[#c8a97e]/80"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
                  Portions
                </span>
                <input
                  type="number"
                  min={1}
                  value={portions}
                  onChange={(event) => setPortions(Number(event.target.value) || 0)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-500 focus:outline-none dark:border-[#c8a97e]/25 dark:bg-slate-950/70 dark:text-[#c8a97e]/80"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
                  Menu price ($)
                </span>
                <input
                  type="number"
                  min={1}
                  value={menuPrice}
                  onChange={(event) => setMenuPrice(Number(event.target.value) || 0)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-500 focus:outline-none dark:border-[#c8a97e]/25 dark:bg-slate-950/70 dark:text-[#c8a97e]/80"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-[#c8a97e]/80">
                Target food cost (%)
              </span>
              <input
                type="number"
                min={1}
                max={100}
                value={Math.round(targetFoodCostPct * 100)}
                onChange={(event) => setTargetFoodCostPct((Number(event.target.value) || 0) / 100)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-slate-500 focus:outline-none dark:border-[#c8a97e]/25 dark:bg-slate-950/70 dark:text-[#c8a97e]/80"
              />
            </label>
            <button
              type="button"
              onClick={handleCostRecipe}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-full border border-[#c8a97e]/60 bg-[#c8a97e]/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-white/80 transition hover:bg-[#c8a97e]/25 disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Calculator className="h-4 w-4" aria-hidden />}
              Run costing
            </button>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-[#c8a97e]/80">
              Costing pulls latest supplier quotes and yield adjustments. All submissions are audited automatically.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          {result ? (
            <div className="rounded-2xl border border-[#c8a97e]/25 bg-[#c8a97e]/08 p-3 text-sm text-white/80 shadow-lg shadow-[#c8a97e]-500/10">
              <header className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.32em]">
                <span>Cost snapshot</span>
                <span>{result.currency} {result.totalCost.toFixed(2)}</span>
              </header>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.32em] opacity-70">Portion cost</div>
                  <div className="text-lg font-semibold">{result.currency} {result.costPerPortion.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.32em] opacity-70">Variance vs target</div>
                  {foodCostPercent != null && variance != null ? (
                    <div className="text-lg font-semibold">
                      {Number((foodCostPercent * 100).toFixed(1))}%
                      <span className={variance > 0 ? "ml-2 text-amber-200" : "ml-2 text-emerald-200"}>
                        {variance > 0 ? `+${variance.toFixed(1)} pts` : `${variance.toFixed(1)} pts`}
                      </span>
                    </div>
                  ) : (
                    <div className="text-lg font-semibold opacity-80">—</div>
                  )}
                </div>
              </div>
              <div className="mt-3 grid gap-1 text-xs">
                {result.ingredientShare.map((slice, index) => (
                  <div
                    key={slice.ingredient}
                    className={`flex items-center justify-between rounded-full px-3 py-1 ${ingredientColors[index % ingredientColors.length]}`}
                  >
                    <span>{slice.ingredient}</span>
                    <span>{slice.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/70 bg-white/60 text-center text-sm text-slate-500 dark:border-[#c8a97e]/25 dark:bg-slate-900/40 dark:text-[#c8a97e]/60">
              <p className="max-w-xs">
                Provide a recipe ID and run costing to see Echo’s ingredient breakdown and food cost variance.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200/70 bg-white/75 p-3 text-xs leading-relaxed text-slate-500 shadow-sm dark:border-[#c8a97e]/15 dark:bg-slate-900/60 dark:text-[#c8a97e]/80">
            <header className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em]">
              <TrendingUp className="h-4 w-4" aria-hidden />
              Next steps
            </header>
            <ul className="list-disc space-y-1 pl-4">
              <li>Push to forecast to validate prep windows against demand.</li>
              <li>Hand off to purchasing for contract review if variance exceeds 2.5 pts.</li>
              <li>Trigger Yield Lab analysis when labor utilization dips below 40 hrs.</li>
            </ul>
          </div>
        </section>
      </div>
    </PanelFrame>
  );
}

export default RecipeCostingPanel;
