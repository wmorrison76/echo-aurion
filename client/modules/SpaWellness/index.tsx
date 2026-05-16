import React, { useState, useEffect, useCallback } from "react";
import { RightClickMenu } from "@/lib/context-menu";

const API = window.location.origin;
const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#d946ef", accentDim: "rgba(217,70,239,0.12)", green: "#10b981", red: "#ef4444", amber: "#f59e0b", blue: "#3b82f6", text: "#e2e8f0", dim: "#64748b", muted: "#475569" };
const fmt = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

type Tab = "dashboard" | "treatments" | "appointments" | "clients" | "staff" | "rooms" | "promotions" | "analytics";

function Badge({ text, color }: { text: string; color: string }) {
  return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, textTransform: "uppercase" }}>{text}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { confirmed: C.green, completed: C.blue, cancelled: C.red, pending: C.amber, no_show: C.muted };
  return <Badge text={status} color={colors[status] || C.dim} />;
}

/* ── Dashboard Tab ── */
function DashboardTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${API}/api/spa/dashboard`).then(r => r.json()).then(setData); }, []);
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading...</div>;
  const k = data.kpis;
  return (
    <div data-testid="spa-dashboard-tab">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {[{ l: "Today's Appts", v: k.today_appointments }, { l: "Today Revenue", v: fmt(k.today_revenue) }, { l: "Treatments", v: k.active_treatments }, { l: "Clients", v: k.total_clients }, { l: "VIP Clients", v: k.vip_clients }, { l: "Therapists", v: k.total_therapists }, { l: "Rooms", v: `${k.available_rooms}/${k.total_rooms}` }, { l: "Flagged Bookings", v: k.flagged_bookings }, { l: "Expiring Creds", v: k.expiring_credentials }].map(kpi => (
          <div key={kpi.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", flex: "1 1 140px", minWidth: 130 }}>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{kpi.l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: "'IBM Plex Mono', monospace" }}>{kpi.v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 3, height: 16, background: C.accent, borderRadius: 2 }} />Today's Schedule</div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ background: "rgba(217,70,239,0.06)" }}>{["Time", "Client", "Treatment", "Therapist", "Room", "Duration", "Price", "Status"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: C.accent, fontWeight: 600, fontSize: 10, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {(data.today_schedule || []).map((a: any) => (
              <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}40` }}>
                <td style={{ padding: "8px 12px", color: C.text, fontWeight: 600 }}>{a.time}</td>
                <td style={{ padding: "8px 12px", color: C.text }}>{a.client_name}</td>
                <td style={{ padding: "8px 12px", color: C.text }}>{a.treatment_name}</td>
                <td style={{ padding: "8px 12px", color: C.dim }}>{a.therapist_name}</td>
                <td style={{ padding: "8px 12px", color: C.dim }}>{a.room_name || "—"}</td>
                <td style={{ padding: "8px 12px", color: C.dim }}>{a.duration_mins}m</td>
                <td style={{ padding: "8px 12px", color: C.green, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(a.price)}</td>
                <td style={{ padding: "8px 12px" }}>{a.qualification_flag ? <Badge text="FLAGGED" color={C.red} /> : <StatusBadge status={a.status} />}</td>
              </tr>
            ))}
            {(data.today_schedule || []).length === 0 && <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: C.dim }}>No appointments today</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Treatments Tab ── */
