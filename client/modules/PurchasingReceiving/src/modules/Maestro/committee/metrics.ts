import type {
  CommitteeConfig,
  CommitteeMetrics,
  CommitteeProposal,
  CommitteeScore,
  ConstraintEvaluator,
  HardConstraintResult,
  Normalizer,
} from "./types";
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export const defaultNormalizers: Record<
  keyof CommitteeMetrics,
  Normalizer<number>
> = {
  totalSpend: (value) => value / 1000,
  projectedWaste: (value) => value / 500,
  stockoutRisk: (value) => value,
  shelfLifeViolations: (value) => (value > 0 ? 1 : 0),
  qcFailureRisk: (value) => value,
  laborOvertimeHours: (value) => value / 8,
};
export const DEFAULT_CONSTRAINT_EVALUATORS: ConstraintEvaluator[] = [
  (proposal, metrics, _config) => ({
    code: "shelf-life",
    violated: metrics.shelfLifeViolations > 0,
    detail:
      metrics.shelfLifeViolations > 0
        ? "Shelf-life violations present"
        : undefined,
  }),
  (proposal, metrics, config) => ({
    code: "under-order",
    violated: metrics.stockoutRisk > config.underOrderThreshold,
    detail:
      metrics.stockoutRisk > config.underOrderThreshold
        ? `Stockout risk ${(metrics.stockoutRisk * 100).toFixed(2)}%`
        : undefined,
  }),
  (proposal, metrics, _config) => ({
    code: "qc-failure",
    violated: metrics.qcFailureRisk > 0.01,
    detail:
      metrics.qcFailureRisk > 0.01
        ? "QC failure risk above tolerance"
        : undefined,
  }),
];
function normalizeMetric(
  key: keyof CommitteeMetrics,
  value: number,
  config: CommitteeConfig,
): number {
  const normalizer = config.normalizers?.[key] ?? defaultNormalizers[key];
  const normalized = normalizer ? normalizer(value) : value;
  return clamp01(normalized);
}
export function scoreMetrics(
  metrics: CommitteeMetrics,
  config: CommitteeConfig,
): CommitteeScore {
  const normalized: Partial<Record<keyof CommitteeMetrics, number>> = {};
  (Object.keys(metrics) as Array<keyof CommitteeMetrics>).forEach((key) => {
    normalized[key] = normalizeMetric(key, metrics[key], config);
  });
  const score =
    config.weights.wCost * (normalized.totalSpend ?? 0) +
    config.weights.wWaste * (normalized.projectedWaste ?? 0) +
    config.weights.wStockout * (normalized.stockoutRisk ?? 0) +
    config.weights.wShelf * (normalized.shelfLifeViolations ?? 0) +
    config.weights.wQc * (normalized.qcFailureRisk ?? 0) +
    config.weights.wLabor * (normalized.laborOvertimeHours ?? 0);
  return { score, normalized };
}
export function evaluateConstraints(
  proposal: CommitteeProposal,
  metrics: CommitteeMetrics,
  config: CommitteeConfig,
  evaluators: ConstraintEvaluator[] = DEFAULT_CONSTRAINT_EVALUATORS,
): HardConstraintResult[] {
  return evaluators.map((evaluate) => evaluate(proposal, metrics, config));
}
