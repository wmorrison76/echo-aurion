import type {
  CommitteeCritique,
  CommitteeProposal,
  HistoryAgent,
  PlannerAgent,
  RiskAgent,
  RunContext,
} from "./types";
function normalizeCritique(
  agent: "risk" | "history",
  critique: CommitteeCritique,
): CommitteeCritique {
  return {
    ...critique,
    agent,
    approve: critique.approve ?? true,
    issues: critique.issues ?? [],
    fixes: critique.fixes ?? [],
  };
}
export function createPlannerAgent(
  propose: (
    context: RunContext,
  ) => Promise<CommitteeProposal> | CommitteeProposal,
): PlannerAgent {
  return {
    async propose(context) {
      const result = await Promise.resolve(propose(context));
      return result;
    },
  };
}
export function createRiskAgent(
  critique: (
    proposal: CommitteeProposal,
    context: RunContext,
  ) => Promise<CommitteeCritique> | CommitteeCritique,
): RiskAgent {
  return {
    async critique(proposal, context) {
      const result = await Promise.resolve(critique(proposal, context));
      return normalizeCritique("risk", result);
    },
  };
}
export function createHistoryAgent(
  critique: (
    proposal: CommitteeProposal,
    context: RunContext,
  ) => Promise<CommitteeCritique> | CommitteeCritique,
): HistoryAgent {
  return {
    async critique(proposal, context) {
      const result = await Promise.resolve(critique(proposal, context));
      return normalizeCritique("history", result);
    },
  };
}
