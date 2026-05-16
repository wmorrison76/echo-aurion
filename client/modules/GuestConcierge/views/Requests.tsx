import React from "react";
import { S, RequestCard, type Nearby } from "../shared";

export function NearbyView({ nearby, onBack }: { nearby: Nearby[]; onBack: () => void }) {
  return (
    <section data-testid="nearby-view" style={S.section}>
      <div style={S.viewHeader}>
        <button onClick={onBack} style={S.linkBtn}>← Back</button>
        <h2 style={{ ...S.h2, margin: 0 }}>Nearby</h2>
      </div>
      <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 14px" }}>
        Curated picks just beyond the property. Tap the concierge desk for private transport.
      </p>
      {nearby.map(n => (
        <div key={n.id} data-testid={`nearby-${n.id}`} style={{ ...S.venueCard, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f5efe4" }}>{n.name}</div>
            {typeof n.rating === "number" && <span style={{ fontSize: 11, color: "#fbbf24" }}>★ {n.rating.toFixed(1)}</span>}
          </div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#c8a97e", marginTop: 2, textTransform: "uppercase", fontWeight: 700 }}>{n.category}</div>
          {n.summary && <p style={{ fontSize: 12, color: "#cbd5e1", marginTop: 6, lineHeight: 1.5 }}>{n.summary}</p>}
          {typeof n.distance_km === "number" && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>📍 {n.distance_km} km away</div>}
        </div>
      ))}
    </section>
  );
}

export function RequestsView({ items, onBack }: { items: any[]; onBack: () => void }) {
  return (
    <section data-testid="requests-view" style={S.section}>
      <div style={S.viewHeader}>
        <button onClick={onBack} style={S.linkBtn}>← Back</button>
        <h2 style={{ ...S.h2, margin: 0 }}>My Requests</h2>
      </div>
      {items.length === 0 ? <p style={{ color: "#64748b", fontSize: 12 }}>No requests yet.</p> : items.map(r => <RequestCard key={r.id} r={r} />)}
    </section>
  );
}
