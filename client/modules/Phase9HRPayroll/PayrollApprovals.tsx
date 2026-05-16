import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { post, get } from "@/lib/api-client";
type ApprovalItem = {
  id: string;
  type: string;
  description: string;
  amount: number;
  requesterName?: string;
  createdAt?: string;
  status?: string;
  metadata?: {
    outlet_id?: string;
    payroll_run_id?: string;
    period_start?: string;
    period_end?: string;
    posting_status?: string;
  };
};
type ApprovalQueueResponse = {
  approvals: ApprovalItem[];
  total: number;
  offset: number;
  limit: number;
};
function formatMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "$0";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${Math.round(amount).toLocaleString()}`;
  }
}
export default function PayrollApprovals(props: {
  outletId?: string;
  payrollRunId?: string;
}) {
  const { outletId, payrollRunId } = props;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const filtered = useMemo(() => {
    return items
      .filter((i) => i.type === "payroll_accrual")
      .filter((i) => (outletId ? i.metadata?.outlet_id === outletId : true))
      .filter((i) =>
        payrollRunId ? i.metadata?.payroll_run_id === payrollRunId : true,
      );
  }, [items, outletId, payrollRunId]);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get<ApprovalQueueResponse>(
        "/api/aurum/approvals/queue?status=pending&limit=25&offset=0",
      );
      setItems(Array.isArray(res.approvals) ? res.approvals : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const approve = useCallback(
    async (approvalId: string) => {
      setLoading(true);
      setError(null);
      try {
        await post(
          `/api/aurum/approvals/${encodeURIComponent(approvalId)}/approve`,
          { reason: "Approved from HR & Payroll panel" },
        );
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    },
    [load],
  );
  const reject = useCallback(
    async (approvalId: string) => {
      setLoading(true);
      setError(null);
      try {
        await post(
          `/api/aurum/approvals/${encodeURIComponent(approvalId)}/reject`,
          { reason: "Rejected from HR & Payroll panel" },
        );
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    },
    [load],
  );
  return (
    <Card className="p-4 border border-border/50 bg-surface/60">
      {" "}
      <div className="flex items-start justify-between gap-3">
        {" "}
        <div>
          {" "}
          <div className="text-sm font-semibold">Payroll approvals</div>{" "}
          <div className="text-xs text-muted-foreground">
            {" "}
            Items requiring approval before EchoAurum posting{" "}
            {(outletId || payrollRunId) && (
              <>
                {" "}
                {""}•{outletId ? ` Outlet: ${outletId}` : ""}{" "}
                {payrollRunId ? ` • Run: ${payrollRunId}` : ""}{" "}
              </>
            )}{" "}
          </div>{" "}
        </div>{" "}
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="h-8"
        >
          {" "}
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />{" "}
        </Button>{" "}
      </div>{" "}
      {error && <div className="mt-3 text-xs text-red-400">{error}</div>}{" "}
      <div className="mt-3 space-y-2">
        {" "}
        {loading && filtered.length === 0 && (
          <div className="text-xs text-muted-foreground">Loading…</div>
        )}{" "}
        {!loading && filtered.length === 0 && (
          <div className="text-xs text-muted-foreground">
            No pending payroll approvals.
          </div>
        )}{" "}
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-md border border-border/40 bg-background/30 p-3"
          >
            {" "}
            <div className="flex items-start justify-between gap-3">
              {" "}
              <div className="min-w-0">
                {" "}
                <div className="text-sm font-medium truncate">
                  {item.description}
                </div>{" "}
                <div className="text-xs text-muted-foreground mt-0.5">
                  {" "}
                  Amount: {formatMoney(item.amount)}{" "}
                </div>{" "}
                {item.metadata?.payroll_run_id && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {" "}
                    Run: {item.metadata.payroll_run_id}{" "}
                  </div>
                )}{" "}
              </div>{" "}
              <div className="flex items-center gap-2 flex-shrink-0">
                {" "}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={() => approve(item.id)}
                  className="h-8"
                >
                  {" "}
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Approve{" "}
                </Button>{" "}
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={loading}
                  onClick={() => reject(item.id)}
                  className="h-8"
                >
                  {" "}
                  <XCircle className="h-4 w-4 mr-1" /> Reject{" "}
                </Button>{" "}
              </div>{" "}
            </div>{" "}
          </div>
        ))}{" "}
      </div>{" "}
    </Card>
  );
}
