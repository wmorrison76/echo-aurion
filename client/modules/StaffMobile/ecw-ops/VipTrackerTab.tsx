/** iter241 · VIP Tracker — leadership-only tab.
 *
 * William's spec:
 *   - 3-across grid of VIP photos, dates beneath
 *   - Tap → detail sheet with full profile + itinerary
 *   - 1-button "Create group chat" → all managers auto-added + summary auto-posted
 *   - Button flips to "Open chat" once chat exists
 *   - Live leadership-only pings feed (bell icon top-right)
 */
import React from "react";
import { API } from "@/lib/api-url";

type Vip = {
  id: string; display_name: string; photo_url?: string;
  title?: string; company?: string; reason_for_stay?: string;
  likes?: string[]; dislikes?: string[]; allergens?: string[];
  food_preferences?: string[]; birthday?: string; anniversary?: string;
  tier?: string; room?: string; checkin_date?: string; checkout_date?: string;
  notes_log?: { text: string; authored_by: string; created_at: string }[];
  chat_room_id?: string; chat_active?: boolean; nights_total?: number;
};

const USER_ID = "chef-william";               // dev default (leadership)

export function VipTrackerTab() {
  const [vips, setVips] = React.useState<Vip[]>([]);
  const [status, setStatus] = React.useState<"in-house" | "arriving" | "all">("in-house");
  const [detail, setDetail] = React.useState<string | null>(null);
  const [pings, setPings] = React.useState<any[]>([]);
  const [pingsOpen, setPingsOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(0);

  const load = React.useCallback(() => {
    fetch(`${API()}/api/vip-tracker/list?status=${status}`,
             { headers: { "X-User-Id": USER_ID } })
      .then((r) => r.json()).then((d) => setVips(d.rows || []))
      .catch(() => undefined);
  }, [status]);

  const loadPings = React.useCallback(() => {
    fetch(`${API()}/api/vip-tracker/pings/feed`,
             { headers: { "X-User-Id": USER_ID } })
      .then((r) => r.json()).then((d) => {
        setPings(d.rows || []); setUnread(d.unread || 0);
      }).catch(() => undefined);
  }, []);

  React.useEffect(() => {
    load(); loadPings();
    const i1 = setInterval(() => { if (!document.hidden) load(); }, 25_000);
    const i2 = setInterval(() => { if (!document.hidden) loadPings(); }, 15_000);
    return () => { clearInterval(i1); clearInterval(i2); };
  }, [load, loadPings]);

  React.useEffect(() => { fetch(`${API()}/api/vip-tracker/seed-demo`, { method: "POST" }).catch(() => undefined); }, []);

  return (
    <div data-testid="vip-tracker-root" style={{ padding: "14px 12px 90px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#d4af37", fontWeight: 700 }}>
            ★ VIP TRACKER · LEADERSHIP ONLY
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 300, color: "#f5efe4", margin: "4px 0 0" }}>
            {vips.length} tracked · anticipate needs
          </h1>
        </div>
        <button data-testid="vip-pings-bell"
          onClick={() => setPingsOpen(true)}
          style={{
            position: "relative", background: "rgba(212,175,55,0.1)",
            border: "1px solid rgba(212,175,55,0.4)", borderRadius: 8,
            padding: "8px 10px", color: "#d4af37", cursor: "pointer", fontSize: 16,
          }}>
          🔔
          {unread > 0 && (
            <span data-testid="vip-pings-unread" style={{
              position: "absolute", top: -4, right: -4,
              background: "#ef4444", color: "#fff", borderRadius: 10,
              fontSize: 9, padding: "1px 5px", fontWeight: 700, minWidth: 16, textAlign: "center",
            }}>{unread}</span>
          )}
        </button>
      </div>

      {/* status filter */}
      <div data-testid="vip-status-filter" style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["in-house", "arriving", "all"] as const).map((s) => (
          <button key={s} data-testid={`vip-status-${s}`}
            onClick={() => setStatus(s)}
            style={{
              padding: "4px 10px", borderRadius: 999, fontSize: 10, letterSpacing: 1, fontWeight: 600,
              border: `1px solid ${status === s ? "rgba(212,175,55,0.55)" : "rgba(148,163,184,0.2)"}`,
              background: status === s ? "rgba(212,175,55,0.14)" : "transparent",
              color: status === s ? "#d4af37" : "#94a3b8", cursor: "pointer", textTransform: "uppercase",
            }}>{s.replace("-", " ")}</button>
        ))}
      </div>

      {/* 3-across grid of VIP photos */}
      {vips.length === 0 ? (
        <div style={{ color: "#64748b", padding: 30, textAlign: "center", fontSize: 13 }}>
          No VIPs tracked for this filter.
        </div>
      ) : (
        <div data-testid="vip-grid" style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10,
        }}>
          {vips.map((v) => <VipCard key={v.id} v={v} onTap={() => setDetail(v.id)} />)}
        </div>
      )}

      {detail && <VipDetailSheet vipId={detail} onClose={() => { setDetail(null); load(); }} />}
      {pingsOpen && <PingsSheet rows={pings} onClose={() => { setPingsOpen(false); loadPings(); }} />}
    </div>
  );
}


