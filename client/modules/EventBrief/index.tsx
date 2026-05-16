import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, FileText, Clock, Users, UtensilsCrossed, Mic2, DollarSign, RefreshCw, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND = window.location.origin;
async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${BACKEND}/api/event-brief${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type TabId = "generate" | "briefs";
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "generate", label: "Generate Brief", icon: Sparkles },
  { id: "briefs", label: "Saved Briefs", icon: FileText },
];

export default function EventBriefPanel() {
  const [tab, setTab] = useState<TabId>("generate");
  const [viewBrief, setViewBrief] = useState<any>(null);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0e17" }} data-testid="event-brief-panel">
      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(168,85,247,0.15))", border: "1px solid rgba(245,158,11,0.25)" }}>
          <Sparkles className="w-[18px] h-[18px] text-amber-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white tracking-wide">AI Event Brief Generator</div>
          <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Inquiry to BEO in Seconds</div>
        </div>
      </div>
      <div className="flex border-b px-3" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {TABS.map(t => (
          <button key={t.id} data-testid={`brief-tab-${t.id}`} onClick={() => { setTab(t.id); setViewBrief(null); }}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-mono uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors"
            style={{ borderColor: tab === t.id ? "#f59e0b" : "transparent", color: tab === t.id ? "#fcd34d" : "#64748b" }}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {viewBrief ? <BriefView brief={viewBrief} onBack={() => setViewBrief(null)} /> :
         tab === "generate" ? <GenerateTab onGenerated={(b: any) => { setViewBrief(b); setTab("briefs"); }} /> :
         <BriefsTab onSelect={setViewBrief} />}
      </div>
    </div>
  );
}

function GenerateTab({ onGenerated }: { onGenerated: (b: any) => void }) {
  const [form, setForm] = useState({ client_name: "", event_type: "Corporate Dinner", guest_count: 100, date: "", budget_range: "", special_requests: "", dietary_notes: "", inquiry_text: "" });
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await api("/generate", { method: "POST", body: JSON.stringify(form) });
      onGenerated(result);
    } catch { }
    finally { setGenerating(false); }
  };

  const eventTypes = ["Corporate Dinner", "Wedding Reception", "Cocktail Party", "Conference", "Gala", "Product Launch", "Holiday Party", "Awards Ceremony", "Charity Fundraiser", "Team Building"];

  return (
    <div className="space-y-4 max-w-2xl" data-testid="brief-generate-tab">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Client Name" value={form.client_name} onChange={v => setForm(f => ({ ...f, client_name: v }))} placeholder="Johnson Corp" />
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Event Type</label>
          <select data-testid="event-type-select" value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/30 text-xs text-white focus:border-amber-500/40 outline-none">
            {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Field label="Guest Count" value={String(form.guest_count)} onChange={v => setForm(f => ({ ...f, guest_count: parseInt(v) || 0 }))} placeholder="150" type="number" />
        <Field label="Event Date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} placeholder="2026-03-15" type="date" />
        <Field label="Budget Range" value={form.budget_range} onChange={v => setForm(f => ({ ...f, budget_range: v }))} placeholder="$15,000 - $25,000" />
        <Field label="Dietary Notes" value={form.dietary_notes} onChange={v => setForm(f => ({ ...f, dietary_notes: v }))} placeholder="3 vegetarian, 1 gluten-free" />
      </div>
      <div>
        <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Special Requests</label>
        <textarea data-testid="special-requests-input" value={form.special_requests} onChange={e => setForm(f => ({ ...f, special_requests: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/30 text-xs text-white focus:border-amber-500/40 outline-none h-16 resize-none"
          placeholder="Live jazz trio, custom cocktail, branded signage..." />
      </div>
      <div>
        <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Client Inquiry (paste email/message)</label>
        <textarea data-testid="inquiry-text-input" value={form.inquiry_text} onChange={e => setForm(f => ({ ...f, inquiry_text: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/30 text-xs text-white focus:border-amber-500/40 outline-none h-20 resize-none"
          placeholder="Hi, we're looking to host our annual corporate gala for about 150 people..." />
      </div>
      <button data-testid="generate-brief-btn" onClick={generate} disabled={generating || !form.client_name}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-amber-500/20 to-violet-500/20 hover:from-amber-500/30 hover:to-violet-500/30 border border-amber-500/30 text-amber-300 text-xs font-mono uppercase tracking-wider disabled:opacity-50 transition-all">
        <Sparkles className={cn("w-4 h-4", generating && "animate-spin")} />
        {generating ? "Generating BEO with AI..." : "Generate Event Brief"}
      </button>
    </div>
  );
}

function BriefsTab({ onSelect }: { onSelect: (b: any) => void }) {
  const [briefs, setBriefs] = useState<any[]>([]);
  useEffect(() => { api("/briefs").then(d => setBriefs(d.briefs)).catch(() => {}); }, []);
  return (
    <div className="space-y-2" data-testid="brief-briefs-tab">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{briefs.length} Briefs</span>
      {briefs.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No briefs yet. Generate one from the first tab.</div>}
      {briefs.map(b => (
        <div key={b.brief_id} className="bg-slate-800/40 rounded-lg border border-slate-700/30 px-3 py-2.5 cursor-pointer hover:border-amber-500/30 transition-colors"
          onClick={() => onSelect(b)}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">{b.brief?.event_title || b.client_name}</span>
              {b.ai_generated && <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono">AI</span>}
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-mono",
                b.status === "draft" ? "bg-blue-500/15 text-blue-300" : b.status === "approved" ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700/40 text-slate-400"
              )}>{b.status}</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="flex gap-3 text-[10px] text-slate-500">
            <span>{b.event_type}</span><span>{b.guest_count} pax</span><span>{b.date || "TBD"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function BriefView({ brief, onBack }: { brief: any; onBack: () => void }) {
  const b = brief.brief;
  if (!b) return null;
  const cost = b.estimated_cost;
  return (
    <div className="space-y-4" data-testid="brief-view">
      <button onClick={onBack} className="text-[10px] text-slate-400 hover:text-white transition-colors">&larr; Back to briefs</button>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white">{b.event_title}</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">{b.event_summary}</p>
        </div>
        {brief.ai_generated && <span className="text-[9px] px-2 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20 font-mono">AI Generated</span>}
      </div>

      {/* Room */}
      <Section title="Room Recommendation" icon={<Users className="w-3.5 h-3.5 text-blue-400" />}>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div><span className="text-slate-500">Primary: </span><span className="text-white">{b.room_recommendation?.primary_room}</span></div>
          <div><span className="text-slate-500">Setup: </span><span className="text-white">{b.room_recommendation?.setup_style}</span></div>
          <div><span className="text-slate-500">Fit: </span><span className="text-white">{b.room_recommendation?.capacity_fit}</span></div>
          <div><span className="text-slate-500">Alt: </span><span className="text-white">{b.room_recommendation?.alt_room}</span></div>
        </div>
      </Section>

      {/* Timeline */}
      <Section title="Event Timeline" icon={<Clock className="w-3.5 h-3.5 text-cyan-400" />}>
        <div className="space-y-1">
          {b.timeline?.map((t: any, i: number) => (
            <div key={i} className="flex gap-3 text-[10px]">
              <span className="text-cyan-400 font-mono w-16 flex-shrink-0">{t.time}</span>
              <span className="text-white">{t.activity}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Menu */}
      <Section title="Menu Recommendation" icon={<UtensilsCrossed className="w-3.5 h-3.5 text-emerald-400" />}>
        <div className="text-[10px] text-slate-400 mb-2">Style: <span className="text-white">{b.menu_recommendation?.style}</span></div>
        {b.menu_recommendation?.courses?.map((c: any, i: number) => (
          <div key={i} className="mb-1.5">
            <span className="text-[9px] font-mono text-emerald-400">{c.course}:</span>
            <span className="text-[10px] text-white ml-2">{c.items?.join(", ")}</span>
            {c.notes && <span className="text-[10px] text-slate-500 ml-1">({c.notes})</span>}
          </div>
        ))}
        <div className="text-[10px] text-slate-400 mt-1">Beverage: <span className="text-white">{b.menu_recommendation?.beverage_package}</span></div>
      </Section>

      {/* Staffing */}
      <Section title="Staffing Plan" icon={<Users className="w-3.5 h-3.5 text-violet-400" />}>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {b.staffing_plan && Object.entries(b.staffing_plan).filter(([k]) => k !== "notes" && k !== "total").map(([k, v]) => (
            <div key={k} className="text-center">
              <div className="text-sm font-bold text-white">{String(v)}</div>
              <div className="text-[9px] text-slate-500 capitalize">{k.replace("_", " ")}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Cost */}
      {cost && (
        <Section title="Estimated Cost" icon={<DollarSign className="w-3.5 h-3.5 text-amber-400" />}>
          <div className="space-y-1 text-[10px]">
            {cost.food_beverage > 0 && <div className="flex justify-between"><span className="text-slate-400">F&B</span><span className="text-white font-mono">${cost.food_beverage?.toLocaleString()}</span></div>}
            {cost.room_rental > 0 && <div className="flex justify-between"><span className="text-slate-400">Room Rental</span><span className="text-white font-mono">${cost.room_rental?.toLocaleString()}</span></div>}
            {cost.av_decor > 0 && <div className="flex justify-between"><span className="text-slate-400">AV & Decor</span><span className="text-white font-mono">${cost.av_decor?.toLocaleString()}</span></div>}
            {cost.staffing > 0 && <div className="flex justify-between"><span className="text-slate-400">Staffing</span><span className="text-white font-mono">${cost.staffing?.toLocaleString()}</span></div>}
            <div className="flex justify-between pt-1.5 border-t border-slate-700/30">
              <span className="font-semibold text-white text-xs">ESTIMATED TOTAL</span>
              <span className="font-bold text-emerald-400 font-mono text-sm">${cost.estimated_total?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between"><span className="text-slate-500">Per Person</span><span className="text-amber-400 font-mono">${cost.per_person?.toLocaleString()}</span></div>
          </div>
        </Section>
      )}

      {b.notes_for_client && (
        <div className="p-3 rounded-lg border bg-amber-500/5 border-amber-500/15 text-[10px] text-slate-300">{b.notes_for_client}</div>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/30 rounded-lg border border-slate-700/20 p-3">
      <div className="flex items-center gap-1.5 mb-2">{icon}<span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span></div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/30 text-xs text-white focus:border-amber-500/40 outline-none placeholder:text-slate-600" />
    </div>
  );
}
