import { computeMetrics } from "./metrics";
import {
  CommitteeContext,
  CommitteeCritique,
  CommitteeInputs,
  CommitteePatch,
  CommitteeProposal,
  CommitteeIssue,
  HistoricalDemandSample,
} from "./types";
import { average, clamp, percentile, uniqueId } from "./utils";
export async function historyAgent(
  proposal: CommitteeProposal,
  inputs: CommitteeInputs,
  context: CommitteeContext,
): Promise<CommitteeCritique | null> {
  const historical = inputs.historical ?? [];
  if (!historical.length || context.policy.useHistoryAgent === false) {
    return null;
  }
  const historyByItem = groupByItem(historical);
  const issues: CommitteeIssue[] = [];
  const fixes: CommitteePatch[] = [];
  for (const item of proposal.demand) {
    const samples = historyByItem.get(item.id);
    if (!samples || samples.length < 2) continue;
    const window = takeRecent(samples, 6);
    if (window.length < 2) continue;
    const fulfillmentMean = average(window.map((entry) => entry.fulfilledQty));
    const wasteRatios = window.map((entry) => {
      const total = entry.fulfilledQty + entry.wasteQty;
      if (total <= 0) return 0;
      return clamp(entry.wasteQty / total, 0, 1);
    });
    const wasteRatio = average(wasteRatios);
    const demandRatio = clamp(
      fulfillmentMean / (item.requiredQty || 1),
      0.5,
      1.5,
    );
    const suggestedQty = clamp(
      item.requiredQty * demandRatio,
      0,
      item.requiredQty * 2,
    );
    const deltaQty = suggestedQty - item.recommendedQty;
    const magnitude = Math.abs(deltaQty);
    const threshold = Math.max(0.5, item.recommendedQty * 0.05);
    if (magnitude > threshold) {
      const note =
        deltaQty > 0
          ? `${item.name}: historical consumption trending higher (+${deltaQty.toFixed(1)} ${item.unit}).`
          : `${item.name}: historical waste suggests reducing by ${Math.abs(deltaQty).toFixed(1)} ${item.unit}.`;
      issues.push(makeInfoIssue("history-adjust", note, [item.id]));
      fixes.push({
        type: "adjustDemandRecommendation",
        demandId: item.id,
        newRecommendedQty: Math.max(item.requiredQty, suggestedQty),
        reason: "Historian adjustment",
        newUnderOrderRisk: clamp(item.adjustedRisk * 0.9, 0, 1),
      });
    }
    if (wasteRatio > 0.15) {
      const highWasteMessage = `${item.name}: median waste ${(wasteRatio * 100).toFixed(1)}% in last ${window.length} runs.`;
      issues.push(makeWarnIssue("history-waste", highWasteMessage, [item.id]));
    }
    const ninetyPercentile = percentile(
      window.map((entry) => entry.fulfilledQty),
      0.9,
    );
    if (ninetyPercentile > item.recommendedQty * 1.2) {
      issues.push(
        makeWarnIssue(
          "history-variance",
          `${item.name}: 90th percentile demand ${ninetyPercentile.toFixed(1)} ${item.unit} exceeds plan by >20%.`,
          [item.id],
        ),
      );
    }
  }
  const metrics = computeMetrics(proposal, context);
  return {
    agentId: "history",
    agentName: "HistoryAgent",
    issues,
    fixes,
    metrics,
    approve: true,
  };
}
function groupByItem(
  samples: HistoricalDemandSample[],
): Map<string, HistoricalDemandSample[]> {
  const map = new Map<string, HistoricalDemandSample[]>();
  for (const sample of samples) {
    const bucket = map.get(sample.itemId);
    if (bucket) bucket.push(sample);
    else map.set(sample.itemId, [sample]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => Date.parse(b.eventDate) - Date.parse(a.eventDate));
  }
  return map;
}
function takeRecent<T>(items: T[], limit: number): T[] {
  return items.slice(0, limit);
}
function makeInfoIssue(
  code: string,
  message: string,
  affected: string[],
): CommitteeIssue {
  return {
    id: uniqueId(`hist-${code}`),
    code,
    message,
    severity: "info",
    blocking: false,
    affectedIds: affected,
  };
}
function makeWarnIssue(
  code: string,
  message: string,
  affected: string[],
): CommitteeIssue {
  return {
    id: uniqueId(`hist-${code}`),
    code,
    message,
    severity: "warning",
    blocking: false,
    affectedIds: affected,
  };
}
