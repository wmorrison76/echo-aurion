/**
 * iter214 · Notification Preferences Panel
 *
 * Mounted inside the GoogleAuthPill avatar menu. Lets a chef:
 *   - Save phone (for SMS)
 *   - Toggle channels (SMS / email / push / in-app)
 *   - Toggle per-alert opt-in (waste_digest, buffet_close, shortage, order_ready, …)
 *   - Fire a test SMS
 *   - Configure quiet hours
 *
 * Backend contract: /api/chef-prefs/{prefs,test-sms}
 */
import React from "react";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};

const LS_TOKEN = "echoai3_session_token";
function getStoredToken(): string | null {
  try { return localStorage.getItem(LS_TOKEN); } catch { return null; }
}

type Prefs = {
  user_id: string;
  display_name?: string;
  role?: string;
  outlet_id?: string;
  phone_e164?: string | null;
  email?: string;
  channels: { sms: boolean; email: boolean; push: boolean; in_app: boolean };
  alerts: Record<string, boolean | number>;
  quiet_hours: { enabled: boolean; start_hour: number; end_hour: number };
};

const ALERTS = [
  { key: "waste_digest",      label: "Waste digest SMS",  hint: "After each buffet close — cost-per-cover, waste %, vs average" },
  { key: "buffet_close",      label: "Buffet close",       hint: "Notify when a service wraps" },
  { key: "shortage",          label: "Shortage alerts",    hint: "When stock drops below par threshold" },
  { key: "order_ready",       label: "Orders ready",       hint: "Chef pings when EchoAi³ flags a pickup" },
  { key: "par_sheet",         label: "Tomorrow's par sheet", hint: "Daily recommended par sheet digest" },
  { key: "timeline_mentions", label: "Timeline mentions",  hint: "When you're tagged in a timeline event" },
];

