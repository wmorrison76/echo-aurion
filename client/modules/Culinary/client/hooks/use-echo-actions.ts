import { useMemo } from "react";

type CostRecipeInput = {
  recipeId: string;
  portions: number;
  targetFoodCostPct?: number;
};

type CostRecipeResult = {
  totalCost: number;
  costPerPortion: number;
  ingredientShare: Array<{
    ingredient: string;
    percentage: number;
  }>;
  currency: string;
  targetFoodCostPct: number;
};

type TriagedInvoice = {
  invoiceId: string;
  owner: string;
  status: "routed" | "needs-review" | "duplicate";
  warnings?: string[];
  nextStep?: string;
};

type TriageInvoiceInput = {
  invoiceId: string;
  assignTo?: string;
  priority?: "High" | "Medium" | "Low";
  notes?: string;
};

type ForecastDemandInput = {
  windowDays: number;
  scope: string;
  basis: "baseline" | "optimistic" | "cautious";
};

type ForecastDemandResult = {
  summary: string;
  daily: Array<{
    date: string;
    demand: number;
    laborHours: number;
    commentary?: string;
  }>;
};

type WinePairingResult = {
  label: string;
  style: string;
  region: string;
  pairingNote: string;
  confidence: number;
};

type HelpSearchResult = {
  id: string;
  title: string;
  snippet: string;
  source: string;
  panelSuggestion?: string;
};

type EchoActions = {
  costRecipe?: (input: CostRecipeInput) => Promise<CostRecipeResult>;
  triageInvoice?: (input: TriageInvoiceInput) => Promise<TriagedInvoice>;
  forecastDemand?: (input: ForecastDemandInput) => Promise<ForecastDemandResult>;
  pairWine?: (dish: {
    name: string;
    dominantFlavor: string;
    occasion?: string;
  }) => Promise<WinePairingResult[]>;
  searchKnowledge?: (query: string) => Promise<HelpSearchResult[]>;
  explainCOGS?: (period: string) => Promise<string>;
  buildPrep?: (serviceDate: string, station: string) => Promise<{ items: string[] }>;
};

const pause = (delay = 320) => new Promise((resolve) => setTimeout(resolve, delay));

export function useEchoActions(): EchoActions {
  return useMemo(() => {
    return {
      async costRecipe({ recipeId, portions, targetFoodCostPct = 0.28 }) {
        await pause();
        const baseCost = recipeId.trim() ? 2.65 * portions : 0;
        const ingredientShare = [
          { ingredient: "Protein", percentage: 42 },
          { ingredient: "Produce", percentage: 31 },
          { ingredient: "Dry Goods", percentage: 18 },
          { ingredient: "Packaging", percentage: 9 },
        ];
        const costPerPortion = portions > 0 ? baseCost / portions : 0;
        return {
          totalCost: Number(baseCost.toFixed(2)),
          costPerPortion: Number(costPerPortion.toFixed(2)),
          ingredientShare,
          currency: "USD",
          targetFoodCostPct,
        };
      },
      async triageInvoice({ invoiceId, assignTo, priority, notes }) {
        await pause();
        return {
          invoiceId,
          owner: assignTo ?? "ap@echo",
          status: priority === "High" ? "needs-review" : "routed",
          warnings:
            priority === "High"
              ? ["Large variance vs last month", "Missing packing slip"]
              : undefined,
          nextStep:
            notes && notes.length > 40 ? "Escalate to CPA desk" : "Queue for GL coding",
        };
      },
      async forecastDemand({ windowDays, scope, basis }) {
        await pause();
        const today = new Date();
        const daily = Array.from({ length: windowDays }, (_, index) => {
          const date = new Date(today);
          date.setDate(today.getDate() + index);
          const demandSeed = basis === "optimistic" ? 1.12 : basis === "cautious" ? 0.9 : 1;
          const demand = Math.round(420 * demandSeed + index * 6.5);
          return {
            date: date.toISOString().slice(0, 10),
            demand,
            laborHours: Number((demand / 48).toFixed(1)),
            commentary: index === 0 ? `Anchored to ${scope} baseline` : undefined,
          };
        });
        return {
          summary: `${scope} outlook generated on ${today.toISOString().slice(0, 10)}`,
          daily,
        };
      },
      async pairWine({ name, dominantFlavor, occasion }) {
        await pause();
        const normalized = dominantFlavor.toLowerCase();
        const base: WinePairingResult[] = [
          {
            label: "Domaine Leflaive Puligny-Montrachet",
            style: "White Burgundy",
            region: "Burgundy, France",
            pairingNote: "Silky texture and hazelnut finish echo the butter notes in the dish.",
            confidence: 0.91,
          },
          {
            label: "Rías Baixas Albariño",
            style: "Albariño",
            region: "Galicia, Spain",
            pairingNote: "Bright citrus and salinity refresh rich seafood preparations.",
            confidence: 0.83,
          },
          {
            label: "Champagne Premier Cru Brut Nature",
            style: "Sparkling",
            region: "Montagne de Reims, France",
            pairingNote: "No dosage keeps the palate lifted through multiple courses.",
            confidence: 0.78,
          },
        ];
        if (normalized.includes("smoke")) {
          base.unshift({
            label: "Syrah, Côte-Rôtie 'La Barbarine'",
            style: "Northern Rhône Syrah",
            region: "Rhône, France",
            pairingNote: "Smoked meat and olive tapenade lift the char and umami in the preparation.",
            confidence: 0.88,
          });
        }
        if (occasion?.toLowerCase().includes("banquet")) {
          base.push({
            label: "Etna Rosato",
            style: "Volcanic Rosé",
            region: "Sicily, Italy",
            pairingNote: "Versatile minerality pairs well across large-format plated service.",
            confidence: 0.74,
          });
        }
        return base.slice(0, 4).map((entry) => ({ ...entry, pairingNote: `${name}: ${entry.pairingNote}` }));
      },
      async searchKnowledge(query) {
        await pause(260);
        if (!query.trim()) return [];
        const terms = query.toLowerCase();
        const results: HelpSearchResult[] = [
          {
            id: "kb-triage-flow",
            title: "Invoice triage workflow",
            snippet: "Route AP documents, validate tax buckets, and trigger Echo CPA review.",
            source: "Builder CMS",
            panelSuggestion: "InvoiceTriage",
          },
          {
            id: "kb-costing-targets",
            title: "Setting target food cost on new recipes",
            snippet: "Benchmark hero dishes at 28% food cost with smart purchasing adjustments.",
            source: "Notion",
            panelSuggestion: "RecipeCosting",
          },
          {
            id: "kb-forecast-calibration",
            title: "Calibrating 30-day demand forecasts",
            snippet: "Blend outlets, events, and reservations for forward-looking prep guidance.",
            source: "PDF Upload",
            panelSuggestion: "Forecast30",
          },
        ];
        return results.filter((result) =>
          result.title.toLowerCase().includes(terms) || result.snippet.toLowerCase().includes(terms),
        );
      },
      async explainCOGS(period: string) {
        await pause(240);
        return `COGS narrative for ${period}: Variance driven by seafood market pressure offset by smarter trim yields.`;
      },
      async buildPrep(serviceDate: string, station: string) {
        await pause(240);
        return {
          items: [
            `${station} | ${serviceDate} • 24x Lobster stock (overnight infusion)`,
            `${station} | ${serviceDate} • 18x Kombu brine (sous-vide)`,
          ],
        };
      },
    } satisfies EchoActions;
  }, []);
}
