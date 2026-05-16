import { computeScore, defaultWeights } from "./scorecard";
import type { CandidatePlan, PlanSpec, Tools } from "./types";

export async function planCandidates(spec: PlanSpec, tools: Tools): Promise<CandidatePlan[]> {
  await tools.retrieve({ query: "LUCCCA patterns panel route registry", k: 5 }).catch(() => ({ snippets: [] }));

  const minimal: CandidatePlan = {
    id: "minimal",
    title: `Panel ${spec.route ?? ""} with route and tests`,
    steps: [
      "Create Panel component",
      "Add route and registry entry",
      "Write basic tests and telemetry",
    ],
    files: [],
    score: computeScore({ fit: 0.9, complexity: 0.9, deps: 1, perf: 0.9, a11y: 0.9, observability: 0.8, security: 0.9, bundle: 1 }, defaultWeights),
  };

  const rich: CandidatePlan = {
    id: "rich",
    title: `Panel ${spec.route ?? ""} with tabs and budgets`,
    steps: [
      "Create Panel with tabs (Recipes, Inventory, Costing)",
      "Wire route, PanelPicker, minimization",
      "Budgets + tests + telemetry",
    ],
    files: [],
    score: computeScore({ fit: 1, complexity: 0.7, deps: 1, perf: 0.85, a11y: 0.95, observability: 0.9, security: 0.9, bundle: 1 }, defaultWeights),
  };

  return [minimal, rich].sort((a, b) => b.score.total - a.score.total);
}
