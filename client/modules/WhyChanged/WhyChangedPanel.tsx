/**
 * WhyChangedPanel
 * Delta explainer: compare two periods; attribute changes to trace-backed causes (price, yield, guarantee, waste).
 * Outputs: causal breakdown + confidence.
 */

import React, { useState } from "react";
import { GitCompare } from "lucide-react";

export default function WhyChangedPanel() {
  const [periodA, setPeriodA] = useState("");
  const [periodB, setPeriodB] = useState("");
  const [breakdown, setBreakdown] = useState<
    Array<{
      cause: string;
      delta: number;
      confidence: number;
      traceIds: string[];
    }>
  >([]);
  const [loading, setLoading] = useState(false);

  const runCompare = async () => {
    if (!periodA || !periodB) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics/why-changed?periodA=${encodeURIComponent(periodA)}&periodB=${encodeURIComponent(periodB)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setBreakdown(data.breakdown ?? []);
      }
    } catch {
      setBreakdown([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <GitCompare className="h-5 w-5" />
        Why did it change?
      </h2>
      <p className="text-sm text-muted-foreground">
        Compare two periods; attribute changes to trace-backed causes (price,
        yield, guarantee, waste). Causal breakdown + confidence.
      </p>
      <div className="flex gap-2 items-center">
        <input
          type="date"
          value={periodA}
          onChange={(e) => setPeriodA(e.target.value)}
          className="border border-input rounded px-3 py-2 text-sm bg-background"
        />
        <span className="text-muted-foreground">to</span>
        <input
          type="date"
          value={periodB}
          onChange={(e) => setPeriodB(e.target.value)}
          className="border border-input rounded px-3 py-2 text-sm bg-background"
        />
        <button
          type="button"
          disabled={loading}
          onClick={runCompare}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          Compare
        </button>
      </div>
      {breakdown.length > 0 && (
        <ul className="space-y-2">
          {breakdown.map((b, i) => (
            <li
              key={i}
              className="border border-border rounded-lg px-3 py-2 flex justify-between items-center"
            >
              <span>{b.cause}</span>
              <span className="text-sm">
                {b.delta} (confidence: {(b.confidence * 100).toFixed(0)}%)
              </span>
              {b.traceIds?.length > 0 && (
                <a
                  href={`/api/trace-ledger?traceId=${b.traceIds[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary"
                >
                  Trace
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