function VipCard({ v, onTap }: { v: Vip; onTap: () => void }) {
  const ci = v.checkin_date?.slice(5) || "";
  const co = v.checkout_date?.slice(5) || "";
  const tierColor = v.tier === "diamond" ? "#60a5fa"
                      : v.tier === "platinum" ? "#e2e8f0"
                      : v.tier === "ambassador" ? "#f59e0b" : "#d4af37";
  return (
    <button data-testid={`vip-card-${v.id}`} onClick={onTap} style={{
      background: "rgba(12,18,32,0.8)",
      border: `1px solid ${tierColor}55`,
      borderRadius: 10, padding: 8, cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      color: "#f5efe4", fontFamily: "inherit",
    }}>
      <div style={{
        width: "100%", aspectRatio: "1", borderRadius: 8, overflow: "hidden",
        background: `linear-gradient(135deg, ${tierColor}33 0%, ${tierColor}11 100%)`,
        border: `1px solid ${tierColor}77`, position: "relative",
      }}>
        {v.photo_url ? (
          <img src={v.photo_url} alt={v.display_name}
                 style={{ width: "100%", height: "100%", objectFit: "cover" }}
                 onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                          width: "100%", height: "100%", fontSize: 28, color: tierColor }}>
            👤
          </div>
        )}
        {v.chat_active && (
          <span data-testid={`vip-chat-badge-${v.id}`} style={{
            position: "absolute", bottom: 4, right: 4, background: "rgba(16,185,129,0.95)",
            color: "#fff", borderRadius: 10, padding: "1px 5px", fontSize: 8,
            letterSpacing: 1, fontWeight: 700,
          }}>💬</span>
        )}
        <span style={{
          position: "absolute", top: 3, left: 3, background: tierColor, color: "#0a0e1a",
          borderRadius: 3, padding: "0 4px", fontSize: 7, letterSpacing: 1, fontWeight: 700,
          textTransform: "uppercase",
        }}>{v.tier || "vip"}</span>
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#f5efe4",
                      textAlign: "center", lineHeight: 1.1, marginTop: 2,
                      overflow: "hidden", textOverflow: "ellipsis", width: "100%", whiteSpace: "nowrap" }}>
        {v.display_name}
      </div>
      <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 0.5 }}>
        {ci}→{co}
      </div>
    </button>
  );
}


