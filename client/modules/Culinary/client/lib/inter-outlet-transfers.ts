/**
 * Inter-Outlet Transfer System
 * Manages inventory transfers between outlets
 */

import { supabase } from "@/lib/auth-service";
import {
  canPerformInterOutletTransfer,
  type AccessContext,
} from "@/lib/outlet-data-isolation";

export enum TransferStatus {
  DRAFT = "draft",
  REQUESTED = "requested",
  APPROVED = "approved",
  IN_TRANSIT = "in_transit",
  RECEIVED = "received",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

export interface InterOutletTransfer {
  id: string;
  fromOutletId: string;
  toOutletId: string;
  inventoryItemId: string;
  itemName: string;
  itemSku: string;
  quantity: number;
  unit: string;
  status: TransferStatus;
  reason?: string;
  requestedBy: string;
  requestedAt: number;
  approvedBy?: string;
  approvedAt?: number;
  receivedBy?: string;
  receivedAt?: number;
  rejectionReason?: string;
  trackingNumber?: string;
  estimatedDelivery?: number;
  actualDelivery?: number;
  comments?: TransferComment[];
  createdAt: number;
  updatedAt: number;
}

export interface TransferComment {
  id: string;
  transferId: string;
  authorId: string;
  authorUsername: string;
  content: string;
  createdAt: number;
}

export interface TransferSummary {
  totalOutgoing: number;
  totalIncoming: number;
  activeTransfers: number;
  pendingApprovals: number;
  recentTransfers: InterOutletTransfer[];
}

/**
 * Create inter-outlet transfer request
 */
export async function createTransferRequest(
  fromOutletId: string,
  toOutletId: string,
  inventoryItemId: string,
  itemName: string,
  itemSku: string,
  quantity: number,
  unit: string,
  reason: string,
  requestedBy: string,
  context: AccessContext,
): Promise<{ success: boolean; data?: InterOutletTransfer; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  // Check permissions
  if (!canPerformInterOutletTransfer(context, { fromOutletId, toOutletId, itemId: inventoryItemId })) {
    return { success: false, error: "Unauthorized to transfer between these outlets" };
  }

  try {
    const { data, error } = await supabase
      .from("inter_outlet_transfers")
      .insert({
        from_outlet_id: fromOutletId,
        to_outlet_id: toOutletId,
        inventory_item_id: inventoryItemId,
        item_name: itemName,
        item_sku: itemSku,
        quantity,
        unit,
        status: TransferStatus.DRAFT,
        reason,
        requested_by: requestedBy,
        requested_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: mapTransfer(data),
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Submit transfer for approval
 */
export async function submitTransferForApproval(
  transferId: string,
  submittedBy: string,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    const { error } = await supabase
      .from("inter_outlet_transfers")
      .update({
        status: TransferStatus.REQUESTED,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transferId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Approve transfer request
 */
export async function approveTransfer(
  transferId: string,
  approvedBy: string,
  trackingNumber?: string,
  estimatedDelivery?: number,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    const { data: transfer } = await supabase
      .from("inter_outlet_transfers")
      .select("*")
      .eq("id", transferId)
      .single();

    if (!transfer) {
      return { success: false, error: "Transfer not found" };
    }

    // Deduct from source outlet
    const { data: item } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("id", transfer.inventory_item_id)
      .eq("outlet_id", transfer.from_outlet_id)
      .single();

    if (!item) {
      return { success: false, error: "Item not found in source outlet" };
    }

    if (item.quantity < transfer.quantity) {
      return { success: false, error: "Insufficient inventory in source outlet" };
    }

    // Update source inventory
    const { error: sourceError } = await supabase
      .from("inventory_items")
      .update({
        quantity: item.quantity - transfer.quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (sourceError) {
      return { success: false, error: sourceError.message };
    }

    // Update transfer status
    const { error: transferError } = await supabase
      .from("inter_outlet_transfers")
      .update({
        status: TransferStatus.APPROVED,
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        tracking_number: trackingNumber,
        estimated_delivery:
          estimatedDelivery ? new Date(estimatedDelivery).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transferId);

    if (transferError) {
      return { success: false, error: transferError.message };
    }

    // Log transaction
    await logTransferTransaction(
      transfer.from_outlet_id,
      transferId,
      "approved",
      approvedBy,
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Reject transfer request
 */
export async function rejectTransfer(
  transferId: string,
  rejectedBy: string,
  rejectionReason: string,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    const { error } = await supabase
      .from("inter_outlet_transfers")
      .update({
        status: TransferStatus.REJECTED,
        rejection_reason: rejectionReason,
        approved_by: rejectedBy,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", transferId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log transaction
    await logTransferTransaction(
      transferId,
      transferId,
      "rejected",
      rejectedBy,
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Mark transfer as in transit
 */
export async function markTransitInProgress(
  transferId: string,
  shippedBy: string,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    const { error } = await supabase
      .from("inter_outlet_transfers")
      .update({
        status: TransferStatus.IN_TRANSIT,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transferId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Receive transfer at destination outlet
 */
export async function receiveTransfer(
  transferId: string,
  receivedBy: string,
  actualQuantity?: number,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    const { data: transfer } = await supabase
      .from("inter_outlet_transfers")
      .select("*")
      .eq("id", transferId)
      .single();

    if (!transfer) {
      return { success: false, error: "Transfer not found" };
    }

    const quantityToAdd = actualQuantity || transfer.quantity;

    // Get or create inventory item at destination
    let { data: destItem } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("outlet_id", transfer.to_outlet_id)
      .eq("sku", transfer.item_sku)
      .single();

    if (destItem) {
      // Update existing
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({
          quantity: destItem.quantity + quantityToAdd,
          updated_at: new Date().toISOString(),
        })
        .eq("id", destItem.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      // Create new
      const { error: createError } = await supabase
        .from("inventory_items")
        .insert({
          outlet_id: transfer.to_outlet_id,
          sku: transfer.item_sku,
          name: transfer.item_name,
          category: "Transferred",
          quantity: quantityToAdd,
          unit: transfer.unit,
          minimum_stock: 0,
          maximum_stock: 1000,
          unit_cost: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (createError) {
        return { success: false, error: createError.message };
      }
    }

    // Update transfer status
    const { error: transferError } = await supabase
      .from("inter_outlet_transfers")
      .update({
        status: TransferStatus.RECEIVED,
        received_by: receivedBy,
        received_at: new Date().toISOString(),
        actual_delivery: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", transferId);

    if (transferError) {
      return { success: false, error: transferError.message };
    }

    // Log transaction
    await logTransferTransaction(
      transfer.to_outlet_id,
      transferId,
      "received",
      receivedBy,
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get transfer requests for outlet
 */
export async function getOutletTransfers(
  outletId: string,
  direction: "incoming" | "outgoing" | "all" = "all",
  status?: TransferStatus,
): Promise<InterOutletTransfer[]> {
  if (!supabase) {
    return [];
  }

  try {
    let query = supabase.from("inter_outlet_transfers").select("*");

    if (direction === "incoming") {
      query = query.eq("to_outlet_id", outletId);
    } else if (direction === "outgoing") {
      query = query.eq("from_outlet_id", outletId);
    } else {
      query = query.or(
        `from_outlet_id.eq.${outletId},to_outlet_id.eq.${outletId}`,
      );
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("requested_at", {
      ascending: false,
    });

    if (error) {
      return [];
    }

    return data?.map(mapTransfer) || [];
  } catch (error) {
    return [];
  }
}

/**
 * Get transfer summary for outlet
 */
export async function getTransferSummary(
  outletId: string,
): Promise<TransferSummary> {
  if (!supabase) {
    return {
      totalOutgoing: 0,
      totalIncoming: 0,
      activeTransfers: 0,
      pendingApprovals: 0,
      recentTransfers: [],
    };
  }

  try {
    const [outgoing, incoming, active, pending, recent] = await Promise.all([
      getOutletTransfers(outletId, "outgoing"),
      getOutletTransfers(outletId, "incoming"),
      getOutletTransfers(outletId, "all", TransferStatus.IN_TRANSIT),
      getOutletTransfers(outletId, "incoming", TransferStatus.REQUESTED),
      getOutletTransfers(outletId, "all"),
    ]);

    return {
      totalOutgoing: outgoing.length,
      totalIncoming: incoming.length,
      activeTransfers: active.length,
      pendingApprovals: pending.length,
      recentTransfers: recent.slice(0, 5),
    };
  } catch (error) {
    return {
      totalOutgoing: 0,
      totalIncoming: 0,
      activeTransfers: 0,
      pendingApprovals: 0,
      recentTransfers: [],
    };
  }
}

/**
 * Add comment to transfer
 */
export async function addTransferComment(
  transferId: string,
  authorId: string,
  authorUsername: string,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Supabase is not configured" };
  }

  try {
    const { error } = await supabase
      .from("transfer_comments")
      .insert({
        transfer_id: transferId,
        author_id: authorId,
        author_username: authorUsername,
        content,
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
 * Log transfer transaction
 */
async function logTransferTransaction(
  outletId: string,
  transferId: string,
  action: string,
  actedBy: string,
): Promise<void> {
  if (!supabase) return;

  try {
    await supabase.from("audit_logs").insert({
      outlet_id: outletId,
      user_id: actedBy,
      action: `transfer_${action}`,
      resource_type: "inter_outlet_transfer",
      resource_id: transferId,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error logging transfer:", error);
  }
}

/**
 * Map database record
 */
function mapTransfer(record: any): InterOutletTransfer {
  return {
    id: record.id,
    fromOutletId: record.from_outlet_id,
    toOutletId: record.to_outlet_id,
    inventoryItemId: record.inventory_item_id,
    itemName: record.item_name,
    itemSku: record.item_sku,
    quantity: record.quantity,
    unit: record.unit,
    status: record.status,
    reason: record.reason,
    requestedBy: record.requested_by,
    requestedAt: new Date(record.requested_at).getTime(),
    approvedBy: record.approved_by,
    approvedAt: record.approved_at
      ? new Date(record.approved_at).getTime()
      : undefined,
    receivedBy: record.received_by,
    receivedAt: record.received_at
      ? new Date(record.received_at).getTime()
      : undefined,
    rejectionReason: record.rejection_reason,
    trackingNumber: record.tracking_number,
    estimatedDelivery: record.estimated_delivery
      ? new Date(record.estimated_delivery).getTime()
      : undefined,
    actualDelivery: record.actual_delivery
      ? new Date(record.actual_delivery).getTime()
      : undefined,
    createdAt: new Date(record.created_at).getTime(),
    updatedAt: new Date(record.updated_at).getTime(),
  };
}
