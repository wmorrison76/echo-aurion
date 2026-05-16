/**
 * iter191 · Luccca Staff · Mobile unified shell
 *
 * Route: /m/staff/:token
 *
 * Architecture:
 *   - 5 bottom-tab nav (Home / Schedule / Concierge / Briefing / More)
 *   - Full-screen stack navigation — NO floating panels (that paradigm stays on desktop)
 *   - Role-gated rendering via /api/staff-mobile/me capability flags
 *   - Command palette (pull-down from Home) for universal module search
 *   - Desktop-only modules explicitly hidden from palette
 *
 * All flows use the staff briefing token. Works in web + Capacitor native shell.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};

type Cap = {
  role: "general" | "salary" | "manager" | "owner";
  is_general: boolean; is_salary: boolean; is_manager: boolean; is_owner: boolean;
  can_view_dashboard: boolean; can_edit_standup: boolean; can_manage_hiring: boolean;
  can_mint_tokens: boolean; can_approve_pto: boolean; can_view_financials: boolean;
  can_view_coworker_schedule: boolean; can_view_total_hours: boolean;
};
type Staff = { id?: string; name?: string; email?: string; phone?: string; role: string; title?: string; department?: string };

export default function StaffMobile() {
  const { token = "" } = useParams<{ token: string }>();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [caps, setCaps] = useState<Cap | null>(null);
  const [tab, setTab] = useState<"home"|"schedule"|"concierge"|"briefing"|"waste"|"more">("home");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API()}/api/staff-mobile/me`, { headers: { "X-Briefing-Token": token } });
        if (r.status === 401 || r.status === 410) { setErr(r.status === 410 ? "This staff link has expired. Ask your manager for a fresh one." : "Invalid or revoked staff link."); return; }
        const j = await r.json();
        setStaff(j.staff); setCaps(j.capabilities);
      } catch (e: any) { setErr(`Couldn't load — ${e.message || e}`); }
      finally { setLoading(false); }
    })();
  }, [token]);

  // iter192 · register native push token (Capacitor) or web push fallback
  useEffect(() => {
    if (!token || !staff) return;
    registerPushDevice(token).catch(() => { /* silent */ });
  }, [token, staff]);

  if (loading) return <div style={S.loading}>Loading your Luccca…</div>;
  if (err) return <div style={S.errRoot}><div style={S.errCard}>{err}</div></div>;
  if (!staff || !caps) return null;

  return (
    <div data-testid="staff-mobile-root" style={S.root}>
      <header style={S.header}>
        <div style={S.eyebrow}>Luccca Staff</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10 }}>
          <div>
            <h1 style={S.title}>Hi {firstName(staff.name)}</h1>
            <div style={S.sub}>{staff.title || staff.role} {staff.department && `· ${staff.department}`}</div>
          </div>
          <span style={{ ...S.rolePill, background: rolePillBg(caps.role), color: rolePillFg(caps.role) }} data-testid="staff-role-pill">
            {caps.role.toUpperCase()}
          </span>
        </div>
      </header>

      <main style={S.main}>
        {tab === "home" && <HomeTab token={token} staff={staff} caps={caps} onOpenPalette={() => setPaletteOpen(true)} onJumpTab={setTab} />}
        {tab === "schedule" && <ScheduleTab token={token} caps={caps} />}
        {tab === "concierge" && <ConciergeTab token={token} />}
        {tab === "briefing" && <BriefingTab token={token} />}
        {tab === "waste" && <WasteTab token={token} />}
        {tab === "more" && <MoreTab staff={staff} caps={caps} />}
      </main>

      <nav style={S.tabBar} data-testid="staff-tab-bar">
        <TabBtn testid="tab-home"      active={tab==="home"}      onClick={() => setTab("home")}      emoji="🏠" label="Home" />
        <TabBtn testid="tab-schedule"  active={tab==="schedule"}  onClick={() => setTab("schedule")}  emoji="📅" label="Schedule" />
        <TabBtn testid="tab-waste"     active={tab==="waste"}     onClick={() => setTab("waste")}     emoji="♻️" label="Waste" />
        <TabBtn testid="tab-briefing"  active={tab==="briefing"}  onClick={() => setTab("briefing")}  emoji="📣" label="Briefing" />
        <TabBtn testid="tab-more"      active={tab==="more"}      onClick={() => setTab("more")}      emoji="•••" label="More" />
      </nav>

      {paletteOpen && <CommandPalette caps={caps} onClose={() => setPaletteOpen(false)} onJumpTab={(t) => { setTab(t); setPaletteOpen(false); }} />}
    </div>
  );
}

