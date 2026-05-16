/**
 * iter181 · Settings Overhaul — Apple-style minimal, sleek
 *
 * Left sidebar navigation (fixed) + right content pane (sections collapse via scroll).
 * Each section fits in view — minimal scrolling.
 *
 * Sections:
 *   1. Appearance   — theme, font family, font size, background
 *   2. Display      — density, panel defaults, show/hide chrome
 *   3. Integrations — Google OAuth · Outlook · Stripe · Resend · Sentry · Fal.ai (live status dots)
 *   4. Data         — storage usage, export, admin token rotation
 *   5. About        — version, build, open-source licenses
 *
 * Themes apply universally via CSS vars + injected global stylesheet (font + text contrast cascade).
 */
import React, { useEffect, useState } from "react";
import { usePanelState } from "@/lib/usePanelState";
import { adminFetch, ensureAdminToken } from "@/lib/admin-auth";
import {
  loadPreferences, savePreferences, applyTheme, initializeTheme,
  THEMES, FONTS,
} from "@/lib/theme-manager";

const PANEL_ID = "settings-overhaul";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};

const SECTIONS = [
  { id: "appearance", label: "Appearance", icon: "✦" },
  { id: "display", label: "Display", icon: "◩" },
  { id: "integrations", label: "Integrations", icon: "⟡" },
  { id: "data", label: "Data & Privacy", icon: "⊞" },
  { id: "about", label: "About", icon: "i" },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

export default function SettingsOverhaul() {
  const [section, setSection] = usePanelState<SectionId>(PANEL_ID, "section", "appearance");
  return (
    <div data-testid="settings-overhaul-panel" style={S.root}>
      <aside style={S.sidebar}>
        <div style={S.sidebarEyebrow}>Settings</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 14 }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              data-testid={`settings-nav-${s.id}`}
              onClick={() => setSection(s.id)}
              style={{
                ...S.navBtn,
                ...(section === s.id ? S.navBtnActive : {}),
              }}
            >
              <span style={S.navIcon}>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main style={S.main}>
        {section === "appearance" && <AppearanceSection />}
        {section === "display" && <DisplaySection />}
        {section === "integrations" && <IntegrationsSection />}
        {section === "data" && <DataSection />}
        {section === "about" && <AboutSection />}
      </main>
    </div>
  );
}

// ─── Appearance ───────────────────────────────────────────────────────────
function AppearanceSection() {
  const [prefs, setPrefs] = useState(() => loadPreferences());

  function update<K extends keyof typeof prefs>(k: K, v: (typeof prefs)[K]) {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    savePreferences(next);
    applyTheme(next);
    // Apply font universally via global stylesheet injection
    try { applyGlobalFont(FONTS[next.font]?.fontFamily || "system-ui"); } catch {}
  }

  return (
    <div>
      <SectionHeader eyebrow="Personalisation" title="Appearance" sub="Theme, font, and background apply instantly across every panel." />

      <Card>
        <Row label="Mode" testid="row-mode">
          <SegButton value={prefs.appearance} onChange={(v) => update("appearance", v as any)}
            options={[
              { v: "light", label: "Light" },
              { v: "dark", label: "Dark" },
              { v: "auto", label: "Auto" },
            ]}
          />
        </Row>
        <Divider />
        <Row label="Theme" testid="row-theme">
          <select data-testid="theme-select" value={prefs.theme} onChange={e => update("theme", e.target.value as any)} style={S.select}>
            {Object.entries(THEMES).map(([k, t]) => <option key={k} value={k}>{t.name}</option>)}
          </select>
        </Row>
        <Divider />
        <Row label="Font Family" testid="row-font">
          <select data-testid="font-family-select" value={prefs.font} onChange={e => update("font", e.target.value as any)} style={S.select}>
            {Object.entries(FONTS).map(([k, f]) => <option key={k} value={k} style={{ fontFamily: f.fontFamily }}>{f.name}</option>)}
          </select>
        </Row>
        <Divider />
        <Row label="Font Size" testid="row-font-size">
          <SegButton value={String(prefs.fontScale)} onChange={(v) => update("fontScale", parseFloat(v) as any)}
            options={[
              { v: "0.85", label: "Small" },
              { v: "1.0", label: "Default" },
              { v: "1.15", label: "Large" },
              { v: "1.3", label: "XL" },
            ]}
          />
        </Row>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <Row label="Accent Preview">
          <div style={{ display: "flex", gap: 6 }}>
            {["#c8a97e", "#0ea5e9", "#a78bfa", "#22c55e", "#f43f5e"].map((c) => (
              <span key={c} style={{ width: 24, height: 24, borderRadius: 6, background: c, border: "1px solid rgba(255,255,255,0.15)" }} />
            ))}
          </div>
        </Row>
        <Divider />
        <Row label="Sample text">
          <div style={{ fontSize: 13, color: "var(--foreground, #f8fafc)" }}>
            The quick brown fox jumps over the lazy dog <span style={{ color: "var(--primary, #c8a97e)" }}>— 0123456789</span>
          </div>
        </Row>
      </Card>
    </div>
  );
}

