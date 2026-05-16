/**
 * EchoAurum Approval Workflows API
 * Routes for approval queue, rules, escalation, and delegation
 */

import { Router, Request, Response } from "express";
import { jwtAuthMiddleware } from "../middleware/auth-jwt";
import { logger } from "../lib/logger";
import { ApprovalRulesEngine } from "../services/approvalRulesEngine";
import { ApprovalEscalationEngine } from "../services/approvalEscalationEngine";
import { ApprovalDelegationEngine } from "../services/approvalDelegationEngine";
import { GuardianAI } from "../services/guardianAI";
import { AurumDatabaseService } from "../services/aurum-database-service";
import { writeAudit } from "../lib/audit-log";

export const aurumApprovalsRouter = Router();

// Require authentication
aurumApprovalsRouter.use(jwtAuthMiddleware);

/**
 * GET /api/aurum/approvals/queue
 * Get pending approvals for current user
 */
aurumApprovalsRouter.get("/queue", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const orgId = req.user?.org_id;
    const { status = "pending", limit = 50, offset = 0 } = req.query;

    if (!orgId) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const normalizedStatus = String(status || "pending");
    const statusToPosting: Record<string, "requires_approval" | "posted" | "failed" | null> = {
      pending: "requires_approval",
      requires_approval: "requires_approval",
      approved: "posted",
      posted: "posted",
      rejected: "failed",
      failed: "failed",
      all: null,
    };

    const postingStatus = statusToPosting[normalizedStatus] ?? "requires_approval";

    const payrollPostings = await AurumDatabaseService.listPayrollPostings({
      org_id: orgId,
      status: postingStatus ?? undefined,
      limit: Number(limit),
      offset: Number(offset),
    });

    const approvals = payrollPostings.map((p) => {
      const total = p.wages + p.taxes + p.benefits;
      return {
        id: p.id,
        type: "payroll_accrual",
        description: `Payroll accrual — outlet ${p.outlet_id} (${p.period_start} to ${p.period_end})`,
        amount: total,
        requesterName: "payroll-system",
        createdAt: new Date(p.createdAt),
        status: p.status === "requires_approval" ? "pending" : p.status,
        assignedTo: userId,
        metadata: {
          outlet_id: p.outlet_id,
          payroll_run_id: p.payroll_run_id,
          period_start: p.period_start,
          period_end: p.period_end,
          posting_status: p.status,
        },
      };
    });

    res.json({
      approvals,
      total: approvals.length,
      offset,
      limit,
    });
  } catch (error) {
    logger.error("[Approvals] Queue fetch error", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Failed to fetch approval queue" });
  }
});

/**
 * POST /api/aurum/approvals/:approvalId/approve
 * Approve a pending approval
 */
aurumApprovalsRouter.post(
  "/:approvalId/approve",
  async (req: Request, res: Response) => {
    try {
      const { approvalId } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;
      const orgId = req.user?.org_id;

      if (!orgId) {
        return res.status(401).json({ error: "UNAUTHORIZED" });
      }

      const updated = await AurumDatabaseService.updatePayrollPostingStatusById({
        org_id: orgId,
        posting_id: approvalId,
        status: "posted",
        reason: reason || "Approved in EchoAurum approvals queue",
        actor: userId,
      });

      if (!updated) {
        return res.status(404).json({ error: "NOT_FOUND" });
      }

      writeAudit({
        actor: userId || "unknown",
        action: "echoaurum.payroll.approved",
        target: approvalId,
        severity: "warn",
        details: reason || "Payroll posting approved",
      });

      logger.info("[Approvals] Payroll approval granted", {
        approvalId,
        approver: userId,
        reason,
      });

      res.json({
        success: true,
        approvalId,
        approvedAt: new Date(),
        approvedBy: userId,
        posting: updated,
      });
    } catch (error) {
      logger.error("[Approvals] Approval error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to approve" });
    }
  },
);

/**
 * POST /api/aurum/approvals/:approvalId/reject
 * Reject a pending approval
 */
