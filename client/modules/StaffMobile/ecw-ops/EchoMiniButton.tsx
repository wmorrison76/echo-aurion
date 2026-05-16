/** iter231 · Dark-blue Echo button + quick-launch sheet + voice chat.
 *
 * William's spec:
 *  - Single Echo button at bottom-right (dark blue, small, ⌘K style)
 *  - Short tap (<400ms) → quick-launch sheet (Activity / Dashboard / P&L +
 *    most-used desktop module links)
 *  - Long press (>550ms) → voice conversation (female educated tone) using
 *    browser SpeechRecognition + Claude via /api/echo-voice/chat + browser
 *    SpeechSynthesis. Dynamic — can open P&L / invoices / accruals based on
 *    the reply's `panel` field.
 *  - Activity / Dashboard / P&L views from iter228 are preserved inside the
 *    quick-launch sheet (not lost).
 */
import React from "react";
import { API } from "@/lib/api-url";
import { StaffConciergeV2 } from "./StaffConciergeV2";
import { StandupTab } from "./StandupTab";

function StandupInline({ onBack }: { onBack: () => void }) {
  return (
    <div data-testid="standup-quick-view">
      <button onClick={onBack}
        style={{ fontSize: 11, color: "#94a3b8", background: "none",
                  border: "1px solid rgba(148,163,184,0.2)", padding: "4px 10px",
                  borderRadius: 4, cursor: "pointer", marginBottom: 12 }}>
        ← Back
      </button>
      <StandupTab inline />
    </div>
  );
}

type QuickView = "home" | "activity" | "pnl" | "voice" | "weather" | "concierge" | "tickets" | "shift-notes" | "group-chat" | "standup";

export function EchoMiniButton({ outletId, onSwitchOutlet }: {
  outletId: string;
  onSwitchOutlet?: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [voiceOpen, setVoiceOpen] = React.useState(false);
  const [view, setView] = React.useState<QuickView>("home");
  const [requestedRoomId, setRequestedRoomId] = React.useState<string | undefined>(undefined);
  const [holding, setHolding] = React.useState(false);
  const pressStart = React.useRef<number>(0);
  const pressTimer = React.useRef<number | null>(null);

  // iter233 · Let other panels ask us to open a specific view
  React.useEffect(() => {
    const handler = (e: any) => {
      const v = (e?.detail?.view || "") as QuickView;
      if (!v) return;
      setOpen(true); setView(v);
      // iter241 · pass through optional room_id for group-chat
      setRequestedRoomId(e?.detail?.room_id);
    };
    window.addEventListener("echo:open-quick", handler);
    return () => window.removeEventListener("echo:open-quick", handler);
  }, []);

  function handlePressStart() {
    pressStart.current = Date.now();
    setHolding(true);
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      setVoiceOpen(true);                     // long press → voice mode
      navigator.vibrate?.(30);
    }, 550);
  }
  function handlePressEnd() {
    setHolding(false);
    if (pressTimer.current != null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
      // Short tap → quick launch
      setOpen(true);
      setView("home");
    }
  }
  function handlePressCancel() {
    setHolding(false);
    if (pressTimer.current != null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  return (
    <>
      <button data-testid="echo-mini-btn"
        onMouseDown={handlePressStart} onMouseUp={handlePressEnd}
        onMouseLeave={handlePressCancel}
        onTouchStart={handlePressStart} onTouchEnd={handlePressEnd}
        onTouchCancel={handlePressCancel}
        aria-label="Echo — tap for quick launch, hold for voice"
        style={{
          position: "fixed", right: 14, bottom: 14,
          padding: "9px 14px", borderRadius: 20,
          background: holding
            ? "linear-gradient(135deg, #0891b2 0%, #134e4a 100%)"
            : "linear-gradient(135deg, #1a2744 0%, #0f1a35 100%)",
          border: `1px solid ${holding ? "rgba(94,234,212,0.6)" : "rgba(96,165,250,0.35)"}`,
          color: holding ? "#5eead4" : "#c8a97e", fontSize: 11, cursor: "pointer",
          boxShadow: holding
            ? "0 0 28px rgba(94,234,212,0.4), 0 6px 18px rgba(8,145,178,0.5)"
            : "0 6px 18px rgba(15,26,53,0.6), 0 0 0 1px rgba(200,169,126,0.15)",
          zIndex: 9999990, fontWeight: 700, letterSpacing: 2,
          display: "flex", alignItems: "center", gap: 6,
          userSelect: "none", WebkitTouchCallout: "none",
          transition: "background 180ms, border-color 180ms, color 180ms, box-shadow 180ms",
        }}>
        <span style={{ fontSize: 12, lineHeight: 1 }}>{holding ? "🎙" : "◉"}</span>
        <span>ECHO</span>
        <span style={{ fontSize: 9, color: holding ? "#5eead4" : "#60a5fa", opacity: 0.7 }}>
          {holding ? "HOLD" : "⌘K"}
        </span>
      </button>

      {open && (
        <QuickLaunchSheet outletId={outletId} view={view} onSetView={setView}
          onClose={() => setOpen(false)}
          onOpenVoice={() => { setOpen(false); setVoiceOpen(true); }}
          onSwitchOutlet={onSwitchOutlet}
          requestedRoomId={requestedRoomId} />
      )}
      {voiceOpen && (
        <VoicePanel outletId={outletId} onClose={() => setVoiceOpen(false)} />
      )}
    </>
  );
}


// ── Quick launch sheet ──────────────────────────────────────────────────
const DESKTOP_LINKS = [
  { key: "menu-builder",   label: "Menu Builder",   icon: "📖", href: "/studio/menu-builder" },
  { key: "procurement",    label: "Procurement",    icon: "🛒", href: "/studio/procurement" },
  { key: "echo-waste",     label: "EchoWaste",      icon: "♻️", href: "/studio/echo-waste" },
  { key: "echo-aurium",    label: "EchoAurium",     icon: "💰", href: "/studio/echo-aurium" },
  { key: "echo-events",    label: "EchoEvents",     icon: "🎉", href: "/studio/echo-events" },
  { key: "recipe-library", label: "Recipes",        icon: "🍳", href: "/studio/recipes" },
];


function QuickLaunchSheet({ outletId, view, onSetView, onClose, onOpenVoice, onSwitchOutlet, requestedRoomId }: {
  outletId: string; view: QuickView; onSetView: (v: QuickView) => void;
  onClose: () => void; onOpenVoice: () => void;
  onSwitchOutlet?: (id: string) => void;
  requestedRoomId?: string;
}) {
  return (
    <div data-testid="echo-quick-scrim" onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999995 }}>
      <div data-testid="echo-quick-sheet" onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute", right: 0, top: 0, bottom: 0,
          width: "min(86%, 380px)", background: "#0a0e1a",
          borderLeft: "1px solid rgba(96,165,250,0.25)",
          display: "flex", flexDirection: "column",
        }}>
        <header style={{ padding: "14px 16px", borderBottom: "1px solid rgba(96,165,250,0.15)",
                           display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#60a5fa", fontWeight: 700 }}>ECHO</div>
            <h2 style={{ fontSize: 15, margin: "2px 0 0", color: "#f5efe4", fontWeight: 400 }}>
              {view === "home" ? "Quick launch" :
               view === "activity" ? "Activity" :
               view === "pnl" ? "P&L" :
               view === "weather" ? "Weather · today" :
               view === "concierge" ? "Staff Concierge" :
               view === "tickets" ? "Report a glitch" :
               view === "shift-notes" ? "Shift notes" :
               view === "group-chat" ? "Team chat" :
               view === "standup" ? "Daily standup" : "View"}
            </h2>
          </div>
          <button data-testid="echo-quick-close" onClick={onClose}
            style={{ background: "transparent", border: "1px solid rgba(148,163,184,0.2)",
                      color: "#94a3b8", padding: "6px 10px", borderRadius: 6,
                      fontSize: 13, cursor: "pointer" }}>✕</button>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {view === "home" && (
            <HomeView outletId={outletId} onSetView={onSetView}
              onOpenVoice={onOpenVoice} />
          )}
          {view === "activity" && <ActivityView outletId={outletId} onBack={() => onSetView("home")} />}
          {view === "pnl" && <PnlView outletId={outletId} onBack={() => onSetView("home")} />}
          {view === "weather" && <WeatherView onBack={() => onSetView("home")} />}
          {view === "concierge" && <StaffConciergeV2 onBack={() => onSetView("home")} />}
          {view === "tickets" && <TicketsView onBack={() => onSetView("home")} />}
          {view === "shift-notes" && <ShiftNotesView outletId={outletId} onBack={() => onSetView("home")} />}
          {view === "group-chat" && <GroupChatView onBack={() => onSetView("home")} roomId={requestedRoomId} />}
          {view === "standup" && <StandupInline onBack={() => onSetView("home")} />}
        </div>
      </div>
    </div>
  );
}


