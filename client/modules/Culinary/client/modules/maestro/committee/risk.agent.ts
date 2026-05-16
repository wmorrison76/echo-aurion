import { computeMetrics, evaluateHardConstraints } from "./metrics";
import {
  CommitteeContext,
  CommitteeInputs,
  CommitteeIssue,
  CommitteePatch,
  CommitteeProposal,
  CommitteePurchaseOrder,
  CommitteePurchaseOrderLine,
  CommitteeCritique,
  DemandPlanItem,
} from "./types";
import { clamp, safeDivide, uniqueId } from "./utils";
export async function riskAgent(
  proposal: CommitteeProposal,
  inputs: CommitteeInputs,
  context: CommitteeContext,
): Promise<CommitteeCritique> {
  const issues: CommitteeIssue[] = [];
  const fixes: CommitteePatch[] = [];
  const poIndex = buildPurchaseOrderIndex(proposal.purchaseOrders);
  const buffer = context.policy.constraints.overOrderBuffer;
  const targetWastePct = context.policy.targetWastePct;
  for (const item of proposal.demand) {
    const minQty = item.requiredQty * (1 + buffer);
    const available = item.recommendedQty;
    if (available + 1e-6 < minQty) {
      const message = `${item.name}: recommended ${available.toFixed(2)} ${item.unit} below buffered minimum ${minQty.toFixed(2)}.`;
      issues.push(
        makeIssue("under-order", message, "critical", true, [item.id]),
      );
      const delta = minQty - available;
      const patch = buildIncreaseQtyPatch(
        item,
        delta,
        poIndex,
        `Raise to buffered minimum (${(buffer * 100).toFixed(1)}%).`,
      );
      if (patch) fixes.push(patch);
    }
    if (item.adjustedRisk > context.policy.constraints.maxUnderOrderRisk) {
      const message = `${item.name}: under-order risk ${formatPercent(item.adjustedRisk)} above threshold ${formatPercent(context.policy.constraints.maxUnderOrderRisk)}.`;
      issues.push(
        makeIssue("risk-threshold", message, "critical", true, [item.id]),
      );
      const patch = buildIncreaseQtyPatch(
        item,
        item.requiredQty * (context.policy.constraints.maxUnderOrderRisk + 0.1),
        poIndex,
        "Increase to tame stockout probability.",
      );
      if (patch) fixes.push(patch);
    }
    if (
      context.policy.constraints.enforceShelfLife &&
      typeof item.shelfLifeHours === "number"
    ) {
      if (item.shelfLifeHours < context.policy.constraints.minShelfLifeHours) {
        const message = `${item.name}: shelf life ${item.shelfLifeHours}h < required ${context.policy.constraints.minShelfLifeHours}h.`;
        issues.push(
          makeIssue("shelf-life", message, "critical", true, [item.id]),
        );
      }
    }
    const wastePct = clamp(
      safeDivide(item.projectedWasteQty, item.recommendedQty || 1, 0),
      0,
      1,
    );
    if (wastePct > targetWastePct * 1.5 && item.projectedWasteQty > 0.5) {
      issues.push(
        makeIssue(
          "waste",
          `${item.name}: projected waste ${(wastePct * 100).toFixed(1)}% exceeds target ${(targetWastePct * 100).toFixed(1)}%.`,
          "warning",
          false,
          [item.id],
        ),
      );
      const minRecommended = Math.max(minQty, item.requiredQty);
      if (minRecommended < item.recommendedQty - 0.01) {
        const patch = buildReduceQtyPatch(
          item,
          item.recommendedQty - minRecommended,
          poIndex,
          "Trim overage to lower waste.",
        );
        if (patch) fixes.push(patch);
      }
    }
  }
  const qcFailures = proposal.quality.filter((gate) => gate.riskScore > 0.75);
  if (qcFailures.length) {
    issues.push(
      makeIssue(
        "qc-risk",
        `${qcFailures.length} QC gate(s) flagged high risk (>0.75).`,
        "warning",
        false,
        qcFailures.map((gate) => gate.id),
      ),
    );
  }
  if (context.policy.constraints.enforceT24Lock && context.serviceDate) {
    const lockViolations = proposal.prepTasks.filter((task) => {
      const startHours = hoursUntilService(task.startAt, context.serviceDate!);
      return (
        startHours < context.policy.constraints.t24LockHours &&
        task.overtimeRisk > 0.25
      );
    });
    if (lockViolations.length) {
      issues.push(
        makeIssue(
          "t24-lock",
          `${lockViolations.length} prep task(s) exceed overtime risk inside T-${context.policy.constraints.t24LockHours} window.`,
          "warning",
          false,
          lockViolations.map((task) => task.id),
        ),
      );
    }
  }
  const metrics = computeMetrics(proposal, context);
  const hardConstraints = evaluateHardConstraints(proposal, metrics, context);
  const critique: CommitteeCritique = {
    agentId: "risk",
    agentName: "RiskAgent",
    issues,
    fixes,
    metrics,
    approve: !issues.some((issue) => issue.blocking) && hardConstraints.passed,
  };
  return critique;
}
function makeIssue(
  code: string,
  message: string,
  severity: "info" | "warning" | "critical",
  blocking: boolean,
  affected: string[],
): CommitteeIssue {
  return {
    id: uniqueId(`issue-${code}`),
    code,
    message,
    severity,
    blocking,
    affectedIds: affected,
  };
}
function buildPurchaseOrderIndex(orders: CommitteePurchaseOrder[]) {
  const map = new Map<
    string,
    { orderId: string; line: CommitteePurchaseOrderLine }[]
  >();
  for (const order of orders) {
    for (const line of order.lines) {
      const bucket = map.get(line.itemId);
      if (bucket) bucket.push({ orderId: order.id, line });
      else map.set(line.itemId, [{ orderId: order.id, line }]);
    }
  }
  return map;
}
function buildIncreaseQtyPatch(
  item: DemandPlanItem,
  delta: number,
  poIndex: Map<string, { orderId: string; line: CommitteePurchaseOrderLine }[]>,
  reason: string,
): CommitteePatch | null {
  const entries = poIndex.get(item.id);
  if (!entries?.length) {
    return {
      type: "adjustDemandRecommendation",
      demandId: item.id,
      newRecommendedQty: item.recommendedQty + delta,
      reason,
      newUnderOrderRisk: clamp(item.adjustedRisk * 0.5, 0, 1),
    };
  }
  const target = entries[0];
  return {
    type: "adjustPurchaseOrderQuantity",
    purchaseOrderId: target.orderId,
    lineId: target.line.id,
    newQty: target.line.qty + delta,
    reason,
  };
}
function buildReduceQtyPatch(
  item: DemandPlanItem,
  reduction: number,
  poIndex: Map<string, { orderId: string; line: CommitteePurchaseOrderLine }[]>,
  reason: string,
): CommitteePatch | null {
  const entries = poIndex.get(item.id);
  if (!entries?.length) {
    return {
      type: "adjustDemandRecommendation",
      demandId: item.id,
      newRecommendedQty: Math.max(
        item.requiredQty,
        item.recommendedQty - reduction,
      ),
      reason,
      newUnderOrderRisk: clamp(item.adjustedRisk, 0, 1),
    };
  }
  const target = entries[0];
  return {
    type: "adjustPurchaseOrderQuantity",
    purchaseOrderId: target.orderId,
    lineId: target.line.id,
    newQty: Math.max(target.line.qty - reduction, 0),
    reason,
  };
}
function hoursUntilService(startAt: string, serviceDate: string): number {
  const start = Date.parse(startAt);
  const service = Date.parse(serviceDate);
  if (Number.isNaN(start) || Number.isNaN(service))
    return Number.POSITIVE_INFINITY;
  return (service - start) / 3_600_000;
}
function formatPercent(value: number): string {
  return `${Math.round(clamp(value, 0, 1) * 10_000) / 100}%`;
}
