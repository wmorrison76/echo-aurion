import { average, clamp, safeDivide, sumBy } from "./utils";
import {
  CommitteeContext,
  CommitteeMetrics,
  CommitteePolicy,
  CommitteeProposal,
  DemandPlanItem,
  HardConstraintResult,
} from "./types";
export function computeMetrics(
  proposal: CommitteeProposal,
  context: CommitteeContext,
): CommitteeMetrics {
  const demand = proposal.demand;
  const totalSpend = sumBy(proposal.purchaseOrders, (order) =>
    sumBy(order.lines, (line) => (line.unitCost ?? 0) * line.qty),
  );
  const projectedWasteQty = sumBy(demand, (item) =>
    Math.max(item.projectedWasteQty, 0),
  );
  const projectedWasteCost = sumBy(demand, (item) => item.projectedWasteCost);
  const stockoutProbability = Math.max(
    0,
    clamp(
      demand.reduce((max, item) => Math.max(max, item.adjustedRisk ?? 0), 0),
      0,
      1,
    ),
  );
  const totalShelfViolations = countShelfLifeViolations(demand, context.policy);
  const qualityRisk = clamp(
    average(proposal.quality.map((gate) => gate.riskScore)),
    0,
    1,
  );
  const overtimeHours = sumBy(
    proposal.prepTasks,
    (task) => clamp(task.overtimeRisk, 0, 1) * task.laborHours,
  );
  const score = computeScore(
    {
      totalSpend,
      projectedWasteCost,
      projectedWasteQty,
      stockoutProbability,
      shelfLifeViolations: totalShelfViolations,
      qualityRisk,
      overtimeHours,
    },
    proposal,
    context.policy,
  );
  return {
    totalSpend,
    stockoutProbability,
    projectedWasteCost,
    projectedWasteQty,
    shelfLifeViolations: totalShelfViolations,
    qualityRisk,
    overtimeHours,
    score,
  };
}
function countShelfLifeViolations(
  items: DemandPlanItem[],
  policy: CommitteePolicy,
): number {
  if (!policy.constraints.enforceShelfLife) return 0;
  const requiredBuffer = policy.constraints.minShelfLifeHours;
  let violations = 0;
  for (const item of items) {
    if (typeof item.shelfLifeHours !== "number") continue;
    if (item.shelfLifeHours < requiredBuffer) violations += 1;
  }
  return violations;
}
function computeScore(
  metrics: Omit<CommitteeMetrics, "score">,
  proposal: CommitteeProposal,
  policy: CommitteePolicy,
): number {
  const requiredSpend = estimateRequiredSpend(proposal.demand);
  const costNormalized = clamp(
    safeDivide(metrics.totalSpend, requiredSpend || metrics.totalSpend || 1, 1),
    0,
    2,
  );
  const wasteNormalized = clamp(
    safeDivide(metrics.projectedWasteCost, metrics.totalSpend || 1, 0),
    0,
    1,
  );
  const stockoutNormalized = clamp(metrics.stockoutProbability, 0, 1);
  const shelfNormalized = metrics.shelfLifeViolations > 0 ? 1 : 0;
  const qcNormalized = clamp(metrics.qualityRisk, 0, 1);
  const totalLaborHours =
    sumBy(proposal.prepTasks, (task) => task.laborHours) || 1;
  const laborNormalized = clamp(
    safeDivide(metrics.overtimeHours, totalLaborHours, 0),
    0,
    1,
  );
  return (
    policy.weights.cost * costNormalized +
    policy.weights.stockout * stockoutNormalized +
    policy.weights.waste * wasteNormalized +
    policy.weights.shelf * shelfNormalized +
    policy.weights.qc * qcNormalized +
    policy.weights.labor * laborNormalized
  );
}
export function estimateRequiredSpend(demand: DemandPlanItem[]): number {
  return sumBy(demand, (item) => {
    const unitCost = item.wasteCostPerUnit ?? 0;
    return unitCost * item.requiredQty;
  });
}
export function evaluateHardConstraints(
  proposal: CommitteeProposal,
  metrics: CommitteeMetrics,
  context: CommitteeContext,
): HardConstraintResult {
  const violations: string[] = [];
  const { constraints } = context.policy;
  if (metrics.stockoutProbability > constraints.maxUnderOrderRisk) {
    violations.push(
      `Under-order risk ${formatPercent(metrics.stockoutProbability)} exceeds allowed ${formatPercent(constraints.maxUnderOrderRisk)}.`,
    );
  }
  if (constraints.enforceShelfLife) {
    const failingItems = proposal.demand
      .filter(
        (item) =>
          typeof item.shelfLifeHours === "number" &&
          item.shelfLifeHours < constraints.minShelfLifeHours,
      )
      .map((item) => item.name);
    if (failingItems.length) {
      violations.push(
        `Shelf life buffer (${constraints.minShelfLifeHours}h) not met for ${failingItems.join(",")}.`,
      );
    }
  }
  if (constraints.enforceT24Lock && context.serviceDate) {
    const lockViolations = detectT24Violations(proposal, context);
    if (lockViolations.length) {
      violations.push(
        `T-${constraints.t24LockHours} lock violated for ${lockViolations.join(",")}.`,
      );
    }
  }
  return { passed: violations.length === 0, violations };
}
function detectT24Violations(
  proposal: CommitteeProposal,
  context: CommitteeContext,
): string[] {
  const { constraints } = context.policy;
  const serviceTime = Date.parse(context.serviceDate ?? "");
  if (Number.isNaN(serviceTime)) return [];
  const lockBoundary = serviceTime - constraints.t24LockHours * 3_600_000;
  return proposal.prepTasks
    .filter((task) => {
      const start = Date.parse(task.startAt);
      if (Number.isNaN(start)) return false;
      return start >= lockBoundary && task.overtimeRisk > 0.25;
    })
    .map((task) => task.title);
}
function formatPercent(value: number): string {
  return `${Math.round(clamp(value, 0, 1) * 10_000) / 100}%`;
}
