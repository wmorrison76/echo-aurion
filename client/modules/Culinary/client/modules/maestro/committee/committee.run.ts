import { plannerAgent } from "./planner.agent";
import { riskAgent } from "./risk.agent";
import { historyAgent } from "./history.agent";
import { computeMetrics, evaluateHardConstraints } from "./metrics";
import {
  CommitteeContext,
  CommitteeCritique,
  CommitteeInputs,
  CommitteePatch,
  CommitteeProposal,
  CommitteeRunResult,
  CommitteeDecisionStatus,
  createCommitteeContext,
  CommitteeDecision,
  CommitteeRunAuditEntry,
  CommitteeMetrics,
} from "./types";
import { clamp, cloneDeep, isoNow } from "./utils";
export async function generateCommitteePlan(
  inputs: CommitteeInputs,
  contextOptions: Parameters<typeof createCommitteeContext>[0],
): Promise<CommitteeRunResult> {
  const context: CommitteeContext = createCommitteeContext(contextOptions);
  const planner = await plannerAgent(inputs, context);
  let workingProposal = cloneDeep(planner.proposal);
  const critiques: CommitteeCritique[] = [];
  const audit: CommitteeRunAuditEntry[] = [
    buildAuditEntry(
      planner.proposal,
      [],
      planner.diagnostics.metrics,
      "approved",
    ),
  ];
  if (context.mode !== "single") {
    const riskCritique = await riskAgent(workingProposal, inputs, context);
    critiques.push(riskCritique);
    workingProposal = applyPatches(
      workingProposal,
      riskCritique.fixes,
      inputs,
      context,
    );
    audit.push(
      buildAuditEntry(
        workingProposal,
        [riskCritique],
        computeMetrics(workingProposal, context),
        riskCritique.approve ? "approved" : "needs_human_review",
      ),
    );
    if (context.mode === "triple" && context.policy.useHistoryAgent) {
      const historyCritique = await historyAgent(
        workingProposal,
        inputs,
        context,
      );
      if (historyCritique) {
        critiques.push(historyCritique);
        workingProposal = applyPatches(
          workingProposal,
          historyCritique.fixes,
          inputs,
          context,
        );
        audit.push(
          buildAuditEntry(
            workingProposal,
            [historyCritique],
            computeMetrics(workingProposal, context),
            historyCritique.approve ? "approved" : "needs_human_review",
          ),
        );
      }
    }
  }
  const finalMetrics = computeMetrics(workingProposal, context);
  const hardConstraints = evaluateHardConstraints(
    workingProposal,
    finalMetrics,
    context,
  );
  const status = resolveStatus(
    planner.diagnostics.metrics,
    finalMetrics,
    critiques,
    hardConstraints,
    context,
  );
  const decision: CommitteeDecision = {
    status,
    finalProposal: workingProposal,
    metrics: finalMetrics,
    critiques,
    hardConstraints,
  };
  audit.push(buildAuditEntry(workingProposal, critiques, finalMetrics, status));
  return { context, initialProposal: planner.proposal, decision, audit };
}
function applyPatches(
  proposal: CommitteeProposal,
  patches: CommitteePatch[],
  inputs: CommitteeInputs,
  context: CommitteeContext,
): CommitteeProposal {
  if (!patches.length) return proposal;
  const next = cloneDeep(proposal);
  for (const patch of patches) {
    switch (patch.type) {
      case "adjustPurchaseOrderQuantity": {
        const order = next.purchaseOrders.find(
          (po) => po.id === patch.purchaseOrderId,
        );
        if (!order) break;
        const line = order.lines.find((entry) => entry.id === patch.lineId);
        if (!line) break;
        line.qty = Math.max(0, patch.newQty);
        break;
      }
      case "adjustDemandRecommendation": {
        const demand = next.demand.find((entry) => entry.id === patch.demandId);
        if (!demand) break;
        demand.recommendedQty = Math.max(
          demand.requiredQty,
          patch.newRecommendedQty,
        );
        demand.plannedPurchaseQty = Math.max(
          demand.recommendedQty - (demand.onHandQty ?? 0),
          0,
        );
        demand.overageQty = Math.max(
          demand.recommendedQty - demand.requiredQty,
          0,
        );
        demand.projectedWasteQty = Math.max(demand.overageQty, 0);
        demand.projectedWasteCost =
          demand.projectedWasteQty * (demand.wasteCostPerUnit ?? 0);
        if (typeof patch.newUnderOrderRisk === "number") {
          demand.adjustedRisk = clamp(patch.newUnderOrderRisk, 0, 1);
        }
        break;
      }
      case "addNote": {
        next.notes.push(patch.note);
        break;
      }
      case "updatePrepTaskWindow": {
        const task = next.prepTasks.find((entry) => entry.id === patch.taskId);
        if (!task) break;
        task.startAt = patch.startAt;
        task.endAt = patch.endAt;
        break;
      }
      default:
        break;
    }
  }
  sanitizePurchaseOrders(next);
  recalcDemandSummaries(next, inputs, context);
  return next;
}
function sanitizePurchaseOrders(proposal: CommitteeProposal) {
  proposal.purchaseOrders = proposal.purchaseOrders
    .map((order) => ({
      ...order,
      lines: order.lines.filter((line) => line.qty > 0),
    }))
    .filter((order) => order.lines.length > 0);
}
function recalcDemandSummaries(
  proposal: CommitteeProposal,
  inputs: CommitteeInputs,
  context: CommitteeContext,
) {
  const inventory = new Map(
    inputs.inventory.map((item) => [item.itemId, item]),
  );
  const qtyByItem = new Map<string, number>();
  for (const order of proposal.purchaseOrders) {
    for (const line of order.lines) {
      qtyByItem.set(line.itemId, (qtyByItem.get(line.itemId) ?? 0) + line.qty);
    }
  }
  const buffer = context.policy.constraints.overOrderBuffer;
  for (const demand of proposal.demand) {
    const onHand = inventory.get(demand.id)?.onHandQty ?? demand.onHandQty ?? 0;
    const purchaseQty = qtyByItem.get(demand.id) ?? demand.plannedPurchaseQty;
    demand.plannedPurchaseQty = purchaseQty;
    demand.recommendedQty = onHand + purchaseQty;
    demand.overageQty = Math.max(demand.recommendedQty - demand.requiredQty, 0);
    demand.projectedWasteQty = Math.max(demand.overageQty, 0);
    demand.projectedWasteCost =
      demand.projectedWasteQty * (demand.wasteCostPerUnit ?? 0);
    const shortage = Math.max(
      demand.requiredQty * (1 + buffer) - demand.recommendedQty,
      0,
    );
    const baseRisk = demand.underOrderRisk ?? 0.08;
    demand.adjustedRisk =
      shortage <= 0
        ? clamp(baseRisk * 0.5, 0, 1)
        : clamp(baseRisk + shortage / (demand.requiredQty + 1), 0, 1);
  }
}
function resolveStatus(
  plannerMetrics: CommitteeMetrics,
  finalMetrics: CommitteeMetrics,
  critiques: CommitteeCritique[],
  hardConstraints: ReturnType<typeof evaluateHardConstraints>,
  context: CommitteeContext,
): CommitteeDecisionStatus {
  if (!hardConstraints.passed) return "blocked";
  const blockingIssues = critiques.some((critique) =>
    critique.issues.some((issue) => issue.blocking),
  );
  if (blockingIssues) return "needs_human_review";
  const approvals = critiques.filter((critique) => critique.approve).length;
  const requiredApprovals = Math.ceil(
    (context.mode === "triple" ? 3 : 2) * context.policy.quorum,
  );
  if (approvals < requiredApprovals) return "needs_human_review";
  const spendDeltaBase = plannerMetrics.totalSpend || 1;
  const spendDelta =
    Math.abs(finalMetrics.totalSpend - plannerMetrics.totalSpend) /
    spendDeltaBase;
  const scoreDelta = Math.abs(finalMetrics.score - plannerMetrics.score);
  if (
    spendDelta >= context.policy.escalateSpendDeltaPct ||
    scoreDelta >= context.policy.escalateDisagreementScore
  ) {
    return "needs_human_review";
  }
  return "approved";
}
function buildAuditEntry(
  proposal: CommitteeProposal,
  critiques: CommitteeCritique[],
  metrics: CommitteeMetrics,
  status: CommitteeDecisionStatus,
): CommitteeRunAuditEntry {
  return {
    proposal: cloneDeep(proposal),
    critiques: cloneDeep(critiques),
    metrics: cloneDeep(metrics),
    status,
    timestamp: isoNow(),
  };
}