// ─── Home ────────────────────────────────────────────────────────────────
function HomeTab({ token, staff, caps, onOpenPalette, onJumpTab }: { token: string; staff: Staff; caps: Cap; onOpenPalette: () => void; onJumpTab: (t: any) => void }) {
  const [pullY, setPullY] = useState(0);
  const startYRef = useRef<number | null>(null);
  const THRESH = 70;

  function onTouchStart(e: React.TouchEvent) { if (window.scrollY === 0) startYRef.current = e.touches[0].clientY; }
  function onTouchMove(e: React.TouchEvent) {
    if (startYRef.current == null) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy > 0) setPullY(Math.min(dy, 120));
  }
  function onTouchEnd() {
    if (pullY >= THRESH) onOpenPalette();
    setPullY(0); startYRef.current = null;
  }

  return (
    <div data-testid="home-tab" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div data-testid="home-pull-hint" style={{ textAlign: "center", color: "#c8a97e", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", opacity: Math.min(1, pullY / THRESH), transform: `translateY(${pullY/2}px)` }}>
        ↓ Release to search
      </div>

      <ReleaseNotesBanner token={token} />

      <button data-testid="home-palette-btn" onClick={onOpenPalette} style={S.searchBtn}>
        🔍 <span style={{ color: "#94a3b8", fontSize: 13 }}>Search modules, staff, guests…</span>
      </button>

      {caps.is_salary ? <HomeSalary token={token} caps={caps} onJumpTab={onJumpTab} /> : <HomeGeneral token={token} staff={staff} onJumpTab={onJumpTab} />}
    </div>
  );
}

function HomeGeneral({ token, staff, onJumpTab }: { token: string; staff: Staff; onJumpTab: (t: any) => void }) {
  const [pto, setPto] = useState<{ balance?: number; pending: number } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API()}/api/pto/mine`, { headers: { "X-Briefing-Token": token } });
        const j = await r.json();
        setPto({ balance: j.pto_balance_days, pending: (j.requests || []).filter((x: any) => x.status === "pending").length });
      } catch {}
    })();
  }, [token]);

  return (
    <>
      <section style={S.section}>
        <div style={S.eyebrow2}>Today</div>
        <div style={S.heroCard}>
          <div style={{ fontSize: 20, fontWeight: 300, color: "#f5efe4" }}>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Welcome, {firstName(staff.name)}. Your shift & tasks will show here as schedules come online.</div>
        </div>
      </section>
      <section style={S.section}>
        <div style={S.eyebrow2}>Quick</div>
        <div style={S.tile2}>
          <ActionTile testid="home-pto" emoji="🏝" label="Time off" sub={pto?.balance != null ? `${pto.balance} days available${pto.pending ? ` · ${pto.pending} pending` : ""}` : "Request PTO"} onClick={() => onJumpTab("schedule")} />
          <ActionTile testid="home-benefits" emoji="💼" label="My benefits" sub="Health · dental · 401k" onClick={() => onJumpTab("more")} />
          <ActionTile testid="home-briefing" emoji="📣" label="Today's briefing" sub="Read the standup" onClick={() => onJumpTab("briefing")} />
          <ActionTile testid="home-concierge" emoji="🛎" label="Guest concierge" sub="FOH companion" onClick={() => onJumpTab("concierge")} />
        </div>
      </section>
    </>
  );
}

function HomeSalary({ token, caps, onJumpTab }: { token: string; caps: Cap; onJumpTab: (t: any) => void }) {
  const [kpi, setKpi] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const [r1, r2] = await Promise.all([
          fetch(`${API()}/api/dashboard/today`, { headers: { "X-Briefing-Token": token } }).catch(() => null),
          fetch(`${API()}/api/stratus/alerts/active?limit=5`, { headers: { "X-Briefing-Token": token } }).catch(() => null),
        ]);
        if (r1 && r1.ok) setKpi(await r1.json());
        if (r2 && r2.ok) { const j = await r2.json(); setAlerts(j.alerts || []); }
      } catch {}
    })();
  }, [token]);
  return (
    <>
      <WhatsNewStrip token={token} />

      <section style={S.section}>
        <div style={S.eyebrow2}>Today · command centre</div>
        <div style={{ ...S.heroCard, padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <KpiTile label="On property" value={kpi?.rooms_occupied ?? "—"} sub="rooms" />
            <KpiTile label="Arrivals" value={kpi?.arrivals_today ?? "—"} sub="today" />
            <KpiTile label="VIP" value={kpi?.vip_today ?? "—"} sub="in-house" />
            <KpiTile label="Alerts" value={alerts.length} sub="open" />
          </div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 10, letterSpacing: 1 }}>
            Full dashboard lives on desktop — tap the palette to jump anywhere
          </div>
        </div>
      </section>

      <FinanceTiles token={token} />
      <OpsSnapshot token={token} />
      <ActivityStrip token={token} />
      {alerts.length > 0 && (
        <section style={S.section}>
          <div style={S.eyebrow2}>Active alerts</div>
          {alerts.slice(0, 5).map((a: any, i: number) => (
            <div key={a.id || i} data-testid={`alert-${a.id || i}`} style={{ ...S.card, borderLeft: "3px solid #ef4444" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f5efe4" }}>{a.title || a.message || "Alert"}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{a.severity || "—"} · {a.department || a.system || "ops"}</div>
            </div>
          ))}
        </section>
      )}
      <section style={S.section}>
        <div style={S.eyebrow2}>Admin quick</div>
        <div style={S.tile2}>
          {caps.can_approve_pto && <ActionTile testid="salary-pto-queue" emoji="🏝" label="PTO queue" sub="Approve / reject" onClick={() => onJumpTab("schedule")} />}
          {caps.can_edit_standup && <ActionTile testid="salary-briefing" emoji="📣" label="Briefing" sub="Read + confirm" onClick={() => onJumpTab("briefing")} />}
          {caps.can_mint_tokens && <ActionTile testid="salary-more" emoji="•••" label="Admin tools" sub="Mint · templates" onClick={() => onJumpTab("more")} />}
          <ActionTile testid="salary-concierge" emoji="🛎" label="Concierge ops" sub="FOH companion" onClick={() => onJumpTab("concierge")} />
        </div>
      </section>
    </>
  );
}

// ─── Schedule / PTO tab ─────────────────────────────────────────────────
function ScheduleTab({ token, caps }: { token: string; caps: Cap }) {
  const [mine, setMine] = useState<any[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ start: "", end: "", kind: "vacation", reason: "" });
  const [flash, setFlash] = useState<string | null>(null);

  async function load() {
    const r = await fetch(`${API()}/api/pto/mine`, { headers: { "X-Briefing-Token": token } });
    if (!r.ok) return;
    const j = await r.json(); setMine(j.requests || []); setBalance(j.pto_balance_days ?? null);
  }
  useEffect(() => { load(); }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.start || !form.end) { setFlash("Pick both dates."); return; }
    setBusy(true);
    try {
      const r = await fetch(`${API()}/api/pto/request`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-Briefing-Token": token },
        body: JSON.stringify({ start_date: form.start, end_date: form.end, kind: form.kind, reason: form.reason }),
      });
      if (!r.ok) { setFlash(`Failed: ${await r.text()}`); return; }
      setFlash("Request submitted · your manager will confirm."); setForm({ start: "", end: "", kind: "vacation", reason: "" });
      await load();
      setTimeout(() => setFlash(null), 3000);
    } finally { setBusy(false); }
  }

  async function cancel(id: string) {
    if (!confirm("Cancel this request?")) return;
    const r = await fetch(`${API()}/api/pto/cancel/${id}`, { method: "POST", headers: { "X-Briefing-Token": token } });
    if (r.ok) { setFlash("Canceled."); await load(); setTimeout(() => setFlash(null), 2500); }
  }

  return (
    <div data-testid="schedule-tab">
      <section style={S.section}>
        <div style={S.eyebrow2}>My time off</div>
        <div style={S.heroCard}>
          <div style={{ fontSize: 32, fontWeight: 200, color: "#f5efe4", letterSpacing: -0.5 }}>
            {balance != null ? `${balance}` : "—"} <span style={{ fontSize: 14, color: "#94a3b8", fontWeight: 400 }}>days available</span>
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Accrues monthly. Request below — no paper, no email.</div>
        </div>
      </section>

      <section style={S.section}>
        <div style={S.eyebrow2}>Request time off</div>
        <form data-testid="pto-form" onSubmit={submit} style={{ ...S.card, display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={S.label}>Start date</label>
          <input data-testid="pto-start" type="date" required value={form.start} onChange={e => setForm({...form, start: e.target.value})} style={S.input} />
          <label style={S.label}>End date</label>
          <input data-testid="pto-end" type="date" required value={form.end} onChange={e => setForm({...form, end: e.target.value})} style={S.input} />
          <label style={S.label}>Type</label>
          <select data-testid="pto-kind" value={form.kind} onChange={e => setForm({...form, kind: e.target.value})} style={S.input}>
            <option value="vacation">Vacation</option>
            <option value="sick">Sick</option>
            <option value="personal">Personal</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <label style={S.label}>Reason (optional)</label>
          <input data-testid="pto-reason" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="e.g. family trip" style={S.input} />
          <button data-testid="pto-submit" disabled={busy} type="submit" style={{ ...S.primaryBtn, opacity: busy ? 0.6 : 1 }}>
            {busy ? "Submitting…" : "Submit request"}
          </button>
        </form>
        {flash && <div data-testid="pto-flash" style={{ marginTop: 8, fontSize: 12, color: "#86efac" }}>{flash}</div>}
      </section>

      <section style={S.section}>
        <div style={S.eyebrow2}>My requests</div>
        {mine.length === 0 ? <div style={{ fontSize: 12, color: "#64748b" }}>None yet.</div> :
          mine.map(r => (
            <div key={r.id} data-testid={`pto-row-${r.id}`} style={{ ...S.card, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f5efe4" }}>{r.start_date} → {r.end_date} · {r.days}d</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{r.kind}{r.reason ? ` · ${r.reason}` : ""}</div>
              </div>
              <span style={{ ...S.statusPill, background: statusBg(r.status), color: statusFg(r.status) }}>{(r.status || "pending").toUpperCase()}</span>
              {(r.status === "pending" || r.status === "approved") && (
                <button data-testid={`pto-cancel-${r.id}`} onClick={() => cancel(r.id)} style={S.ghostBtn}>Cancel</button>
              )}
            </div>
          ))}
      </section>

      {!caps.can_view_coworker_schedule && (
        <section style={{ ...S.section, padding: "0 4px" }}>
          <div style={{ fontSize: 11, color: "#64748b", textAlign: "center", padding: "20px 0", lineHeight: 1.5 }}>
            Coworker schedules, coverage board, and total-hours views are manager-only.
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Concierge / Briefing tabs (iframe to existing routes) ──────────────
function ConciergeTab({ token }: { token: string }) {
  return (
    <div data-testid="concierge-tab" style={{ height: "calc(100vh - 200px)", margin: "0 -18px" }}>
      <iframe title="Concierge" src={`/m/concierge/${token}`} style={{ border: 0, width: "100%", height: "100%" }} />
    </div>
  );
}
function BriefingTab({ token }: { token: string }) {
  return (
    <div data-testid="briefing-tab" style={{ height: "calc(100vh - 200px)", margin: "0 -18px" }}>
      <iframe title="Briefing" src={`/m/briefing/${token}`} style={{ border: 0, width: "100%", height: "100%" }} />
    </div>
  );
}

// ─── More tab ───────────────────────────────────────────────────────────
function MoreTab({ staff, caps }: { staff: Staff; caps: Cap }) {
  const [hiringOpen, setHiringOpen] = useState(false);
  return (
    <div data-testid="more-tab">
      <section style={S.section}>
        <div style={S.eyebrow2}>My account</div>
        <div style={S.card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f5efe4" }}>{staff.name}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{staff.email || "no email on file"} · {caps.role}</div>
        </div>
      </section>

      <section style={S.section}>
        <div style={S.eyebrow2}>Benefits</div>
        <BenefitsList />
      </section>

      {caps.is_salary && (
        <section style={S.section}>
          <div style={S.eyebrow2}>Admin tools</div>
          {caps.can_edit_standup && <LinkRow testid="admin-briefing-edit" emoji="📣" label="Edit today's standup" sub="Desktop recommended — opens in your browser." href="/" />}
          {caps.can_mint_tokens && <LinkRow testid="admin-mint-tokens" emoji="🎫" label="Mint mobile tokens" sub="Bulk CSV, template editor." href="/" />}
          {caps.can_approve_pto && <LinkRow testid="admin-pto-approve" emoji="🏝" label="Approve PTO queue" sub="Pending team requests." href="/" />}
          {caps.can_manage_hiring && (
            <button data-testid="admin-hiring-open" onClick={() => setHiringOpen(true)} style={S.linkRowBtn}>
              <div style={{ fontSize: 22, width: 34 }}>📝</div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f5efe4" }}>Hiring</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Candidate AI evaluation · review on mobile</div>
              </div>
              <div style={{ color: "#c8a97e" }}>→</div>
            </button>
          )}
          {caps.can_view_dashboard && <LinkRow testid="admin-dashboard" emoji="🧭" label="Full dashboard (desktop)" sub="JARVIS command centre." href="/" />}
        </section>
      )}

      <section style={S.section}>
        <div style={S.eyebrow2}>About</div>
        <div style={{ fontSize: 11, color: "#64748b", textAlign: "center", padding: "12px 0", lineHeight: 1.6 }}>
          Luccca Staff · v{("1.0.0")}<br/>
          Cake designer, whiteboard, and full panel workspace are desktop-only.<br/>
          For those, open the web app on your laptop.
        </div>
      </section>

      {hiringOpen && <HiringDrawer onClose={() => setHiringOpen(false)} />}
    </div>
  );
}

function BenefitsList() {
  const [benefits, setBenefits] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      try {
        // Use the staff token from URL — the /m/staff/:token route holds the token
        const m = window.location.pathname.match(/\/m\/staff\/([^/]+)/);
        const tok = m?.[1]; if (!tok) return;
        const r = await fetch(`${API()}/api/benefits/mine`, { headers: { "X-Briefing-Token": tok } });
        if (r.ok) { const j = await r.json(); setBenefits(j.catalog || []); }
      } catch {}
    })();
  }, []);
  return (
    <div data-testid="benefits-list" style={{ display: "grid", gap: 8 }}>
      {benefits.map(b => (
        <div key={b.slug} data-testid={`benefit-${b.slug}`} style={{ ...S.card, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 22 }}>{b.icon || "•"}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f5efe4" }}>{b.name}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, lineHeight: 1.4 }}>{b.summary}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Command palette ────────────────────────────────────────────────────
type PaletteEntry = { id: string; label: string; sub: string; emoji: string; action: () => void; deskOnly?: boolean };

function CommandPalette({ caps, onClose, onJumpTab }: { caps: Cap; onClose: () => void; onJumpTab: (t: any) => void }) {
  const [q, setQ] = useState("");
  const entries: PaletteEntry[] = useMemo(() => {
    const all: PaletteEntry[] = [
      { id: "home", label: "Home", sub: "Today's summary", emoji: "🏠", action: () => onJumpTab("home") },
      { id: "schedule", label: "Schedule & PTO", sub: "Time off requests", emoji: "📅", action: () => onJumpTab("schedule") },
      { id: "concierge", label: "Guest concierge", sub: "FOH companion", emoji: "🛎", action: () => onJumpTab("concierge") },
      { id: "briefing", label: "Daily briefing", sub: "Today's standup", emoji: "📣", action: () => onJumpTab("briefing") },
      { id: "benefits", label: "My benefits", sub: "Health · dental · 401k", emoji: "💼", action: () => onJumpTab("more") },
    ];
    if (caps.is_salary) {
      all.push(
        { id: "dashboard", label: "Full dashboard", sub: "JARVIS command centre", emoji: "🧭", action: () => { window.location.href = "/"; }, deskOnly: true },
        { id: "standup-edit", label: "Edit standup", sub: "Tomorrow's plan", emoji: "📋", action: () => { window.location.href = "/panel/standup"; }, deskOnly: true },
        { id: "briefing-admin", label: "Briefing admin", sub: "Mint · templates · flush", emoji: "🎫", action: () => { window.location.href = "/panel/briefing-admin"; }, deskOnly: true },
        { id: "pto-queue", label: "PTO queue", sub: "Pending team requests", emoji: "🏝", action: () => { window.location.href = "/panel/pto-queue"; }, deskOnly: true },
      );
    }
    if (caps.can_manage_hiring) all.push({ id: "hiring", label: "Hiring", sub: "Candidate AI eval", emoji: "📝", action: () => { window.location.href = "/panel/hiring"; }, deskOnly: true });
    if (caps.can_view_financials) all.push({ id: "financials", label: "Financials", sub: "P&L · cost reports", emoji: "💰", action: () => { window.location.href = "/panel/financials"; }, deskOnly: true });
    return all;
  }, [caps, onJumpTab]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter(e => (e.label + " " + e.sub).toLowerCase().includes(needle));
  }, [entries, q]);

  return (
    <div data-testid="command-palette" style={S.paletteRoot} onClick={onClose}>
      <div style={S.paletteCard} onClick={e => e.stopPropagation()}>
        <input
          data-testid="palette-input"
          autoFocus
          placeholder="Search modules · type to filter"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === "Escape") onClose(); if (e.key === "Enter" && filtered[0]) { filtered[0].action(); onClose(); } }}
          style={S.paletteInput}
        />
        <div style={{ maxHeight: 400, overflow: "auto", marginTop: 10 }}>
          {filtered.length === 0 && <div style={{ padding: 20, color: "#64748b", fontSize: 12, textAlign: "center" }}>No matches.</div>}
          {filtered.map(e => (
            <button key={e.id} data-testid={`palette-${e.id}`} onClick={() => { e.action(); onClose(); }} style={S.paletteRow}>
              <span style={{ fontSize: 20, width: 28 }}>{e.emoji}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#f5efe4" }}>{e.label}</span>
                <span style={{ display: "block", fontSize: 11, color: "#94a3b8" }}>{e.sub}</span>
              </span>
              {e.deskOnly && <span style={S.deskPill}>DESKTOP</span>}
            </button>
          ))}
        </div>
        <button data-testid="palette-close" onClick={onClose} style={S.paletteClose}>Close</button>
      </div>
    </div>
  );
}

// ─── Primitives ──────────────────────────────────────────────────────────
// iter213 · WasteTab moved to its own file (v1.2 Phase 1 extensions)
import { WasteTab } from "./WasteTab";


function TabBtn({ testid, active, onClick, emoji, label }: { testid: string; active: boolean; onClick: () => void; emoji: string; label: string }) {
  return (
    <button data-testid={testid} onClick={onClick} style={{
      flex: 1, background: "transparent", border: 0, padding: "8px 4px",
      color: active ? "#c8a97e" : "#64748b",
      cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    }}>
      <span style={{ fontSize: 20 }}>{emoji}</span>
      <span style={{ fontSize: 10, letterSpacing: 1, fontWeight: active ? 700 : 500 }}>{label}</span>
    </button>
  );
}

function ActionTile({ testid, emoji, label, sub, onClick }: { testid: string; emoji: string; label: string; sub: string; onClick: () => void }) {
  return (
    <button data-testid={testid} onClick={onClick} style={S.actionTile}>
      <span style={{ fontSize: 24 }}>{emoji}</span>
      <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#f5efe4", marginTop: 6 }}>{label}</span>
      <span style={{ display: "block", fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{sub}</span>
    </button>
  );
}

function KpiTile({ label, value, sub }: { label: string; value: any; sub: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, background: "rgba(200,169,126,0.05)", border: "1px solid rgba(200,169,126,0.15)" }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 300, color: "#f5efe4", marginTop: 2 }}>{String(value)}</div>
      <div style={{ fontSize: 10, color: "#94a3b8" }}>{sub}</div>
    </div>
  );
}

function LinkRow({ testid, emoji, label, sub, href }: { testid: string; emoji: string; label: string; sub: string; href: string }) {
  return (
    <a data-testid={testid} href={href} target="_blank" rel="noreferrer" style={{ ...S.card, display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f5efe4" }}>{label}</div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ color: "#64748b", fontSize: 16 }}>↗</span>
    </a>
  );
}

function firstName(n?: string) { return (n || "there").split(/\s+/)[0]; }
function statusBg(s?: string) { return s === "approved" ? "rgba(34,197,94,0.15)" : s === "rejected" ? "rgba(239,68,68,0.15)" : s === "canceled" ? "rgba(148,163,184,0.12)" : "rgba(200,169,126,0.15)"; }
function statusFg(s?: string) { return s === "approved" ? "#86efac" : s === "rejected" ? "#fca5a5" : s === "canceled" ? "#cbd5e1" : "#c8a97e"; }
function rolePillBg(r: string) { return r === "owner" ? "rgba(236,72,153,0.15)" : r === "manager" ? "rgba(168,85,247,0.15)" : r === "salary" ? "rgba(59,130,246,0.15)" : "rgba(148,163,184,0.12)"; }
function rolePillFg(r: string) { return r === "owner" ? "#fbcfe8" : r === "manager" ? "#d8b4fe" : r === "salary" ? "#93c5fd" : "#cbd5e1"; }


// ─── iter193 · Mobile Build 4 · Finance tiles ────────────────────────────
function FinanceTiles({ token }: { token: string }) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API()}/api/staff-mobile/finance/rollup?days=7`, { headers: { "X-Briefing-Token": token } });
        if (r.status === 403) { setErr("forbidden"); return; }
        if (!r.ok) { setErr("unavailable"); return; }
        setData(await r.json());
      } catch { setErr("unavailable"); }
    })();
  }, [token]);
  if (err === "forbidden" || !data) return null;
  const t = data.tiles || {};
  const pill = (pct: number | null, target: number) => {
    if (pct == null) return { color: "#64748b", txt: "—" };
    if (pct <= target) return { color: "#86efac", txt: `${pct}%` };
    if (pct <= target + 3) return { color: "#fcd34d", txt: `${pct}%` };
    return { color: "#fca5a5", txt: `${pct}%` };
  };
  const fc = pill(t.food_cost?.pct_of_revenue, t.food_cost?.target_pct ?? 26);
  const lb = pill(t.labor?.pct_of_revenue, t.labor?.target_pct ?? 28);
  const pc = pill(t.prime_cost?.pct_of_revenue, t.prime_cost?.target_pct ?? 55);
  return (
    <section data-testid="finance-tiles" style={S.section}>
      <div style={S.eyebrow2}>Finance · last 7d</div>
      <div style={{ ...S.heroCard, padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div data-testid="finance-food-cost">
            <div style={S.tileLabel}>Food cost</div>
            <div style={{ ...S.tileValue, color: fc.color }}>{fc.txt}</div>
            <div style={S.tileSub}>target ≤ {t.food_cost?.target_pct ?? 26}%</div>
          </div>
          <div data-testid="finance-labor">
            <div style={S.tileLabel}>Labor</div>
            <div style={{ ...S.tileValue, color: lb.color }}>{lb.txt}</div>
            <div style={S.tileSub}>target ≤ {t.labor?.target_pct ?? 28}%</div>
          </div>
          <div data-testid="finance-prime-cost">
            <div style={S.tileLabel}>Prime cost</div>
            <div style={{ ...S.tileValue, color: pc.color }}>{pc.txt}</div>
            <div style={S.tileSub}>target ≤ {t.prime_cost?.target_pct ?? 55}%</div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: "#94a3b8" }}>
          Revenue · <span style={{ color: "#f5efe4", fontWeight: 700 }}>${(t.revenue?.value ?? 0).toLocaleString()}</span>
        </div>
      </div>
    </section>
  );
}

