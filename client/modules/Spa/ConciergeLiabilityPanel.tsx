/**
 * ConciergeLiabilityPanel
 * -----------------------
 * Real-time note linter. Paste/type any guest-facing note and see:
 *   - Severity rating
 *   - Category breakdown (privacy / diagnostic / defamation / harassment / guarantee / opinion)
 *   - Exact findings with suggestions
 *   - Sanitized version (one-click copy)
 *   - Save-blocking for high severity
 *   - Live audit log
 */
import React, { useEffect, useState } from "react";
import { Shield, CheckCircle2, AlertTriangle, Copy, RefreshCw, Lock } from "lucide-react";

const ACCENT = "#c8a97e";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "rgba(255,255,255,0.025)";
const API = typeof window !== "undefined" ? window.location.origin : "";

interface ScanResult {
  severity: "none" | "low" | "medium" | "high";
  categories: string[];
  findings: Array<{ category: string; severity: string; match: string; span: [number, number]; suggestion: string }>;
  finding_count: number;
  ok_to_save: boolean;
  requires_manager_approval: boolean;
  sanitized?: string;
  log_id?: string;
}

export default function ConciergeLiabilityPanel() {
  const [text, setText] = useState("Guest in room 212 seemed a bit rude. I think she was on medication, maybe allergic to nuts. Her email is jane@guest.com and card 4111-1111-1111-1111 is on file. We guarantee a full refund.");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [sanitized, setSanitized] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [log, setLog] = useState<any[]>([]);

  const loadMeta = async () => {
    const [r, s, l] = await Promise.all([
      fetch(`${API}/api/echo-concierge/liability/rules`).then(x => x.json()),
      fetch(`${API}/api/echo-concierge/liability/summary`).then(x => x.json()),
      fetch(`${API}/api/echo-concierge/liability/log?limit=15`).then(x => x.json()),
    ]);
    setRules(r.categories || []);
    setSummary(s);
    setLog(l.items || []);
  };
  useEffect(() => { loadMeta(); }, []);

  const scan = async (withSanitize = false) => {
    setLoading(true);
    const endpoint = withSanitize ? "sanitize" : "scan";
    const r = await fetch(`${API}/api/echo-concierge/liability/${endpoint}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, source: "note", author: "user" }),
    });
    const d = await r.json();
    setResult(d);
    if (withSanitize) setSanitized(d.sanitized || "");
    else setSanitized("");
    await loadMeta();
    setLoading(false);
  };

  const sevColor = (s: string) => s === "high" ? RED : s === "medium" ? AMBER : s === "low" ? "#a3b18a" : GREEN;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#04060d", color: "#e2e8f0" }} data-testid="concierge-liability-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BORDER, background: "#0b1020" }}>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] flex items-center gap-2" style={{ color: `${ACCENT}99` }}>
            <Shield className="w-3 h-3" /> Echo Concierge · Liability Filter
          </div>
          <div className="text-[18px] font-semibold text-white mt-0.5">Note Linter</div>
          <div className="text-[10px] text-white/40 mt-0.5">Scans guest-facing notes for privacy leaks, medical claims, defamation, harassment, opinion, and binding-guarantee language before save.</div>
        </div>
        {summary && (
          <div className="flex items-center gap-2">
            <Stat label="Total" value={summary.total_scans} tone="accent" />
            <Stat label="Blocked" value={summary.blocked_count} tone="bad" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6 grid grid-cols-12 gap-4 auto-rows-min">
        {/* Input */}
        <div className="col-span-12 lg:col-span-7 rounded-xl p-4" style={{ background: "#0b1020", border: `1px solid ${BORDER}` }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white mb-2">Note Text</div>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={9}
            className="w-full px-3 py-2 rounded text-[12px] text-white bg-transparent outline-none resize-y font-mono leading-relaxed"
            style={{ border: `1px solid ${BORDER}` }} data-testid="liability-input" />
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => scan(false)} disabled={loading || !text.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-[11px] font-semibold disabled:opacity-40"
              style={{ background: ACCENT, color: "#0b1020" }} data-testid="liability-scan">
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />} Scan
            </button>
            <button onClick={() => scan(true)} disabled={loading || !text.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-[11px] font-semibold disabled:opacity-40"
              style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}40` }} data-testid="liability-sanitize">
              <Lock className="w-3.5 h-3.5" /> Scan + Sanitize
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 p-3 rounded"
                style={{ background: `${sevColor(result.severity)}10`, border: `1px solid ${sevColor(result.severity)}35` }}>
                <div>
                  {result.severity === "none" ? <CheckCircle2 className="w-5 h-5" style={{ color: GREEN }} />
                    : <AlertTriangle className="w-5 h-5" style={{ color: sevColor(result.severity) }} />}
                </div>
                <div className="flex-1">
                  <div className="text-[11px] uppercase font-mono tracking-widest" style={{ color: sevColor(result.severity) }}>
                    Severity · {result.severity}
                  </div>
                  <div className="text-[13px] text-white mt-0.5">
                    {result.finding_count} finding{result.finding_count === 1 ? "" : "s"} across {result.categories.length} categor{result.categories.length === 1 ? "y" : "ies"}
                  </div>
                  <div className="text-[10px] text-white/55 mt-0.5">
                    {result.ok_to_save
                      ? "✓ Safe to save (may include softening)."
                      : "⚠ Blocked — manager approval required."}
                  </div>
                </div>
              </div>

              {result.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {result.categories.map(c => (
                    <span key={c} className="px-2 py-1 rounded text-[9px] uppercase font-mono"
                      style={{ background: `${ACCENT}10`, color: ACCENT, border: `1px solid ${ACCENT}30` }}>{c}</span>
                  ))}
                </div>
              )}

              {result.findings.length > 0 && (
                <div>
                  <div className="text-[9px] uppercase font-mono tracking-widest text-white/40 mb-1.5">Findings</div>
                  <div className="space-y-1.5">
                    {result.findings.map((f, i) => (
                      <div key={i} className="p-2 rounded text-[11px]"
                        style={{ background: SURFACE, border: `1px solid ${sevColor(f.severity)}35` }}>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded"
                            style={{ background: `${sevColor(f.severity)}20`, color: sevColor(f.severity) }}>
                            {f.severity}
                          </span>
                          <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">{f.category}</span>
                          <span className="ml-auto text-[9px] font-mono text-white/50">"{f.match}"</span>
                        </div>
                        <div className="text-[10px] text-white/70 mt-1">{f.suggestion}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sanitized && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[9px] uppercase font-mono tracking-widest text-white/40">Sanitized</div>
                    <button onClick={() => navigator.clipboard?.writeText(sanitized)}
                      className="flex items-center gap-1 text-[10px]" style={{ color: ACCENT }}>
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <div className="p-3 rounded text-[11px] text-white font-mono leading-relaxed"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="liability-sanitized">
                    {sanitized}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rules + Log */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          <div className="rounded-xl p-4" style={{ background: "#0b1020", border: `1px solid ${BORDER}` }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white mb-2">Detection Categories</div>
            <div className="space-y-1.5">
              {rules.map((r: any) => (
                <div key={r.name} className="p-2 rounded text-[11px]" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-white capitalize font-medium">{r.name}</span>
                    <span className="text-[9px] font-mono text-white/40">{r.rule_count} rules</span>
                  </div>
                  <div className="text-[9px] text-white/50 mt-0.5">{r.description}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: "#0b1020", border: `1px solid ${BORDER}` }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white mb-2">Audit Log · Last 15</div>
            {log.length === 0 && <div className="text-[11px] text-white/30 py-4 text-center">No scans yet.</div>}
            <div className="space-y-1">
              {log.map((l: any) => (
                <div key={l.id} className="flex items-center gap-2 px-2 py-1 rounded text-[10px]"
                  style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <span className="text-[8px] font-mono uppercase px-1 rounded" style={{ background: `${sevColor(l.severity)}18`, color: sevColor(l.severity) }}>{l.severity}</span>
                  <span className="text-white/60 truncate flex-1">{l.source || "—"} · {l.finding_count} findings</span>
                  <span className="text-[8px] font-mono text-white/30">{(l.created_at || "").slice(11, 16)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: any; tone?: string }) {
  const c = tone === "bad" ? RED : ACCENT;
  return (
    <div className="rounded px-3 py-1.5" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="text-[8px] uppercase tracking-widest font-mono text-white/40">{label}</div>
      <div className="text-[14px] font-semibold" style={{ color: c }}>{value}</div>
    </div>
  );
}
