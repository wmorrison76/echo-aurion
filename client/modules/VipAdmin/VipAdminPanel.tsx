/** iter245 · Desktop VIP admin — back-office pre-enrichment screen.
 *
 * Editable list of all VIPs with photo upload, profile fields. Writes via
 * existing /api/vip-tracker/upsert. Mobile sees changes live.
 */
import React from "react";
import { API } from "@/lib/api-url";

const ACCENT = "#d4af37";
const USER = "chef-william";

export default function VipAdminPanel() {
  const [vips, setVips] = React.useState<any[]>([]);
  const [active, setActive] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const load = React.useCallback(() => {
    fetch(`${API()}/api/vip-tracker/list?status=all`,
             { headers: { "X-User-Id": USER } })
      .then((r) => r.json()).then((d) => setVips(d?.rows || [])).catch(() => undefined);
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const filtered = vips.filter((v) =>
    !search || (v.display_name + (v.company || "")).toLowerCase().includes(search.toLowerCase()));

  return (
    <div data-testid="vip-admin-panel" style={{
      display: "flex", height: "100%", background: "#0a0a0a",
      color: "#f5efe4", fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <aside style={{
        width: 320, padding: "24px 20px", borderRight: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)",
        flexShrink: 0, overflowY: "auto",
      }}>
        <div style={{ fontSize: 9, letterSpacing: 4, color: ACCENT, fontWeight: 600 }}>
          BACK OFFICE
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif",
                       fontSize: 30, fontWeight: 200, color: "#f5efe4",
                       margin: "8px 0 18px", letterSpacing: -0.5 }}>
          VIP Atlas
        </h1>
        <input data-testid="vip-admin-search" value={search}
          onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
          style={inputStyle} />
        <button data-testid="vip-admin-new" onClick={() => setActive("__new__")}
          style={{ ...btn(ACCENT), width: "100%", marginTop: 10 }}>+ NEW VIP</button>
        <div style={{ marginTop: 18 }}>
          {filtered.map((v) => (
            <button key={v.id} data-testid={`vip-admin-row-${v.id}`}
              onClick={() => setActive(v.id)}
              style={{
                display: "flex", gap: 10, padding: 8, marginBottom: 4,
                width: "100%", borderRadius: 6, alignItems: "center", textAlign: "left",
                background: active === v.id ? "rgba(212,175,55,0.1)" : "transparent",
                border: `1px solid ${active === v.id ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.06)"}`,
                color: "#f5efe4", cursor: "pointer", fontFamily: "inherit",
              }}>
              {v.photo_url ? (
                <img src={v.photo_url} alt=""
                       style={{ width: 36, height: 36, borderRadius: 18, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 18,
                                background: "rgba(212,175,55,0.15)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: ACCENT, fontWeight: 700 }}>{v.display_name?.[0]}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600,
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {v.display_name}
                </div>
                <div style={{ fontSize: 10, color: "#8b8680" }}>
                  {v.tier} · {v.checkin_date}→{v.checkout_date}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {active && <VipEditor vipId={active} onSaved={() => { load(); setActive(null); }}
                                onClose={() => setActive(null)} />}
      {!active && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#5a554d", fontStyle: "italic", fontSize: 14 }}>
          Pick a VIP from the left, or create a new one.
        </div>
      )}
    </div>
  );
}


function VipEditor({ vipId, onSaved, onClose }: {
  vipId: string; onSaved: () => void; onClose: () => void;
}) {
  const [v, setV] = React.useState<any>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (vipId === "__new__") {
      setV({ display_name: "", tier: "diamond", likes: [], dislikes: [],
              allergens: [], food_preferences: [] });
      return;
    }
    fetch(`${API()}/api/vip-tracker/${vipId}`, { headers: { "X-User-Id": USER } })
      .then((r) => r.json()).then((d) => setV(d?.vip)).catch(() => undefined);
  }, [vipId]);

  function set(k: string, val: any) { setV((p: any) => ({ ...p, [k]: val })); }
  function setList(k: string, val: string) {
    setV((p: any) => ({ ...p, [k]: val.split(",").map((s) => s.trim()).filter(Boolean) }));
  }

  async function uploadPhoto(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      // For demo we store data URL directly. Production: upload to S3 first.
      set("photo_url", url);
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!v?.display_name) return;
    setBusy(true);
    const r = await fetch(`${API()}/api/vip-tracker/upsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": USER },
      body: JSON.stringify(vipId === "__new__" ? v : { ...v, id: vipId }),
    });
    setBusy(false);
    if (r.ok) onSaved();
  }

  if (!v) return <div style={{ flex: 1, padding: 40, color: "#8b8680" }}>Loading…</div>;

  return (
    <main data-testid="vip-admin-editor" style={{ flex: 1, overflowY: "auto", padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: 28, fontWeight: 300, margin: 0, letterSpacing: -0.3 }}>
          {vipId === "__new__" ? "New VIP profile" : v.display_name}
        </h2>
        <button onClick={onClose} style={btn("#8b8680")}>CLOSE</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Field label="Display name" required>
          <input data-testid="vip-admin-name" value={v.display_name || ""}
            onChange={(e) => set("display_name", e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Tier">
          <select data-testid="vip-admin-tier" value={v.tier || "diamond"}
            onChange={(e) => set("tier", e.target.value)} style={inputStyle}>
            {["diamond", "platinum", "ambassador", "vip"].map((t) =>
              <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Title">
          <input value={v.title || ""} onChange={(e) => set("title", e.target.value)}
            style={inputStyle} data-testid="vip-admin-title" />
        </Field>
        <Field label="Company">
          <input value={v.company || ""} onChange={(e) => set("company", e.target.value)}
            style={inputStyle} data-testid="vip-admin-company" />
        </Field>
        <Field label="Room"><input value={v.room || ""} onChange={(e) => set("room", e.target.value)} style={inputStyle} /></Field>
        <Field label="Reason for stay"><input value={v.reason_for_stay || ""}
          onChange={(e) => set("reason_for_stay", e.target.value)} style={inputStyle} /></Field>
        <Field label="Check-in date (YYYY-MM-DD)"><input value={v.checkin_date || ""}
          onChange={(e) => set("checkin_date", e.target.value)} style={inputStyle} /></Field>
        <Field label="Check-out date"><input value={v.checkout_date || ""}
          onChange={(e) => set("checkout_date", e.target.value)} style={inputStyle} /></Field>
        <Field label="Birthday (MM-DD)"><input value={v.birthday || ""}
          onChange={(e) => set("birthday", e.target.value)} style={inputStyle} /></Field>
        <Field label="Anniversary (MM-DD)"><input value={v.anniversary || ""}
          onChange={(e) => set("anniversary", e.target.value)} style={inputStyle} /></Field>
      </div>

      <Field label="Photo URL">
        <div style={{ display: "flex", gap: 8 }}>
          <input value={v.photo_url || ""} onChange={(e) => set("photo_url", e.target.value)}
            placeholder="https://…" style={{ ...inputStyle, flex: 1 }} data-testid="vip-admin-photo-url" />
          <label style={{ ...btn(ACCENT), cursor: "pointer", display: "inline-block" }}>
            UPLOAD<input type="file" accept="image/*" style={{ display: "none" }}
              data-testid="vip-admin-photo-upload"
              onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
          </label>
        </div>
        {v.photo_url && (
          <img src={v.photo_url} alt="" style={{
            width: 100, height: 100, borderRadius: 8, marginTop: 10,
            objectFit: "cover", border: `1px solid ${ACCENT}55`,
          }} />
        )}
      </Field>

      <Field label="Likes (comma-separated)">
        <textarea value={(v.likes || []).join(", ")} rows={2}
          onChange={(e) => setList("likes", e.target.value)} style={textareaStyle} />
      </Field>
      <Field label="Dislikes">
        <textarea value={(v.dislikes || []).join(", ")} rows={2}
          onChange={(e) => setList("dislikes", e.target.value)} style={textareaStyle} />
      </Field>
      <Field label="Allergens (comma)">
        <textarea value={(v.allergens || []).join(", ")} rows={2}
          onChange={(e) => setList("allergens", e.target.value)} style={textareaStyle} />
      </Field>
      <Field label="Food preferences">
        <textarea value={(v.food_preferences || []).join(", ")} rows={2}
          onChange={(e) => setList("food_preferences", e.target.value)} style={textareaStyle} />
      </Field>

      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        <button data-testid="vip-admin-save" onClick={save} disabled={busy}
          style={{ ...btn(ACCENT), padding: "12px 24px", fontSize: 12 }}>
          {busy ? "Saving…" : "💾 SAVE PROFILE"}
        </button>
      </div>
    </main>
  );
}


function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#8b8680",
                      fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 6,
  background: "rgba(255,255,255,0.04)", color: "#f5efe4",
  border: "1px solid rgba(255,255,255,0.1)", fontSize: 12,
  fontFamily: "inherit", outline: "none",
};

const textareaStyle: React.CSSProperties = { ...inputStyle, resize: "vertical" as any };

function btn(color: string): React.CSSProperties {
  return {
    padding: "8px 16px", borderRadius: 5, fontSize: 11, fontWeight: 700,
    background: `${color}1a`, border: `1px solid ${color}66`, color,
    cursor: "pointer", letterSpacing: 1, fontFamily: "inherit",
  };
}