// ─── Display ──────────────────────────────────────────────────────────────
function DisplaySection() {
  const [density, setDensity] = usePanelState<string>(PANEL_ID, "density", "comfortable");
  const [compactDock, setCompactDock] = usePanelState<boolean>(PANEL_ID, "compactDock", false);
  const [showClock, setShowClock] = usePanelState<boolean>(PANEL_ID, "showClock", true);

  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
  }, [density]);

  return (
    <div>
      <SectionHeader eyebrow="Layout" title="Display" sub="Control panel density and dock chrome." />
      <Card>
        <Row label="Density" testid="row-density">
          <SegButton value={density} onChange={setDensity}
            options={[
              { v: "compact", label: "Compact" },
              { v: "comfortable", label: "Comfortable" },
              { v: "spacious", label: "Spacious" },
            ]}
          />
        </Row>
        <Divider />
        <Row label="Compact Dock" testid="row-dock">
          <Switch checked={compactDock} onChange={setCompactDock} />
        </Row>
        <Divider />
        <Row label="Show Clock" testid="row-clock">
          <Switch checked={showClock} onChange={setShowClock} />
        </Row>
      </Card>
    </div>
  );
}

// ─── Integrations ─────────────────────────────────────────────────────────
function IntegrationsSection() {
  const [stat, setStat] = useState<any>({});
  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const probes = await Promise.all([
        fetch(`${API()}/api/auth/me`, { credentials: "include" }).then(r => ({ google: r.status !== 401 })),
        fetch(`${API()}/api/outlook/status`, { credentials: "include" }).then(r => r.ok ? r.json() : {}).then(j => ({ outlook: j.configured && j.connected, outlook_configured: j.configured })),
        fetch(`${API()}/api/health`).then(r => r.ok ? r.json() : {}).then((j: any) => ({
          stripe: !!j?.integrations?.stripe,
          resend: !!j?.integrations?.resend,
          sentry: !!j?.integrations?.sentry,
          fal: !!j?.integrations?.fal,
          llm: !!j?.integrations?.emergent_llm_key,
        })).catch(() => ({})),
      ]);
      setStat(Object.assign({}, ...probes));
    } catch {}
  }

  const rows = [
    { label: "Emergent Google OAuth (Staff SSO)", key: "google", note: "Sign-in pill top-right uses this." },
    { label: "Microsoft Outlook Calendar 2-way Sync", key: "outlook", note: stat.outlook_configured ? "Configured — staff connects individually" : "Not configured — add AZURE_CLIENT_ID/SECRET/TENANT_ID" },
    { label: "Claude Sonnet 4.5 (Emergent LLM Key)", key: "llm", note: "Powers evaluations, hiring ranker, daily briefs." },
    { label: "Stripe (Pastry Standalone + BEO)", key: "stripe", note: "Test key set; rotate to live before GA." },
    { label: "Resend (Transactional Email)", key: "resend", note: "Welcome packs + milestone cards." },
    { label: "Sentry (Observability)", key: "sentry", note: "Error & performance tracking." },
    { label: "fal.ai (Photoreal Cake Renders)", key: "fal", note: "Pastry standalone render pipeline." },
  ];

  return (
    <div>
      <SectionHeader eyebrow="Connections" title="Integrations" sub="Live status of every external service. Green = active." />
      <Card>
        {rows.map((r, i) => (
          <React.Fragment key={r.key}>
            {i > 0 && <Divider />}
            <Row label={r.label} testid={`integration-${r.key}`} bottom={<div style={{ fontSize: 11, color: "var(--muted-foreground, #94a3b8)", marginTop: 3 }}>{r.note}</div>}>
              <StatusDot ok={!!stat[r.key]} />
            </Row>
          </React.Fragment>
        ))}
      </Card>
    </div>
  );
}

