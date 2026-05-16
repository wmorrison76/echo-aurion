/**
 * iter179 · EchoConciergeMobile — guest-facing mobile companion
 *
 * Route: /m/concierge/:token
 *
 * Mobile-first PWA-style page for the guest. Pulls the resolve bundle from
 * /api/concierge-mobile/resolve/{token}, shows:
 *   - Personal greeting with celebration flag + VIP tier
 *   - Stay summary (room · check-in · check-out)
 *   - Today's activations (if any)
 *   - Dining reservations + spa bookings
 *   - Open service requests
 *   - Quick-request chips + freeform request box
 *
 * No auth required beyond the token itself (embedded in URL).
 */
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};

type Bundle = {
  ok: boolean;
  guest: {
    id: string; name: string; room?: string;
    check_in?: string; check_out?: string;
    vip_tier?: string; repeat?: boolean;
    preferences?: Record<string, any>;
  };
  celebration: string | null;
  dining_reservations: any[];
  spa_bookings: any[];
  open_requests: any[];
  activations_today: any[];
  server_time: string;
};

const QUICK_REQUESTS: Array<{ kind: string; label: string; emoji: string; summary: string }> = [
  { kind: "towels", label: "Extra towels", emoji: "🛀", summary: "Additional towels, please" },
  { kind: "housekeeping", label: "Turndown / Refresh", emoji: "🛏️", summary: "Quick room refresh" },
  { kind: "ice", label: "Ice & water", emoji: "🧊", summary: "Fresh ice bucket + bottled water" },
  { kind: "transport", label: "Car pick-up", emoji: "🚘", summary: "Schedule car for outing" },
  { kind: "dining", label: "Dining recommendation", emoji: "🍽️", summary: "Suggest a dinner spot tonight" },
  { kind: "spa", label: "Spa booking", emoji: "💆", summary: "Available spa slots today" },
  { kind: "kids", label: "Kids' activity", emoji: "🎈", summary: "Children's program today" },
  { kind: "other", label: "Something else", emoji: "✨", summary: "" },
];

const TIER_COLORS: Record<string, string> = {
  diamond: "#b7c9d8", platinum: "#e6e6e6", gold: "#d4af37", silver: "#c0c0c0", standard: "#94a3b8",
};

