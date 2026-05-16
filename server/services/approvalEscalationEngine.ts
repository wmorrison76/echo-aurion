/**
 * Approval Escalation Engine
 * Automatically escalates approvals that exceed SLA thresholds
 */

import { logger } from "../lib/logger";

export interface EscalationPolicy {
  level: number;
  hoursToEscalate: number;
  escalateToRole: string;
  notifyUsers: boolean;
}

export interface ApprovalEscalation {
  approvalId: string;
  fromApprover: string;
  toApprover: string;
  escalatedAt: Date;
  reason: string;
  level: number;
}

export class ApprovalEscalationEngine {
  private static escalationPolicies: EscalationPolicy[] = [
    {
      level: 1,
      hoursToEscalate: 4,
      escalateToRole: "manager",
      notifyUsers: true,
    },
    {
      level: 2,
      hoursToEscalate: 8,
      escalateToRole: "director",
      notifyUsers: true,
    },
    {
      level: 3,
      hoursToEscalate: 24,
      escalateToRole: "executive",
      notifyUsers: true,
    },
  ];

  /**
   * Check if approval should be escalated
   */
  static async checkForEscalation(
    approval: any,
  ): Promise<EscalationPolicy | null> {
    if (approval.status !== "pending") return null;

    const createdAt = new Date(approval.createdAt);
    const now = new Date();
    const hoursPassed =
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    // Find the appropriate escalation policy
    const applicablePolicy = this.escalationPolicies.find(
      (policy) =>
        hoursPassed >= policy.hoursToEscalate &&
        policy.level === (approval.escalationLevel || 1),
    );

    if (applicablePolicy) {
      logger.info("[Escalation] Approval eligible for escalation", {
        approvalId: approval.id,
        hoursPassed: hoursPassed.toFixed(1),
        policy: applicablePolicy,
      });
    }

    return applicablePolicy || null;
  }

  /**
   * Escalate an approval to the next level
   */
  static async escalateApproval(
    approvalId: string,
    fromApprover: string,
    toApprover: string,
    reason: string,
  ): Promise<ApprovalEscalation> {
    const escalation: ApprovalEscalation = {
      approvalId,
      fromApprover,
      toApprover,
      escalatedAt: new Date(),
      reason,
      level: 1,
    };

    logger.info("[Escalation] Approval escalated", {
      approvalId,
      from: fromApprover,
      to: toApprover,
      reason,
    });

    return escalation;
  }

  /**
   * Batch escalate pending approvals
   */
  static async escalatePendingApprovals(
    approvals: any[],
  ): Promise<ApprovalEscalation[]> {
    const escalations: ApprovalEscalation[] = [];

    for (const approval of approvals) {
      const policy = await this.checkForEscalation(approval);
      if (policy) {
        const escalation = await this.escalateApproval(
          approval.id,
          approval.assignedTo,
          policy.escalateToRole,
          `Auto-escalation: SLA exceeded (${policy.hoursToEscalate}h threshold)`,
        );
        escalations.push(escalation);
      }
    }

    return escalations;
  }

  /**
   * Get escalation policy for a level
   */
  static getPolicyForLevel(level: number): EscalationPolicy | undefined {
    return this.escalationPolicies.find((p) => p.level === level);
  }

  /**
   * Update escalation policy
   */
  static updatePolicy(
    level: number,
    updates: Partial<EscalationPolicy>,
  ): boolean {
    const index = this.escalationPolicies.findIndex((p) => p.level === level);
    if (index === -1) return false;

    this.escalationPolicies[index] = {
      ...this.escalationPolicies[index],
      ...updates,
    };
    logger.info("[Escalation] Policy updated", { level });
    return true;
  }
}