// ─── iter197 · Mobile Build 5 · Ops Snapshot (Fresh Meal) ───────────────
function OpsSnapshot({ token }: { token: string }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API()}/api/fresh-meals/ops-dashboard`, { headers: { "X-Briefing-Token": token } });
        if (!r.ok) { setErr(true); return; }
        setD(await r.json());
      } catch { setErr(true); }
    })();
  }, [token]);
  if (err || !d) return null;
  const prod = d.production || {};
  const del = d.delivery || {};
  const lanes = d.lanes || {};
  const tempEx = (d.alerts || []).filter((a: any) => /temperature|excursion|cold chain/i.test(`${a.source || ""} ${a.message || ""}`)).length;
  return (
    <section data-testid="ops-snapshot" style={S.section}>
      <div style={S.eyebrow2}>Fresh Meal · ops snapshot</div>
      <div style={{ ...S.heroCard, padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div data-testid="ops-packs-today">
            <div style={S.tileLabel}>Kits today</div>
            <div style={S.tileValue}>{prod.kits_produced_today ?? 0}<span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}> / {(prod.kits_produced_today ?? 0) + (prod.kits_in_queue ?? 0)}</span></div>
            <div style={S.tileSub}>{prod.kits_in_queue ?? 0} in queue</div>
          </div>
          <div data-testid="ops-temp-excursions">
            <div style={S.tileLabel}>Temp excursions</div>
            <div style={{ ...S.tileValue, color: tempEx > 0 ? "#fca5a5" : "#86efac" }}>{tempEx}</div>
            <div style={S.tileSub}>{tempEx > 0 ? "review cold chain" : "all within range"}</div>
          </div>
          <div data-testid="ops-out-for-delivery">
            <div style={S.tileLabel}>Out for delivery</div>
            <div style={S.tileValue}>{del.out_for_delivery ?? 0}</div>
            <div style={S.tileSub}>{del.delivered_today ?? 0} delivered · {del.issues ?? 0} issues</div>
          </div>
          <div data-testid="ops-lane-util">
            <div style={S.tileLabel}>Lane utilisation</div>
            <div style={S.tileValue}>{Math.round(lanes.avg_utilization ?? 0)}%</div>
            <div style={S.tileSub}>{(lanes.lanes || []).filter((l: any) => l.status === "busy").length}/{lanes.total ?? 0} lanes busy</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── iter197 · Mobile Build 5 · Activity Strip (recent timeline events) ─
function ActivityStrip({ token }: { token: string }) {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API()}/api/timeline/recent?limit=6`, { headers: { "X-Briefing-Token": token } });
        if (!r.ok) return;
        const j = await r.json();
        setEvents(j.events || []);
      } catch {}
    })();
  }, [token]);

  if (events.length === 0) {
    return (
      <section data-testid="activity-strip" style={S.section}>
        <div style={S.eyebrow2}>Activity · last events</div>
        <div style={{ ...S.card, color: "#94a3b8", fontSize: 12 }}>No recent activity.</div>
      </section>
    );
  }

  return (
    <section data-testid="activity-strip" style={S.section}>
      <div style={S.eyebrow2}>Activity · last events</div>
      {events.slice(0, 6).map((e: any, i: number) => (
        <div key={i} data-testid={`activity-event-${i}`} style={{ ...S.card, padding: "8px 10px", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f5efe4", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {eventEmoji(e.type)} {prettyEventType(e.type)}
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0 }}>{relativeTime(e.timestamp)}</div>
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
            {e.actor?.name || e.actor?.id || "system"}
            {e.entity_refs?.[0]?.name ? ` · ${e.entity_refs[0].name}` : e.entity_refs?.[0]?.id ? ` · ${e.entity_refs[0].id}` : ""}
          </div>
        </div>
      ))}
    </section>
  );
}