aurumApprovalsRouter.post(
  "/:approvalId/reject",
  async (req: Request, res: Response) => {
    try {
      const { approvalId } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;
      const orgId = req.user?.org_id;

      if (!orgId) {
        return res.status(401).json({ error: "UNAUTHORIZED" });
      }

      const updated = await AurumDatabaseService.updatePayrollPostingStatusById({
        org_id: orgId,
        posting_id: approvalId,
        status: "failed",
        error: reason || "Rejected in EchoAurum approvals queue",
        reason: reason || "Rejected in EchoAurum approvals queue",
        actor: userId,
      });

      if (!updated) {
        return res.status(404).json({ error: "NOT_FOUND" });
      }

      writeAudit({
        actor: userId || "unknown",
        action: "echoaurum.payroll.rejected",
        target: approvalId,
        severity: "danger",
        details: reason || "Payroll posting rejected",
      });

      logger.info("[Approvals] Payroll approval rejected", {
        approvalId,
        rejectedBy: userId,
        reason,
      });

      res.json({
        success: true,
        approvalId,
        rejectedAt: new Date(),
        rejectedBy: userId,
        posting: updated,
      });
    } catch (error) {
      logger.error("[Approvals] Rejection error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to reject" });
    }
  },
);

/**
 * POST /api/aurum/approvals/:approvalId/delegate
 * Delegate an approval to another user
 */
aurumApprovalsRouter.post(
  "/:approvalId/delegate",
  async (req: Request, res: Response) => {
    try {
      const { approvalId } = req.params;
      const { delegateTo, reason, expiresAt } = req.body;
      const userId = req.user?.id;

      const delegation = await ApprovalDelegationEngine.delegateApproval(
        approvalId,
        userId,
        delegateTo,
        reason,
        expiresAt ? new Date(expiresAt) : undefined,
      );

      if (!delegation) {
        return res.status(400).json({ error: "Delegation not allowed" });
      }

      res.json({
        success: true,
        delegation,
      });
    } catch (error) {
      logger.error("[Approvals] Delegation error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to delegate" });
    }
  },
);

/**
 * GET /api/aurum/approvals/rules
 * Get all approval rules for entity
 */
aurumApprovalsRouter.get("/rules", async (req: Request, res: Response) => {
  try {
    const { entityId } = req.query as { entityId: string };

    const rules = await ApprovalRulesEngine.getRulesByEntity(entityId);

    res.json({
      rules,
      total: rules.length,
    });
  } catch (error) {
    logger.error("[Approvals] Rules fetch error", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Failed to fetch rules" });
  }
});

/**
 * POST /api/aurum/approvals/rules
 * Create a new approval rule
 */
aurumApprovalsRouter.post("/rules", async (req: Request, res: Response) => {
  try {
    const rule = await ApprovalRulesEngine.createRule(req.body);

    res.json({
      success: true,
      rule,
    });
  } catch (error) {
    logger.error("[Approvals] Rule creation error", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: "Failed to create rule" });
  }
});

/**
 * GET /api/aurum/approvals/escalations
 * Get escalation policies
 */
aurumApprovalsRouter.get(
  "/escalations",
  async (req: Request, res: Response) => {
    try {
      const { level } = req.query;

      if (level) {
        const policy = ApprovalEscalationEngine.getPolicyForLevel(
          Number(level),
        );
        return res.json({ policy });
      }

      res.json({ message: "Escalation policies endpoint" });
    } catch (error) {
      logger.error("[Approvals] Escalation fetch error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to fetch escalations" });
    }
  },
);

/**
 * POST /api/aurum/approvals/check-escalations
 * Check and process escalations for pending approvals
 */
aurumApprovalsRouter.post(
  "/check-escalations",
  async (req: Request, res: Response) => {
    try {
      const { approvals } = req.body;

      const escalations =
        await ApprovalEscalationEngine.escalatePendingApprovals(approvals);

      res.json({
        success: true,
        escalationsProcessed: escalations.length,
        escalations,
      });
    } catch (error) {
      logger.error("[Approvals] Escalation check error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to process escalations" });
    }
  },
);

/**
 * POST /api/aurum/approvals/guardian-check
 * Run Guardian AI checks on a transaction
 */
aurumApprovalsRouter.post(
  "/guardian-check",
  async (req: Request, res: Response) => {
    try {
      const { transaction, entityId } = req.body;
      const userId = req.user?.id || "unknown";

      if (!transaction) {
        return res.status(400).json({ error: "Transaction required" });
      }

      const guardianResult = await GuardianAI.checkTransaction(
        transaction,
        entityId,
        userId,
      );

      res.json({
        success: true,
        guardianResult,
      });
    } catch (error) {
      logger.error("[Guardian] Check error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Guardian check failed" });
    }
  },
);