export function NotificationPrefsRow({ userId }: { userId: string }) {
  const [open, setOpen] = React.useState(false);
  const [prefs, setPrefs] = React.useState<Prefs | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = React.useState("");

  const headers = (): HeadersInit => {
    const h: HeadersInit = { "Content-Type": "application/json", "X-User-Id": userId };
    const tok = getStoredToken();
    if (tok) (h as any)["Authorization"] = `Bearer ${tok}`;
    return h;
  };

  async function load() {
    try {
      const r = await fetch(`${API()}/api/chef-prefs/prefs`, { headers: headers() });
      if (r.ok) {
        const j = await r.json();
        setPrefs(j.prefs);
        setPhoneDraft(j.prefs?.phone_e164 || "");
      }
    } catch {
      setMsg("Couldn't load preferences");
    }
  }

  React.useEffect(() => { if (open && !prefs) load(); /* eslint-disable-line */ }, [open]);

  async function save(patch: Partial<Prefs>) {
    if (!prefs) return;
    setSaving(true);
    try {
      const body: any = {};
      if (patch.phone_e164 !== undefined) body.phone = patch.phone_e164;
      if (patch.channels) body.channels = patch.channels;
      if (patch.alerts) body.alerts = patch.alerts;
      if (patch.quiet_hours) body.quiet_hours = patch.quiet_hours;
      if (patch.display_name !== undefined) body.display_name = patch.display_name;
      if (patch.role !== undefined) body.role = patch.role;
      if (patch.outlet_id !== undefined) body.outlet_id = patch.outlet_id;
      const r = await fetch(`${API()}/api/chef-prefs/prefs`, {
        method: "PUT", headers: headers(), body: JSON.stringify(body),
      });
      if (r.ok) {
        const j = await r.json();
        setPrefs(j.prefs);
        setMsg("✓ Saved");
      } else {
        const errText = await r.text();
        setMsg(`✕ ${errText.slice(0, 60)}`);
      }
    } catch (e: any) {
      setMsg(`✕ ${e?.message || e}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 2500);
    }
  }

  async function testSms() {
    setMsg("Sending test SMS…");
    try {
      const r = await fetch(`${API()}/api/chef-prefs/test-sms`, {
        method: "POST", headers: headers(),
      });
      const j = await r.json();
      if (j.ok) setMsg(`✓ SMS sent · Twilio sid ${(j.twilio?.twilio_sid || "").slice(0, 10)}…`);
      else if (j.twilio?.queued) setMsg(`⏳ Queued · ${j.twilio?.reason || "no_credentials"}`);
      else setMsg(`✕ ${JSON.stringify(j).slice(0, 80)}`);
    } catch (e: any) { setMsg(`✕ ${e?.message || e}`); }
    setTimeout(() => setMsg(null), 4000);
  }

  if (!open) {
    return (
      <button
        data-testid="notif-prefs-open"
        onClick={() => setOpen(true)}
        style={{
          marginTop: 10, width: "100%", padding: "8px 12px", borderRadius: 6,
          background: "linear-gradient(90deg, rgba(200,169,126,0.15), rgba(168,85,247,0.10))",
          color: "#f5efe4", border: "1px solid rgba(200,169,126,0.4)",
          fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <span>🔔 Notifications</span>
        <span style={{ fontSize: 9, color: "#c8a97e" }}>SMS · Email · Push</span>
      </button>
    );
  }

  if (!prefs) return <div style={{ fontSize: 10, color: "#94a3b8", padding: 10 }}>Loading…</div>;

  return (
    <div data-testid="notif-prefs-panel" style={{
      marginTop: 10, padding: 12, borderRadius: 8,
      background: "rgba(10,14,26,0.7)", border: "1px solid rgba(200,169,126,0.3)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" }}>
          🔔 Notification preferences
        </div>
        <button data-testid="notif-prefs-close" onClick={() => setOpen(false)} style={{
          background: "transparent", border: 0, color: "#94a3b8", fontSize: 14, cursor: "pointer",
        }}>×</button>
      </div>

      {/* Phone */}
      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: 10, color: "#cbd5e1", letterSpacing: 1, textTransform: "uppercase" }}>Phone (SMS)</label>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <input
            data-testid="notif-phone-input"
            value={phoneDraft}
            onChange={e => setPhoneDraft(e.target.value)}
            placeholder="+15617796872 or 561-779-6872"
            style={{
              flex: 1, padding: "6px 8px", borderRadius: 4, fontSize: 11, color: "#f5efe4",
              background: "rgba(0,0,0,0.3)", border: "1px solid rgba(200,169,126,0.3)",
            }}
          />
          <button
            data-testid="notif-phone-save"
            onClick={() => save({ phone_e164: phoneDraft as any })}
            disabled={saving || phoneDraft === (prefs.phone_e164 || "")}
            style={{
              padding: "6px 10px", borderRadius: 4,
              background: "rgba(200,169,126,0.20)", color: "#c8a97e",
              border: "1px solid rgba(200,169,126,0.4)",
              fontSize: 10, fontWeight: 700, cursor: "pointer",
              opacity: (saving || phoneDraft === (prefs.phone_e164 || "")) ? 0.5 : 1,
            }}
          >Save</button>
        </div>
        {prefs.phone_e164 && (
          <div style={{ fontSize: 9, color: "#86efac", marginTop: 3 }}>
            ✓ On file: <code>{prefs.phone_e164}</code>
          </div>
        )}
      </div>

      {/* Channels */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 10, color: "#cbd5e1", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Channels</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {(["sms", "email", "push", "in_app"] as const).map(ch => (
            <label key={ch} data-testid={`notif-channel-${ch}`} style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 10,
              padding: "4px 8px", borderRadius: 4,
              background: prefs.channels[ch] ? "rgba(16,185,129,0.12)" : "rgba(30,41,59,0.4)",
              border: `1px solid ${prefs.channels[ch] ? "rgba(16,185,129,0.3)" : "rgba(148,163,184,0.15)"}`,
              cursor: "pointer", color: "#f5efe4",
            }}>
              <input
                type="checkbox"
                checked={!!prefs.channels[ch]}
                onChange={e => save({ channels: { ...prefs.channels, [ch]: e.target.checked } })}
                style={{ margin: 0 }}
              />
              <span style={{ textTransform: "capitalize" }}>{ch === "in_app" ? "In-app" : ch}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Per-alert toggles */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 10, color: "#cbd5e1", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Alerts</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {ALERTS.map(a => (
            <label key={a.key} data-testid={`notif-alert-${a.key}`} style={{
              display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px", borderRadius: 4,
              background: prefs.alerts[a.key] ? "rgba(168,85,247,0.08)" : "rgba(30,41,59,0.3)",
              border: `1px solid ${prefs.alerts[a.key] ? "rgba(168,85,247,0.25)" : "rgba(148,163,184,0.10)"}`,
              cursor: "pointer", color: "#f5efe4",
            }}>
              <input
                type="checkbox"
                checked={!!prefs.alerts[a.key]}
                onChange={e => save({ alerts: { ...prefs.alerts, [a.key]: e.target.checked } })}
                style={{ margin: "2px 0 0 0" }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{a.label}</div>
                <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 1 }}>{a.hint}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Quiet hours */}
      <div style={{ marginTop: 12 }}>
        <label data-testid="notif-quiet-toggle" style={{
          display: "flex", alignItems: "center", gap: 8, fontSize: 10,
          padding: "4px 8px", borderRadius: 4,
          background: prefs.quiet_hours.enabled ? "rgba(56,189,248,0.08)" : "rgba(30,41,59,0.3)",
          border: "1px solid rgba(56,189,248,0.25)", color: "#f5efe4", cursor: "pointer",
        }}>
          <input
            type="checkbox"
            checked={prefs.quiet_hours.enabled}
            onChange={e => save({ quiet_hours: { ...prefs.quiet_hours, enabled: e.target.checked } })}
          />
          <span>🌙 Quiet hours · {String(prefs.quiet_hours.start_hour).padStart(2, "0")}:00 – {String(prefs.quiet_hours.end_hour).padStart(2, "0")}:00</span>
        </label>
      </div>

      {/* Test SMS */}
      <button
        data-testid="notif-test-sms"
        onClick={testSms}
        disabled={!prefs.phone_e164 || !prefs.channels.sms}
        style={{
          marginTop: 12, width: "100%", padding: "8px 12px", borderRadius: 6,
          background: "linear-gradient(90deg, rgba(16,185,129,0.20), rgba(56,189,248,0.15))",
          color: "#86efac", border: "1px solid rgba(16,185,129,0.4)",
          fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer",
          opacity: (!prefs.phone_e164 || !prefs.channels.sms) ? 0.5 : 1,
        }}
      >
        📲 Send test SMS
      </button>

      {msg && (
        <div data-testid="notif-msg" style={{
          marginTop: 8, padding: "4px 8px", borderRadius: 4, fontSize: 10,
          background: msg.startsWith("✓") ? "rgba(16,185,129,0.12)"
                      : msg.startsWith("✕") ? "rgba(239,68,68,0.12)" : "rgba(251,191,36,0.10)",
          color: msg.startsWith("✓") ? "#6ee7b7" : msg.startsWith("✕") ? "#fca5a5" : "#fcd34d",
        }}>{msg}</div>
      )}
    </div>
  );
}
