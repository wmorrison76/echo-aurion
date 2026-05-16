/** iter242 · Maestro Banquet mobile dashboard.
 *
 * Shows recent BEOs with: event + date + venue + guest count + station list +
 * AI-generated order summary (vendor breakdown). Tap a BEO → full detail.
 */
import React from "react";
import { API } from "@/lib/api-url";

export function MaestroBanquetTab() {
  const [beos, setBeos] = React.useState<any[]>([]);
  const [active, setActive] = React.useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = React.useState(false);

  const load = React.useCallback(() => {
    fetch(`${API()}/api/maestro/beo/recent`)
      .then((r) => r.json()).then((d) => setBeos(d?.rows || [])).catch(() => undefined);
  }, []);

  React.useEffect(() => {
    fetch(`${API()}/api/maestro/beo/seed-demo`, { method: "POST" }).finally(load);
  }, [load]);

  const activeBeo = beos.find((b) => b.id === active);

  return (
    <div data-testid="maestro-bqt-root" style={{ padding: "12px 12px 100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#d4af37", fontWeight: 700 }}>
            🎩 MAESTRO BANQUET
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 300, color: "#f5efe4", margin: "4px 0 0" }}>
            {beos.length} active BEOs · AI orders ready
          </h1>
        </div>
        <button data-testid="bqt-voice-draft-btn" onClick={() => setVoiceOpen(true)} style={{
          background: "linear-gradient(135deg, rgba(168,85,247,0.18), rgba(124,58,237,0.12))",
          border: "1px solid rgba(168,85,247,0.5)", color: "#c084fc",
          padding: "8px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
          letterSpacing: 1, cursor: "pointer", fontFamily: "inherit",
        }}>🎙 NEW BEO</button>
      </div>

      {beos.length === 0 ? (
        <div style={{ color: "#64748b", padding: 30, textAlign: "center", fontSize: 13 }}>
          No banquet event orders yet.
        </div>
      ) : beos.map((b) => (
        <button key={b.id || (b.event_name + (b.event_date || ""))} data-testid={`bqt-card-${b.id || "x"}`}
          onClick={() => setActive(b.id)}
          style={{
            width: "100%", padding: 12, marginBottom: 8, borderRadius: 10,
            background: "rgba(12,18,32,0.85)",
            border: `1px solid ${b.tags?.includes("VIP") ? "rgba(212,175,55,0.4)" : "rgba(148,163,184,0.15)"}`,
            color: "#f5efe4", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
          }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f5efe4" }}>
                {b.event_name}
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                {b.event_date} · {b.start_time}–{b.end_time} · {b.venue}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#d4af37", lineHeight: 1 }}>
                {b.guest_count}
              </div>
              <div style={{ fontSize: 8, color: "#94a3b8", letterSpacing: 1 }}>guests</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
            {(b.tags || []).map((t: string) => (
              <span key={t} style={{
                fontSize: 8, padding: "2px 5px", borderRadius: 3, fontWeight: 700, letterSpacing: 1,
                background: t === "VIP" ? "rgba(212,175,55,0.18)" : "rgba(96,165,250,0.12)",
                color: t === "VIP" ? "#d4af37" : "#60a5fa",
                border: `1px solid ${t === "VIP" ? "rgba(212,175,55,0.4)" : "rgba(96,165,250,0.3)"}`,
              }}>{t.toUpperCase()}</span>
            ))}
            <span style={{
              fontSize: 8, padding: "2px 5px", borderRadius: 3, fontWeight: 700, letterSpacing: 1,
              background: b.status === "confirmed" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.12)",
              color: b.status === "confirmed" ? "#10b981" : "#f59e0b",
            }}>{b.status?.toUpperCase()}</span>
          </div>
          <div style={{ marginTop: 8, padding: 6, borderRadius: 4,
                          background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.2)" }}>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#60a5fa", fontWeight: 700, marginBottom: 2 }}>
              🤖 AI ORDER · ${b.ai_order_total}
            </div>
            <div style={{ fontSize: 10, color: "#cbd5e1" }}>
              {(b.ai_order_summary?.groups || []).map((g: any) => g.vendor).join(" · ") || "—"}
            </div>
          </div>
        </button>
      ))}

      {activeBeo && <BqtDetail beo={activeBeo} onClose={() => setActive(null)} />}
      {voiceOpen && <VoiceBeoDraft onClose={() => setVoiceOpen(false)} onCreated={() => { setVoiceOpen(false); load(); }} />}
    </div>
  );
}


