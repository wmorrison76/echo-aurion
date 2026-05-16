/**
 * ProductionReminderBanner
 * ------------------------
 * Persistent banner that sits at the top of the LUCCCA dashboard.
 * Surfaces Cake / Specialty Cake / Production / Decorating work that
 * is due soon. Groups multiple items on the same day so users don't
 * click through a dozen toasts.
 *
 * Behaviour per user spec:
 *  - Stays visible until acknowledged.
 *  - Demands attention (no auto-dismiss, no "x to close for session").
 *  - Single call-to-action opens a full details drawer.
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  Bell, AlertTriangle, ChefHat, Calendar, X, ChevronRight,
  Phone, MapPin, Clock, FileText, CheckCircle2,
} from "lucide-react";

const ACCENT = "#c8a97e";
const CRITICAL = "#ef4444";
const WARN = "#f59e0b";
const BORDER = "rgba(255,255,255,0.08)";
const API = typeof window !== "undefined" ? window.location.origin : "";

type Bucket = "overdue" | "today" | "tomorrow" | "this_week" | "later";
interface Summary {
  total_open: number;
  buckets: Record<Bucket, number>;
  critical_count: number;
  next_up: { id: string; title: string; client?: string; label: string; days: number; bucket: Bucket } | null;
  headline: string;
}
interface ReminderItem {
  id: string; kind: string; priority: string; title: string;
  client_name?: string; client_phone?: string; due_date: string;
  delivery_time?: string; venue?: string;
  beo_id?: string | null; beo_link?: string | null;
  assigned_chef?: string; assigned_decorator?: string;
  flavor_profile?: any[]; decorations?: string[]; dietary_notes?: string;
  prep_stage?: string; status?: string;
  relative: { label: string; days: number; bucket: Bucket };
}
interface DayGroup {
  date: string; label: string; count: number; bucket: Bucket;
  items: ReminderItem[];
}

export default function ProductionReminderBanner() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [selected, setSelected] = useState<ReminderItem | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/production-schedules/summary`);
      if (r.ok) setSummary(await r.json());
    } catch { /* silent */ }
  }, []);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/production-schedules/grouped-by-day`);
      if (r.ok) {
        const d = await r.json();
        setGroups(d.groups || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSummary();
    const t = setInterval(loadSummary, 60_000);
    return () => clearInterval(t);
  }, [loadSummary]);

  const openDrawer = async () => {
    setDrawerOpen(true);
    await loadGroups();
  };

  const acknowledge = async (id: string) => {
    await fetch(`${API}/api/production-schedules/${id}/acknowledge`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ by: "Chef Gio" }),
    });
    setSelected(null);
    await Promise.all([loadSummary(), loadGroups()]);
  };

  const acknowledgeAll = async () => {
    if (!confirm("Acknowledge ALL open production reminders?")) return;
    await fetch(`${API}/api/production-schedules/acknowledge-all`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ by: "Chef Gio" }),
    });
    await Promise.all([loadSummary(), loadGroups()]);
  };

  if (!summary || summary.total_open === 0) return null;

  const crit = summary.critical_count;
  const isUrgent = crit > 0 || summary.buckets.overdue > 0;
  const barColor = summary.buckets.overdue > 0 ? CRITICAL : isUrgent ? WARN : ACCENT;

  return (
    <>
      {/* Persistent banner */}
      <div
        data-testid="production-reminder-banner"
        className="w-full relative overflow-hidden"
        style={{
          background: `linear-gradient(90deg, ${barColor}15 0%, ${barColor}08 55%, transparent 100%)`,
          borderBottom: `1px solid ${barColor}40`,
          borderTop: `1px solid ${barColor}25`,
        }}
      >
        <div className="container flex items-center gap-4 py-3 px-4">
          {/* Pulse icon */}
          <div className="relative shrink-0">
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: barColor, opacity: 0.35 }}
            />
            <span
              className="relative flex items-center justify-center w-9 h-9 rounded-full"
              style={{ background: `${barColor}20`, border: `1px solid ${barColor}` }}
            >
              {summary.buckets.overdue > 0
                ? <AlertTriangle className="w-4 h-4" style={{ color: barColor }} />
                : <Bell className="w-4 h-4" style={{ color: barColor }} />}
            </span>
          </div>

          {/* Headline + counts · theme-aware (foreground respects dark/light) */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="font-semibold text-[13px] text-foreground leading-tight">
                Pastry · Cake · Production
              </div>
              <div
                className="text-[11px] font-mono uppercase tracking-wider"
                style={{ color: barColor }}
              >
                {summary.headline}
              </div>
            </div>
            {summary.next_up && (
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                Next up · <span className="text-foreground/85">{summary.next_up.title}</span>
                {summary.next_up.client && (
                  <span className="text-muted-foreground"> — {summary.next_up.client}</span>
                )}
                <span className="text-muted-foreground"> · {summary.next_up.label}</span>
              </div>
            )}
          </div>

          {/* Bucket pills */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            <BucketPill label="Overdue" count={summary.buckets.overdue} color={CRITICAL} />
            <BucketPill label="Today" count={summary.buckets.today} color={CRITICAL} />
            <BucketPill label="Tomorrow" count={summary.buckets.tomorrow} color={WARN} />
            <BucketPill label="This week" count={summary.buckets.this_week} color={ACCENT} />
          </div>

          {/* Review button */}
          <button
            data-testid="reminder-banner-review-btn"
            onClick={openDrawer}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all hover:brightness-110"
            style={{
              background: barColor,
              color: "#0b1020",
              boxShadow: `0 0 14px ${barColor}40`,
            }}
          >
            Review
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[1000] flex justify-end"
          style={{ background: "rgba(4,6,13,0.72)", backdropFilter: "blur(6px)" }}
          onClick={() => { setDrawerOpen(false); setSelected(null); }}
          data-testid="reminder-drawer"
        >
          <div
            className="h-full w-full max-w-[560px] flex flex-col shadow-2xl"
            style={{ background: "#0b1020", borderLeft: `1px solid ${BORDER}` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: `${ACCENT}99` }}>
                  Production Reminders
                </div>
                <div className="text-[15px] font-semibold text-foreground mt-0.5">
                  {summary.total_open} open · grouped by day
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={acknowledgeAll}
                  className="text-[10px] px-2.5 py-1 rounded font-medium"
                  style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}35` }}
                  data-testid="reminder-ack-all-btn"
                >
                  Ack all
                </button>
                <button
                  onClick={() => { setDrawerOpen(false); setSelected(null); }}
                  className="p-1.5 rounded hover:bg-white/[0.05]"
                  data-testid="reminder-drawer-close"
                >
                  <X className="w-4 h-4 text-foreground/50" />
                </button>
              </div>
            </div>

            {/* Groups list */}
            <div className="flex-1 overflow-auto">
              {loading && <div className="text-center text-foreground/30 text-[11px] py-10">Loading…</div>}
              {!loading && groups.length === 0 && (
                <div className="text-center text-foreground/30 text-[11px] py-10">Nothing outstanding — well done.</div>
              )}
              {!loading && groups.map((g) => (
                <div key={g.date} className="border-b" style={{ borderColor: BORDER }}>
                  <div
                    className="px-5 py-2.5 flex items-center justify-between"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" style={{ color: _bucketColor(g.bucket) }} />
                      <div className="text-[12px] font-semibold text-foreground">{g.label}</div>
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase"
                        style={{
                          background: `${_bucketColor(g.bucket)}18`,
                          color: _bucketColor(g.bucket),
                          border: `1px solid ${_bucketColor(g.bucket)}35`,
                        }}
                      >
                        {g.bucket.replace("_", " ")}
                      </span>
                    </div>
                    <div className="text-[10px] text-foreground/40 font-mono">
                      {g.count} item{g.count === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="divide-y" style={{ borderColor: BORDER }}>
                    {g.items.map((it) => (
                      <button
                        key={it.id}
                        onClick={() => setSelected(it)}
                        className="w-full text-left px-5 py-3 flex items-center gap-3 transition-all hover:bg-white/[0.02]"
                        data-testid={`reminder-item-${it.id}`}
                      >
                        <KindIcon kind={it.kind} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold text-foreground truncate">{it.title}</div>
                          <div className="text-[10px] text-foreground/45 truncate">
                            {it.client_name}
                            {it.delivery_time && <span className="text-foreground/30"> · {it.delivery_time}</span>}
                            {it.venue && <span className="text-foreground/30"> · {it.venue}</span>}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-foreground/25 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail dialog */}
          {selected && (
            <DetailPanel item={selected} onClose={() => setSelected(null)} onAck={acknowledge} />
          )}
        </div>
      )}
    </>
  );
}

function BucketPill({ label, count, color }: { label: string; count: number; color: string }) {
  if (!count) return null;
  return (
    <div
      className="px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider"
      style={{
        background: `${color}12`,
        color,
        border: `1px solid ${color}35`,
      }}
    >
      {count} {label}
    </div>
  );
}

function KindIcon({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    cake: "#e8c07d",
    specialty_cake: "#c89df0",
    production: "#7dd3fc",
    decorating: "#86efac",
  };
  const c = map[kind] || ACCENT;
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
      style={{ background: `${c}18`, border: `1px solid ${c}40` }}
    >
      <ChefHat className="w-3.5 h-3.5" style={{ color: c }} />
    </div>
  );
}

function DetailPanel({
  item, onClose, onAck,
}: {
  item: ReminderItem; onClose: () => void; onAck: (id: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-6"
      style={{ background: "rgba(4,6,13,0.85)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
      data-testid="reminder-detail-modal"
    >
      <div
        className="w-full max-w-[620px] max-h-[85vh] overflow-auto rounded-xl"
        style={{ background: "#0b1020", border: `1px solid ${BORDER}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-5 border-b flex items-start justify-between gap-4"
          style={{ borderColor: BORDER, background: `linear-gradient(90deg, ${_bucketColor(item.relative.bucket)}12 0%, transparent 100%)` }}
        >
          <div className="flex-1">
            <div
              className="text-[9px] font-mono uppercase tracking-[0.25em] mb-1"
              style={{ color: _bucketColor(item.relative.bucket) }}
            >
              {item.kind.replace("_", " ")} · {item.priority} priority · {item.relative.label}
            </div>
            <div className="text-[18px] font-semibold text-foreground leading-tight">{item.title}</div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/[0.05]">
            <X className="w-4 h-4 text-foreground/50" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Key facts grid */}
          <div className="grid grid-cols-2 gap-3">
            <Fact icon={<ChefHat className="w-3.5 h-3.5" />} label="Client" value={item.client_name} />
            <Fact icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={item.client_phone} />
            <Fact icon={<Clock className="w-3.5 h-3.5" />} label="Delivery" value={item.delivery_time} />
            <Fact icon={<MapPin className="w-3.5 h-3.5" />} label="Venue" value={item.venue} />
            <Fact icon={<ChefHat className="w-3.5 h-3.5" />} label="Chef" value={item.assigned_chef} />
            <Fact icon={<ChefHat className="w-3.5 h-3.5" />} label="Decorator" value={item.assigned_decorator} />
          </div>

          {/* Flavor profile */}
          {item.flavor_profile && item.flavor_profile.length > 0 && (
            <Block title="FLAVOR PROFILE">
              <div className="space-y-1.5">
                {item.flavor_profile.map((f: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-[11px] py-1.5 px-2.5 rounded"
                    style={{ background: "rgba(200,169,126,0.06)", border: `1px solid ${ACCENT}20` }}>
                    <div className="text-foreground/80 font-medium">
                      {f.tier != null && <span className="text-foreground/40">Tier {f.tier} · </span>}
                      {f.batch && <span className="text-foreground/40">{f.batch} · </span>}
                      {f.flavor && <span>{f.flavor}</span>}
                    </div>
                    <div className="text-foreground/50 text-[10px] font-mono">
                      {f.filling || (f.qty ? `${f.qty} pcs` : "")}
                    </div>
                  </div>
                ))}
              </div>
            </Block>
          )}

          {/* Decorations */}
          {item.decorations && item.decorations.length > 0 && (
            <Block title="DECORATIONS & FINISHING">
              <div className="flex flex-wrap gap-1.5">
                {item.decorations.map((d, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded"
                    style={{ background: `${ACCENT}10`, color: ACCENT, border: `1px solid ${ACCENT}30` }}>
                    {d}
                  </span>
                ))}
              </div>
            </Block>
          )}

          {/* Dietary notes */}
          {item.dietary_notes && (
            <Block title="DIETARY & ALLERGENS">
              <div className="text-[11px] text-foreground/80 leading-relaxed">{item.dietary_notes}</div>
            </Block>
          )}

          {/* BEO link */}
          {item.beo_id && (
            <Block title="LINKED BEO">
              <a
                href={item.beo_link || "#"}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded transition-all hover:brightness-110"
                style={{ background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}40` }}
                data-testid="reminder-beo-link"
              >
                <FileText className="w-3.5 h-3.5" />
                {item.beo_id}
                <ChevronRight className="w-3 h-3" />
              </a>
            </Block>
          )}
        </div>

        {/* Footer actions */}
        <div
          className="px-6 py-4 border-t flex items-center justify-between gap-3"
          style={{ borderColor: BORDER, background: "rgba(255,255,255,0.015)" }}
        >
          <div className="text-[9px] font-mono text-foreground/30 uppercase tracking-wider">
            Prep stage · {item.prep_stage?.replace("_", " ") || "pending"}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-[11px] font-medium text-foreground/60"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}
            >
              Close
            </button>
            <button
              onClick={() => onAck(item.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-[11px] font-semibold"
              style={{ background: ACCENT, color: "#0b1020" }}
              data-testid="reminder-ack-btn"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Acknowledge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-md px-3 py-2" style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-foreground/40">
        <span style={{ color: ACCENT }}>{icon}</span>
        {label}
      </div>
      <div className="text-[12px] text-foreground mt-0.5 truncate">{value}</div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-foreground/35 mb-2">{title}</div>
      {children}
    </div>
  );
}

function _bucketColor(b: Bucket): string {
  if (b === "overdue" || b === "today") return CRITICAL;
  if (b === "tomorrow") return WARN;
  if (b === "this_week") return ACCENT;
  return "#64748b";
}
