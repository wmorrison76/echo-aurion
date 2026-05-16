import React, { useState, useEffect, useCallback } from "react";
import { AlertTriangle, X, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface FoodRecall {
  id: string;
  recall_id: string;
  item_name: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  action_required: string;
  issued_at: string;
  resolved_at?: string;
}

interface FoodRecallNotificationOverlayProps {
  deviceId: string;
  deviceName?: string;
}

const SEVERITY_COLORS = {
  critical: "bg-red-600 border-red-700",
  high: "bg-orange-600 border-orange-700",
  medium: "bg-yellow-500 border-yellow-600",
  low: "bg-blue-500 border-blue-600",
};

const SEVERITY_LABELS = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

export default function FoodRecallNotificationOverlay({
  deviceId,
  deviceName = "Kitchen Tablet",
}: FoodRecallNotificationOverlayProps) {
  const { toast } = useToast();
  const [activeRecalls, setActiveRecalls] = useState<FoodRecall[]>([]);
  const [showRecalls, setShowRecalls] = useState(false);
  const [acknowledgeModal, setAcknowledgeModal] = useState(false);
  const [selectedRecall, setSelectedRecall] = useState<FoodRecall | null>(null);
  const [managerPassword, setManagerPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch active recalls for this device
  const fetchRecalls = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/inventory/recalls/device/${deviceId}?acknowledged=false`,
      );

      if (!response.ok) {
        console.error(
          "Recalls API error:",
          response.status,
          response.statusText,
        );
        return;
      }

      const data = await response.json();

      if (data && Array.isArray(data) && data.length > 0) {
        const recalls = data
          .map((notification: any) => {
            try {
              return {
                id: notification.id,
                recall_id: notification.recall_id,
                item_name: notification.food_recall_notifications?.item_name,
                severity: notification.food_recall_notifications?.severity,
                description:
                  notification.food_recall_notifications?.description,
                action_required:
                  notification.food_recall_notifications?.action_required,
                issued_at: notification.food_recall_notifications?.issued_at,
                resolved_at:
                  notification.food_recall_notifications?.resolved_at,
              };
            } catch (err) {
              console.error("Error mapping recall:", err, notification);
              return null;
            }
          })
          .filter((r: any) => r !== null);

        if (recalls.length > 0) {
          setActiveRecalls(recalls);
          setShowRecalls(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch recalls:", error);
    }
  }, [deviceId]);

  // Fetch recalls on mount and periodically
  useEffect(() => {
    // Only fetch if we have a valid device ID
    if (deviceId && deviceId !== "unknown-device") {
      fetchRecalls();
      const interval = setInterval(fetchRecalls, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [fetchRecalls, deviceId]);

  const handleAcknowledge = async (recall: FoodRecall) => {
    setSelectedRecall(recall);
    setAcknowledgeModal(true);
  };

  const handleSubmitAcknowledge = async () => {
    if (!selectedRecall || !managerPassword) {
      toast({
        title: "Error",
        description: "Manager credentials required to acknowledge recall",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/inventory/recalls/${selectedRecall.recall_id}/acknowledge`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            device_id: deviceId,
            acknowledged_by: `Manager (${managerPassword})`,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to acknowledge recall");
      }

      // Remove acknowledged recall from list
      setActiveRecalls((prev) =>
        prev.filter((r) => r.recall_id !== selectedRecall.recall_id),
      );

      toast({
        title: "Success",
        description: `Recall for ${selectedRecall.item_name} acknowledged`,
      });

      setAcknowledgeModal(false);
      setManagerPassword("");
      setSelectedRecall(null);

      // If no more recalls, hide the panel
      if (activeRecalls.length <= 1) {
        setShowRecalls(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showRecalls || activeRecalls.length === 0) {
    return null;
  }

  // Show as banner for single recall, modal for multiple
  if (activeRecalls.length === 1) {
    const recall = activeRecalls[0];
    return (
      <>
        <div
          className={`fixed top-0 left-0 right-0 z-[9999] ${SEVERITY_COLORS[recall.severity]} text-white p-4 shadow-lg border-b-4`}
        >
          <div className="max-w-7xl mx-auto flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm">
                  {SEVERITY_LABELS[recall.severity]} FOOD RECALL
                </span>
              </div>
              <h3 className="text-lg font-bold mb-1">{recall.item_name}</h3>
              <p className="text-sm opacity-90 mb-2">{recall.description}</p>
              {recall.action_required && (
                <p className="text-sm font-semibold mb-3">
                  Action Required: {recall.action_required}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAcknowledge(recall)}
                  size="sm"
                  className="bg-white text-slate-900 hover:bg-slate-100 font-semibold"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Acknowledge (Manager)
                </Button>
                <Button
                  onClick={() => setShowRecalls(false)}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white hover:bg-opacity-20"
                >
                  Dismiss Temporarily
                </Button>
              </div>
            </div>
            <button
              onClick={() => setShowRecalls(false)}
              className="text-white hover:opacity-75 flex-shrink-0"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Acknowledge Modal */}
        <Dialog open={acknowledgeModal} onOpenChange={setAcknowledgeModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-600" />
                Acknowledge Food Recall
              </DialogTitle>
              <DialogDescription>
                Manager credentials required to acknowledge and stop this recall
                notification
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-900 mb-1">
                  {selectedRecall?.item_name}
                </p>
                <p className="text-sm text-red-700">
                  {selectedRecall?.description}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Manager Credentials
                </label>
                <Input
                  type="password"
                  placeholder="Manager credentials (ID or password)"
                  value={managerPassword}
                  onChange={(e) => setManagerPassword(e.target.value)}
                  className="bg-white"
                />
              </div>

              <p className="text-xs text-slate-600">
                This action will be logged in the system for compliance
                tracking.
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAcknowledgeModal(false);
                  setManagerPassword("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAcknowledge}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? "Acknowledging..." : "Acknowledge Recall"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Multiple recalls - show modal
  return (
    <>
      <div className="fixed inset-0 z-[9998] bg-black/50" />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto">
          {/* Header */}
          <div className="bg-red-600 text-white p-6 border-b">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="h-8 w-8" />
              <h2 className="text-2xl font-bold">
                {activeRecalls.length} Active Food Recalls
              </h2>
            </div>
            <p className="text-sm text-red-100">
              These recalls require manager attention and acknowledgment
            </p>
          </div>

          {/* Recalls List */}
          <div className="p-6 space-y-4">
            {activeRecalls.map((recall) => (
              <div
                key={recall.recall_id}
                className={`border-l-4 ${SEVERITY_COLORS[recall.severity]} bg-slate-50 p-4 rounded`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded mb-2">
                      {SEVERITY_LABELS[recall.severity]}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {recall.item_name}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-600">
                    {new Date(recall.issued_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-sm text-slate-700 mb-2">
                  {recall.description}
                </p>

                {recall.action_required && (
                  <p className="text-sm font-semibold text-slate-900 mb-3">
                    ⚠️ Action: {recall.action_required}
                  </p>
                )}

                <Button
                  onClick={() => handleAcknowledge(recall)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Acknowledge
                </Button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="bg-slate-100 p-4 border-t flex gap-3">
            <Button
              onClick={() => setShowRecalls(false)}
              variant="outline"
              className="flex-1"
            >
              Dismiss Temporarily
            </Button>
          </div>
        </div>
      </div>

      {/* Acknowledge Modal */}
      <Dialog open={acknowledgeModal} onOpenChange={setAcknowledgeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-600" />
              Acknowledge Food Recall
            </DialogTitle>
            <DialogDescription>
              Manager credentials required to acknowledge and stop this recall
              notification
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-900 mb-1">
                {selectedRecall?.item_name}
              </p>
              <p className="text-sm text-red-700">
                {selectedRecall?.description}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Manager Credentials
              </label>
              <Input
                type="password"
                placeholder="Manager credentials (ID or password)"
                value={managerPassword}
                onChange={(e) => setManagerPassword(e.target.value)}
                className="bg-white"
              />
            </div>

            <p className="text-xs text-slate-600">
              This action will be logged in the system for compliance tracking.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAcknowledgeModal(false);
                setManagerPassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAcknowledge}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? "Acknowledging..." : "Acknowledge Recall"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
