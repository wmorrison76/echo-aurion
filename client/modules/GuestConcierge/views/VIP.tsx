import React, { useEffect, useState } from "react";
import { S, guestFetch, type Flash } from "../shared";

export function VIPView({ onBack, flash }: { onBack: () => void; flash: Flash }) {
  const [addons, setAddons] = useState<any[]>([]);
  const [tier, setTier] = useState<string>("standard");
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await guestFetch("/api/guest-concierge/vip-addons");
        const j = await r.json();
        setAddons(j.addons || []); setTier(j.guest_tier || "standard");
      } finally { setLoading(false); }
    })();
  }, []);

  async function request(slug: string, name: string) {
    const notes = prompt(`Request: ${name}\n\nAny notes or timing preferences?`, "");
    if (notes === null) return;
    setRequesting(slug);
    try {
      const r = await guestFetch("/api/guest-concierge/vip-addons/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addon_slug: slug, notes: notes || undefined }),
      });
      const j = await r.json();
      flash(r.ok ? "ok" : "err", r.ok ? j.message : (j?.detail || "Failed"));
    } finally { setRequesting(null); }
  }

  return (
    <section data-testid="vip-view" style={S.section}>
      <div style={S.viewHeader}>
        <button onClick={onBack} style={S.linkBtn}>← Back</button>
        <h2 style={{ ...S.h2, margin: 0 }}>WOW Experiences</h2>
      </div>
      <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 14px" }}>
        Curated for <b style={{ color: "#c8a97e", textTransform: "uppercase" }}>{tier}</b> guests. Request — our team confirms in minutes.
      </p>
      {loading ? <div style={{ color: "#94a3b8", fontSize: 12 }}>Loading curated moments…</div> :
        addons.map(a => (
          <div key={a.slug} data-testid={`vip-${a.slug}`} style={S.venueCard}>
            <div style={{ display: "flex", gap: 10, alignItems: "baseline", justifyContent: "space-between" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f5efe4" }}>{a.name}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#c8a97e" }}>{a.price > 0 ? `$${a.price}` : "Included"}</div>
            </div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#c8a97e", marginTop: 2, textTransform: "uppercase", fontWeight: 700 }}>{a.category}</div>
            {a.description && <p style={{ fontSize: 12, color: "#cbd5e1", marginTop: 6, lineHeight: 1.5 }}>{a.description}</p>}
            <button data-testid={`vip-req-${a.slug}`} onClick={() => request(a.slug, a.name)} disabled={requesting === a.slug} style={{ ...S.goldBtn, marginTop: 10, opacity: requesting === a.slug ? 0.6 : 1 }}>
              {requesting === a.slug ? "Requesting…" : "Request this"}
            </button>
          </div>
        ))}
    </section>
  );
}

// ─── Anniversary / Birthday / Honeymoon surprise nudge ────────────────────
export function CelebrationNudge({ celebration, onOpen }: { celebration: string; onOpen: () => void }) {
  const [picks, setPicks] = useState<any[] | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await guestFetch("/api/guest-concierge/vip-addons/suggest");
        if (r.ok) {
          const j = await r.json(); setPicks(j.picks || []);
        }
      } catch {}
    })();
  }, [celebration]);
  if (!picks || picks.length === 0) return null;
  const title = celebration.charAt(0).toUpperCase() + celebration.slice(1);
  return (
    <section data-testid="celebration-nudge" style={{ ...S.section, marginTop: 20 }}>
      <div style={{ padding: 16, borderRadius: 16, background: "linear-gradient(135deg, rgba(236,72,153,0.08), rgba(168,85,247,0.06))", border: "1px solid rgba(236,72,153,0.25)" }}>
        <div style={{ fontSize: 9, letterSpacing: 3, color: "#fbcfe8", textTransform: "uppercase", fontWeight: 700 }}>Your {title} · 3 hand-picked wows</div>
        <div style={{ fontSize: 14, color: "#f5efe4", fontWeight: 600, marginTop: 4, lineHeight: 1.4 }}>Make it unforgettable.</div>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {picks.slice(0, 3).map((a: any) => (
            <div key={a.slug} data-testid={`celebration-pick-${a.slug}`} style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f5efe4" }}>{a.name}</div>
                <div style={{ fontSize: 12, color: "#c8a97e", fontWeight: 700 }}>{a.price > 0 ? `$${a.price}` : "Included"}</div>
              </div>
              {a.description && <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 3, lineHeight: 1.45 }}>{a.description}</div>}
            </div>
          ))}
        </div>
        <button data-testid="celebration-open-all" onClick={onOpen} style={{ ...S.goldBtn, marginTop: 12, width: "100%" }}>Explore all WOW experiences</button>
      </div>
    </section>
  );
}
