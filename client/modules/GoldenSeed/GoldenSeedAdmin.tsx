/**
 * Golden Seed Admin — iter164
 * Spawn new custom-OS platforms from the EchoAi³ architecture. Admin-gated.
 *
 * Routes:
 *   /seed/admin → this panel (spawn form + list + downloads)
 */
import React, { useEffect, useState } from "react";
import { adminFetch, ensureAdminToken, clearAdminToken, getAdminToken } from "../../lib/admin-auth";

const API = (import.meta as any).env?.VITE_BACKEND_URL || (window as any).__BACKEND_URL__ || "";
const API_URL = API || (typeof process !== "undefined" ? (process as any).env?.REACT_APP_BACKEND_URL : "") || "";

// Prefer REACT_APP_BACKEND_URL from Vite-compatible runtime env
function backendUrl(): string {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || API_URL || "";
}

interface Spawn {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  templates: string[];
  brand_color?: string;
  owner_email?: string;
  status: string;
  created_at: string;
}

interface Pillar { id: string; label: string; desc: string; }
interface Template { id: string; label: string; description?: string; proven_in?: string[]; }

export default function GoldenSeedAdmin() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [spawns, setSpawns] = useState<Spawn[]>([]);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(["stripe-standalone", "admin-dashboard"]);
  const [brandColor, setBrandColor] = useState("#c8a97e");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [authed, setAuthed] = useState<boolean>(false);

  useEffect(() => {
    const ok = ensureAdminToken();
    setAuthed(ok);
    if (ok) loadAll();
    // Public endpoints (no auth)
    fetch(`${backendUrl()}/api/seed/pillars`).then(r => r.json()).then(j => setPillars(j.pillars || [])).catch(() => {});
    fetch(`${backendUrl()}/api/seed/manifest`).then(r => r.json()).then(j => setTemplates(j.templates || [])).catch(() => {});
  }, []);

  async function loadAll() {
    setErr(null);
    try {
      const r = await adminFetch(`${backendUrl()}/api/seed/spawns`);
      if (r.status === 401 || r.status === 403) { setAuthed(false); clearAdminToken(); setErr("Admin token rejected. Reload to re-enter."); return; }
      const j = await r.json();
      setSpawns(j.spawns || []);
    } catch (e: any) { setErr(e?.message || "Failed to load spawns"); }
  }

  async function spawn() {
    if (!name.trim()) { setErr("Name required"); return; }
    setLoading(true); setErr(null);
    try {
      const r = await adminFetch(`${backendUrl()}/api/seed/spawn`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain: domain || null, owner_email: ownerEmail || null, notes: notes || null, templates: selectedTemplates, brand_color: brandColor }),
      });
      if (!r.ok) throw new Error((await r.text()).slice(0, 180));
      const j = await r.json();
      setName(""); setDomain(""); setOwnerEmail(""); setNotes("");
      // Auto-download the tarball right away
      await download(j.spawn_id, j.spec?.slug || "platform");
      await loadAll();
    } catch (e: any) { setErr(e?.message || "Spawn failed"); }
    finally { setLoading(false); }
  }

  async function download(spawnId: string, slug: string) {
    const r = await adminFetch(`${backendUrl()}/api/seed/download/${spawnId}`);
    if (!r.ok) { setErr(`Download failed: ${r.status}`); return; }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-goldenseed.tar.gz`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function toggleTemplate(id: string) {
    setSelectedTemplates(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  return (
    <div data-testid="golden-seed-admin" style={S.root}>
      <header style={S.header}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" }}>EchoAi³ · Golden Seed</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f8fafc", marginTop: 4 }}>Plant a seed. EchoCoder grows the OS.</h1>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4, maxWidth: 640 }}>
            A seed is the smallest unit of platform intent. EchoAi³ awakens, asks clarifying questions,
            and — with <strong style={{ color: "#c8a97e" }}>ZARO Guardian</strong> gating every artifact —
            grows your custom OS from it. Below is the classic template-based spawn; the full seed-to-app
            conversational flow lives inside <code style={{ color: "#c8a97e" }}>EchoCoder</code>.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a href="/seed/plant" style={{ ...S.primaryBtn, textDecoration: "none", display: "inline-block" }} data-testid="seed-admin-plant-cta">🌱 Plant a seed (Co-Build Studio)</a>
        {authed ? (
            <button data-testid="seed-admin-clear-token" onClick={() => { clearAdminToken(); setAuthed(false); }} style={S.ghostBtn}>Clear admin token</button>
          ) : (
            <button data-testid="seed-admin-set-token" onClick={() => { if (ensureAdminToken()) { setAuthed(true); loadAll(); } }} style={S.primaryBtn}>Set admin token</button>
          )}
        </div>
      </header>

      {err && <div data-testid="seed-admin-err" style={S.err}>{err}</div>}

      {/* Pillars strip */}
      <section style={S.section}>
        <div style={S.sectionTitle}>The seven pillars</div>
        <div style={S.pillarsGrid}>
          {pillars.map(p => (
            <div key={p.id} style={S.pillarCard} data-testid={`seed-pillar-${p.id}`}>
              <div style={{ fontSize: 11, color: "#c8a97e", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>{p.id}</div>
              <div style={{ fontSize: 14, color: "#f8fafc", fontWeight: 600, marginTop: 4 }}>{p.label}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Spawn form */}
      <section style={S.section}>
        <div style={S.sectionTitle}>New platform spawn</div>
        <div style={S.formGrid}>
          <label style={S.field}>
            <span style={S.label}>Platform name</span>
            <input data-testid="seed-spawn-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Custom OS" style={S.input} />
          </label>
          <label style={S.field}>
            <span style={S.label}>Domain (optional)</span>
            <input data-testid="seed-spawn-domain" value={domain} onChange={e => setDomain(e.target.value)} placeholder="app.example.com" style={S.input} />
          </label>
          <label style={S.field}>
            <span style={S.label}>Owner email</span>
            <input data-testid="seed-spawn-email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} placeholder="owner@example.com" style={S.input} />
          </label>
          <label style={S.field}>
            <span style={S.label}>Brand color</span>
            <input data-testid="seed-spawn-color" value={brandColor} onChange={e => setBrandColor(e.target.value)} type="text" style={{ ...S.input, fontFamily: "monospace" }} />
          </label>
          <label style={{ ...S.field, gridColumn: "1 / -1" }}>
            <span style={S.label}>Notes (optional)</span>
            <textarea data-testid="seed-spawn-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="What problem does this platform solve?" style={{ ...S.input, minHeight: 70, resize: "vertical" }} />
          </label>

          <div style={{ gridColumn: "1 / -1" }}>
            <span style={S.label}>Templates to include</span>
            <div style={S.templateChips}>
              {templates.map(t => {
                const on = selectedTemplates.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    data-testid={`seed-template-${t.id}`}
                    onClick={() => toggleTemplate(t.id)}
                    style={{ ...S.chip, ...(on ? S.chipOn : {}) }}
                    title={t.description || t.label}
                  >
                    {t.label}
                    {t.proven_in && t.proven_in.length > 0 && <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 10 }}>· {t.proven_in.join(", ")}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, marginTop: 6 }}>
            <button data-testid="seed-spawn-submit" disabled={loading || !authed} onClick={spawn} style={{ ...S.primaryBtn, opacity: (loading || !authed) ? 0.5 : 1 }}>
              {loading ? "Spawning…" : "Spawn platform & download tarball"}
            </button>
            {!authed && <span style={{ color: "#f59e0b", fontSize: 12, alignSelf: "center" }}>Admin token required</span>}
          </div>
        </div>
      </section>

      {/* Existing spawns */}
      <section style={S.section}>
        <div style={S.sectionTitle}>Previous spawns ({spawns.length})</div>
        {spawns.length === 0 && <div style={S.empty}>No spawns yet. Fill the form above to create your first custom OS scaffold.</div>}
        <div style={S.spawnList}>
          {spawns.map(s => (
            <div key={s.id} style={S.spawnRow} data-testid={`seed-spawn-${s.id}`}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: "#f8fafc", fontWeight: 700 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, fontFamily: "monospace" }}>{s.slug} · {s.id}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {s.templates.map(t => <span key={t} style={S.tag}>{t}</span>)}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <div style={{ fontSize: 10, color: "#64748b" }}>{new Date(s.created_at).toLocaleString()}</div>
                <button data-testid={`seed-spawn-dl-${s.id}`} onClick={() => download(s.id, s.slug)} style={S.primaryBtn}>Download .tar.gz</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { height: "100%", overflow: "auto", padding: "24px 28px", background: "#04060d", color: "#f8fafc", fontFamily: "'Inter', sans-serif" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, gap: 12, flexWrap: "wrap" },
  err: { padding: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 8, color: "#fecaca", fontSize: 13, marginBottom: 12 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#94a3b8", fontWeight: 700, marginBottom: 10 },
  pillarsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 },
  pillarCard: { padding: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(200,169,126,0.15)", borderRadius: 10 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 16 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 },
  input: { padding: "10px 12px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#f8fafc", fontSize: 14, outline: "none" },
  primaryBtn: { padding: "10px 16px", borderRadius: 8, background: "rgba(200,169,126,0.15)", border: "1px solid rgba(200,169,126,0.4)", color: "#c8a97e", fontWeight: 700, fontSize: 13, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1 },
  ghostBtn: { padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#cbd5e1", fontSize: 12, cursor: "pointer" },
  templateChips: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: { padding: "6px 12px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: 12, cursor: "pointer" },
  chipOn: { background: "rgba(200,169,126,0.15)", border: "1px solid rgba(200,169,126,0.5)", color: "#c8a97e", fontWeight: 600 },
  empty: { padding: 28, textAlign: "center", color: "#64748b", fontSize: 13, background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 10 },
  spawnList: { display: "flex", flexDirection: "column", gap: 8 },
  spawnRow: { display: "flex", gap: 14, padding: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, alignItems: "flex-start" },
  tag: { fontSize: 10, padding: "2px 8px", background: "rgba(200,169,126,0.08)", border: "1px solid rgba(200,169,126,0.25)", borderRadius: 999, color: "#c8a97e", textTransform: "uppercase", letterSpacing: 1 },
};