function TreatmentsTab() {
  const [treatments, setTreatments] = useState<any[]>([]);
  const load = useCallback(() => { fetch(`${API}/api/spa/treatments?active_only=false`).then(r => r.json()).then(d => setTreatments(d.treatments || [])); }, []);
  useEffect(() => { load(); }, [load]);
  const catColors: Record<string, string> = { massage: C.accent, facial: C.blue, body: C.green, nail: C.amber, hair: "#ec4899", package: "#c8a97e" };
  return (
    <div data-testid="spa-treatments-tab">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {treatments.map(t => (
          <div key={t.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, borderTop: `3px solid ${catColors[t.category] || C.dim}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t.name}</div>
              <Badge text={t.category} color={catColors[t.category] || C.dim} />
            </div>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 10, lineHeight: 1.4 }}>{t.description}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(t.price)}</span>
              <span style={{ fontSize: 11, color: C.dim }}>{t.duration_mins} min</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: C.muted }}>Room: {t.room_type} | Level: {t.therapist_required}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Appointments Tab ── */
function AppointmentsTab() {
  const [apts, setApts] = useState<any[]>([]);
  const load = useCallback(() => { fetch(`${API}/api/spa/appointments`).then(r => r.json()).then(d => setApts(d.appointments || [])); }, []);
  useEffect(() => { load(); }, [load]);
  const updateStatus = (id: string, status: string) => { fetch(`${API}/api/spa/appointments/${id}/status?status=${status}`, { method: "PUT" }).then(() => load()); };
  return (
    <div data-testid="spa-appointments-tab">
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ background: "rgba(217,70,239,0.06)" }}>{["Date", "Time", "Client", "Treatment", "Therapist", "Room", "Price", "Status", "Actions"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: C.accent, fontWeight: 600, fontSize: 10, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {apts.map(a => {
              const aptCtx = [
                ...(a.status === "confirmed" ? [{ label: "Check In Guest", icon: "✓", action: () => updateStatus(a.id, "in_progress"), color: C.blue }] : []),
                ...(a.status !== "completed" ? [{ label: "Mark Completed", icon: "★", action: () => updateStatus(a.id, "completed"), color: C.green }] : []),
                ...(a.status !== "cancelled" && a.status !== "completed" ? [{ label: "Cancel Booking", icon: "✕", action: () => updateStatus(a.id, "cancelled"), color: C.red }] : []),
                ...(a.status === "confirmed" ? [{ label: "Mark No-Show", icon: "⊘", action: () => updateStatus(a.id, "no_show") }] : []),
                { label: "divider", divider: true, action: () => {} },
                { label: "View Guest Profile", icon: "👤", action: () => {} },
                { label: "Send Reminder", icon: "✉", action: () => {} },
              ];
              return (
              <RightClickMenu key={a.id} items={aptCtx}>
              <tr style={{ borderBottom: `1px solid ${C.border}40`, background: a.qualification_flag ? "rgba(239,68,68,0.04)" : "transparent", cursor: "context-menu" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,70,239,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = a.qualification_flag ? "rgba(239,68,68,0.04)" : "transparent")}>
                <td style={{ padding: "8px 12px", color: C.text }}>{a.date}</td>
                <td style={{ padding: "8px 12px", color: C.text, fontWeight: 600 }}>{a.time}</td>
                <td style={{ padding: "8px 12px", color: C.text }}>{a.client_name}</td>
                <td style={{ padding: "8px 12px", color: C.text }}>{a.treatment_name}</td>
                <td style={{ padding: "8px 12px", color: C.dim }}>{a.therapist_name}</td>
                <td style={{ padding: "8px 12px", color: C.dim }}>{a.room_name || "—"}</td>
                <td style={{ padding: "8px 12px", color: C.green, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(a.price)}</td>
                <td style={{ padding: "8px 12px" }}>{a.qualification_flag ? <Badge text="QUAL FLAG" color={C.red} /> : <StatusBadge status={a.status} />}</td>
                <td style={{ padding: "8px 12px" }}>
                  {a.status === "confirmed" && <button onClick={() => updateStatus(a.id, "completed")} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.green}30`, background: "transparent", color: C.green, fontSize: 10, cursor: "pointer", marginRight: 4 }}>Complete</button>}
                  {a.status !== "cancelled" && a.status !== "completed" && <button onClick={() => updateStatus(a.id, "cancelled")} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.red}30`, background: "transparent", color: C.red, fontSize: 10, cursor: "pointer" }}>Cancel</button>}
                </td>
              </tr>
              </RightClickMenu>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Clients CRM Tab ── */
function ClientsTab() {
  const [clients, setClients] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  useEffect(() => { fetch(`${API}/api/spa/clients`).then(r => r.json()).then(d => setClients(d.clients || [])); }, []);
  const viewClient = (id: string) => { fetch(`${API}/api/spa/clients/${id}`).then(r => r.json()).then(setSelected); };
  return (
    <div data-testid="spa-clients-tab" style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 16 }}>
      <div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ background: "rgba(217,70,239,0.06)" }}>{["Name", "Email", "VIP", "Visits", "Spent", ""].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: C.accent, fontWeight: 600, fontSize: 10, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
            <tbody>
              {clients.map(cl => (
                <tr key={cl.id} style={{ borderBottom: `1px solid ${C.border}40`, cursor: "pointer" }} onClick={() => viewClient(cl.id)} onMouseEnter={e => (e.currentTarget.style.background = "rgba(217,70,239,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "8px 12px", color: C.text, fontWeight: 600 }}>{cl.first_name} {cl.last_name}</td>
                  <td style={{ padding: "8px 12px", color: C.dim }}>{cl.email}</td>
                  <td style={{ padding: "8px 12px" }}>{cl.vip && <Badge text="VIP" color={C.accent} />}</td>
                  <td style={{ padding: "8px 12px", color: C.text }}>{cl.total_visits}</td>
                  <td style={{ padding: "8px 12px", color: C.green, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(cl.total_spent)}</td>
                  <td style={{ padding: "8px 12px", color: C.accent, fontSize: 11 }}>View</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selected && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{selected.first_name} {selected.last_name}</div>
              <div style={{ fontSize: 11, color: C.dim }}>{selected.email} | {selected.phone}</div>
            </div>
            {selected.vip && <Badge text="VIP" color={C.accent} />}
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 4 }}>Preferences</div>
            <div style={{ fontSize: 12, color: C.text }}>{selected.preferences || "None specified"}</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 4 }}>Allergies</div>
            <div style={{ fontSize: 12, color: selected.allergies && selected.allergies !== "None" ? C.red : C.text }}>{selected.allergies || "None"}</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginTop: 16, marginBottom: 8 }}>Visit History</div>
          {(selected.visit_history || []).map((v: any) => (
            <div key={v.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}30`, fontSize: 11 }}>
              <span style={{ color: C.text }}>{v.date} {v.time}</span>
              <span style={{ color: C.dim }}>{v.treatment_name}</span>
              <StatusBadge status={v.status} />
            </div>
          ))}
          <button onClick={() => setSelected(null)} style={{ marginTop: 12, padding: "6px 16px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, fontSize: 11, cursor: "pointer" }}>Close</button>
        </div>
      )}
    </div>
  );
}

