/** iter248 · MyEcho — hourly-employee mobile dashboard.
 *
 * Dedicated thinned-down view for hourly staff: schedule, PTO, paystubs,
 * tax docs, direct deposit, concierge access. Lives at /m/me, uses the
 * /manifest-staff.json (different home-screen icon vs Echo AURION).
 *
 * Single source of truth: every action here writes back to the same
 * MongoDB collections that desktop reads from.
 */
import React from "react";

const API = (window as any).location.origin;
const C = {
  bg: "#031e16",            // emerald-950 (matches MyEcho icon)
  surface: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  accent: "#d4af37", text: "#f5efe4", dim: "#94a3b8", muted: "#5a554d",
  ok: "#10b981", warn: "#f59e0b", err: "#ef4444",
};
const FONT: React.CSSProperties = { fontFamily: "'Inter', system-ui, sans-serif" };

type Tab = "home" | "schedule" | "swap" | "callout" | "pto" | "pay" | "docs" | "concierge" | "chat";

const USER_HEADER: HeadersInit = { "X-User-Id": "demo-hourly-001" };

export default function MyEcho() {
  const [tab, setTab] = React.useState<Tab>(() => {
    const u = new URL(window.location.href);
    return (u.searchParams.get("tab") as Tab) || "home";
  });
  const [me, setMe] = React.useState<any>(null);

  React.useEffect(() => {
    fetch(`${API}/api/myecho/me`, { headers: USER_HEADER })
      .then((r) => r.json()).then(setMe).catch(() => undefined);
    // Promote staff manifest dynamically (so install icon = MyEcho not AURION)
    let link = document.querySelector("link[rel='manifest']") as HTMLLinkElement;
    if (link) link.href = "/manifest-staff.json";
    document.title = "MyEcho · Staff";
    let theme = document.querySelector("meta[name='theme-color']") as HTMLMetaElement;
    if (theme) theme.content = "#064e3b";
  }, []);

  return (
    <div data-testid="myecho-root" style={{
      ...FONT, minHeight: "100vh", background: C.bg, color: C.text,
      paddingBottom: 90, paddingTop: "env(safe-area-inset-top, 0px)",
    }}>
      <Header me={me} tab={tab} />
      <NotificationsBell />
      <div style={{ padding: "8px 14px 60px" }}>
        {tab === "home"      && <HomeView me={me} setTab={setTab} />}
        {tab === "schedule"  && <ScheduleView />}
        {tab === "swap"      && <ShiftSwapView />}
        {tab === "callout"   && <CallOutView />}
        {tab === "chat"      && <ModChatView />}
        {tab === "pto"       && <PtoView />}
        {tab === "pay"       && <PayView />}
        {tab === "docs"      && <DocsView />}
        {tab === "concierge" && <ConciergeView />}
      </div>
      <BottomTabs tab={tab} setTab={setTab} />
    </div>
  );
}

/* ─── Header ──────────────────────────────────────────────────────────── */
function Header({ me, tab }: { me: any; tab: Tab }) {
  const titles: Record<Tab, string> = {
    home: "MyEcho", schedule: "My Schedule", pto: "Time Off",
    pay: "Paystubs", docs: "Tax Docs", concierge: "Concierge",
  };
  return (
    <header style={{
      padding: "18px 18px 14px",
      background: "linear-gradient(180deg, rgba(6,78,59,0.9) 0%, rgba(3,30,22,0) 100%)",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 4, color: C.accent, fontWeight: 700 }}>
            MYECHO · STAFF
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif",
                          fontSize: 22, fontWeight: 200, margin: "4px 0 0",
                          letterSpacing: -0.3 }}>
            {titles[tab]}
          </h1>
        </div>
        {me && (
          <div style={{ textAlign: "right", fontSize: 11 }}>
            <div style={{ color: C.text, fontWeight: 600 }}>{me.name}</div>
            <div style={{ color: C.dim }}>{me.title}</div>
          </div>
        )}
      </div>
    </header>
  );
}

