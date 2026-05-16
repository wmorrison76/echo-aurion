export interface VarianceInput {
  entity: string;
  department: string;
  metric: string;
  actual: number;
  budget: number;
  prior: number;
}
export interface VarianceRadarPoint {
  entity: string;
  department: string;
  metric: string;
  varianceVsBudget: number;
  varianceVsPrior: number;
  status: "favorable" | "unfavorable" | "neutral";
}
export interface VarianceRadarSummary {
  points: VarianceRadarPoint[];
  topUnfavorable: VarianceRadarPoint[];
  topFavorable: VarianceRadarPoint[];
}
function determineStatus(variance: number, tolerance = 0.01) {
  if (variance > tolerance) {
    return "favorable" as const;
  }
  if (variance < -tolerance) {
    return "unfavorable" as const;
  }
  return "neutral" as const;
}
export function buildVarianceRadar(
  inputs: VarianceInput[],
): VarianceRadarSummary {
  const points = inputs.map((input) => {
    const varianceVsBudget =
      (input.actual - input.budget) / (input.budget || 1);
    const varianceVsPrior = (input.actual - input.prior) / (input.prior || 1);
    const combined = (varianceVsBudget + varianceVsPrior) / 2;
    return {
      entity: input.entity,
      department: input.department,
      metric: input.metric,
      varianceVsBudget,
      varianceVsPrior,
      status: determineStatus(combined),
    };
  });
  const topUnfavorable = points
    .filter((point) => point.status === "unfavorable")
    .sort(
      (a, b) =>
        a.varianceVsBudget +
        a.varianceVsPrior -
        (b.varianceVsBudget + b.varianceVsPrior),
    )
    .slice(0, 5);
  const topFavorable = points
    .filter((point) => point.status === "favorable")
    .sort(
      (a, b) =>
        b.varianceVsBudget +
        b.varianceVsPrior -
        (a.varianceVsBudget + a.varianceVsPrior),
    )
    .slice(0, 5);
  return { points, topUnfavorable, topFavorable };
}
