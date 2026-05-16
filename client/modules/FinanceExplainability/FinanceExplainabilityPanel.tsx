/**
 * FinanceExplainabilityPanel
 * GL mapping viewer: recipe costs -> GL codes -> outlet P&L; budget vs actual; trace-backed deltas.
 * Export pack: GL journal suggestions (not postings), reconciliation report, trace chain evidence.
 */

import React, { useState } from "react";
import { DollarSign, FileText } from "lucide-react";

export default function FinanceExplainabilityPanel() {
  const [outletId, setOutletId] = useState("");
  const [deltas, setDeltas] = useState<
    Array<{ glCode: string; delta: number; traceId: string }>
  >([]);
  const [loading, setLoading] = useState(false);

  const loadDeltas = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/finance/gl-mapping-view?outletId=${encodeURIComponent(outletId || "default")}`,
      );
      if (res.ok) {
        const data = await res.json();
        setDeltas(data.deltas ?? []);
      } else setDeltas([]);
    } catch {
      setDeltas([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <DollarSign className="h-5 w-5" />
        Finance Explainability
      </h2>
      <p className="text-sm text-muted-foreground">
        Recipe costs → GL codes → outlet P&L; budget vs actual; trace-backed
        deltas. Export: GL journal suggestions, reconciliation report, trace
        chain evidence.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={outletId}
          onChange={(e) => setOutletId(e.target.value)}
          placeholder="Outlet ID"
          className="border border-input rounded px-3 py-2 text-sm bg-background"
        />
        <button
          type="button"
          disabled={loading}
          onClick={loadDeltas}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          Load
        </button>
      </div>
      {deltas.length > 0 && (
        <ul className="space-y-2">
          {deltas.map((d) => (
            <li
              key={d.glCode}
              className="flex justify-between items-center border border-border rounded px-3 py-2"
            >
              <span className="font-mono text-sm">{d.glCode}</span>
              <span>{d.delta}</span>
              <a
                href={`/api/trace-ledger?traceId=${d.traceId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary"
              >
                Trace
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-sm"
        >
          <FileText className="h-4 w-4" />
          Export pack (GL + reconciliation + trace)
        </button>
      </div>
    </div>
  );
}
