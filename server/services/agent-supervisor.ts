import { randomUUID } from "crypto";
import { AccessControlService } from "./access-control-service";
import { emitTrace } from "../lib/trace-emitter";
import type {
  AgentActionAttemptRequest,
  AgentActionAttemptResponse,
  AgentProposalRequest,
  AgentProposalResponse,
  AgentMode,
} from "@shared/types/agent-contracts";

const SHADOW_MODE: AgentMode = "shadow";

export class AgentSupervisor {
  private accessControl = new AccessControlService();

  async submitProposal(
    orgId: string,
    userId: string,
    userRole: string | undefined,
    proposal: AgentProposalRequest,
  ): Promise<AgentProposalResponse> {
    const proposalId = `proposal-${randomUUID()}`;
    const evaluatedAt = new Date().toISOString();

    const decision = await this.consultControlPlane({
      orgId,
      userId,
      userRole,
      action: `propose:${proposal.actionType}`,
      context: {
        agentId: proposal.agentId,
        target: proposal.target,
        payload: proposal.payload || {},
      },
    });

    const response: AgentProposalResponse = {
      proposalId,
      mode: SHADOW_MODE,
      allowed: decision.allowed,
      reason: decision.allowed ? "Control plane approved proposal" : decision.reason,
      evaluatedAt,
    };

    await emitTrace(
      orgId,
      "agent-proposal",
      proposalId,
      "control-plane",
      "agent-shadow",
      {
        agentId: proposal.agentId,
        actionType: proposal.actionType,
        target: proposal.target,
        rationale: proposal.rationale || "",
        payload: proposal.payload || {},
      },
      {
        mode: SHADOW_MODE,
        allowed: response.allowed,
        reason: response.reason,
        evaluatedAt,
      },
      {
        sourceRef: proposalId,
        userId,
        userRole,
      },
    );

    return response;
  }

  async attemptAction(
    orgId: string,
    userId: string,
    userRole: string | undefined,
    attempt: AgentActionAttemptRequest,
  ): Promise<AgentActionAttemptResponse> {
    const attemptId = `attempt-${randomUUID()}`;
    const evaluatedAt = new Date().toISOString();

    const decision = await this.consultControlPlane({
      orgId,
      userId,
      userRole,
      action: `execute:${attempt.actionType}`,
      context: {
        agentId: attempt.agentId,
        target: attempt.target,
        proposalId: attempt.proposalId || null,
      },
    });

    const response: AgentActionAttemptResponse = {
      attemptId,
      mode: SHADOW_MODE,
      allowed: false,
      reason: decision.allowed
        ? "Shadow mode enforced: execution blocked"
        : decision.reason,
      evaluatedAt,
    };

    await emitTrace(
      orgId,
      "agent-action",
      attemptId,
      "control-plane",
      "agent-shadow",
      {
        agentId: attempt.agentId,
        actionType: attempt.actionType,
        target: attempt.target,
        proposalId: attempt.proposalId || null,
        payload: attempt.payload || {},
      },
      {
        mode: SHADOW_MODE,
        allowed: response.allowed,
        reason: response.reason,
        evaluatedAt,
      },
      {
        sourceRef: attempt.proposalId || attemptId,
        userId,
        userRole,
      },
    );

    return response;
  }

  private async consultControlPlane({
    orgId,
    userId,
    userRole,
    action,
    context,
  }: {
    orgId: string;
    userId: string;
    userRole?: string;
    action: string;
    context: Record<string, unknown>;
  }): Promise<{ allowed: boolean; reason: string }> {
    const result = await this.accessControl.checkAccess({
      user_id: userId,
      tenant_id: orgId,
      resource: "agent",
      action,
      context: {
        ...context,
        userRole: userRole || "unknown",
      },
    });

    return {
      allowed: result.allowed,
      reason: result.reason || "Control plane decision unavailable",
    };
  }
}
