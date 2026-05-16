import React, { useEffect, useState } from "react";
import { S, guestFetch, type Venue } from "../shared";

export function VenuesView({ venues, onBack, onReserve, onMenu }: {
  venues: Venue[]; onBack: () => void;
  onReserve: (slug: string) => void; onMenu: (slug: string) => void;
}) {
  return (
    <section data-testid="venues-view" style={S.section}>
      <div style={S.viewHeader}>
        <button onClick={onBack} style={S.linkBtn}>← Back</button>
        <h2 style={{ ...S.h2, margin: 0 }}>Property Venues</h2>
      </div>
      {venues.map(v => (
        <div key={v.id} data-testid={`venue-${v.slug}`} style={S.venueCard}>
          {v.photo_url && <div style={{ height: 140, borderRadius: 10, background: `url(${v.photo_url}) center/cover`, marginBottom: 10 }} />}
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f5efe4" }}>{v.name}</div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#c8a97e", marginTop: 2, textTransform: "uppercase", fontWeight: 700 }}>{v.category}</div>
          {v.summary && <p style={{ fontSize: 12, color: "#cbd5e1", marginTop: 6, lineHeight: 1.5 }}>{v.summary}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, fontSize: 11, color: "#94a3b8" }}>
            {v.hours && <span>🕐 {v.hours}</span>}
            {v.floor && <span>📍 {v.floor}{v.building ? `, ${v.building}` : ""}</span>}
            {v.phone_extension && <span>📞 x{v.phone_extension}</span>}
            {v.reservation_required && <span style={{ color: "#fbbf24" }}>📅 Reservation required</span>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button data-testid={`venue-menu-${v.slug}`} onClick={() => onMenu(v.slug)} style={S.ghostBtn}>Menu · allergens</button>
            {v.external_reservation_url ? (
              <a data-testid={`venue-opentable-${v.slug}`} href={v.external_reservation_url} target="_blank" rel="noreferrer" style={{ ...S.goldBtn, textDecoration: "none", textAlign: "center" }}>
                Reserve on OpenTable ↗
              </a>
            ) : v.reservation_required && (
              <button data-testid={`venue-reserve-${v.slug}`} onClick={() => onReserve(v.slug)} style={S.goldBtn}>Reserve</button>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

export function MenuView({ venueSlug, onBack }: { venueSlug: string; onBack: () => void }) {
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const r = await guestFetch(`/api/guest-concierge/menu/${venueSlug}`);
        setMenu(await r.json());
      } finally { setLoading(false); }
    })();
  }, [venueSlug]);

  const items: any[] = (menu && menu.items) || [];
  const grouped: Record<string, any[]> = {};
  items.forEach(it => { (grouped[it.category || "main"] ||= []).push(it); });

  return (
    <section data-testid="menu-view" style={S.section}>
      <div style={S.viewHeader}>
        <button onClick={onBack} style={S.linkBtn}>← Back</button>
        <h2 style={{ ...S.h2, margin: 0 }}>Menu</h2>
      </div>
      {loading && <div style={{ color: "#94a3b8", fontSize: 12 }}>Loading menu…</div>}
      {!loading && items.length === 0 && (
        <div style={S.venueCard}>
          <div style={{ fontSize: 14, color: "#f5efe4", fontWeight: 600 }}>Not posted yet</div>
          <p style={{ fontSize: 12, color: "#cbd5e1", marginTop: 6 }}>{menu?.note || "This venue hasn't posted a digital menu. Dial the extension or visit the front desk for allergen info."}</p>
        </div>
      )}
      {Object.entries(grouped).map(([cat, list]) => (
        <div key={cat} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>{cat}</div>
          {list.map((it: any, i: number) => (
            <div key={i} style={{ ...S.venueCard, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f5efe4" }}>{it.name}</div>
                {typeof it.price === "number" && <div style={{ fontSize: 13, color: "#c8a97e", fontWeight: 700 }}>${it.price.toFixed(2)}</div>}
              </div>
              {it.description && <p style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>{it.description}</p>}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {(it.tags || []).map((t: string) => <span key={t} style={S.chipGold}>{t}</span>)}
                {(it.allergens || []).length > 0 && <span style={S.chipWarn}>⚠ {it.allergens.join(", ")}</span>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