// ─── Data & Privacy ──────────────────────────────────────────────────────
function DataSection() {
  const [hasToken, setHasToken] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    setHasToken(!!localStorage.getItem("echoai3_admin_token"));
    adminFetch(`${API()}/api/health`).then(r => r.ok ? r.json() : null).then(setStats).catch(() => {});
  }, []);

  async function rotate() {
    if (!confirm("Rotate admin token? You'll be signed out of admin.")) return;
    try { localStorage.removeItem("echoai3_admin_token"); setHasToken(false); }
    catch {}
    alert("Admin token cleared from this browser. Set a new ADMIN_API_TOKEN in backend/.env and re-authenticate.");
  }

  return (
    <div>
      <SectionHeader eyebrow="Storage · Security" title="Data & Privacy" sub="Export your data or rotate admin credentials." />
      <Card>
        <Row label="Admin token (this browser)" testid="row-admin-token"
          bottom={<div style={{ fontSize: 11, color: "var(--muted-foreground, #94a3b8)", marginTop: 3 }}>Stored only in localStorage. Rotating clears it here.</div>}>
          <button data-testid="rotate-admin-btn" onClick={() => ensureAdminToken()} style={S.ghostBtn}>
            {hasToken ? "Re-enter" : "Set token"}
          </button>
          {hasToken && <button onClick={rotate} style={{ ...S.dangerBtn, marginLeft: 6 }}>Clear</button>}
        </Row>
        <Divider />
        <Row label="Backend version"><code style={S.code}>{stats?.version || "—"}</code></Row>
        <Divider />
        <Row label="Runtime"><code style={S.code}>{stats?.runtime || "FastAPI + MongoDB"}</code></Row>
      </Card>
    </div>
  );
}

// ─── About ────────────────────────────────────────────────────────────────
function AboutSection() {
  return (
    <div>
      <SectionHeader eyebrow="EchoAi³" title="About" sub="The 5-layer synthetic intelligence orchestration framework." />
      <Card>
        <div style={{ padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎇</div>
          <div style={{ fontSize: 22, fontWeight: 300, color: "var(--foreground)", letterSpacing: -0.5 }}>EchoAi³ · Luccca Framework</div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground, #94a3b8)", marginTop: 6 }}>Built for resort-scale hospitality operations</div>
          <div style={{ fontSize: 10, color: "var(--muted-foreground, #64748b)", marginTop: 18, letterSpacing: 1, textTransform: "uppercase" }}>
            iter181 · Apr 2026 · © Luccca Holdings
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {eyebrow && <div style={S.eyebrow}>{eyebrow}</div>}
      <h1 style={S.title}>{title}</h1>
      {sub && <p style={S.sub}>{sub}</p>}
    </div>
  );
}
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...S.card, ...(style || {}) }}>{children}</div>;
}
function Divider() {
  return <div style={{ height: 1, background: "var(--border, rgba(255,255,255,0.08))" }} />;
}
function Row({ label, children, testid, bottom }: { label: string; children: React.ReactNode; testid?: string; bottom?: React.ReactNode }) {
  return (
    <div data-testid={testid} style={S.row}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.rowLabel}>{label}</div>
        {bottom}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>{children}</div>
    </div>
  );
}
function SegButton({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  return (
    <div style={S.segGroup}>
      {options.map(o => (
        <button
          key={o.v} data-testid={`seg-${o.v}`}
          onClick={() => onChange(o.v)}
          style={{
            ...S.segBtn,
            ...(value === o.v ? S.segBtnActive : {}),
          }}
        >{o.label}</button>
      ))}
    </div>
  );
}
function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} style={{
      ...S.switch,
      background: checked ? "var(--primary, #c8a97e)" : "rgba(255,255,255,0.12)",
    }}>
      <span style={{
        ...S.switchKnob,
        transform: `translateX(${checked ? 18 : 0}px)`,
      }} />
    </button>
  );
}
function StatusDot({ ok }: { ok: boolean }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>
      <span style={{
        width: 8, height: 8, borderRadius: 99,
        background: ok ? "#22c55e" : "#6b7280",
        boxShadow: ok ? "0 0 8px rgba(34,197,94,0.6)" : "none",
      }} />
      <span style={{ color: ok ? "#22c55e" : "#6b7280" }}>{ok ? "Active" : "Not configured"}</span>
    </div>
  );
}

