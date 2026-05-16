/********************************************************************
 * LUCCCA — BUILDS 22-24
 * Event Management API
 *
 * ENDPOINTS:
 *  - PATCH /event/:id/patch - Apply event changes with approval routing
 *  - GET /event/:id/approvals - Get pending approvals for an event
 *  - POST /approval/:id/approve - Approve a change request (EC only)
 *  - POST /approval/:id/reject - Reject a change request (EC only)
 *********************************************************************/

import express from "express";
import {
  applyEventPatch,
  getPendingApprovals,
  approveChange,
  rejectChange,
  getApprovalRequest,
} from "../lib/apply-event-patch";
import { getOrgContext, getOrgId, getUserId, getUserRole } from "../lib/org-resolver";

const router = express.Router();

/**
 * PATCH /event/:id/patch
 * Apply changes to an event with risk-based approval routing
 *
 * BUILD 22: Inline Editing + Approval Flows
 */
router.patch("/event/:id/patch", async (req, res) => {
  try {
    const eventId = req.params.id;
    const patch = req.body.patch || {};
    const orgContext = getOrgContext(req);
    const userId = getUserId(req) || "anonymous";

    if (!eventId || Object.keys(patch).length === 0) {
      return res.status(400).json({
        error: "Missing eventId or patch data",
      });
    }

    const result = await applyEventPatch(eventId, patch, userId);

    res.json({
      success: true,
      status: result.status,
      approvalId: result.approvalId,
      orgId: orgContext.orgId,
      message:
        result.status === "applied"
          ? "Changes applied successfully"
          : "Changes submitted for approval",
    });
  } catch (err) {
    console.error("[EVENT PATCH ERROR]", err);
    res.status(500).json({
      error: "Failed to apply event patch",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * GET /event/:id/approvals
 * Get pending approvals for a specific event
 */
router.get("/event/:id/approvals", async (req, res) => {
  try {
    const eventId = req.params.id;
    const orgContext = getOrgContext(req);

    const allPending = getPendingApprovals();
    const eventApprovals = allPending.filter((a) => a.eventId === eventId);

    res.json({
      success: true,
      approvals: eventApprovals,
      count: eventApprovals.length,
      orgId: orgContext.orgId,
    });
  } catch (err) {
    console.error("[GET APPROVALS ERROR]", err);
    res.status(500).json({
      error: "Failed to fetch approvals",
    });
  }
});

/**
 * POST /approval/:id/approve
 * Approve a pending change request (EC/Director only)
 */
router.post("/approval/:id/approve", async (req, res) => {
  try {
    const approvalId = req.params.id;
    const orgContext = getOrgContext(req);
    const userId = getUserId(req) || "anonymous";
    const userRole = getUserRole(req) || "user";

    // Check authorization
    if (!["ec", "director", "admin"].includes(userRole.toLowerCase())) {
      return res.status(403).json({
        error: "Unauthorized - EC/Director role required",
      });
    }

    const approval = getApprovalRequest(approvalId);
    if (!approval) {
      return res.status(404).json({
        error: `Approval request ${approvalId} not found`,
      });
    }

    await approveChange(approvalId, userId);

    res.json({
      success: true,
      message: `Approval ${approvalId} granted`,
      approvalId,
      eventId: approval.eventId,
      orgId: orgContext.orgId,
    });
  } catch (err) {
    console.error("[APPROVE ERROR]", err);
    res.status(500).json({
      error: "Failed to approve change",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * POST /approval/:id/reject
 * Reject a pending change request (EC/Director only)
 */
router.post("/approval/:id/reject", async (req, res) => {
  try {
    const approvalId = req.params.id;
    const orgContext = getOrgContext(req);
    const userId = getUserId(req) || "anonymous";
    const userRole = getUserRole(req) || "user";
    const reason = req.body.reason || "No reason provided";

    // Check authorization
    if (!["ec", "director", "admin"].includes(userRole.toLowerCase())) {
      return res.status(403).json({
        error: "Unauthorized - EC/Director role required",
      });
    }

    const approval = getApprovalRequest(approvalId);
    if (!approval) {
      return res.status(404).json({
        error: `Approval request ${approvalId} not found`,
      });
    }

    await rejectChange(approvalId, userId, reason);

    res.json({
      success: true,
      message: `Approval ${approvalId} rejected`,
      approvalId,
      eventId: approval.eventId,
      reason,
      orgId: orgContext.orgId,
    });
  } catch (err) {
    console.error("[REJECT ERROR]", err);
    res.status(500).json({
      error: "Failed to reject change",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * GET /pending-approvals
 * Get all pending approvals across all events (EC/Director dashboard)
 */
router.get("/pending-approvals", async (req, res) => {
  try {
    const orgContext = getOrgContext(req);
    const userRole = getUserRole(req) || "user";

    // Check authorization
    if (!["ec", "director", "admin"].includes(userRole.toLowerCase())) {
      return res.status(403).json({
        error: "Unauthorized - EC/Director role required",
      });
    }

    const approvals = getPendingApprovals();

    res.json({
      success: true,
      approvals,
      count: approvals.length,
      orgId: orgContext.orgId,
    });
  } catch (err) {
    console.error("[GET PENDING APPROVALS ERROR]", err);
    res.status(500).json({
      error: "Failed to fetch pending approvals",
    });
  }
});

export default router;
