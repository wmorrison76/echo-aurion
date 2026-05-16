/**
 * Echo AURION · Admin Console (iter263)
 *
 * Single panel for platform administrators. Tabs:
 *   Pulse · Users · Updates · Installers · IT · Audit · Flags · Tech Support
 *
 * All data comes from /api/admin-console/* — see backend/routes/admin_console.py.
 * Styling uses CSS variables from aurion-theme-bridge so light/dark tracks the
 * global toggle automatically.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, Users as UsersIcon, Download, Server, Shield, Flag, LifeBuoy,
  RefreshCw, CheckCircle2, AlertTriangle, XCircle, Circle, GitBranch,
  Smartphone, Laptop, Monitor, ArrowUpCircle, Send, Wifi, WifiOff,
  CircleDot, Cpu, Search, Sparkles, Building2,
} from "lucide-react";
import { getAndClearModuleTab } from "@/lib/module-tab-manager";

const API = window.location.origin;

type Pulse = {
  uptime_human: string; active_users_15m: number; total_users: number;
  admin_users: number; recent_errors_24h: number;
  collections_top: { name: string; count: number }[];
  panels_loaded_today: number; version: string; environment: string;
  generated_at: string;
};

type IntegrationsResp = {
  items: { id: string; name: string; status: "ok" | "missing" | "partial" | "down"; note: string }[];
  healthy: number; total: number;
};

type UpdatesResp = {
  current_version: string; latest_version: string; channel: string;
  update_available: boolean; channels_available: string[];
  changelog: { version: string; date: string; summary: string; changes: string[] }[];
  rollout: { target_version: string; percent_rolled_out: number; status: string; started_at: string | null };
};

type InstallersResp = {
  pwa: { url: string; note: string };
  desktop: { os: string; arch: string; artifact: string; download_url: string; size_mb: number }[];
  mobile: { os: string; channel: string; url: string; note: string; size_mb?: number }[];
  mdm: { profile_url: string; note: string };
};

type AuditResp = { events: { ts: string; actor: string; action: string; detail: string; severity: string }[] };
type FlagsResp = { flags: { id: string; label: string; enabled: boolean; scope: string; description: string }[] };

const TABS = [
  { id: "pulse",      label: "Platform Pulse",    icon: Activity },
  { id: "users",      label: "Users & Onboarding", icon: UsersIcon },
  { id: "updates",    label: "System Updates",    icon: GitBranch },
  { id: "installers", label: "Desktop Installers", icon: Download },
  { id: "it",         label: "IT & Integrations", icon: Server },
  { id: "audit",      label: "Audit & Security",  icon: Shield },
  { id: "flags",      label: "Feature Flags",     icon: Flag },
  { id: "support",    label: "Tech Support",      icon: LifeBuoy },
] as const;

export default function AdminConsole() {
  // iter266 · Read the requested tab once on mount, so the sidebar can open
  // any sub-item and land on the right tab.
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>(() => {
    const requested = getAndClearModuleTab("admin-console");
    const valid = TABS.find((t) => t.id === requested);
    return (valid?.id ?? "pulse") as (typeof TABS)[number]["id"];
  });

  // Listen for sidebar re-clicks while panel is already mounted.
  useEffect(() => {
    const onTabChange = (e: Event) => {
      const detail = (e as CustomEvent<{ moduleName: string; tab: string }>).detail;
      if (detail?.moduleName !== "admin-console") return;
      const valid = TABS.find((t) => t.id === detail.tab);
      if (valid) setTab(valid.id as (typeof TABS)[number]["id"]);
    };
    window.addEventListener("module-tab:set", onTabChange as EventListener);
    return () => window.removeEventListener("module-tab:set", onTabChange as EventListener);
  }, []);
  return (
    <div
      data-testid="admin-console"
      style={{
        minHeight: "100%",
        background: "var(--aurion-panel-bg, #0a0e17)",
        color: "var(--aurion-text-primary, #e2e8f0)",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
      }}
    >
      <Header />
      <TabBar tab={tab} onChange={setTab} />
      <div style={{ padding: "18px 28px 48px" }}>
        {tab === "pulse" && <PulseTab />}
        {tab === "users" && <UsersTab />}
        {tab === "updates" && <UpdatesTab />}
        {tab === "installers" && <InstallersTab />}
        {tab === "it" && <ITTab />}
        {tab === "audit" && <AuditTab />}
        {tab === "flags" && <FlagsTab />}
        {tab === "support" && <SupportTab />}
      </div>
    </div>
  );
}

// ═══════════════ Header + Tabs ═══════════════

function Header() {
  return (
    <div
      style={{
        padding: "20px 28px 12px",
        borderBottom: "1px solid var(--aurion-border, rgba(255,255,255,0.06))",
        background: "linear-gradient(180deg, rgba(99,102,241,0.04), transparent)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 0.2, margin: 0 }}>
          Echo AURION · Tenant Admin Dashboard
        </h1>
        <span style={{
          fontSize: 10, color: "var(--aurion-accent)", letterSpacing: 1.4, textTransform: "uppercase",
          padding: "3px 8px", border: "1px solid var(--aurion-accent)", borderRadius: 4,
        }}>
          IT · Platform Ops
        </span>
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: "var(--aurion-text-secondary)" }}>
        Full visibility into who is running the platform, what it's doing, and how to keep it healthy.
        Real wires · no mocks · live across {`<NUM_OUTLETS/>`.replace(/.*/, "the property")}.
      </div>
    </div>
  );
}