function HomeView({ outletId: _o, onSetView, onOpenVoice }: {
  outletId: string; onSetView: (v: QuickView) => void; onOpenVoice: () => void;
}) {
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", marginBottom: 8 }}>
          ASK ECHO
        </div>
        <button data-testid="echo-voice-trigger" onClick={onOpenVoice}
          style={{
            width: "100%", padding: 14, borderRadius: 8,
            background: "linear-gradient(135deg, rgba(96,165,250,0.18) 0%, rgba(59,130,246,0.08) 100%)",
            border: "1px solid rgba(96,165,250,0.45)",
            color: "#93c5fd", fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 10, textAlign: "left",
          }}>
          <span style={{ fontSize: 22 }}>🎙</span>
          <div style={{ flex: 1 }}>
            <div>Voice conversation</div>
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400, marginTop: 2 }}>
              "Why is food cost high today?"
            </div>
          </div>
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", marginBottom: 8 }}>
          THIS OUTLET
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
          <MiniTile testid="quick-concierge" label="Concierge" icon="🛎" onClick={() => onSetView("concierge")} />
          <MiniTile testid="quick-tickets"   label="Tickets"   icon="🎫" onClick={() => onSetView("tickets")} />
          <MiniTile testid="quick-shift-notes" label="Shift" icon="📝" onClick={() => onSetView("shift-notes")} />
          <MiniTile testid="quick-group-chat" label="Chat"   icon="💬" onClick={() => onSetView("group-chat")} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginTop: 6 }}>
          <MiniTile testid="quick-standup"  label="Standup"  icon="📣" onClick={() => onSetView("standup")} />
          <MiniTile testid="quick-activity" label="Activity" icon="📡" onClick={() => onSetView("activity")} />
          <MiniTile testid="quick-pnl"      label="P&L"      icon="💰" onClick={() => onSetView("pnl")} />
          <MiniTile testid="quick-weather"  label="Weather"  icon="☀️" onClick={() => onSetView("weather")} />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", marginBottom: 8 }}>
          DESKTOP MODULES
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {DESKTOP_LINKS.map((l) => (
            <a key={l.key} href={l.href} data-testid={`desk-link-${l.key}`}
              style={{
                padding: "10px 12px", borderRadius: 6, textDecoration: "none",
                background: "rgba(200,169,126,0.05)",
                border: "1px solid rgba(200,169,126,0.2)", color: "#f5efe4",
                display: "flex", alignItems: "center", gap: 8, fontSize: 12,
              }}>
              <span style={{ fontSize: 16 }}>{l.icon}</span>
              <span>{l.label}</span>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}


function MiniTile({ testid, label, icon, onClick }: {
  testid: string; label: string; icon: string; onClick: () => void;
}) {
  return (
    <button data-testid={testid} onClick={onClick}
      style={{
        padding: "14px 6px", borderRadius: 6, cursor: "pointer",
        background: "rgba(96,165,250,0.08)",
        border: "1px solid rgba(96,165,250,0.3)", color: "#93c5fd",
        fontSize: 11, fontWeight: 600,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}


// ── Activity / Dashboard / P&L views (preserved from iter228/230) ───────
function ActivityView({ outletId, onBack }: { outletId: string; onBack: () => void }) {
  const [rows, setRows] = React.useState<any[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    const load = () => fetch(`${API()}/api/ecw-ops/activity?outlet_id=${outletId}&limit=30`)
      .then((r) => r.json()).then((d) => { if (!cancelled) setRows(d?.rows || []); });
    void load();
    const int = setInterval(() => { if (!document.hidden) void load(); }, 60_000);
    return () => { cancelled = true; clearInterval(int); };
  }, [outletId]);
  return (
    <div data-testid="activity-view">
      <BackBtn onBack={onBack} />
      {rows.length === 0 && <Empty text="No recent activity." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ padding: 10, background: "rgba(200,169,126,0.03)",
                   borderLeft: `3px solid ${kindColor(r.kind)}`,
                   border: "1px solid rgba(200,169,126,0.1)", borderRadius: 4 }}>
            <div style={{ fontSize: 12, color: "#f5efe4" }}>{r.title}</div>
            {r.detail && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{r.detail}</div>}
            <div style={{ fontSize: 9, color: "#64748b", marginTop: 3, letterSpacing: 1 }}>
              {r.kind.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function DashboardView({ outletId, onBack, onSwitchOutlet }: {
  outletId: string; onBack: () => void; onSwitchOutlet?: (id: string) => void;
}) {
  const [data, setData] = React.useState<any>(null);
  const [pnl, setPnl] = React.useState<any>(null);
  const [occ, setOcc] = React.useState<any>(null);
  const [outlets, setOutlets] = React.useState<any[]>([]);
  React.useEffect(() => {
    Promise.all([
      fetch(`${API()}/api/ecw-ops/dashboard?outlet_id=${outletId}`).then((r) => r.json()).catch(() => null),
      fetch(`${API()}/api/echoaurium/outlets`, { headers: { "X-User-Id": "chef-william" } }).then((r) => r.json()).catch(() => null),
      fetch(`${API()}/api/echoaurium/pnl/full?outlet_id=${outletId}&period=2026-03`).then((r) => r.json()).catch(() => null),
      fetch(`${API()}/api/echoaurium/pnl/occupancy?period=2026-03`).then((r) => r.json()).catch(() => null),
    ]).then(([a, b, p, o]) => {
      setData(a); setOutlets(b?.rows || []);
      setPnl(p); setOcc(o?.occupancy);
    });
  }, [outletId]);
  if (!data && !pnl) return <><BackBtn onBack={onBack} /><Empty text="Loading…" /></>;
  const k = data?.kpis || {};
  const kp = pnl?.kpis || {};
  return (
    <div data-testid="dashboard-view">
      <BackBtn onBack={onBack} />
      {outlets.length > 1 && onSwitchOutlet && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", marginBottom: 4 }}>DRIVING OUTLET</div>
          <select data-testid="dashboard-outlet-switcher" value={outletId}
            onChange={(e) => onSwitchOutlet(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(200,169,126,0.3)", borderRadius: 6,
                      color: "#f5efe4", fontSize: 13 }}>
            {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}
      <div style={{ fontSize: 14, color: "#f5efe4", marginBottom: 4 }}>
        {pnl?.outlet_name || data?.outlet_name}
      </div>

      {/* MTD P&L top strip — desktop parity */}
      {pnl?.ok && (
        <div style={{ padding: 12, borderRadius: 8, marginBottom: 10,
                       background: "rgba(200,169,126,0.04)",
                       border: "1px solid rgba(200,169,126,0.2)" }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#c8a97e", marginBottom: 4 }}>
            MONTH-TO-DATE · {pnl.period}
          </div>
          <div style={{ fontSize: 24, color: "#f5efe4", fontFamily: "monospace" }}>
            ${kp.total_revenue?.toLocaleString()}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 11 }}>
            <span style={{ color: kp.food_cost_pct > 32 ? "#fca5a5" : "#86efac" }}>Food {kp.food_cost_pct}%</span>
            <span style={{ color: kp.labor_cost_pct > 35 ? "#fca5a5" : "#86efac" }}>Labor {kp.labor_cost_pct}%</span>
            <span style={{ color: kp.prime_cost_pct > 65 ? "#fca5a5" : kp.prime_cost_pct > 55 ? "#fbbf24" : "#86efac" }}>
              Prime {kp.prime_cost_pct}%
            </span>
          </div>
        </div>
      )}

      {/* Resort occupancy (when available) */}
      {occ && (
        <div style={{ padding: 10, marginBottom: 10, borderRadius: 6,
                       background: "rgba(59,130,246,0.05)",
                       border: "1px solid rgba(59,130,246,0.2)" }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#93c5fd", marginBottom: 6 }}>
            PIER 66 · {occ.period}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            <MiniStat label="Occ" value={`${occ.occupancy_pct}%`} />
            <MiniStat label="ADR" value={`$${Math.round(occ.adr || 0)}`} />
            <MiniStat label="RevPAR" value={`$${Math.round(occ.revpar || 0)}`} />
          </div>
        </div>
      )}

      {/* Today operational */}
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", marginBottom: 6 }}>
        TODAY · OPERATIONS
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <Kpi label="Today sales" value={`$${k.today_sales?.toLocaleString() || 0}`} color="#c8a97e" />
        <Kpi label="Covers" value={`${k.today_covers || 0}`} color="#3b82f6" />
        <Kpi label="Avg check" value={`$${k.avg_check?.toFixed(2) || "0.00"}`} color="#10b981" />
        <Kpi label="Open POs" value={`${k.open_pos || 0}`} color="#fbbf24" />
        <Kpi label="Open reqs" value={`${k.open_requisitions || 0}`} color="#a855f7" />
        <Kpi label="Flagged inv" value={`${k.flagged_invoices || 0}`}
          color={k.flagged_invoices ? "#f43f5e" : "#64748b"} />
      </div>
    </div>
  );
}


function PnlView({ outletId, onBack }: { outletId: string; onBack: () => void }) {
  const [compare, setCompare] = React.useState<"budget" | "forecast" | "prior_year">("budget");
  const [data, setData] = React.useState<any>(null);
  const [occ, setOcc] = React.useState<any>(null);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({ revenue: true });
  // iter234 · auto-refresh P&L every 3 hours + detect new invoices since last snapshot
  const [newChargeCount, setNewChargeCount] = React.useState(0);
  const [lastRefreshAt, setLastRefreshAt] = React.useState<Date | null>(null);
  const lastInvoiceCountRef = React.useRef<number | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [p, o, inv] = await Promise.all([
        fetch(`${API()}/api/echoaurium/pnl/full?outlet_id=${outletId}&period=2026-03&compare=${compare}`).then((r) => r.json()),
        fetch(`${API()}/api/echoaurium/pnl/occupancy?period=2026-03`).then((r) => r.json()),
        fetch(`${API()}/api/ecw-ops/invoices?outlet_id=${outletId}&limit=200`).then((r) => r.ok ? r.json() : { rows: [] }).catch(() => ({ rows: [] })),
      ]);
      setData(p); setOcc(o?.occupancy);
      const invCount = (inv?.rows || []).length;
      if (lastInvoiceCountRef.current != null && invCount > lastInvoiceCountRef.current) {
        setNewChargeCount(invCount - lastInvoiceCountRef.current);
      }
      lastInvoiceCountRef.current = invCount;
      setLastRefreshAt(new Date());
    } catch { /* silent */ }
  }, [outletId, compare]);

  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => {
    // 3-hour auto-refresh cadence per William's spec
    const id = window.setInterval(() => { void load(); }, 3 * 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [load]);
  if (!data) return <><BackBtn onBack={onBack} /><Empty text="Loading…" /></>;
  if (!data.ok) return <><BackBtn onBack={onBack} /><Empty text={data.detail || "No P&L"} /></>;
  const k = data.kpis || {};
  const banners = data.banners || {};
  const sections = data.sections || {};
  const SECTION_ORDER = [
    { key: "revenue",         title: "REVENUE",           emoji: "💰" },
    { key: "cogs",            title: "COST OF SALES",     emoji: "🧾" },
    { key: "labor",           title: "LABOR",             emoji: "👥" },
    { key: "payroll_related", title: "PAYROLL-RELATED",   emoji: "📋" },
    { key: "other_exp",       title: "OTHER EXPENSES",    emoji: "⚙️" },
  ];
  return (
    <div data-testid="echo-pnl-root">
      <BackBtn onBack={onBack} />
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {(["budget", "forecast", "prior_year"] as const).map((c) => (
          <button key={c} data-testid={`pnl-compare-${c}`} onClick={() => setCompare(c)}
            style={{ flex: 1, padding: "6px 4px",
                      background: compare === c ? "rgba(200,169,126,0.15)" : "transparent",
                      border: `1px solid ${compare === c ? "rgba(200,169,126,0.5)" : "rgba(148,163,184,0.15)"}`,
                      borderRadius: 6, color: compare === c ? "#c8a97e" : "#94a3b8",
                      fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                      letterSpacing: 1, cursor: "pointer" }}>
            vs {c === "prior_year" ? "PY" : c}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 8 }}>
        {data.outlet_name} · {data.period}
      </div>
      {/* iter234 · New charges banner + last refresh meta */}
      {newChargeCount > 0 && (
        <div data-testid="pnl-new-charges-banner"
          style={{ padding: "8px 10px", marginBottom: 10, borderRadius: 6,
                    background: "linear-gradient(90deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))",
                    border: "1px solid rgba(251,191,36,0.45)",
                    color: "#fbbf24", fontSize: 11, fontWeight: 600,
                    display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🆕 {newChargeCount} new {newChargeCount === 1 ? "charge" : "charges"} posted since last view</span>
          <button onClick={() => setNewChargeCount(0)} data-testid="pnl-dismiss-new-charges"
            style={{ background: "none", border: "1px solid rgba(251,191,36,0.4)",
                      color: "#fbbf24", padding: "2px 8px", borderRadius: 3,
                      fontSize: 10, cursor: "pointer" }}>✕</button>
        </div>
      )}
      <div style={{ fontSize: 9, color: "#64748b", marginBottom: 4, letterSpacing: 1, display: "flex",
                     justifyContent: "space-between", alignItems: "center" }}>
        <span>Auto-refresh every 3h</span>
        {lastRefreshAt && (
          <span data-testid="pnl-last-refresh">
            Updated {lastRefreshAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
      {occ && (
        <div data-testid="occupancy-strip" style={{ padding: "8px 10px", marginBottom: 10, borderRadius: 6,
                     background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)" }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#93c5fd", marginBottom: 4 }}>RESORT · OCCUPANCY</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
            <MiniStat label="Occ" value={`${occ.occupancy_pct}%`} />
            <MiniStat label="Rooms" value={occ.occupied_rooms?.toLocaleString()} />
            <MiniStat label="ADR" value={`$${Math.round(occ.adr || 0)}`} />
            <MiniStat label="RevPAR" value={`$${Math.round(occ.revpar || 0)}`} />
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
        <KpiTile label="Revenue" value={`$${k.total_revenue?.toLocaleString()}`} color="#c8a97e" />
        <KpiTile label="Food %" value={`${k.food_cost_pct}%`} color={k.food_cost_pct > 32 ? "#f43f5e" : "#10b981"} />
        <KpiTile label="Labor %" value={`${k.labor_cost_pct}%`} color={k.labor_cost_pct > 35 ? "#f43f5e" : "#10b981"} />
        <KpiTile label="Prime %" value={`${k.prime_cost_pct}%`} color={k.prime_cost_pct > 65 ? "#f43f5e" : k.prime_cost_pct > 55 ? "#fbbf24" : "#10b981"} />
      </div>
      {SECTION_ORDER.map(({ key, title, emoji }) => {
        const sec = sections[key];
        if (!sec) return null;
        return (
          <PnlSection key={key} title={title} emoji={emoji} section={sec}
            banner={banners[key]} open={!!expanded[key]} compare={compare}
            onToggle={() => setExpanded((p) => ({ ...p, [key]: !p[key] }))} />
        );
      })}
      <button data-testid="pnl-invoices-btn"
        onClick={() => window.dispatchEvent(new CustomEvent("echo:open-invoices", { detail: { outlet_id: outletId } }))}
        style={{ width: "100%", marginTop: 14, padding: 10, background: "rgba(200,169,126,0.08)",
                  border: "1px solid rgba(200,169,126,0.3)", borderRadius: 6,
                  color: "#c8a97e", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        View invoices → 🚩 flag mis-coded
      </button>
    </div>
  );
}


// ── Voice Panel ─────────────────────────────────────────────────────────
function VoicePanel({ outletId, onClose }: { outletId: string; onClose: () => void }) {
  const [transcript, setTranscript] = React.useState<{
    role: "user" | "echo"; text: string;
    explanation?: string; graph_spec?: any;
  }[]>([]);
  const [listening, setListening] = React.useState(false);
  const [thinking, setThinking] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const [interim, setInterim] = React.useState("");
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [greeted, setGreeted] = React.useState(false);
  const [weatherHourly, setWeatherHourly] = React.useState<any>(null);
  const recogRef = React.useRef<any>(null);
  const transcriptEndRef = React.useRef<HTMLDivElement>(null);

  // iter232 · OpenAI TTS (sage voice — wise, measured, educated) replaces
  // the browser SpeechSynthesis. Falls back to browser TTS if the backend
  // endpoint errors so the conversation never goes silent.
  const currentAudioRef = React.useRef<HTMLAudioElement | null>(null);

  async function speak(text: string) {
    // Kill anything playing
    try { currentAudioRef.current?.pause(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
    setSpeaking(false);
    if (!text) return;
    try {
      const r = await fetch(`${API()}/api/echo-voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.slice(0, 3800), voice: "sage", model: "tts-1-hd",
        }),
      });
      if (!r.ok) throw new Error(`TTS ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      currentAudioRef.current = a;
      a.onplay = () => setSpeaking(true);
      a.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      a.onpause = () => setSpeaking(false);
      await a.play();
    } catch {
      // Fallback to browser TTS so the conversation isn't silent
      try {
        const u = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis?.getVoices() || [];
        const pref = voices.find((v) => /Samantha|Ava|Karen|Allison|Google UK English Female/i.test(v.name));
        if (pref) u.voice = pref;
        u.rate = 1.0; u.pitch = 1.05; u.lang = "en-US";
        u.onstart = () => setSpeaking(true);
        u.onend = () => setSpeaking(false);
        window.speechSynthesis.speak(u);
      } catch { /* silent */ }
    }
  }

  async function sendText(text: string) {
    setThinking(true);
    setTranscript((p) => [...p, { role: "user", text }]);
    try {
      const r = await fetch(`${API()}/api/echo-voice/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
        body: JSON.stringify({ text, outlet_id: outletId, session_id: sessionId }),
      });
      const d = await r.json();
      if (!d.session_id) throw new Error(d.detail || "No session");
      setSessionId(d.session_id);
      setTranscript((p) => [...p, {
        role: "echo", text: d.speech,
        explanation: d.explanation, graph_spec: d.graph_spec,
      }]);
      void speak(d.speech);
      // Panel open — dispatch events or open inline weather
      if (d.panel === "weather-hourly") {
        try {
          const wr = await fetch(`${API()}/api/weather/rain-tracker`);
          const wd = await wr.json();
          setWeatherHourly(wd);
        } catch { /* silent */ }
      } else if (d.panel === "invoices") {
        window.dispatchEvent(new CustomEvent("echo:open-invoices", { detail: d.panel_args || {} }));
      } else if (d.panel === "pnl" || d.panel === "activity") {
        window.dispatchEvent(new CustomEvent("echo:open-quick", { detail: { view: d.panel } }));
      }
    } catch (e: any) {
      setError(e?.message || "Voice chat failed");
    } finally {
      setThinking(false);
      setTimeout(() => transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  // iter234 · Proactive briefing on mount — scans P&L anomalies + weather
  // and leads with what's most actionable. Falls back to time-aware hello.
  React.useEffect(() => {
    if (greeted) return;
    let cancelled = false;
    (async () => {
      let greetingText = "";
      try {
        const r = await fetch(`${API()}/api/echo-voice/proactive-briefing?outlet_id=${outletId}`, {
          headers: { "X-User-Id": "chef-william" },
        });
        if (r.ok) {
          const d = await r.json();
          greetingText = d?.speech || "";
        }
      } catch { /* fallback below */ }
      if (!greetingText) {
        const h = new Date().getHours();
        const part = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
        greetingText = `Good ${part}, William. How can I help?`;
      }
      if (cancelled) return;
      setTranscript([{ role: "echo", text: greetingText }]);
      setGreeted(true);
      void speak(greetingText);
      // iter235 · DO NOT auto-start listening here — iOS Safari requires
      // mic permission requests to originate from a direct user gesture.
      // The chef must tap the "Hold to speak" button, which primes mic
      // permission via getUserMedia before kicking off SpeechRecognition.
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Voice recognition not supported on this browser — use iOS Safari"); return; }
    // iter235 · On iOS Safari the SpeechRecognition API piggybacks on mic
    // permission. If we kick off recognition without first asking for the
    // mic, Safari silently returns 'not-allowed'. Prime the permission
    // via getUserMedia (prompts once; subsequent calls are instant) then
    // immediately release the stream so SpeechRecognition can own it.
    const begin = () => {
      const r = new SR();
      r.lang = "en-US"; r.interimResults = true; r.continuous = false;
      r.onresult = (ev: any) => {
        let t = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          t += ev.results[i][0].transcript;
        }
        setInterim(t);
        if (ev.results[ev.results.length - 1].isFinal) {
          setInterim("");
          setListening(false);
          if (t.trim()) void sendText(t.trim());
        }
      };
      r.onerror = (e: any) => {
        const friendly = e.error === "not-allowed"
          ? "Mic blocked. Tap Aa in Safari → Website Settings → Microphone → Allow, then reload."
          : e.error === "no-speech"
          ? "Didn't catch that — tap Hold to speak and try again."
          : e.error === "network"
          ? "Network hiccup on voice — tap Hold to speak again."
          : `Mic error: ${e.error}`;
        setError(friendly);
        setListening(false);
      };
      r.onend = () => setListening(false);
      recogRef.current = r;
      try { r.start(); setListening(true); setError(null); }
      catch (e: any) { setError(e.message); }
    };
    // Try the priming dance only if we haven't succeeded once already
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          // Release immediately — we only needed the permission grant
          stream.getTracks().forEach((t) => t.stop());
          begin();
        })
        .catch((e) => {
          setError(e?.name === "NotAllowedError"
            ? "Mic blocked. Tap Aa in Safari → Website Settings → Microphone → Allow, then reload."
            : `Can't access mic: ${e?.message || e}`);
        });
    } else {
      begin();
    }
  }

  function stopListening() {
    try { recogRef.current?.stop(); } catch {}
    setListening(false);
  }

  return (
    <div data-testid="echo-voice-scrim" onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999996 }}>
      <div onClick={(e) => e.stopPropagation()} data-testid="echo-voice-panel"
        style={{
          position: "absolute", inset: "8% 8px 8px",
          background: "linear-gradient(180deg, #0a0e1a 0%, #1a2744 100%)",
          border: "1px solid rgba(96,165,250,0.35)", borderRadius: 12,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
        <CognitiveMindCanvas state={
          listening ? "listening" :
          thinking  ? "thinking"  :
          speaking  ? "speaking"  : "idle"
        } />
        <header style={{ padding: 14, borderBottom: "1px solid rgba(96,165,250,0.2)",
                           display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#60a5fa", fontWeight: 700 }}>ECHO · VOICE</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              {listening ? "🎙 Listening…" : thinking ? "💭 Thinking…" : "Hold mic, ask anything"}
            </div>
          </div>
          <button data-testid="echo-voice-close"
            onClick={() => {
              try { currentAudioRef.current?.pause(); } catch {}
              try { window.speechSynthesis?.cancel(); } catch {}
              onClose();
            }}
            style={{ background: "transparent", border: "1px solid rgba(148,163,184,0.2)",
                      color: "#94a3b8", padding: "6px 10px", borderRadius: 6, cursor: "pointer" }}>
            ✕
          </button>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
          {transcript.length === 0 && !greeted && (
            <div style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8", fontSize: 12 }}>
              🎙 Echo is starting up…
            </div>
          )}
          {transcript.map((m, i) => (
            <div key={i} style={{
              marginBottom: 10, padding: 10, borderRadius: 8,
              background: m.role === "user" ? "rgba(200,169,126,0.06)" : "rgba(96,165,250,0.08)",
              border: `1px solid ${m.role === "user" ? "rgba(200,169,126,0.2)" : "rgba(96,165,250,0.25)"}`,
            }}>
              <div style={{ fontSize: 9, letterSpacing: 2,
                              color: m.role === "user" ? "#c8a97e" : "#60a5fa", marginBottom: 4 }}>
                {m.role === "user" ? "YOU" : "ECHO"}
              </div>
              <div style={{ fontSize: 13, color: "#f5efe4", lineHeight: 1.5 }}>{m.text}</div>
              {m.explanation && (
                <div data-testid={`voice-expl-${i}`}
                  style={{ marginTop: 8, padding: 8, background: "rgba(0,0,0,0.3)",
                            borderRadius: 4, fontSize: 11, color: "#cbd5e1", lineHeight: 1.6 }}>
                  {m.explanation}
                </div>
              )}
              {m.graph_spec && (
                <GraphSpec spec={m.graph_spec} idx={i} />
              )}
            </div>
          ))}
          {weatherHourly && <HourlyWeatherPanel data={weatherHourly}
            onClose={() => setWeatherHourly(null)} />}
          {interim && (
            <div style={{ padding: 10, fontSize: 12, color: "#c8a97e", fontStyle: "italic" }}>
              {interim}…
            </div>
          )}
          <div ref={transcriptEndRef} />
        </div>

        {error && (
          <div style={{ padding: 10, background: "rgba(244,63,94,0.08)",
                         borderTop: "1px solid rgba(244,63,94,0.3)",
                         color: "#fca5a5", fontSize: 11 }}>{error}</div>
        )}

        <footer style={{ padding: 14, borderTop: "1px solid rgba(96,165,250,0.2)",
                           display: "flex", gap: 8, alignItems: "center" }}>
          <button data-testid="echo-voice-mic"
            onClick={() => listening ? stopListening() : startListening()}
            disabled={thinking}
            style={{
              flex: 1, padding: 14, borderRadius: 10,
              background: listening ? "rgba(244,63,94,0.2)" : "rgba(96,165,250,0.18)",
              border: `1px solid ${listening ? "rgba(244,63,94,0.5)" : "rgba(96,165,250,0.45)"}`,
              color: listening ? "#fca5a5" : "#93c5fd",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: thinking ? 0.5 : 1,
            }}>
            <span style={{ fontSize: 20 }}>{listening ? "⏹" : "🎙"}</span>
            {listening ? "Stop" : thinking ? "Thinking…" : "Hold to speak"}
          </button>
        </footer>
      </div>
    </div>
  );
}


// ── Helper sub-components ───────────────────────────────────────────────
function BackBtn({ onBack }: { onBack: () => void }) {
  return (
    <button data-testid="quick-back" onClick={onBack}
      style={{ fontSize: 11, color: "#94a3b8", background: "none",
                border: "1px solid rgba(148,163,184,0.2)", padding: "4px 10px",
                borderRadius: 4, cursor: "pointer", marginBottom: 12 }}>
      ← Back
    </button>
  );
}
function Empty({ text }: { text: string }) {
  return <div style={{ padding: "36px 12px", textAlign: "center", color: "#64748b", fontSize: 12 }}>{text}</div>;
}
function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div data-testid={`kpi-${label.toLowerCase().replace(/\s/g, "-")}`}
      style={{ padding: "10px 12px", background: "rgba(200,169,126,0.04)",
                border: "1px solid rgba(200,169,126,0.15)", borderRadius: 6 }}>
      <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#94a3b8", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 16, color, fontFamily: "monospace", marginTop: 4, fontWeight: 500 }}>{value}</div>
    </div>
  );
}
function KpiTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div data-testid={`pnl-kpi-${label.toLowerCase().replace(/\s/g, "-")}`}
      style={{ padding: "8px 10px", background: "rgba(200,169,126,0.04)",
                border: "1px solid rgba(200,169,126,0.15)", borderRadius: 6 }}>
      <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#94a3b8", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 14, color, fontFamily: "monospace", marginTop: 3, fontWeight: 500 }}>{value}</div>
    </div>
  );
}
function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 12, color: "#f5efe4", fontFamily: "monospace", marginTop: 2, fontWeight: 500 }}>{value}</div>
    </div>
  );
}
function kindColor(kind: string) {
  const m: Record<string, string> = {
    po_sent: "#c8a97e", delivery: "#10b981", line_check: "#3b82f6",
    invoice_flagged: "#f43f5e", ai_invoice_flagged: "#a855f7",
    commissary_request: "#a855f7", waste: "#fbbf24",
    accrual_booked: "#fbbf24", recipe_published: "#10b981",
  };
  return m[kind] || "#94a3b8";
}
function PnlSection({ title, emoji, section, banner, open, compare, onToggle }: {
  title: string; emoji: string; section: any;
  banner?: { color: string; flash: boolean; label: string };
  open: boolean; compare: string; onToggle: () => void;
}) {
  const bg = banner?.color === "red"   ? "rgba(244,63,94,0.08)"
           : banner?.color === "green" ? "rgba(16,185,129,0.06)"
           : "rgba(200,169,126,0.04)";
  const border = banner?.color === "red"   ? "rgba(244,63,94,0.4)"
              : banner?.color === "green" ? "rgba(16,185,129,0.3)"
              : "rgba(200,169,126,0.15)";
  return (
    <div data-testid={`pnl-section-${title.toLowerCase().replace(/\s/g, "-")}`}
      style={{ marginBottom: 6, background: bg, border: `1px solid ${border}`,
                borderRadius: 6, overflow: "hidden" }}>
      <button onClick={onToggle} style={{
        width: "100%", padding: "10px 12px", textAlign: "left",
        background: "transparent", border: "none", cursor: "pointer",
        color: "#f5efe4", display: "flex", justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#c8a97e", fontWeight: 700 }}>
            {emoji} {title}
          </div>
          <div style={{ fontSize: 14, fontFamily: "monospace", marginTop: 2 }}>
            ${section.actual_total?.toLocaleString()}
          </div>
          {banner?.label && (
            <div style={{ fontSize: 10, marginTop: 2,
                           color: banner.color === "red" ? "#fca5a5"
                                : banner.color === "green" ? "#86efac" : "#94a3b8" }}>
              {banner.label}
            </div>
          )}
        </div>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 12px 12px", borderTop: "1px solid rgba(148,163,184,0.08)" }}>
          {section.lines.map((ln: any) => {
            const cmp = ln[compare] || ln.budget;
            const variance = ln.actual - cmp;
            return (
              <div key={ln.id} data-testid={`pnl-line-${ln.gl_code}`}
                onClick={() => window.dispatchEvent(new CustomEvent("echo:open-invoices",
                  { detail: { outlet_id: (section as any).outlet_id, gl_code: ln.gl_code, label: ln.label } }))}
                role="button" tabIndex={0}
                style={{
                  display: "grid", gridTemplateColumns: "56px 1fr auto", gap: 6,
                  padding: "7px 6px", fontSize: 11, color: "#cbd5e1",
                  borderBottom: "1px solid rgba(148,163,184,0.06)",
                  cursor: "pointer", borderRadius: 4,
                  transition: "background-color 120ms",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(212,175,55,0.08)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent")}>
                <span style={{ fontFamily: "monospace", color: "#64748b" }}>{ln.gl_code}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ln.label}
                </span>
                <span style={{ fontFamily: "monospace", textAlign: "right", color: "#f5efe4" }}>
                  ${ln.actual?.toLocaleString()}
                  <span style={{ marginLeft: 4, fontSize: 9,
                                  color: variance > 0 ? (ln.section === "revenue" ? "#86efac" : "#fca5a5")
                                       : (ln.section === "revenue" ? "#fca5a5" : "#86efac") }}>
                    {variance >= 0 ? "+" : ""}${Math.abs(variance).toLocaleString()}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ── GraphSpec renderer — inline SVG chart in the voice transcript ───────
// Claude returns shapes like:
//   {"type":"bar", "labels":["Food","Labor","Other"], "series":[{"name":"Actual","data":[21,29,12]},{"name":"Budget","data":[20,28,10]}]}
//   {"type":"line", "labels":["Mon","Tue","Wed"], "series":[{"name":"Revenue","data":[12,15,13]}]}
function GraphSpec({ spec, idx }: { spec: any; idx: number }) {
  if (!spec || !spec.type || !Array.isArray(spec.labels) || !Array.isArray(spec.series)) {
    return null;
  }
  const type = spec.type;
  const labels: string[] = spec.labels;
  const series: { name: string; data: number[] }[] = spec.series;
  const allValues = series.flatMap((s) => s.data).filter((n) => typeof n === "number");
  if (allValues.length === 0) return null;
  const maxV = Math.max(...allValues, 0);
  const minV = Math.min(...allValues, 0);
  const range = maxV - minV || 1;
  const W = 280, H = 110, padX = 28, padY = 14;
  const chartW = W - padX * 2, chartH = H - padY * 2;
  const colors = ["#c8a97e", "#60a5fa", "#10b981", "#f43f5e", "#a855f7"];

  return (
    <div data-testid={`voice-graph-${idx}`} style={{
      marginTop: 10, padding: 10, background: "rgba(0,0,0,0.25)",
      borderRadius: 6, border: "1px solid rgba(148,163,184,0.15)",
    }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", marginBottom: 6 }}>
        CHART · {type.toUpperCase()}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        {/* axis */}
        <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} stroke="#475569" strokeWidth={0.6} />
        <line x1={padX} y1={padY} x2={padX} y2={H - padY} stroke="#475569" strokeWidth={0.6} />
        {/* zero baseline for bars */}
        {minV < 0 && type === "bar" && (
          <line x1={padX} y1={H - padY - (chartH * (0 - minV) / range)}
                x2={W - padX} y2={H - padY - (chartH * (0 - minV) / range)}
                stroke="#64748b" strokeDasharray="2,2" strokeWidth={0.5} />
        )}

        {type === "bar" && series.map((s, si) => {
          const groupW = chartW / labels.length;
          const barW = Math.max(3, (groupW - 4) / series.length);
          return s.data.map((v, li) => {
            const x = padX + li * groupW + 2 + si * barW;
            const h = (Math.abs(v) / range) * chartH;
            const y = v >= 0
              ? H - padY - (chartH * (v - minV) / range)
              : H - padY - (chartH * (0 - minV) / range);
            return <rect key={`${si}-${li}`} x={x} y={y} width={barW} height={h}
                          fill={colors[si % colors.length]} opacity={0.85} rx={1} />;
          });
        })}

        {type === "line" && series.map((s, si) => {
          const stepX = chartW / Math.max(1, labels.length - 1);
          const pts = s.data.map((v, li) => {
            const x = padX + li * stepX;
            const y = H - padY - ((v - minV) / range) * chartH;
            return `${x},${y}`;
          }).join(" ");
          return <polyline key={si} points={pts} fill="none"
                            stroke={colors[si % colors.length]} strokeWidth={1.5}
                            strokeLinejoin="round" strokeLinecap="round" />;
        })}

        {/* x labels */}
        {labels.map((l, i) => {
          const stepX = type === "bar" ? chartW / labels.length
                                            : chartW / Math.max(1, labels.length - 1);
          const x = type === "bar" ? padX + i * stepX + stepX / 2 : padX + i * stepX;
          return <text key={i} x={x} y={H - 3} textAnchor="middle"
                        fontSize={8} fill="#94a3b8">{String(l).slice(0, 8)}</text>;
        })}
        <text x={padX - 2} y={padY + 3} textAnchor="end" fontSize={8} fill="#94a3b8">
          {maxV.toFixed(maxV > 100 ? 0 : 1)}
        </text>
      </svg>

      {/* legend */}
      {series.length > 1 && (
        <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
          {series.map((s, i) => (
            <span key={i} style={{ fontSize: 9, color: colors[i % colors.length],
                                      display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 8, height: 8, background: colors[i % colors.length],
                              borderRadius: 1, display: "inline-block" }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}



// ── Weather view (rain tracker / hourly) ────────────────────────────────
function WeatherView({ onBack }: { onBack: () => void }) {
  const [data, setData] = React.useState<any>(null);
  const [current, setCurrent] = React.useState<any>(null);
  React.useEffect(() => {
    Promise.all([
      fetch(`${API()}/api/weather/rain-tracker`).then((r) => r.json()),
      fetch(`${API()}/api/weather/current`).then((r) => r.json()),
    ]).then(([h, c]) => { setData(h); setCurrent(c); });
  }, []);
  if (!data) return <><BackBtn onBack={onBack} /><Empty text="Loading weather…" /></>;
  return (
    <div data-testid="weather-view">
      <BackBtn onBack={onBack} />
      {current?.current && (
        <CurrentWeatherCard current={current.current} location={current.location} />
      )}
      <HourlyWeatherPanel data={data} inline />
    </div>
  );
}


function CurrentWeatherCard({ current, location }: { current: any; location: any }) {
  const cond = (current.condition?.main || "").toLowerCase();
  const icon =
    cond.includes("clear")   ? "☀️" :
    cond.includes("cloud")   ? "⛅" :
    cond.includes("rain")    ? "🌧" :
    cond.includes("thunder") ? "⛈" :
    cond.includes("snow")    ? "❄️" :
    cond.includes("fog") || cond.includes("mist") ? "🌫" : "🌡";
  return (
    <div data-testid="weather-current-card" style={{
      padding: 14, marginBottom: 12, borderRadius: 10,
      background: "linear-gradient(135deg, rgba(59,130,246,0.14) 0%, rgba(96,165,250,0.05) 100%)",
      border: "1px solid rgba(96,165,250,0.3)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 44, lineHeight: 1 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 28, fontFamily: "monospace", color: "#f5efe4", fontWeight: 500 }}>
            {Math.round(current.temp)}°F
          </div>
          <div style={{ fontSize: 11, color: "#cbd5e1", textTransform: "capitalize" }}>
            {current.condition?.description || "—"}
          </div>
          <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 1, marginTop: 2 }}>
            {location?.name || ""}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                     gap: 6, marginTop: 10 }}>
        <MiniStat label="Feels" value={`${Math.round(current.feels_like || 0)}°`} />
        <MiniStat label="Humidity" value={`${Math.round(current.humidity || 0)}%`} />
        <MiniStat label="Wind" value={`${Math.round(current.wind_speed || 0)} mph`} />
      </div>
    </div>
  );
}


function HourlyWeatherPanel({ data, inline, onClose }: {
  data: any; inline?: boolean; onClose?: () => void;
}) {
  const rows: any[] = data?.hours || data?.hourly_forecast || data?.forecast || [];
  const firstRain = rows.find((r) => (r.rain_probability || r.precip_pct || 0) >= 40);
  if (rows.length === 0) return <Empty text="No hourly data available." />;
  const maxPct = Math.max(...rows.map((r) => r.rain_probability || r.precip_pct || 0), 10);
  return (
    <div data-testid="hourly-weather-panel" style={{
      marginTop: inline ? 0 : 12, padding: 12, borderRadius: 8,
      background: "rgba(59,130,246,0.05)",
      border: "1px solid rgba(59,130,246,0.25)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#60a5fa", fontWeight: 700 }}>
          ☁️ HOUR-BY-HOUR RAIN
        </div>
        {onClose && (
          <button onClick={onClose} data-testid="weather-panel-close"
            style={{ background: "transparent", border: "1px solid rgba(148,163,184,0.2)",
                      color: "#94a3b8", padding: "2px 8px", fontSize: 10, borderRadius: 4,
                      cursor: "pointer" }}>✕</button>
        )}
      </div>
      {firstRain && (
        <div style={{ fontSize: 11, color: "#fbbf24", marginBottom: 8 }}>
          🌧 First rain chance at <b>{firstRain.hour || firstRain.hour_label}</b> ({firstRain.rain_probability || firstRain.precip_pct}%)
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {rows.slice(0, 16).map((r, i) => {
          const pct = r.rain_probability ?? r.precip_pct ?? 0;
          const barW = (pct / Math.max(maxPct, 10)) * 100;
          const color = pct >= 70 ? "#3b82f6" : pct >= 40 ? "#60a5fa" : pct >= 20 ? "#94a3b8" : "#475569";
          return (
            <div key={i} data-testid={`wx-hour-${i}`}
              style={{ display: "grid", gridTemplateColumns: "46px 32px 1fr 46px",
                        gap: 6, alignItems: "center", fontSize: 11 }}>
              <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>
                {r.hour || r.hour_label || ""}
              </span>
              <span style={{ color: "#cbd5e1", textAlign: "right", fontFamily: "monospace" }}>
                {Math.round(r.temperature ?? r.temp_f ?? 0)}°
              </span>
              <div style={{ height: 10, background: "rgba(0,0,0,0.3)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${barW}%`, height: "100%", background: color, transition: "width 300ms" }} />
              </div>
              <span style={{ color: pct >= 40 ? "#93c5fd" : "#94a3b8",
                              textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}



// ── Cognitive Mind particle canvas (iter234) ────────────────────────────
// Original design. Orbiting neuron-like particles with dynamic connections.
// - idle      → slow drift, cool blue
// - listening → outward pulse, warmer cyan
// - thinking  → inward gather, violet
// - speaking  → orbital burst synced to rhythm, gold/teal
export function CognitiveMindCanvas({
  state,
}: {
  state: "idle" | "listening" | "thinking" | "speaking";
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const stateRef = React.useRef(state);
  React.useEffect(() => { stateRef.current = state; }, [state]);

  React.useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = c.clientWidth;
    let h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.scale(dpr, dpr);

    type P = { x: number; y: number; vx: number; vy: number; r: number; phase: number };
    const N = 42;
    const particles: P[] = Array.from({ length: N }, (_, i) => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: 1 + Math.random() * 2,
      phase: (i / N) * Math.PI * 2,
    }));

    let raf = 0; let t0 = performance.now();
    const paint = (now: number) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      const s = stateRef.current;
      const cx = w / 2, cy = h / 2;
      // ── Breathing pulse (18 bpm ≈ 0.3 Hz) — always present, modulates
      //    the core radius. Stronger when speaking/listening.
      const bpmHz = 0.3;
      const amp = s === "speaking" ? 0.22 : s === "listening" ? 0.14 : 0.08;
      const breath = Math.sin(t * Math.PI * 2 * bpmHz) * amp + 1;
      // Center glow
      const coreColor =
        s === "speaking"  ? "rgba(251,191,36,0.40)" :
        s === "thinking"  ? "rgba(167,139,250,0.30)" :
        s === "listening" ? "rgba(56,189,248,0.35)" :
                            "rgba(96,165,250,0.20)";
      const coreR = Math.min(w, h) * 0.5 * breath;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      grad.addColorStop(0, coreColor);
      grad.addColorStop(1, "rgba(10,14,26,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Update particle dynamics based on state
      for (const p of particles) {
        const dx = cx - p.x, dy = cy - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = dx / dist, ny = dy / dist;
        if (s === "thinking") {
          // gather inward
          p.vx += nx * 0.03;
          p.vy += ny * 0.03;
        } else if (s === "listening") {
          // outward drift + wobble
          p.vx -= nx * 0.015;
          p.vy -= ny * 0.015;
        } else if (s === "speaking") {
          // orbital with rhythmic burst
          const tang_x = -ny, tang_y = nx;
          const burst = 0.6 + 0.4 * Math.sin(t * 6 + p.phase);
          p.vx += tang_x * 0.06 * burst;
          p.vy += tang_y * 0.06 * burst;
          // centripetal pull so they stay roughly in orbit
          p.vx += nx * 0.012;
          p.vy += ny * 0.012;
        } else {
          // idle drift
          p.vx += (Math.random() - 0.5) * 0.02;
          p.vy += (Math.random() - 0.5) * 0.02;
        }
        // damping
        p.vx *= 0.94; p.vy *= 0.94;
        p.x += p.vx; p.y += p.vy;
        // wrap
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      }

      // Draw connections
      const linkDist = s === "thinking" ? 80 : s === "speaking" ? 110 : 70;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const a = particles[i], b = particles[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < linkDist) {
            const alpha = (1 - d / linkDist) * (s === "speaking" ? 0.6 : 0.35);
            const stroke =
              s === "speaking"  ? `rgba(251,191,36,${alpha})` :
              s === "thinking"  ? `rgba(167,139,250,${alpha})` :
              s === "listening" ? `rgba(94,234,212,${alpha})` :
                                  `rgba(96,165,250,${alpha})`;
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        const fillColor =
          s === "speaking"  ? "#fbbf24" :
          s === "thinking"  ? "#a78bfa" :
          s === "listening" ? "#5eead4" :
                              "#60a5fa";
        ctx.beginPath();
        ctx.fillStyle = fillColor;
        ctx.shadowColor = fillColor;
        ctx.shadowBlur = s === "speaking" ? 10 : 6;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // ── Eyes (two faint glowing dots that shift warmth) — avatar-lite ──
      const eyeY = cy - 8;
      const eyeGap = 28;
      const eyeHue = s === "speaking" ? 42 : s === "listening" ? 176 : s === "thinking" ? 268 : 210;
      const eyeLight = s === "speaking" ? 62 : 55;
      const blink = Math.sin(t * 0.6) > 0.985 ? 0.1 : 1;      // occasional blink
      const eyePulse = s === "idle" ? 0.75 + Math.sin(t * Math.PI * 2 * bpmHz) * 0.15 : 1;
      for (const dx of [-eyeGap, eyeGap]) {
        ctx.beginPath();
        ctx.fillStyle = `hsla(${eyeHue}, 82%, ${eyeLight}%, ${0.55 * blink * eyePulse})`;
        ctx.shadowColor = `hsla(${eyeHue}, 92%, 62%, 0.9)`;
        ctx.shadowBlur = 14;
        ctx.ellipse(cx + dx, eyeY, 4.5, 4.5 * blink, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // ── TTS ripple (horizontal "mouth" ripple when speaking) ──
      if (s === "speaking") {
        const mouthY = cy + 18;
        const segments = 40;
        ctx.strokeStyle = "rgba(251,191,36,0.55)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i <= segments; i++) {
          const px = cx - 44 + (i / segments) * 88;
          // Combined sine waves to imitate speech amplitude envelope
          const env = Math.sin((i / segments) * Math.PI);    // taper at ends
          const wob = Math.sin(t * 14 + i * 0.6) * 3 + Math.sin(t * 27 + i * 1.3) * 2;
          const py = mouthY + wob * env;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    // Resize handler
    const onResize = () => {
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.scale(dpr, dpr);
    };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <canvas ref={canvasRef} data-testid="cognitive-mind-canvas"
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", opacity: 0.9,
      }} />
  );
}

// ── iter235 · Staff Concierge (staff-only, no room access) ──────────────
function StaffConciergeView({ onBack }: { onBack: () => void }) {
  return (
    <div data-testid="staff-concierge-root">
      <BackBtn onBack={onBack} />
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>
        Staff-only concierge. Guest & room features are in the guest app.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          { icon: "🚕", label: "Staff rides", detail: "Taxi/Lyft for late shifts" },
          { icon: "🅿️", label: "Parking", detail: "Staff lot access code" },
          { icon: "🆘", label: "Emergency", detail: "On-call list" },
          { icon: "📞", label: "Directory", detail: "Team phone book" },
          { icon: "🍽", label: "Staff meal", detail: "Today's family meal" },
          { icon: "🚌", label: "Shuttle", detail: "Employee transport" },
        ].map((t) => (
          <button key={t.label} data-testid={`concierge-${t.label.toLowerCase().replace(/\s/g, "-")}`}
            style={{
              padding: "14px 10px", borderRadius: 8, cursor: "pointer",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(148,163,184,0.18)",
              color: "#cbd5e1", textAlign: "left",
              display: "flex", flexDirection: "column", gap: 4,
            }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 12, color: "#f5efe4", fontWeight: 600 }}>{t.label}</span>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>{t.detail}</span>
          </button>
        ))}
      </div>
    </div>
  );
}


// ── iter237 · Tickets (maintenance + guest complaints — photo + location) ─
function TicketsView({ onBack }: { onBack: () => void }) {
  const [kind, setKind] = React.useState<"maintenance" | "guest">("maintenance");
  const [title, setTitle] = React.useState("");
  const [detail, setDetail] = React.useState("");
  const [priority, setPriority] = React.useState<"low" | "medium" | "high">("medium");
  const [location, setLocation] = React.useState("");
  const [problemType, setProblemType] = React.useState("");
  const [photo, setPhoto] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const LOCATIONS_MAINT = [
    "Main Kitchen 1", "Main Kitchen 2", "Main Kitchen 3",
    "Pastry Kitchen", "Pool Grill Line", "Rooftop Bar",
    "Dish Pit", "Walk-in Cooler 1", "Walk-in Cooler 2",
    "Freezer 1", "Dry Storage", "Receiving Dock",
    "FOH Dining Room", "Private Dining", "Restrooms",
  ];
  const LOCATIONS_GUEST = [
    "Rooftop Lounge", "Garden Room", "Club Bar", "Pool Grill",
    "Market Cafe", "Coastal Kitchen", "In-Room Dining", "Ballroom",
  ];
  const PROBLEM_TYPES_MAINT = [
    "Electrical", "Plumbing", "Exhaust hood", "HVAC / Air conditioning",
    "Refrigeration", "Gas", "Equipment (oven/grill)",
    "Dish machine", "IT / Wi-Fi", "Door / lock", "Leak / spill",
    "Lighting", "POS terminal", "Other",
  ];
  const PROBLEM_TYPES_GUEST = [
    "Food quality", "Service speed", "Temperature (too hot/cold)",
    "Cleanliness", "Noise", "Wrong order", "Billing", "Allergen concern",
    "Staff behavior", "Other",
  ];

  const locations = kind === "maintenance" ? LOCATIONS_MAINT : LOCATIONS_GUEST;
  const problems  = kind === "maintenance" ? PROBLEM_TYPES_MAINT : PROBLEM_TYPES_GUEST;

  function onPhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function submit() {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const body = {
        kind, title: title.trim(), detail: detail.trim(),
        priority, location, problem_type: problemType,
        photo_data_url: photo,
        category: kind === "guest" ? "guest-complaint" : "maintenance",
      };
      const r = await fetch(`${API()}/api/ecw-ops/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        setDone(true);
        setTitle(""); setDetail(""); setLocation(""); setProblemType(""); setPhoto(null);
        setTimeout(() => setDone(false), 2500);
      }
    } finally { setSubmitting(false); }
  }

  return (
    <div data-testid="tickets-root">
      <BackBtn onBack={onBack} />
      {/* Kind tabs — Maintenance vs Guest complaint */}
      <div data-testid="tickets-kind-tabs" style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        <button data-testid="ticket-kind-maintenance" onClick={() => setKind("maintenance")}
          style={{
            flex: 1, padding: 10, fontSize: 11, fontWeight: 600,
            background: kind === "maintenance" ? "rgba(212,175,55,0.15)" : "transparent",
            border: `1px solid ${kind === "maintenance" ? "rgba(212,175,55,0.5)" : "rgba(148,163,184,0.15)"}`,
            color: kind === "maintenance" ? "#d4af37" : "#94a3b8",
            borderRadius: 6, textTransform: "uppercase", letterSpacing: 1, cursor: "pointer",
          }}>🔧 Maintenance</button>
        <button data-testid="ticket-kind-guest" onClick={() => setKind("guest")}
          style={{
            flex: 1, padding: 10, fontSize: 11, fontWeight: 600,
            background: kind === "guest" ? "rgba(200,120,40,0.15)" : "transparent",
            border: `1px solid ${kind === "guest" ? "rgba(200,120,40,0.5)" : "rgba(148,163,184,0.15)"}`,
            color: kind === "guest" ? "#fb923c" : "#94a3b8",
            borderRadius: 6, textTransform: "uppercase", letterSpacing: 1, cursor: "pointer",
          }}>👤 Guest complaint</button>
      </div>

      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>
        {kind === "maintenance"
          ? "Broken equipment or system. Routes to engineering."
          : "Guest issue or complaint. Routes to FOH manager + F&B director."}
      </div>

      <Label>Title</Label>
      <input data-testid="ticket-title" value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="One-line summary" style={inputStyle} />

      <Label>Location</Label>
      <select data-testid="ticket-location" value={location} onChange={(e) => setLocation(e.target.value)}
        style={{ ...inputStyle, appearance: "none" }}>
        <option value="">— Select —</option>
        {locations.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>

      <Label>{kind === "maintenance" ? "Problem type" : "Issue category"}</Label>
      <div data-testid="ticket-problem-grid" style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 8,
      }}>
        {problems.map((pt) => (
          <button key={pt} data-testid={`problem-${pt.toLowerCase().replace(/[^a-z]/g, "-")}`}
            onClick={() => setProblemType(pt)}
            style={{
              padding: "6px 8px", fontSize: 10, textAlign: "left",
              background: problemType === pt ? "rgba(212,175,55,0.15)" : "transparent",
              border: `1px solid ${problemType === pt ? "rgba(212,175,55,0.4)" : "rgba(148,163,184,0.15)"}`,
              color: problemType === pt ? "#d4af37" : "#cbd5e1",
              borderRadius: 4, cursor: "pointer",
            }}>{pt}</button>
        ))}
      </div>

      <Label>Details</Label>
      <textarea data-testid="ticket-detail" value={detail} onChange={(e) => setDetail(e.target.value)}
        placeholder="Describe what happened, what's expected vs actual"
        rows={4} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />

      {/* Photo pick */}
      <div style={{ marginTop: 8 }}>
        <label data-testid="ticket-photo-picker" style={{
          display: "inline-block", padding: "8px 14px",
          background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.4)",
          borderRadius: 6, color: "#93c5fd", fontSize: 11, cursor: "pointer", fontWeight: 600,
        }}>
          📷 Attach photo
          <input type="file" accept="image/*" capture="environment" onChange={onPhotoPick}
            style={{ display: "none" }} />
        </label>
        {photo && (
          <img src={photo} alt="" data-testid="ticket-photo-preview"
            style={{ display: "block", marginTop: 8, maxWidth: "100%", maxHeight: 160,
                      borderRadius: 4, border: "1px solid rgba(148,163,184,0.2)" }} />
        )}
      </div>

      {/* Priority */}
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {(["low", "medium", "high"] as const).map((p) => (
          <button key={p} data-testid={`ticket-priority-${p}`} onClick={() => setPriority(p)}
            style={{ flex: 1, padding: 8,
                     background: priority === p ? "rgba(212,175,55,0.15)" : "transparent",
                     border: `1px solid ${priority === p ? "rgba(212,175,55,0.5)" : "rgba(148,163,184,0.15)"}`,
                     color: priority === p ? "#d4af37" : "#94a3b8",
                     borderRadius: 6, fontSize: 11, textTransform: "uppercase",
                     letterSpacing: 1, cursor: "pointer" }}>
            {p}
          </button>
        ))}
      </div>

      <button data-testid="ticket-submit" onClick={() => void submit()}
        disabled={submitting || !title.trim()}
        style={{ width: "100%", marginTop: 14, padding: 12, borderRadius: 6,
                 background: done ? "rgba(16,185,129,0.2)" : "rgba(212,175,55,0.15)",
                 border: `1px solid ${done ? "rgba(16,185,129,0.5)" : "rgba(212,175,55,0.4)"}`,
                 color: done ? "#34d399" : "#d4af37", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
        {done ? `✓ ${kind === "guest" ? "Complaint logged" : "Ticket logged"}` :
         submitting ? "Sending…" :
         kind === "guest" ? "📝 Submit complaint" : "🎫 Submit ticket"}
      </button>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", textTransform: "uppercase",
                   marginTop: 10, marginBottom: 4 }}>{children}</div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(148,163,184,0.2)", borderRadius: 6,
  color: "#f5efe4", fontSize: 13,
};


// ── iter235 · Shift Notes (voice-first end-of-shift log) ────────────────
function ShiftNotesView({ outletId, onBack }: { outletId: string; onBack: () => void }) {
  const [notes, setNotes] = React.useState<any[]>([]);
  const [text, setText] = React.useState("");
  const [listening, setListening] = React.useState(false);
  const [shift, setShift] = React.useState<"am" | "pm" | "overnight">(() => {
    const h = new Date().getHours();
    return h < 12 ? "am" : h < 20 ? "pm" : "overnight";
  });
  const recogRef = React.useRef<any>(null);

  React.useEffect(() => {
    fetch(`${API()}/api/ecw-ops/shift-notes?outlet_id=${outletId}&limit=10`)
      .then((r) => r.ok ? r.json() : { rows: [] })
      .then((d) => setNotes(d?.rows || []))
      .catch(() => undefined);
  }, [outletId]);

  function startRec() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice not supported on this browser"); return; }
    const r = new SR();
    r.lang = "en-US"; r.interimResults = false; r.continuous = true;
    r.onresult = (ev: any) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        setText((prev) => prev + (prev ? " " : "") + ev.results[i][0].transcript);
      }
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    try { r.start(); setListening(true); } catch {}
  }
  function stopRec() { try { recogRef.current?.stop(); } catch {}; setListening(false); }

  async function save() {
    if (!text.trim()) return;
    const r = await fetch(`${API()}/api/ecw-ops/shift-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
      body: JSON.stringify({ outlet_id: outletId, shift, text: text.trim(), authored_by: "chef-william" }),
    });
    if (r.ok) {
      const d = await r.json();
      setNotes((p) => [d.note, ...p]);
      setText("");
    }
  }

  return (
    <div data-testid="shift-notes-root">
      <BackBtn onBack={onBack} />
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {(["am", "pm", "overnight"] as const).map((s) => (
          <button key={s} data-testid={`shift-${s}`} onClick={() => setShift(s)}
            style={{ flex: 1, padding: 6, fontSize: 10,
                     background: shift === s ? "rgba(212,175,55,0.15)" : "transparent",
                     border: `1px solid ${shift === s ? "rgba(212,175,55,0.5)" : "rgba(148,163,184,0.15)"}`,
                     color: shift === s ? "#d4af37" : "#94a3b8",
                     borderRadius: 4, textTransform: "uppercase", letterSpacing: 1, cursor: "pointer" }}>
            {s}
          </button>
        ))}
      </div>
      <textarea data-testid="shift-notes-text" rows={5} value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Speak or type what happened this shift — issues, follow-ups, guest comments…"
        style={{ ...INPUT_STYLE_IT235, resize: "vertical", fontFamily: "inherit" }} />
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button data-testid="shift-notes-mic" onClick={() => listening ? stopRec() : startRec()}
          style={{ flex: 1, padding: 10, borderRadius: 6,
                   background: listening ? "rgba(244,63,94,0.2)" : "rgba(96,165,250,0.15)",
                   border: `1px solid ${listening ? "rgba(244,63,94,0.5)" : "rgba(96,165,250,0.4)"}`,
                   color: listening ? "#fca5a5" : "#93c5fd",
                   fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          {listening ? "⏹ Stop" : "🎙 Dictate"}
        </button>
        <button data-testid="shift-notes-save" onClick={() => void save()}
          disabled={!text.trim()}
          style={{ flex: 1, padding: 10, borderRadius: 6,
                   background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)",
                   color: "#d4af37", fontSize: 12, fontWeight: 600, cursor: "pointer",
                   opacity: text.trim() ? 1 : 0.5 }}>
          💾 Save to shift log
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", marginBottom: 6 }}>RECENT NOTES</div>
        {notes.length === 0 ? <Empty text="No shift notes yet." /> :
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {notes.map((n: any) => (
              <div key={n.id} data-testid={`shift-note-${n.id}`} style={{
                padding: 10, borderRadius: 6,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(148,163,184,0.12)",
              }}>
                <div style={{ fontSize: 9, color: "#d4af37", letterSpacing: 1, textTransform: "uppercase" }}>
                  {n.shift} · {n.authored_by} · {new Date(n.created_at).toLocaleDateString()}
                </div>
                <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4, lineHeight: 1.5 }}>{n.text}</div>
              </div>
            ))}
          </div>}
      </div>
    </div>
  );
}


// ── iter236 · Group Chat (mobile — compose + send) ──────────────────────
function GroupChatView({ onBack, roomId }: { onBack: () => void; roomId?: string }) {
  const [rooms, setRooms] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeRoom, setActiveRoom] = React.useState<any>(null);
  const [msgs, setMsgs] = React.useState<any[]>([]);
  const [draft, setDraft] = React.useState("");
  const [newRoomOpen, setNewRoomOpen] = React.useState(false);
  const [newRoomName, setNewRoomName] = React.useState("");

  const reloadRooms = React.useCallback(() => {
    setLoading(true);
    fetch(`${API()}/api/team-chat/rooms?user_id=chef-william`)
      .then((r) => r.ok ? r.json() : { rows: [] })
      .then((d) => setRooms(d?.rows || []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);
  React.useEffect(() => { reloadRooms(); }, [reloadRooms]);

  // iter241 · auto-open the requested room if dispatched with room_id
  React.useEffect(() => {
    if (!roomId || activeRoom?.id === roomId) return;
    const found = rooms.find((r) => r.id === roomId);
    if (found) { setActiveRoom(found); return; }
    if (rooms.length > 0) {
      // Not in list yet — fetch room directly so we can still open
      fetch(`${API()}/api/team-chat/rooms?user_id=chef-william`)
        .then((r) => r.ok ? r.json() : { rows: [] })
        .then((d) => {
          const f = (d?.rows || []).find((r: any) => r.id === roomId);
          if (f) setActiveRoom(f);
        }).catch(() => undefined);
    }
  }, [roomId, rooms, activeRoom?.id]);

  React.useEffect(() => {
    if (!activeRoom) return;
    fetch(`${API()}/api/team-chat/rooms/${activeRoom.id}/messages`)
      .then((r) => r.ok ? r.json() : { rows: [] })
      .then((d) => setMsgs(d?.rows || []))
      .catch(() => undefined);
  }, [activeRoom?.id]);

  async function send() {
    if (!activeRoom || !draft.trim()) return;
    const r = await fetch(`${API()}/api/team-chat/rooms/${activeRoom.id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
      body: JSON.stringify({ text: draft.trim(), author_id: "chef-william" }),
    });
    if (r.ok) {
      const d = await r.json();
      setMsgs((p) => [...p, d.message]);
      setDraft("");
    }
  }

  async function createRoom() {
    if (!newRoomName.trim()) return;
    const r = await fetch(`${API()}/api/team-chat/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
      body: JSON.stringify({ name: newRoomName.trim(), kind: "group", members: ["chef-william"] }),
    });
    if (r.ok) {
      setNewRoomName("");
      setNewRoomOpen(false);
      reloadRooms();
    }
  }

  // In-room message view
  if (activeRoom) {
    return (
      <div data-testid="group-chat-room" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <button onClick={() => setActiveRoom(null)} data-testid="group-chat-room-back"
            style={{ fontSize: 11, color: "#94a3b8", background: "none",
                      border: "1px solid rgba(148,163,184,0.2)", padding: "4px 10px",
                      borderRadius: 4, cursor: "pointer" }}>
            ← Rooms
          </button>
          <span style={{ fontSize: 13, color: "#f5efe4", fontWeight: 500 }}>
            {activeRoom.name || "Chat"}
          </span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 2px", minHeight: 260,
                       display: "flex", flexDirection: "column", gap: 4 }}>
          {msgs.length === 0 && <Empty text="No messages yet. Say hi." />}
          {msgs.map((m) => {
            const mine = m.author_id === "chef-william";
            return (
              <div key={m.id} data-testid={`chat-msg-${m.id}`} style={{
                alignSelf: mine ? "flex-end" : "flex-start",
                maxWidth: "80%", padding: "6px 10px", borderRadius: 12,
                background: mine ? "rgba(212,175,55,0.18)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${mine ? "rgba(212,175,55,0.35)" : "rgba(148,163,184,0.15)"}`,
                color: "#f5efe4", fontSize: 12, lineHeight: 1.4,
              }}>
                {!mine && <div style={{ fontSize: 9, color: "#94a3b8", marginBottom: 2 }}>{m.author_name || m.author_id}</div>}
                {m.text || m.body || ""}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input data-testid="chat-compose-input" value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
            placeholder="Message…"
            style={INPUT_STYLE_IT235} />
          <button data-testid="chat-send-btn" onClick={() => void send()}
            disabled={!draft.trim()}
            style={{ padding: "0 16px", borderRadius: 6,
                      background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)",
                      color: "#d4af37", cursor: "pointer", fontWeight: 600,
                      opacity: draft.trim() ? 1 : 0.4 }}>
            Send
          </button>
        </div>
      </div>
    );
  }

  // Rooms list
  return (
    <div data-testid="group-chat-root">
      <BackBtn onBack={onBack} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>
          Direct messages & groups (WhatsApp-style).
        </span>
        <button data-testid="chat-new-room-btn" onClick={() => setNewRoomOpen(true)}
          style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)",
                    color: "#d4af37", padding: "4px 10px", borderRadius: 4,
                    fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          + New
        </button>
      </div>
      {newRoomOpen && (
        <div data-testid="chat-new-room-form" style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <input value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Room name (e.g., Line Cooks)" style={INPUT_STYLE_IT235} autoFocus />
          <button data-testid="chat-new-room-create" onClick={() => void createRoom()}
            style={{ padding: "0 12px", borderRadius: 6,
                      background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.5)",
                      color: "#10b981", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
            Create
          </button>
        </div>
      )}
      {loading ? <Empty text="Loading…" /> :
        rooms.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", background: "rgba(212,175,55,0.05)",
                          border: "1px dashed rgba(212,175,55,0.3)", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#d4af37", fontWeight: 600, marginBottom: 4 }}>No chat rooms yet</div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>Tap + New to start your first thread.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {rooms.map((r: any) => (
              <button key={r.id} data-testid={`chat-room-${r.id}`}
                onClick={() => setActiveRoom(r)}
                style={{ textAlign: "left", padding: 10, borderRadius: 6,
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(148,163,184,0.12)",
                          color: "#cbd5e1", cursor: "pointer" }}>
                <div style={{ fontSize: 13, color: "#f5efe4", fontWeight: 500 }}>
                  {r.name || r.title || "Room"}
                </div>
                {r.last_message && (
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                    {typeof r.last_message === "string"
                      ? r.last_message
                      : (r.last_message?.body || r.last_message?.text || "")}
                  </div>
                )}
              </button>
            ))}
          </div>
        )
      }
    </div>
  );
}

const INPUT_STYLE_IT235: React.CSSProperties = {
  width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(148,163,184,0.2)", borderRadius: 6,
  color: "#f5efe4", fontSize: 13,
};

