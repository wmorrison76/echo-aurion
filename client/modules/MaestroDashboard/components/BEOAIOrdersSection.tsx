/** * BEO AI Orders Section * * Displays AI-generated orders with confidence percentages. * Allows inline editing, approval, and chef feedback. */ import React, {
  useState,
} from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AIOrderEditModal } from "./AIOrderEditModal";
import { maestroEventBus } from "@/lib/maestro-event-bus";
import type { AIOrder } from "@/hooks/useBEODetail";
interface BEOAIOrdersSectionProps {
  aiOrders: AIOrder[];
  beoId: string;
}
function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return "bg-green-900 text-green-200";
  if (confidence >= 50) return "bg-yellow-900 text-yellow-200";
  return "bg-red-900 text-red-200";
}
export function BEOAIOrdersSection({
  aiOrders,
  beoId,
}: BEOAIOrdersSectionProps) {
  const [editingOrder, setEditingOrder] = useState<AIOrder | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [chefFeedback, setChefFeedback] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const handleEditOrder = (order: AIOrder) => {
    setEditingOrder(order);
    setIsEditModalOpen(true);
  };
  const handleSaveOrder = async (updatedOrder: Partial<AIOrder>) => {
    if (!editingOrder) return;
    try {
      const response = await fetch(
        `/api/beo/${beoId}/ai-orders/${editingOrder.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedOrder),
        },
      );
      if (response.ok) {
        maestroEventBus.emit("BEO_AI_ORDER_UPDATED", {
          beoId,
          orderId: editingOrder.id,
          changes: updatedOrder,
        });
      }
    } catch (error) {
      console.error("Failed to save order:", error);
    }
  };
  const handleApproveOrder = async () => {
    if (!editingOrder) return;
    try {
      const response = await fetch(
        `/api/beo/${beoId}/ai-orders/${editingOrder.id}/approve`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      if (response.ok) {
        maestroEventBus.emit("BEO_AI_ORDER_APPROVED", {
          beoId,
          orderId: editingOrder.id,
        });
      }
    } catch (error) {
      console.error("Failed to approve order:", error);
    }
  };
  const handleRejectOrder = async () => {
    if (!editingOrder) return;
    try {
      const response = await fetch(
        `/api/beo/${beoId}/ai-orders/${editingOrder.id}/reject`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      if (response.ok) {
        maestroEventBus.emit("BEO_AI_ORDER_REJECTED", {
          beoId,
          orderId: editingOrder.id,
        });
      }
    } catch (error) {
      console.error("Failed to reject order:", error);
    }
  };
  const handleSubmitFeedback = async () => {
    if (!chefFeedback.trim()) return;
    setIsSubmittingFeedback(true);
    try {
      const response = await fetch(`/api/beo/${beoId}/ai-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: chefFeedback,
          beoId,
          approvedOrders: aiOrders.filter((o) => o.approved),
          rejectedOrders: aiOrders.filter((o) => !o.approved),
        }),
      });
      if (response.ok) {
        setChefFeedback("");
        maestroEventBus.emit("BEO_AI_FEEDBACK_SUBMITTED", {
          beoId,
          feedbackLength: chefFeedback.length,
        });
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };
  return (
    <>
      {" "}
      <Card className="bg-slate-800 border-border p-6">
        {" "}
        <div className="flex items-center justify-between mb-4">
          {" "}
          <h3 className="text-sm font-semibold text-white">
            {" "}
            AI-Generated Orders{" "}
          </h3>{" "}
          <Badge variant="outline" className="text-xs">
            {" "}
            {aiOrders.filter((o) => o.approved).length}/{aiOrders.length}{" "}
            approved{" "}
          </Badge>{" "}
        </div>{" "}
        {aiOrders.length === 0 ? (
          <p className="text-xs text-slate-400">No AI orders generated yet</p>
        ) : (
          <div className="space-y-2 text-xs mb-6">
            {" "}
            {aiOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-3 rounded bg-surface border border-border hover:border-slate-600 transition-colors"
              >
                {" "}
                <div className="flex-1">
                  {" "}
                  <p className="text-white font-medium">
                    {order.itemName}
                  </p>{" "}
                  <p className="text-slate-400">
                    {" "}
                    {order.quantity} {order.unit}{" "}
                  </p>{" "}
                </div>{" "}
                <div className="flex items-center gap-3">
                  {" "}
                  <Badge
                    className={`${getConfidenceColor(order.confidence)} text-xs`}
                  >
                    {" "}
                    {order.confidence}% confident{" "}
                  </Badge>{" "}
                  {order.approved ? (
                    <Badge variant="secondary" className="text-xs">
                      {" "}
                      ✓ Approved{" "}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {" "}
                      Pending{" "}
                    </Badge>
                  )}{" "}
                  <div className="flex gap-1">
                    {" "}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditOrder(order)}
                      className="text-xs h-6 px-2"
                    >
                      {" "}
                      Edit{" "}
                    </Button>{" "}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (order.approved) {
                          handleRejectOrder();
                        } else {
                          handleApproveOrder();
                        }
                      }}
                      className={`text-xs h-6 px-2 ${order.approved ? "text-red-400 hover:text-red-300" : "text-green-400 hover:text-green-300"}`}
                    >
                      {" "}
                      {order.approved ? "✗" : "✓"}{" "}
                    </Button>{" "}
                  </div>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>
        )}{" "}
        {/* Chef Feedback Section */}{" "}
        <div className="mt-6 p-4 rounded-lg border border-border bg-surface">
          {" "}
          <p className="text-xs font-semibold text-slate-300 mb-2.5">
            {" "}
            📝 Chef Feedback (helps AI learn){" "}
          </p>{" "}
          <Textarea
            placeholder="Describe what the AI missed, what worked well, or any adjustments made..."
            value={chefFeedback}
            onChange={(e) => setChefFeedback(e.target.value)}
            disabled={isSubmittingFeedback}
            className="w-full h-20 px-3 py-2 text-xs bg-slate-800 border border-slate-600 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          />{" "}
          <div className="flex justify-end gap-2 mt-2">
            {" "}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setChefFeedback("")}
              disabled={isSubmittingFeedback || !chefFeedback.trim()}
              className="text-xs h-7 px-3"
            >
              {" "}
              Clear{" "}
            </Button>{" "}
            <Button
              size="sm"
              onClick={handleSubmitFeedback}
              disabled={isSubmittingFeedback || !chefFeedback.trim()}
              className="text-xs h-7 px-3 bg-primary hover:opacity-90"
            >
              {" "}
              Submit Feedback{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
      </Card>{" "}
      {editingOrder && (
        <AIOrderEditModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          order={editingOrder}
          onSave={handleSaveOrder}
          onApprove={handleApproveOrder}
          onReject={handleRejectOrder}
        />
      )}{" "}
    </>
  );
}
