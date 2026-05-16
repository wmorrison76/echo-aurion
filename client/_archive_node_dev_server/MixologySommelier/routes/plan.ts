import type { RequestHandler } from "express";
type Weights = {
  fit: number;
  complexity: number;
  deps: number;
  perf: number;
  a11y: number;
  observability: number;
  security: number;
  bundle: number;
};
const weights: Weights = {
  fit: 30,
  complexity: 15,
  deps: 10,
  perf: 15,
  a11y: 10,
  observability: 10,
  security: 10,
  bundle: 10,
};
function score(signals: Partial<Weights>): {
  total: number;
  breakdown: Record<string, number>;
} {
  let total = 0;
  const breakdown: Record<string, number> = {};
  (Object.keys(weights) as (keyof Weights)[]).forEach((k) => {
    const s = Math.max(0, Math.min(1, signals[k] ?? 0));
    const w = weights[k];
    const pts = s * w;
    breakdown[k as string] = pts;
    total += pts;
  });
  return { total, breakdown };
}
export const handlePlan: RequestHandler = async (req, res) => {
  const { prompt = "", route = "/generated" } = req.body ?? {};
  const base = prompt.toString();
  const minimal = {
    id: "minimal",
    title: `Minimal ${route} with route + tests`,
    steps: [
      "Create component",
      "Add route + registry",
      "Write tests + telemetry",
    ],
    files: [],
    score: score({
      fit: 0.9,
      complexity: 0.95,
      deps: 1,
      perf: 0.9,
      a11y: 0.9,
      observability: 0.8,
      security: 0.9,
      bundle: 1,
    }),
  };
  const rich = {
    id: "rich",
    title: `Rich ${route} panel with tabs + budgets`,
    steps: [
      "Panel with tabs",
      "Wire PanelPicker + minimize",
      "Budgets + tests + telemetry",
    ],
    files: [],
    score: score({
      fit: 1,
      complexity: 0.7,
      deps: 1,
      perf: 0.85,
      a11y: 0.95,
      observability: 0.9,
      security: 0.9,
      bundle: 1,
    }),
  };
  res.json({
    ok: true,
    prompt: base,
    candidates: [rich, minimal].sort((a, b) => b.score.total - a.score.total),
  });
};
