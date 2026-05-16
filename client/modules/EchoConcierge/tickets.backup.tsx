import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { RightClickMenu } from "@/lib/context-menu";
const API = window.location.origin;
const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#f59e0b", accentDim: "rgba(245,158,11,0.12)", green: "#10b981", red: "#ef4444", amber: "#f59e0b", blue: "#3b82f6", purple: "#8b5cf6", cyan: "#06b6d4", text: "#e2e8f0", dim: "#64748b", muted: "#475569" };
const fmt = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
function Badge({ text, color }: { text: string; color: string }) { return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, textTransform: "uppercase" }}>{text}</span>; }
const priorityColors: Record<string, string> = { critical: C.red, high: "#f97316", medium: C.amber, low: C.dim };
const statusColors: Record<string, string> = { open: C.amber, in_progress: C.blue, dispatched: C.cyan, resolved: C.green, closed: C.dim };
type Tab = "tickets" | "report" | "shift-log" | "analytics";

/* Select styling — ensures readable text on dark backgrounds */
const selectStyle = (hasValue: boolean): React.CSSProperties => ({
  padding: "7px 10px", borderRadius: 6, border: `1px solid ${C.border}`,
  background: "#1a2332", color: hasValue ? "#e2e8f0" : "#94a3b8",
  fontSize: 11, WebkitAppearance: "none" as any, appearance: "none" as any,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: 24,
});
const optionStyle: React.CSSProperties = { background: "#1a2332", color: "#e2e8f0" };


