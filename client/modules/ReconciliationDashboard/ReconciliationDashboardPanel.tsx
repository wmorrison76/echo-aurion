/**
 * ReconciliationDashboardPanel
 * View reconciliation reports, mismatch list, reason codes; drill into trace-backed report entity.
 */

import React, { useEffect, useState } from "react";
import { FileCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportSummary {
  id: string;
  orgId: string;
  connectorId: string;
  runAt: string;
  summary: {
    totalCompared: number;
    matches: number;
    mismatches: number;
    reasonCounts: Record<string, number>;
  };
  mismatches: Array<{
    sourceId: string;
    luccaId?: string;
    reasonCode: string;
    diff?: Record<string, { source: unknown; lucca: unknown }>;
  }>;
  traceId: string;
}

export default function ReconciliationDashboardPanel() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/integrations/reconciliation/reports");
        if (!res.ok) throw new Error("Failed to load reports");
        const data = await res.json();
        if (!cancelled && Array.isArray(data.reports)) setReports(data.reports);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="p-4 text-muted-foreground">Loading…</div>;
  if (error) return <div className="p-4 text-destructive">{error}</div>;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <FileCheck className="h-5 w-5" />
        Reconciliation
      </h2>
      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No reconciliation reports yet. Run a connector reconciliation to
          generate.
        </p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li
              key={r.id}
              className="border border-border rounded-lg p-3 bg-card"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.connectorId}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.runAt).toLocaleString()}
                </span>
              </div>
              <div className="flex gap-4 mt-2 text-sm">
                <span>Compared: {r.summary.totalCompared}</span>
                <span className="text-green-600">
                  Match: {r.summary.matches}
                </span>
                <span
                  className={r.summary.mismatches > 0 ? "text-destructive" : ""}
                >
                  Mismatch: {r.summary.mismatches}
                </span>
              </div>
              {r.mismatches.length > 0 && (
                <div className="mt-2 flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs">
                    {r.mismatches.length} mismatches — review reason codes
                  </span>
                </div>
              )}
              <div className="mt-2">
                <a
                  href={`/api/trace-ledger?entityType=reconciliation_report&entityId=${r.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View trace {r.traceId}
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
