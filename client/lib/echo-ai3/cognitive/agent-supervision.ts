/**
 * EchoAi³ Agent Supervision Integration
 * Govern agents and explain their behavior via existing agent-supervisor API only.
 * No new authority; uses existing /api/agents/proposals and trace for explanation.
 */

import type { AgentExplanation } from "./types";
import type {
  AgentProposalRequest,
  AgentProposalResponse,
} from "@shared/types/agent-contracts";

/**
 * Submit agent proposal to existing control plane and return explanation (allowed/reason).
 */
export async function submitAgentProposal(
  proposal: AgentProposalRequest,
  authHeaders?: HeadersInit,
): Promise<AgentExplanation> {
  const res = await fetch("/api/agents/proposals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(proposal),
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      proposalId: "",
      allowed: false,
      reason: `Request failed: ${res.status} ${text.slice(0, 200)}`,
      evaluatedAt: new Date().toISOString(),
      mode: "shadow",
    };
  }

  const data: AgentProposalResponse = await res.json();
  return {
    proposalId: data.proposalId,
    allowed: data.allowed,
    reason: data.reason,
    evaluatedAt: data.evaluatedAt,
    mode: data.mode,
  };
}

/**
 * Explain agent behavior from TraceLedger agent-proposal/agent-action entries (no inference).
 */
export function explainAgentBehaviorFromTrace(
  entries: Array<{ payload: Record<string, unknown>; createdAt: string }>,
): string[] {
  return entries.map((entry) => {
    const p = entry.payload;
    const action = p.actionType ?? p.action_type ?? "action";
    const allowed = p.allowed;
    const reason = p.reason ?? "—";
    return `[${entry.createdAt}] ${action}: ${allowed ? "allowed" : "denied"} — ${reason}`;
  });
}
