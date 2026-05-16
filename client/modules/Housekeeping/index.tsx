import React, { useState, useEffect, useCallback } from "react";
import { RightClickMenu } from "@/lib/context-menu";
const API = window.location.origin;
const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#06b6d4", accentDim: "rgba(6,182,212,0.12)", green: "#10b981", red: "#ef4444", amber: "#f59e0b", blue: "#3b82f6", text: "#e2e8f0", dim: "#64748b", muted: "#475569" };
function Badge({ text, color }: { text: string; color: string }) { return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, textTransform: "uppercase" }}>{text}</span>; }
const statusColors: Record<string, string> = { dirty: C.red, in_progress: C.amber, clean: C.green, inspected: "#06b6d4", occupied: C.blue, checkout: "#f97316", ooo: C.dim, vip_prep: "#d946ef" };

export default function Housekeeping() {
  const [data, setData] = useState<any>(null);
  const [floorFilter, setFloorFilter] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const load = useCallback(() => { fetch(`${API}/api/housekeeping/dashboard`).then(r => r.json()).then(setData); }, []);
  useEffect(() => { load(); }, [load]);
  const updateStatus = (rm: string, status: string) => { fetch(`${API}/api/housekeeping/rooms/${rm}/status?status=${status}`, { method: "PUT" }).then(() => load()); };
  const assignRoom = (rm: string, hkId: string) => { fetch(`${API}/api/housekeeping/rooms/${rm}/assign?housekeeper_id=${hkId}`, { method: "PUT" }).then(() => load()); };

  if (!data) return <div data-testid="housekeeping-panel" style={{ height: "100%", background: C.bg, padding: 40, textAlign: "center", color: C.dim, borderRadius: 10 }}>Loading...</div>;
  const k = data.kpis;
  const staff = data.staff || [];
  const rooms = (data.rooms || []).filter((r: any) => (!floorFilter || r.floor === floorFilter) && (!statusFilter || r.status === statusFilter));

  const getRoomContextItems = (r: any) => {
    const items: any[] = [];
    // Status changes
    if (r.status !== "clean") items.push({ label: "Mark Clean", icon: "✓", action: () => updateStatus(r.number, "clean"), color: C.green });
    if (r.status !== "inspected") items.push({ label: "Mark Inspected", icon: "★", action: () => updateStatus(r.number, "inspected"), color: "#06b6d4" });
    if (r.status !== "dirty") items.push({ label: "Mark Dirty", icon: "✗", action: () => updateStatus(r.number, "dirty"), color: C.red });
    if (r.status !== "occupied") items.push({ label: "Mark Occupied", icon: "●", action: () => updateStatus(r.number, "occupied"), color: C.blue });
    if (r.status !== "ooo") items.push({ label: "Out of Order", icon: "⊘", action: () => updateStatus(r.number, "ooo") });
    if (r.status !== "vip_prep") items.push({ label: "VIP Prep", icon: "♦", action: () => updateStatus(r.number, "vip_prep"), color: "#d946ef" });
    // Divider
    items.push({ label: "divider", divider: true, action: () => {} });
    // Assign housekeeper
    staff.forEach((s: any) => {
      items.push({ label: `Assign → ${s.name}`, icon: "👤", action: () => assignRoom(r.number, s.id) });
    });
    return items;
  };

  return (
    <div data-testid="housekeeping-panel" style={{ height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, background: "rgba(6,182,212,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.accent }}>Housekeeping — Room Board</div>
          <div style={{ fontSize: 10, color: C.dim, background: `${C.accent}10`, padding: "4px 10px", borderRadius: 6 }}>Right-click rooms for quick actions</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          {[{ l: "Total", v: k.total_rooms }, { l: "Occupied", v: k.occupied, c: C.blue }, { l: "Dirty", v: k.dirty, c: C.red }, { l: "Clean", v: k.clean, c: C.green }, { l: "Inspected", v: k.inspected, c: "#06b6d4" }, { l: "OOO", v: k.ooo }, { l: "VIP", v: k.vip_rooms, c: "#d946ef" }, { l: "Staff", v: k.staff_on_duty }].map(kpi => (
            <div key={kpi.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", flex: "1 1 90px", minWidth: 80 }}>
              <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", marginBottom: 4 }}>{kpi.l}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: (kpi as any).c || C.text, fontFamily: "'IBM Plex Mono', monospace" }}>{kpi.v}</div>
            </div>
          ))}
        </div>
        {/* Filters */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          <button onClick={() => setFloorFilter(0)} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${!floorFilter ? C.accent : C.border}`, background: !floorFilter ? C.accentDim : "transparent", color: !floorFilter ? C.accent : C.dim, fontSize: 10, cursor: "pointer" }}>All Floors</button>
          {[2, 3, 4, 5, 6].map(f => <button key={f} onClick={() => setFloorFilter(f)} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${floorFilter === f ? C.accent : C.border}`, background: floorFilter === f ? C.accentDim : "transparent", color: floorFilter === f ? C.accent : C.dim, fontSize: 10, cursor: "pointer" }}>Floor {f}</button>)}
          <div style={{ width: 1, background: C.border, margin: "0 4px" }} />
          <button onClick={() => setStatusFilter("")} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${!statusFilter ? C.accent : C.border}`, background: !statusFilter ? C.accentDim : "transparent", color: !statusFilter ? C.accent : C.dim, fontSize: 10, cursor: "pointer" }}>All</button>
          {["dirty", "clean", "inspected", "occupied", "checkout"].map(s => <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${statusFilter === s ? statusColors[s] : C.border}`, background: statusFilter === s ? `${statusColors[s]}15` : "transparent", color: statusFilter === s ? statusColors[s] : C.dim, fontSize: 10, cursor: "pointer", textTransform: "capitalize" }}>{s}</button>)}
        </div>
        {/* Room Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
          {rooms.map((r: any) => (
            <RightClickMenu key={r.id} items={getRoomContextItems(r)} testId={`room-ctx-${r.number}`}>
              <div data-testid={`room-${r.number}`} style={{ background: C.card, border: `1px solid ${statusColors[r.status] || C.border}40`, borderRadius: 8, padding: 10, textAlign: "center", cursor: "pointer", position: "relative" }}>
                {r.vip && <div style={{ position: "absolute", top: 4, right: 4, width: 6, height: 6, borderRadius: "50%", background: "#d946ef" }} />}
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{r.number}</div>
                <Badge text={r.status} color={statusColors[r.status] || C.dim} />
                <div style={{ fontSize: 8, color: C.muted, marginTop: 4 }}>{r.room_type}</div>
                {r.housekeeper_name && <div style={{ fontSize: 7, color: C.accent, marginTop: 2 }}>{r.housekeeper_name}</div>}
              </div>
            </RightClickMenu>
          ))}
        </div>
      </div>
    </div>
  );
}
