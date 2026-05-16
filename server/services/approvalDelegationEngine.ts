/**
 * Approval Delegation Engine
 * Allows approvers to delegate approvals to others
 */

import { logger } from "../lib/logger";

export interface ApprovalDelegation {
  id: string;
  approvalId: string;
  fromApprover: string;
  toApprover: string;
  delegatedAt: Date;
  expiresAt?: Date;
  reason: string;
}

export interface DelegationRule {
  fromRole: string;
  toRole?: string;
  maxDurationDays?: number;
  requiresApproval?: boolean;
}

export class ApprovalDelegationEngine {
  private static delegations: ApprovalDelegation[] = [];
  private static delegationRules: DelegationRule[] = [
    { fromRole: "director", maxDurationDays: 30, requiresApproval: false },
    { fromRole: "manager", maxDurationDays: 14, requiresApproval: false },
    { fromRole: "approver", maxDurationDays: 7, requiresApproval: true },
  ];

  /**
   * Delegate an approval to another user
   */
  static async delegateApproval(
    approvalId: string,
    fromApprover: string,
    toApprover: string,
    reason: string,
    expiresAt?: Date,
  ): Promise<ApprovalDelegation | null> {
    // Validate delegation is allowed
    if (!(await this.canDelegate(fromApprover, toApprover))) {
      logger.warn("[Delegation] Delegation not allowed", {
        from: fromApprover,
        to: toApprover,
      });
      return null;
    }

    const delegation: ApprovalDelegation = {
      id: `del-${Date.now()}`,
      approvalId,
      fromApprover,
      toApprover,
      delegatedAt: new Date(),
      expiresAt,
      reason,
    };

    this.delegations.push(delegation);

    logger.info("[Delegation] Approval delegated", {
      delegationId: delegation.id,
      approvalId,
      from: fromApprover,
      to: toApprover,
    });

    return delegation;
  }

  /**
   * Check if delegation is allowed
   */
  static async canDelegate(
    fromApprover: string,
    toApprover: string,
  ): Promise<boolean> {
    // In production, would check user roles and delegation rules
    // For now, allow all delegations (with proper security checks in production)
    return true;
  }

  /**
   * Revoke a delegation
   */
  static async revokeDelegation(delegationId: string): Promise<boolean> {
    const index = this.delegations.findIndex((d) => d.id === delegationId);
    if (index === -1) return false;

    this.delegations.splice(index, 1);
    logger.info("[Delegation] Delegation revoked", { delegationId });
    return true;
  }

  /**
   * Get active delegations for an approver
   */
  static async getActiveDelegations(
    approver: string,
  ): Promise<ApprovalDelegation[]> {
    const now = new Date();
    return this.delegations.filter(
      (d) => d.fromApprover === approver && (!d.expiresAt || d.expiresAt > now),
    );
  }

  /**
   * Get who an approval is delegated to
   */
  static async getDelegatedApprover(
    approvalId: string,
  ): Promise<string | null> {
    const delegation = this.delegations.find(
      (d) => d.approvalId === approvalId,
    );
    if (!delegation) return null;

    // Check if delegation is still active
    if (delegation.expiresAt && delegation.expiresAt <= new Date()) {
      this.revokeDelegation(delegation.id);
      return null;
    }

    return delegation.toApprover;
  }

  /**
   * Get delegation rule for a role
   */
  static getRuleForRole(role: string): DelegationRule | undefined {
    return this.delegationRules.find((r) => r.fromRole === role);
  }

  /**
   * Update delegation rule
   */
  static updateRule(
    fromRole: string,
    updates: Partial<DelegationRule>,
  ): boolean {
    const index = this.delegationRules.findIndex(
      (r) => r.fromRole === fromRole,
    );
    if (index === -1) return false;

    this.delegationRules[index] = {
      ...this.delegationRules[index],
      ...updates,
    };
    logger.info("[Delegation] Rule updated", { fromRole });
    return true;
  }
}
