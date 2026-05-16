/********************************************************************
 * LUCCCA — BUILD 22
 * Apply event patch with approvals
 *
 * BEHAVIOR:
 *  - If changes are low-risk → apply immediately
 *  - If high-risk → route to EC for approval
 *  - Always log + notify
 *********************************************************************/

import { writeAudit } from "./audit-log";
import { notify } from "./notify";

// In-memory approval queue
// Production: move to database
export interface ApprovalRequest {
  id: string;
  eventId: string;
  userId: string;
  patch: Record<string, any>;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

const approvalQueue: ApprovalRequest[] = [];

/**
 * Apply an event patch with risk-based approval routing
 */
export async function applyEventPatch(
  eventId: string,
  patch: Record<string, any>,
  userId: string
): Promise<{ status: "applied" | "pending-approval"; approvalId?: string }> {
  const criticalKeys = ["headcount", "start", "end", "space"];
  const changed = Object.keys(patch);

  const isCritical = changed.some((k) => criticalKeys.includes(k));

  if (!isCritical) {
    // Safe apply - low-risk changes
    await savePatch(eventId, patch);

    writeAudit({
      actor: userId,
      action: "event.updated",
      target: eventId,
      details: JSON.stringify(patch),
      severity: "info",
    });

    notify({
      type: "event",
      action: "updated",
      message: `Event ${eventId} updated by ${userId}`,
      severity: "info",
      source: userId,
      target: eventId,
      metadata: { patch },
    });

    return { status: "applied" };
  }

  // Critical changes - route to approval
  const approvalId = await queueApproval(eventId, patch, userId);

  writeAudit({
    actor: userId,
    action: "event.change-requested",
    target: eventId,
    details: JSON.stringify({ patch, approvalId }),
    severity: "warn",
  });

  notify({
    type: "event",
    action: "approval-requested",
    message: `Approval requested by ${userId} for event ${eventId}: ${changed.join(", ")}`,
    severity: "warn",
    source: userId,
    target: eventId,
    metadata: { patch, approvalId },
  });

  return { status: "pending-approval", approvalId };
}

/**
 * Save patch to event (placeholder - would update database)
 */
async function savePatch(
  eventId: string,
  patch: Record<string, any>
): Promise<void> {
  // TODO: Update event in database
  // For now, log the update
  console.log(`[EVENT PATCH] ${eventId}:`, patch);
}

/**
 * Queue an approval request for critical changes
 */
async function queueApproval(
  eventId: string,
  patch: Record<string, any>,
  userId: string
): Promise<string> {
  const approvalId = `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const request: ApprovalRequest = {
    id: approvalId,
    eventId,
    userId,
    patch,
    status: "pending",
    createdAt: Date.now(),
  };

  approvalQueue.push(request);

  console.log(`[APPROVAL QUEUED] ${approvalId} for event ${eventId}`);

  return approvalId;
}

/**
 * Get pending approvals (for EC dashboard)
 */
export function getPendingApprovals(): ApprovalRequest[] {
  return approvalQueue.filter((a) => a.status === "pending");
}

/**
 * Approve a change request (EC/Director only)
 */
export async function approveChange(
  approvalId: string,
  approverUserId: string
): Promise<void> {
  const request = approvalQueue.find((a) => a.id === approvalId);

  if (!request) {
    throw new Error(`Approval request ${approvalId} not found`);
  }

  if (request.status !== "pending") {
    throw new Error(
      `Approval request ${approvalId} is already ${request.status}`
    );
  }

  // Apply the patch
  await savePatch(request.eventId, request.patch);

  // Update approval status
  request.status = "approved";
  request.resolvedAt = Date.now();
  request.resolvedBy = approverUserId;

  writeAudit({
    actor: approverUserId,
    action: "event.change-approved",
    target: request.eventId,
    details: JSON.stringify({ approvalId, patch: request.patch }),
    severity: "info",
  });

  notify({
    type: "event",
    action: "approved",
    message: `Event ${request.eventId} changes approved by ${approverUserId}`,
    severity: "info",
    source: approverUserId,
    target: request.eventId,
    metadata: { approvalId, patch: request.patch },
  });

  console.log(`[APPROVAL GRANTED] ${approvalId}`);
}

/**
 * Reject a change request (EC/Director only)
 */
export async function rejectChange(
  approvalId: string,
  rejectorUserId: string,
  reason?: string
): Promise<void> {
  const request = approvalQueue.find((a) => a.id === approvalId);

  if (!request) {
    throw new Error(`Approval request ${approvalId} not found`);
  }

  if (request.status !== "pending") {
    throw new Error(
      `Approval request ${approvalId} is already ${request.status}`
    );
  }

  // Update approval status
  request.status = "rejected";
  request.resolvedAt = Date.now();
  request.resolvedBy = rejectorUserId;

  writeAudit({
    actor: rejectorUserId,
    action: "event.change-rejected",
    target: request.eventId,
    details: JSON.stringify({ approvalId, reason }),
    severity: "warn",
  });

  notify({
    type: "event",
    action: "rejected",
    message: `Event ${request.eventId} changes rejected by ${rejectorUserId}${reason ? `: ${reason}` : ""}`,
    severity: "warn",
    source: rejectorUserId,
    target: request.eventId,
    metadata: { approvalId, reason },
  });

  console.log(`[APPROVAL REJECTED] ${approvalId}`);
}

/**
 * Get approval request by ID
 */
export function getApprovalRequest(approvalId: string): ApprovalRequest | undefined {
  return approvalQueue.find((a) => a.id === approvalId);
}
