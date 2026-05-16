import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight,
  Shield, Brain, TrendingUp, Users, Clock, DollarSign, UtensilsCrossed,
  Building, Wrench, FileText,
} from "lucide-react";

const API = window.location.origin;
const GET = (p: string) => fetch(`${API}/api/chef-gio${p}`).then(r => r.json());
const POST = (p: string, b: any = {}) =>
  fetch(`${API}/api/chef-gio${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json());

const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const SURFACE = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#c8a97e";

const CAT_ICONS: Record<string, typeof Users> = {
  guest_count: Users, room_assignment: Building, menu_composition: UtensilsCrossed,
  timing: Clock, staffing: Users, financial: DollarSign, equipment: Wrench,
};
const CONF_COLOR = (c: number) => c >= 0.9 ? "#22c55e" : c >= 0.7 ? "#f59e0b" : "#ef4444";

type DecisionStatus = "pending" | "approved" | "corrected" | "flagged";

interface Decision {
  id: string; category: string; title: string;
  echoai_reasoning: string; echoai_recommendation: any;
  current_value: any; confidence: number;
  status: DecisionStatus; correction?: string; correction_reasoning?: string;
}

export default function BEOReviewPanel() {
  const [queue, setQueue] = useState<any>(null);
  const [selectedBeo, setSelectedBeo] = useState<string>("");
  const [reviewData, setReviewData] = useState<any>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [expandedDec, setExpandedDec] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [accuracy, setAccuracy] = useState<any>(null);
  const [overallNotes, setOverallNotes] = useState("");

  useEffect(() => {
    GET("/beo-review/queue").then(setQueue);
    GET("/review-accuracy").then(setAccuracy);
  }, []);

  const loadBeo = useCallback(async (beoId: string) => {
    setSelectedBeo(beoId);
    setSubmitResult(null);
    const data = await GET(`/beo-review/${beoId}`);
    setReviewData(data);
    setDecisions(data.echoai_decisions?.map((d: any) => ({ ...d, status: "pending" as DecisionStatus })) || []);
    setExpandedDec(new Set(data.echoai_decisions?.map((d: any) => d.id) || []));
  }, []);

  const updateDecision = (id: string, field: string, value: any) => {
    setDecisions(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const approveAll = () => {
    setDecisions(prev => prev.map(d => ({ ...d, status: "approved" as DecisionStatus })));
  };

  const submitReview = async () => {
    setSubmitting(true);
    const result = await POST(`/beo-review/${selectedBeo}/submit`, {
      chef_name: "Executive Chef",
      decisions: decisions.map(d => ({
        id: d.id, category: d.category, status: d.status,
        echoai_recommendation: d.echoai_recommendation,
        correction: d.correction || "", correction_reasoning: d.correction_reasoning || "",
      })),
      overall_notes: overallNotes,
    });
    setSubmitResult(result);
    setSubmitting(false);
    GET("/beo-review/queue").then(setQueue);
    GET("/review-accuracy").then(setAccuracy);
  };

  const toggleExpand = (id: string) => {
    setExpandedDec(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const beo = reviewData?.beo;
  const audit = reviewData?.audit;
  const pendingCount = decisions.filter(d => d.status === "pending").length;
  const approvedCount = decisions.filter(d => d.status === "approved").length;
  const correctedCount = decisions.filter(d => d.status === "corrected").length;

  return (
    <div className="flex h-full overflow-hidden" data-testid="beo-review-panel">
      {/* Left: Queue */}
      <div className="w-64 shrink-0 border-r overflow-auto scrollbar-hide" style={{ borderColor: BORDER, background: "rgba(0,0,0,0.2)" }}>
        <div className="px-3 py-3 border-b" style={{ borderColor: BORDER }}>
          <div className="text-[11px] font-semibold text-white mb-1">REVIEW QUEUE</div>
          {accuracy && (
            <div className="flex items-center gap-2 text-[9px]">
              <span style={{ color: ACCENT }}>Accuracy: {accuracy.accuracy}%</span>
              <span className="text-white/30">|</span>
              <span className={accuracy.trend === "improving" ? "text-[#22c55e]" : "text-[#f59e0b]"}>{accuracy.trend}</span>
            </div>
          )}
        </div>
        <div className="space-y-0.5 p-1">
          {queue?.queue?.map((q: any) => (
            <button key={q.beo_id} onClick={() => loadBeo(q.beo_id)}
              className="w-full text-left px-2.5 py-2 rounded-md transition-all"
              style={{
                background: selectedBeo === q.beo_id ? `${ACCENT}10` : "transparent",
                border: selectedBeo === q.beo_id ? `1px solid ${ACCENT}25` : "1px solid transparent",
              }}
              data-testid={`review-queue-${q.beo_number}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-white">#{q.beo_number}</span>
                <span className={`text-[7px] px-1 py-0.5 rounded font-bold uppercase ${
                  q.review_status === "approved" ? "text-[#22c55e] bg-[#22c55e]/10" :
                  q.review_status === "corrected" ? "text-[#f59e0b] bg-[#f59e0b]/10" :
                  "text-white/40 bg-white/5"
                }`}>{q.review_status}</span>
              </div>
              <div className="text-[9px] text-white/50 truncate">{q.event_name}</div>
              <div className="text-[8px] text-white/30">{q.event_date} | {q.room} | {q.guaranteed_count}g</div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Review Panel */}
      <div className="flex-1 overflow-auto scrollbar-hide">
        {!selectedBeo ? (
          <div className="flex flex-col items-center justify-center h-full text-white/30 text-sm gap-2">
            <Shield className="w-8 h-8" style={{ color: ACCENT }} />
            <span>Select a BEO to review EchoAi decisions</span>
            {queue && <span className="text-[10px]">{queue.pending_review} pending review</span>}
          </div>
        ) : !reviewData ? (
          <div className="flex items-center justify-center h-full text-white/40 text-sm">Loading...</div>
        ) : (
          <div className="p-4 space-y-3">
            {/* BEO Header */}
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-white">BEO #{beo?.beo_number} — {beo?.event_name}</div>
                <div className="text-[10px] text-white/50">{beo?.event_date} | {beo?.room} | {beo?.guaranteed_count} guaranteed | {beo?.event_classification} | Rev {beo?.revision}</div>
              </div>
              {audit && (
                <div className="text-right">
                  <div className={`text-[9px] font-bold uppercase ${audit.status === "clean" ? "text-[#22c55e]" : "text-[#f59e0b]"}`}>
                    Audit: {audit.status}
                  </div>
                  <div className="text-[8px] text-white/30">{audit.total_issues} issues | {audit.total_warnings} warnings</div>
                </div>
              )}
            </div>

            {/* Submit result */}
            {submitResult && (
              <div className="p-3 rounded-lg" style={{ background: submitResult.status === "approved" ? "rgba(34,197,94,0.05)" : "rgba(245,158,11,0.05)", border: `1px solid ${submitResult.status === "approved" ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)"}` }}>
                <div className="text-[11px] font-semibold" style={{ color: submitResult.status === "approved" ? "#22c55e" : "#f59e0b" }}>
                  Review submitted: {submitResult.approved} approved, {submitResult.corrected} corrected, {submitResult.flagged} flagged
                </div>
                {submitResult.training_data_created > 0 && (
                  <div className="text-[9px] text-white/50 mt-1">{submitResult.training_data_created} corrections added to EchoAi training data</div>
                )}
              </div>
            )}

            {/* Quick actions */}
            <div className="flex items-center gap-2">
              <button onClick={approveAll} className="px-3 py-1.5 rounded-md text-[10px] font-medium transition-all" data-testid="approve-all-btn"
                style={{ background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.15)" }}>
                <CheckCircle className="w-3 h-3 inline mr-1" />Approve All
              </button>
              <div className="flex-1" />
              <span className="text-[9px] text-white/40" style={MONO}>
                {approvedCount} approved | {correctedCount} corrected | {pendingCount} pending
              </span>
            </div>

            {/* Decisions */}
            {decisions.map(dec => {
              const Icon = CAT_ICONS[dec.category] || Brain;
              const expanded = expandedDec.has(dec.id);
              return (
                <div key={dec.id} className="rounded-lg overflow-hidden" style={{ background: SURFACE, border: `1px solid ${dec.status === "approved" ? "rgba(34,197,94,0.12)" : dec.status === "corrected" ? "rgba(245,158,11,0.12)" : BORDER}` }}
                  data-testid={`decision-${dec.category}`}>
                  {/* Decision header */}
                  <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer" onClick={() => toggleExpand(dec.id)}>
                    <Icon className="w-4 h-4 shrink-0" style={{ color: ACCENT }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-white">{dec.title}</div>
                      <div className="text-[9px] text-white/40 truncate">{dec.echoai_reasoning.slice(0, 80)}...</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ color: CONF_COLOR(dec.confidence), background: `${CONF_COLOR(dec.confidence)}10` }}>
                        {(dec.confidence * 100).toFixed(0)}%
                      </span>
                      {/* Status buttons */}
                      <button onClick={e => { e.stopPropagation(); updateDecision(dec.id, "status", "approved"); }}
                        className={`p-1 rounded transition-all ${dec.status === "approved" ? "bg-[#22c55e]/15" : "hover:bg-white/5"}`}
                        title="Approve" data-testid={`approve-${dec.category}`}>
                        <CheckCircle className="w-3.5 h-3.5" style={{ color: dec.status === "approved" ? "#22c55e" : "rgba(148,163,184,0.3)" }} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); updateDecision(dec.id, "status", "corrected"); }}
                        className={`p-1 rounded transition-all ${dec.status === "corrected" ? "bg-[#f59e0b]/15" : "hover:bg-white/5"}`}
                        title="Correct" data-testid={`correct-${dec.category}`}>
                        <XCircle className="w-3.5 h-3.5" style={{ color: dec.status === "corrected" ? "#f59e0b" : "rgba(148,163,184,0.3)" }} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); updateDecision(dec.id, "status", "flagged"); }}
                        className={`p-1 rounded transition-all ${dec.status === "flagged" ? "bg-[#ef4444]/15" : "hover:bg-white/5"}`}
                        title="Flag" data-testid={`flag-${dec.category}`}>
                        <AlertTriangle className="w-3.5 h-3.5" style={{ color: dec.status === "flagged" ? "#ef4444" : "rgba(148,163,184,0.3)" }} />
                      </button>
                      {expanded ? <ChevronDown className="w-3 h-3 text-white/20" /> : <ChevronRight className="w-3 h-3 text-white/20" />}
                    </div>
                  </div>

                  {/* Expanded reasoning */}
                  {expanded && (
                    <div className="px-3 pb-3 space-y-2" style={{ borderTop: `1px solid ${BORDER}` }}>
                      <div className="pt-2">
                        <div className="text-[9px] font-mono uppercase tracking-wider text-white/30 mb-1">ECHOAI REASONING</div>
                        <div className="text-[10px] text-white/70 leading-relaxed">{dec.echoai_reasoning}</div>
                      </div>
                      <div className="flex items-center gap-3 text-[9px]">
                        <span className="text-white/40">Recommendation:</span>
                        <span className="font-mono text-white">{String(dec.echoai_recommendation)}</span>
                        <span className="text-white/40">Current:</span>
                        <span className="font-mono text-white/60">{String(dec.current_value)}</span>
                      </div>
                      {/* Correction inputs (only when corrected) */}
                      {dec.status === "corrected" && (
                        <div className="space-y-1.5 pt-1">
                          <input type="text" placeholder="Your correction (e.g., '6 staff instead of 4')"
                            value={dec.correction || ""} onChange={e => updateDecision(dec.id, "correction", e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded text-[10px] bg-transparent outline-none text-white placeholder-white/20"
                            style={{ border: `1px solid rgba(245,158,11,0.2)` }}
                            data-testid={`correction-input-${dec.category}`} />
                          <input type="text" placeholder="Why? (e.g., 'Need extra hands for omelet station')"
                            value={dec.correction_reasoning || ""} onChange={e => updateDecision(dec.id, "correction_reasoning", e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded text-[10px] bg-transparent outline-none text-white/70 placeholder-white/20"
                            style={{ border: `1px solid rgba(255,255,255,0.04)` }}
                            data-testid={`reasoning-input-${dec.category}`} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Overall notes + submit */}
            <div className="space-y-2 pt-2">
              <textarea placeholder="Overall notes for this BEO review..." value={overallNotes} onChange={e => setOverallNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[10px] bg-transparent outline-none text-white/70 placeholder-white/20 resize-none h-16"
                style={{ border: `1px solid ${BORDER}` }}
                data-testid="overall-notes" />
              <button onClick={submitReview} disabled={submitting || pendingCount === decisions.length}
                className="w-full py-2.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-40"
                style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
                data-testid="submit-review-btn">
                {submitting ? "Submitting..." : `Submit Review (${approvedCount} approved, ${correctedCount} corrected)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
