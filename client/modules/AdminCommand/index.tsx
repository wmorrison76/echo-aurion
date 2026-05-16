import React, { useState, useEffect, useCallback } from "react";

const BACKEND = window.location.origin;
function fmt(n: number) { return n ? "$" + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "$0"; }

function Badge({ text, variant }: { text: string; variant: string }) {
  const c: Record<string, string> = { success: "#10b981", warning: "#f59e0b", danger: "#ef4444", info: "#3b82f6", neutral: "#64748b" };
  const color = c[variant] || "#64748b";
  return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, letterSpacing: "0.04em", textTransform: "uppercase" }}>{text}</span>;
}

export default function AdminCommand() {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [commissaryConfigs, setCommissaryConfigs] = useState<any[]>([]);
  const [exportResult, setExportResult] = useState<string>("");
  const [importResult, setImportResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Forms
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "manager", department: "", outlet_ids: [] as string[], is_admin: false });
  const [newOutlet, setNewOutlet] = useState({ name: "", type: "restaurant", capacity: 0, manager: "", gl_code: "" });
  const [commForm, setCommForm] = useState({ producing_outlet_id: "", receiving_outlet_id: "", products: "" });
  // Export form
  const [exportForm, setExportForm] = useState({ report_type: "pnl", format: "pdf", paper_size: "letter", orientation: "portrait", margins: "normal" });

  const load = useCallback(async () => {
    try {
      const [u, o, c] = await Promise.all([
        fetch(`${BACKEND}/api/admin/users`).then(r => r.json()),
        fetch(`${BACKEND}/api/admin/outlets`).then(r => r.json()),
        fetch(`${BACKEND}/api/commissary/configs`).then(r => r.json()),
      ]);
      setUsers(u.users || []);
      setOutlets(o.outlets || []);
      setCommissaryConfigs(c.configs || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createUser = async () => {
    await fetch(`${BACKEND}/api/admin/users`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    setNewUser({ name: "", email: "", role: "manager", department: "", outlet_ids: [], is_admin: false });
    load();
  };

  const createOutlet = async () => {
    await fetch(`${BACKEND}/api/admin/outlets`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOutlet),
    });
    setNewOutlet({ name: "", type: "restaurant", capacity: 0, manager: "", gl_code: "" });
    load();
  };

  const setCommissary = async () => {
    await fetch(`${BACKEND}/api/commissary/config`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        producing_outlet_id: commForm.producing_outlet_id,
        receiving_outlet_id: commForm.receiving_outlet_id,
        products: commForm.products.split(",").map(s => s.trim()).filter(Boolean),
        active: true,
      }),
    });
    setCommForm({ producing_outlet_id: "", receiving_outlet_id: "", products: "" });
    load();
  };

  const exportReport = async () => {
    const res = await fetch(`${BACKEND}/api/export/report`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(exportForm),
    });
    if (exportForm.format === "pdf") {
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setExportResult("PDF opened in new tab — use browser print (Ctrl+P) to save as PDF");
    } else {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exportForm.report_type}_export.${exportForm.format === "xlsx" ? "xls" : "csv"}`;
      a.click();
      setExportResult(`${exportForm.format.toUpperCase()} downloaded`);
    }
  };

  const handleFileImport = async (type: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", "");
    const res = await fetch(`${BACKEND}/api/onboarding/import/${type}`, { method: "POST", body: formData });
    const data = await res.json();
    setImportResult({ type, ...data });
    load();
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading Admin Center...</div>;

  const card: React.CSSProperties = { background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden", marginBottom: 14 };
  const cardHead: React.CSSProperties = { padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" };
  const cardTitle: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "rgba(200,169,126,0.6)" };
  const th: React.CSSProperties = { padding: "8px 12px", textAlign: "left", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(148,163,184,0.4)", borderBottom: "1px solid rgba(255,255,255,0.04)" };
  const td: React.CSSProperties = { padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: 11, color: "#94a3b8" };
  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", color: "#e2e8f0", fontSize: 12, outline: "none" };
  const btnStyle: React.CSSProperties = { padding: "8px 18px", borderRadius: 6, border: "1px solid rgba(200,169,126,0.3)", background: "rgba(200,169,126,0.08)", color: "#c8a97e", fontSize: 12, cursor: "pointer", fontWeight: 500 };

  const TABS = [
    { id: "users", l: `Users (${users.length})` },
    { id: "outlets", l: `Outlets (${outlets.length})` },
    { id: "commissary", l: "Commissary" },
    { id: "import", l: "Data Import" },
    { id: "export", l: "Report Export" },
  ];

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", padding: 24, color: "#e2e8f0" }} data-testid="admin-command-panel">
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 300, letterSpacing: "0.12em", color: "#c8a97e", margin: 0 }}>ADMIN COMMAND CENTER</h1>
        <p style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", marginTop: 2 }}>User Onboarding &bull; Outlet Management &bull; Commissary &bull; Data Import &bull; Report Export</p>
      </div>

      <div style={{ display: "flex", gap: 3, marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {TABS.map(t => (
          <button key={t.id} data-testid={`admin-tab-${t.id}`} onClick={() => setTab(t.id)}
            style={{ padding: "8px 18px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500, borderRadius: "6px 6px 0 0",
              background: tab === t.id ? "rgba(200,169,126,0.10)" : "transparent", color: tab === t.id ? "#c8a97e" : "#64748b",
              borderBottom: tab === t.id ? "2px solid #c8a97e" : "2px solid transparent" }}>{t.l}</button>
        ))}
      </div>

      {/* USERS */}
      {tab === "users" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
          <div style={card}>
            <div style={cardHead}><span style={cardTitle}>Team Members</span></div>
            <div style={{ maxHeight: 400, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Name</th><th style={th}>Role</th><th style={th}>Department</th><th style={th}>Outlets</th><th style={th}>Admin</th><th style={th}>Status</th></tr></thead>
                <tbody>
                  {users.map((u: any, i: number) => (
                    <tr key={i}>
                      <td style={{ ...td, fontWeight: 500, color: "#f1f5f9" }}>{u.name}</td>
                      <td style={td}><Badge text={u.role} variant="info" /></td>
                      <td style={td}>{u.department}</td>
                      <td style={{ ...td, fontSize: 9 }}>{(u.outlet_ids || []).join(", ")}</td>
                      <td style={td}>{u.is_admin ? <Badge text="Admin" variant="warning" /> : <Badge text="User" variant="neutral" />}</td>
                      <td style={td}>{u.active !== false ? <Badge text="Active" variant="success" /> : <Badge text="Inactive" variant="danger" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={card}>
            <div style={cardHead}><span style={cardTitle}>Add User</span></div>
            <div style={{ padding: 16 }}>
              {[
                { k: "name", l: "Full Name", p: "Chef John Smith" },
                { k: "email", l: "Email", p: "john@hotel.com" },
                { k: "department", l: "Department", p: "Culinary" },
              ].map(f => (
                <div key={f.k} style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>{f.l}</label>
                  <input value={(newUser as any)[f.k]} onChange={e => setNewUser({ ...newUser, [f.k]: e.target.value })} placeholder={f.p} style={inputStyle} />
                </div>
              ))}
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Role</label>
                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={inputStyle}>
                  {["owner", "gm", "controller", "director", "exec_chef", "manager", "supervisor", "staff"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>
                  <input type="checkbox" checked={newUser.is_admin} onChange={e => setNewUser({ ...newUser, is_admin: e.target.checked })} style={{ marginRight: 6 }} />
                  Admin Access
                </label>
              </div>
              <button data-testid="create-user-btn" onClick={createUser} style={btnStyle}>Create User</button>
            </div>
          </div>
        </div>
      )}

      {/* OUTLETS */}
      {tab === "outlets" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
          <div style={card}>
            <div style={cardHead}><span style={cardTitle}>Outlets</span></div>
            <div style={{ maxHeight: 400, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Name</th><th style={th}>Type</th><th style={th}>GL Code</th><th style={th}>Manager</th><th style={th}>Capacity</th><th style={th}>Status</th></tr></thead>
                <tbody>
                  {outlets.map((o: any, i: number) => (
                    <tr key={i}>
                      <td style={{ ...td, fontWeight: 500, color: "#f1f5f9" }}>{o.name}</td>
                      <td style={td}><Badge text={o.outlet_type || o.type || "—"} variant="info" /></td>
                      <td style={{ ...td, ...mono, fontSize: 10 }}>{o.gl_code || "—"}</td>
                      <td style={td}>{o.manager || "—"}</td>
                      <td style={{ ...td, ...mono }}>
                        {/* iter265 fix: capacity is an object {seats, turns_per_service, max_daily_covers}. */}
                        {typeof o.capacity === "object" && o.capacity !== null
                          ? `${o.capacity.seats ?? 0} seats · ${o.capacity.max_daily_covers ?? 0} covers/day`
                          : (o.capacity ?? "—")}
                      </td>
                      <td style={td}>{o.active !== false ? <Badge text="Active" variant="success" /> : <Badge text="Inactive" variant="danger" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={card}>
            <div style={cardHead}><span style={cardTitle}>Add Outlet</span></div>
            <div style={{ padding: 16 }}>
              {[
                { k: "name", l: "Outlet Name", p: "Rooftop Bar" },
                { k: "manager", l: "Manager", p: "John Smith" },
                { k: "gl_code", l: "GL Code", p: "4100-003" },
              ].map(f => (
                <div key={f.k} style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>{f.l}</label>
                  <input value={(newOutlet as any)[f.k]} onChange={e => setNewOutlet({ ...newOutlet, [f.k]: e.target.value })} placeholder={f.p} style={inputStyle} />
                </div>
              ))}
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Type</label>
                <select value={newOutlet.type} onChange={e => setNewOutlet({ ...newOutlet, type: e.target.value })} style={inputStyle}>
                  {["restaurant", "bar", "cafe", "kitchen", "banquet", "room_service", "pool"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Capacity</label>
                <input type="number" value={newOutlet.capacity} onChange={e => setNewOutlet({ ...newOutlet, capacity: parseInt(e.target.value) || 0 })} style={inputStyle} />
              </div>
              <button data-testid="create-outlet-btn" onClick={createOutlet} style={btnStyle}>Create Outlet</button>
            </div>
          </div>
        </div>
      )}

      {/* COMMISSARY */}
      {tab === "commissary" && (
        <div>
          <div style={card}>
            <div style={cardHead}><span style={cardTitle}>Active Commissary Relationships</span></div>
            <div style={{ padding: 12 }}>
              {commissaryConfigs.length === 0 ? (
                <div style={{ textAlign: "center", color: "#64748b", padding: 20, fontSize: 12 }}>No commissary relationships configured yet. Add one below.</div>
              ) : (
                commissaryConfigs.map((c: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <span style={{ fontWeight: 500, color: "#10b981" }}>{c.producing_name || c.producing_outlet_id}</span>
                    <span style={{ color: "#c8a97e", fontSize: 16 }}>&rarr;</span>
                    <span style={{ fontWeight: 500, color: "#3b82f6" }}>{c.receiving_name || c.receiving_outlet_id}</span>
                    <Badge text={c.active ? "Active" : "Inactive"} variant={c.active ? "success" : "neutral"} />
                    {c.products?.length > 0 && <span style={{ fontSize: 10, color: "#64748b" }}>Products: {c.products.join(", ")}</span>}
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={card}>
            <div style={cardHead}><span style={cardTitle}>Add Commissary Relationship</span></div>
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
              <div>
                <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Producing Outlet</label>
                <select value={commForm.producing_outlet_id} onChange={e => setCommForm({ ...commForm, producing_outlet_id: e.target.value })} style={inputStyle}>
                  <option value="">Select...</option>
                  {outlets.map(o => <option key={o.outlet_id} value={o.outlet_id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Receiving Outlet</label>
                <select value={commForm.receiving_outlet_id} onChange={e => setCommForm({ ...commForm, receiving_outlet_id: e.target.value })} style={inputStyle}>
                  <option value="">Select...</option>
                  {outlets.map(o => <option key={o.outlet_id} value={o.outlet_id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Products (comma-separated)</label>
                <input value={commForm.products} onChange={e => setCommForm({ ...commForm, products: e.target.value })} placeholder="Sandwiches, Pastries" style={inputStyle} />
              </div>
              <button data-testid="add-commissary-btn" onClick={setCommissary} style={btnStyle}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* DATA IMPORT */}
      {tab === "import" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 14 }}>
            {[
              { type: "vendors", label: "Vendor Import", desc: "Name, category, account #, contact, terms" },
              { type: "employees", label: "Employee Import", desc: "Name, email, role, department, rate" },
              { type: "gl-codes", label: "GL Code Import", desc: "Code, description, account type, dept" },
              { type: "menu", label: "Menu Import", desc: "Name, category, price, food cost" },
            ].map(imp => (
              <div key={imp.type} style={card}>
                <div style={{ padding: 16, textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>{imp.label}</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 12 }}>{imp.desc}</div>
                  <label style={{ ...btnStyle, display: "inline-block", cursor: "pointer" }}>
                    Drop CSV File
                    <input type="file" accept=".csv,.txt" style={{ display: "none" }}
                      onChange={e => { if (e.target.files?.[0]) handleFileImport(imp.type, e.target.files[0]); }} />
                  </label>
                  <div style={{ marginTop: 8 }}>
                    <a href={`${BACKEND}/api/onboarding/templates/${imp.type}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: 10, color: "#c8a97e", textDecoration: "none" }}>Download Template</a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {importResult && (
            <div style={{ ...card, borderLeft: importResult.errors > 0 ? "3px solid #f59e0b" : "3px solid #10b981" }}>
              <div style={{ padding: "12px 16px" }}>
                <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{importResult.type} Import Complete</span>
                <span style={{ marginLeft: 12 }}><Badge text={`${importResult.imported} imported`} variant="success" /></span>
                {importResult.errors > 0 && <span style={{ marginLeft: 8 }}><Badge text={`${importResult.errors} errors`} variant="warning" /></span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* REPORT EXPORT */}
      {tab === "export" && (
        <div style={card}>
          <div style={cardHead}><span style={cardTitle}>Export Reports</span></div>
          <div style={{ padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Report</label>
                <select value={exportForm.report_type} onChange={e => setExportForm({ ...exportForm, report_type: e.target.value })} style={inputStyle}>
                  {["pnl", "invoice", "budget", "daily_flash", "vendor_comparison", "outlet_health"].map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Format</label>
                <select value={exportForm.format} onChange={e => setExportForm({ ...exportForm, format: e.target.value })} style={inputStyle}>
                  {["pdf", "csv", "xlsx"].map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Paper Size</label>
                <select value={exportForm.paper_size} onChange={e => setExportForm({ ...exportForm, paper_size: e.target.value })} style={inputStyle}>
                  {["letter", "a4", "legal", "tabloid"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Orientation</label>
                <select value={exportForm.orientation} onChange={e => setExportForm({ ...exportForm, orientation: e.target.value })} style={inputStyle}>
                  {["portrait", "landscape"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Margins</label>
                <select value={exportForm.margins} onChange={e => setExportForm({ ...exportForm, margins: e.target.value })} style={inputStyle}>
                  {["normal", "narrow", "wide"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <button data-testid="export-btn" onClick={exportReport} style={btnStyle}>Export Report</button>
            {exportResult && <div style={{ marginTop: 10, fontSize: 12, color: "#10b981" }}>{exportResult}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