/* ─── Home ────────────────────────────────────────────────────────────── */
function HomeView({ me, setTab }: { me: any; setTab: (t: Tab) => void }) {
  const [next, setNext] = React.useState<any>(null);
  const [pto, setPto] = React.useState<any>(null);
  const [pay, setPay] = React.useState<any>(null);
  const [cogs, setCogs] = React.useState<any>(null);
  // iter266.14 · chef/manager outlet pulse (mobile mirror of Chef Outlet Dashboard)
  const [outletPulse, setOutletPulse] = React.useState<any>(null);
  // iter266.17 · WhatsApp-style BEO threads inbox (continues from desktop)
  const [beoThreads, setBeoThreads] = React.useState<any[]>([]);

  // D21 · only chefs / managers / directors see the commissary tile.
  // A line cook doesn't need to track today's transfer cost.
  const isManager = React.useMemo(() => {
    if (!me) return false;
    const dept = String(me.department || "").toLowerCase();
    const title = String(me.title || "").toLowerCase();
    const role = String(me.role || "").toLowerCase();
    return (
      ["culinary", "pastry", "boh"].includes(dept) ||
      /chef|manager|director|gm/.test(title) ||
      /chef|manager|director|gm|owner/.test(role)
    );
  }, [me]);

  // First outlet they oversee — chefs typically own one; multi-outlet
  // managers (district chef etc.) see THEIR primary one and can drill
  // via Chronos for the rest.
  const primaryOutlet: string | null =
    me?.outlet_ids?.find((o: string) => o && o !== "all") || null;

  React.useEffect(() => {
    fetch(`${API}/api/myecho/schedule`, { headers: USER_HEADER }).then(r => r.json())
      .then(d => setNext((d.rows || []).find((s: any) => s.status === "scheduled")));
    fetch(`${API}/api/myecho/pto-balance`, { headers: USER_HEADER }).then(r => r.json()).then(setPto);
    fetch(`${API}/api/myecho/paystubs`, { headers: USER_HEADER }).then(r => r.json())
      .then(d => setPay((d.rows || [])[0]));
    // D21 · live commissary cost for today, gated to chefs/managers
    if (isManager && primaryOutlet) {
      fetch(`${API}/api/commissary/cogs/today?outlet_id=${encodeURIComponent(primaryOutlet)}`,
            { headers: USER_HEADER })
        .then(r => r.ok ? r.json() : null)
        .then(d => setCogs(d))
        .catch(() => setCogs(null));
      // iter266.14 · Outlet Pulse — pulls the same data as desktop Chef Outlet Dashboard
      fetch(`${API}/api/chef-outlet/dashboard?outlet_id=${encodeURIComponent(primaryOutlet)}&iterations=1000`,
            { headers: USER_HEADER })
        .then(r => r.ok ? r.json() : null)
        .then(d => setOutletPulse(d?.found ? d : null))
        .catch(() => setOutletPulse(null));
    }
    // iter266.17 · BEO message threads — surfaces unread threads from
    // desktop EchoEventsStudio so the conversation continues on mobile
    if (me?.id) {
      fetch(`${API}/api/beo-messaging/unread?user_id=${encodeURIComponent(me.id)}`,
            { headers: USER_HEADER })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => setBeoThreads(d?.threads || []))
        .catch(() => setBeoThreads([]));
    }
  }, [isManager, primaryOutlet]);

  return (
    <>
      {me && (
        <div style={{
          padding: 14, borderRadius: 10, background: C.surface,
          border: `1px solid ${C.border}`, marginTop: 12, marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, color: C.dim }}>Welcome back,</div>
          <div style={{ fontSize: 22, fontFamily: "'Playfair Display', Georgia, serif",
                          fontWeight: 300, color: C.text }}>
            {me.name?.split(" ")[0] || "Staff"}
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
            {me.title} · {me.department} · {me.tenure_years} yrs at Luccca
          </div>
        </div>
      )}
      {next && (
        <Tile testid="home-next-shift" onClick={() => setTab("schedule")}>
          <Eyebrow>NEXT SHIFT · {next.weekday} {fmtDate(next.date)}</Eyebrow>
          <Big>{next.start} – {next.end}</Big>
          <Sub>{next.outlet} · {next.shift} · {next.hours} hrs</Sub>
        </Tile>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {pto && (
          <Tile testid="home-pto" onClick={() => setTab("pto")}>
            <Eyebrow>PTO REMAINING</Eyebrow>
            <Big>{pto.vacation_hours_remaining}h</Big>
            <Sub>{Math.floor(pto.vacation_hours_remaining / 8)} days · {pto.sick_hours_remaining}h sick</Sub>
          </Tile>
        )}
        {pay && (
          <Tile testid="home-last-pay" onClick={() => setTab("pay")}>
            <Eyebrow>LAST PAYCHECK</Eyebrow>
            <Big>${pay.net.toLocaleString()}</Big>
            <Sub>{fmtDate(pay.pay_date)} · {pay.regular_hours + pay.ot_hours}h</Sub>
          </Tile>
        )}
      </div>
      {/* D21 · Commissary cost today (chef/manager only) */}
      {isManager && cogs && cogs.ok && (
        <Tile testid="home-commissary-cogs">
          <Eyebrow>COMMISSARY COST · TODAY</Eyebrow>
          <Big>${(cogs.debit_total ?? 0).toLocaleString()}</Big>
          <Sub>
            {cogs.event_count ?? 0} transfer{cogs.event_count === 1 ? "" : "s"}
            {cogs.credit_total ? ` · −$${cogs.credit_total.toLocaleString()} out` : ""}
          </Sub>
        </Tile>
      )}
      {/* iter266.14 · Outlet Pulse (chef/manager only) — Monte Carlo + YTD mirror */}
      {isManager && outletPulse && (
        <Tile testid="home-outlet-pulse">
          <Eyebrow>OUTLET PULSE · {outletPulse.outlet_name?.toUpperCase()}</Eyebrow>
          <Big>${Math.round((outletPulse.ytd?.ytd_sales || 0) / 1000)}k YTD</Big>
          <Sub>
            {outletPulse.forecast?.available
              ? `MC 7d P50: $${Math.round((outletPulse.forecast.horizons?.d7?.p50 || 0) / 1000)}k · `
              : ""}
            {outletPulse.menu_mix?.totals?.items_tracked || 0} items mixed today
            {outletPulse.labor?.call_off_count > 0
              ? ` · ${outletPulse.labor.call_off_count} call-off`
              : ""}
          </Sub>
        </Tile>
      )}
      {/* iter266.17 · BEO Threads — continues messages from desktop EchoEventsStudio */}
      {beoThreads.length > 0 && (
        <Tile testid="home-beo-threads">
          <Eyebrow>BEO MESSAGES · {beoThreads.length} UNREAD</Eyebrow>
          {beoThreads.slice(0, 3).map((tr: any) => (
            <div key={tr.beo_id} data-testid={`home-beo-thread-${tr.beo_id}`} style={{
              padding: "6px 0", borderBottom: "1px dashed rgba(255,255,255,0.08)",
              fontSize: 12,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}>{tr.beo_name || tr.beo_id}</span>
                <span style={{ fontSize: 9, color: "#94a3b8", fontFamily: "monospace" }}>
                  {tr.event_date || ""}
                </span>
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                {tr.last_sender}: {tr.last_body}
              </div>
            </div>
          ))}
          <Sub>Open desktop drawer to reply with auto-context.</Sub>
        </Tile>
      )}
      <Tile testid="home-concierge" onClick={() => setTab("concierge")}>
        <Eyebrow>NEED HELP?</Eyebrow>
        <Big>🛎  Concierge</Big>
        <Sub>Shift swap · Uniform · Benefits · Anything else</Sub>
      </Tile>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
        <button data-testid="home-quick-swap" onClick={() => setTab("swap")}
          style={quickBtnStyle}>🔄<div style={{ fontSize: 10, marginTop: 4 }}>Swap</div></button>
        <button data-testid="home-quick-callout" onClick={() => setTab("callout")}
          style={quickBtnStyle}>🤒<div style={{ fontSize: 10, marginTop: 4 }}>Call-out</div></button>
        <button data-testid="home-quick-chat" onClick={() => setTab("chat")}
          style={quickBtnStyle}>💬<div style={{ fontSize: 10, marginTop: 4 }}>Chat MoD</div></button>
      </div>
    </>
  );
}

/* ─── Schedule ────────────────────────────────────────────────────────── */
function ScheduleView() {
  const [rows, setRows] = React.useState<any[]>([]);
  React.useEffect(() => {
    fetch(`${API}/api/myecho/schedule`, { headers: USER_HEADER }).then(r => r.json())
      .then(d => setRows(d.rows || []));
  }, []);
  return (
    <div data-testid="myecho-schedule">
      <Eyebrow>NEXT 14 DAYS</Eyebrow>
      {rows.map((s) => (
        <div key={s.date} data-testid={`shift-${s.date}`} style={{
          padding: 14, borderRadius: 8, marginBottom: 8,
          background: s.status === "off" ? "rgba(255,255,255,0.02)" : C.surface,
          border: `1px solid ${s.status === "off" ? "transparent" : C.border}`,
          opacity: s.status === "off" ? 0.5 : 1,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{ minWidth: 50, textAlign: "center" }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: C.dim }}>{s.weekday.toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: C.text }}>
              {new Date(s.date).getDate()}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            {s.status === "off" ? (
              <div style={{ fontSize: 12, color: C.dim }}>OFF</div>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.start} – {s.end}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{s.outlet} · {s.shift}</div>
              </>
            )}
          </div>
          <div style={{ fontSize: 10, color: C.accent }}>{s.hours ? `${s.hours}h` : ""}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── PTO ─────────────────────────────────────────────────────────────── */
function PtoView() {
  const [bal, setBal] = React.useState<any>(null);
  const [reqs, setReqs] = React.useState<any[]>([]);
  const [form, setForm] = React.useState({ start_date: "", end_date: "", type: "vacation", note: "" });
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  function load() {
    fetch(`${API}/api/myecho/pto-balance`, { headers: USER_HEADER }).then(r => r.json()).then(setBal);
    fetch(`${API}/api/myecho/pto-requests`, { headers: USER_HEADER }).then(r => r.json()).then(d => setReqs(d.rows || []));
  }
  React.useEffect(load, []);

  async function submit() {
    if (!form.start_date || !form.end_date) { setMsg("Pick dates first"); return; }
    setBusy(true); setMsg("");
    const r = await fetch(`${API}/api/myecho/pto-request`, {
      method: "POST", headers: { ...USER_HEADER, "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await r.json();
    setBusy(false);
    if (r.ok) {
      setMsg(j.message || "Submitted ✓");
      setForm({ start_date: "", end_date: "", type: "vacation", note: "" });
      load();
    } else { setMsg("Error: " + (j.detail || "try again")); }
  }

  return (
    <div data-testid="myecho-pto">
      {bal && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
          <Kpi label="Vacation" value={`${bal.vacation_hours_remaining}h`} />
          <Kpi label="Sick" value={`${bal.sick_hours_remaining}h`} />
          <Kpi label="Personal" value={`${bal.personal_hours_remaining}h`} />
        </div>
      )}
      <Eyebrow>REQUEST TIME OFF</Eyebrow>
      <div style={{ padding: 14, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <Row>
          <Field label="Start"><input data-testid="pto-start" type="date"
            value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
            style={inputStyle} /></Field>
          <Field label="End"><input data-testid="pto-end" type="date"
            value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
            style={inputStyle} /></Field>
        </Row>
        <Field label="Type">
          <select data-testid="pto-type" value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })} style={inputStyle}>
            <option value="vacation">Vacation</option>
            <option value="sick">Sick</option>
            <option value="personal">Personal</option>
            <option value="bereavement">Bereavement</option>
          </select>
        </Field>
        <Field label="Note (optional)">
          <textarea data-testid="pto-note" rows={2} value={form.note}
            onChange={e => setForm({ ...form, note: e.target.value })}
            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
            placeholder="Anything your manager should know" />
        </Field>
        <button data-testid="pto-submit" onClick={submit} disabled={busy}
          style={{ ...primaryBtn, marginTop: 8, width: "100%" }}>
          {busy ? "Submitting…" : "📤 Submit request"}
        </button>
        {msg && <div style={{ marginTop: 8, fontSize: 11, color: C.accent }}>{msg}</div>}
      </div>
      <Eyebrow>MY REQUESTS ({reqs.length})</Eyebrow>
      {reqs.length === 0 && <Empty>No requests yet.</Empty>}
      {reqs.map((r) => (
        <div key={r.id} data-testid={`pto-req-${r.id}`} style={{
          padding: 12, borderRadius: 8, marginBottom: 6, background: C.surface,
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {fmtDate(r.start_date)} → {fmtDate(r.end_date)}
              </div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>
                {r.type} · submitted {fmtDate(r.submitted_at)}
              </div>
            </div>
            <span style={{
              fontSize: 9, padding: "3px 8px", borderRadius: 999,
              background: r.status === "approved" ? "rgba(16,185,129,0.18)"
                          : r.status === "denied" ? "rgba(239,68,68,0.18)"
                          : "rgba(245,158,11,0.18)",
              color: r.status === "approved" ? C.ok
                      : r.status === "denied" ? C.err : C.warn,
              textTransform: "uppercase", letterSpacing: 1, fontWeight: 700,
            }}>{r.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Pay / paystubs ──────────────────────────────────────────────────── */
function PayView() {
  const [data, setData] = React.useState<any>(null);
  React.useEffect(() => {
    fetch(`${API}/api/myecho/paystubs`, { headers: USER_HEADER }).then(r => r.json()).then(setData);
  }, []);
  if (!data) return <Loading />;
  return (
    <div data-testid="myecho-pay">
      <Eyebrow>YEAR TO DATE</Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 16 }}>
        <Kpi label="Gross YTD" value={`$${data.ytd.gross.toLocaleString()}`} />
        <Kpi label="Net YTD" value={`$${data.ytd.net.toLocaleString()}`} accent={C.accent} />
        <Kpi label="Tips YTD" value={`$${data.ytd.tips.toLocaleString()}`} />
        <Kpi label="Tax YTD" value={`$${data.ytd.taxes.toLocaleString()}`} />
      </div>
      <Eyebrow>PAYCHECKS</Eyebrow>
      {data.rows.map((p: any) => (
        <div key={p.id} data-testid={`pay-${p.id}`} style={{
          padding: 14, borderRadius: 8, marginBottom: 6, background: C.surface,
          border: `1px solid ${C.border}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 11, color: C.dim }}>
                {fmtDate(p.period_start)} – {fmtDate(p.period_end)}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: C.accent, marginTop: 2 }}>
                ${p.net.toLocaleString()}
              </div>
            </div>
            <a href={p.pdf_url} data-testid={`pay-pdf-${p.id}`} target="_blank" rel="noreferrer"
              style={{ ...ghostBtn, textDecoration: "none" }}>📄 PDF</a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, fontSize: 9, color: C.dim }}>
            <div>Reg: <strong style={{ color: C.text }}>{p.regular_hours}h</strong></div>
            <div>OT: <strong style={{ color: C.text }}>{p.ot_hours}h</strong></div>
            <div>Tips: <strong style={{ color: C.text }}>${p.tips}</strong></div>
            <div>Tax: <strong style={{ color: C.text }}>${p.taxes}</strong></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Tax docs ────────────────────────────────────────────────────────── */
function DocsView() {
  const [docs, setDocs] = React.useState<any[]>([]);
  const [dd, setDd] = React.useState<any>(null);
  React.useEffect(() => {
    fetch(`${API}/api/myecho/tax-docs`, { headers: USER_HEADER }).then(r => r.json()).then(d => setDocs(d.rows || []));
    fetch(`${API}/api/myecho/direct-deposit`, { headers: USER_HEADER }).then(r => r.json()).then(setDd);
  }, []);
  return (
    <div data-testid="myecho-docs">
      {dd && (
        <>
          <Eyebrow>DIRECT DEPOSIT</Eyebrow>
          <div style={{ padding: 14, borderRadius: 8, background: C.surface,
                          border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{dd.bank_name_masked}</div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>
              {dd.type} · ending in ••{dd.account_last4} · 100% of pay
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 8, fontStyle: "italic" }}>
              {dd._note}
            </div>
          </div>
        </>
      )}
      <Eyebrow>TAX DOCUMENTS</Eyebrow>
      {docs.map((d: any) => (
        <a key={d.id} href={d.url} target="_blank" rel="noreferrer"
          data-testid={`doc-${d.id}`} style={{
            display: "flex", alignItems: "center", gap: 12, padding: 14,
            borderRadius: 8, marginBottom: 6, background: C.surface,
            border: `1px solid ${C.border}`, textDecoration: "none", color: C.text,
          }}>
          <div style={{ fontSize: 22 }}>📄</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{d.title}</div>
            <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>
              {d.type} · {d.year} · issued {fmtDate(d.issued_date)}
            </div>
          </div>
          <div style={{ color: C.accent, fontSize: 11 }}>↓</div>
        </a>
      ))}
    </div>
  );
}

/* ─── Concierge ───────────────────────────────────────────────────────── */
function ConciergeView() {
  const [actions, setActions] = React.useState<any[]>([]);
  React.useEffect(() => {
    fetch(`${API}/api/myecho/concierge-quick-actions`).then(r => r.json())
      .then(d => setActions(d.actions || []));
  }, []);
  return (
    <div data-testid="myecho-concierge">
      <div style={{ padding: 14, borderRadius: 10, background: C.surface,
                      border: `1px solid ${C.accent}55`, marginBottom: 14 }}>
        <div style={{ fontSize: 22, marginBottom: 4 }}>🛎</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>What can we help with?</div>
        <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>
          Tap an option below — we'll route to the right person and notify you when it's done.
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {actions.map(a => (
          <button key={a.id} data-testid={`concierge-${a.id}`} onClick={() => {
            window.location.href = `/m/ecw?launch=concierge&seed=${encodeURIComponent(a.prompt_seed || a.label)}`;
          }} style={{
            padding: 14, borderRadius: 8, background: C.surface,
            border: `1px solid ${C.border}`, color: C.text, fontFamily: "inherit",
            textAlign: "left", cursor: "pointer",
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{a.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>{a.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Bottom tabs ─────────────────────────────────────────────────────── */
function NotificationsBell() {
  const [unread, setUnread] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState<any[]>([]);

  const load = React.useCallback(() => {
    fetch(`${API}/api/myecho/notifications`, { headers: USER_HEADER })
      .then(r => r.json()).then(d => {
        setUnread(d.unread_count || 0); setRows(d.rows || []);
      });
  }, []);
  React.useEffect(() => { load(); const t = setInterval(load, 25_000); return () => clearInterval(t); }, [load]);

  async function markRead(id: string) {
    await fetch(`${API}/api/myecho/notifications/${id}/read`, { method: "POST", headers: USER_HEADER });
    load();
  }
  return (
    <>
      <button data-testid="myecho-bell" onClick={() => setOpen(true)} style={{
        position: "fixed", top: "calc(env(safe-area-inset-top, 0px) + 14px)", right: 14, zIndex: 99,
        background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
        borderRadius: 999, padding: "6px 10px", color: C.text, fontFamily: "inherit",
        fontSize: 14, cursor: "pointer",
      }}>
        🔔
        {unread > 0 && <span data-testid="myecho-bell-unread" style={{
          marginLeft: 4, fontSize: 10, padding: "1px 6px", borderRadius: 999,
          background: C.err, color: "#fff", fontWeight: 700,
        }}>{unread}</span>}
      </button>
      {open && (
        <div data-testid="myecho-notif-drawer" style={{
          position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(10px)",
        }} onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            position: "absolute", top: 0, right: 0, bottom: 0, width: "min(440px, 95%)",
            background: C.bg, padding: 18, overflowY: "auto", borderLeft: `1px solid ${C.border}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <Eyebrow>NOTIFICATIONS</Eyebrow>
              <button onClick={() => setOpen(false)} style={{ background: "transparent",
                border: 0, color: C.dim, cursor: "pointer", fontSize: 18 }}>×</button>
            </div>
            {rows.length === 0 && <Empty>You're all caught up.</Empty>}
            {rows.map(n => (
              <div key={n.id} data-testid={`notif-${n.id}`}
                onClick={() => !n.read && markRead(n.id)}
                style={{
                  padding: 12, borderRadius: 8, marginBottom: 6,
                  background: n.read ? "rgba(255,255,255,0.02)" : C.surface,
                  border: `1px solid ${n.read ? "transparent" : C.border}`,
                  borderLeft: `3px solid ${n.kind?.includes("approved") ? C.ok :
                                                       n.kind?.includes("denied") ? C.err : C.accent}`,
                  cursor: "pointer", opacity: n.read ? 0.6 : 1,
                }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{n.body}</div>
                <div style={{ fontSize: 9, color: C.muted, marginTop: 6 }}>{fmtDate(n.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Shift Swap ──────────────────────────────────────────────────────── */
function ShiftSwapView() {
  const [coworkers, setCoworkers] = React.useState<any[]>([]);
  const [mine, setMine] = React.useState<any[]>([]);
  const [form, setForm] = React.useState({ shift_date: "", cover_id: "", note: "" });
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<any[]>([]);
  const [findingCoverage, setFindingCoverage] = React.useState(false);

  function load() {
    fetch(`${API}/api/myecho/coworkers`, { headers: USER_HEADER }).then(r => r.json()).then(d => setCoworkers(d.rows || []));
    fetch(`${API}/api/myecho/shift-swap/mine`, { headers: USER_HEADER }).then(r => r.json()).then(d => setMine(d.rows || []));
  }
  React.useEffect(load, []);

  async function findCoverage() {
    if (!form.shift_date) { setMsg("Pick a date first"); return; }
    setFindingCoverage(true); setSuggestions([]);
    const r = await fetch(`${API}/api/myecho/shift-swap/suggest-coverage`, {
      method: "POST", headers: { ...USER_HEADER, "Content-Type": "application/json" },
      body: JSON.stringify({ shift_date: form.shift_date }),
    });
    const j = await r.json();
    setFindingCoverage(false);
    setSuggestions(j.candidates || []);
  }

  async function submit() {
    if (!form.shift_date || !form.cover_id) { setMsg("Pick a date and coworker"); return; }
    setBusy(true);
    const cover = coworkers.find(c => c.id === form.cover_id) ||
                       suggestions.find((c: any) => c.id === form.cover_id);
    const r = await fetch(`${API}/api/myecho/shift-swap/request`, {
      method: "POST", headers: { ...USER_HEADER, "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, cover_name: cover?.name }),
    });
    const j = await r.json();
    setBusy(false);
    if (r.ok) {
      setMsg(j.message || "Submitted ✓");
      setForm({ shift_date: "", cover_id: "", note: "" });
      setSuggestions([]);
      load();
    } else { setMsg("Error — try again"); }
  }

  return (
    <div data-testid="myecho-swap">
      <div style={{ padding: 12, marginBottom: 14, fontSize: 11, color: C.warn,
                      background: "rgba(245,158,11,0.06)",
                      border: `1px solid ${C.warn}55`, borderRadius: 6 }}>
        ⚠ Swaps are NOT confirmed until your manager approves. You'll get a 🔔 when decided.
      </div>
      <Eyebrow>REQUEST SHIFT SWAP</Eyebrow>
      <div style={{ padding: 14, borderRadius: 8, background: C.surface,
                      border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <Field label="Shift date">
          <input data-testid="swap-date" type="date" value={form.shift_date}
            onChange={e => setForm({ ...form, shift_date: e.target.value })} style={inputStyle} />
        </Field>

        {/* AI Coverage Finder — pick a top-3 ranked candidate or use full dropdown */}
        <button data-testid="swap-suggest-coverage" type="button"
          onClick={findCoverage} disabled={findingCoverage || !form.shift_date}
          style={{
            ...primaryBtn, padding: "10px 14px", fontSize: 11,
            background: "rgba(212,175,55,0.06)", marginBottom: 10, width: "100%",
          }}>
          {findingCoverage ? "Analyzing…" : "✨ AI · Find best coverage"}
        </button>

        {suggestions.length > 0 && (
          <div data-testid="swap-suggestions" style={{
            marginBottom: 10, padding: 10, borderRadius: 6,
            background: "rgba(212,175,55,0.04)",
            border: `1px solid ${C.accent}33`,
          }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: C.accent,
                            fontWeight: 700, marginBottom: 6 }}>RANKED CANDIDATES</div>
            {suggestions.map((s: any, i: number) => (
              <button key={s.id} data-testid={`swap-suggest-${i}`}
                onClick={() => setForm({ ...form, cover_id: s.id })}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "8px 10px", marginBottom: 4, borderRadius: 6,
                  background: form.cover_id === s.id ? "rgba(212,175,55,0.14)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${form.cover_id === s.id ? C.accent : C.border}`,
                  color: C.text, cursor: "pointer", fontFamily: "inherit",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {s.name}
                  </span>
                  <span style={{ fontSize: 10, color: C.accent, fontWeight: 700 }}>
                    {s.score}/100
                  </span>
                </div>
                <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>
                  {s.title} · {s.reason}
                </div>
              </button>
            ))}
          </div>
        )}

        <Field label="Or pick from full list">
          <select data-testid="swap-cover" value={form.cover_id}
            onChange={e => setForm({ ...form, cover_id: e.target.value })} style={inputStyle}>
            <option value="">— pick —</option>
            {coworkers.map(c => (
              <option key={c.id} value={c.id}>{c.name} · {c.title}</option>
            ))}
          </select>
        </Field>
        <Field label="Note (optional)">
          <textarea data-testid="swap-note" rows={2} value={form.note}
            onChange={e => setForm({ ...form, note: e.target.value })}
            style={{ ...inputStyle, minHeight: 56, resize: "vertical" }}
            placeholder="Why? (helps the manager decide quickly)" />
        </Field>
        <button data-testid="swap-submit" onClick={submit} disabled={busy}
          style={{ ...primaryBtn, marginTop: 8, width: "100%" }}>
          {busy ? "Submitting…" : "📤 Submit for manager approval"}
        </button>
        {msg && <div style={{ marginTop: 8, fontSize: 11, color: C.accent }}>{msg}</div>}
      </div>
      <Eyebrow>MY SWAPS</Eyebrow>
      {mine.length === 0 && <Empty>No swaps yet.</Empty>}
      {mine.map(s => (
        <div key={s.id} data-testid={`swap-row-${s.id}`} style={{
          padding: 12, borderRadius: 8, marginBottom: 6, background: C.surface,
          border: `1px solid ${C.border}`,
        }}>
          <Row>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {fmtDate(s.shift_date)}
            </span>
            <span style={{ marginLeft: 8, fontSize: 12, color: C.dim }}>
              → {s.cover_name || s.cover_id}
            </span>
          </Row>
          <div style={{ marginTop: 6 }}>
            <span style={{
              fontSize: 9, padding: "3px 8px", borderRadius: 999, fontWeight: 700,
              letterSpacing: 1, textTransform: "uppercase",
              background: s.status === "approved" ? "rgba(16,185,129,0.18)"
                          : s.status === "denied" ? "rgba(239,68,68,0.18)"
                          : "rgba(245,158,11,0.18)",
              color: s.status === "approved" ? C.ok
                      : s.status === "denied" ? C.err : C.warn,
            }}>{s.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Call-Out ────────────────────────────────────────────────────────── */
function CallOutView() {
  const [policy, setPolicy] = React.useState<any>(null);
  const [form, setForm] = React.useState({
    shift_date: new Date().toISOString().slice(0, 10),
    shift_start: "11:00", reason: "sick", note: "",
  });
  const [mine, setMine] = React.useState<any[]>([]);
  const [msg, setMsg] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  function load() {
    fetch(`${API}/api/myecho/callout-policy`, { headers: USER_HEADER }).then(r => r.json()).then(setPolicy);
    fetch(`${API}/api/myecho/callout/mine`, { headers: USER_HEADER }).then(r => r.json()).then(d => setMine(d.rows || []));
  }
  React.useEffect(load, []);

  async function submit() {
    setBusy(true); setMsg("");
    const r = await fetch(`${API}/api/myecho/callout/request`, {
      method: "POST", headers: { ...USER_HEADER, "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await r.json();
    setBusy(false);
    if (r.ok) {
      setMsg(j.message || "Submitted ✓");
      setForm({ ...form, note: "" });
      load();
    } else {
      // Phone-call required path
      const detail = j.detail || {};
      setMsg(detail.message || "Please call your manager directly.");
    }
  }

  if (!policy) return <Loading />;

  // Phone-call only path
  if (!policy.allow_mobile_callout) {
    return (
      <div data-testid="myecho-callout">
        <div style={{ padding: 18, borderRadius: 10, background: "rgba(239,68,68,0.06)",
                        border: `1px solid ${C.err}55`, marginBottom: 14 }}>
          <div style={{ fontSize: 22, marginBottom: 6 }}>📞</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Phone call required</div>
          <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>
            HR policy requires call-outs to be made by phone — no exceptions via app.
            Call your manager-on-duty directly:
          </div>
        </div>
        <a href={`tel:${policy.manager_phone}`} data-testid="callout-tap-to-call"
          style={{
            display: "block", textAlign: "center", padding: "16px 22px",
            borderRadius: 10, fontSize: 16, fontWeight: 700,
            background: `${C.accent}1a`, color: C.accent,
            border: `1px solid ${C.accent}88`, textDecoration: "none",
            letterSpacing: 1, marginBottom: 12,
          }}>📞 CALL {policy.manager_name}<br/>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{policy.manager_phone}</span>
        </a>
        <Eyebrow>RECENT CALL-OUTS</Eyebrow>
        {mine.length === 0 && <Empty>No call-outs in record.</Empty>}
        {mine.map(c => <CalloutRow key={c.id} c={c} />)}
      </div>
    );
  }

  // Mobile call-out enabled
  return (
    <div data-testid="myecho-callout">
      <div style={{ padding: 12, marginBottom: 14, fontSize: 11, color: C.warn,
                      background: "rgba(245,158,11,0.06)",
                      border: `1px solid ${C.warn}55`, borderRadius: 6 }}>
        ⚠ Mobile call-outs accepted. Minimum {policy.min_hours_before_shift}hr before shift —
        otherwise you must phone {policy.manager_name}.
        {policy.require_phone_call_after_callout &&
          <><br/>HR policy: please ALSO phone your manager after submitting.</>}
      </div>
      <Eyebrow>SUBMIT CALL-OUT</Eyebrow>
      <div style={{ padding: 14, borderRadius: 8, background: C.surface,
                      border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <Row>
          <Field label="Date"><input data-testid="callout-date" type="date"
            value={form.shift_date}
            onChange={e => setForm({ ...form, shift_date: e.target.value })}
            style={inputStyle} /></Field>
          <Field label="Shift start"><input data-testid="callout-start" type="time"
            value={form.shift_start}
            onChange={e => setForm({ ...form, shift_start: e.target.value })}
            style={inputStyle} /></Field>
        </Row>
        <Field label="Reason">
          <select data-testid="callout-reason" value={form.reason}
            onChange={e => setForm({ ...form, reason: e.target.value })} style={inputStyle}>
            <option value="sick">Sick</option>
            <option value="family">Family emergency</option>
            <option value="personal">Personal</option>
          </select>
        </Field>
        <Field label="Note (optional)">
          <textarea data-testid="callout-note" rows={2} value={form.note}
            onChange={e => setForm({ ...form, note: e.target.value })}
            style={{ ...inputStyle, minHeight: 56, resize: "vertical" }}
            placeholder="Anything your manager should know" />
        </Field>
        <button data-testid="callout-submit" onClick={submit} disabled={busy}
          style={{ ...primaryBtn, marginTop: 8, width: "100%" }}>
          {busy ? "Submitting…" : "📤 Submit call-out"}
        </button>
        {msg && <div style={{ marginTop: 8, fontSize: 11, color: C.accent }}>{msg}</div>}
        <a href={`tel:${policy.manager_phone}`} data-testid="callout-also-call"
          style={{ display: "block", textAlign: "center", marginTop: 10,
                      padding: "8px 14px", fontSize: 11, color: C.dim,
                      textDecoration: "underline" }}>
          Or tap to call {policy.manager_name} ({policy.manager_phone})
        </a>
      </div>
      <Eyebrow>RECENT CALL-OUTS</Eyebrow>
      {mine.length === 0 && <Empty>No call-outs in record.</Empty>}
      {mine.map(c => <CalloutRow key={c.id} c={c} />)}
    </div>
  );
}

function CalloutRow({ c }: { c: any }) {
  return (
    <div data-testid={`callout-row-${c.id}`} style={{
      padding: 12, borderRadius: 8, marginBottom: 6, background: C.surface,
      border: `1px solid ${C.border}`,
    }}>
      <Row>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(c.shift_date)}</span>
        <span style={{ marginLeft: 8, fontSize: 11, color: C.dim }}>· {c.reason}</span>
      </Row>
      <div style={{ marginTop: 6 }}>
        <span style={{
          fontSize: 9, padding: "3px 8px", borderRadius: 999, fontWeight: 700,
          letterSpacing: 1, textTransform: "uppercase",
          background: c.status === "acknowledged" ? "rgba(16,185,129,0.18)" : "rgba(245,158,11,0.18)",
          color: c.status === "acknowledged" ? C.ok : C.warn,
        }}>{c.status}</span>
      </div>
    </div>
  );
}

/* ─── MoD Chat ────────────────────────────────────────────────────────── */
function ModChatView() {
  const [outletId] = React.useState("out-coastal-kitchen");
  const [msgs, setMsgs] = React.useState<any[]>([]);
  const [text, setText] = React.useState("");
  const meId = (USER_HEADER as any)["X-User-Id"];

  const load = React.useCallback(() => {
    fetch(`${API}/api/myecho/mod-chat/messages?outlet_id=${outletId}`, { headers: USER_HEADER })
      .then(r => r.json()).then(d => setMsgs(d.rows || []));
  }, [outletId]);
  React.useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  async function send() {
    if (!text.trim()) return;
    await fetch(`${API}/api/myecho/mod-chat/post`, {
      method: "POST", headers: { ...USER_HEADER, "Content-Type": "application/json" },
      body: JSON.stringify({ text, outlet_id: outletId }),
    });
    setText(""); load();
  }
  return (
    <div data-testid="myecho-modchat" style={{ display: "flex", flexDirection: "column",
                                                                 height: "calc(100vh - 200px)" }}>
      <div style={{ padding: 10, fontSize: 11, color: C.dim, background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${C.border}`, borderRadius: 6, marginBottom: 10 }}>
        💬 Real-time chat with your manager-on-duty. Like WhatsApp — direct, fast.
      </div>
      <div data-testid="myecho-modchat-feed" style={{
        flex: 1, overflowY: "auto", padding: 10, background: "rgba(0,0,0,0.3)",
        borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 10,
      }}>
        {msgs.length === 0 && <Empty>Say hi to your manager.</Empty>}
        {msgs.map(m => {
          const me = m.author_id === meId;
          return (
            <div key={m.id} style={{
              display: "flex", justifyContent: me ? "flex-end" : "flex-start", marginBottom: 6,
            }}>
              <div style={{
                maxWidth: "75%", padding: "8px 12px", borderRadius: 14,
                background: me ? `${C.accent}22` : "rgba(255,255,255,0.06)",
                border: `1px solid ${me ? `${C.accent}55` : C.border}`, color: C.text,
              }}>
                {!me && <div style={{ fontSize: 9, color: C.accent, fontWeight: 700, marginBottom: 2 }}>
                  {m.author_name}</div>}
                <div style={{ fontSize: 13 }}>{m.text}</div>
                <div style={{ fontSize: 9, color: C.muted, marginTop: 4, textAlign: "right" }}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input data-testid="myecho-modchat-input" value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") send(); }}
          placeholder="Message manager…" style={{ ...inputStyle, flex: 1 }} />
        <button data-testid="myecho-modchat-send" onClick={send} style={primaryBtn}>SEND</button>
      </div>
    </div>
  );
}

/* ─── Bottom tabs ─────────────────────────────────────────────────────── */
function BottomTabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const TABS: [Tab, string, string][] = [
    ["home", "🏠", "Home"], ["schedule", "📅", "Sched"],
    ["swap", "🔄", "Swap"], ["callout", "🤒", "Call-out"],
    ["chat", "💬", "Chat"], ["pto", "🏖", "PTO"],
    ["pay", "💵", "Pay"], ["docs", "📄", "Docs"],
    ["concierge", "🛎", "Help"],
  ];
  return (
    <nav data-testid="myecho-tabbar" style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "rgba(3,30,22,0.95)", backdropFilter: "blur(14px)",
      borderTop: `1px solid ${C.border}`,
      padding: "8px 4px env(safe-area-inset-bottom, 8px)",
      display: "flex", overflowX: "auto", zIndex: 100,
      scrollbarWidth: "none" as any,
    }}>
      <style>{`[data-testid='myecho-tabbar']::-webkit-scrollbar{display:none;}`}</style>
      {TABS.map(([k, icon, label]) => (
        <button key={k} data-testid={`myecho-tab-${k}`} onClick={() => setTab(k)} style={{
          flex: "1 0 auto", minWidth: 56, padding: "8px 6px",
          background: "transparent", border: 0,
          color: tab === k ? C.accent : C.dim, fontFamily: "inherit", cursor: "pointer",
        }}>
          <div style={{ fontSize: 18 }}>{icon}</div>
          <div style={{ fontSize: 9, letterSpacing: 0.5, marginTop: 2, fontWeight: tab === k ? 700 : 500 }}>{label}</div>
        </button>
      ))}
    </nav>
  );
}

/* ─── primitives ──────────────────────────────────────────────────────── */
function Tile({ children, onClick, testid }: { children: React.ReactNode; onClick?: () => void; testid?: string }) {
  return (
    <button data-testid={testid} onClick={onClick} style={{
      width: "100%", padding: 16, borderRadius: 10, marginTop: 10,
      background: C.surface, border: `1px solid ${C.border}`,
      textAlign: "left", cursor: onClick ? "pointer" : "default",
      color: C.text, fontFamily: "inherit",
    }}>{children}</button>
  );
}
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9, letterSpacing: 3, color: C.accent, fontWeight: 700, margin: "16px 0 8px" }}>{children}</div>;
}
function Big({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 22, fontWeight: 600, color: C.text, margin: "4px 0" }}>{children}</div>;
}
function Sub({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: C.dim }}>{children}</div>;
}
function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: accent || C.text }}>{value}</div>
      <div style={{ fontSize: 9, letterSpacing: 1, color: C.dim, textTransform: "uppercase", marginTop: 2 }}>{label}</div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 20, textAlign: "center", color: C.muted, fontStyle: "italic", fontSize: 12 }}>{children}</div>;
}
function Loading() {
  return <div style={{ padding: 30, textAlign: "center", color: C.dim }}>Loading…</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8, flex: 1 }}>
      <div style={{ fontSize: 9, letterSpacing: 1, color: C.dim, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 8 }}>{children}</div>;
}
function fmtDate(s: string) {
  if (!s) return "";
  try { return new Date(s).toLocaleDateString([], { month: "short", day: "numeric" }); }
  catch { return s; }
}
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 6,
  background: "rgba(0,0,0,0.4)", border: `1px solid ${C.border}`,
  color: C.text, fontFamily: "inherit", fontSize: 13,
};
const primaryBtn: React.CSSProperties = {
  padding: "12px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700,
  background: `${C.accent}1a`, border: `1px solid ${C.accent}66`,
  color: C.accent, cursor: "pointer", letterSpacing: 1,
};
const ghostBtn: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600,
  background: "transparent", color: C.dim,
  border: `1px solid ${C.border}`, cursor: "pointer",
};
const quickBtnStyle: React.CSSProperties = {
  padding: 14, borderRadius: 8, background: C.surface,
  border: `1px solid ${C.border}`, color: C.text,
  fontSize: 22, fontFamily: "inherit", textAlign: "center",
  cursor: "pointer",
};