export default function EchoConciergeMobile() {
  const { token } = useParams<{ token: string }>();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [freeform, setFreeform] = useState("");
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`${API()}/api/concierge-mobile/resolve/${token}`);
      if (!r.ok) {
        const body = await r.text();
        setErr(r.status === 410 ? "This companion link has expired. Please ask the concierge for a fresh one."
              : r.status === 404 ? "We couldn't find this link. Please double-check it with the concierge."
              : `Couldn't load your info (${r.status}). ${body.slice(0, 80)}`);
        return;
      }
      const j: Bundle = await r.json();
      setBundle(j);
    } catch (e: any) {
      setErr(`Network error — ${e.message || e}`);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  async function submitRequest(kind: string, summary: string, urgency: "normal" | "urgent" = "normal") {
    if (!token) return;
    if (!summary.trim()) { flash("err", "Tell us a bit about what you need."); return; }
    setSubmitting(true);
    try {
      const r = await fetch(`${API()}/api/concierge-mobile/request`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, kind, summary: summary.trim(), urgency }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || "Request failed");
      flash("ok", "Sent to the concierge — we're on it.");
      setFreeform("");
      await load();
    } catch (e: any) {
      flash("err", `Couldn't send: ${e.message || e}`);
    } finally { setSubmitting(false); }
  }

  function flash(type: "ok" | "err", msg: string) {
    setToast({ type, msg });
    window.setTimeout(() => setToast(null), 3200);
  }

  if (loading) return <ShellLoading />;
  if (err) return <ShellError message={err} />;
  if (!bundle) return <ShellError message="Unknown error" />;

  const g = bundle.guest;
  const tierColor = TIER_COLORS[(g.vip_tier || "").toLowerCase()] || TIER_COLORS.standard;

  return (
    <div data-testid="concierge-mobile-root" style={S.root}>
      {/* Header · greeting */}
      <header style={S.header}>
        <div style={S.eyebrow}>Echo Concierge</div>
        <h1 style={S.hello}>Hello, {firstName(g.name)}</h1>
        <div style={{ ...S.tierPill, borderColor: tierColor, color: tierColor }} data-testid="mobile-tier-pill">
          ✦ {(g.vip_tier || "STANDARD").toUpperCase()} {g.repeat ? "· RETURNING GUEST" : ""}
        </div>
        {bundle.celebration && (
          <div data-testid="mobile-celebration-banner" style={S.celebration}>
            {celebrationEmoji(bundle.celebration)} We're celebrating your <b>{bundle.celebration}</b> with you.
          </div>
        )}
        <div style={S.stayCard}>
          <StayLine label="Room" value={g.room || "—"} />
          <StayLine label="Check-in" value={formatDate(g.check_in)} />
          <StayLine label="Check-out" value={formatDate(g.check_out)} />
        </div>
      </header>

      {/* Today */}
      {bundle.activations_today?.length > 0 && (
        <Section title="Today at the property">
          {bundle.activations_today.map((a: any, i: number) => (
            <div key={i} data-testid={`mobile-activation-${i}`} style={S.itemCard}>
              <div style={S.itemTitle}>{a.title}</div>
              <div style={S.itemMeta}>{a.location || ""} {a.time ? `· ${a.time}` : ""}</div>
            </div>
          ))}
        </Section>
      )}

      {/* Dining */}
      {bundle.dining_reservations?.length > 0 && (
        <Section title="Your reservations">
          {bundle.dining_reservations.map((r: any, i: number) => (
            <div key={i} style={S.itemCard}>
              <div style={S.itemTitle}>{r.venue_name || r.name || "Dining"}</div>
              <div style={S.itemMeta}>{formatDate(r.date)} · {r.time || ""} · party of {r.party_size || "—"}</div>
            </div>
          ))}
        </Section>
      )}

      {/* Spa */}
      {bundle.spa_bookings?.length > 0 && (
        <Section title="Wellness & spa">
          {bundle.spa_bookings.map((s: any, i: number) => (
            <div key={i} style={S.itemCard}>
              <div style={S.itemTitle}>{s.treatment || s.service || "Spa"}</div>
              <div style={S.itemMeta}>{formatDate(s.date)} {s.time ? `· ${s.time}` : ""} {s.therapist ? `· ${s.therapist}` : ""}</div>
            </div>
          ))}
        </Section>
      )}

      {/* Open requests */}
      {bundle.open_requests?.length > 0 && (
        <Section title="In progress">
          {bundle.open_requests.map((r: any, i: number) => (
            <div key={i} data-testid={`mobile-open-${i}`} style={{ ...S.itemCard, borderLeft: "2px solid #c8a97e" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={S.itemTitle}>{r.summary}</div>
                <span style={S.statusChip}>{(r.status || "pending").toUpperCase()}</span>
              </div>
              <div style={S.itemMeta}>{r.kind || "request"} · sent {timeAgo(r.created_at)}</div>
            </div>
          ))}
        </Section>
      )}

      {/* Quick actions */}
      <Section title="How can we help?">
        <div style={S.chipGrid}>
          {QUICK_REQUESTS.map((q) => (
            <button
              key={q.kind}
              data-testid={`mobile-quick-${q.kind}`}
              disabled={submitting}
              onClick={() => {
                if (q.kind === "other") {
                  document.getElementById("mobile-freeform")?.focus();
                  return;
                }
                submitRequest(q.kind, q.summary);
              }}
              style={S.chip}
            >
              <span style={{ fontSize: 22 }}>{q.emoji}</span>
              <span style={S.chipLabel}>{q.label}</span>
            </button>
          ))}
        </div>
        <div style={S.freeformBox}>
          <textarea
            id="mobile-freeform"
            data-testid="mobile-freeform-input"
            value={freeform}
            onChange={(e) => setFreeform(e.target.value)}
            placeholder="Tell us anything — a dinner reco, car to the marina, a quiet table, an allergy note…"
            maxLength={380}
            style={S.textarea}
          />
          <button
            data-testid="mobile-freeform-submit"
            disabled={submitting || !freeform.trim()}
            onClick={() => submitRequest("custom", freeform)}
            style={{ ...S.submitBtn, opacity: submitting || !freeform.trim() ? 0.5 : 1 }}
          >
            {submitting ? "Sending…" : "Send to concierge"}
          </button>
        </div>
      </Section>

      {/* Footer */}
      <footer style={S.footer}>
        <div style={{ opacity: 0.7 }}>EchoAi³ · Concierge · room {g.room || ""}</div>
        <div style={{ opacity: 0.5, fontSize: 10, marginTop: 4 }}>Link expires when your stay ends.</div>
      </footer>

      {toast && (
        <div data-testid={`mobile-toast-${toast.type}`} style={{ ...S.toast, background: toast.type === "ok" ? "#064e3b" : "#7f1d1d" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── UI bits ───────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={S.section}>
      <h2 style={S.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

function StayLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(200,169,126,0.18)" }}>
      <span style={{ fontSize: 10, color: "#c8a97e", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#f5efe4" }}>{value}</span>
    </div>
  );
}

function ShellLoading() {
  return (
    <div style={S.root}>
      <div style={{ padding: 80, textAlign: "center", color: "#c8a97e" }}>Loading your companion…</div>
    </div>
  );
}
function ShellError({ message }: { message: string }) {
  return (
    <div style={S.root}>
      <div style={{ padding: 40, maxWidth: 420, margin: "40px auto", textAlign: "center", color: "#f8fafc" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔑</div>
        <h1 style={{ fontSize: 22, marginBottom: 12 }}>Not quite right</h1>
        <p style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.5 }}>{message}</p>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function firstName(n?: string) {
  if (!n) return "there";
  const p = n.trim().split(/\s+/)[0];
  return p.replace(/[&,]+$/, "");
}
function formatDate(d?: string) {
  if (!d) return "—";
  try {
    const dt = new Date(d + (d.length === 10 ? "T12:00:00Z" : ""));
    return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  } catch { return d; }
}
function timeAgo(iso?: string): string {
  if (!iso) return "just now";
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
function celebrationEmoji(c: string) {
  const k = c.toLowerCase();
  if (k === "birthday") return "🎂";
  if (k === "anniversary") return "🥂";
  if (k === "honeymoon") return "💐";
  if (k === "engagement") return "💍";
  if (k === "graduation") return "🎓";
  return "✨";
}

// ─── Styles (mobile-first) ────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at top, #0f1523 0%, #050812 60%, #020307 100%)",
    color: "#f5efe4",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
    padding: "24px 18px 100px",
    maxWidth: 520,
    margin: "0 auto",
  },
  header: { marginBottom: 24 },
  eyebrow: { fontSize: 9, letterSpacing: 4, textTransform: "uppercase", color: "#c8a97e", fontWeight: 700 },
  hello: { fontSize: 28, fontWeight: 300, margin: "8px 0 10px", letterSpacing: -0.5, color: "#f5efe4" },
  tierPill: {
    display: "inline-block", padding: "4px 10px", border: "1px solid",
    borderRadius: 999, fontSize: 9, letterSpacing: 2, fontWeight: 700,
    background: "rgba(255,255,255,0.03)",
  },
  celebration: {
    marginTop: 14, padding: "10px 14px", borderRadius: 10,
    background: "linear-gradient(90deg, rgba(236,72,153,0.12), rgba(200,169,126,0.15))",
    border: "1px solid rgba(236,72,153,0.35)",
    fontSize: 12, color: "#fbcfe8",
  },
  stayCard: {
    marginTop: 18, padding: "6px 14px",
    background: "rgba(200,169,126,0.04)",
    border: "1px solid rgba(200,169,126,0.15)",
    borderRadius: 10,
  },
  section: { marginTop: 28 },
  sectionTitle: {
    fontSize: 10, letterSpacing: 4, color: "#c8a97e", fontWeight: 700,
    textTransform: "uppercase", marginBottom: 12,
  },
  itemCard: {
    padding: "10px 14px", marginBottom: 8, borderRadius: 10,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  itemTitle: { fontSize: 14, color: "#f5efe4", fontWeight: 600 },
  itemMeta: { fontSize: 11, color: "#94a3b8", marginTop: 3 },
  statusChip: {
    fontSize: 8, letterSpacing: 1.5, fontWeight: 700, padding: "2px 7px",
    background: "rgba(200,169,126,0.18)", color: "#c8a97e", borderRadius: 4,
    alignSelf: "flex-start", whiteSpace: "nowrap",
  },
  chipGrid: {
    display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10,
  },
  chip: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "18px 10px", borderRadius: 12,
    background: "rgba(200,169,126,0.06)",
    border: "1px solid rgba(200,169,126,0.25)",
    color: "#f5efe4", gap: 6,
    cursor: "pointer", transition: "transform 0.15s ease, background 0.15s ease",
  },
  chipLabel: { fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textAlign: "center" },
  freeformBox: { marginTop: 14 },
  textarea: {
    width: "100%", minHeight: 90, padding: 12, borderRadius: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(200,169,126,0.25)",
    color: "#f5efe4", fontSize: 14, resize: "vertical",
    fontFamily: "inherit",
  },
  submitBtn: {
    marginTop: 10, width: "100%", padding: "14px",
    borderRadius: 10, border: "none",
    background: "linear-gradient(90deg, #c8a97e, #e9d5a5)",
    color: "#0a0e1a", fontWeight: 700, fontSize: 13, letterSpacing: 1.5,
    textTransform: "uppercase", cursor: "pointer",
  },
  footer: { marginTop: 40, textAlign: "center", fontSize: 11, color: "#94a3b8" },
  toast: {
    position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
    padding: "10px 18px", borderRadius: 999, color: "#fff",
    fontSize: 13, fontWeight: 600, letterSpacing: 0.3,
    boxShadow: "0 6px 24px rgba(0,0,0,0.5)", zIndex: 9999,
  },
};
