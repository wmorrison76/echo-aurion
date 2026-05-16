/** iter245 · Mobile · Echo Radio (PTT) + Tonight's Playbook + Save-the-ticket
 *
 * Single tab housing 3 mini-views to keep the tabbar compact.
 */
import React from "react";
import { API } from "@/lib/api-url";

type View = "playbook" | "radio" | "remediation";
const ACCENT = "#d4af37";
const USER = "chef-william";

export function Iter245Tab({ department }: { department: string }) {
  const [view, setView] = React.useState<View>("playbook");
  return (
    <div data-testid="iter245-tab" style={{ padding: 12, paddingBottom: 90 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[
          { k: "playbook" as View, label: "📋 Playbook" },
          { k: "radio" as View, label: "📻 Radio" },
          { k: "remediation" as View, label: "🛟 Save-the-Ticket" },
        ].map((v) => (
          <button key={v.k} data-testid={`iter245-view-${v.k}`}
            onClick={() => setView(v.k)} style={{
              flex: 1, padding: "8px 6px", borderRadius: 999,
              fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
              background: view === v.k ? "rgba(212,175,55,0.16)" : "transparent",
              color: view === v.k ? ACCENT : "#94a3b8",
              border: `1px solid ${view === v.k ? `${ACCENT}88` : "rgba(148,163,184,0.18)"}`,
            }}>{v.label}</button>
        ))}
      </div>
      {view === "playbook" && <PlaybookView />}
      {view === "radio" && <RadioView department={department} />}
      {view === "remediation" && <RemediationView />}
    </div>
  );
}

/* ─── Tonight's Playbook ───────────────────────────────────────────────── */
function PlaybookView() {
  const [pb, setPb] = React.useState<any>(null);
  const [busy, setBusy] = React.useState(false);
  const load = React.useCallback(() => {
    fetch(`${API()}/api/playbook/tonight`, { headers: { "X-User-Id": USER } })
      .then((r) => r.json()).then(setPb).catch(() => undefined);
  }, []);
  React.useEffect(() => { load(); }, [load]);

  async function pushNow() {
    setBusy(true);
    await fetch(`${API()}/api/playbook/push-now`, {
      method: "POST", headers: { "X-User-Id": USER },
    }).catch(() => undefined);
    setBusy(false);
  }
  if (!pb) return <Loading />;
  return (
    <div data-testid="iter245-playbook">
      <Section title={`Tonight · ${pb.date}`}>
        <div style={kpiRow}>
          <Kpi label="VIPs" value={pb.vips_count} />
          <Kpi label="Covers" value={pb.total_covers_committed} />
          <Kpi label="BEOs" value={pb.beos_today?.length || 0} />
          <Kpi label="86'd" value={pb.eighty_six?.length || 0} />
        </div>
      </Section>
      {pb.outlets_full?.length > 0 && (
        <Section title="🚨 Fully Committed">
          {pb.outlets_full.map((o: any, i: number) => (
            <div key={i} style={pillRow}>{o.headline}</div>
          ))}
        </Section>
      )}
      {pb.vips_in_house?.length > 0 && (
        <Section title="VIPs in-house">
          {pb.vips_in_house.map((v: any) => (
            <div key={v.id} style={pillRow}>
              <span style={{ color: ACCENT, fontWeight: 700 }}>★ {v.tier}</span>
              {" · "}{v.display_name}{v.room ? ` · room ${v.room}` : ""}
            </div>
          ))}
        </Section>
      )}
      {pb.beos_today?.length > 0 && (
        <Section title="🎩 BEOs today">
          {pb.beos_today.map((b: any) => (
            <div key={b.id} style={pillRow}>{b.event_name} · {b.guest_count} guests</div>
          ))}
        </Section>
      )}
      <button data-testid="iter245-push-now" onClick={pushNow} disabled={busy}
        style={{ ...primaryBtn, marginTop: 14, width: "100%" }}>
        {busy ? "Sending…" : "📲 Push briefing to all leadership devices"}
      </button>
    </div>
  );
}

/* ─── Echo Radio (PTT) ─────────────────────────────────────────────────── */
function RadioView({ department }: { department: string }) {
  const [feed, setFeed] = React.useState<any[]>([]);
  const [recording, setRecording] = React.useState(false);
  const [transcript, setTranscript] = React.useState("");
  const recRef = React.useRef<any>(null);

  const load = React.useCallback(() => {
    fetch(`${API()}/api/radio/feed?department=${department}&limit=30`)
      .then((r) => r.json()).then((d) => setFeed(d?.rows || [])).catch(() => undefined);
  }, [department]);
  React.useEffect(() => {
    load(); const t = setInterval(load, 8000); return () => clearInterval(t);
  }, [load]);

  function startRec() {
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      const t = prompt("Voice unsupported here — type your radio message:");
      if (t) postMsg(t);
      return;
    }
    const r = new SR();
    r.lang = "en-US"; r.interimResults = false; r.continuous = false;
    r.onresult = (e: any) => {
      const txt = Array.from(e.results).map((res: any) => res[0].transcript).join(" ");
      setTranscript(txt);
    };
    r.onend = () => setRecording(false);
    r.start();
    recRef.current = r;
    setRecording(true);
  }
  function stopRec() { recRef.current?.stop?.(); setRecording(false); }
  async function postMsg(text: string) {
    const r = await fetch(`${API()}/api/radio/post`, {
      method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": USER },
      body: JSON.stringify({ department, transcript: text }),
    });
    if (r.ok) { setTranscript(""); load(); }
  }

  return (
    <div data-testid="iter245-radio">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <button data-testid="radio-ptt"
          onMouseDown={startRec} onMouseUp={stopRec}
          onTouchStart={startRec} onTouchEnd={stopRec}
          style={{
            ...primaryBtn, flex: 1, padding: "16px",
            background: recording ? "#ef4444" : `${ACCENT}22`,
            color: recording ? "#fff" : ACCENT,
            border: `1px solid ${recording ? "#ef4444" : `${ACCENT}88`}`,
          }}>
          {recording ? "● Recording — release to send" : "🎙 HOLD TO TALK"}
        </button>
      </div>
      {transcript && (
        <div style={{ ...pillRow, marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Heard:</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>{transcript}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button data-testid="radio-send" onClick={() => postMsg(transcript)}
              style={primaryBtn}>📤 SEND</button>
            <button onClick={() => setTranscript("")} style={ghostBtn}>discard</button>
          </div>
        </div>
      )}
      <Section title={`📻 ${department.toUpperCase()} channel`}>
        {feed.length === 0 && <Empty>No radio chatter yet — be the first.</Empty>}
        {feed.map((m) => (
          <div key={m.id} style={{ ...pillRow, fontSize: 12 }}>
            <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 4 }}>
              {m.author_id || "unknown"} · {fmtTime(m.created_at)}
            </div>
            <div>{m.transcript || <em style={{ color: "#5a554d" }}>audio only</em>}</div>
          </div>
        ))}
      </Section>
    </div>
  );
}

