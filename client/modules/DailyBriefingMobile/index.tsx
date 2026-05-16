/**
 * iter185 · Daily Briefing Mobile (staff catch-up)
 *
 * Route: /m/briefing/:token
 * Read-only mobile view of today's standup for staff who missed the live session.
 */
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};

type Section = { id: string; label: string; dept?: string; layout?: string; approved?: boolean; content: any; updated_at?: string };
type Briefing = { date?: string; internal_name?: string; status?: string; confirmed_by?: string; confirmed_at?: string; sent_at?: string; sections?: Section[]; message?: string };

export default function DailyBriefingMobile() {
  const { token } = useParams<{ token: string }>();
  const [brief, setBrief] = useState<Briefing | null>(null);
  const [staff, setStaff] = useState<{ name?: string; role?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const headers = { "X-Briefing-Token": token || "" };
        const [sRes, bRes] = await Promise.all([
          fetch(`${API()}/api/daily-briefing/session`, { headers }),
          fetch(`${API()}/api/daily-briefing/today`, { headers }),
        ]);
        if (sRes.status === 401 || sRes.status === 410) {
          setErr(sRes.status === 410 ? "Your briefing link has expired — please request a new one." : "This briefing link is invalid or revoked.");
          return;
        }
        const sJ = await sRes.json(); setStaff(sJ.staff || null);
        const bJ = await bRes.json(); setBrief(bJ);
      } catch (e: any) {
        setErr(`Couldn't load briefing — ${e.message || e}`);
      } finally { setLoading(false); }
    })();
  }, [token]);

  if (loading) return <div style={S.loading}>Loading briefing…</div>;
  if (err) return <div style={S.errorRoot}><div style={S.errorCard}>{err}</div></div>;

  return (
    <div data-testid="briefing-root" style={S.root}>
      <header style={S.header}>
        <div style={S.eyebrow}>Luccca · Daily Briefing</div>
        <h1 style={S.title}>{brief?.internal_name || "Daily Briefing"}</h1>
        <div style={S.subtitle}>
          {brief?.date ? new Date(brief.date + "T12:00:00Z").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "—"}
          {brief?.status && <span style={{ ...S.pill, marginLeft: 8 }} data-testid="briefing-status">{brief.status}</span>}
        </div>
        {staff?.name && <div style={S.staff}>Hi {firstName(staff.name)}{staff.role ? ` · ${staff.role}` : ""}</div>}
      </header>

      {(!brief?.sections || brief.sections.length === 0) && (
        <div data-testid="briefing-empty" style={S.emptyCard}>
          <div style={{ fontSize: 26, marginBottom: 6 }}>🌅</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{brief?.message || "No briefing posted yet."}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>Check back after the morning standup is locked.</div>
        </div>
      )}

      {(brief?.sections || []).map((sec) => (
        <SectionCard key={sec.id} sec={sec} />
      ))}

      {staff && <DeliveryPreferenceCard token={token || ""} />}

      <div style={S.foot}>Tap any section to copy. For updates contact the concierge desk.</div>
    </div>
  );
}

