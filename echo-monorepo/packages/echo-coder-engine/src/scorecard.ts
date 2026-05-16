import type { Score, ScoreWeights } from "./types";

export const defaultWeights: ScoreWeights = {
  fit: 30,
  complexity: 15,
  deps: 10,
  perf: 15,
  a11y: 10,
  observability: 10,
  security: 10,
  bundle: 10,
};

export function computeScore(signals: Partial<Record<keyof ScoreWeights, number>>, weights: ScoreWeights = defaultWeights): Score {
  const breakdown: Record<string, number> = {};
  let total = 0;
  for (const key of Object.keys(weights) as (keyof ScoreWeights)[]) {
    const s = Math.max(0, Math.min(1, signals[key] ?? 0));
    const w = weights[key];
    const pts = s * w;
    breakdown[key] = pts;
    total += pts;
  }
  return { total, breakdown } as Score;
}
