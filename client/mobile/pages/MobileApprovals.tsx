/**
 * Mobile Approvals
 * Agent proposals + workflow approvals + purchasing approvals.
 * RBAC enforced (server); one-tap approve/deny emits trace and calls correct action endpoint.
 */

import React, { useEffect, useState } from "react";
import { CheckSquare, Check, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { emitTrace } from "@/lib/trace-emitter";
import { cn } from "@/lib/utils";

interface ApprovalItem {
  id: string;
  type: string;
  description: string;
  amount?: number;
  requesterName?: string;
  createdAt: string;
  status: string;
  assignedTo?: string;
  metadata?: Record<string, unknown>;
}

const SOURCE_PANEL = "mobile-approvals";
const DOMAIN = "approvals";

export default function MobileApprovals() {
  const auth = useAuth();
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const userId = auth?.user?.id ?? "";
  const role = auth?.user?.role ?? "user";
  const orgId = auth?.user?.org_id ?? auth?.organization?.id ?? "";

  useEffect(() => {
    let cancelled = false;
    const fetchQueue = async () => {
      try {
        const res = await fetch("/api/aurum/approvals/queue", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          setError("Failed to load approvals");
          return;
        }
        const data = await res.json();
        if (!cancelled && Array.isArray(data.approvals)) setItems(data.approvals);
      } catch {
        if (!cancelled) setError("Failed to load approvals");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchQueue();
    return () => { cancelled = true; };
  }, [token]);

  const callApprove = async (approvalId: string, action: "approve" | "reject", reason?: string) => {
    setActing(approvalId);
    const path = action === "approve"
      ? `/api/aurum/approvals/${approvalId}/approve`
      : `/api/aurum/approvals/${approvalId}/reject`;
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: reason || (action === "approve" ? "Approved from mobile" : "Rejected from mobile") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Action failed");
        return;
      }
      const traceId = `approval-${action}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await emitTrace(
        "approval",
        approvalId,
        SOURCE_PANEL,
        DOMAIN,
        { approvalId, action, reason },
        { success: true, approvedBy: userId, ...data },
        { traceId, userId, role, orgId }
      );
      setItems((prev) => prev.filter((i) => i.id !== approvalId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading approvals…</span>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <CheckSquare className="h-5 w-5" />
        Approvals
      </h2>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending approvals.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="border border-border rounded-lg p-3 bg-card"
            >
              <div className="text-sm font-medium">{item.description}</div>
              {item.amount != null && (
                <div className="text-xs text-muted-foreground mt-1">
                  Amount: {typeof item.amount === "number" ? item.amount.toFixed(2) : item.amount}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  disabled={acting === item.id}
                  onClick={() => callApprove(item.id, "approve")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium",
                    "bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  )}
                >
                  {acting === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Approve
                </button>
                <button
                  type="button"
                  disabled={acting === item.id}
                  onClick={() => callApprove(item.id, "reject")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium",
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                  )}
                >
                  {acting === item.id ? null : <X className="h-4 w-4" />}
                  Deny
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