/* ── Staff & Credentials Tab ── */
function StaffTab() {
  const [data, setData] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  useEffect(() => { fetch(`${API}/api/spa/therapists`).then(r => r.json()).then(setData); }, []);
  const viewTherapist = (id: string) => { fetch(`${API}/api/spa/therapists/${id}`).then(r => r.json()).then(setSelected); };
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading...</div>;
  const empColors: Record<string, string> = { in_house: C.green, outsourced: C.amber, contractor: C.blue };
  return (
    <div data-testid="spa-staff-tab" style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 16 }}>
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {(data.therapists || []).map((th: any) => (
            <div key={th.id} onClick={() => viewTherapist(th.id)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, cursor: "pointer", borderLeft: `3px solid ${empColors[th.employee_type] || C.dim}`, transition: "all 0.15s" }} onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent)} onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{th.name}</div>
                <Badge text={th.employee_type?.replace("_", " ") || "staff"} color={empColors[th.employee_type] || C.dim} />
              </div>
              <div style={{ fontSize: 11, color: C.accent, fontWeight: 600, marginBottom: 6 }}>{th.specialty} — {th.level}</div>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 8 }}>{th.bio}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                {(th.qualifications || []).slice(0, 4).map((q: string) => <span key={q} style={{ padding: "1px 6px", borderRadius: 3, fontSize: 8, background: "rgba(217,70,239,0.1)", color: C.accent }}>{q.replace(/_/g, " ")}</span>)}
                {(th.qualifications || []).length > 4 && <span style={{ fontSize: 8, color: C.dim }}>+{th.qualifications.length - 4} more</span>}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted }}>
                <span>{(th.credentials || []).length} credential{(th.credentials || []).length !== 1 ? "s" : ""}</span>
                <span>{th.hourly_rate ? `$${th.hourly_rate}/hr` : ""}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selected && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, maxHeight: 600, overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{selected.name}</div>
              <div style={{ fontSize: 11, color: C.accent, fontWeight: 600 }}>{selected.specialty} — {selected.level}</div>
            </div>
            <Badge text={selected.employee_type?.replace("_", " ") || "staff"} color={empColors[selected.employee_type] || C.dim} />
          </div>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 12 }}>{selected.email} | {selected.phone} {selected.hourly_rate ? `| $${selected.hourly_rate}/hr` : ""}</div>
          <div style={{ fontSize: 11, color: C.text, marginBottom: 16, lineHeight: 1.5 }}>{selected.bio}</div>

          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Qualifications</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {(selected.qualification_labels || selected.qualifications || []).map((q: string) => <span key={q} style={{ padding: "3px 10px", borderRadius: 4, fontSize: 10, background: "rgba(217,70,239,0.12)", color: C.accent, fontWeight: 500 }}>{q.replace(/_/g, " ")}</span>)}
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Credentials & Licenses</div>
          {(selected.credentials || []).length === 0 && <div style={{ fontSize: 11, color: C.dim, marginBottom: 12 }}>No credentials on file</div>}
          {(selected.credentials || []).map((cred: any, i: number) => {
            const isExpiring = cred.expiry_date && cred.expiry_date <= new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
            const isExpired = cred.expiry_date && cred.expiry_date < new Date().toISOString().slice(0, 10);
            return (
              <div key={i} style={{ background: C.bg, border: `1px solid ${isExpired ? C.red : isExpiring ? C.amber : C.border}30`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{cred.name}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Badge text={cred.credential_type} color={C.blue} />
                    {cred.verified && <Badge text="Verified" color={C.green} />}
                    {isExpired && <Badge text="Expired" color={C.red} />}
                    {isExpiring && !isExpired && <Badge text="Expiring Soon" color={C.amber} />}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: C.dim }}>
                  {cred.issuer && <span>Issuer: {cred.issuer} | </span>}
                  {cred.license_number && <span>License: {cred.license_number} | </span>}
                  {cred.expiry_date && <span>Expires: {cred.expiry_date}</span>}
                </div>
              </div>
            );
          })}

          {selected.recent_appointments && selected.recent_appointments.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginTop: 16, marginBottom: 8, textTransform: "uppercase" }}>Recent Appointments</div>
              {selected.recent_appointments.slice(0, 5).map((a: any) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}20`, fontSize: 11 }}>
                  <span style={{ color: C.text }}>{a.date} {a.time}</span>
                  <span style={{ color: C.dim }}>{a.treatment_name}</span>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </>
          )}
          <button onClick={() => setSelected(null)} style={{ marginTop: 14, padding: "6px 16px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, fontSize: 11, cursor: "pointer" }}>Close</button>
        </div>
      )}
    </div>
  );
}

/* ── Rooms Tab ── */
function RoomsTab() {
  const [rooms, setRooms] = useState<any[]>([]);
  useEffect(() => { fetch(`${API}/api/spa/rooms`).then(r => r.json()).then(d => setRooms(d.rooms || [])); }, []);
  const typeColors: Record<string, string> = { treatment: C.accent, wet: C.blue, nail: C.amber, couples: "#ec4899", sauna: "#f97316", steam: C.green, hair: "#8b5cf6" };
  const statusColors: Record<string, string> = { available: C.green, occupied: C.amber, maintenance: C.red, closed: C.dim };
  return (
    <div data-testid="spa-rooms-tab">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {rooms.map(r => (
          <div key={r.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, borderTop: `3px solid ${typeColors[r.room_type] || C.dim}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{r.name}</div>
              <Badge text={r.status} color={statusColors[r.status] || C.dim} />
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <Badge text={r.room_type} color={typeColors[r.room_type] || C.dim} />
              <span style={{ fontSize: 10, color: C.dim }}>Cap: {r.capacity} | {r.floor}</span>
            </div>
            <div style={{ fontSize: 10, color: C.muted }}>
              <span style={{ fontWeight: 600 }}>Equipment:</span> {(r.equipment || []).join(", ") || "None listed"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Promotions Tab ── */
function PromotionsTab() {
  const [promos, setPromos] = useState<any[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [list, setList] = useState("all");
  useEffect(() => { fetch(`${API}/api/spa/promotions`).then(r => r.json()).then(d => setPromos(d.promotions || [])); }, []);
  const send = () => {
    fetch(`${API}/api/spa/promotions/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, body, recipient_list: list }) })
      .then(r => r.json()).then(() => { setSubject(""); setBody(""); fetch(`${API}/api/spa/promotions`).then(r => r.json()).then(d => setPromos(d.promotions || [])); });
  };
  return (
    <div data-testid="spa-promotions-tab" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>New Promotion</div>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject line..." style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, marginBottom: 10 }} data-testid="promo-subject" />
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Email body..." rows={5} style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, marginBottom: 10, resize: "vertical" }} data-testid="promo-body" />
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {["all", "vip", "recent"].map(l => (
            <button key={l} onClick={() => setList(l)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${list === l ? C.accent : C.border}`, background: list === l ? C.accentDim : "transparent", color: list === l ? C.accent : C.dim, fontSize: 11, cursor: "pointer", textTransform: "capitalize" }}>{l}</button>
          ))}
        </div>
        <button onClick={send} disabled={!subject || !body} data-testid="send-promo-btn" style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: subject && body ? C.accent : C.muted, color: "#fff", fontSize: 12, fontWeight: 600, cursor: subject && body ? "pointer" : "default" }}>Send Promotion (BCC)</button>
        <div style={{ fontSize: 9, color: C.muted, marginTop: 6 }}>Requires SendGrid/Resend integration for actual email delivery</div>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Sent Promotions</div>
        {promos.map(p => (
          <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{p.subject}</div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{p.recipient_count} recipients ({p.recipient_list}) | <Badge text={p.status} color={p.status === "queued" ? C.amber : C.green} /></div>
          </div>
        ))}
        {promos.length === 0 && <div style={{ color: C.dim, fontSize: 12 }}>No promotions sent yet</div>}
      </div>
    </div>
  );
}

