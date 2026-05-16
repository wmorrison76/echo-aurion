/**
 * iter186 · Daily Briefing Admin · mint + manage staff mobile briefing tokens
 *
 * Panel for leadership to:
 *   - Mint a 14-day briefing link for any staff member
 *   - Copy / share the /m/briefing/:token URL
 *   - Revoke tokens when staff leave or rotate
 *   - Preview the token list with status chips
 */
import React, { useEffect, useState } from "react";
import { usePanelState } from "@/lib/usePanelState";
import { adminFetch, ensureAdminToken } from "@/lib/admin-auth";

const PANEL_ID = "daily-briefing-admin";
const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};

type Tok = {
  token: string;
  staff_name: string;
  staff_role?: string;
  staff_email?: string;
  staff_phone?: string;
  active: boolean;
  created_at: string;
  expires_at?: string;
  revoked_at?: string;
};

export default function DailyBriefingAdmin() {
  const [hasToken, setHasToken] = useState(false);
  const [tokens, setTokens] = useState<Tok[]>([]);
  const [loading, setLoading] = useState(false);
  const [staffName, setStaffName] = usePanelState<string>(PANEL_ID, "name", "");
  const [staffRole, setStaffRole] = usePanelState<string>(PANEL_ID, "role", "");
  const [staffEmail, setStaffEmail] = usePanelState<string>(PANEL_ID, "email", "");
  const [staffPhone, setStaffPhone] = usePanelState<string>(PANEL_ID, "phone", "");
  const [ttl, setTtl] = usePanelState<number>(PANEL_ID, "ttl", 14);
  const [bulkCsv, setBulkCsv] = usePanelState<string>(PANEL_ID, "bulk", "");
  const [flash, setFlash] = useState<{ type: "ok"|"err"; msg: string } | null>(null);
  const [latest, setLatest] = useState<{ token: string; mobile_url: string } | null>(null);
  const [bulkResult, setBulkResult] = useState<any[] | null>(null);
  const [flushing, setFlushing] = useState(false);

  useEffect(() => { setHasToken(ensureAdminToken()); }, []);
  useEffect(() => { if (hasToken) load(); }, [hasToken]);

  async function load() {
    setLoading(true);
    try {
      const r = await adminFetch(`${API()}/api/daily-briefing/tokens`);
      if (r.ok) { const j = await r.json(); setTokens(j.tokens || []); }
    } finally { setLoading(false); }
  }

  async function mint() {
    if (!staffName.trim()) { setFlash({ type: "err", msg: "Staff name is required." }); return; }
    const r = await adminFetch(`${API()}/api/daily-briefing/mint`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staff_name: staffName.trim(),
        staff_role: staffRole.trim() || undefined,
        staff_email: staffEmail.trim() || undefined,
        staff_phone: staffPhone.trim() || undefined,
        ttl_days: Math.max(1, Math.min(60, ttl)),
      }),
    });
    if (!r.ok) { setFlash({ type: "err", msg: `Mint failed: ${await r.text()}` }); return; }
    const j = await r.json();
    const url = `${window.location.origin}/m/briefing/${j.token}`;
    setLatest({ token: j.token, mobile_url: url });
    setFlash({ type: "ok", msg: "Token minted · copy the link below." });
    setStaffName(""); setStaffRole(""); setStaffEmail(""); setStaffPhone("");
    await load();
  }

  async function mintBulk() {
    const lines = bulkCsv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) { setFlash({ type: "err", msg: "Paste one row per line: name,role,email,phone" }); return; }
    const rows = lines.map(line => {
      const [name, role, email, phone] = line.split(",").map(s => (s || "").trim());
      return { staff_name: name, staff_role: role || undefined, staff_email: email || undefined, staff_phone: phone || undefined };
    }).filter(r => r.staff_name);
    if (!rows.length) { setFlash({ type: "err", msg: "No valid rows. Each row needs at least a name." }); return; }
    const r = await adminFetch(`${API()}/api/daily-briefing/mint-bulk`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, ttl_days: Math.max(1, Math.min(60, ttl)) }),
    });
    if (!r.ok) { setFlash({ type: "err", msg: `Bulk mint failed: ${await r.text()}` }); return; }
    const j = await r.json();
    setBulkResult(j.tokens || []);
    setBulkCsv("");
    setFlash({ type: "ok", msg: `Minted ${j.count} tokens · download the CSV below.` });
    await load();
  }

  function downloadBulkCsv() {
    if (!bulkResult || !bulkResult.length) return;
    const header = "staff_name,staff_email,staff_phone,mobile_url,expires_at\n";
    const body = bulkResult.map(r =>
      `"${(r.staff_name || "").replace(/"/g, '""')}","${r.staff_email || ""}","${r.staff_phone || ""}","${window.location.origin}${r.mobile_url}","${r.expires_at}"`
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `briefing-tokens-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

  async function flushQueue() {
    if (!confirm("Replay every queued briefing notification? This sends real emails/SMS once Resend & Twilio are configured.")) return;
    setFlushing(true);
    try {
      const r = await adminFetch(`${API()}/api/daily-briefing/flush-queue`, { method: "POST" });
      if (!r.ok) { setFlash({ type: "err", msg: `Flush failed: ${await r.text()}` }); return; }
      const j = await r.json();
      if (j.ok === false) { setFlash({ type: "err", msg: j.detail || "No channel configured." }); return; }
      setFlash({ type: "ok", msg: `Flushed · ${j.email_sent} email, ${j.sms_sent} SMS, ${j.failed} failed of ${j.considered}.` });
    } finally { setFlushing(false); }
  }

  async function revoke(token: string) {
    if (!confirm("Revoke this briefing link? The staff member will lose access immediately.")) return;
    const r = await adminFetch(`${API()}/api/daily-briefing/revoke?token=${encodeURIComponent(token)}`, { method: "POST" });
    if (r.ok) { setFlash({ type: "ok", msg: "Revoked." }); await load(); }
    else { setFlash({ type: "err", msg: `Revoke failed: ${await r.text()}` }); }
  }

  function copy(url: string) {
    try { navigator.clipboard?.writeText(url); setFlash({ type: "ok", msg: "Link copied." }); }
    catch { setFlash({ type: "err", msg: "Clipboard unavailable — copy manually." }); }
  }

  async function share(url: string, name: string) {
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: "Luccca · Daily Briefing", text: `Hi ${name}, here's today's briefing link.`, url }); return; }
      catch {}
    }
    copy(url);
  }

  if (!hasToken) {
    return <div data-testid="briefing-admin-no-auth" style={{ padding: 24, color: "#94a3b8" }}>Admin token required. Refresh after entering it in Settings → Data & Privacy.</div>;
  }

  return (
    <div data-testid="briefing-admin-root" style={s.root}>
      <div style={s.eyebrow}>Daily Briefing · Mobile Links</div>
      <h2 style={s.title}>Mint a staff briefing link</h2>
      <p style={s.sub}>Send a token to anyone who should catch up on the standup from their phone. Tokens expire and can be revoked.</p>

      <div style={s.formGrid}>
        <div>
          <label style={s.lbl}>Staff name <span style={{ color: "#ef4444" }}>*</span></label>
          <input data-testid="briefing-admin-name" value={staffName} onChange={e => setStaffName(e.target.value)} placeholder="Marcus Hayes" style={s.input} />
        </div>
        <div>
          <label style={s.lbl}>Role (optional)</label>
          <input data-testid="briefing-admin-role" value={staffRole} onChange={e => setStaffRole(e.target.value)} placeholder="Duty Manager" style={s.input} />
        </div>
        <div>
          <label style={s.lbl}>Email (optional · enables email push)</label>
          <input data-testid="briefing-admin-email" value={staffEmail} onChange={e => setStaffEmail(e.target.value)} placeholder="marcus.h@luccca.com" style={s.input} />
        </div>
        <div>
          <label style={s.lbl}>Phone · E.164 (optional · SMS fallback)</label>
          <input data-testid="briefing-admin-phone" value={staffPhone} onChange={e => setStaffPhone(e.target.value)} placeholder="+15551234567" style={s.input} />
        </div>
        <div>
          <label style={s.lbl}>TTL days · max 60</label>
          <input data-testid="briefing-admin-ttl" type="number" min={1} max={60} value={ttl} onChange={e => setTtl(parseInt(e.target.value || "14", 10))} style={s.input} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button data-testid="briefing-admin-mint" onClick={mint} style={s.primary}>Mint single token</button>
        <button data-testid="briefing-admin-flush" onClick={flushQueue} disabled={flushing} style={{ ...s.ghost, padding: "12px 18px", opacity: flushing ? 0.6 : 1 }}>
          {flushing ? "Flushing…" : "Flush queued push"}
        </button>
      </div>

      <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: "#f9fafb", border: "1px dashed #e5e7eb" }}>
        <div style={s.eyebrow}>Bulk import · CSV</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, lineHeight: 1.5 }}>
          Paste one row per line. Format: <code style={{ background: "#fff", padding: "1px 4px", borderRadius: 4, border: "1px solid #e5e7eb", fontSize: 11 }}>name,role,email,phone</code> (role/email/phone optional). Up to 200 rows at once.
        </div>
        <textarea
          data-testid="briefing-admin-bulk-csv"
          value={bulkCsv}
          onChange={e => setBulkCsv(e.target.value)}
          placeholder={"Marcus Hayes,Duty Manager,marcus.h@luccca.com,+15555551111\nPriya Patel,FOH Lead,priya.p@luccca.com,+15555552222\nSam Cole,Bell Stand,,+15555553333"}
          style={{ ...s.input, marginTop: 8, minHeight: 110, fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12 }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button data-testid="briefing-admin-bulk-mint" onClick={mintBulk} style={s.primary}>Mint bulk</button>
          {bulkResult && bulkResult.length > 0 && (
            <button data-testid="briefing-admin-bulk-download" onClick={downloadBulkCsv} style={s.gold}>Download CSV · {bulkResult.length} tokens</button>
          )}
        </div>
        {bulkResult && bulkResult.length > 0 && (
          <div data-testid="briefing-admin-bulk-result" style={{ marginTop: 10, fontSize: 12, color: "#374151" }}>
            Minted {bulkResult.length} token{bulkResult.length > 1 ? "s" : ""} · first: <b>{bulkResult[0]?.staff_name}</b> · last: <b>{bulkResult[bulkResult.length - 1]?.staff_name}</b>
          </div>
        )}
      </div>
      {flash && <div data-testid={`briefing-admin-flash-${flash.type}`} style={{ ...s.flash, background: flash.type === "ok" ? "#064e3b" : "#7f1d1d", color: "#fff" }}>{flash.msg}</div>}

      {latest && (
        <div data-testid="briefing-admin-latest" style={s.latestCard}>
          <div style={s.eyebrow}>Just minted</div>
          <div style={{ fontSize: 11, color: "#92400e", marginTop: 6, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Briefing read-only</div>
          <div style={{ fontSize: 12, color: "#111827", wordBreak: "break-all" }}>{latest.mobile_url}</div>
          <div style={{ fontSize: 11, color: "#92400e", marginTop: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Full staff app</div>
          <div style={{ fontSize: 12, color: "#111827", wordBreak: "break-all" }}>{latest.mobile_url.replace("/m/briefing/", "/m/staff/")}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button data-testid="briefing-admin-copy" onClick={() => copy(latest.mobile_url)} style={s.ghost}>Copy briefing URL</button>
            <button data-testid="briefing-admin-copy-staff" onClick={() => copy(latest.mobile_url.replace("/m/briefing/", "/m/staff/"))} style={s.ghost}>Copy staff app URL</button>
            <button data-testid="briefing-admin-share" onClick={() => share(latest.mobile_url, staffName || "there")} style={s.gold}>Share</button>
          </div>
        </div>
      )}

      <TemplateEditor flash={setFlash} />

      <h3 style={{ ...s.title, fontSize: 16, marginTop: 28 }}>Active & past tokens</h3>
      {loading && <div style={{ color: "#94a3b8", fontSize: 12 }}>Loading…</div>}
      {!loading && tokens.length === 0 && <div style={{ color: "#94a3b8", fontSize: 12 }}>No tokens yet.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tokens.map(t => (
          <div key={t.token} data-testid={`briefing-admin-row-${t.token}`} style={s.row}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                {t.staff_name} {t.staff_role && <span style={{ color: "#6b7280", fontWeight: 400 }}> · {t.staff_role}</span>}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                {t.staff_email || "—"}{t.staff_phone ? ` · 📱 ${t.staff_phone}` : ""} · expires {fmt(t.expires_at)}
              </div>
            </div>
            <span style={{ ...s.pill, background: t.active ? "#dcfce7" : "#fee2e2", color: t.active ? "#166534" : "#991b1b" }}>
              {t.active ? "ACTIVE" : "REVOKED"}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button data-testid={`briefing-admin-copy-${t.token}`} onClick={() => copy(`${window.location.origin}/m/briefing/${t.token}`)} style={s.ghost}>Copy link</button>
              {t.active && <button data-testid={`briefing-admin-revoke-${t.token}`} onClick={() => revoke(t.token)} style={s.danger}>Revoke</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmt(iso?: string) {
  if (!iso) return "never";
  try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
  catch { return iso; }
}

// ─── Template editor ───────────────────────────────────────────────────────
type Template = {
  sms_template: string;
  email_subject_suffix: string;
  email_headline: string;
  email_intro: string;
  updated_at?: string;
  updated_by?: string;
};

function TemplateEditor({ flash }: { flash: (f: { type: "ok"|"err"; msg: string }) => void }) {
  const [tpl, setTpl] = useState<Template | null>(null);
  const [defaults, setDefaults] = useState<Partial<Template>>({});
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState<"sms"|"email">("sms");

  async function load() {
    const r = await adminFetch(`${API()}/api/daily-briefing/template`);
    if (!r.ok) return;
    const j = await r.json();
    setTpl(j.template); setDefaults(j.defaults || {}); setDirty(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!tpl) return;
    setBusy(true);
    try {
      const r = await adminFetch(`${API()}/api/daily-briefing/template`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tpl),
      });
      if (!r.ok) { flash({ type: "err", msg: `Save failed: ${await r.text()}` }); return; }
      const j = await r.json();
      setTpl(j.template); setDirty(false);
      flash({ type: "ok", msg: "Template saved · next send uses the new copy." });
    } finally { setBusy(false); }
  }

  async function reset() {
    if (!confirm("Revert to the built-in defaults?")) return;
    setBusy(true);
    try {
      const r = await adminFetch(`${API()}/api/daily-briefing/template/reset`, { method: "POST" });
      if (r.ok) { await load(); flash({ type: "ok", msg: "Defaults restored." }); }
    } finally { setBusy(false); }
  }

  function patch<K extends keyof Template>(k: K, v: Template[K]) {
    if (!tpl) return;
    setTpl({ ...tpl, [k]: v }); setDirty(true);
  }

  if (!tpl) return null;

  // Live preview rendering
  const sample = {
    name: "Marcus", date: new Date().toISOString().slice(0, 10),
    link: `${window.location.origin}/m/briefing/PREVIEW`,
    subject: "Luccca Morning Standup",
  };
  const render = (s: string) => s
    .replace(/\{name\}/g, sample.name)
    .replace(/\{date\}/g, sample.date)
    .replace(/\{link\}/g, sample.link)
    .replace(/\{subject\}/g, sample.subject);

  const smsRendered = render(tpl.sms_template);
  const smsBytes = new Blob([smsRendered]).size;

  return (
    <div data-testid="briefing-admin-template-root" style={{ marginTop: 28, padding: 18, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={s.eyebrow}>Message template</div>
          <div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>Customise the SMS and email copy. Placeholders: <code style={chipStyle}>{"{name}"}</code> <code style={chipStyle}>{"{date}"}</code> <code style={chipStyle}>{"{link}"}</code> <code style={chipStyle}>{"{subject}"}</code></div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button data-testid="briefing-admin-template-reset" onClick={reset} disabled={busy} style={{ ...s.ghost, opacity: busy ? 0.5 : 1 }}>Reset to default</button>
          <button data-testid="briefing-admin-template-save" onClick={save} disabled={!dirty || busy} style={{ ...s.primary, padding: "8px 14px", fontSize: 11, opacity: (!dirty || busy) ? 0.5 : 1 }}>
            {busy ? "Saving…" : "Save template"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <div>
          <label style={s.lbl}>SMS body · one line · must include <code style={chipStyle}>{"{link}"}</code></label>
          <textarea
            data-testid="briefing-admin-template-sms"
            value={tpl.sms_template}
            onChange={e => patch("sms_template", e.target.value)}
            rows={3}
            placeholder={defaults.sms_template}
            style={{ ...s.input, fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12 }}
          />
          <div data-testid="briefing-admin-template-sms-count" style={{ fontSize: 11, color: smsBytes > 160 ? "#b45309" : "#6b7280", marginTop: 4 }}>
            Rendered: {smsRendered.length} chars · {smsBytes} bytes {smsBytes > 160 && <span>· will split into multi-part SMS</span>}
          </div>
        </div>
        <div>
          <label style={s.lbl}>Email subject suffix</label>
          <input
            data-testid="briefing-admin-template-email-subject"
            value={tpl.email_subject_suffix}
            onChange={e => patch("email_subject_suffix", e.target.value)}
            placeholder={defaults.email_subject_suffix}
            style={s.input}
          />
          <label style={{ ...s.lbl, marginTop: 10 }}>Email headline</label>
          <input
            data-testid="briefing-admin-template-email-headline"
            value={tpl.email_headline}
            onChange={e => patch("email_headline", e.target.value)}
            placeholder={defaults.email_headline}
            style={s.input}
          />
          <label style={{ ...s.lbl, marginTop: 10 }}>Email intro (first paragraph)</label>
          <textarea
            data-testid="briefing-admin-template-email-intro"
            value={tpl.email_intro}
            onChange={e => patch("email_intro", e.target.value)}
            rows={2}
            placeholder={defaults.email_intro}
            style={{ ...s.input, fontSize: 13 }}
          />
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <button data-testid="briefing-admin-template-preview-sms" onClick={() => setPreview("sms")} style={{ ...s.ghost, fontWeight: preview === "sms" ? 700 : 400, background: preview === "sms" ? "#e2e8f0" : "transparent" }}>SMS preview</button>
          <button data-testid="briefing-admin-template-preview-email" onClick={() => setPreview("email")} style={{ ...s.ghost, fontWeight: preview === "email" ? 700 : 400, background: preview === "email" ? "#e2e8f0" : "transparent" }}>Email preview</button>
        </div>
        {preview === "sms" ? (
          <div data-testid="briefing-admin-template-preview-sms-body" style={{ padding: 14, borderRadius: 18, background: "#e0f2fe", maxWidth: 340, color: "#0c4a6e", fontSize: 13, lineHeight: 1.5, border: "1px solid #bae6fd" }}>
            {smsRendered}
          </div>
        ) : (
          <div data-testid="briefing-admin-template-preview-email-body" style={{ padding: 14, borderRadius: 10, background: "#fff", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>Subject: <b>{sample.subject}{render(tpl.email_subject_suffix)}</b></div>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700 }}>Luccca · Daily Briefing</div>
            <div style={{ fontSize: 22, fontWeight: 200, margin: "6px 0" }}>{render(tpl.email_headline)}</div>
            <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>{render(tpl.email_intro)}</div>
            <div style={{ marginTop: 10 }}>
              <a href="#" onClick={e => e.preventDefault()} style={{ display: "inline-block", background: "linear-gradient(90deg, #c8a97e, #e9d5a5)", color: "#0a0e1a", padding: "10px 18px", borderRadius: 8, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", textDecoration: "none" }}>Open briefing →</a>
            </div>
          </div>
        )}
      </div>
      {dirty && <div data-testid="briefing-admin-template-dirty" style={{ marginTop: 8, fontSize: 11, color: "#b45309" }}>Unsaved changes.</div>}
    </div>
  );
}

const chipStyle: React.CSSProperties = { background: "#fff", padding: "1px 5px", borderRadius: 4, border: "1px solid #e5e7eb", fontSize: 11, fontFamily: "ui-monospace, SFMono-Regular, monospace" };


const s: Record<string, React.CSSProperties> = {
  root: { padding: 24, maxWidth: 860, margin: "0 auto", fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif", color: "#111827" },
  eyebrow: { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#6b7280", fontWeight: 700 },
  title: { fontSize: 22, margin: "8px 0 6px", fontWeight: 300, letterSpacing: -0.3, color: "#111827" },
  sub: { fontSize: 13, color: "#6b7280", marginBottom: 18, lineHeight: 1.5 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 12 },
  lbl: { fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#6b7280", fontWeight: 700, display: "block", marginBottom: 5 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, outline: "none", boxSizing: "border-box" as any },
  primary: { padding: "12px 18px", borderRadius: 10, border: "none", background: "linear-gradient(90deg, #c8a97e, #e9d5a5)", color: "#0a0e1a", fontWeight: 700, fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase" as const, cursor: "pointer", marginTop: 6 },
  flash: { padding: "10px 12px", borderRadius: 8, marginTop: 10, fontSize: 13 },
  latestCard: { padding: 14, borderRadius: 12, background: "#fef3c7", border: "1px solid #fde68a", marginTop: 14 },
  row: { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" },
  pill: { fontSize: 10, letterSpacing: 1.5, padding: "2px 8px", borderRadius: 999, fontWeight: 700 },
  ghost: { padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "transparent", fontSize: 12, cursor: "pointer", color: "#374151" },
  gold: { padding: "6px 10px", borderRadius: 6, border: "none", background: "linear-gradient(90deg, #c8a97e, #e9d5a5)", color: "#0a0e1a", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  danger: { padding: "6px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fff", color: "#b91c1c", fontSize: 12, cursor: "pointer" },
};