/* ═══════ TICKETS TAB (Enterprise-Grade) ═══════ */
function TicketsTab() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [sortCol, setSortCol] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [kpis, setKpis] = useState<any>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({ guest_name: "", room_number: "", category: "room", priority: "medium", title: "", description: "", outlet_id: "", equipment_id: "", equipment_name: "" });
  const [submitting, setSubmitting] = useState(false);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTickets = useCallback(() => {
    const q = statusFilter ? `?status=${statusFilter}` : "";
    fetch(`${API}/api/concierge/tickets${q}`).then(r => r.json()).then(d => setTickets(d.tickets || []));
  }, [statusFilter]);

  useEffect(() => { loadTickets(); }, [loadTickets]);
  useEffect(() => { fetch(`${API}/api/concierge/saved-filters`).then(r => r.json()).then(d => setSavedFilters(d.filters || [])); }, []);
  useEffect(() => { fetch(`${API}/api/concierge/dashboard`).then(r => r.json()).then(d => setKpis(d.kpis)); }, []);
  useEffect(() => { fetch(`${API}/api/concierge/outlets`).then(r => r.json()).then(d => setOutlets(d.outlets || [])); }, []);
  useEffect(() => {
    if (newTicket.outlet_id) {
      fetch(`${API}/api/concierge/equipment?outlet_id=${newTicket.outlet_id}`).then(r => r.json()).then(d => setEquipment(d.equipment || []));
    } else {
      fetch(`${API}/api/concierge/equipment`).then(r => r.json()).then(d => setEquipment(d.equipment || []));
    }
  }, [newTicket.outlet_id]);

  const updateStatus = (id: string, status: string) => { fetch(`${API}/api/concierge/tickets/${id}/status?status=${status}`, { method: "PUT" }).then(() => loadTickets()); };

  const submitNewTicket = () => {
    if (!newTicket.title) return;
    setSubmitting(true);
    const eqItem = equipment.find((e: any) => e.equipment_id === newTicket.equipment_id);
    const payload = { ...newTicket, equipment_name: eqItem?.name || newTicket.equipment_name, photos, reported_by: "staff", reporter_id: "" };
    fetch(`${API}/api/concierge/guest-report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(() => {
        setSubmitting(false);
        setShowNewTicket(false);
        setNewTicket({ guest_name: "", room_number: "", category: "room", priority: "medium", title: "", description: "", outlet_id: "", equipment_id: "", equipment_name: "" });
        setPhotos([]);
        loadTickets();
      });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("file", files[i]);
      try {
        const res = await fetch(`${API}/api/concierge/upload-photo`, { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          setPhotos(prev => [...prev, data.url]);
        }
      } catch { /* skip failed uploads */ }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Apply saved filter
  const applySavedFilter = (filterName: string) => {
    setActiveFilter(filterName === activeFilter ? "" : filterName);
    setPage(1);
  };

  // Sort
  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  // Filter + Sort + Search
  const filtered = useMemo(() => {
    let result = [...tickets];
    // Saved filter
    if (activeFilter) {
      const sf = savedFilters.find(f => f.name === activeFilter);
      if (sf?.filters) {
        const flt = sf.filters;
        result = result.filter(t => {
          for (const [key, val] of Object.entries(flt)) {
            if (typeof val === "object" && val !== null && "$in" in (val as any)) {
              if (!(val as any).$in.includes(t[key])) return false;
            } else if (typeof val === "object" && val !== null && "$gt" in (val as any)) {
              if (!((t[key] || 0) > (val as any).$gt)) return false;
            } else {
              if (t[key] !== val) return false;
            }
          }
          return true;
        });
      }
    }
    // Search
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(t => t.title?.toLowerCase().includes(q) || t.guest_name?.toLowerCase().includes(q) || t.room_number?.includes(q) || t.category?.includes(q));
    }
    // Sort
    result.sort((a, b) => {
      const av = a[sortCol] ?? "";
      const bv = b[sortCol] ?? "";
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [tickets, activeFilter, savedFilters, searchText, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const SortHeader = ({ col, label }: { col: string; label: string }) => (
    <th onClick={() => toggleSort(col)} style={{ padding: "10px 10px", textAlign: "left", color: C.accent, fontWeight: 600, fontSize: 10, textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
      {label} {sortCol === col && <span style={{ fontSize: 8 }}>{sortDir === "asc" ? "▲" : "▼"}</span>}
    </th>
  );

  return (
    <div data-testid="concierge-tickets" style={{ display: "flex", height: "100%", gap: 0 }}>
      {/* Left: Saved Filters Panel */}
      <div style={{ width: 180, flexShrink: 0, borderRight: `1px solid ${C.border}`, padding: "12px 0", overflowY: "auto" }}>
        <div style={{ padding: "0 12px 8px", fontSize: 10, fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em" }}>Saved Views</div>
        {savedFilters.map(f => (
          <button key={f.id} data-testid={`filter-${f.name.replace(/\s+/g, "-").toLowerCase()}`} onClick={() => applySavedFilter(f.name)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", border: "none", background: activeFilter === f.name ? C.accentDim : "transparent", color: activeFilter === f.name ? C.accent : C.text, fontSize: 11, fontWeight: activeFilter === f.name ? 600 : 400, cursor: "pointer", textAlign: "left", transition: "background 0.15s" }}
            onMouseEnter={e => { if (activeFilter !== f.name) (e.target as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
            onMouseLeave={e => { if (activeFilter !== f.name) (e.target as HTMLElement).style.background = "transparent"; }}>
            <span style={{ fontSize: 14 }}>{f.icon}</span>
            <span>{f.name}</span>
          </button>
        ))}
        {/* KPI Summary */}
        {kpis && (
          <div style={{ padding: "12px", marginTop: 8, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, textTransform: "uppercase", marginBottom: 6 }}>Quick Stats</div>
            {[{ l: "Active", v: kpis.active, c: C.amber }, { l: "Resolved", v: kpis.resolved, c: C.green }, { l: "SLA Breaches", v: kpis.sla_breaches, c: C.red }, { l: "Recovery", v: fmt(kpis.total_recovery_cost), c: C.accent }].map(s => (
              <div key={s.l} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                <span style={{ fontSize: 10, color: C.dim }}>{s.l}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: s.c, fontFamily: "'IBM Plex Mono', monospace" }}>{s.v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Ticket Table */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Toolbar */}
        <div style={{ display: "flex", gap: 6, padding: "10px 14px", alignItems: "center", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
          <button data-testid="new-ticket-btn" onClick={() => setShowNewTicket(v => !v)} style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${showNewTicket ? C.red : C.accent}`, background: showNewTicket ? `${C.red}15` : `${C.accent}15`, color: showNewTicket ? C.red : C.accent, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            {showNewTicket ? "Cancel" : "+ New Ticket"}
          </button>
          <div style={{ width: 1, height: 20, background: C.border, margin: "0 4px" }} />
          {["", "open", "in_progress", "dispatched", "resolved", "closed"].map(f => (
            <button key={f} onClick={() => { setStatusFilter(f); setPage(1); }} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${statusFilter === f ? (statusColors[f] || C.accent) : C.border}`, background: statusFilter === f ? `${statusColors[f] || C.accent}15` : "transparent", color: statusFilter === f ? (statusColors[f] || C.accent) : C.dim, fontSize: 10, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{f || "All"}</button>
          ))}
          <div style={{ flex: 1 }} />
          <input data-testid="ticket-search" value={searchText} onChange={e => { setSearchText(e.target.value); setPage(1); }} placeholder="Search tickets..."
            style={{ width: 200, padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 11 }} />
          <span style={{ fontSize: 10, color: C.dim, padding: "0 4px" }}>{filtered.length} tickets</span>
        </div>

        {/* Inline New Ticket Form */}
        {showNewTicket && (
          <div data-testid="new-ticket-form" style={{ padding: "14px 18px", borderBottom: `2px solid ${C.accent}30`, background: `${C.accent}06` }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input data-testid="new-ticket-title" value={newTicket.title} onChange={e => setNewTicket({ ...newTicket, title: e.target.value })} placeholder="Issue title *" style={{ flex: 2, padding: "7px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "#1a2332", color: C.text, fontSize: 12 }} />
              <input data-testid="new-ticket-guest" value={newTicket.guest_name} onChange={e => setNewTicket({ ...newTicket, guest_name: e.target.value })} placeholder="Guest Name" style={{ flex: 1, padding: "7px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "#1a2332", color: C.text, fontSize: 12 }} />
              <input data-testid="new-ticket-room" value={newTicket.room_number} onChange={e => setNewTicket({ ...newTicket, room_number: e.target.value })} placeholder="Room #" style={{ width: 70, padding: "7px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "#1a2332", color: C.text, fontSize: 12 }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <select data-testid="new-ticket-outlet" value={newTicket.outlet_id} onChange={e => setNewTicket({ ...newTicket, outlet_id: e.target.value, equipment_id: "", equipment_name: "" })} style={{ ...selectStyle(!!newTicket.outlet_id), flex: 1 }}>
                <option value="" style={optionStyle}>Select Outlet / Location</option>
                {outlets.map((o: any) => <option key={o.outlet_id} value={o.outlet_id} style={optionStyle}>{o.name} ({o.type})</option>)}
              </select>
              <select data-testid="new-ticket-category" value={newTicket.category} onChange={e => setNewTicket({ ...newTicket, category: e.target.value })} style={selectStyle(true)}>
                {["room", "maintenance", "restaurant", "kitchen", "spa", "facility", "noise", "billing", "amenity", "equipment", "other"].map(c => <option key={c} value={c} style={optionStyle}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
              <select data-testid="new-ticket-priority" value={newTicket.priority} onChange={e => setNewTicket({ ...newTicket, priority: e.target.value })} style={selectStyle(true)}>
                {["critical", "high", "medium", "low"].map(p => <option key={p} value={p} style={optionStyle}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              {(newTicket.category === "equipment" || newTicket.category === "kitchen" || newTicket.category === "maintenance") && (
                <select data-testid="new-ticket-equipment" value={newTicket.equipment_id} onChange={e => { const eq = equipment.find((x: any) => x.equipment_id === e.target.value); setNewTicket({ ...newTicket, equipment_id: e.target.value, equipment_name: eq?.name || "" }); }} style={{ ...selectStyle(!!newTicket.equipment_id), minWidth: 200 }}>
                  <option value="" style={optionStyle}>Select Equipment</option>
                  {equipment.map((eq: any) => <option key={eq.equipment_id} value={eq.equipment_id} style={optionStyle}>{eq.name} — {eq.location}</option>)}
                </select>
              )}
              <input value={newTicket.description} onChange={e => setNewTicket({ ...newTicket, description: e.target.value })} placeholder="Description (optional)" style={{ flex: 1, padding: "7px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "#1a2332", color: C.text, fontSize: 12 }} />
              {/* Photo Upload */}
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: "none" }} />
              <button data-testid="attach-photo-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ padding: "7px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: photos.length > 0 ? `${C.cyan}15` : "transparent", color: photos.length > 0 ? C.cyan : C.dim, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
                {uploading ? "..." : photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? "s" : ""}` : "Attach Photo"}
              </button>
              <button data-testid="submit-new-ticket" onClick={submitNewTicket} disabled={!newTicket.title || submitting} style={{ padding: "7px 18px", borderRadius: 6, border: "none", background: newTicket.title && !submitting ? C.accent : C.muted, color: "#000", fontSize: 12, fontWeight: 700, cursor: newTicket.title && !submitting ? "pointer" : "default", whiteSpace: "nowrap" }}>
                {submitting ? "Creating..." : "Create Ticket"}
              </button>
            </div>
            {/* Photo Preview */}
            {photos.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {photos.map((url, i) => (
                  <div key={i} style={{ position: "relative", width: 48, height: 48, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.border}` }}>
                    <img src={url} alt={`Photo ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))} style={{ position: "absolute", top: 0, right: 0, background: C.red, color: "#fff", border: "none", width: 14, height: 14, fontSize: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "0 0 0 4px" }}>x</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ background: "rgba(245,158,11,0.05)", position: "sticky", top: 0, zIndex: 2 }}>
              <SortHeader col="title" label="Title" />
              <SortHeader col="category" label="Category" />
              <SortHeader col="room_number" label="Room" />
              <SortHeader col="outlet_id" label="Outlet" />
              <SortHeader col="guest_name" label="Guest" />
              <SortHeader col="priority" label="Priority" />
              <SortHeader col="department" label="Dept" />
              <SortHeader col="recovery_cost" label="Recovery" />
              <SortHeader col="status" label="Status" />
              <th style={{ padding: "10px 10px", textAlign: "left", color: C.accent, fontWeight: 600, fontSize: 10, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>Actions</th>
            </tr></thead>
            <tbody>
              {paged.map(t => {
                const ctxItems = [
                  ...(t.status !== "in_progress" ? [{ label: "Start Working", icon: "▶", action: () => updateStatus(t.id, "in_progress"), color: C.blue }] : []),
                  ...(t.status !== "dispatched" ? [{ label: "Dispatch", icon: "↗", action: () => updateStatus(t.id, "dispatched"), color: C.cyan }] : []),
                  ...(t.status !== "resolved" ? [{ label: "Mark Resolved", icon: "✓", action: () => updateStatus(t.id, "resolved"), color: C.green }] : []),
                  ...(t.status !== "closed" ? [{ label: "Close Ticket", icon: "✕", action: () => updateStatus(t.id, "closed") }] : []),
                  { label: "divider", divider: true, action: () => {} },
                  ...(t.status === "open" ? [{ label: "Escalate to GM", icon: "⚡", action: () => updateStatus(t.id, "in_progress"), color: C.red }] : []),
                ];
                return (
                <RightClickMenu key={t.id} items={ctxItems}>
                <tr style={{ borderBottom: `1px solid ${C.border}30`, cursor: "context-menu" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(245,158,11,0.03)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "8px 10px", color: C.text, maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</td>
                  <td style={{ padding: "8px 10px" }}><Badge text={t.category} color={C.blue} /></td>
                  <td style={{ padding: "8px 10px", color: C.text, fontWeight: 600 }}>{t.room_number || "—"}</td>
                  <td style={{ padding: "8px 10px", color: C.dim, fontSize: 10 }}>{t.outlet_id ? (outlets.find((o: any) => o.outlet_id === t.outlet_id)?.name || t.outlet_id) : "—"}{t.equipment_name ? <div style={{ fontSize: 9, color: C.cyan }}>{t.equipment_name}</div> : null}</td>
                  <td style={{ padding: "8px 10px", color: C.dim }}>{t.guest_name}</td>
                  <td style={{ padding: "8px 10px" }}><Badge text={t.priority} color={priorityColors[t.priority] || C.dim} /></td>
                  <td style={{ padding: "8px 10px", color: C.dim }}>{t.department}</td>
                  <td style={{ padding: "8px 10px", color: t.recovery_cost > 0 ? C.amber : C.dim }}>{t.recovery_cost > 0 ? fmt(t.recovery_cost) : "—"}</td>
                  <td style={{ padding: "8px 10px" }}><Badge text={t.status} color={statusColors[t.status] || C.dim} /></td>
                  <td style={{ padding: "8px 10px" }}>
                    {t.status === "open" && <button onClick={() => updateStatus(t.id, "in_progress")} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.blue}30`, background: "transparent", color: C.blue, fontSize: 10, cursor: "pointer" }}>Start</button>}
                    {(t.status === "in_progress" || t.status === "dispatched") && <button onClick={() => updateStatus(t.id, "resolved")} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.green}30`, background: "transparent", color: C.green, fontSize: 10, cursor: "pointer" }}>Resolve</button>}
                  </td>
                </tr>
                </RightClickMenu>
                );
              })}
              {paged.length === 0 && <tr><td colSpan={10} style={{ padding: 30, textAlign: "center", color: C.dim }}>No tickets match your filters</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div data-testid="ticket-pagination" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderTop: `1px solid ${C.border}`, background: "rgba(245,158,11,0.02)" }}>
          <span style={{ fontSize: 11, color: C.dim }}>Total: <strong style={{ color: C.text }}>{filtered.length}</strong> tickets</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: "#1a2332", color: C.text, fontSize: 10 }}>
              {[10, 25, 50, 100].map(n => <option key={n} value={n} style={optionStyle}>{n} per page</option>)}
            </select>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: page <= 1 ? C.muted : C.text, fontSize: 10, cursor: page <= 1 ? "default" : "pointer" }}>←</button>
            <span style={{ fontSize: 10, color: C.text }}>Page {page}/{Math.max(1, totalPages)}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: page >= totalPages ? C.muted : C.text, fontSize: 10, cursor: page >= totalPages ? "default" : "pointer" }}>→</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════ SHIFT LOG TAB ═══════ */
function ShiftLogTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [form, setForm] = useState({ author: "", shift: "AM", notes: "", handoff_items: "", vip_alerts: "" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { fetch(`${API}/api/concierge/shift-log`).then(r => r.json()).then(d => setLogs(d.logs || [])); }, [submitted]);

  const submit = () => {
    fetch(`${API}/api/concierge/shift-log`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author: form.author, shift: form.shift, role: "MOD", notes: form.notes,
        handoff_items: form.handoff_items.split("\n").filter(Boolean),
        vip_alerts: form.vip_alerts.split("\n").filter(Boolean),
        open_issues: [],
      }),
    }).then(() => { setSubmitted(s => !s); setForm({ author: "", shift: "AM", notes: "", handoff_items: "", vip_alerts: "" }); });
  };

  const shiftColors: Record<string, string> = { AM: C.amber, PM: C.blue, Night: C.purple };

  return (
    <div data-testid="shift-log-tab" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* New Entry */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>New Shift Handoff</div>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input data-testid="shift-author" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} placeholder="Your Name" style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} />
            <select value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })} style={{ ...selectStyle(true), padding: "8px 12px", fontSize: 12 }}>
              {["AM", "PM", "Night"].map(s => <option key={s} value={s} style={optionStyle}>{s} Shift</option>)}
            </select>
          </div>
          <textarea data-testid="shift-notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Shift summary / notes..." rows={3} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, resize: "vertical" }} />
          <textarea value={form.handoff_items} onChange={e => setForm({ ...form, handoff_items: e.target.value })} placeholder="Handoff items (one per line)..." rows={2} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, resize: "vertical" }} />
          <textarea value={form.vip_alerts} onChange={e => setForm({ ...form, vip_alerts: e.target.value })} placeholder="VIP alerts (one per line)..." rows={2} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, resize: "vertical" }} />
          <button data-testid="submit-shift-log" onClick={submit} disabled={!form.author || !form.notes} style={{ padding: "10px", borderRadius: 6, border: "none", background: form.author && form.notes ? C.accent : C.muted, color: "#000", fontSize: 12, fontWeight: 600, cursor: form.author && form.notes ? "pointer" : "default" }}>Submit Shift Log</button>
        </div>
      </div>

      {/* Recent Logs */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>Recent Shift Logs</div>
        {logs.map(log => (
          <div key={log.id} style={{ borderBottom: `1px solid ${C.border}20`, padding: "10px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <div><span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{log.author}</span> <Badge text={log.shift} color={shiftColors[log.shift] || C.dim} /></div>
              <span style={{ fontSize: 10, color: C.dim }}>{new Date(log.created_at).toLocaleString()}</span>
            </div>
            <div style={{ fontSize: 11, color: C.text, marginBottom: 4, lineHeight: 1.4 }}>{log.notes}</div>
            {log.handoff_items?.length > 0 && (
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: C.amber, textTransform: "uppercase" }}>Handoff:</span>
                {log.handoff_items.map((h: string, i: number) => <div key={i} style={{ fontSize: 10, color: C.dim, paddingLeft: 8 }}>• {h}</div>)}
              </div>
            )}
            {log.vip_alerts?.length > 0 && (
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: C.red, textTransform: "uppercase" }}>VIP Alerts:</span>
                {log.vip_alerts.map((v: string, i: number) => <div key={i} style={{ fontSize: 10, color: C.red, paddingLeft: 8 }}>• {v}</div>)}
              </div>
            )}
            {log.auto_open_tickets?.length > 0 && (
              <div>
                <span style={{ fontSize: 9, fontWeight: 600, color: C.blue, textTransform: "uppercase" }}>Open Tickets ({log.auto_open_tickets.length}):</span>
                {log.auto_open_tickets.slice(0, 5).map((t: any) => <div key={t.id} style={{ fontSize: 10, color: C.dim, paddingLeft: 8 }}>Rm {t.room} — {t.title} <Badge text={t.priority} color={priorityColors[t.priority] || C.dim} /></div>)}
              </div>
            )}
          </div>
        ))}
        {logs.length === 0 && <div style={{ fontSize: 11, color: C.dim, padding: 20, textAlign: "center" }}>No shift logs yet</div>}
      </div>
    </div>
  );
}

