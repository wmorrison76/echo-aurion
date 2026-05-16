/**
 * Client Event Portal - "Plan Your Event" Pricing Portal
 * Public-facing prospect portal + Internal lead management.
 * Connects to /api/portal/* endpoints.
 */
import React, { useState, useCallback, useEffect } from "react";
import {
  Users,
  CalendarDays,
  DollarSign,
  Mail,
  Phone,
  Building2,
  Send,
  Loader2,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Star,
  Clock,
  Eye,
  UserPlus,
  MessageSquare,
  Filter,
  BarChart3,
  Globe,
  ArrowRight,
  Sparkles,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/glass";

const API = "";

async function api<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(`${API}/api/portal${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

function fmtUsd(n: number) { return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`; }

// ─── Step Indicator ────────────────────────────────────────────────
function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <React.Fragment key={i}>
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
            i < step ? "bg-cyan-500 text-white" : i === step ? "bg-cyan-500/20 text-cyan-300 border-2 border-cyan-500" : "bg-slate-700/50 text-slate-500")}>
            {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
          </div>
          {i < total - 1 && <div className={cn("flex-1 h-0.5 rounded", i < step ? "bg-cyan-500" : "bg-slate-700/50")} />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Prospect Wizard (Public-facing) ───────────────────────────────
function ProspectWizard({ onSubmitted }: { onSubmitted: (result: any) => void }) {
  const [step, setStep] = useState(0);
  const [eventTypes, setEventTypes] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<any>(null);
  const [availability, setAvailability] = useState<any>(null);
  const [submitted, setSubmitted] = useState<any>(null);

  const [prospect, setProspect] = useState({ first_name: "", last_name: "", email: "", phone: "", company: "", how_heard: "" });
  const [event, setEvent] = useState({
    event_type: "wedding", event_date: "", guest_count: 100, service_style: "buffet",
    meal_period: "dinner", tier: "classic", is_outdoor: false, budget_range: "",
    enhancements: [] as string[], bar_preference: "", special_requests: "",
    needs_hotel_rooms: false, estimated_room_nights: 0,
  });

  useEffect(() => { api("/event-types").then(setEventTypes); }, []);

  const toggleEnhancement = (id: string) => {
    setEvent(prev => ({
      ...prev,
      enhancements: prev.enhancements.includes(id) ? prev.enhancements.filter(e => e !== id) : [...prev.enhancements, id]
    }));
  };

  const checkAvailability = async () => {
    if (!event.event_date) return;
    const d = await api(`/check-availability?event_date=${event.event_date}&guest_count=${event.guest_count}&event_type=${event.event_type}`, { method: "POST" });
    setAvailability(d);
  };

  const getEstimate = async () => {
    setLoading(true);
    const d = await api("/estimate", { method: "POST", body: JSON.stringify(event) });
    setEstimate(d);
    setLoading(false);
  };

  const submitLead = async () => {
    setLoading(true);
    const d = await api("/submit-lead", { method: "POST", body: JSON.stringify({ prospect, event }) });
    setSubmitted(d);
    onSubmitted(d);
    setLoading(false);
  };

  const [shareUrl, setShareUrl] = useState("");

  const generateShareLink = async () => {
    if (!submitted?.lead_id) return;
    const d = await api(`/share-link/${submitted.lead_id}`, { method: "POST" });
    setShareUrl(`${window.location.origin}/api/portal/shared/${d.share_token}`);
  };

  if (submitted) {
    return (
      <div data-testid="submission-success" className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Thank You!</h2>
        <p className="text-slate-400 max-w-md mx-auto">{submitted.message}</p>
        {submitted.estimate && (
          <div className="mt-6 bg-slate-800/60 border border-emerald-500/20 rounded-xl p-4 max-w-sm mx-auto">
            <div className="text-xs text-slate-400 uppercase mb-1">Your Estimated Range</div>
            <div className="text-2xl font-bold text-emerald-400">{fmtUsd(submitted.estimate.price_range.low)} - {fmtUsd(submitted.estimate.price_range.high)}</div>
          </div>
        )}
        <div className="mt-6 space-y-2">
          {(submitted.next_steps || []).map((s: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm text-slate-300 justify-center"><ChevronRight className="w-4 h-4 text-cyan-400" />{s}</div>
          ))}
        </div>
        {/* Share Link */}
        <div className="mt-6">
          {!shareUrl ? (
            <button data-testid="share-estimate-btn" onClick={generateShareLink}
              className="inline-flex items-center gap-2 px-5 py-2 bg-violet-600/20 text-violet-300 rounded-lg text-sm hover:bg-violet-600/30 border border-violet-500/30">
              <Share2 className="w-4 h-4" /> Share Estimate with Co-Planner
            </button>
          ) : (
            <div className="max-w-md mx-auto bg-slate-800/50 border border-violet-500/20 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-2">Share this link with your co-planner:</div>
              <div className="flex gap-2">
                <input readOnly value={shareUrl} className="flex-1 bg-slate-700/60 text-sm text-slate-200 rounded px-2 py-1 border border-slate-600/50" />
                <button onClick={() => { navigator.clipboard.writeText(shareUrl); }} className="px-3 py-1 bg-violet-600/30 text-violet-300 rounded text-xs hover:bg-violet-600/40">Copy</button>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Each view is tracked as engagement for your sales agent</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="prospect-wizard" className="max-w-2xl mx-auto">
      <StepIndicator step={step} total={4} />

      {/* Step 0: Event Type */}
      {step === 0 && eventTypes && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-100">What type of event?</h2>
          <div className="grid grid-cols-2 gap-3">
            {(eventTypes.event_types || []).map((t: any) => (
              <button key={t.id} data-testid={`event-type-${t.id}`} onClick={() => setEvent(prev => ({ ...prev, event_type: t.id }))}
                className={cn("text-left rounded-lg p-4 border transition-all",
                  event.event_type === t.id ? "bg-cyan-500/15 border-cyan-500/40" : "bg-slate-800/40 border-slate-700/40 hover:border-slate-600")}>
                <div className="font-semibold text-slate-100">{t.label}</div>
                <div className="text-xs text-slate-400 mt-1">{t.description}</div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <label className="text-xs text-slate-400">Service Style</label>
              <select value={event.service_style} onChange={e => setEvent(prev => ({ ...prev, service_style: e.target.value }))}
                className="w-full bg-slate-800/60 text-slate-200 rounded-lg px-3 py-2 border border-slate-700/50 mt-1">
                {(eventTypes.service_styles || []).map((s: string) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Meal Period</label>
              <select value={event.meal_period} onChange={e => setEvent(prev => ({ ...prev, meal_period: e.target.value }))}
                className="w-full bg-slate-800/60 text-slate-200 rounded-lg px-3 py-2 border border-slate-700/50 mt-1">
                {(eventTypes.meal_periods || []).map((m: string) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={() => setStep(1)} className="flex items-center gap-2 px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Details */}
      {step === 1 && eventTypes && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-100">Event Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Event Date</label>
              <input type="date" value={event.event_date} onChange={e => setEvent(prev => ({ ...prev, event_date: e.target.value }))}
                className="w-full bg-slate-800/60 text-slate-200 rounded-lg px-3 py-2 border border-slate-700/50 mt-1" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Guest Count</label>
              <input type="number" value={event.guest_count} onChange={e => setEvent(prev => ({ ...prev, guest_count: +e.target.value }))}
                className="w-full bg-slate-800/60 text-slate-200 rounded-lg px-3 py-2 border border-slate-700/50 mt-1" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Package Tier</label>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {(eventTypes.tiers || []).map((t: any) => (
                  <button key={t.id} onClick={() => setEvent(prev => ({ ...prev, tier: t.id }))}
                    className={cn("text-left rounded p-2 text-xs border transition-all",
                      event.tier === t.id ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300" : "bg-slate-800/40 border-slate-700/40 text-slate-300 hover:border-slate-600")}>
                    <div className="font-semibold">{t.label}</div>
                    <div className="text-[10px] text-slate-500">{t.description}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400">Budget Range</label>
              <select value={event.budget_range} onChange={e => setEvent(prev => ({ ...prev, budget_range: e.target.value }))}
                className="w-full bg-slate-800/60 text-slate-200 rounded-lg px-3 py-2 border border-slate-700/50 mt-1">
                <option value="">Select range</option>
                {(eventTypes.budget_ranges || []).map((b: string) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {event.event_date && (
            <button onClick={checkAvailability} className="text-xs text-cyan-400 hover:text-cyan-300 underline">Check availability for {event.event_date}</button>
          )}
          {availability && (
            <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
              <div className="text-xs text-slate-400 mb-1">{availability.day_of_week} | {availability.pricing_note}</div>
              <div className="flex gap-2 overflow-x-auto">
                {(availability.venues_available || []).map((v: any) => (
                  <span key={v.venue_id} className="text-xs bg-emerald-500/15 text-emerald-300 rounded px-2 py-1 flex-shrink-0">{v.name} (up to {v.capacity})</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between mt-4">
            <button onClick={() => setStep(0)} className="text-sm text-slate-400 hover:text-slate-200"><ChevronLeft className="w-4 h-4 inline" /> Back</button>
            <button onClick={() => { getEstimate(); setStep(2); }} className="flex items-center gap-2 px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500">
              Get Estimate <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Enhancements + Estimate */}
      {step === 2 && eventTypes && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-100">Enhancements & Estimate</h2>
          <div className="grid grid-cols-2 gap-2">
            {(eventTypes.enhancements || []).map((e: any) => (
              <button key={e.id} data-testid={`enh-${e.id}`} onClick={() => toggleEnhancement(e.id)}
                className={cn("text-left rounded-lg p-3 border transition-all text-sm",
                  event.enhancements.includes(e.id) ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300" : "bg-slate-800/40 border-slate-700/40 text-slate-300 hover:border-slate-600")}>
                {event.enhancements.includes(e.id) && <CheckCircle className="w-3 h-3 inline mr-1" />}
                {e.label}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-slate-400">Bar Preference</label>
            <select value={event.bar_preference} onChange={e => setEvent(prev => ({ ...prev, bar_preference: e.target.value }))}
              className="w-full bg-slate-800/60 text-slate-200 rounded-lg px-3 py-2 border border-slate-700/50 mt-1">
              <option value="">No Bar</option>
              <option value="house">House</option>
              <option value="call">Call</option>
              <option value="premium">Premium</option>
              <option value="luxury">Luxury</option>
            </select>
          </div>

          {loading && <div className="flex items-center justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>}

          {estimate && (
            <div data-testid="estimate-result" className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-emerald-500/20 rounded-xl p-5">
              <div className="text-center mb-4">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Estimated Investment</div>
                <div className="text-3xl font-bold text-emerald-400 mt-1">{fmtUsd(estimate.estimate.price_range.low)} - {fmtUsd(estimate.estimate.price_range.high)}</div>
                <div className="text-xs text-slate-400 mt-1">{estimate.estimate.package_name} | {estimate.estimate.guest_count} guests</div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="bg-slate-800/60 rounded p-2">
                  <div className="text-slate-400">F&B/pp</div>
                  <div className="text-lg font-semibold text-slate-100">{fmtUsd(estimate.estimate.fnb_per_person)}</div>
                </div>
                <div className="bg-slate-800/60 rounded p-2">
                  <div className="text-slate-400">F&B Total</div>
                  <div className="text-lg font-semibold text-slate-100">{fmtUsd(estimate.estimate.fnb_total)}</div>
                </div>
                <div className="bg-slate-800/60 rounded p-2">
                  <div className="text-slate-400">Enhancements</div>
                  <div className="text-lg font-semibold text-slate-100">{fmtUsd(estimate.estimate.enhancements_total)}</div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 text-center mt-3">{estimate.note}</p>
            </div>
          )}

          <div className="flex justify-between mt-4">
            <button onClick={() => setStep(1)} className="text-sm text-slate-400 hover:text-slate-200"><ChevronLeft className="w-4 h-4 inline" /> Back</button>
            <button onClick={() => setStep(3)} className="flex items-center gap-2 px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500">
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Contact Info + Submit */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-100">Your Contact Information</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">First Name *</label>
              <input value={prospect.first_name} onChange={e => setProspect(prev => ({ ...prev, first_name: e.target.value }))}
                className="w-full bg-slate-800/60 text-slate-200 rounded-lg px-3 py-2 border border-slate-700/50 mt-1" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Last Name *</label>
              <input value={prospect.last_name} onChange={e => setProspect(prev => ({ ...prev, last_name: e.target.value }))}
                className="w-full bg-slate-800/60 text-slate-200 rounded-lg px-3 py-2 border border-slate-700/50 mt-1" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Email *</label>
              <input type="email" value={prospect.email} onChange={e => setProspect(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-slate-800/60 text-slate-200 rounded-lg px-3 py-2 border border-slate-700/50 mt-1" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Phone *</label>
              <input value={prospect.phone} onChange={e => setProspect(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full bg-slate-800/60 text-slate-200 rounded-lg px-3 py-2 border border-slate-700/50 mt-1" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Company / Organization</label>
              <input value={prospect.company} onChange={e => setProspect(prev => ({ ...prev, company: e.target.value }))}
                className="w-full bg-slate-800/60 text-slate-200 rounded-lg px-3 py-2 border border-slate-700/50 mt-1" />
            </div>
            <div>
              <label className="text-xs text-slate-400">How did you hear about us?</label>
              <input value={prospect.how_heard} onChange={e => setProspect(prev => ({ ...prev, how_heard: e.target.value }))}
                className="w-full bg-slate-800/60 text-slate-200 rounded-lg px-3 py-2 border border-slate-700/50 mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400">Special Requests</label>
            <textarea value={event.special_requests} onChange={e => setEvent(prev => ({ ...prev, special_requests: e.target.value }))} rows={3}
              className="w-full bg-slate-800/60 text-slate-200 rounded-lg px-3 py-2 border border-slate-700/50 mt-1" />
          </div>
          <div className="flex justify-between mt-4">
            <button onClick={() => setStep(2)} className="text-sm text-slate-400 hover:text-slate-200"><ChevronLeft className="w-4 h-4 inline" /> Back</button>
            <button data-testid="submit-lead-btn" onClick={submitLead} disabled={loading || !prospect.first_name || !prospect.email || !prospect.phone}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-xl font-semibold shadow-lg disabled:opacity-50 hover:from-emerald-500 hover:to-cyan-500">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Submit Inquiry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Lead Card ─────────────────────────────────────────────────────
function LeadCard({ lead, onClick }: { lead: any; onClick: () => void }) {
  const statusColors: Record<string, string> = {
    new: "bg-blue-500/20 text-blue-300",
    contacted: "bg-cyan-500/20 text-cyan-300",
    qualified: "bg-violet-500/20 text-violet-300",
    meeting_scheduled: "bg-amber-500/20 text-amber-300",
    proposal_sent: "bg-orange-500/20 text-orange-300",
    converted: "bg-emerald-500/20 text-emerald-300",
    lost: "bg-slate-500/20 text-slate-400",
  };
  const r = lead.client_resume || {};
  return (
    <button data-testid={`lead-${lead.lead_id}`} onClick={onClick} className="w-full text-left bg-slate-800/40 border border-slate-700/40 rounded-lg p-3 hover:border-cyan-500/30 transition-all">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-slate-100">{r.name || "Unknown"}</span>
        <span className={cn("text-[9px] rounded-full px-2 py-0.5 uppercase", statusColors[lead.status] || statusColors.new)}>{lead.status}</span>
      </div>
      <div className="text-xs text-slate-400">{r.event_type} | {r.guest_count} guests | {r.budget_range}</div>
      <div className="text-[10px] text-slate-500 mt-1">{r.email} | {lead.created_at?.split("T")[0]}</div>
      {lead.estimate && <div className="text-xs text-emerald-400 mt-1">{fmtUsd(lead.estimate.price_range?.low || 0)} - {fmtUsd(lead.estimate.price_range?.high || 0)}</div>}
    </button>
  );
}

// ─── Share Analytics ───────────────────────────────────────────────
function ShareAnalytics({ leadId }: { leadId: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    api(`/share-analytics/${leadId}`).then(setData).catch(() => {});
  }, [leadId]);
  if (!data || data.total_links === 0) return null;
  return (
    <div data-testid="share-analytics" className="bg-slate-800/40 border border-violet-500/20 rounded-lg p-3">
      <div className="text-[10px] text-slate-500 uppercase mb-1 flex items-center gap-1"><Share2 className="w-3 h-3" /> Shared Estimate Links</div>
      <div className="flex items-center gap-4 text-sm">
        <div><span className="text-violet-300 font-semibold">{data.total_links}</span> <span className="text-slate-400">links</span></div>
        <div><span className="text-cyan-300 font-semibold">{data.total_views}</span> <span className="text-slate-400">total views</span></div>
      </div>
      {data.links?.map((l: any) => (
        <div key={l.share_token} className="text-[10px] text-slate-500 mt-1">
          Token: {l.share_token} | Views: {l.views} | Created: {l.created_at?.split("T")[0]} {l.last_viewed ? `| Last: ${l.last_viewed.split("T")[0]}` : ""}
        </div>
      ))}
    </div>
  );
}

// ─── Leads Dashboard ───────────────────────────────────────────────
function LeadsDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("");

  const loadLeads = useCallback(async () => {
    const q = filterStatus ? `?status=${filterStatus}` : "";
    const d = await api(`/leads${q}`);
    setLeads(d.leads || []);
    setStats(d.stats || {});
  }, [filterStatus]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const assignLead = async (leadId: string, assignee: string) => {
    await api(`/leads/${leadId}/assign`, { method: "PUT", body: JSON.stringify({ assigned_to: assignee, notes: "Assigned via portal" }) });
    loadLeads();
  };

  const updateStatus = async (leadId: string, status: string) => {
    await api(`/leads/${leadId}/status?status=${status}`, { method: "PUT" });
    loadLeads();
    if (selectedLead?.lead_id === leadId) {
      const d = await api(`/leads/${leadId}`);
      setSelectedLead(d);
    }
  };

  const statuses = ["new", "contacted", "qualified", "meeting_scheduled", "proposal_sent", "converted", "lost"];

  return (
    <div data-testid="leads-dashboard" className="h-full flex flex-col">
      {/* Stats */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-slate-700/40 flex gap-3 overflow-x-auto">
        <button onClick={() => setFilterStatus("")} className={cn("flex-shrink-0 rounded-lg px-3 py-1.5 text-xs border transition-colors",
          !filterStatus ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-300" : "bg-slate-800/40 border-slate-700/40 text-slate-400 hover:border-slate-600")}>
          All ({stats.total || 0})
        </button>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
            className={cn("flex-shrink-0 rounded-lg px-3 py-1.5 text-xs border transition-colors",
              filterStatus === s ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-300" : "bg-slate-800/40 border-slate-700/40 text-slate-400 hover:border-slate-600")}>
            {s.replace(/_/g, " ")} ({stats[s] || 0})
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Lead List */}
        <div className="w-80 flex-shrink-0 border-r border-slate-700/40 p-4 overflow-y-auto space-y-2">
          {leads.map(l => <LeadCard key={l.lead_id} lead={l} onClick={() => setSelectedLead(l)} />)}
          {leads.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No leads yet</div>}
        </div>

        {/* Lead Detail */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedLead ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">Select a lead to view details</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-100">{selectedLead.client_resume?.name}</h2>
                <select value={selectedLead.status} onChange={e => updateStatus(selectedLead.lead_id, e.target.value)}
                  className="bg-slate-800/60 text-slate-200 rounded px-2 py-1 text-xs border border-slate-700/50">
                  {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
                  <div className="text-[10px] text-slate-500 uppercase">Contact</div>
                  <div className="text-sm text-slate-200 flex items-center gap-1 mt-1"><Mail className="w-3 h-3" /> {selectedLead.prospect?.email}</div>
                  <div className="text-sm text-slate-200 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" /> {selectedLead.prospect?.phone}</div>
                  {selectedLead.prospect?.company && <div className="text-sm text-slate-200 flex items-center gap-1 mt-1"><Building2 className="w-3 h-3" /> {selectedLead.prospect?.company}</div>}
                </div>
                <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/30">
                  <div className="text-[10px] text-slate-500 uppercase">Event</div>
                  <div className="text-sm text-slate-200 mt-1">{selectedLead.event?.event_type} | {selectedLead.event?.service_style}</div>
                  <div className="text-sm text-slate-200"><Users className="w-3 h-3 inline" /> {selectedLead.event?.guest_count} guests</div>
                  <div className="text-sm text-slate-200"><CalendarDays className="w-3 h-3 inline" /> {selectedLead.event?.event_date || "TBD"}</div>
                </div>
              </div>

              {selectedLead.estimate && (
                <div className="bg-slate-800/40 rounded-lg p-4 border border-emerald-500/20">
                  <div className="text-[10px] text-slate-500 uppercase mb-2">Estimate</div>
                  <div className="text-2xl font-bold text-emerald-400">{fmtUsd(selectedLead.estimate.price_range?.low || 0)} - {fmtUsd(selectedLead.estimate.price_range?.high || 0)}</div>
                  <div className="text-xs text-slate-400 mt-1">{selectedLead.estimate.package_name} | {fmtUsd(selectedLead.estimate.fnb_per_person || 0)}/pp</div>
                </div>
              )}

              {!selectedLead.assigned_to && (
                <button onClick={() => assignLead(selectedLead.lead_id, "Sales Manager")}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600/20 text-violet-300 rounded-lg text-sm hover:bg-violet-600/30 border border-violet-500/30">
                  <UserPlus className="w-4 h-4" /> Assign to Sales Manager
                </button>
              )}
              {selectedLead.assigned_to && (
                <div className="text-xs text-slate-400">Assigned to: <span className="text-violet-300">{selectedLead.assigned_to}</span></div>
              )}

              {/* Share Analytics */}
              <ShareAnalytics leadId={selectedLead.lead_id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function ClientPortal() {
  const [view, setView] = useState<"portal" | "leads">("portal");
  const [lastSubmission, setLastSubmission] = useState<any>(null);

  return (
    <div data-testid="client-portal-panel" className="h-full flex flex-col bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-700/60 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" /> Event Planning Portal
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">Client-facing event estimator + internal lead management</p>
          </div>
          <div className="flex gap-2">
            <button data-testid="tab-portal" onClick={() => setView("portal")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                view === "portal" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50")}>
              <Globe className="w-3.5 h-3.5" /> Plan Your Event
            </button>
            <button data-testid="tab-leads" onClick={() => setView("leads")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                view === "leads" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50")}>
              <BarChart3 className="w-3.5 h-3.5" /> Lead Management
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {view === "portal" ? (
          <div className="p-6">
            <ProspectWizard onSubmitted={setLastSubmission} />
          </div>
        ) : (
          <LeadsDashboard />
        )}
      </div>
    </div>
  );
}
