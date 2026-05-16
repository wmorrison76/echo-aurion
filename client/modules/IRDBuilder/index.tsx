/**
 * IRD Menu Builder · Echo AURION (iter263.4)
 * For IRD Manager / FOH F&B Director / Culinary Director / Admin profiles.
 * Tabs: Builder · Amenities · Import · Test Mode · QR · Orders
 * Backend: /api/ird-builder/*, /api/ird-public/*
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  Upload, QrCode, Edit3, Eye, Send, Printer, RefreshCw, Plus, Trash2,
  CheckCircle2, FileText, Coffee, Sparkles,
} from "lucide-react";

const API = window.location.origin;

type IrdItem = { id: string; name: string; description?: string; price?: number; price_glass?: number; price_bottle?: number; dietary_flags?: string[]; available?: boolean; available_from?: string; available_until?: string; count_remaining?: number; lead_time_hours?: number };
type IrdSection = { id: string; header: string; availability?: string; available_now?: boolean; available_from?: string; available_until?: string; items: IrdItem[] };
type IrdMenu = { slug: string; title: string; subtitle: string; sections: IrdSection[]; service_notes: string[]; is_live: boolean; test_mode: boolean };

const TABS = [
  { id: "builder", label: "Menu Builder", icon: Edit3 },
  { id: "amenities", label: "Amenities", icon: Sparkles },
  { id: "import",  label: "Drag-Drop Import", icon: Upload },
  { id: "preview", label: "Preview", icon: Eye },
  { id: "qr",      label: "QR Code", icon: QrCode },
  { id: "orders",  label: "Orders", icon: Coffee },
] as const;

export default function IrdMenuBuilder() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("builder");
  return (
    <div data-testid="ird-builder" style={shell}>
      <Header />
      <div style={tabBar}>
        {TABS.map(t => {
          const Icon = t.icon, active = t.id === tab;
          return (
            <button key={t.id} data-testid={`ird-tab-${t.id}`} onClick={() => setTab(t.id)} style={tabBtn(active)}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>
      <div style={{ padding: "18px 28px 48px" }}>
        {tab === "builder" && <BuilderTab slug="main" key="main" />}
        {tab === "amenities" && <BuilderTab slug="amenities" key="amen" />}
        {tab === "import" && <ImportTab />}
        {tab === "preview" && <PreviewTab />}
        {tab === "qr" && <QrTab />}
        {tab === "orders" && <OrdersTab />}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={headStyle}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>In-Room Dining · Menu Builder</h1>
      <div style={{ marginTop: 4, fontSize: 12, color: "var(--aurion-text-secondary)" }}>
        Drag-drop a PDF or Word menu → AI auto-generates a guest-facing ordering site.
        Edit, preview in test mode, then publish. Guests scan a QR to order; orders auto-route to printers.
      </div>
    </div>
  );
}

// ════════ BUILDER ════════
function BuilderTab({ slug }: { slug: string }) {
  const [menu, setMenu] = useState<IrdMenu | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`${API}/api/ird-builder/menu?slug=${slug}`);
    setMenu(await r.json());
  }, [slug]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!menu) return;
    setBusy(true);
    try {
      await fetch(`${API}/api/ird-builder/menu`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(menu) });
      setSavedAt(new Date().toLocaleTimeString());
    } finally { setBusy(false); }
  };
  const publish = async (testMode: boolean) => {
    setBusy(true);
    try {
      await fetch(`${API}/api/ird-builder/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, test_mode: testMode }) });
      await load();
    } finally { setBusy(false); }
  };

  if (!menu) return <Loading />;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Title" value={menu.title} onChange={v => setMenu({ ...menu, title: v })} testid="ird-title" />
          <Field label="Subtitle" value={menu.subtitle} onChange={v => setMenu({ ...menu, subtitle: v })} testid="ird-subtitle" />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
          <button onClick={save} disabled={busy} data-testid="ird-save" style={primaryBtn}>{busy ? "Saving…" : "Save draft"}</button>
          <button onClick={() => publish(true)} disabled={busy} data-testid="ird-publish-test" style={secondaryBtn}>Publish · TEST mode</button>
          <button onClick={() => publish(false)} disabled={busy} data-testid="ird-publish-live" style={livePublishBtn}>Publish · LIVE</button>
          <span style={statusPill(menu.is_live ? (menu.test_mode ? "test" : "live") : "draft")}>
            {menu.is_live ? (menu.test_mode ? "LIVE · TEST" : "LIVE") : "DRAFT"}
          </span>
          {savedAt && <span style={{ fontSize: 11, color: "var(--aurion-healthy)" }}>✓ saved {savedAt}</span>}
        </div>
      </Card>
      <div style={{ display: "grid", gap: 12 }}>
        {menu.sections.map((s, si) => (
          <SectionEditor key={s.id} section={s}
            onChange={(ns) => { const arr = [...menu.sections]; arr[si] = ns; setMenu({ ...menu, sections: arr }); }}
            onDelete={() => setMenu({ ...menu, sections: menu.sections.filter((_, i) => i !== si) })}
          />
        ))}
        <button onClick={() => setMenu({ ...menu, sections: [...menu.sections, { id: `sec-${Date.now()}`, header: "New Section", items: [] }] })}
          data-testid="ird-add-section" style={ghostBtn}>
          <Plus size={14} /> Add section
        </button>
      </div>
    </div>
  );
}

function SectionEditor({ section, onChange, onDelete }: { section: IrdSection; onChange: (s: IrdSection) => void; onDelete: () => void }) {
  return (
    <Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px auto", gap: 8, alignItems: "center" }}>
        <input value={section.header} onChange={e => onChange({ ...section, header: e.target.value })}
          data-testid={`ird-section-${section.id}-header`} style={{ ...inputStyle, fontWeight: 700, fontSize: 14 }} />
        <input type="time" value={section.available_from || ""} onChange={e => onChange({ ...section, available_from: e.target.value, availability: _winLabel(e.target.value, section.available_until) })}
          data-testid={`ird-section-${section.id}-from`} title="Available from" style={{ ...inputStyle, fontSize: 11 }} />
        <input type="time" value={section.available_until || ""} onChange={e => onChange({ ...section, available_until: e.target.value, availability: _winLabel(section.available_from, e.target.value) })}
          data-testid={`ird-section-${section.id}-until`} title="Available until" style={{ ...inputStyle, fontSize: 11 }} />
        <button onClick={onDelete} data-testid={`ird-section-${section.id}-delete`} style={iconBtn} title="Delete section"><Trash2 size={14} /></button>
      </div>
      <div style={{ fontSize: 10, color: "var(--aurion-text-muted)", marginTop: 4 }}>
        {section.availability || "All-day (no restriction)"}
        {(section.available_from || section.available_until) && " · enforced on guest QR"}
      </div>
      <div style={{ display: "grid", gap: 4, marginTop: 10 }}>
        {section.items.map((it, ii) => (
          <ItemRow key={it.id} item={it}
            onChange={(ni) => { const arr = [...section.items]; arr[ii] = ni; onChange({ ...section, items: arr }); }}
            onDelete={() => onChange({ ...section, items: section.items.filter((_, i) => i !== ii) })} />
        ))}
        <button onClick={() => onChange({ ...section, items: [...section.items, { id: `it-${Date.now()}`, name: "New item", price: 0, dietary_flags: [], available: true }] })}
          data-testid={`ird-section-${section.id}-add-item`} style={{ ...ghostBtn, fontSize: 11 }}>
          <Plus size={12} /> Add item
        </button>
      </div>
    </Card>
  );
}

function _winLabel(from?: string, until?: string): string {
  const fmt = (t?: string) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };
  if (!from && !until) return "";
  return `${fmt(from)} - ${fmt(until)}`;
}

function ItemRow({ item, onChange, onDelete }: { item: IrdItem; onChange: (it: IrdItem) => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ padding: "6px 8px", borderRadius: 6, background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 80px 90px auto auto auto", gap: 6, alignItems: "center" }}>
        <input value={item.name} onChange={e => onChange({ ...item, name: e.target.value })} placeholder="Name" style={inputStyle} />
        <input value={item.description || ""} onChange={e => onChange({ ...item, description: e.target.value })} placeholder="Description" style={inputStyle} />
        <input type="number" value={item.price ?? ""} onChange={e => onChange({ ...item, price: parseFloat(e.target.value) || undefined })} placeholder="Price" style={{ ...inputStyle, textAlign: "right" }} />
        <input type="number" value={item.count_remaining ?? ""} onChange={e => onChange({ ...item, count_remaining: e.target.value === "" ? undefined : parseInt(e.target.value) || 0 })} placeholder="Qty left" title="Counts remaining (auto-hide at 0). Blank = unlimited." style={{ ...inputStyle, textAlign: "right", color: (item.count_remaining ?? 999) <= 0 ? "var(--aurion-critical)" : undefined }} />
        <button onClick={() => setExpanded(!expanded)} title="More" style={{ ...iconBtn, color: expanded ? "var(--aurion-accent)" : undefined }}>
          {expanded ? "−" : "…"}
        </button>
        <button onClick={() => onChange({ ...item, available: !item.available })} title={item.available ? "Available" : "Unavailable"}
          style={{ ...iconBtn, color: item.available ? "var(--aurion-healthy)" : "var(--aurion-text-muted)" }}>
          {item.available ? <CheckCircle2 size={14} /> : <Eye size={14} />}
        </button>
        <button onClick={onDelete} style={iconBtn}><Trash2 size={12} /></button>
      </div>
      {expanded && (
        <div style={{ display: "grid", gridTemplateColumns: "120px 120px 120px 1fr", gap: 6, alignItems: "center", marginTop: 6, paddingTop: 6, borderTop: "1px dashed var(--aurion-border)" }}>
          <label style={miniLabel}>From: <input type="time" value={item.available_from || ""} onChange={e => onChange({ ...item, available_from: e.target.value })} style={{ ...inputStyle, fontSize: 11 }} /></label>
          <label style={miniLabel}>Until: <input type="time" value={item.available_until || ""} onChange={e => onChange({ ...item, available_until: e.target.value })} style={{ ...inputStyle, fontSize: 11 }} /></label>
          <label style={miniLabel}>Lead-hrs: <input type="number" value={item.lead_time_hours ?? ""} onChange={e => onChange({ ...item, lead_time_hours: e.target.value === "" ? undefined : parseFloat(e.target.value) })} placeholder="e.g. 72 for cake" style={{ ...inputStyle, fontSize: 11 }} /></label>
          <span style={{ fontSize: 10, color: "var(--aurion-text-muted)" }}>
            {(item.available_from || item.available_until) ? "Per-item window overrides section." : "Inherits section window."}
            {item.lead_time_hours ? ` Requires ${item.lead_time_hours}h notice.` : ""}
          </span>
        </div>
      )}
    </div>
  );
}

// ════════ IMPORT ════════
function ImportTab() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || "").slice(0, 18000));
    reader.readAsText(file);
  };

  const submit = async (slug: string) => {
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/ird-builder/import`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text_content: text, slug }),
      });
      setResult(await r.json());
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Card>
        <div style={{ fontSize: 12, color: "var(--aurion-text-secondary)", marginBottom: 8 }}>
          Drop a PDF or Word doc below, or paste the menu text. The AI will parse it into structured sections + items + dietary flags.
        </div>
        <div onDrop={onDrop} onDragOver={e => e.preventDefault()} data-testid="ird-import-drop"
          style={{ minHeight: 180, padding: 16, borderRadius: 10, border: "2px dashed var(--aurion-accent)", background: "var(--aurion-surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Upload size={32} style={{ color: "var(--aurion-accent)" }} />
          <div style={{ marginTop: 8, fontSize: 13 }}>Drag & drop a PDF or Word file here</div>
          <div style={{ fontSize: 11, color: "var(--aurion-text-muted)", marginTop: 4 }}>or paste content below</div>
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={10} placeholder="Paste menu text…"
          data-testid="ird-import-text"
          style={{ ...inputStyle, marginTop: 10, fontFamily: "inherit" }} />
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={() => submit("main")} disabled={busy || text.length < 50} data-testid="ird-import-main-btn" style={primaryBtn}>
            {busy ? "Parsing…" : "AI parse → Main Menu"}
          </button>
          <button onClick={() => submit("amenities")} disabled={busy || text.length < 50} data-testid="ird-import-amen-btn" style={secondaryBtn}>
            AI parse → Amenities
          </button>
        </div>
      </Card>
      {result && (
        <Card>
          <pre style={{ fontSize: 11, lineHeight: 1.5, color: "var(--aurion-text-secondary)", whiteSpace: "pre-wrap", maxHeight: 360, overflow: "auto" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}

// ════════ PREVIEW (real guest experience) ════════
function PreviewTab() {
  const [slug, setSlug] = useState<"main" | "amenities">("main");
  const url = `${API}/${slug === "main" ? "ird/main" : "ird/amenities"}`;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Card>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--aurion-text-muted)", letterSpacing: 1.4, textTransform: "uppercase" }}>Preview as guest:</span>
          <button onClick={() => setSlug("main")} data-testid="ird-preview-main" style={{ ...secondaryBtn, background: slug === "main" ? "var(--aurion-accent-soft)" : "transparent" }}>Main Menu</button>
          <button onClick={() => setSlug("amenities")} data-testid="ird-preview-amen" style={{ ...secondaryBtn, background: slug === "amenities" ? "var(--aurion-accent-soft)" : "transparent" }}>Amenities</button>
          <span style={{ flex: 1 }} />
          <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--aurion-accent)", textDecoration: "none" }}>Open in new tab ↗</a>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--aurion-watch)" }}>
          📋 This is exactly what a guest sees when they scan the QR. Time-windowed sections auto-hide outside their hours.
        </div>
      </Card>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <iframe key={slug} src={url} title="Guest preview" data-testid="ird-preview-iframe"
          style={{ width: 420, height: 720, border: "8px solid #1a1a1a", borderRadius: 32, background: "#0a0e17", boxShadow: "0 12px 60px rgba(0,0,0,0.4)" }} />
      </div>
    </div>
  );
}

// ════════ QR ════════
function QrTab() {
  const [main, setMain] = useState<any>(null);
  const [amen, setAmen] = useState<any>(null);
  useEffect(() => {
    (async () => {
      setMain(await (await fetch(`${API}/api/ird-builder/qr?slug=main`)).json());
      setAmen(await (await fetch(`${API}/api/ird-builder/qr?slug=amenities`)).json());
    })();
  }, []);
  if (!main || !amen) return <Loading />;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Card>
        <h3 style={cardHead}>Guest Ordering QR · Main Menu</h3>
        <img src={main.data_url} alt="QR" style={{ width: 220, height: 220, background: "white", padding: 8, borderRadius: 8 }} />
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--aurion-text-secondary)" }}>{main.url}</div>
      </Card>
      <Card>
        <h3 style={cardHead}>Amenity QR (in-room cards)</h3>
        <img src={amen.data_url} alt="QR" style={{ width: 220, height: 220, background: "white", padding: 8, borderRadius: 8 }} />
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--aurion-text-secondary)" }}>{amen.url}</div>
      </Card>
    </div>
  );
}

// ════════ ORDERS ════════
function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all"|"test"|"live">("all");
  const load = useCallback(async () => {
    const q = filter === "all" ? "" : `?test_mode=${filter === "test"}`;
    const r = await fetch(`${API}/api/ird-builder/orders${q}`);
    setOrders((await r.json()).orders || []);
  }, [filter]);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const print = async (id: string) => {
    await fetch(`${API}/api/ird-builder/orders/${id}/route-print?station=main-kitchen`, { method: "POST" });
    load();
  };

  return (
    <Card>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["all","test","live"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} data-testid={`ird-filter-${f}`}
            style={{ ...secondaryBtn, background: filter === f ? "var(--aurion-accent-soft)" : "transparent" }}>
            {f.toUpperCase()}
          </button>
        ))}
        <button onClick={load} style={iconBtn}><RefreshCw size={14} /></button>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {orders.map(o => (
          <div key={o.order_id} data-testid={`ird-order-${o.order_id}`} style={{
            padding: 12, borderRadius: 8, background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)",
            display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: 10, alignItems: "center", fontSize: 12,
          }}>
            <strong style={{ color: "var(--aurion-accent)" }}>Room {o.room_no}</strong>
            <span>{o.items.map((it: any) => `${it.qty}× ${it.name}`).join(" · ")}</span>
            <span style={{ fontWeight: 700 }}>${o.grand_total?.toFixed(2)}</span>
            <span style={statusPill(o.test_mode ? "test" : (o.status === "printed" ? "ok" : "draft"))}>{o.test_mode ? "TEST" : o.status}</span>
            <button onClick={() => print(o.order_id)} data-testid={`ird-print-${o.order_id}`} style={primaryBtn}>
              <Printer size={12} /> Route to printer
            </button>
          </div>
        ))}
        {orders.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "var(--aurion-text-muted)" }}>No orders yet.</div>}
      </div>
    </Card>
  );
}

// ════════ shared primitives ════════
function Card({ children }: { children: React.ReactNode }) {
  return <section style={{ padding: 16, borderRadius: 10, background: "var(--aurion-surface-elevated)", border: "1px solid var(--aurion-border)" }}>{children}</section>;
}
function Field({ label, value, onChange, testid }: { label: string; value: string; onChange: (v: string) => void; testid?: string }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--aurion-text-muted)", letterSpacing: 1.4, textTransform: "uppercase" }}>{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} data-testid={testid} style={inputStyle} />
    </label>
  );
}
function Loading() {
  return <div style={{ padding: 40, textAlign: "center", color: "var(--aurion-text-muted)" }}>Loading…</div>;
}
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
const tabBtn = (active: boolean): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", border: "none", background: "transparent", color: active ? "var(--aurion-accent)" : "var(--aurion-text-secondary)", borderBottom: `2px solid ${active ? "var(--aurion-accent)" : "transparent"}`, fontSize: 13, fontWeight: active ? 600 : 500, cursor: "pointer", whiteSpace: "nowrap" });
const cardHead: React.CSSProperties = { margin: "0 0 12px", fontSize: 11, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--aurion-text-muted)" };
const inputStyle: React.CSSProperties = { padding: "8px 10px", borderRadius: 6, border: "1px solid var(--aurion-border)", background: "var(--aurion-surface)", color: "var(--aurion-text-primary)", WebkitTextFillColor: "var(--aurion-text-primary)", colorScheme: "normal", fontSize: 12, width: "100%", boxSizing: "border-box" };
const miniLabel: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 2, fontSize: 10, color: "var(--aurion-text-muted)", letterSpacing: 0.6, textTransform: "uppercase" };
const primaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "var(--aurion-accent)", color: "#0b0f14", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 12 };
const secondaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid var(--aurion-border)", color: "var(--aurion-text-primary)", cursor: "pointer", fontSize: 12, fontWeight: 600 };
const livePublishBtn: React.CSSProperties = { ...primaryBtn, background: "var(--aurion-healthy)", color: "white" };
const ghostBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, background: "transparent", border: "1px dashed var(--aurion-border)", color: "var(--aurion-text-secondary)", cursor: "pointer", fontSize: 12 };
const iconBtn: React.CSSProperties = { padding: 6, borderRadius: 6, background: "transparent", border: "1px solid var(--aurion-border)", color: "var(--aurion-text-secondary)", cursor: "pointer" };