function VoiceBeoDraft({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [draft, setDraft] = React.useState<any>(null);

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    const r = await fetch(`${API()}/api/maestro/beo/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
      body: JSON.stringify({ text: text.trim() }),
    });
    setBusy(false);
    if (r.ok) {
      const d = await r.json();
      setDraft(d.draft);
    }
  }

  function startListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice not supported on this device. Type instead."); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let s = "";
      for (const r of e.results) s += r[0].transcript;
      setText(s);
    };
    rec.start();
    window.setTimeout(() => { try { rec.stop(); } catch {} }, 30_000);
  }

  return (
    <div data-testid="bqt-voice-modal" onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 99999991,
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 14,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 480, background: "linear-gradient(180deg, #0a0e1a 0%, #1a1f2e 100%)",
        border: "1px solid rgba(168,85,247,0.5)", borderRadius: 14,
        padding: 16, maxHeight: "85vh", overflowY: "auto",
      }}>
        <div style={{ fontSize: 9, letterSpacing: 3, color: "#c084fc", fontWeight: 700 }}>
          🎙 VOICE-DRAFT NEW BEO
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 400, color: "#f5efe4", margin: "4px 0 12px" }}>
          Tell Echo about the event
        </h2>
        <textarea data-testid="bqt-voice-text" value={text} onChange={(e) => setText(e.target.value)}
          rows={5} placeholder='Try: "Vegan tasting for 8 guests Thursday 7pm in the Garden Room — Sofia Novak hosting, sesame allergy"'
          style={{
            width: "100%", padding: 10, fontSize: 12, borderRadius: 6,
            background: "rgba(8,12,22,0.8)", border: "1px solid rgba(148,163,184,0.2)",
            color: "#f5efe4", fontFamily: "inherit", marginBottom: 8, resize: "vertical" as any,
          }} />
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button data-testid="bqt-voice-mic" onClick={startListening} style={{
            flex: 1, padding: 10, borderRadius: 6, fontFamily: "inherit",
            background: "rgba(168,85,247,0.14)", border: "1px solid rgba(168,85,247,0.45)",
            color: "#c084fc", fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: 1,
          }}>🎙 SPEAK 30s</button>
          <button data-testid="bqt-voice-submit" onClick={submit} disabled={!text.trim() || busy} style={{
            flex: 1, padding: 10, borderRadius: 6, fontFamily: "inherit",
            background: busy ? "rgba(148,163,184,0.1)" : "rgba(212,175,55,0.18)",
            border: `1px solid ${busy ? "rgba(148,163,184,0.2)" : "rgba(212,175,55,0.5)"}`,
            color: busy ? "#64748b" : "#d4af37", fontSize: 12, fontWeight: 600,
            cursor: busy ? "wait" : "pointer", letterSpacing: 1,
          }}>{busy ? "Drafting…" : "✨ DRAFT"}</button>
        </div>

        {draft && (
          <div data-testid="bqt-voice-draft-preview" style={{
            padding: 12, borderRadius: 8, marginTop: 8,
            background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.3)",
          }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#34d399", fontWeight: 700, marginBottom: 4 }}>
              ✓ DRAFT CREATED
            </div>
            <div style={{ fontSize: 13, color: "#f5efe4", fontWeight: 600 }}>{draft.event_name}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              {draft.event_date || "TBD"} · {draft.start_time || "tba"} · {draft.venue || "TBD"} · {draft.guest_count} guests
            </div>
            {draft.service_notes && (
              <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 6 }}>⚠ {draft.service_notes}</div>
            )}
            <button onClick={onCreated} style={{
              width: "100%", marginTop: 10, padding: 10, borderRadius: 6,
              background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.5)",
              color: "#34d399", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: 1,
              fontFamily: "inherit",
            }}>View in BEO list</button>
          </div>
        )}

        <button onClick={onClose} style={{
          width: "100%", marginTop: 8, padding: 8, borderRadius: 6,
          background: "transparent", border: "1px solid rgba(148,163,184,0.2)",
          color: "#94a3b8", fontSize: 10, cursor: "pointer", letterSpacing: 1, fontFamily: "inherit",
        }}>CLOSE</button>
      </div>
    </div>
  );
}


function BqtDetail({ beo, onClose }: { beo: any; onClose: () => void }) {
  const [chatBusy, setChatBusy] = React.useState(false);

  async function openOrCreateChat() {
    setChatBusy(true);
    const r = await fetch(`${API()}/api/maestro/beo/${beo.id}/chat`,
                            { method: "POST", headers: { "X-User-Id": "chef-william" } });
    setChatBusy(false);
    if (!r.ok) return;
    const d = await r.json();
    window.dispatchEvent(new CustomEvent("echo:open-quick",
      { detail: { view: "group-chat", room_id: d.room_id } }));
  }

  return (
    <div data-testid="bqt-detail" onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 99999987, background: "rgba(0,0,0,0.7)",
      display: "flex", justifyContent: "flex-end", backdropFilter: "blur(4px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(440px, 94%)", height: "100%",
        background: "linear-gradient(180deg, #0a0e1a 0%, #1a1f2e 100%)",
        borderLeft: "1px solid rgba(212,175,55,0.4)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: 14, borderBottom: "1px solid rgba(212,175,55,0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#d4af37", fontWeight: 700 }}>
                🎩 BEO · {beo.id}
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 400, color: "#f5efe4", margin: "3px 0 0" }}>
                {beo.event_name}
              </h2>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                {beo.event_date} · {beo.start_time}–{beo.end_time} · {beo.venue}
              </div>
            </div>
            <button data-testid="bqt-detail-close" onClick={onClose} style={{
              background: "transparent", border: "1px solid rgba(148,163,184,0.25)",
              color: "#94a3b8", borderRadius: 6, width: 28, height: 28, fontSize: 14, cursor: "pointer",
            }}>×</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            <Stat label="Guests" value={beo.guest_count} />
            <Stat label="Revenue" value={`$${beo.estimated_revenue?.toLocaleString?.() || beo.estimated_revenue}`} />
            <Stat label="Captain" value={beo.captain} small />
            <Stat label="Kitchen" value={beo.kitchen_lead} small />
          </div>

          <Section title="Stations">
            {(beo.stations || []).map((s: any, i: number) => (
              <div key={i} data-testid={`bqt-station-${i}`} style={{
                padding: 8, marginBottom: 4, borderRadius: 5,
                background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.2)",
              }}>
                <div style={{ fontSize: 12, color: "#f5efe4", fontWeight: 600 }}>
                  {s.name} <span style={{ color: "#d4af37", fontSize: 10, fontWeight: 400 }}>· {s.covers} covers</span>
                </div>
                <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 2 }}>{s.menu}</div>
              </div>
            ))}
          </Section>

          {beo.service_notes && (
            <Section title="Service notes">
              <div style={{ fontSize: 11, color: "#fbbf24", padding: 8,
                              background: "rgba(245,158,11,0.06)",
                              border: "1px solid rgba(245,158,11,0.25)", borderRadius: 5 }}>
                ⚠ {beo.service_notes}
              </div>
            </Section>
          )}

          {beo.ai_order_summary && (
            <Section title={`🤖 AI-generated order · $${beo.ai_order_summary.total}`}>
              {(beo.ai_order_summary.groups || []).map((g: any, i: number) => (
                <div key={i} data-testid={`bqt-ai-vendor-${i}`} style={{
                  padding: 8, marginBottom: 4, borderRadius: 5,
                  background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.2)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#60a5fa" }}>{g.vendor}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#f5efe4" }}>${g.subtotal}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 3 }}>
                    {(g.items || []).join(" · ")}
                  </div>
                </div>
              ))}
            </Section>
          )}
        </div>
        <div style={{ padding: 12, borderTop: "1px solid rgba(212,175,55,0.2)" }}>
          <button data-testid="bqt-chat-btn" onClick={openOrCreateChat} disabled={chatBusy}
            style={{
              width: "100%", padding: 12, borderRadius: 8,
              background: chatBusy ? "rgba(148,163,184,0.1)"
                : (beo.chat_room_id
                    ? "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.15))"
                    : "linear-gradient(135deg, rgba(212,175,55,0.22), rgba(200,169,126,0.14))"),
              border: `1px solid ${beo.chat_room_id ? "rgba(16,185,129,0.55)" : "rgba(212,175,55,0.55)"}`,
              color: chatBusy ? "#64748b" : (beo.chat_room_id ? "#34d399" : "#d4af37"),
              fontSize: 13, fontWeight: 700, letterSpacing: 1,
              cursor: chatBusy ? "wait" : "pointer", fontFamily: "inherit",
            }}>
            {chatBusy ? "Opening…"
              : beo.chat_room_id ? "💬 OPEN BEO CHAT" : "🎩 CREATE BEO TEAM CHAT"}
          </button>
        </div>
      </div>
    </div>
  );
}


function Stat({ label, value, small }: { label: string; value: any; small?: boolean }) {
  return (
    <div style={{ padding: 10, borderRadius: 6, background: "rgba(148,163,184,0.05)",
                    border: "1px solid rgba(148,163,184,0.12)" }}>
      <div style={{ fontSize: 8, letterSpacing: 2, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: small ? 12 : 16, fontWeight: 600, color: "#f5efe4", marginTop: 2 }}>
        {value || "—"}
      </div>
    </div>
  );
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, letterSpacing: 2.5, color: "#d4af37",
                      textTransform: "uppercase", fontWeight: 700, marginBottom: 5 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
