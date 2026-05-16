import React, { useEffect, useState } from "react";
import { S, guestFetch } from "../shared";

export function WeatherView({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const r = await guestFetch("/api/guest-concierge/weather-alternatives");
        setData(await r.json());
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <section data-testid="weather-view" style={S.section}>
      <div style={S.viewHeader}>
        <button onClick={onBack} style={S.linkBtn}>← Back</button>
        <h2 style={{ ...S.h2, margin: 0 }}>Rain Plan</h2>
      </div>
      <div style={{ ...S.venueCard, background: "linear-gradient(135deg, rgba(56,189,248,0.08), rgba(30,64,175,0.04))", borderColor: "rgba(56,189,248,0.25)" }}>
        <div style={{ fontSize: 28 }}>☔</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#f5efe4", marginTop: 4 }}>Beach day rained out?</div>
        <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>Here's our curated Plan B — all indoor or covered.</div>
      </div>
      {loading && <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 12 }}>Checking indoor options…</div>}
      {!loading && data && (
        <>
          {(data.activations_today || []).length > 0 && (
            <>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700, marginTop: 18, marginBottom: 8 }}>Happening today</div>
              {data.activations_today.map((a: any, i: number) => (
                <div key={i} style={S.venueCard}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#f5efe4" }}>{a.title || a.name}</div>
                  {a.time && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{a.time} · {a.location}</div>}
                  {a.description && <p style={{ fontSize: 12, color: "#cbd5e1", marginTop: 6 }}>{a.description}</p>}
                </div>
              ))}
            </>
          )}
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700, marginTop: 18, marginBottom: 8 }}>Indoor venues</div>
          {(data.venues || []).map((v: any) => (
            <div key={v.id} data-testid={`weather-venue-${v.slug}`} style={S.venueCard}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f5efe4" }}>{v.name}</div>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#c8a97e", marginTop: 2, textTransform: "uppercase", fontWeight: 700 }}>{v.category}</div>
              {v.summary && <p style={{ fontSize: 12, color: "#cbd5e1", marginTop: 6 }}>{v.summary}</p>}
              {v.hours && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>🕐 {v.hours}</div>}
            </div>
          ))}
        </>
      )}
    </section>
  );
}