function TabBar({ tab, onChange }: { tab: string; onChange: (id: any) => void }) {
  return (
    <div
      data-testid="admin-console-tabs"
      style={{
        display: "flex", gap: 2, padding: "0 28px",
        borderBottom: "1px solid var(--aurion-border)",
        overflowX: "auto",
      }}
    >
      {TABS.map(t => {
        const active = t.id === tab;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            data-testid={`admin-tab-${t.id}`}
            onClick={() => onChange(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 16px", border: "none", background: "transparent",
              color: active ? "var(--aurion-accent)" : "var(--aurion-text-secondary)",
              borderBottom: `2px solid ${active ? "var(--aurion-accent)" : "transparent"}`,
              fontSize: 13, fontWeight: active ? 600 : 500, cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Icon size={14} /> {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════ Platform Pulse · iter266.6 Tenant Admin Dashboard MVP ═══════════════
// IT Department Overview surface per the build brief:
//   - 6-tile KPI strip (Outlets Reporting, Active Users, Critical Alerts,
//     Network Sync, Echo AI³ Latency, Subscription)
//   - Echo AI³ command bar (ask Echo AURION anything; canned + LLM fallback)
//   - Outlet Status Table with feed (POS/KDS/Printer) health pills
//   - Live Events Stream (audit + integration sync)
// All wired to /api/admin-console/overview + /api/admin-console/echo-query.

type OverviewKpi = { id: string; label: string; value: string; tone: "ok" | "warn" | "down"; sublabel: string };
type OverviewOutlet = {
  id: string; name: string; property_id: string; status: "ok" | "warn" | "down";
  last_seen: string | null; open_alerts: number;
  feeds: { pos: string; kds: string; printer: string };
};
type OverviewEvent = { ts: string; actor?: string; action: string; detail?: string; severity?: string };
type OverviewResp = {
  generated_at: string;
  kpis: OverviewKpi[];
  outlets: OverviewOutlet[];
  events: OverviewEvent[];
  totals: { outlets: number; reporting: number; active_users: number; critical_alerts: number; p95_ai_latency_ms: number };
};

function PulseTab() {
  const [data, setData] = useState<OverviewResp | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/admin-console/overview`);
      setData(await r.json());
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);

  if (loading) return <Loading />;
  if (!data) return <Empty msg="Overview unavailable" />;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Echo AI³ command bar */}
      <EchoCommandBar />

      {/* KPI strip — 6 tiles */}
      <div data-testid="admin-overview-kpi-strip"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {data.kpis.map(k => <KpiTile key={k.id} kpi={k} />)}
      </div>

      {/* Outlet status table + live events stream side-by-side */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 18 }}>
        <OutletStatusTable rows={data.outlets} />
        <LiveEventsStream events={data.events} />
      </div>

      {/* Footer: refresh + generated_at */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4,
        fontSize: 11, color: "var(--aurion-text-muted)" }}>
        <span>Generated {new Date(data.generated_at).toLocaleString()}</span>
        <button
          data-testid="admin-overview-refresh"
          onClick={load}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "transparent", border: "1px solid var(--aurion-border)",
            color: "var(--aurion-text-secondary)", padding: "4px 10px",
            borderRadius: 4, fontSize: 11, cursor: "pointer",
          }}
        >
          <RefreshCw size={11} /> Refresh
        </button>
      </div>
    </div>
  );
}

function KpiTile({ kpi }: { kpi: OverviewKpi }) {
  const toneColor = kpi.tone === "down" ? "var(--aurion-danger, #ef4444)"
    : kpi.tone === "warn" ? "var(--aurion-warning, #f59e0b)"
    : "var(--aurion-success, #22c55e)";
  return (
    <div
      data-testid={`admin-kpi-${kpi.id}`}
      style={{
        background: "var(--aurion-surface, rgba(255,255,255,0.04))",
        border: "1px solid var(--aurion-border, rgba(255,255,255,0.08))",
        borderTop: `3px solid ${toneColor}`,
        borderRadius: 6, padding: "14px 16px",
        display: "flex", flexDirection: "column", gap: 4,
      }}
    >
      <div style={{ fontSize: 10, color: "var(--aurion-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {kpi.label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: toneColor, lineHeight: 1.1, fontFamily: "system-ui" }}>
        {kpi.value}
      </div>
      <div style={{ fontSize: 11, color: "var(--aurion-text-secondary)" }}>{kpi.sublabel}</div>
    </div>
  );
}

function EchoCommandBar() {
  const [q, setQ] = useState("");
  const [response, setResponse] = useState<{ answer: string; source: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(async () => {
    if (!q.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/admin-console/echo-query`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const j = await r.json();
      setResponse(j);
    } finally { setBusy(false); }
  }, [q]);

  return (
    <div data-testid="admin-echo-command-bar" style={{
      background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.04))",
      border: "1px solid rgba(99,102,241,0.25)",
      borderRadius: 8, padding: "12px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Sparkles size={16} style={{ color: "#a78bfa" }} />
        <input
          ref={inputRef}
          data-testid="admin-echo-input"
          value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Ask Echo AURION — try 'outlets down', 'active users', 'open alerts', 'errors today'…"
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: "var(--aurion-text-primary)", fontSize: 13, padding: "4px 0",
          }}
        />
        <button
          data-testid="admin-echo-submit"
          onClick={submit} disabled={busy || !q.trim()}
          style={{
            background: q.trim() ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.05)",
            color: "white", border: "none", padding: "6px 14px",
            borderRadius: 6, fontSize: 12, fontWeight: 600,
            cursor: q.trim() ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          {busy ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
          Ask
        </button>
      </div>
      {response && (
        <div data-testid="admin-echo-response" style={{
          marginTop: 10, paddingTop: 10,
          borderTop: "1px solid rgba(99,102,241,0.2)",
          fontSize: 12, color: "var(--aurion-text-primary)", whiteSpace: "pre-wrap", lineHeight: 1.5,
        }}>
          {response.answer}
          <div style={{ marginTop: 6, fontSize: 10, color: "var(--aurion-text-muted)" }}>
            via {response.source}
          </div>
        </div>
      )}
    </div>
  );
}

function OutletStatusTable({ rows }: { rows: OverviewOutlet[] }) {
  if (!rows.length) {
    return (
      <Card title="Outlet Status">
        <div style={{ padding: 24, fontSize: 12, color: "var(--aurion-text-muted)", textAlign: "center" }}>
          No outlets registered yet.
        </div>
      </Card>
    );
  }
  return (
    <Card title="Outlet Status">
      <div data-testid="admin-outlet-status-table" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--aurion-text-muted)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              <th style={{ padding: "6px 8px" }}>Status</th>
              <th style={{ padding: "6px 8px" }}>Outlet</th>
              <th style={{ padding: "6px 8px" }}>Property</th>
              <th style={{ padding: "6px 8px", textAlign: "center" }}>POS</th>
              <th style={{ padding: "6px 8px", textAlign: "center" }}>KDS</th>
              <th style={{ padding: "6px 8px", textAlign: "center" }}>Printer</th>
              <th style={{ padding: "6px 8px", textAlign: "right" }}>Alerts</th>
              <th style={{ padding: "6px 8px" }}>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} data-testid={`admin-outlet-row-${r.id}`} style={{
                borderTop: "1px solid var(--aurion-border)",
              }}>
                <td style={{ padding: "8px" }}><StatusDot tone={r.status} /></td>
                <td style={{ padding: "8px", fontWeight: 600 }}>{r.name}</td>
                <td style={{ padding: "8px", color: "var(--aurion-text-secondary)", fontSize: 11 }}>
                  {r.property_id || "—"}
                </td>
                <td style={{ padding: "8px", textAlign: "center" }}><FeedPill v={r.feeds.pos} /></td>
                <td style={{ padding: "8px", textAlign: "center" }}><FeedPill v={r.feeds.kds} /></td>
                <td style={{ padding: "8px", textAlign: "center" }}><FeedPill v={r.feeds.printer} /></td>
                <td style={{ padding: "8px", textAlign: "right", fontWeight: 700,
                  color: r.open_alerts > 0 ? "var(--aurion-warning)" : "var(--aurion-text-muted)" }}>
                  {r.open_alerts}
                </td>
                <td style={{ padding: "8px", fontSize: 11, color: "var(--aurion-text-secondary)" }}>
                  {r.last_seen ? new Date(r.last_seen).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function StatusDot({ tone }: { tone: "ok" | "warn" | "down" }) {
  const color = tone === "ok" ? "#22c55e" : tone === "warn" ? "#f59e0b" : "#ef4444";
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: color, boxShadow: `0 0 10px ${color}80`,
    }} />
  );
}

function FeedPill({ v }: { v: string }) {
  const ok = v === "ok";
  return (
    <span style={{
      fontSize: 10, padding: "2px 8px", borderRadius: 4,
      background: ok ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)",
      color: ok ? "#22c55e" : "var(--aurion-text-muted)",
      fontFamily: "monospace",
    }}>{ok ? "LIVE" : "—"}</span>
  );
}

function LiveEventsStream({ events }: { events: OverviewEvent[] }) {
  return (
    <Card title="Live Events">
      <div data-testid="admin-events-stream" style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
        {!events.length && (
          <div style={{ padding: "12px 8px", fontSize: 12, color: "var(--aurion-text-muted)" }}>
            No recent audit events. Activity will appear here in real time.
          </div>
        )}
        {events.map((e, idx) => (
          <div key={idx} data-testid={`admin-event-row-${idx}`}
            style={{ display: "flex", gap: 8, padding: "6px 8px", borderBottom: "1px solid var(--aurion-border)", fontSize: 11 }}>
            <span style={{ fontSize: 10, color: "var(--aurion-text-muted)", fontFamily: "monospace", minWidth: 60 }}>
              {e.ts ? new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
            </span>
            <span style={{ minWidth: 80, color: "var(--aurion-accent)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {e.action || "event"}
            </span>
            <span style={{ flex: 1, color: "var(--aurion-text-primary)" }}>
              {(e.detail || "").slice(0, 80)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ═══════════════ Users & Onboarding ═══════════════

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/api/admin/users`);
        const j = await r.json();
        setUsers(j.users || []);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <Loading />;
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card title={`Seats · ${users.length}`}>
        <div style={{ fontSize: 12, color: "var(--aurion-text-secondary)", marginBottom: 10 }}>
          Invite users, assign roles/properties, reset passwords, deactivate. Full-fat
          onboarding wizard lives in the <b>Admin & Onboarding</b> panel; this list is
          the fast read-through.
        </div>
        <div style={{ display: "grid", gap: 4, maxHeight: 420, overflow: "auto" }}>
          {users.slice(0, 60).map((u: any) => (
            <div key={u.id || u.email} style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10,
              padding: "8px 12px", borderRadius: 6,
              background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)",
              alignItems: "center", fontSize: 13,
            }}>
              <div>
                <div style={{ fontWeight: 600 }}>{u.name || u.email}</div>
                <div style={{ fontSize: 11, color: "var(--aurion-text-muted)" }}>{u.email}</div>
              </div>
              <div style={{ fontSize: 11, color: "var(--aurion-accent)" }}>{u.role || "—"}</div>
              <div style={{ fontSize: 11, color: "var(--aurion-text-muted)" }}>
                {u.department || u.property_id || "—"}
              </div>
              <span style={statusPill(u.is_active === false ? "disabled" : "active")}>
                {u.is_active === false ? "disabled" : "active"}
              </span>
            </div>
          ))}
          {users.length === 0 && <Empty msg="No users yet — use Admin & Onboarding to invite." />}
        </div>
      </Card>
      <Card title="Onboarding flow">
        <ol style={{ fontSize: 13, lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
          <li><b>Invite</b> — from Admin & Onboarding, enter email + role.</li>
          <li><b>Property scope</b> — pick property(s) and outlet(s). Role inheritance applies.</li>
          <li><b>Temp password</b> — auto-generated; user prompted to reset on first login.</li>
          <li><b>MFA enrollment</b> (optional) — offered on second login.</li>
          <li><b>Welcome email</b> — via Resend/SendGrid (pending key).</li>
        </ol>
      </Card>
    </div>
  );
}

// ═══════════════ System Updates ═══════════════

function UpdatesTab() {
  const [data, setData] = useState<UpdatesResp | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch(`${API}/api/admin-console/updates`);
    setData(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  const switchChannel = async (c: string) => {
    setBusy(true);
    await fetch(`${API}/api/admin-console/updates/channel`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: c }),
    });
    await load(); setBusy(false);
  };
  const triggerRollout = async (pct: number) => {
    setBusy(true);
    await fetch(`${API}/api/admin-console/updates/rollout`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ percent: pct }),
    });
    await load(); setBusy(false);
  };

  if (!data) return <Loading />;
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card title="Release Channel">
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {data.channels_available.map(c => (
            <button
              key={c} disabled={busy}
              onClick={() => switchChannel(c)}
              data-testid={`admin-channel-${c}`}
              style={{
                padding: "8px 16px", borderRadius: 999,
                border: `1px solid ${c === data.channel ? "var(--aurion-accent)" : "var(--aurion-border)"}`,
                background: c === data.channel ? "var(--aurion-accent-soft)" : "transparent",
                color: c === data.channel ? "var(--aurion-accent)" : "var(--aurion-text-primary)",
                textTransform: "capitalize", cursor: "pointer", fontWeight: 600, fontSize: 12,
              }}
            >{c}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <KV k="Current version" v={data.current_version} />
          <KV k="Latest available" v={data.latest_version} />
        </div>
      </Card>

      <Card title="Rollout (Windows-Update style)">
        <div style={{ fontSize: 13, marginBottom: 12 }}>
          Push the latest build to every connected desktop client. You control
          the rollout percent; the desktop shell picks up the new bundle on the
          next refresh.
        </div>
        <div style={{ marginBottom: 12 }}>
          <KV k="Target version" v={data.rollout.target_version} />
          <KV k="Rolled out" v={`${data.rollout.percent_rolled_out}%`} />
          <KV k="Status" v={data.rollout.status} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[10, 25, 50, 100].map(pct => (
            <button key={pct} disabled={busy}
              data-testid={`admin-rollout-${pct}`}
              onClick={() => triggerRollout(pct)}
              style={{
                padding: "8px 14px", borderRadius: 6,
                border: "1px solid var(--aurion-accent)",
                background: "var(--aurion-accent-soft)",
                color: "var(--aurion-accent)", fontWeight: 700, cursor: "pointer",
                fontSize: 12,
              }}>
              <ArrowUpCircle size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
              Roll to {pct}%
            </button>
          ))}
        </div>
      </Card>

      <Card title="Changelog">
        <div style={{ display: "grid", gap: 12 }}>
          {data.changelog.map(c => (
            <div key={c.version} style={{
              padding: 12, borderRadius: 8,
              background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)",
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: "var(--aurion-accent)" }}>v{c.version}</span>
                <span style={{ fontSize: 11, color: "var(--aurion-text-muted)" }}>{c.date}</span>
              </div>
              <div style={{ fontSize: 13, fontStyle: "italic", marginBottom: 6 }}>{c.summary}</div>
              <ul style={{ margin: "4px 0 0 18px", padding: 0, fontSize: 12, lineHeight: 1.6 }}>
                {c.changes.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════ Installers ═══════════════

function InstallersTab() {
  const [data, setData] = useState<InstallersResp | null>(null);
  useEffect(() => { (async () => setData(await (await fetch(`${API}/api/admin-console/installers`)).json()))(); }, []);
  if (!data) return <Loading />;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card title="Progressive Web App">
        <div style={{ fontSize: 13, marginBottom: 10 }}>{data.pwa.note}</div>
        <a href={data.pwa.url} style={installBtn}><Download size={14} /> Open App</a>
      </Card>

      <Card title="Desktop">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
          {data.desktop.map((d, i) => (
            <div key={i} style={installCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                {d.os === "macOS" ? <Laptop size={16} /> : d.os === "Windows" ? <Monitor size={16} /> : <Laptop size={16} />}
                <b>{d.os}</b>
                <span style={{ fontSize: 11, color: "var(--aurion-text-muted)" }}>· {d.arch}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--aurion-text-muted)" }}>
                {d.artifact} · {d.size_mb} MB
              </div>
              <a href={d.download_url} style={{ ...installBtn, marginTop: 8 }}>
                <Download size={12} /> Download
              </a>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Mobile">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
          {data.mobile.map((m, i) => (
            <div key={i} style={installCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Smartphone size={16} /> <b>{m.os}</b>
                <span style={{ fontSize: 11, color: "var(--aurion-text-muted)" }}>· {m.channel}</span>
              </div>
              <div style={{ fontSize: 12, margin: "6px 0 10px", color: "var(--aurion-text-secondary)" }}>{m.note}</div>
              <a href={m.url} style={installBtn}><Download size={12} /> Get Link</a>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Corporate MDM">
        <div style={{ fontSize: 13, marginBottom: 8 }}>{data.mdm.note}</div>
        <a href={data.mdm.profile_url} style={installBtn}>
          <Download size={12} /> Download .mobileconfig
        </a>
      </Card>
    </div>
  );
}

// ═══════════════ IT & Integrations ═══════════════

function ITTab() {
  const [data, setData] = useState<IntegrationsResp | null>(null);
  const load = useCallback(async () => {
    setData(await (await fetch(`${API}/api/admin-console/integrations`)).json());
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!data) return <Loading />;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <Stat label="Healthy" value={`${data.healthy}/${data.total}`} icon={<CheckCircle2 size={14} />} tone="ok" />
        <button onClick={load} style={iconBtn}><RefreshCw size={14} /> Refresh</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 10 }}>
        {data.items.map(it => (
          <div key={it.id} style={{
            padding: 14, borderRadius: 8,
            background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              {statusIcon(it.status)}
              <b>{it.name}</b>
              <span style={{ ...statusPill(it.status), marginLeft: "auto" }}>{it.status}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--aurion-text-secondary)" }}>{it.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════ Audit Trail ═══════════════

function AuditTab() {
  const [data, setData] = useState<AuditResp | null>(null);
  useEffect(() => { (async () => setData(await (await fetch(`${API}/api/admin-console/audit`)).json()))(); }, []);
  if (!data) return <Loading />;
  return (
    <Card title={`Recent events · ${data.events.length}`}>
      <div style={{ display: "grid", gap: 4 }}>
        {data.events.map((e, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "1fr 2fr 1fr auto", gap: 10,
            padding: "8px 12px", borderRadius: 6,
            background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)",
            alignItems: "center", fontSize: 12,
          }}>
            <span style={{ fontFamily: "monospace", color: "var(--aurion-accent)" }}>{e.action}</span>
            <span>{e.detail}</span>
            <span style={{ color: "var(--aurion-text-muted)" }}>{e.actor}</span>
            <span style={statusPill(e.severity === "warn" ? "partial" : e.severity === "error" ? "down" : "ok")}>
              {e.severity}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ═══════════════ Feature Flags ═══════════════

function FlagsTab() {
  const [data, setData] = useState<FlagsResp | null>(null);
  const load = useCallback(async () =>
    setData(await (await fetch(`${API}/api/admin-console/feature-flags`)).json()), []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (id: string, enabled: boolean) => {
    await fetch(`${API}/api/admin-console/feature-flags/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    load();
  };

  if (!data) return <Loading />;
  return (
    <Card title="Platform feature flags">
      <div style={{ display: "grid", gap: 8 }}>
        {data.flags.map(f => (
          <div key={f.id} style={{
            padding: 12, borderRadius: 8,
            background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)",
            display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 12,
          }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <b>{f.label}</b>
                <code style={{ fontSize: 10, color: "var(--aurion-text-muted)" }}>{f.id}</code>
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1,
                              color: "var(--aurion-text-muted)" }}>{f.scope}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--aurion-text-secondary)", marginTop: 3 }}>
                {f.description}
              </div>
            </div>
            <button
              onClick={() => toggle(f.id, !f.enabled)}
              data-testid={`flag-toggle-${f.id}`}
              style={{
                padding: "6px 14px", borderRadius: 999,
                border: `1px solid ${f.enabled ? "var(--aurion-healthy)" : "var(--aurion-border-strong)"}`,
                background: f.enabled ? "rgba(16,185,129,0.14)" : "transparent",
                color: f.enabled ? "var(--aurion-healthy)" : "var(--aurion-text-muted)",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>
              {f.enabled ? "ENABLED" : "DISABLED"}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ═══════════════ Tech Support ═══════════════

function SupportTab() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<"normal" | "high" | "urgent">("normal");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);

  const loadTickets = useCallback(async () => {
    const j = await (await fetch(`${API}/api/admin-console/tech-support`)).json();
    setTickets(j.tickets || []);
  }, []);
  useEffect(() => { loadTickets(); }, [loadTickets]);

  const submit = async () => {
    if (!subject.trim() || !body.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/admin-console/tech-support`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject, body, severity, contact_email: email,
          context: { url: window.location.href, ua: navigator.userAgent },
        }),
      });
      setResult(await r.json());
      setSubject(""); setBody("");
      await loadTickets();
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: "grid", gap: 18, gridTemplateColumns: "1fr 1fr" }}>
      <Card title="Open a ticket with Echo AURION">
        <div style={{ fontSize: 12, color: "var(--aurion-text-secondary)", marginBottom: 10 }}>
          Routes to the Echo AURION platform support team. Stored locally until
          the live bridge comes online (set <code>AURION_SUPPORT_URL</code> +{" "}
          <code>AURION_SUPPORT_TOKEN</code> in backend env).
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <input
            data-testid="support-subject"
            placeholder="Subject"
            value={subject} onChange={e => setSubject(e.target.value)}
            style={inputStyle}
          />
          <textarea
            data-testid="support-body"
            placeholder="Describe the issue — include role, property, and what you tried."
            value={body} onChange={e => setBody(e.target.value)}
            rows={7} style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <select
              value={severity}
              onChange={e => setSeverity(e.target.value as any)}
              style={{ ...inputStyle, flex: "0 0 140px" }}
              data-testid="support-severity"
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <input
              placeholder="Reply-to email (optional)"
              value={email} onChange={e => setEmail(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
              data-testid="support-email"
            />
          </div>
          <button
            onClick={submit} disabled={busy || !subject.trim() || !body.trim()}
            data-testid="support-submit"
            style={{
              padding: "10px 16px", borderRadius: 8,
              background: "var(--aurion-accent)", color: "#0b0f14",
              border: "none", fontWeight: 700, cursor: "pointer",
              opacity: busy ? 0.5 : 1,
            }}>
            <Send size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
            {busy ? "Sending…" : "Submit ticket"}
          </button>
          {result && (
            <div style={{
              padding: 10, borderRadius: 6, fontSize: 12,
              background: result.forwarded?.delivered
                ? "rgba(16,185,129,0.14)" : "rgba(245,158,11,0.14)",
              color: result.forwarded?.delivered ? "var(--aurion-healthy)" : "var(--aurion-watch)",
              border: "1px solid var(--aurion-border)",
            }}>
              Ticket <b>{result.ticket?.id}</b> saved.{" "}
              {result.forwarded?.delivered
                ? "Forwarded to Echo AURION."
                : `Bridge offline: ${result.forwarded?.reason || "unknown"}.`}
            </div>
          )}
        </div>
      </Card>

      <Card title={`Recent tickets · ${tickets.length}`}>
        <div style={{ display: "grid", gap: 8, maxHeight: 520, overflow: "auto" }}>
          {tickets.map(t => (
            <div key={t.id} style={{
              padding: 10, borderRadius: 8,
              background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)",
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <b>{t.subject}</b>
                <span style={{ ...statusPill(
                  t.severity === "urgent" ? "down" : t.severity === "high" ? "partial" : "ok"
                ), marginLeft: "auto" }}>{t.severity}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--aurion-text-muted)", marginTop: 4 }}>
                {t.id} · {new Date(t.created_at).toLocaleString()} · {t.status}
              </div>
              <div style={{ fontSize: 12, marginTop: 6, whiteSpace: "pre-wrap" }}>
                {(t.body || "").slice(0, 200)}{(t.body || "").length > 200 ? "…" : ""}
              </div>
            </div>
          ))}
          {tickets.length === 0 && <Empty msg="No tickets yet." />}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════ primitives ═══════════════

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      padding: 16, borderRadius: 10,
      background: "var(--aurion-surface-elevated, #1a1f2e)",
      border: "1px solid var(--aurion-border)",
    }}>
      <h3 style={{
        margin: "0 0 12px", fontSize: 11, fontWeight: 700,
        letterSpacing: 1.6, textTransform: "uppercase",
        color: "var(--aurion-text-muted)",
      }}>{title}</h3>
      {children}
    </section>
  );
}

function Stat({ label, value, icon, tone }: {
  label: string; value: string | number; icon?: React.ReactNode;
  tone?: "ok" | "warn" | "bad";
}) {
  const color =
    tone === "warn" ? "var(--aurion-watch)" :
    tone === "bad" ? "var(--aurion-critical)" :
    tone === "ok" ? "var(--aurion-healthy)" :
    "var(--aurion-accent)";
  return (
    <div style={{
      padding: 14, borderRadius: 10,
      background: "var(--aurion-surface-elevated)",
      border: "1px solid var(--aurion-border)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6,
                    fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4,
                    color: "var(--aurion-text-muted)", marginBottom: 6 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0",
                  borderBottom: "1px dashed var(--aurion-border)", fontSize: 13 }}>
      <span style={{ color: "var(--aurion-text-muted)" }}>{k}</span>
      <span style={{ fontWeight: 600 }}>{v}</span>
    </div>
  );
}

function Loading() {
  return <div style={{ padding: 40, textAlign: "center", color: "var(--aurion-text-muted)" }}>Loading…</div>;
}
function Empty({ msg }: { msg: string }) {
  return <div style={{ padding: 40, textAlign: "center", color: "var(--aurion-text-muted)" }}>{msg}</div>;
}

function statusIcon(s: string) {
  if (s === "ok") return <CheckCircle2 size={14} color="var(--aurion-healthy)" />;
  if (s === "partial") return <AlertTriangle size={14} color="var(--aurion-watch)" />;
  if (s === "down") return <XCircle size={14} color="var(--aurion-critical)" />;
  return <Circle size={14} color="var(--aurion-text-muted)" />;
}
function statusPill(s: string): React.CSSProperties {
  const map: Record<string, [string, string]> = {
    ok: ["rgba(16,185,129,0.14)", "var(--aurion-healthy)"],
    active: ["rgba(16,185,129,0.14)", "var(--aurion-healthy)"],
    partial: ["rgba(245,158,11,0.14)", "var(--aurion-watch)"],
    missing: ["rgba(100,116,139,0.14)", "var(--aurion-text-muted)"],
    disabled: ["rgba(100,116,139,0.14)", "var(--aurion-text-muted)"],
    down: ["rgba(239,68,68,0.14)", "var(--aurion-critical)"],
  };
  const [bg, fg] = map[s] || ["rgba(100,116,139,0.14)", "var(--aurion-text-muted)"];
  return {
    padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
    letterSpacing: 1, textTransform: "uppercase",
    background: bg, color: fg,
  };
}

const installBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8,
  background: "var(--aurion-accent-soft)", border: "1px solid var(--aurion-accent)",
  color: "var(--aurion-accent)", fontSize: 12, fontWeight: 700, textDecoration: "none",
  cursor: "pointer",
};
const installCard: React.CSSProperties = {
  padding: 14, borderRadius: 8,
  background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)",
};
const iconBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "6px 12px", borderRadius: 6,
  background: "transparent", border: "1px solid var(--aurion-border)",
  color: "var(--aurion-text-secondary)", cursor: "pointer", fontSize: 12,
};
const inputStyle: React.CSSProperties = {
  padding: "10px 12px", borderRadius: 8,
  border: "1px solid var(--aurion-border)",
  background: "var(--aurion-surface)", color: "var(--aurion-text-primary)",
  fontSize: 13,
};
