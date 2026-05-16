/** iter242 · Daily Standup admin editor.
 *
 * Click pencil on Standup tab → opens this editor. Headline, summary,
 * sections (title+body), items (text+owner), shoutouts (name+reason).
 * Saves via POST /api/ecw-ops/standup/admin-write.
 */
import React from "react";
import { API } from "@/lib/api-url";

type Section = { title: string; body: string };
type Item = { text: string; owner: string };
type Shoutout = { name: string; reason: string };

export function StandupAdminEditor({ onClose }: { onClose: () => void }) {
  const [date, setDate] = React.useState<string>("");
  const [headline, setHeadline] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [sections, setSections] = React.useState<Section[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [shoutouts, setShoutouts] = React.useState<Shoutout[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    fetch(`${API()}/api/ecw-ops/standup/today`).then((r) => r.json()).then((d) => {
      setDate(d?.date || "");
      setHeadline(d?.headline || "");
      setSummary(d?.summary || "");
      setSections(d?.sections || []);
      setItems(d?.items || []);
      setShoutouts(d?.shoutouts || []);
    }).catch(() => undefined);
  }, []);

  async function save() {
    setBusy(true);
    const r = await fetch(`${API()}/api/ecw-ops/standup/admin-write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, headline, summary, sections, items, shoutouts }),
    });
    setBusy(false);
    if (r.ok) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
    }
  }

  return (
    <div data-testid="standup-admin-editor" onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 99999990, background: "rgba(0,0,0,0.7)",
      display: "flex", justifyContent: "center", alignItems: "stretch",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(520px, 100%)", background: "linear-gradient(180deg, #0a0e1a 0%, #1a1f2e 100%)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        borderLeft: "1px solid rgba(212,175,55,0.3)",
        borderRight: "1px solid rgba(212,175,55,0.3)",
      }}>
        <div style={{ padding: 14, borderBottom: "1px solid rgba(212,175,55,0.2)",
                        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#d4af37", fontWeight: 700 }}>
              ✏️ STANDUP EDITOR · {date}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              Edit the daily standup all staff see on first load.
            </div>
          </div>
          <button data-testid="standup-editor-close" onClick={onClose}
            style={{ background: "transparent", border: "1px solid rgba(148,163,184,0.25)",
                      color: "#94a3b8", borderRadius: 6, width: 30, height: 30,
                      fontSize: 14, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
          <Field label="Headline" testid="standup-edit-headline">
            <input value={headline} onChange={(e) => setHeadline(e.target.value)}
              data-testid="standup-edit-headline-input" style={INPUT} />
          </Field>
          <Field label="Summary" testid="standup-edit-summary">
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)}
              data-testid="standup-edit-summary-input"
              rows={3} style={{ ...INPUT, resize: "vertical" as any }} />
          </Field>

          <Heading title={`Sections · ${sections.length}`}
            onAdd={() => setSections((p) => [...p, { title: "", body: "" }])}
            testidAdd="standup-add-section" />
          {sections.map((s, i) => (
            <div key={i} data-testid={`standup-section-${i}`} style={CARD}>
              <input value={s.title} placeholder="Section title"
                onChange={(e) => setSections((p) => p.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                style={INPUT} data-testid={`standup-section-${i}-title`} />
              <textarea value={s.body} placeholder="Section body" rows={3}
                onChange={(e) => setSections((p) => p.map((x, j) => j === i ? { ...x, body: e.target.value } : x))}
                style={{ ...INPUT, marginTop: 6, resize: "vertical" as any }}
                data-testid={`standup-section-${i}-body`} />
              <button onClick={() => setSections((p) => p.filter((_, j) => j !== i))}
                data-testid={`standup-section-${i}-delete`} style={DELETE_BTN}>Remove</button>
            </div>
          ))}

          <Heading title={`Items · ${items.length}`}
            onAdd={() => setItems((p) => [...p, { text: "", owner: "" }])}
            testidAdd="standup-add-item" />
          {items.map((it, i) => (
            <div key={i} data-testid={`standup-item-${i}`} style={CARD}>
              <input value={it.text} placeholder="Action item / note"
                onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
                style={INPUT} data-testid={`standup-item-${i}-text`} />
              <input value={it.owner} placeholder="Owner"
                onChange={(e) => setItems((p) => p.map((x, j) => j === i ? { ...x, owner: e.target.value } : x))}
                style={{ ...INPUT, marginTop: 6 }} data-testid={`standup-item-${i}-owner`} />
              <button onClick={() => setItems((p) => p.filter((_, j) => j !== i))}
                data-testid={`standup-item-${i}-delete`} style={DELETE_BTN}>Remove</button>
            </div>
          ))}

          <Heading title={`Shoutouts · ${shoutouts.length}`}
            onAdd={() => setShoutouts((p) => [...p, { name: "", reason: "" }])}
            testidAdd="standup-add-shoutout" />
          {shoutouts.map((s, i) => (
            <div key={i} data-testid={`standup-shoutout-${i}`} style={CARD}>
              <input value={s.name} placeholder="Name"
                onChange={(e) => setShoutouts((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                style={INPUT} data-testid={`standup-shoutout-${i}-name`} />
              <input value={s.reason} placeholder="Why we're celebrating them"
                onChange={(e) => setShoutouts((p) => p.map((x, j) => j === i ? { ...x, reason: e.target.value } : x))}
                style={{ ...INPUT, marginTop: 6 }}
                data-testid={`standup-shoutout-${i}-reason`} />
              <button onClick={() => setShoutouts((p) => p.filter((_, j) => j !== i))}
                data-testid={`standup-shoutout-${i}-delete`} style={DELETE_BTN}>Remove</button>
            </div>
          ))}
        </div>
        <div style={{ padding: 12, borderTop: "1px solid rgba(212,175,55,0.2)",
                        display: "flex", gap: 8, alignItems: "center" }}>
          <button data-testid="standup-editor-save" onClick={save} disabled={busy}
            style={{
              flex: 1, padding: 12, borderRadius: 8,
              background: busy ? "rgba(148,163,184,0.1)" : "linear-gradient(135deg, rgba(212,175,55,0.25), rgba(200,169,126,0.18))",
              border: `1px solid ${busy ? "rgba(148,163,184,0.2)" : "rgba(212,175,55,0.55)"}`,
              color: busy ? "#64748b" : "#d4af37",
              fontSize: 13, fontWeight: 700, letterSpacing: 1.5,
              cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
            }}>{busy ? "Saving…" : "💾 SAVE & PUBLISH"}</button>
          {saved && (
            <span data-testid="standup-editor-saved" style={{
              padding: "8px 12px", background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.4)", color: "#34d399",
              borderRadius: 6, fontSize: 12, fontWeight: 600,
            }}>✓ Saved</span>
          )}
        </div>
      </div>
    </div>
  );
}


function Field({ label, children, testid }: { label: string; children: React.ReactNode; testid?: string }) {
  return (
    <div style={{ marginBottom: 12 }} data-testid={testid}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", fontWeight: 700,
                      textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function Heading({ title, onAdd, testidAdd }: { title: string; onAdd: () => void; testidAdd: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    margin: "16px 0 8px", paddingBottom: 4,
                    borderBottom: "1px solid rgba(148,163,184,0.15)" }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: "#d4af37", fontWeight: 700,
                      textTransform: "uppercase" }}>{title}</div>
      <button data-testid={testidAdd} onClick={onAdd} style={{
        background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)",
        color: "#d4af37", padding: "3px 9px", borderRadius: 4,
        fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: 1, fontFamily: "inherit",
      }}>+ ADD</button>
    </div>
  );
}


const INPUT: React.CSSProperties = {
  width: "100%", padding: 9, borderRadius: 5, fontSize: 12,
  background: "rgba(8,12,22,0.85)", border: "1px solid rgba(148,163,184,0.2)",
  color: "#f5efe4", fontFamily: "inherit",
};

const CARD: React.CSSProperties = {
  padding: 10, marginBottom: 8, borderRadius: 6,
  background: "rgba(148,163,184,0.04)",
  border: "1px solid rgba(148,163,184,0.15)",
};

const DELETE_BTN: React.CSSProperties = {
  marginTop: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
  color: "#ef4444", padding: "4px 10px", borderRadius: 4,
  fontSize: 10, cursor: "pointer", letterSpacing: 1, fontFamily: "inherit",
};