/* ─── Save-the-Ticket pending tray ─────────────────────────────────────── */
function RemediationView() {
  const [rows, setRows] = React.useState<any[]>([]);
  const load = React.useCallback(() => {
    fetch(`${API()}/api/save-the-ticket/pending`)
      .then((r) => r.json()).then((d) => setRows(d?.rows || [])).catch(() => undefined);
  }, []);
  React.useEffect(() => { load(); }, [load]);

  async function decide(draft_id: string, approved: boolean) {
    await fetch(`${API()}/api/save-the-ticket/approve`, {
      method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": USER },
      body: JSON.stringify({ draft_id, approved }),
    });
    load();
  }

  return (
    <div data-testid="iter245-remediation">
      <Section title="🛟 Pending GM approvals">
        {rows.length === 0 && <Empty>Nothing to review. All clean.</Empty>}
        {rows.map((r) => (
          <div key={r.id} data-testid={`remediation-row-${r.id}`} style={{
            ...pillRow, padding: 14, borderColor: `${ACCENT}55`,
          }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
              draft {r.id} · {fmtTime(r.created_at)}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: ACCENT, marginBottom: 4 }}>
              ${r.draft?.comp_amount_usd?.toFixed?.(0) || 0} comp
            </div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              <strong>Amenity:</strong> {r.draft?.amenity}
            </div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              <strong>Next visit:</strong> {r.draft?.next_visit_perk}
            </div>
            <div style={{
              fontSize: 12, fontStyle: "italic", color: "#cbd5e1",
              borderLeft: `2px solid ${ACCENT}`, paddingLeft: 8, margin: "8px 0",
            }}>"{r.draft?.draft_message_to_guest}"</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button data-testid={`remediation-approve-${r.id}`}
                onClick={() => decide(r.id, true)} style={primaryBtn}>✓ APPROVE</button>
              <button data-testid={`remediation-reject-${r.id}`}
                onClick={() => decide(r.id, false)} style={ghostBtn}>✕ REJECT</button>
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}

/* ─── primitives ───────────────────────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: ACCENT,
                       fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {children}
    </section>
  );
}
function Kpi({ label, value }: { label: string; value: any }) {
  return (
    <div style={{
      flex: 1, padding: 10, borderRadius: 8,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.06)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: ACCENT }}>{value || 0}</div>
      <div style={{ fontSize: 9, letterSpacing: 1, color: "#94a3b8",
                      textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ ...pillRow, color: "#5a554d", fontStyle: "italic",
                          textAlign: "center" }}>{children}</div>;
}
function Loading() {
  return <div style={{ padding: 30, textAlign: "center", color: "#94a3b8" }}>Loading…</div>;
}
function fmtTime(iso?: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

const kpiRow: React.CSSProperties = { display: "flex", gap: 6 };
const pillRow: React.CSSProperties = {
  padding: 10, borderRadius: 8, marginBottom: 6,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  fontSize: 13, color: "#f5efe4",
};
const primaryBtn: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700,
  background: `${ACCENT}1a`, border: `1px solid ${ACCENT}66`,
  color: ACCENT, cursor: "pointer", letterSpacing: 1,
};
const ghostBtn: React.CSSProperties = {
  ...primaryBtn, background: "transparent", color: "#94a3b8",
  border: "1px solid rgba(148,163,184,0.18)",
};