/* ═══════ REPORT ISSUE TAB ═══════ */
function ReportIssueTab() {
  const [form, setForm] = useState({ guest_name: "", room_number: "", category: "room", priority: "medium", title: "", description: "", outlet_id: "", equipment_id: "", equipment_name: "" });
  const [submitted, setSubmitted] = useState(false);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  useEffect(() => { fetch(`${API}/api/concierge/outlets`).then(r => r.json()).then(d => setOutlets(d.outlets || [])); }, []);
  useEffect(() => {
    const url = form.outlet_id ? `${API}/api/concierge/equipment?outlet_id=${form.outlet_id}` : `${API}/api/concierge/equipment`;
    fetch(url).then(r => r.json()).then(d => setEquipment(d.equipment || []));
  }, [form.outlet_id]);
  const submit = () => {
    const eqItem = equipment.find((e: any) => e.equipment_id === form.equipment_id);
    const payload = { ...form, equipment_name: eqItem?.name || form.equipment_name, photos: [], reported_by: "staff", reporter_id: "" };
    fetch(`${API}/api/concierge/guest-report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(() => { setSubmitted(true); setTimeout(() => { setSubmitted(false); setForm({ guest_name: "", room_number: "", category: "room", priority: "medium", title: "", description: "", outlet_id: "", equipment_id: "", equipment_name: "" }); }, 2000); });
  };
  const categories = ["room", "maintenance", "restaurant", "kitchen", "spa", "facility", "noise", "billing", "amenity", "equipment", "other"];
  const showEquipment = form.category === "equipment" || form.category === "kitchen" || form.category === "maintenance";
  return (
    <div data-testid="concierge-report" style={{ maxWidth: 500 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Report New Issue</div>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={form.guest_name} onChange={e => setForm({ ...form, guest_name: e.target.value })} placeholder="Guest Name" style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} />
          <input value={form.room_number} onChange={e => setForm({ ...form, room_number: e.target.value })} placeholder="Room #" style={{ width: 80, padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ ...selectStyle(true), flex: 1, padding: "8px 12px", fontSize: 12 }}>
            {categories.map(c => <option key={c} value={c} style={optionStyle}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={{ ...selectStyle(true), width: 120, padding: "8px 12px", fontSize: 12 }}>
            {["critical", "high", "medium", "low"].map(p => <option key={p} value={p} style={optionStyle}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Issue title" style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} />
        <select data-testid="report-outlet" value={form.outlet_id} onChange={e => setForm({ ...form, outlet_id: e.target.value, equipment_id: "", equipment_name: "" })} style={{ ...selectStyle(!!form.outlet_id), padding: "8px 12px", fontSize: 12 }}>
          <option value="" style={optionStyle}>Select Outlet / Location</option>
          {outlets.map(o => <option key={o.outlet_id} value={o.outlet_id} style={optionStyle}>{o.name} ({o.type})</option>)}
        </select>
        {showEquipment && (
          <select data-testid="report-equipment" value={form.equipment_id} onChange={e => { const eq = equipment.find((x: any) => x.equipment_id === e.target.value); setForm({ ...form, equipment_id: e.target.value, equipment_name: eq?.name || "" }); }} style={{ ...selectStyle(!!form.equipment_id), padding: "8px 12px", fontSize: 12 }}>
            <option value="" style={optionStyle}>Select Equipment</option>
            {equipment.map(eq => <option key={eq.equipment_id} value={eq.equipment_id} style={optionStyle}>{eq.name} — {eq.location}</option>)}
          </select>
        )}
        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description..." rows={3} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, resize: "vertical" }} />
        <button onClick={submit} disabled={!form.title} data-testid="submit-issue-btn" style={{ padding: "10px 20px", borderRadius: 6, border: "none", background: form.title ? C.accent : C.muted, color: "#000", fontSize: 12, fontWeight: 600, cursor: form.title ? "pointer" : "default" }}>{submitted ? "Submitted!" : "Submit Issue"}</button>
      </div>
    </div>
  );
}

/* ═══════ ANALYTICS TAB ═══════ */
function AnalyticsTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${API}/api/concierge/analytics`).then(r => r.json()).then(setData); }, []);
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading...</div>;
  return (
    <div data-testid="concierge-analytics">
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", flex: 1 }}>
          <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 6 }}>Total Recovery Cost</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.amber, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(data.total_recovery_cost)}</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", flex: 1 }}>
          <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 6 }}>Avg Satisfaction</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: data.avg_satisfaction >= 4 ? C.green : C.amber, fontFamily: "'IBM Plex Mono', monospace" }}>{data.avg_satisfaction}/5</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", flex: 1 }}>
          <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 6 }}>Total Tickets</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: "'IBM Plex Mono', monospace" }}>{data.total_tickets}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>Room Hotspots</div>
          {(data.room_hotspots || []).map((r: any) => (
            <div key={r.room} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}20` }}>
              <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>Room {r.room}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: r.issues >= 3 ? C.red : C.amber }}>{r.issues} issues</span>
            </div>
          ))}
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>Recovery Breakdown</div>
          {(data.recovery_breakdown || []).map((r: any) => (
            <div key={r.type} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}20` }}>
              <span style={{ fontSize: 11, color: C.text, textTransform: "capitalize" }}>{r.type}</span>
              <span style={{ fontSize: 11, color: C.amber }}>{r.count}x / {fmt(r.cost)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════ MAIN ═══════ */
export default function EchoConcierge() {
  const [tab, setTab] = useState<Tab>("tickets");
  const tabs: { id: Tab; label: string }[] = [{ id: "tickets", label: "Tickets" }, { id: "report", label: "Report Issue" }, { id: "shift-log", label: "Shift Log" }, { id: "analytics", label: "Analytics" }];
  return (
    <div data-testid="echo-concierge-panel" style={{ height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${C.border}`, background: "rgba(245,158,11,0.04)", flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.accent }}>Echo Concierge</span>
        <div style={{ flex: 1 }} />
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`concierge-tab-${t.id}`} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${tab === t.id ? C.accent : "transparent"}`, background: tab === t.id ? C.accentDim : "transparent", color: tab === t.id ? C.accent : C.dim, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{t.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {tab === "tickets" && <TicketsTab />}
        {tab === "report" && <div style={{ padding: "20px 24px", overflowY: "auto", height: "100%" }}><ReportIssueTab /></div>}
        {tab === "shift-log" && <div style={{ padding: "20px 24px", overflowY: "auto", height: "100%" }}><ShiftLogTab /></div>}
        {tab === "analytics" && <div style={{ padding: "20px 24px", overflowY: "auto", height: "100%" }}><AnalyticsTab /></div>}
      </div>
    </div>
  );
}
