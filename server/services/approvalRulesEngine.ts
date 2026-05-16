/**
 * Approval Rules Engine
 * Evaluates journal entries and invoices against approval rules
 * Determines which approvers are required and escalation paths
 */

import { logger } from "../lib/logger";

export interface ApprovalRule {
  id: string;
  name: string;
  entityId: string;
  conditions: RuleCondition[];
  actions: ApprovalAction[];
  priority: number;
  enabled: boolean;
  createdAt: Date;
}

export interface RuleCondition {
  field:
    | "amount"
    | "accountCode"
    | "accountType"
    | "transactionType"
    | "department"
    | "costCenter";
  operator: "equals" | "gt" | "lt" | "gte" | "lte" | "in" | "contains";
  value: any;
}

export interface ApprovalAction {
  type:
    | "require_approver"
    | "require_level"
    | "require_guardian_check"
    | "require_manual_review"
    | "auto_approve"
    | "escalate";
  approverRole?: string;
  approvalLevel?: number;
  guardianType?: "argus" | "zelda" | "phoenix" | "odin";
  escalateAfterHours?: number;
  escalateTo?: string;
}

export interface ApprovalRequirement {
  ruleId: string;
  approverRole?: string;
  approvalLevel?: number;
  requiresGuardianCheck?: string[];
  requiresManualReview?: boolean;
  canAutoApprove?: boolean;
  escalateAfterHours?: number;
  escalateTo?: string;
}

export class ApprovalRulesEngine {
  private static defaultRules: ApprovalRule[] = [
    {
      id: "rule-1-large-amounts",
      name: "Large Transaction Amounts",
      entityId: "all",
      conditions: [{ field: "amount", operator: "gte", value: 50000 }],
      actions: [
        { type: "require_level", approvalLevel: 2 },
        { type: "require_approver", approverRole: "cfo" },
      ],
      priority: 1,
      enabled: true,
      createdAt: new Date(),
    },
    {
      id: "rule-2-manual-entries",
      name: "Manual GL Entries",
      entityId: "all",
      conditions: [
        {
          field: "transactionType",
          operator: "equals",
          value: "manual_journal_entry",
        },
      ],
      actions: [
        { type: "require_level", approvalLevel: 1 },
        { type: "require_guardian_check", guardianType: "argus" },
      ],
      priority: 2,
      enabled: true,
      createdAt: new Date(),
    },
    {
      id: "rule-3-high-risk-accounts",
      name: "High-Risk GL Accounts",
      entityId: "all",
      conditions: [
        {
          field: "accountCode",
          operator: "in",
          value: ["7000", "7100", "8000", "8100"],
        }, // Adjustments, write-offs
      ],
      actions: [
        { type: "require_guardian_check", guardianType: "phoenix" },
        { type: "require_manual_review" },
      ],
      priority: 1,
      enabled: true,
      createdAt: new Date(),
    },
    {
      id: "rule-4-consolidation-entries",
      name: "Consolidation Entries",
      entityId: "all",
      conditions: [
        {
          field: "transactionType",
          operator: "equals",
          value: "consolidation_adjustment",
        },
      ],
      actions: [
        { type: "require_guardian_check", guardianType: "argus" },
        { type: "require_level", approvalLevel: 2 },
        { type: "require_approver", approverRole: "controller" },
      ],
      priority: 1,
      enabled: true,
      createdAt: new Date(),
    },
    {
      id: "rule-5-auto-approve-small",
      name: "Auto-Approve Small Expenses",
      entityId: "all",
      conditions: [
        { field: "amount", operator: "lte", value: 500 },
        {
          field: "transactionType",
          operator: "equals",
          value: "invoice_entry",
        },
      ],
      actions: [
        { type: "auto_approve" },
        { type: "require_guardian_check", guardianType: "zelda" },
      ],
      priority: 5,
      enabled: true,
      createdAt: new Date(),
    },
  ];

  /**
   * Evaluate transaction against approval rules
   */
  static async evaluateApprovalRequirements(
    transaction: any,
    entityId: string,
    rules?: ApprovalRule[],
  ): Promise<ApprovalRequirement> {
    const applicableRules = (rules || this.defaultRules).filter((rule) => {
      if (!rule.enabled) return false;
      if (rule.entityId !== "all" && rule.entityId !== entityId) return false;

      // Check all conditions
      return rule.conditions.every((condition) => {
        const fieldValue = transaction[condition.field];
        return this.evaluateCondition(fieldValue, condition);
      });
    });

    // Sort by priority and aggregate requirements
    const sortedRules = applicableRules.sort((a, b) => a.priority - b.priority);

    logger.debug("[ApprovalRules] Evaluated rules", {
      transactionId: transaction.id,
      applicableRuleCount: sortedRules.length,
      ruleIds: sortedRules.map((r) => r.id),
    });

    return this.aggregateRequirements(sortedRules, transaction);
  }

