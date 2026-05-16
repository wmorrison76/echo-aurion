/**
 * EchoConciergeHubPanel
 * ---------------------
 * Unified intake & routing hub. Submit any guest/staff request,
 * see live classification, review all domain tickets in one feed.
 */
import React, { useEffect, useState } from "react";
import { Send, RefreshCw, Sparkles, Shield, ArrowRight } from "lucide-react";
import { useLiveEvents } from "@/hooks/useLiveEvents";

const ACCENT = "#c8a97e";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "rgba(255,255,255,0.025)";
const API = typeof window !== "undefined" ? window.location.origin : "";

const DOMAIN_COLORS: Record<string, string> = {
  engineering: "#60a5fa",
  housekeeping: "#22c55e",
  spa: "#c8a97e",
  ird: "#f59e0b",
  foh: "#a855f7",
  guest360: "#f472b6",
};

export default function EchoConciergeHubPanel() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [guestName, setGuestName] = useState("");
  const [vip, setVip] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [tickets, setTickets] = useState<any>(null);
  const [domains, setDomains] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [filterDomain, setFilterDomain] = useState<string>("");

  const loadAll = async () => {
    try {
      const [t, d, s] = await Promise.all([
        fetch(`${API}/api/concierge/tickets${filterDomain ? `?domain=${filterDomain}` : ""}`).then(r => r.json()),
        fetch(`${API}/api/concierge/domains`).then(r => r.json()),
        fetch(`${API}/api/concierge/stats`).then(r => r.json()),
      ]);
      setTickets(t); setDomains(d); setStats(s);
    } catch { /* */ }
  };

  useEffect(() => { loadAll(); }, [filterDomain]);

  // Live event subscription — reload when any concierge/eng/hskp/ird/foh event fires
  useLiveEvents(["concierge.", "eng.", "hskp.", "ird.", "foh."], () => loadAll());

  const doClassify = async () => {
    if (!title && !body) return;
    setClassifying(true);
    try {
      const r = await fetch(`${API}/api/concierge/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, room_no: roomNo, guest_name: guestName, vip }),
      }).then(r => r.json());
      setPreview(r);
    } catch { /* */ }
    setClassifying(false);
  };

  const submit = async () => {
    setSubmitting(true);
    setResult(null);
    try {
      const r = await fetch(`${API}/api/concierge/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, room_no: roomNo, guest_name: guestName, vip, source: "staff_tablet" }),
      }).then(r => r.json());
      setResult(r);
      setTitle(""); setBody(""); setPreview(null);
      loadAll();
    } catch { /* */ }
    setSubmitting(false);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#04060d", color: "#e2e8f0" }} data-testid="concierge-hub">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b flex-wrap gap-2" style={{ borderColor: BORDER, background: "#0b1020" }}>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: `${ACCENT}99` }}>Echo Concierge</div>
          <div className="text-[22px] font-semibold text-white mt-0.5 tracking-tight">Unified Intake & Routing Hub</div>
          <div className="text-[10px] text-white/40 mt-0.5">
            Routes to Engineering · Housekeeping · Spa · IRD · FOH · Guest 360 with liability filter
          </div>
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-medium"
          style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
          data-testid="concierge-refresh"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Domain breakdown */}
        {domains && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2" data-testid="concierge-domains">
            {Object.entries(domains.domains || {}).map(([d, stats]: any) => (
              <button
                key={d}
                onClick={() => setFilterDomain(filterDomain === d ? "" : d)}
                className="rounded p-3 text-left transition"
                style={{
                  background: filterDomain === d ? `${DOMAIN_COLORS[d]}18` : SURFACE,
                  border: `1px solid ${filterDomain === d ? DOMAIN_COLORS[d] : BORDER}`,
                }}
                data-testid={`domain-${d}`}
              >
                <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: DOMAIN_COLORS[d] }}>{d}</div>
                <div className="text-[18px] font-semibold text-white mt-1">{stats.open}</div>
                <div className="text-[9px]" style={{ color: "#94a3b8" }}>open · {stats.total} total</div>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Intake Form */}
          <div className="col-span-1 rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="concierge-intake-form">
            <div className="flex items-center gap-2 mb-3">
              <Send size={14} style={{ color: ACCENT }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>New Request</div>
            </div>
            <label className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={doClassify}
              className="w-full mt-1 mb-2 px-2 py-1.5 text-[11px] rounded"
              style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, color: "white" }}
              placeholder="Short summary"
              data-testid="concierge-title-input"
            />
            <label className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Body</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              onBlur={doClassify}
              rows={4}
              className="w-full mt-1 mb-2 px-2 py-1.5 text-[11px] rounded"
              style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, color: "white" }}
              placeholder="Detail / context / guest language"
              data-testid="concierge-body-input"
            />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Room</label>
                <input value={roomNo} onChange={e => setRoomNo(e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 text-[11px] rounded"
                  style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, color: "white" }}
                  data-testid="concierge-room-input" />
              </div>
              <div>
                <label className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Guest</label>
                <input value={guestName} onChange={e => setGuestName(e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 text-[11px] rounded"
                  style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, color: "white" }}
                  data-testid="concierge-guest-input" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-[10px] mb-3" style={{ color: "#94a3b8" }}>
              <input type="checkbox" checked={vip} onChange={e => setVip(e.target.checked)} data-testid="concierge-vip-toggle" />
              VIP guest
            </label>

            {/* Classifier preview */}
            {preview && (
              <div className="mb-3 rounded p-2" style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${BORDER}` }} data-testid="concierge-preview">
                <div className="flex items-center gap-2 text-[9px] uppercase" style={{ color: "#94a3b8" }}>
                  <Sparkles size={10} style={{ color: ACCENT }} /> Routing Preview
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${DOMAIN_COLORS[preview.classification?.domain] || ACCENT}20`, color: DOMAIN_COLORS[preview.classification?.domain] || ACCENT }}>
                    → {preview.classification?.domain}
                  </span>
                  <span className="text-[10px]" style={{ color: "#94a3b8" }}>
                    {preview.classification?.severity} · {preview.classification?.category}
                  </span>
                </div>
                {preview.liability_findings?.length > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-[9px]" style={{ color: AMBER }}>
                    <Shield size={10} /> {preview.liability_findings.length} redaction(s) will apply
                  </div>
                )}
              </div>
            )}

            <button
              onClick={submit}
              disabled={submitting || !title}
              className="w-full flex items-center justify-center gap-2 py-2 rounded text-[11px] font-semibold"
              style={{ background: ACCENT, color: "#04060d", opacity: !title ? 0.5 : 1 }}
              data-testid="concierge-submit"
            >
              <Send size={12} />
              {submitting ? "Submitting..." : "Submit & Auto-Route"}
            </button>

            {result && (
              <div className="mt-3 rounded p-2" style={{ background: `${GREEN}10`, border: `1px solid ${GREEN}40` }} data-testid="concierge-result">
                <div className="text-[10px]" style={{ color: GREEN }}>
                  ✓ Routed to <b>{result.routed_to}</b>
                </div>
                <div className="text-[9px]" style={{ color: "#94a3b8" }}>
                  Confirmation: {result.ticket?.confirmation_no}
                </div>
                {result.downstream?.ref_no && (
                  <div className="text-[9px]" style={{ color: "#94a3b8" }}>
                    Downstream ref: {result.downstream.ref_no}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Feed */}
          <div className="col-span-2 rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="concierge-feed">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
                  {filterDomain ? `${filterDomain} tickets` : "All tickets"}
                </div>
                <div className="text-[9px]" style={{ color: "#94a3b8" }}>
                  ({tickets?.count || 0})
                </div>
              </div>
              {filterDomain && (
                <button onClick={() => setFilterDomain("")} className="text-[9px] underline" style={{ color: ACCENT }} data-testid="clear-filter">
                  clear filter
                </button>
              )}
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              {(tickets?.items || []).slice(0, 40).map((t: any) => (
                <div key={t.id} className="py-2 border-b border-white/5" data-testid={`ticket-${t.id}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${DOMAIN_COLORS[t.domain]}20`, color: DOMAIN_COLORS[t.domain] }}>
                      {t.domain}
                    </span>
                    <span className="text-[11px] text-white flex-1 truncate">{t.title}</span>
                    <span className="text-[9px]" style={{ color: t.severity === "critical" ? RED : t.severity === "high" ? AMBER : "#94a3b8" }}>
                      {t.severity}
                    </span>
                    <span className="text-[9px]" style={{ color: "#94a3b8" }}>{t.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[9px]" style={{ color: "#64748b" }}>
                    {t.room_no && <span>#{t.room_no}</span>}
                    {t.guest_name && <span>{t.guest_name}</span>}
                    {t.vip && <span style={{ color: AMBER }}>★VIP</span>}
                    <span>{new Date(t.created_at).toLocaleString()}</span>
                    {t.confirmation_no && <span className="ml-auto">{t.confirmation_no}</span>}
                  </div>
                  {t.body && <div className="text-[10px] mt-1" style={{ color: "#94a3b8" }}>{t.body}</div>}
                </div>
              ))}
              {(!tickets || !tickets.items || tickets.items.length === 0) && (
                <div className="text-[10px] text-center py-8" style={{ color: "#64748b" }}>No tickets yet. Submit a request to see it routed here.</div>
              )}
            </div>
          </div>
        </div>

        {stats && (
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="concierge-stats">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: ACCENT }}>7-Day Stats</div>
            <div className="grid grid-cols-6 gap-2 text-[10px]">
              <div>
                <div style={{ color: "#94a3b8" }}>Total</div>
                <div className="text-[16px] font-semibold text-white">{stats.last_7_days?.total}</div>
              </div>
              <div>
                <div style={{ color: "#94a3b8" }}>Resolved</div>
                <div className="text-[16px] font-semibold" style={{ color: GREEN }}>{stats.last_7_days?.resolved}</div>
              </div>
              <div>
                <div style={{ color: "#94a3b8" }}>Rate</div>
                <div className="text-[16px] font-semibold" style={{ color: ACCENT }}>{stats.last_7_days?.resolution_rate}%</div>
              </div>
              <div>
                <div style={{ color: "#94a3b8" }}>VIP</div>
                <div className="text-[16px] font-semibold" style={{ color: AMBER }}>{stats.last_7_days?.vip_count}</div>
              </div>
              <div>
                <div style={{ color: "#94a3b8" }}>Avg Res min</div>
                <div className="text-[16px] font-semibold text-white">{stats.last_7_days?.avg_resolution_minutes}</div>
              </div>
              <div>
                <div style={{ color: "#94a3b8" }}>Critical</div>
                <div className="text-[16px] font-semibold" style={{ color: RED }}>{stats.last_7_days?.by_severity?.critical || 0}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