function VipDetailSheet({ vipId, onClose }: { vipId: string; onClose: () => void }) {
  const [data, setData] = React.useState<any>(null);
  const [enriched, setEnriched] = React.useState<any>(null);
  const [creating, setCreating] = React.useState(false);
  const [noteText, setNoteText] = React.useState("");
  const [checkinOpen, setCheckinOpen] = React.useState(false);

  const load = React.useCallback(() => {
    fetch(`${API()}/api/vip-tracker/${vipId}`, { headers: { "X-User-Id": USER_ID } })
      .then((r) => r.json()).then(setData).catch(() => undefined);
    fetch(`${API()}/api/vip-tracker/${vipId}/enriched`, { headers: { "X-User-Id": USER_ID } })
      .then((r) => r.json()).then(setEnriched).catch(() => undefined);
  }, [vipId]);

  React.useEffect(load, [load]);
  React.useEffect(() => {
    fetch(`${API()}/api/vip-tracker/seed-orders-demo`, { method: "POST" }).catch(() => undefined);
  }, []);

  async function onCheckin(venueSlug: string) {
    await fetch(`${API()}/api/vip-tracker/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": USER_ID },
      body: JSON.stringify({ vip_id: vipId, venue_slug: venueSlug, method: "host-stand" }),
    });
    setCheckinOpen(false);
    load();
  }

  async function onCreateChat() {
    setCreating(true);
    const r = await fetch(`${API()}/api/vip-tracker/${vipId}/create-chat`,
                             { method: "POST", headers: { "X-User-Id": USER_ID } });
    const d = await r.json();
    setCreating(false);
    if (d.ok) {
      load();
      // Launch the chat directly
      window.dispatchEvent(new CustomEvent("echo:open-quick",
        { detail: { view: "group-chat", room_id: d.room_id } }));
    }
  }

  function onOpenChat(roomId: string) {
    window.dispatchEvent(new CustomEvent("echo:open-quick",
      { detail: { view: "group-chat", room_id: roomId } }));
    onClose();
  }

  async function onAddNote() {
    if (!noteText.trim()) return;
    await fetch(`${API()}/api/vip-tracker/${vipId}/note`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": USER_ID },
      body: JSON.stringify({ text: noteText.trim() }),
    });
    setNoteText("");
    load();
  }

  if (!data?.vip) {
    return (
      <div data-testid="vip-detail-sheet" onClick={onClose} style={sheetBackdrop}>
        <div style={{ padding: 30, color: "#94a3b8" }}>Loading…</div>
      </div>
    );
  }

  const v = data.vip;
  const it = data.itinerary || {};

  return (
    <div data-testid="vip-detail-sheet" onClick={onClose} style={sheetBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={sheetPane}>
        <div style={{ padding: 16, borderBottom: "1px solid rgba(212,175,55,0.2)",
                        display: "flex", gap: 12, alignItems: "center" }}>
          {v.photo_url && (
            <img src={v.photo_url} alt=""
                   style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover",
                              border: "1px solid rgba(212,175,55,0.45)" }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 data-testid="vip-detail-name" style={{ fontSize: 18, fontWeight: 500,
                                                            color: "#f5efe4", margin: 0 }}>{v.display_name}</h2>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              {v.title}{v.company && ` · ${v.company}`}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              {v.checkin_date} → {v.checkout_date} · rm {v.room || "tba"}
            </div>
          </div>
          <button data-testid="vip-detail-close" onClick={onClose}
            style={{ background: "transparent", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.25)",
                        borderRadius: 6, width: 30, height: 30, fontSize: 16, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 80px" }}>
          {v.reason_for_stay && (
            <div style={{ marginBottom: 12, padding: 10, borderRadius: 6,
                            background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)" }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#d4af37",
                              textTransform: "uppercase", fontWeight: 700, marginBottom: 3 }}>
                Reason for stay
              </div>
              <div style={{ fontSize: 12, color: "#cbd5e1" }}>{v.reason_for_stay}</div>
            </div>
          )}

          {(v.allergens?.length > 0) && (
            <Section title="⚠ Allergens" color="#ef4444">
              <ChipRow items={v.allergens} color="#ef4444" testidPrefix={`vip-allergen-${v.id}`} />
            </Section>
          )}
          {(v.likes?.length > 0) && (
            <Section title="Likes / preferences">
              <ChipRow items={v.likes} color="#10b981" testidPrefix={`vip-like-${v.id}`} />
            </Section>
          )}
          {(v.dislikes?.length > 0) && (
            <Section title="Dislikes">
              <ChipRow items={v.dislikes} color="#f59e0b" testidPrefix={`vip-dislike-${v.id}`} />
            </Section>
          )}
          {(v.food_preferences?.length > 0) && (
            <Section title="Food preferences">
              <ChipRow items={v.food_preferences} color="#60a5fa" testidPrefix={`vip-food-${v.id}`} />
            </Section>
          )}

          <div style={{ display: "flex", gap: 10, margin: "8px 0 14px", fontSize: 11, color: "#94a3b8" }}>
            {v.birthday    && <span>🎂 {v.birthday}</span>}
            {v.anniversary && <span>💍 {v.anniversary}</span>}
          </div>

          {/* Stitched itinerary */}
          <Section title={`Itinerary · ${it.reservations?.length || 0} reservations`}>
            {(it.reservations || []).slice(0, 8).map((r: any, i: number) => (
              <div key={i} data-testid={`vip-resv-${i}`} style={{
                padding: "6px 8px", marginBottom: 4, borderRadius: 4,
                background: "rgba(148,163,184,0.06)", fontSize: 11, color: "#cbd5e1",
              }}>
                <b>{r.date} {r.time}</b> · {r.venue_slug} · party {r.party_size}
              </div>
            ))}
            {(!it.reservations || it.reservations.length === 0) && (
              <div style={{ color: "#64748b", fontSize: 11 }}>— No dining reservations yet —</div>
            )}
          </Section>

          {/* iter242 · Order intelligence */}
          {enriched?.favourites?.length > 0 && (
            <Section title="⭐ Most-ordered favourites" color="#d4af37">
              {enriched.favourites.map((f: any, i: number) => (
                <div key={i} data-testid={`vip-fav-${i}`} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "5px 8px", marginBottom: 3, borderRadius: 4,
                  background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)",
                  fontSize: 11, color: "#f5efe4",
                }}>
                  <span>{f.name}</span>
                  <span style={{ color: "#d4af37", fontWeight: 700, fontSize: 10 }}>×{f.count}</span>
                </div>
              ))}
            </Section>
          )}

          {enriched?.orders?.length > 0 && (
            <Section title={`🍽 Recent orders · ${enriched.stats.total_orders} total · ~$${enriched.stats.total_spend_estimate}`}>
              {enriched.orders.slice(0, 5).map((o: any, i: number) => (
                <div key={i} data-testid={`vip-order-${i}`} style={{
                  padding: 8, marginBottom: 4, borderRadius: 6,
                  background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)",
                }}>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>
                    {o.created_at?.slice(0, 16)} · {o.venue_slug}
                    {o.server_name && <span style={{ color: "#10b981", fontWeight: 600 }}> · 🧑‍🍳 {o.server_name}</span>}
                  </div>
                  {(o.items || []).map((it: any, j: number) => (
                    <div key={j} style={{ fontSize: 11, color: "#f5efe4", padding: "1px 0" }}>
                      <span style={{ opacity: 0.55 }}>{it.kind === "drink" ? "🍷" : "🍽"}</span>{" "}
                      {it.name}{it.qty > 1 && <span style={{ color: "#94a3b8" }}> ×{it.qty}</span>}
                      {it.price && <span style={{ float: "right", color: "#10b981" }}>${it.price}</span>}
                    </div>
                  ))}
                  {o.notes && <div style={{ fontSize: 10, color: "#64748b", marginTop: 3, fontStyle: "italic" }}>{o.notes}</div>}
                </div>
              ))}
            </Section>
          )}

          {enriched?.ticket_time?.avg_seconds != null && (
            <div data-testid="vip-ticket-time" style={{
              padding: 10, marginBottom: 12, borderRadius: 6,
              background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.2)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#60a5fa", fontWeight: 700, textTransform: "uppercase" }}>
                  ⏱ KDS Ticket time
                </div>
                <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 2 }}>
                  Avg <b style={{ color: "#f5efe4" }}>{Math.floor(enriched.ticket_time.avg_seconds / 60)}m {enriched.ticket_time.avg_seconds % 60}s</b>
                  {enriched.ticket_time.last_seconds != null && (
                    <span style={{ color: "#94a3b8" }}> · last {Math.floor(enriched.ticket_time.last_seconds / 60)}m</span>
                  )}
                  <span style={{ color: "#64748b" }}> · {enriched.ticket_time.ticket_count} tix</span>
                </div>
              </div>
            </div>
          )}

          {enriched?.servers_seen?.length > 0 && (
            <Section title={`🧑‍🍳 Servers seen · ${enriched.servers_seen.length}`}>
              <ChipRow items={enriched.servers_seen} color="#10b981" testidPrefix={`vip-server-${vipId}`} />
            </Section>
          )}

          {enriched?.checkins?.length > 0 && (
            <Section title={`🚪 Host-stand check-ins · ${enriched.checkins.length}`}>
              {enriched.checkins.slice(0, 5).map((c: any, i: number) => (
                <div key={i} data-testid={`vip-checkin-${i}`} style={{
                  padding: "5px 8px", marginBottom: 3, borderRadius: 4,
                  background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.2)",
                  fontSize: 11, color: "#cbd5e1",
                }}>
                  <span style={{ fontSize: 10, color: "#a855f7", letterSpacing: 1, marginRight: 4 }}>
                    [{c.method?.toUpperCase()}]
                  </span>
                  {c.detail || `${c.venue_slug} · ${c.created_at?.slice(11, 16)}`}
                </div>
              ))}
            </Section>
          )}

          {(it.amenities?.length > 0) && (
            <Section title={`Amenities (${it.amenities.length})`}>
              {it.amenities.slice(0, 6).map((a: any, i: number) => (
                <div key={i} style={{ fontSize: 11, color: "#cbd5e1", padding: "3px 0" }}>
                  🥂 {a.amenity_type || a.type || "amenity"} · {a.created_at?.slice(0, 16)}
                </div>
              ))}
            </Section>
          )}

          {(v.notes_log?.length > 0 || noteText) && (
            <Section title="Team intel · persists to guest profile">
              {(v.notes_log || []).map((n: any, i: number) => (
                <div key={i} data-testid={`vip-note-${i}`} style={{
                  padding: 8, marginBottom: 4, borderRadius: 4,
                  background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)",
                  fontSize: 11, color: "#cbd5e1",
                }}>
                  <div>{n.text}</div>
                  <div style={{ fontSize: 9, color: "#64748b", marginTop: 3 }}>
                    — {n.authored_by} · {n.created_at?.slice(0, 16)}
                  </div>
                </div>
              ))}
            </Section>
          )}

          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input data-testid="vip-note-input" value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add team intel (persists to guest profile)…"
              style={{
                flex: 1, padding: 8, fontSize: 12, background: "rgba(8,12,22,0.8)",
                border: "1px solid rgba(148,163,184,0.2)", borderRadius: 5,
                color: "#f5efe4", fontFamily: "inherit",
              }} />
            <button data-testid="vip-note-save" onClick={onAddNote}
              style={{ padding: "8px 12px", background: "rgba(59,130,246,0.15)",
                        border: "1px solid rgba(59,130,246,0.4)", borderRadius: 5,
                        color: "#60a5fa", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Save</button>
          </div>
        </div>

        {/* Bottom action bar: Create chat / Open chat + Check-in + Scan */}
        <div style={{ padding: 12, borderTop: "1px solid rgba(212,175,55,0.15)",
                        background: "rgba(10,14,26,0.95)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button data-testid="vip-checkin-btn" onClick={() => setCheckinOpen(true)}
              style={{
                flex: 1, padding: 10, borderRadius: 8,
                background: "rgba(168,85,247,0.14)",
                border: "1px solid rgba(168,85,247,0.45)", color: "#c084fc",
                fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: "pointer",
              }}>🚪 CHECK-IN</button>
            <button data-testid="vip-issue-token-btn" onClick={async () => {
              const r = await fetch(`${API()}/api/vip-tracker/${vipId}/issue-token`,
                                       { method: "POST", headers: { "X-User-Id": USER_ID } });
              if (r.ok) {
                const d = await r.json();
                window.alert(`QR token issued: ${d.token}\nPrint or send to host stand.`);
              }
            }} style={{
              flex: 1, padding: 10, borderRadius: 8,
              background: "rgba(34,211,238,0.14)",
              border: "1px solid rgba(34,211,238,0.45)", color: "#22d3ee",
              fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: "pointer", fontFamily: "inherit",
            }}>📱 ISSUE QR</button>
          </div>

          {v.chat_room_id ? (
            <button data-testid="vip-open-chat" onClick={() => onOpenChat(v.chat_room_id)}
              style={{
                width: "100%", padding: 12, borderRadius: 8,
                background: "linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.15) 100%)",
                border: "1px solid rgba(16,185,129,0.55)", color: "#34d399",
                fontSize: 13, fontWeight: 700, letterSpacing: 1, cursor: "pointer",
              }}>💬 OPEN CHAT — tracking active</button>
          ) : (
            <button data-testid="vip-create-chat" onClick={onCreateChat} disabled={creating}
              style={{
                width: "100%", padding: 12, borderRadius: 8,
                background: creating ? "rgba(148,163,184,0.08)"
                                        : "linear-gradient(135deg, rgba(212,175,55,0.22) 0%, rgba(200,169,126,0.14) 100%)",
                border: `1px solid ${creating ? "rgba(148,163,184,0.2)" : "rgba(212,175,55,0.55)"}`,
                color: creating ? "#64748b" : "#d4af37",
                fontSize: 13, fontWeight: 700, letterSpacing: 1,
                cursor: creating ? "wait" : "pointer",
              }}>{creating ? "Opening chat…" : "🌟 CREATE VIP GROUP CHAT"}</button>
          )}
        </div>

        {checkinOpen && (
          <div data-testid="vip-checkin-picker" onClick={() => setCheckinOpen(false)} style={{
            position: "fixed", inset: 0, zIndex: 99999990, background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}>
            <div onClick={(e) => e.stopPropagation()} style={{
              width: "100%", maxWidth: 440, background: "#0a0e1a",
              borderRadius: "12px 12px 0 0", padding: 16, paddingBottom: 28,
              border: "1px solid rgba(168,85,247,0.4)",
            }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: "#a855f7",
                              textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
                🚪 Check {v.display_name} in at:
              </div>
              {[
                { id: "outlet-rooftop", label: "Rooftop Lounge" },
                { id: "outlet-garden",  label: "Garden Room" },
                { id: "outlet-coastal", label: "Coastal Kitchen" },
                { id: "outlet-pool",    label: "Pool Grill" },
                { id: "outlet-lobby",   label: "Lobby Bar" },
                { id: "outlet-spa",     label: "Spa Café" },
              ].map((o) => (
                <button key={o.id} data-testid={`vip-checkin-${o.id}`}
                  onClick={() => onCheckin(o.id)}
                  style={{
                    width: "100%", padding: 12, marginBottom: 6, borderRadius: 6,
                    background: "rgba(148,163,184,0.06)",
                    border: "1px solid rgba(148,163,184,0.15)",
                    color: "#f5efe4", fontSize: 13, textAlign: "left",
                    cursor: "pointer", fontFamily: "inherit",
                  }}>{o.label}</button>
              ))}
              <button onClick={() => setCheckinOpen(false)} style={{
                width: "100%", padding: 10, marginTop: 8, borderRadius: 6,
                background: "transparent", border: "1px solid rgba(148,163,184,0.2)",
                color: "#94a3b8", fontSize: 11, cursor: "pointer", letterSpacing: 1,
              }}>CANCEL</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function PingsSheet({ rows, onClose }: { rows: any[]; onClose: () => void }) {
  function ack(pingId: string) {
    fetch(`${API()}/api/vip-tracker/pings/${pingId}/ack`,
             { method: "POST", headers: { "X-User-Id": USER_ID } });
  }
  return (
    <div data-testid="vip-pings-sheet" onClick={onClose} style={sheetBackdrop}>
      <div onClick={(e) => e.stopPropagation()} style={sheetPane}>
        <div style={{ padding: 16, borderBottom: "1px solid rgba(212,175,55,0.2)",
                        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: "#f5efe4", margin: 0 }}>
            🔔 VIP signals · leadership-only
          </h2>
          <button onClick={onClose} style={{
            background: "transparent", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.25)",
            borderRadius: 6, width: 30, height: 30, fontSize: 16, cursor: "pointer",
          }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px 30px" }}>
          {rows.length === 0 ? (
            <div style={{ color: "#64748b", padding: 20, textAlign: "center", fontSize: 12 }}>
              No signals yet. Ping fires when a VIP makes a reservation, checks in at an outlet, or gets an amenity.
            </div>
          ) : rows.map((p) => (
            <div key={p.id} data-testid={`vip-ping-${p.id}`} onClick={() => ack(p.id)} style={{
              padding: 10, marginBottom: 6, borderRadius: 6,
              background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)",
              cursor: "pointer",
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {p.photo_url && (
                  <img src={p.photo_url} alt=""
                         style={{ width: 32, height: 32, borderRadius: 16, objectFit: "cover" }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "#f5efe4", fontWeight: 600 }}>{p.vip_name}</div>
                  <div style={{ fontSize: 10, color: "#cbd5e1" }}>{p.detail}</div>
                  <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>
                    {p.kind} · {p.created_at?.slice(11, 16)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function Section({ title, color, children }: { title: string; color?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, letterSpacing: 2.5, color: color || "#d4af37",
                      textTransform: "uppercase", fontWeight: 700, marginBottom: 5 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ChipRow({ items, color, testidPrefix }: { items: string[]; color: string; testidPrefix: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {items.map((it, i) => (
        <span key={i} data-testid={`${testidPrefix}-${i}`} style={{
          fontSize: 10, padding: "3px 8px", borderRadius: 3,
          background: `${color}18`, color, border: `1px solid ${color}44`, fontWeight: 500,
        }}>{it}</span>
      ))}
    </div>
  );
}


const sheetBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 99999986,
  background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
  display: "flex", justifyContent: "flex-end",
};

const sheetPane: React.CSSProperties = {
  width: "min(440px, 94%)", height: "100%",
  background: "linear-gradient(180deg, #0a0e1a 0%, #1a1f2e 100%)",
  borderLeft: "1px solid rgba(212,175,55,0.3)",
  display: "flex", flexDirection: "column", overflow: "hidden",
};