  /**
   * Evaluate a single condition
   */
  private static evaluateCondition(
    fieldValue: any,
    condition: RuleCondition,
  ): boolean {
    switch (condition.operator) {
      case "equals":
        return fieldValue === condition.value;
      case "gt":
        return fieldValue > condition.value;
      case "lt":
        return fieldValue < condition.value;
      case "gte":
        return fieldValue >= condition.value;
      case "lte":
        return fieldValue <= condition.value;
      case "in":
        return condition.value.includes(fieldValue);
      case "contains":
        return String(fieldValue).includes(condition.value);
      default:
        return false;
    }
  }

  /**
   * Aggregate all applicable rule actions into approval requirement
   */
  private static aggregateRequirements(
    rules: ApprovalRule[],
    transaction: any,
  ): ApprovalRequirement {
    const requirement: ApprovalRequirement = {
      ruleId: rules[0]?.id || "default",
      approvalLevel: 0,
      requiresGuardianCheck: [],
      requiresManualReview: false,
      canAutoApprove: true,
      escalateAfterHours: 24,
    };

    for (const rule of rules) {
      for (const action of rule.actions) {
        switch (action.type) {
          case "require_approver":
            requirement.approverRole = action.approverRole;
            requirement.canAutoApprove = false;
            break;
          case "require_level":
            requirement.approvalLevel = Math.max(
              requirement.approvalLevel || 0,
              action.approvalLevel || 0,
            );
            requirement.canAutoApprove = false;
            break;
          case "require_guardian_check":
            if (action.guardianType) {
              if (!requirement.requiresGuardianCheck)
                requirement.requiresGuardianCheck = [];
              requirement.requiresGuardianCheck.push(action.guardianType);
            }
            break;
          case "require_manual_review":
            requirement.requiresManualReview = true;
            requirement.canAutoApprove = false;
            break;
          case "auto_approve":
            // Only auto-approve if no conflicting rules
            break;
          case "escalate":
            requirement.escalateAfterHours = action.escalateAfterHours;
            requirement.escalateTo = action.escalateTo;
            break;
        }
      }
    }

    // Don't auto-approve if manual review or Guardian checks required
    if (
      requirement.requiresManualReview ||
      (requirement.requiresGuardianCheck &&
        requirement.requiresGuardianCheck.length > 0)
    ) {
      requirement.canAutoApprove = false;
    }

    return requirement;
  }

  /**
   * Get all approval rules for an entity
   */
  static async getRulesByEntity(entityId: string): Promise<ApprovalRule[]> {
    return this.defaultRules.filter(
      (r) => r.entityId === "all" || r.entityId === entityId,
    );
  }

  /**
   * Create a new approval rule
   */
  static async createRule(
    rule: Omit<ApprovalRule, "id" | "createdAt">,
  ): Promise<ApprovalRule> {
    const newRule: ApprovalRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      createdAt: new Date(),
    };

    this.defaultRules.push(newRule);

    logger.info("[ApprovalRules] Rule created", {
      ruleId: newRule.id,
      ruleName: newRule.name,
    });

    return newRule;
  }

  /**
   * Update an existing rule
   */
  static async updateRule(
    ruleId: string,
    updates: Partial<ApprovalRule>,
  ): Promise<ApprovalRule | null> {
    const ruleIndex = this.defaultRules.findIndex((r) => r.id === ruleId);
    if (ruleIndex === -1) return null;

    const updated = { ...this.defaultRules[ruleIndex], ...updates };
    this.defaultRules[ruleIndex] = updated;

    logger.info("[ApprovalRules] Rule updated", { ruleId });
    return updated;
  }

  /**
   * Delete a rule
   */
  static async deleteRule(ruleId: string): Promise<boolean> {
    const index = this.defaultRules.findIndex((r) => r.id === ruleId);
    if (index === -1) return false;

    this.defaultRules.splice(index, 1);
    logger.info("[ApprovalRules] Rule deleted", { ruleId });
    return true;
  }
}
