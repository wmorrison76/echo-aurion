import { applyFixes } from "./fixes";
import {
  DEFAULT_CONSTRAINT_EVALUATORS,
  evaluateConstraints,
  scoreMetrics,
} from "./metrics";
import type {
  AgentBundle,
  CommitteeConfig,
  CommitteeDecision,
  CommitteeCritique,
  CommitteeMetrics,
  CommitteeProposal,
  ConstraintEvaluator,
  RunContext,
} from "./types";
import { DefaultCommitteeConfig } from "./types";
export interface CommitteeRunOptions {
  context: RunContext;
  agents: AgentBundle;
  computeMetrics: (
    proposal: CommitteeProposal,
    context: RunContext,
  ) => Promise<CommitteeMetrics>;
  config?: Partial<CommitteeConfig>;
  evaluators?: ConstraintEvaluator[];
  baselineMetrics?: CommitteeMetrics;
}
function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
function mergeConfig(config?: Partial<CommitteeConfig>): CommitteeConfig {
  if (!config) return cloneValue(DefaultCommitteeConfig);
  const merged: CommitteeConfig = {
    ...DefaultCommitteeConfig,
    ...config,
    weights: { ...DefaultCommitteeConfig.weights, ...(config.weights ?? {}) },
    normalizers: {
      ...(DefaultCommitteeConfig.normalizers ?? {}),
      ...(config.normalizers ?? {}),
    },
  };
  return merged;
}
function nowMs() {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}
export async function runCommittee(
  options: CommitteeRunOptions,
): Promise<CommitteeDecision> {
  const config = mergeConfig(options.config);
  const { context, agents } = options;
  const logger = config.logger;
  const initialProposal = await agents.planner.propose(context);
  logger?.onProposal?.(context, initialProposal);
  const critiques = [];
  const fixesApplied = [];
  const baselineMetrics =
    options.baselineMetrics ??
    (await options.computeMetrics(initialProposal, context));
  let workingProposal = initialProposal;
  const riskStart = nowMs();
  const riskCritiqueRaw = await agents.risk.critique(workingProposal, context);
  const riskCritique: CommitteeCritique = {
    ...riskCritiqueRaw,
    agent: "risk",
    durationMs: nowMs() - riskStart,
  };
  logger?.onCritique?.(context, riskCritique);
  critiques.push(riskCritique);
  const riskFixOutcome = applyFixes(workingProposal, riskCritique.fixes ?? []);
  fixesApplied.push(...riskFixOutcome.results);
  workingProposal = riskFixOutcome.proposal;
  let historyCritique: CommitteeCritique | undefined;
  if (config.mode === "triple" && agents.history) {
    const historyStart = nowMs();
    const historyCritiqueRaw = await agents.history.critique(
      workingProposal,
      context,
    );
    historyCritique = {
      ...historyCritiqueRaw,
      agent: "history",
      durationMs: nowMs() - historyStart,
    };
    logger?.onCritique?.(context, historyCritique);
    critiques.push(historyCritique);
    const historyFixOutcome = applyFixes(
      workingProposal,
      historyCritique.fixes ?? [],
    );
    fixesApplied.push(...historyFixOutcome.results);
    workingProposal = historyFixOutcome.proposal;
  }
  const finalMetrics = await options.computeMetrics(workingProposal, context);
  const scoring = scoreMetrics(finalMetrics, config);
  const hardConstraints = evaluateConstraints(
    workingProposal,
    finalMetrics,
    config,
    options.evaluators ?? DEFAULT_CONSTRAINT_EVALUATORS,
  );
  const hasHardFail =
    config.enforceHardStops && hardConstraints.some((item) => item.violated);
  const reasons: string[] = [];
  if (hasHardFail) {
    const violatedCodes = hardConstraints
      .filter((c) => c.violated)
      .map((c) => c.code)
      .join(",");
    reasons.push(`Hard constraint violation: ${violatedCodes}`);
  }
  const riskApprove = riskCritique?.approve ?? true;
  if (!riskApprove) {
    reasons.push("Risk agent requested human approval");
  }
  const hasHistoryAgent = Boolean(agents.history);
  const historyApprove = historyCritique
    ? historyCritique.approve
    : !hasHistoryAgent;
  if (config.mode === "triple" && !hasHistoryAgent) {
    reasons.push("History agent unavailable; quorum reduced to dual");
  }
  if (historyCritique && !historyApprove) {
    reasons.push("Historian agent requested review");
  }
  if (fixesApplied.some((fix) => !fix.success)) {
    reasons.push("One or more fixes could not be applied");
  }
  const spendDeltaBase = baselineMetrics.totalSpend || 1;
  const spendDeltaPct =
    Math.abs(finalMetrics.totalSpend - baselineMetrics.totalSpend) /
    spendDeltaBase;
  if (spendDeltaPct > config.escalationSpendDeltaPct) {
    reasons.push(
      `Spend delta ${(spendDeltaPct * 100).toFixed(2)}% exceeds threshold`,
    );
  }
  let state: CommitteeDecision["state"] = "approved";
  if (hasHardFail) {
    state = "blocked";
  } else if (config.mode === "dual" || !hasHistoryAgent) {
    if (!riskApprove || spendDeltaPct > config.escalationSpendDeltaPct) {
      state = "escalate";
    }
  } else if (config.mode === "triple") {
    if (!riskApprove) {
      state = "escalate";
    } else {
      const voteYes = 1 + (riskApprove ? 1 : 0) + (historyApprove ? 1 : 0);
      const quorumMet = voteYes >= 2;
      if (!quorumMet || spendDeltaPct > config.escalationSpendDeltaPct) {
        state = "escalate";
      }
    }
  }
  const decision: CommitteeDecision = {
    state,
    initialProposal,
    finalProposal: workingProposal,
    critiques,
    metrics: finalMetrics,
    baselineMetrics,
    hardConstraints,
    fixesApplied,
    score: scoring,
    reason: reasons.length ? reasons.join(";") : undefined,
  };
  logger?.onDecision?.(context, decision);
  return decision;
}