// ─── Universal Font Enforcement ──────────────────────────────────────────
function applyGlobalFont(fontFamily: string) {
  const id = "echo-global-font-overrides";
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = `
    html, body, button, input, select, textarea, [class*="font-"] {
      font-family: ${fontFamily}, system-ui, -apple-system, sans-serif !important;
    }
    code, pre, kbd, samp, tt, [class*="mono"] {
      font-family: "SF Mono", Menlo, Monaco, "Courier New", monospace !important;
    }
  `;
}

// ─── Styles ───────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  root: {
    display: "grid",
    gridTemplateColumns: "220px 1fr",
    height: "100%",
    color: "var(--foreground, #f8fafc)",
    background: "var(--background, #0a0e1a)",
  },
  sidebar: {
    padding: "20px 12px",
    borderRight: "1px solid var(--border, rgba(255,255,255,0.08))",
    background: "var(--sidebar-background, rgba(255,255,255,0.02))",
  },
  sidebarEyebrow: { fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "var(--primary, #c8a97e)", fontWeight: 700, paddingLeft: 10 },
  navBtn: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 12px", borderRadius: 8,
    background: "transparent", border: 0, color: "var(--foreground, #cbd5e1)",
    fontSize: 12, fontWeight: 500, letterSpacing: 0.2,
    cursor: "pointer", textAlign: "left", width: "100%",
    transition: "background 0.15s ease",
  },
  navBtnActive: {
    background: "var(--accent, rgba(200,169,126,0.15))",
    color: "var(--foreground, #f8fafc)",
    fontWeight: 600,
  },
  navIcon: { width: 18, textAlign: "center", color: "var(--primary, #c8a97e)" },

  main: { padding: "32px 40px", overflow: "auto" },
  eyebrow: { fontSize: 9, letterSpacing: 4, textTransform: "uppercase", color: "var(--primary, #c8a97e)", fontWeight: 700 },
  title: { fontSize: 28, margin: "6px 0 4px", fontWeight: 300, letterSpacing: -0.5, color: "var(--foreground, #f8fafc)" },
  sub: { fontSize: 13, color: "var(--muted-foreground, #94a3b8)", margin: 0 },

  card: {
    background: "var(--card, rgba(255,255,255,0.03))",
    border: "1px solid var(--border, rgba(255,255,255,0.08))",
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 18px", gap: 16, minHeight: 54,
  },
  rowLabel: { fontSize: 13, color: "var(--foreground, #f8fafc)", fontWeight: 500 },

  segGroup: {
    display: "inline-flex", padding: 2,
    background: "var(--muted, rgba(255,255,255,0.04))",
    border: "1px solid var(--border, rgba(255,255,255,0.1))",
    borderRadius: 8, gap: 2,
  },
  segBtn: {
    padding: "6px 12px", borderRadius: 6, border: 0,
    background: "transparent", color: "var(--muted-foreground, #94a3b8)",
    fontSize: 11, fontWeight: 600, letterSpacing: 0.3, cursor: "pointer",
  },
  segBtnActive: {
    background: "var(--background, #0a0e1a)",
    color: "var(--foreground, #f8fafc)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.15), 0 0 0 1px var(--border, rgba(255,255,255,0.08))",
  },
  select: {
    padding: "6px 10px", borderRadius: 6,
    background: "var(--background, rgba(255,255,255,0.04))",
    color: "var(--foreground, #f8fafc)",
    border: "1px solid var(--border, rgba(255,255,255,0.12))",
    fontSize: 12, minWidth: 180,
  },
  ghostBtn: {
    padding: "6px 12px", borderRadius: 6,
    background: "transparent", color: "var(--foreground, #cbd5e1)",
    border: "1px solid var(--border, rgba(255,255,255,0.15))",
    fontSize: 11, fontWeight: 600, cursor: "pointer",
  },
  dangerBtn: {
    padding: "6px 12px", borderRadius: 6,
    background: "transparent", color: "#fca5a5",
    border: "1px solid rgba(239,68,68,0.4)",
    fontSize: 11, fontWeight: 600, cursor: "pointer",
  },
  switch: {
    width: 40, height: 22, borderRadius: 999,
    border: 0, padding: 2, cursor: "pointer", position: "relative",
    transition: "background 0.2s ease",
  },
  switchKnob: {
    width: 18, height: 18, borderRadius: 999, background: "#fff",
    display: "block", transition: "transform 0.2s ease",
    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
  },
  code: {
    fontFamily: "SF Mono, monospace", fontSize: 11,
    padding: "3px 8px", background: "var(--muted, rgba(0,0,0,0.2))", borderRadius: 4,
    color: "var(--foreground, #c8a97e)",
  },
};
