/**
 * Chef Approval Workflow
 * Manages approval process for recipe changes shared between outlets
 */

import { supabase } from "@/lib/auth-service";

export enum ApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  DRAFT = "draft",
}

export interface ApprovalRequest {
  id: string;
  recipeId: string;
  sourceOutletId: string;
  targetOutletId: string;
  requestedBy: string;
  requestedByUsername: string;
  requestedAt: number;
  status: ApprovalStatus;
  approvedBy?: string;
  approvedByUsername?: string;
  approvedAt?: number;
  rejectionReason?: string;
  changes: {
    name?: string;
    description?: string;
    ingredients?: Array<{ id: string; name: string; quantity: number; unit: string }>;
    instructions?: string;
    yield?: number;
    costPerServing?: number;
  };
  comments?: ApprovalComment[];
}

export interface ApprovalComment {
  id: string;
  authorId: string;
  authorUsername: string;
  content: string;
  createdAt: number;
  isChef: boolean;
}

/**
 * Create approval request for recipe changes
 */
export async function createApprovalRequest(
  recipeId: string,
  sourceOutletId: string,
  targetOutletId: string,
  userId: string,
  username: string,
  changes: ApprovalRequest["changes"],
): Promise<{ success: boolean; data?: ApprovalRequest; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    const { data, error } = await supabase
      .from("approval_requests")
      .insert({
        recipe_id: recipeId,
        source_outlet_id: sourceOutletId,
        target_outlet_id: targetOutletId,
        requested_by: userId,
        requested_by_username: username,
        requested_at: new Date().toISOString(),
        status: ApprovalStatus.PENDING,
        changes,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: mapApprovalRequest(data),
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get pending approvals for outlet
 */
export async function getPendingApprovalsForOutlet(
  outletId: string,
): Promise<ApprovalRequest[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("target_outlet_id", outletId)
      .eq("status", ApprovalStatus.PENDING)
      .order("requested_at", { ascending: false });

    if (error) {
      console.error("Error fetching approvals:", error);
      return [];
    }

    return data?.map(mapApprovalRequest) || [];
  } catch (error) {
    console.error("Error fetching approvals:", error);
    return [];
  }
}

/**
 * Get approval requests for user (as requester)
 */
export async function getApprovalRequestsForUser(
  userId: string,
): Promise<ApprovalRequest[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("requested_by", userId)
      .order("requested_at", { ascending: false });

    if (error) {
      console.error("Error fetching approvals:", error);
      return [];
    }

    return data?.map(mapApprovalRequest) || [];
  } catch (error) {
    console.error("Error fetching approvals:", error);
    return [];
  }
}

/**
 * Approve recipe change request
 */
export async function approveRequest(
  requestId: string,
  approverId: string,
  approverUsername: string,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    const { error } = await supabase
      .from("approval_requests")
      .update({
        status: ApprovalStatus.APPROVED,
        approved_by: approverId,
        approved_by_username: approverUsername,
        approved_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Create notification for requester
    await createNotification(
      requestId,
      "approval_approved",
      `Your recipe change has been approved by ${approverUsername}`,
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Reject recipe change request
 */
export async function rejectRequest(
  requestId: string,
  rejecterId: string,
  rejectionReason: string,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    const { error } = await supabase
      .from("approval_requests")
      .update({
        status: ApprovalStatus.REJECTED,
        rejection_reason: rejectionReason,
        approved_by: rejecterId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Create notification
    await createNotification(
      requestId,
      "approval_rejected",
      `Your recipe change was rejected: ${rejectionReason}`,
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Add comment to approval request
 */
export async function addApprovalComment(
  requestId: string,
  authorId: string,
  authorUsername: string,
  content: string,
  isChef: boolean = false,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    const { error } = await supabase
      .from("approval_comments")
      .insert({
        approval_request_id: requestId,
        author_id: authorId,
        author_username: authorUsername,
        content,
        is_chef: isChef,
        created_at: new Date().toISOString(),
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get approval request with comments
 */
export async function getApprovalRequest(
  requestId: string,
): Promise<ApprovalRequest | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data: request, error: requestError } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      return null;
    }

    const { data: comments, error: commentsError } = await supabase
      .from("approval_comments")
      .select("*")
      .eq("approval_request_id", requestId)
      .order("created_at", { ascending: true });

    const mappedRequest = mapApprovalRequest(request);

    if (!commentsError && comments) {
      mappedRequest.comments = comments.map((c) => ({
        id: c.id,
        authorId: c.author_id,
        authorUsername: c.author_username,
        content: c.content,
        createdAt: new Date(c.created_at).getTime(),
        isChef: c.is_chef,
      }));
    }

    return mappedRequest;
  } catch (error) {
    console.error("Error fetching approval request:", error);
    return null;
  }
}

/**
 * Create notification (for future integration)
 */
async function createNotification(
  referenceId: string,
  type: string,
  message: string,
): Promise<void> {
  if (!supabase) {
    return;
  }

  try {
    await supabase.from("notifications").insert({
      reference_id: referenceId,
      type,
      message,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

/**
 * Map database record to ApprovalRequest
 */
function mapApprovalRequest(record: any): ApprovalRequest {
  return {
    id: record.id,
    recipeId: record.recipe_id,
    sourceOutletId: record.source_outlet_id,
    targetOutletId: record.target_outlet_id,
    requestedBy: record.requested_by,
    requestedByUsername: record.requested_by_username,
    requestedAt: new Date(record.requested_at).getTime(),
    status: record.status,
    approvedBy: record.approved_by,
    approvedByUsername: record.approved_by_username,
    approvedAt: record.approved_at
      ? new Date(record.approved_at).getTime()
      : undefined,
    rejectionReason: record.rejection_reason,
    changes: record.changes || {},
    comments: [],
  };
}

/**
 * Get approval statistics for outlet
 */
export async function getApprovalStats(outletId: string) {
  if (!supabase) {
    return { pending: 0, approved: 0, rejected: 0 };
  }

  try {
    const { data, error } = await supabase
      .from("approval_requests")
      .select("status")
      .eq("target_outlet_id", outletId);

    if (error) {
      return { pending: 0, approved: 0, rejected: 0 };
    }

    return {
      pending: data?.filter((r) => r.status === ApprovalStatus.PENDING).length || 0,
      approved: data?.filter((r) => r.status === ApprovalStatus.APPROVED).length || 0,
      rejected: data?.filter((r) => r.status === ApprovalStatus.REJECTED).length || 0,
    };
  } catch (error) {
    return { pending: 0, approved: 0, rejected: 0 };
  }
}