/**
 * GET /api/aurum/approvals/guardian-result/:transactionId
 * Get Guardian check result for a transaction
 */
aurumApprovalsRouter.get(
  "/guardian-result/:transactionId",
  async (req: Request, res: Response) => {
    try {
      const { transactionId } = req.params;

      const result = await GuardianAI.getCheckResult(transactionId);

      if (!result) {
        return res.status(404).json({ error: "Guardian result not found" });
      }

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      logger.error("[Guardian] Result fetch error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to fetch Guardian result" });
    }
  },
);

/**
 * GET /api/aurum/approvals/guardian-audit-trail
 * Get immutable audit trail from Odin Guardian
 */
aurumApprovalsRouter.get(
  "/guardian-audit-trail",
  async (req: Request, res: Response) => {
    try {
      const { limit = "100" } = req.query;

      const auditTrail = await GuardianAI.getAuditTrail(Number(limit));

      res.json({
        success: true,
        auditTrail,
        total: auditTrail.length,
      });
    } catch (error) {
      logger.error("[Guardian] Audit trail fetch error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to fetch audit trail" });
    }
  },
);

/**
 * POST /api/aurum/approvals/verify-immutability/:transactionId
 * Verify transaction immutability (Odin Guardian)
 */
aurumApprovalsRouter.post(
  "/verify-immutability/:transactionId",
  async (req: Request, res: Response) => {
    try {
      const { transactionId } = req.params;

      const isImmutable = await GuardianAI.verifyImmutability(transactionId);

      res.json({
        success: true,
        transactionId,
        isImmutable,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("[Guardian] Immutability verification error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to verify immutability" });
    }
  },
);

/**
 * POST /api/aurum/approvals/:approvalId/approve-with-guardian
 * Approve with Guardian check results
 */
aurumApprovalsRouter.post(
  "/:approvalId/approve-with-guardian",
  async (req: Request, res: Response) => {
    try {
      const { approvalId } = req.params;
      const { reason, guardianResult, autoPost = false } = req.body;
      const userId = req.user?.id;

      if (!guardianResult) {
        return res
          .status(400)
          .json({ error: "Guardian check result required" });
      }

      const passed =
        typeof guardianResult.passed === "boolean"
          ? guardianResult.passed
          : Boolean(guardianResult.canAutoPost) && Number(guardianResult.overallRiskScore ?? 100) < 50;

      const canAutoPost =
        autoPost &&
        Boolean(guardianResult.canAutoPost) &&
        Number(guardianResult.overallRiskScore ?? 100) < 25;

      logger.info("[Approvals] Approval with Guardian", {
        approvalId,
        approver: userId,
        reason,
        guardianRiskScore: guardianResult.overallRiskScore,
        canAutoPost,
        autoPostAttempted: autoPost,
      });

      const orgId = req.user?.org_id;

      if (!orgId) {
        return res.status(401).json({ error: "UNAUTHORIZED" });
      }

      const updated = canAutoPost
        ? await AurumDatabaseService.updatePayrollPostingStatusById({
            org_id: orgId,
            posting_id: approvalId,
            status: "posted",
            reason: reason || "Approved with Guardian",
            actor: userId,
          })
        : null;

      if (canAutoPost && !updated) {
        return res.status(404).json({ error: "NOT_FOUND" });
      }

      writeAudit({
        actor: userId || "unknown",
        action: canAutoPost ? "echoaurum.payroll.approved.guardian" : "echoaurum.payroll.review.guardian",
        target: approvalId,
        severity: canAutoPost ? "warn" : "info",
        details: reason || "Guardian review",
      });

      res.json({
        success: true,
        approvalId,
        approvedAt: new Date(),
        approvedBy: userId,
        guardianApproved: passed,
        overallRiskScore: Number(guardianResult.overallRiskScore ?? 100),
        canAutoPost,
        requiresManualReview: !canAutoPost && Boolean(guardianResult.requiresManualApproval),
        posting: updated,
      });
    } catch (error) {
      logger.error("[Approvals] Guardian approval error", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Failed to approve with Guardian check" });
    }
  },
);
