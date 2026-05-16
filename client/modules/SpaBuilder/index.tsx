/**
 * Spa Menu Builder · Echo AURION (iter263.4)
 * For Spa Director / Spa Manager / Admin.
 * Backend: /api/spa-builder/*, /api/spa-public/*
 */
import React, { useCallback, useEffect, useState } from "react";
import { Edit3, Upload, Eye, QrCode, Calendar, Plus, Trash2 } from "lucide-react";

const API = window.location.origin;

const TABS = [
  { id: "builder", label: "Service Catalog", icon: Edit3 },
  { id: "import", label: "AI Import", icon: Upload },
  { id: "preview", label: "Guest Preview", icon: Eye },
  { id: "qr", label: "QR Code", icon: QrCode },
  { id: "bookings", label: "Booking Requests", icon: Calendar },
] as const;

export default function SpaBuilder() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("builder");
  return (
    <div data-testid="spa-builder" style={shell}>
      <div style={headStyle}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Spa Menu Builder</h1>
        <div style={{ marginTop: 4, fontSize: 12, color: "var(--aurion-text-secondary)" }}>
          Manage the wellness service catalog: thermal experiences, signature journeys,
          mind-body, duo suites, massage, body, skincare, salon, packages.
        </div>
      </div>
      <div style={tabBar}>
        {TABS.map(t => {
          const Icon = t.icon, active = t.id === tab;
          return (
            <button key={t.id} data-testid={`spa-tab-${t.id}`} onClick={() => setTab(t.id)} style={tabBtn(active)}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>
      <div style={{ padding: "18px 28px 48px" }}>
        {tab === "builder" && <BuilderTab />}
        {tab === "import" && <ImportTab />}
        {tab === "preview" && <PreviewTab />}
        {tab === "qr" && <QrTab />}
        {tab === "bookings" && <BookingsTab />}
      </div>
    </div>
  );
}

function BuilderTab() {
  const [menu, setMenu] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => setMenu(await (await fetch(`${API}/api/spa-builder/menu`)).json()), []);
  useEffect(() => { load(); }, [load]);

  if (!menu) return <Loading />;

  const save = async () => {
    setBusy(true);
    try {
      await fetch(`${API}/api/spa-builder/menu`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(menu) });
    } finally { setBusy(false); }
  };
  const publish = async (testMode: boolean) => {
    await fetch(`${API}/api/spa-builder/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: "main", test_mode: testMode }) });
    load();
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Card>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={save} disabled={busy} data-testid="spa-save" style={primaryBtn}>{busy ? "Saving…" : "Save draft"}</button>
          <button onClick={() => publish(true)} data-testid="spa-publish-test" style={secondaryBtn}>Publish · TEST</button>
          <button onClick={() => publish(false)} data-testid="spa-publish-live" style={livePublishBtn}>Publish · LIVE</button>
          <span style={statusPill(menu.is_live ? (menu.test_mode ? "test" : "live") : "draft")}>{menu.is_live ? (menu.test_mode ? "LIVE · TEST" : "LIVE") : "DRAFT"}</span>
        </div>
      </Card>
      {(menu.categories || []).map((c: any, ci: number) => (
        <Card key={c.id}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
            <input value={c.name} onChange={e => { const arr = [...menu.categories]; arr[ci] = { ...c, name: e.target.value }; setMenu({ ...menu, categories: arr }); }}
              data-testid={`spa-cat-${c.id}-name`} style={{ ...inputStyle, fontWeight: 700, fontSize: 14 }} />
            <button onClick={() => setMenu({ ...menu, categories: menu.categories.filter((_: any, i: number) => i !== ci) })}
              style={iconBtn}><Trash2 size={14} /></button>
          </div>
          {c.description && <div style={{ fontSize: 11, color: "var(--aurion-text-muted)", marginTop: 4 }}>{c.description}</div>}
          <div style={{ display: "grid", gap: 4, marginTop: 10 }}>
            {(c.services || []).map((s: any, si: number) => (
              <ServiceRow key={s.id} svc={s}
                onChange={(ns) => { const cats = [...menu.categories]; const services = [...cats[ci].services]; services[si] = ns; cats[ci] = { ...c, services }; setMenu({ ...menu, categories: cats }); }}
                onDelete={() => { const cats = [...menu.categories]; cats[ci] = { ...c, services: c.services.filter((_: any, i: number) => i !== si) }; setMenu({ ...menu, categories: cats }); }}
              />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function ServiceRow({ svc, onChange, onDelete }: { svc: any; onChange: (s: any) => void; onDelete: () => void }) {
  const dur = svc.durations?.[0];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 70px 90px auto auto", gap: 6, alignItems: "center", padding: "6px 8px", borderRadius: 6, background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)", fontSize: 12 }}>
      <input value={svc.name} onChange={e => onChange({ ...svc, name: e.target.value })} placeholder="Service name" style={inputStyle} />
      <input value={svc.description || ""} onChange={e => onChange({ ...svc, description: e.target.value })} placeholder="Description" style={inputStyle} />
      <input type="number" value={dur?.minutes ?? ""} onChange={e => onChange({ ...svc, durations: [{ minutes: parseInt(e.target.value) || 0, price: dur?.price }] })} placeholder="min" style={inputStyle} />
      <input type="number" value={dur?.price ?? ""} onChange={e => onChange({ ...svc, durations: [{ minutes: dur?.minutes || 60, price: parseFloat(e.target.value) || 0 }] })} placeholder="$ price" style={{ ...inputStyle, textAlign: "right" }} />
      {svc.flat_price_label && <span style={{ fontSize: 10, color: "var(--aurion-accent)" }}>{svc.flat_price_label}</span>}
      <button onClick={onDelete} style={iconBtn}><Trash2 size={12} /></button>
    </div>
  );
}

function ImportTab() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const submit = async () => {
    setBusy(true);
    try { setResult(await (await fetch(`${API}/api/spa-builder/import`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text_content: text }) })).json()); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Card>
        <div style={{ fontSize: 12, marginBottom: 8 }}>Paste spa menu text — AI parses it into categories + services + durations + pricing.</div>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={12} placeholder="Paste menu text…" data-testid="spa-import-text" style={{ ...inputStyle, fontFamily: "inherit" }} />
        <button onClick={submit} disabled={busy || text.length < 50} data-testid="spa-import-btn" style={{ ...primaryBtn, marginTop: 10 }}>
          {busy ? "Parsing…" : "AI parse"}
        </button>
      </Card>
      {result && <Card><pre style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2).slice(0, 2000)}</pre></Card>}
    </div>
  );
}

function PreviewTab() {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Card>
        <div style={{ fontSize: 11, color: "var(--aurion-text-muted)", letterSpacing: 1.4, textTransform: "uppercase" }}>Preview as guest</div>
        <div style={{ marginTop: 4, fontSize: 11, color: "var(--aurion-watch)" }}>📋 This is exactly what a guest sees when they scan the Spa QR.</div>
      </Card>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <iframe src={`${API}/spa/main`} title="Guest preview" data-testid="spa-preview-iframe"
          style={{ width: 420, height: 720, border: "8px solid #1a1a1a", borderRadius: 32, background: "#0a0e17", boxShadow: "0 12px 60px rgba(0,0,0,0.4)" }} />
      </div>
    </div>
  );
}

function QrTab() {
  const [qr, setQr] = useState<any>(null);
  useEffect(() => { (async () => setQr(await (await fetch(`${API}/api/spa-builder/qr`)).json()))(); }, []);
  if (!qr) return <Loading />;
  return (
    <Card>
      <h3 style={cardHead}>Spa Booking QR · public guest page</h3>
      <img src={qr.data_url} alt="QR" style={{ width: 220, height: 220, background: "white", padding: 8, borderRadius: 8 }} />
      <div style={{ marginTop: 8, fontSize: 11, color: "var(--aurion-text-secondary)" }}>{qr.url}</div>
    </Card>
  );
}

function BookingsTab() {
  const [b, setB] = useState<any[]>([]);
  useEffect(() => { (async () => setB(((await (await fetch(`${API}/api/spa-builder/bookings`)).json()).bookings) || []))(); }, []);
  return (
    <Card>
      <h3 style={cardHead}>Booking requests · {b.length}</h3>
      <div style={{ display: "grid", gap: 6 }}>
        {b.map(x => (
          <div key={x.booking_id} style={{ padding: 10, borderRadius: 8, background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)", fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 8 }}>
            <strong>{x.guest_name} · Room {x.room_no || "—"}</strong>
            <span>{x.service_name} · {x.duration_minutes}m</span>
            <span style={{ fontWeight: 700, color: "var(--aurion-accent)" }}>{x.requested_for}</span>
            <span style={statusPill(x.status === "pending" ? "draft" : "ok")}>{x.status}</span>
          </div>
        ))}
        {b.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "var(--aurion-text-muted)" }}>No booking requests yet.</div>}
      </div>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section style={{ padding: 16, borderRadius: 10, background: "var(--aurion-surface-elevated)", border: "1px solid var(--aurion-border)" }}>{children}</section>;
}
function Loading() { return <div style={{ padding: 40, textAlign: "center", color: "var(--aurion-text-muted)" }}>Loading…</div>; }
function statusPill(s: string): React.CSSProperties {
  const map: Record<string, [string, string]> = {
    ok: ["rgba(16,185,129,0.14)", "var(--aurion-healthy)"],
    live: ["rgba(16,185,129,0.14)", "var(--aurion-healthy)"],
    test: ["rgba(245,158,11,0.14)", "var(--aurion-watch)"],
    draft: ["rgba(100,116,139,0.14)", "var(--aurion-text-muted)"],
  };
  const [bg, fg] = map[s] || map.draft;
  return { padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", background: bg, color: fg };
}
const shell: React.CSSProperties = { minHeight: "100%", background: "var(--aurion-panel-bg, #0a0e17)", color: "var(--aurion-text-primary, #e2e8f0)", fontFamily: "system-ui, sans-serif" };
const headStyle: React.CSSProperties = { padding: "20px 28px 12px", borderBottom: "1px solid var(--aurion-border)" };
const tabBar: React.CSSProperties = { display: "flex", gap: 2, padding: "0 28px", borderBottom: "1px solid var(--aurion-border)", overflowX: "auto" };
const tabBtn = (active: boolean): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", border: "none", background: "transparent", color: active ? "var(--aurion-accent)" : "var(--aurion-text-secondary)", borderBottom: `2px solid ${active ? "var(--aurion-accent)" : "transparent"}`, fontSize: 13, fontWeight: active ? 600 : 500, cursor: "pointer" });
const cardHead: React.CSSProperties = { margin: "0 0 12px", fontSize: 11, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--aurion-text-muted)" };
const inputStyle: React.CSSProperties = { padding: "8px 10px", borderRadius: 6, border: "1px solid var(--aurion-border)", background: "var(--aurion-surface)", color: "var(--aurion-text-primary)", WebkitTextFillColor: "var(--aurion-text-primary)", colorScheme: "normal", fontSize: 12, width: "100%", boxSizing: "border-box" };
const primaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "var(--aurion-accent)", color: "#0b0f14", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 12 };
const secondaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid var(--aurion-border)", color: "var(--aurion-text-primary)", cursor: "pointer", fontSize: 12, fontWeight: 600 };
const livePublishBtn: React.CSSProperties = { ...primaryBtn, background: "var(--aurion-healthy)", color: "white" };
const iconBtn: React.CSSProperties = { padding: 6, borderRadius: 6, background: "transparent", border: "1px solid var(--aurion-border)", color: "var(--aurion-text-secondary)", cursor: "pointer" };
