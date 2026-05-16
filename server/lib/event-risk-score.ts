/***
 * LUCCCA — BUILD 27
 * Event Risk Scoring Engine
 *
 * PURPOSE:
 *  - Give each event a 0–100 risk score
 *  - Combine operational + temporal + logistical factors
 *
 * SCORE BANDS:
 *  0–25  = Low
 *  26–60 = Medium
 *  61–100= High
 ***/

export type RiskInput = {
  headcount: number;
  complexity: "low" | "medium" | "high";
  multiSpace: boolean;
  hasEngineeringWork: boolean;
  hoursUntilEvent: number;
  vipLevel: 0 | 1 | 2;
};

export type RiskOutput = {
  score: number;
  band: "low" | "medium" | "high";
  factors: { label: string; impact: number }[];
};

export function calculateEventRisk(input: RiskInput): RiskOutput {
  const factors: { label: string; impact: number }[] = [];

  if (input.headcount > 200) {
    factors.push({ label: "Large headcount", impact: 15 });
  } else if (input.headcount > 80) {
    factors.push({ label: "Medium headcount", impact: 8 });
  }

  if (input.complexity === "high") {
    factors.push({ label: "High menu/logistics complexity", impact: 20 });
  } else if (input.complexity === "medium") {
    factors.push({ label: "Medium complexity", impact: 10 });
  }

  if (input.multiSpace) {
    factors.push({ label: "Multiple spaces", impact: 12 });
  }

  if (input.hasEngineeringWork) {
    factors.push({ label: "Engineering work nearby", impact: 10 });
  }

  if (input.hoursUntilEvent < 24) {
    factors.push({ label: "Short lead time (<24h)", impact: 25 });
  } else if (input.hoursUntilEvent < 72) {
    factors.push({ label: "Moderate lead time (<72h)", impact: 10 });
  }

  if (input.vipLevel === 2) {
    factors.push({ label: "Brand-critical / high VIP", impact: 25 });
  } else if (input.vipLevel === 1) {
    factors.push({ label: "VIP", impact: 10 });
  }

  const rawScore = factors.reduce((sum, f) => sum + f.impact, 0);
  const score = Math.max(0, Math.min(100, rawScore));

  let band: "low" | "medium" | "high" = "low";
  if (score > 60) band = "high";
  else if (score > 25) band = "medium";

  return { score, band, factors };
}
