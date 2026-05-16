import React, { useState, useEffect, useCallback } from "react";
import {
  Flame, AlertTriangle, Clock, Users, Gauge, ChefHat, Thermometer,
  RefreshCw, Package, Truck, Shield, Zap, Activity, FileText, Printer,
} from "lucide-react";

const API = window.location.origin;
const GET = (path: string) => fetch(`${API}/api${path}`).then(r => r.json());
const POST = (path: string, body: any = {}) =>
  fetch(`${API}/api${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());

const FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };
const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const BG = "#04060d";
const SURFACE = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#c8a97e";

export default function KitchenWarRoomPanel() {
  const [equipment, setEquipment] = useState<any>(null);
  const [firingData, setFiringData] = useState<any>(null);
  const [cartLabels, setCartLabels] = useState<any>(null);
  const [shortages, setShortages] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeBeos, setActiveBeos] = useState<number[]>([7186, 7169]);
  const [fireTime, setFireTime] = useState("17:30");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [eq, fire, carts, short] = await Promise.all([
        GET("/kitchen-production/equipment"),
        POST("/kitchen-production/firing-sequence", { beo_numbers: activeBeos, fire_time: fireTime }),
        POST("/kitchen-production/cart-labels", { beo_numbers: activeBeos }),
        POST("/kitchen-production/supplier-shortage/detect", { beo_numbers: activeBeos }),
      ]);
      setEquipment(eq);
      setFiringData(fire);
      setCartLabels(carts);
      setShortages(short);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [activeBeos, fireTime]);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) return (
    <div className="flex items-center justify-center h-full" style={{ background: BG }}>
      <RefreshCw className="w-5 h-5 animate-spin" style={{ color: ACCENT }} />
    </div>
  );

  const eq = equipment?.summary || {};
  const demand = firingData?.demand || {};

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ ...FONT, background: BG, color: "#e2e8f0" }}
      data-testid="kitchen-war-room">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <Flame className="w-4 h-4" style={{ color: "#ef4444" }} />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-white">KITCHEN WAR ROOM</div>
            <div className="text-[9px] tracking-[0.2em] uppercase" style={{ ...MONO, color: "rgba(239,68,68,0.5)" }}>LIVE OPERATIONS</div>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-[10px]" style={MONO}>
          <span style={{ color: "rgba(148,163,184,0.4)" }}>Fire:</span>
          <input type="time" value={fireTime} onChange={e => setFireTime(e.target.value)}
            className="px-2 py-1 rounded outline-none"
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
          <button onClick={loadAll} className="px-3 py-1 rounded flex items-center gap-1"
            style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.15)" }}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: "thin" }}>
        {/* Top KPI Strip */}
        <div className="grid grid-cols-6 gap-2">
          <WarKPI icon={Flame} label="Working Ovens" value={`${eq.working_ovens || 0} / 4`} color={eq.working_ovens < 3 ? "#ef4444" : "#10b981"} />
          <WarKPI icon={Package} label="Oven Capacity" value={`${eq.total_oven_sheet_pan_capacity || 0} pans`} />
          <WarKPI icon={Gauge} label="Utilization" value={`${demand.utilization_pct || 0}%`} color={demand.has_bottleneck ? "#ef4444" : "#10b981"} />
          <WarKPI icon={AlertTriangle} label="Overflow" value={`${demand.overflow_pans || 0} pans`} color={demand.overflow_pans > 0 ? "#ef4444" : "#10b981"} />
          <WarKPI icon={Truck} label="Shortages" value={`${shortages?.shortages?.length || 0}`} color={(shortages?.shortages?.length || 0) > 0 ? "#f59e0b" : "#10b981"} />
          <WarKPI icon={Users} label="Callouts" value={`${(shortages?.callouts?.foh_shortages?.length || 0) + (shortages?.callouts?.boh_shortages?.length || 0)}`} />
        </div>

        {/* Bottleneck Alert */}
        {demand.has_bottleneck && (
          <div className="rounded-lg p-4" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)", borderLeft: "4px solid #ef4444" }}
            data-testid="bottleneck-alert">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" style={{ color: "#ef4444" }} />
              <span className="text-sm font-bold text-white">OVEN BOTTLENECK DETECTED</span>
              <span className="text-[10px] px-2 py-0.5 rounded" style={{ ...MONO, background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                {demand.utilization_pct}% CAPACITY
              </span>
            </div>
            <div className="text-[11px]" style={{ color: "rgba(226,232,240,0.7)" }}>
              Need {demand.total_sheet_pans_needed} sheet pans but only {demand.total_oven_capacity} oven slots available. {demand.overflow_pans} pans overflow.
            </div>
            {firingData?.echostratus_solutions?.map((s: any, i: number) => (
              <div key={i} className="mt-2 flex items-start gap-2 p-2 rounded" style={{ background: "rgba(255,255,255,0.02)" }}>
                <Zap className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#f59e0b" }} />
                <div>
                  <span className="text-[10px] font-semibold text-white">{s.title}</span>
                  <span className="text-[10px] ml-2" style={{ color: "rgba(148,163,184,0.4)" }}>{s.description?.slice(0, 120)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Equipment Status */}
          <div className="rounded-lg overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
            data-testid="equipment-grid">
            <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <span className="text-[10px] uppercase tracking-widest" style={{ ...MONO, color: ACCENT }}>Equipment Status</span>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {equipment?.equipment?.filter((e: any) => e.type !== "speed_rack").map((e: any) => {
                const isOven = e.type === "combi_oven";
                const isDown = e.status === "repair";
                return (
                  <div key={e.id} className="rounded p-2.5" style={{
                    background: isDown ? "rgba(239,68,68,0.04)" : "rgba(16,185,129,0.02)",
                    border: `1px solid ${isDown ? "rgba(239,68,68,0.1)" : BORDER}`,
                  }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-white truncate">{e.name?.replace("Rational iCombi Pro 20-2/1", "Rational").replace("Rational ", "R-")}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded uppercase" style={{
                        ...MONO,
                        background: isDown ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.08)",
                        color: isDown ? "#ef4444" : "#10b981",
                      }}>{e.status}</span>
                    </div>
                    <div className="text-[9px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>
                      {isOven ? `${e.sheet_pan_capacity} pan slots` : e.type.replace(/_/g, " ")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Firing Timeline */}
          <div className="rounded-lg overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
            data-testid="firing-timeline">
            <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <span className="text-[10px] uppercase tracking-widest" style={{ ...MONO, color: "#ef4444" }}>Firing Timeline</span>
              <span className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.3)" }}>Fire @ {fireTime}</span>
            </div>
            <div className="p-3 space-y-1 max-h-64 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {firingData?.firing_timeline?.map((t: any, i: number) => (
                <div key={i} className="flex items-start gap-2 py-1" style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <div className="w-14 shrink-0 text-right">
                    <span className="text-[10px] font-bold" style={{ ...MONO, color: t.wave === 3 ? "#ef4444" : (t.wave === 1 ? "#f59e0b" : "#10b981") }}>
                      T{t.offset_min >= 0 ? "+" : ""}{t.offset_min}m
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-medium text-white">{t.action}</div>
                    <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.4)" }}>{t.detail?.slice(0, 80)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Labels + Supplier Shortages side by side */}
        <div className="grid grid-cols-2 gap-4">
          {/* Cart Labels */}
          <div className="rounded-lg overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
            data-testid="cart-labels-section">
            <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <span className="text-[10px] uppercase tracking-widest" style={{ ...MONO, color: ACCENT }}>
                Cart Assignments ({cartLabels?.total_carts || 0} carts)
              </span>
            </div>
            <div className="p-3 space-y-2 max-h-52 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {cartLabels?.labels?.map((l: any, i: number) => (
                <div key={i} className="rounded p-2" style={{
                  background: l.cart_type === "HOT" ? "rgba(239,68,68,0.03)" : "rgba(59,130,246,0.03)",
                  border: `1px solid ${l.cart_type === "HOT" ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)"}`,
                }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold" style={{ color: l.cart_type === "HOT" ? "#ef4444" : "#3b82f6" }}>
                      Cart #{l.cart_number}
                    </span>
                    <span className="text-[10px] font-bold" style={{ ...MONO, color: ACCENT }}>
                      BEO #{l.beo_number} → {l.room}
                    </span>
                  </div>
                  <div className="text-[9px] mt-1" style={{ color: "rgba(148,163,184,0.4)" }}>
                    {l.total_sheet_pans} pans | {l.cart_type} | {l.items?.length} items
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supplier Alerts */}
          <div className="rounded-lg overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
            data-testid="supplier-alerts">
            <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <span className="text-[10px] uppercase tracking-widest" style={{ ...MONO, color: "#f59e0b" }}>
                Supplier Alerts ({shortages?.shortages?.length || 0})
              </span>
            </div>
            <div className="p-3 space-y-2 max-h-52 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {shortages?.shortages?.map((s: any, i: number) => (
                <div key={i} className="rounded p-2" style={{
                  background: "rgba(245,158,11,0.03)", border: `1px solid rgba(245,158,11,0.1)`,
                  borderLeft: `3px solid ${s.severity === "high" ? "#ef4444" : "#f59e0b"}`,
                }}>
                  <div className="text-[10px] font-medium text-white">{s.item?.slice(0, 40)}</div>
                  <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.4)" }}>{s.issue?.slice(0, 80)}</div>
                  {s["24hr_violation"] && (
                    <div className="text-[8px] mt-1 px-1.5 py-0.5 rounded inline-block" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>24HR VIOLATION</div>
                  )}
                </div>
              ))}
              {shortages?.callouts?.foh_shortages?.map((c: any, i: number) => (
                <div key={`foh-${i}`} className="rounded p-2" style={{ background: "rgba(139,92,246,0.03)", border: "1px solid rgba(139,92,246,0.1)" }}>
                  <div className="text-[10px] font-medium text-white">FOH: {c.role} ({c.shortage} short)</div>
                  <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.4)" }}>{c.solution?.slice(0, 80)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chef Notes */}
        {firingData?.chef_notes?.length > 0 && (
          <div className="rounded-lg p-4" style={{ background: "rgba(34,197,94,0.02)", border: "1px solid rgba(34,197,94,0.08)" }}
            data-testid="chef-notes">
            <div className="text-[10px] uppercase tracking-widest mb-2" style={{ ...MONO, color: "rgba(34,197,94,0.5)" }}>
              Chef's Notes
            </div>
            {firingData.chef_notes.map((n: string, i: number) => (
              <div key={i} className="text-[10px] py-0.5 flex items-start gap-2" style={{ color: "rgba(226,232,240,0.6)" }}>
                <ChefHat className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "rgba(34,197,94,0.4)" }} />
                {n}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WarKPI({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3" style={{ color: color || "rgba(148,163,184,0.35)" }} />
        <span className="text-[8px] uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.35)" }}>{label}</span>
      </div>
      <div className="text-lg font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: color || "#e2e8f0" }}>{value}</div>
    </div>
  );
}
