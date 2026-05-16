export type AgentMode = "shadow";

export interface AgentProposalRequest {
  agentId: string;
  actionType: string;
  target: string;
  rationale?: string;
  payload?: Record<string, unknown>;
}

export interface AgentProposalResponse {
  proposalId: string;
  mode: AgentMode;
  allowed: boolean;
  reason: string;
  evaluatedAt: string;
}

export interface AgentActionAttemptRequest {
  agentId: string;
  actionType: string;
  target: string;
  proposalId?: string;
  payload?: Record<string, unknown>;
}

export interface AgentActionAttemptResponse {
  attemptId: string;
  mode: AgentMode;
  allowed: boolean;
  reason: string;
  evaluatedAt: string;
}