// ─── Delivery preference toggle ────────────────────────────────────────────
function DeliveryPreferenceCard({ token }: { token: string }) {
  const [pref, setPref] = useState<string>("both");
  const [opts, setOpts] = useState<string[]>(["both", "email", "sms", "off"]);
  const [hasEmail, setHasEmail] = useState(true);
  const [hasPhone, setHasPhone] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API()}/api/daily-briefing/preference`, { headers: { "X-Briefing-Token": token } });
        if (!r.ok) return;
        const j = await r.json();
        setPref(j.delivery_preference || "both");
        setOpts(j.options || ["both", "email", "sms", "off"]);
        setHasEmail(!!j.has_email); setHasPhone(!!j.has_phone);
      } catch {}
    })();
  }, [token]);

  async function update(next: string) {
    if (next === pref) return;
    setSaving(next);
    try {
      const r = await fetch(`${API()}/api/daily-briefing/preference`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-Briefing-Token": token },
        body: JSON.stringify({ delivery_preference: next }),
      });
      if (r.ok) {
        setPref(next);
        setFlash(next === "off" ? "Notifications off. You'll still get urgent updates." : `Preference saved · ${labelFor(next)}.`);
        setTimeout(() => setFlash(null), 2500);
      }
    } finally { setSaving(null); }
  }

  const labels: Record<string, { title: string; sub: string; emoji: string }> = {
    both: { title: "Both", sub: "Email preferred · SMS fallback", emoji: "📥" },
    email: { title: "Email only", sub: "Quiet phone · inbox push", emoji: "✉️" },
    sms: { title: "SMS only", sub: "On-the-go · text me", emoji: "📱" },
    off: { title: "Notifications off", sub: "I'll check manually", emoji: "🔕" },
  };
  const labelFor = (k: string) => labels[k]?.title || k;

  const disabledReason = (opt: string): string | null => {
    if (opt === "email" && !hasEmail) return "No email on file";
    if (opt === "sms" && !hasPhone) return "No phone on file";
    return null;
  };

  return (
    <section data-testid="briefing-pref-card" style={{ marginTop: 24, padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ fontSize: 9, letterSpacing: 3, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Notification preferences</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>How should we push the briefing to you?</div>
      <div style={{ display: "grid", gap: 6 }}>
        {opts.map((opt) => {
          const active = pref === opt;
          const dr = disabledReason(opt);
          const disabled = !!dr;
          return (
            <button
              key={opt}
              data-testid={`briefing-pref-${opt}`}
              disabled={disabled || saving === opt}
              onClick={() => update(opt)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer",
                border: active ? "1px solid rgba(200,169,126,0.5)" : "1px solid rgba(255,255,255,0.08)",
                background: active ? "rgba(200,169,126,0.1)" : "rgba(255,255,255,0.02)",
                opacity: disabled ? 0.4 : (saving === opt ? 0.6 : 1),
                color: "#f5efe4", textAlign: "left",
              }}
            >
              <span style={{ fontSize: 18 }}>{labels[opt]?.emoji || "•"}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 700 }}>{labels[opt]?.title || opt}</span>
                <span style={{ display: "block", fontSize: 11, color: "#94a3b8" }}>{dr || labels[opt]?.sub}</span>
              </span>
              {active && <span style={{ fontSize: 9, letterSpacing: 1.5, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700 }}>Selected</span>}
            </button>
          );
        })}
      </div>
      {flash && <div data-testid="briefing-pref-flash" style={{ marginTop: 10, fontSize: 11, color: "#86efac" }}>{flash}</div>}
    </section>
  );
}

function SectionCard({ sec }: { sec: Section }) {
  return (
    <section data-testid={`briefing-section-${sec.id}`} style={S.sectionCard}>
      <div style={S.sectionHead}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={S.sectionLabel}>{sec.label}</div>
          {sec.dept && <span style={S.deptPill}>{sec.dept}</span>}
        </div>
        {sec.approved && <span style={S.approvedPill} data-testid={`approved-${sec.id}`}>✓ Approved</span>}
      </div>
      <div style={{ marginTop: 8 }}>
        <RenderContent content={sec.content} layout={sec.layout} />
      </div>
    </section>
  );
}

function RenderContent({ content, layout }: { content: any; layout?: string }) {
  if (content === null || content === undefined || content === "") return <div style={S.empty}>—</div>;
  if (typeof content === "string") return <div style={S.text}>{content}</div>;
  if (Array.isArray(content)) {
    if (!content.length) return <div style={S.empty}>None</div>;
    return (
      <ul style={S.list}>
        {content.map((it, i) => (
          <li key={i} style={S.listItem}>{renderItem(it)}</li>
        ))}
      </ul>
    );
  }
  if (typeof content === "object") {
    const keys = Object.keys(content);
    if (layout === "ops_grid" || layout === "kpi_grid") {
      return (
        <div style={S.kpiGrid}>
          {keys.map(k => (
            <div key={k} style={S.kpiTile}>
              <div style={S.kpiLabel}>{prettyKey(k)}</div>
              <div style={S.kpiValue}>{stringify(content[k])}</div>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div style={S.kv}>
        {keys.map(k => (
          <div key={k} style={S.kvRow}>
            <span style={S.kvKey}>{prettyKey(k)}</span>
            <span style={S.kvVal}>{stringify(content[k])}</span>
          </div>
        ))}
      </div>
    );
  }
  return <div style={S.text}>{String(content)}</div>;
}

function renderItem(it: any) {
  if (typeof it === "string") return it;
  if (typeof it === "object" && it !== null) {
    // Common shapes: guest {name, room, tier}, duty {role, name}, group {name, count}
    const keys = Object.keys(it);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {keys.slice(0, 4).map(k => (
          <div key={k} style={{ fontSize: 12 }}>
            <span style={{ color: "#94a3b8", marginRight: 6 }}>{prettyKey(k)}:</span>
            <span style={{ color: "#f5efe4" }}>{stringify(it[k])}</span>
          </div>
        ))}
      </div>
    );
  }
  return String(it);
}

function stringify(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
function prettyKey(k: string): string {
  return k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
function firstName(n?: string) {
  if (!n) return "there";
  return n.split(/\s+/)[0];
}

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "radial-gradient(ellipse at top, #0f1523 0%, #050812 60%, #020307 100%)", color: "#f5efe4", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif", padding: "24px 18px 80px", maxWidth: 540, margin: "0 auto" },
  loading: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050812", color: "#c8a97e", fontFamily: "system-ui" },
  errorRoot: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050812", padding: 24 },
  errorCard: { maxWidth: 380, padding: 20, borderRadius: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 14, textAlign: "center", fontFamily: "system-ui" },
  header: { marginBottom: 18 },
  eyebrow: { fontSize: 9, letterSpacing: 4, textTransform: "uppercase", color: "#c8a97e", fontWeight: 700 },
  title: { fontSize: 30, margin: "8px 0 4px", fontWeight: 200, letterSpacing: -0.5, color: "#f5efe4" },
  subtitle: { fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center" },
  staff: { marginTop: 10, fontSize: 12, color: "#cbd5e1" },
  pill: { fontSize: 9, letterSpacing: 1.5, padding: "2px 8px", borderRadius: 999, background: "rgba(200,169,126,0.15)", color: "#c8a97e", textTransform: "uppercase", fontWeight: 700 },

  sectionCard: { padding: 14, marginBottom: 12, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" },
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  sectionLabel: { fontSize: 14, fontWeight: 700, color: "#f5efe4" },
  deptPill: { fontSize: 9, letterSpacing: 1, padding: "1px 6px", borderRadius: 999, background: "rgba(200,169,126,0.08)", color: "#c8a97e", textTransform: "uppercase", fontWeight: 700 },
  approvedPill: { fontSize: 9, letterSpacing: 1, padding: "2px 6px", borderRadius: 999, background: "rgba(34,197,94,0.1)", color: "#86efac", fontWeight: 700 },

  text: { fontSize: 13, color: "#cbd5e1", lineHeight: 1.55, whiteSpace: "pre-wrap" as const },
  empty: { fontSize: 11, color: "#64748b", fontStyle: "italic" as const },
  list: { margin: 0, paddingLeft: 16, color: "#cbd5e1", fontSize: 13, lineHeight: 1.6 },
  listItem: { marginBottom: 6 },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 },
  kpiTile: { padding: 10, borderRadius: 10, background: "rgba(200,169,126,0.05)", border: "1px solid rgba(200,169,126,0.15)" },
  kpiLabel: { fontSize: 9, letterSpacing: 1.5, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700 },
  kpiValue: { fontSize: 18, fontWeight: 600, color: "#f5efe4", marginTop: 3, letterSpacing: -0.3 },

  kv: { display: "flex", flexDirection: "column", gap: 4 },
  kvRow: { display: "flex", justifyContent: "space-between", gap: 10, padding: "4px 0", borderBottom: "1px dashed rgba(255,255,255,0.05)" },
  kvKey: { fontSize: 11, color: "#94a3b8" },
  kvVal: { fontSize: 12, color: "#f5efe4", textAlign: "right" as const, flex: 1 },

  emptyCard: { padding: 28, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", textAlign: "center" as const },
  foot: { marginTop: 18, fontSize: 10, color: "#64748b", textAlign: "center" as const, letterSpacing: 0.5 },
};
