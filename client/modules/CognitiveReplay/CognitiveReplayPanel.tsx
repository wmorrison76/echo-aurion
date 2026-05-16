/**
 * CognitiveReplayPanel
 * Select traceId/entity; show upstream/downstream chain; narrated explanation with citations (trace ids).
 */

import React, { useState } from "react";
import { Play, ChevronRight } from "lucide-react";

export default function CognitiveReplayPanel() {
  const [traceId, setTraceId] = useState("");
  const [chain, setChain] = useState<
    Array<{ id: string; type: string; summary: string }>
  >([]);
  const [narrative, setNarrative] = useState("");
  const [loading, setLoading] = useState(false);

  const runReplay = async () => {
    if (!traceId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/trace-ledger/replay?traceId=${encodeURIComponent(traceId)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setChain(data.chain ?? []);
        setNarrative(data.narrative ?? "");
      } else {
        setChain([]);
        setNarrative("");
      }
    } catch {
      setChain([]);
      setNarrative("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Play className="h-5 w-5" />
        Cognitive Replay
      </h2>
      <p className="text-sm text-muted-foreground">
        Select traceId or entity; show upstream/downstream chain; narrated
        explanation with citations.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={traceId}
          onChange={(e) => setTraceId(e.target.value)}
          placeholder="Trace ID or entity ID"
          className="flex-1 border border-input rounded px-3 py-2 text-sm bg-background"
        />
        <button
          type="button"
          disabled={loading}
          onClick={runReplay}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          Replay
        </button>
      </div>
      {narrative && (
        <p className="text-sm border-l-2 border-primary pl-3">{narrative}</p>
      )}
      {chain.length > 0 && (
        <ul className="space-y-2">
          {chain.map((node) => (
            <li
              key={node.id}
              className="flex items-center gap-2 border border-border rounded px-3 py-2"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-xs">{node.id}</span>
              <span className="text-muted-foreground">{node.type}</span>
              <span className="text-sm truncate">{node.summary}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