/* ── Spa Analytics Tab ── */
function SpaAnalyticsTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${API}/api/dept-analytics/spa`).then(r => r.json()).then(setData); }, []);
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading analytics...</div>;
  const k = data.kpis;
  return (
    <div data-testid="spa-analytics-tab">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {[{ l: "Total Revenue", v: fmt(k.total_revenue) }, { l: "Appointments", v: k.total_appointments }, { l: "Avg Ticket", v: fmt(k.avg_ticket) }, { l: "Clients", v: k.total_clients }, { l: "Repeat Clients", v: k.repeat_clients }, { l: "Retention", v: `${k.retention_rate}%` }, { l: "Avg Daily Rev", v: fmt(k.avg_daily_revenue) }].map(kpi => (
          <div key={kpi.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", flex: "1 1 130px", minWidth: 120 }}>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{kpi.l}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: "'IBM Plex Mono', monospace" }}>{kpi.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>Revenue by Treatment</div>
          {(data.treatment_mix || []).map((t: any) => (
            <div key={t.treatment} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}20` }}>
              <span style={{ fontSize: 11, color: C.text }}>{t.treatment}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 10, color: C.dim }}>{t.count} appts</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(t.revenue)}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>Therapist Utilization</div>
          {(data.therapist_utilization || []).map((t: any) => (
            <div key={t.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: C.text }}>{t.name} <span style={{ fontSize: 9, color: C.dim }}>({t.specialty})</span></span>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.accent }}>{t.utilization_pct}%</span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.04)", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${Math.min(t.utilization_pct, 100)}%`, background: t.utilization_pct > 80 ? C.red : t.utilization_pct > 50 ? C.amber : C.accent, borderRadius: 2, transition: "width 0.6s" }} />
              </div>
              <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>{t.appointments} appointments | {fmt(t.revenue)} revenue | {t.employee_type}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>Revenue by Category</div>
          {(data.category_mix || []).map((c: any) => (
            <div key={c.category} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}20` }}>
              <span style={{ fontSize: 11, color: C.text, textTransform: "capitalize" }}>{c.category}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.accent }}>{fmt(c.revenue)} ({c.pct}%)</span>
            </div>
          ))}
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>Peak Booking Hours</div>
          {(data.peak_hours || []).filter((h: any) => h.count > 0).map((h: any) => (
            <div key={h.hour} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
              <span style={{ fontSize: 11, color: C.text }}>{h.label}</span>
              <div style={{ flex: 1, margin: "0 12px", height: 4, background: "rgba(255,255,255,0.04)", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${Math.min((h.count / Math.max(...(data.peak_hours || []).map((p: any) => p.count || 1))) * 100, 100)}%`, background: C.accent, borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 10, color: C.dim, minWidth: 60, textAlign: "right" }}>{h.appointments} / {fmt(h.revenue)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Layout ── */
export default function SpaWellness() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const tabs: { id: Tab; label: string }[] = [{ id: "dashboard", label: "Dashboard" }, { id: "treatments", label: "Treatment Menu" }, { id: "appointments", label: "Appointments" }, { id: "clients", label: "Client CRM" }, { id: "staff", label: "Staff & Credentials" }, { id: "rooms", label: "Rooms" }, { id: "analytics", label: "Analytics" }, { id: "promotions", label: "Promotions" }];
  return (
    <div data-testid="spa-wellness-panel" style={{ height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "12px 20px", borderBottom: `1px solid ${C.border}`, background: "rgba(217,70,239,0.04)", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`spa-tab-${t.id}`} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${tab === t.id ? C.accent : "transparent"}`, background: tab === t.id ? C.accentDim : "transparent", color: tab === t.id ? C.accent : C.dim, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}>{t.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {tab === "dashboard" && <DashboardTab />}
        {tab === "treatments" && <TreatmentsTab />}
        {tab === "appointments" && <AppointmentsTab />}
        {tab === "clients" && <ClientsTab />}
        {tab === "staff" && <StaffTab />}
        {tab === "rooms" && <RoomsTab />}
        {tab === "analytics" && <SpaAnalyticsTab />}
        {tab === "promotions" && <PromotionsTab />}
      </div>
    </div>
  );
}
