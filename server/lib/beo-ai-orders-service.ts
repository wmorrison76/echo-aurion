/**
 * BEO AI Orders Service
 *
 * Manages AI-generated orders for BEO including:
 * - Order editing and approval workflows
 * - Chef feedback collection and AI training
 * - Confidence score tracking
 */

import { supabase } from "./supabase";
import { logger } from "./logger";

export interface AIOrderUpdate {
  quantity?: number;
  unit?: string;
  approved?: boolean;
  feedback?: string;
  approvedAt?: string;
  approvedBy?: string;
}

class BEOAIOrdersService {
  /**
   * Update an AI-generated order
   */
  async updateAIOrder(
    beoId: string,
    orderId: string,
    orgId: string,
    update: AIOrderUpdate,
    userId?: string,
  ) {
    try {
      logger.info("[BEO-AI-ORDERS] Updating order:", {
        beoId,
        orderId,
        update,
      });

      // Fetch current order
      const { data: currentOrder, error: fetchError } = await supabase
        .from("beo_ai_orders")
        .select("*")
        .eq("id", orderId)
        .eq("beo_id", beoId)
        .eq("org_id", orgId)
        .single();

      if (fetchError || !currentOrder) {
        throw new Error(`AI order not found: ${orderId}`);
      }

      // Prepare update payload
      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };

      if (update.quantity !== undefined)
        updatePayload.quantity = update.quantity;
      if (update.unit !== undefined) updatePayload.unit = update.unit;
      if (update.feedback !== undefined)
        updatePayload.chef_feedback = update.feedback;

      if (update.approved !== undefined) {
        updatePayload.approved = update.approved;
        updatePayload.approved_at = update.approved ? new Date().toISOString() : null;
        updatePayload.approved_by = userId || null;
      }

      // Update in database
      const { data: updated, error: updateError } = await supabase
        .from("beo_ai_orders")
        .update(updatePayload)
        .eq("id", orderId)
        .select();

      if (updateError) {
        throw new Error(`Failed to update order: ${updateError.message}`);
      }

      logger.info("[BEO-AI-ORDERS] Order updated successfully:", {
        orderId,
        approved: update.approved,
      });

      return {
        success: true,
        data: updated?.[0],
      };
    } catch (err) {
      logger.error("[BEO-AI-ORDERS] Update error:", err);
      throw err;
    }
  }

  /**
   * Approve an AI order
   */
  async approveAIOrder(
    beoId: string,
    orderId: string,
    orgId: string,
    userId?: string,
  ) {
    return this.updateAIOrder(
      beoId,
      orderId,
      orgId,
      {
        approved: true,
        approvedAt: new Date().toISOString(),
        approvedBy: userId,
      },
      userId,
    );
  }

  /**
   * Reject an AI order
   */
  async rejectAIOrder(
    beoId: string,
    orderId: string,
    orgId: string,
    userId?: string,
  ) {
    return this.updateAIOrder(
      beoId,
      orderId,
      orgId,
      {
        approved: false,
      },
      userId,
    );
  }

  /**
   * Submit chef feedback for AI learning
   */
  async submitChefFeedback(
    beoId: string,
    orgId: string,
    feedback: {
      notes: string;
      approvedOrderIds: string[];
      rejectedOrderIds: string[];
      adjustedOrders: Array<{
        orderId: string;
        originalQuantity: number;
        adjustedQuantity: number;
        reason: string;
      }>;
    },
    userId?: string,
  ) {
    try {
      logger.info("[BEO-AI-ORDERS] Submitting chef feedback:", {
        beoId,
        feedback: feedback.notes.substring(0, 100),
      });

      // Create feedback record
      const { data: feedbackRecord, error: feedbackError } = await supabase
        .from("beo_ai_feedback")
        .insert({
          beo_id: beoId,
          org_id: orgId,
          notes: feedback.notes,
          approved_order_ids: feedback.approvedOrderIds,
          rejected_order_ids: feedback.rejectedOrderIds,
          adjusted_orders: feedback.adjustedOrders,
          submitted_by: userId,
          created_at: new Date().toISOString(),
        })
        .select();

      if (feedbackError) {
        throw new Error(`Failed to save feedback: ${feedbackError.message}`);
      }

      logger.info("[BEO-AI-ORDERS] Chef feedback recorded:", {
        feedbackId: feedbackRecord?.[0]?.id,
      });

      return {
        success: true,
        data: feedbackRecord?.[0],
      };
    } catch (err) {
      logger.error("[BEO-AI-ORDERS] Feedback submission error:", err);
      throw err;
    }
  }

  /**
   * Get AI order statistics for a BEO
   */
  async getAIOrderStatistics(beoId: string, orgId: string) {
    try {
      const { data: orders, error } = await supabase
        .from("beo_ai_orders")
        .select("approved, confidence")
        .eq("beo_id", beoId)
        .eq("org_id", orgId);

      if (error) throw error;

      const total = orders?.length || 0;
      const approved = orders?.filter((o) => o.approved).length || 0;
      const avgConfidence =
        total > 0
          ? (orders!.reduce((sum, o) => sum + o.confidence, 0) / total).toFixed(1)
          : 0;

      return {
        total,
        approved,
        pending: total - approved,
        approvalRate: total > 0 ? ((approved / total) * 100).toFixed(1) : 0,
        averageConfidence: avgConfidence,
      };
    } catch (err) {
      logger.error("[BEO-AI-ORDERS] Statistics error:", err);
      return {
        total: 0,
        approved: 0,
        pending: 0,
        approvalRate: 0,
        averageConfidence: 0,
      };
    }
  }
}

export const beoAIOrdersService = new BEOAIOrdersService();