// ─── iter198 · Mobile Build 5+ · Pinned "What just happened?" strip ──────
// Auto-refreshes every 5 min. Shows 30-min Echo NL summary at the TOP of
// HomeSalary so managers see the morning brief the instant they open the app.
function WhatsNewStrip({ token }: { token: string }) {
  const [headline, setHeadline] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [count, setCount] = useState<number>(0);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [tick, setTick] = useState(0); // drives "Xm ago" re-render

  async function load(manual = false) {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`${API()}/api/echo/whats-new`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Briefing-Token": token },
        body: JSON.stringify({ minutes: 30 }),
      });
      if (!r.ok) { if (manual) setErr("Echo unavailable — try again."); return; }
      const j = await r.json();
      setHeadline(j.headline || null);
      setSummary(j.summary || null);
      setCount(j.event_count ?? 0);
      setUpdatedAt(Date.now());
    } catch {
      if (manual) setErr("Network — try again.");
    }
    finally { setBusy(false); }
  }

  useEffect(() => {
    load();
    const fetchIv = setInterval(() => load(), 5 * 60 * 1000);
    const tickIv = setInterval(() => setTick((t) => t + 1), 30 * 1000);
    return () => { clearInterval(fetchIv); clearInterval(tickIv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const freshness = updatedAt ? Math.floor((Date.now() - updatedAt) / 1000) : null;
  const freshLabel = freshness == null ? "—" : freshness < 60 ? `${freshness}s ago` : `${Math.floor(freshness / 60)}m ago`;
  // `tick` is intentionally referenced so the effect re-renders freshness
  void tick;

  if (!headline && !summary && !err && !busy) {
    // initial mount before first fetch completes — render a placeholder skeleton
    return (
      <section data-testid="whats-new-strip" style={S.section}>
        <div style={S.eyebrow2}>What just happened?</div>
        <div style={{ ...S.heroCard, padding: 14, opacity: 0.6 }}>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Asking Echo…</div>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="whats-new-strip" style={S.section}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={S.eyebrow2}>What just happened?</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span data-testid="whats-new-fresh" style={{ fontSize: 9, color: "#64748b", letterSpacing: 1, textTransform: "uppercase" }}>{freshLabel}</span>
          <button
            data-testid="whats-new-refresh"
            onClick={() => load(true)}
            disabled={busy}
            style={{
              background: "transparent",
              color: "#c8a97e",
              border: "1px solid rgba(200,169,126,0.35)",
              borderRadius: 999,
              padding: "3px 9px",
              fontSize: 10,
              letterSpacing: 1,
              textTransform: "uppercase",
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      <div data-testid="whats-new-card" style={{ ...S.heroCard, padding: 14, borderLeft: "3px solid #c8a97e" }}>
        {err ? (
          <div style={{ fontSize: 12, color: "#fca5a5" }}>{err}</div>
        ) : (
          <>
            {headline ? (
              <div data-testid="whats-new-headline" style={{ fontSize: 14, fontWeight: 700, color: "#f5efe4", lineHeight: 1.4 }}>{headline}</div>
            ) : (
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Nothing notable in the last 30 minutes.</div>
            )}

            {summary && (
              <>
                <button
                  data-testid="whats-new-toggle"
                  onClick={() => setExpanded((v) => !v)}
                  style={{
                    background: "transparent",
                    color: "#94a3b8",
                    border: 0,
                    padding: 0,
                    marginTop: 8,
                    fontSize: 10,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {expanded ? "Hide details ▴" : "See details ▾"}
                </button>
                {expanded && (
                  <div data-testid="whats-new-summary" style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.55, whiteSpace: "pre-wrap", marginTop: 8 }}>
                    {summary}
                  </div>
                )}
              </>
            )}

            <div style={{ fontSize: 9, color: "#64748b", marginTop: 10, letterSpacing: 1 }}>
              Echo · Claude Sonnet 4.5 · last 30 min · {count} events · auto-refresh 5m
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function eventEmoji(type: string): string {
  if (!type) return "•";
  if (type.startsWith("pack.")) return "📦";
  if (type.startsWith("lot.")) return "🏷";
  if (type.startsWith("po.")) return "🛒";
  if (type.startsWith("batch.") || type.startsWith("ccp.")) return "🍳";
  if (type.startsWith("order.")) return "🧾";
  if (type.startsWith("label.")) return "🖨";
  if (type.startsWith("echo.")) return "✨";
  if (type.startsWith("standup.") || type.startsWith("mobile_push.")) return "📣";
  return "•";
}

function prettyEventType(type: string): string {
  if (!type) return "event";
  return type.replace(/\./g, " · ").replace(/_/g, " ");
}

function relativeTime(ts: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  const diff = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── iter193 · Hiring drawer (mobile) ────────────────────────────────────
function HiringDrawer({ onClose }: { onClose: () => void }) {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const m = window.location.pathname.match(/\/m\/staff\/([^/]+)/);
  const tok = m?.[1] || "";

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API()}/api/staff-mobile/hiring/batches?limit=20`, { headers: { "X-Briefing-Token": tok } });
        if (r.status === 403) { setErr("Manager role required."); return; }
        if (!r.ok) { setErr("Couldn't load batches."); return; }
        const j = await r.json();
        setBatches(j.batches || []);
      } catch { setErr("Network error."); }
      finally { setLoading(false); }
    })();
  }, [tok]);

  async function openBatch(id: string) {
    try {
      const r = await fetch(`${API()}/api/staff-mobile/hiring/batch/${id}`, { headers: { "X-Briefing-Token": tok } });
      if (r.ok) setActive((await r.json()).batch);
    } catch {}
  }

  async function decide(batchId: string, candidateName: string, decision: string) {
    try {
      const r = await fetch(`${API()}/api/staff-mobile/hiring/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Briefing-Token": tok },
        body: JSON.stringify({ batch_id: batchId, candidate_name: candidateName, decision }),
      });
      if (r.ok) {
        // Re-open the same batch to show freshest decisions
        openBatch(batchId);
      }
    } catch {}
  }

  return (
    <div data-testid="hiring-drawer" style={S.drawerRoot} onClick={onClose}>
      <div style={S.drawerCard} onClick={(e) => e.stopPropagation()}>
        <div style={S.drawerHeader}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#c8a97e", textTransform: "uppercase" }}>Hiring</div>
          <button data-testid="hiring-close" onClick={onClose} style={S.drawerClose}>Close</button>
        </div>

        {err && <div style={{ padding: 14, color: "#fca5a5", fontSize: 13 }}>{err}</div>}
        {loading && !err && <div style={{ padding: 14, color: "#94a3b8", fontSize: 12 }}>Loading batches…</div>}

        {!active && !loading && !err && (
          <div style={{ padding: "0 4px 14px" }}>
            {batches.length === 0 && <div style={{ fontSize: 12, color: "#94a3b8", padding: 12 }}>No hiring batches yet. Run one from the desktop Hiring panel.</div>}
            {batches.map((b: any) => (
              <button key={b.id} data-testid={`hiring-batch-${b.id}`} onClick={() => openBatch(b.id)} style={S.linkRowBtn}>
                <div style={{ fontSize: 22, width: 34 }}>📝</div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f5efe4" }}>{b.job_profile_title || b.job_profile_code}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    {b.candidate_count} candidates · {(b.top_candidates || []).slice(0, 2).map((c: any) => `#${c.rank} ${c.fit_score ?? "—"}`).join(" · ")}
                  </div>
                </div>
                <div style={{ color: "#c8a97e" }}>→</div>
              </button>
            ))}
          </div>
        )}

        {active && (
          <div data-testid="hiring-batch-detail" style={{ padding: "0 4px 14px" }}>
            <button data-testid="hiring-back" onClick={() => setActive(null)} style={{ ...S.ghostBtn, marginBottom: 10 }}>← Back</button>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f5efe4" }}>{active.job_profile_title}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>{active.candidate_count} candidates</div>
            {(active.ranked || []).map((c: any, i: number) => (
              <div key={c.candidate_name + i} data-testid={`hiring-candidate-${i}`} style={S.card}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: c.fit_score >= 75 ? "#86efac" : c.fit_score >= 55 ? "#fcd34d" : "#fca5a5" }}>
                    {c.fit_score ?? "—"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f5efe4" }}>{c.candidate_name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{c.fit_label || "—"} · {c.recommendation || "pending"}</div>
                  </div>
                </div>
                {c.headline && <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 8, lineHeight: 1.5 }}>{c.headline}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
                  <button data-testid={`hiring-advance-${i}`} onClick={() => decide(active.id, c.candidate_name, "advance")} style={{ ...S.ghostBtn, color: "#86efac", borderColor: "rgba(34,197,94,0.35)" }}>Advance</button>
                  <button data-testid={`hiring-phone-${i}`} onClick={() => decide(active.id, c.candidate_name, "phone-screen")} style={S.ghostBtn}>Phone screen</button>
                  <button data-testid={`hiring-hold-${i}`} onClick={() => decide(active.id, c.candidate_name, "hold")} style={S.ghostBtn}>Hold</button>
                  <button data-testid={`hiring-decline-${i}`} onClick={() => decide(active.id, c.candidate_name, "decline")} style={{ ...S.ghostBtn, color: "#fca5a5", borderColor: "rgba(239,68,68,0.3)" }}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── iter193 · Release notes banner ──────────────────────────────────────
function ReleaseNotesBanner({ token }: { token: string }) {
  const [notes, setNotes] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API()}/api/release-notes/unread`, { headers: { "X-Briefing-Token": token } });
        if (!r.ok) return;
        const j = await r.json();
        setNotes(j.unread || []);
      } catch {}
    })();
  }, [token]);

  async function dismiss(id: string) {
    try {
      await fetch(`${API()}/api/release-notes/${id}/dismiss`, { method: "POST", headers: { "X-Briefing-Token": token } });
      setNotes(notes.filter(n => n.id !== id));
    } catch {}
  }

  if (notes.length === 0) return null;
  const n = notes[0];
  return (
    <div data-testid="release-notes-banner" style={{
      margin: "0 0 14px", padding: "12px 14px",
      borderRadius: 12, background: "rgba(200,169,126,0.08)", border: "1px solid rgba(200,169,126,0.28)",
      display: "flex", alignItems: "flex-start", gap: 10,
    }}>
      <div style={{ fontSize: 18 }}>✨</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700 }}>
          {n.version || "What's new"}{notes.length > 1 ? ` · +${notes.length - 1} more` : ""}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f5efe4", marginTop: 2 }}>{n.title}</div>
        <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4, lineHeight: 1.4 }}>{n.body}</div>
      </div>
      <button data-testid={`release-dismiss-${n.id}`} onClick={() => dismiss(n.id)} style={{
        background: "transparent", border: 0, color: "#c8a97e", fontSize: 16, cursor: "pointer", padding: 2,
      }}>×</button>
    </div>
  );
}


const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "radial-gradient(ellipse at top, #0f1523 0%, #050812 60%, #020307 100%)", color: "#f5efe4", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif", display: "flex", flexDirection: "column", maxWidth: 520, margin: "0 auto" },
  loading: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050812", color: "#c8a97e", fontFamily: "system-ui" },
  errRoot: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050812", padding: 24 },
  errCard: { maxWidth: 380, padding: 20, borderRadius: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 14, textAlign: "center", fontFamily: "system-ui" },
  header: { padding: "24px 18px 12px" },
  eyebrow: { fontSize: 9, letterSpacing: 4, textTransform: "uppercase", color: "#c8a97e", fontWeight: 700 },
  title: { fontSize: 28, margin: "8px 0 2px", fontWeight: 200, letterSpacing: -0.5, color: "#f5efe4" },
  sub: { fontSize: 12, color: "#94a3b8" },
  rolePill: { fontSize: 9, letterSpacing: 1.5, padding: "3px 8px", borderRadius: 999, fontWeight: 700 },
  main: { flex: 1, padding: "0 18px 100px" },
  tabBar: { position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 520, margin: "0 auto", display: "flex", background: "rgba(10,14,26,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "6px 4px calc(env(safe-area-inset-bottom, 8px) + 4px)" },
  searchBtn: { width: "100%", padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,169,126,0.2)", color: "#f5efe4", fontSize: 13, cursor: "pointer", textAlign: "left" as const, marginTop: 10, display: "flex", alignItems: "center", gap: 8 },
  section: { marginTop: 18 },
  eyebrow2: { fontSize: 9, letterSpacing: 3, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 },
  heroCard: { padding: 18, borderRadius: 16, background: "rgba(200,169,126,0.05)", border: "1px solid rgba(200,169,126,0.2)" },
  card: { padding: 12, marginBottom: 8, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" },
  tile2: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 },
  actionTile: { padding: "18px 10px", minHeight: 100, borderRadius: 14, background: "rgba(200,169,126,0.06)", border: "1px solid rgba(200,169,126,0.25)", color: "#f5efe4", cursor: "pointer", textAlign: "center" as const, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 10, letterSpacing: 2, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700, display: "block" },
  input: { width: "100%", padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,169,126,0.25)", color: "#f5efe4", fontSize: 14, outline: "none", boxSizing: "border-box" as any },
  primaryBtn: { width: "100%", padding: 12, borderRadius: 10, border: "none", background: "linear-gradient(90deg, #c8a97e, #e9d5a5)", color: "#0a0e1a", fontWeight: 700, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" as const, cursor: "pointer", marginTop: 6 },
  ghostBtn: { padding: "6px 10px", borderRadius: 8, background: "transparent", border: "1px solid rgba(200,169,126,0.3)", color: "#c8a97e", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" as const, cursor: "pointer" },

  // iter193 · Mobile Build 4 styles
  linkRowBtn: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", marginBottom: 6, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" },
  tileLabel: { fontSize: 9, letterSpacing: 1.5, color: "#94a3b8", textTransform: "uppercase" as const, fontWeight: 700 },
  tileValue: { fontSize: 22, fontWeight: 800, marginTop: 4, letterSpacing: -0.5 },
  tileSub: { fontSize: 9, color: "#64748b", marginTop: 2 },
  drawerRoot: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", zIndex: 10000, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  drawerCard: { width: "100%", maxWidth: 520, maxHeight: "92vh", overflow: "auto", background: "rgba(10,14,26,0.98)", borderTop: "1px solid rgba(200,169,126,0.3)", borderRadius: "18px 18px 0 0", padding: 16 },
  drawerHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 10 },
  drawerClose: { padding: "6px 12px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" as const, cursor: "pointer" },
  statusPill: { fontSize: 9, letterSpacing: 1.5, padding: "2px 8px", borderRadius: 999, fontWeight: 700 },

  paletteRoot: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", zIndex: 9999, padding: "64px 16px", display: "flex", justifyContent: "center" },
  paletteCard: { width: "100%", maxWidth: 480, maxHeight: "80vh", display: "flex", flexDirection: "column" as const, padding: 16, borderRadius: 16, background: "rgba(10,14,26,0.98)", border: "1px solid rgba(200,169,126,0.3)" },
  paletteInput: { padding: "14px 16px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,169,126,0.35)", color: "#f5efe4", fontSize: 15, outline: "none", width: "100%", boxSizing: "border-box" as any },
  paletteRow: { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", background: "transparent", border: 0, color: "#f5efe4", cursor: "pointer", textAlign: "left" as const, borderRadius: 8 },
  paletteClose: { marginTop: 10, padding: "10px", width: "100%", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#94a3b8", fontSize: 12, cursor: "pointer" },
  deskPill: { fontSize: 8, letterSpacing: 1.5, padding: "2px 6px", borderRadius: 999, background: "rgba(59,130,246,0.15)", color: "#93c5fd", fontWeight: 700 },
};


// iter192 · device-token registration for native push (Capacitor) / web fallback
async function registerPushDevice(token: string) {
  // Skip if we registered for this token within the last 7d
  try {
    const last = localStorage.getItem(`luccca_push_regd_${token}`);
    if (last && Date.now() - parseInt(last, 10) < 7 * 24 * 3600 * 1000) return;
  } catch {}

  let deviceToken: string | null = null;
  let platform: "ios" | "android" | "web" = "web";
  let model: string | undefined;
  let osVersion: string | undefined;

  // Capacitor native path (PushNotifications plugin) — loaded lazily
  // Uses Function constructor to completely bypass Vite's static analysis
  try {
    const cap: any = (window as any).Capacitor;
    if (cap?.isNativePlatform?.()) {
      // Dynamic import via Function to avoid Vite bundling non-existent packages
      const dynamicImport = new Function("m", "return import(m)");
      let PushNotifications: any = null;
      let Device: any = null;
      try {
        const pushMod = await dynamicImport("@capacitor/push-notifications").catch(() => null);
        PushNotifications = pushMod?.PushNotifications || null;
      } catch {}
      try {
        const deviceMod = await dynamicImport("@capacitor/device").catch(() => null);
        Device = deviceMod?.Device || null;
      } catch {}
      if (PushNotifications) {
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive === "granted") {
          await PushNotifications.register();
          deviceToken = await new Promise<string | null>((resolve) => {
            const handle = PushNotifications.addListener("registration", (t: any) => {
              resolve(t?.value || null);
              handle?.remove?.();
            });
            setTimeout(() => resolve(null), 8000);
          });
        }
        platform = cap.getPlatform?.() === "ios" ? "ios" : "android";
      }
      if (Device?.getInfo) {
        const info = await Device.getInfo();
        model = info?.model;
        osVersion = info?.osVersion;
      }
    }
  } catch {}

  // Web fallback: use real Web Push via service worker + VAPID subscription when available
  if (!deviceToken) {
    try {
      const webSub = await subscribeWebPush(token);
      if (webSub) {
        // `register-web` already persisted the subscription — mark as registered and exit.
        try { localStorage.setItem(`luccca_push_regd_${token}`, String(Date.now())); } catch {}
        return;
      }
      // Fallback to stable random token so backend at least knows the device exists
      const key = "luccca_web_push_token";
      let t = localStorage.getItem(key);
      if (!t) {
        t = "web-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(key, t);
      }
      deviceToken = t;
      platform = "web";
    } catch {
      return;
    }
  }

  if (!deviceToken) return;
  try {
    const r = await fetch(`${API()}/api/push/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Briefing-Token": token },
      body: JSON.stringify({ device_token: deviceToken, platform, app_variant: "staff", model, os_version: osVersion }),
    });
    if (r.ok) localStorage.setItem(`luccca_push_regd_${token}`, String(Date.now()));
  } catch {}

/**
 * iter199 · Real Web Push subscription via service worker + VAPID.
 * Returns true on success (subscription registered with backend), null otherwise.
 */
async function subscribeWebPush(token: string): Promise<boolean | null> {
  try {
    if (typeof window === "undefined") return null;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return null;

    // Fetch VAPID public key from backend config
    const cfg = await fetch(`${API()}/api/push/config`).then((r) => r.ok ? r.json() : null).catch(() => null);
    if (!cfg?.configured || !cfg?.vapid_public_key) return null;

    // Gate on user permission (do NOT auto-prompt in silent background — only if already granted or default)
    if (Notification.permission === "denied") return null;
    if (Notification.permission === "default") {
      const res = await Notification.requestPermission().catch(() => "denied");
      if (res !== "granted") return null;
    }

    // Register service worker (served from site root)
    const reg = await navigator.serviceWorker.register("/sw.js").catch(() => null);
    if (!reg) return null;
    await navigator.serviceWorker.ready;

    // Subscribe with VAPID applicationServerKey
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.vapid_public_key),
      }).catch(() => null);
    }
    if (!sub) return null;

    const json = sub.toJSON() as any;
    const r = await fetch(`${API()}/api/push/register-web`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Briefing-Token": token },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys || {},
        app_variant: "staff",
        user_agent: navigator.userAgent?.slice(0, 200),
      }),
    });
    return r.ok ? true : null;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

}
