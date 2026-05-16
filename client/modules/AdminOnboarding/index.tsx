import React, { useState, useEffect, useCallback } from "react";
import { Building2, Users, Settings, MapPin, ChevronRight, Plus, ToggleLeft, ToggleRight, Layers, X, Shield } from "lucide-react";
import PermissionsTab from "./PermissionsTab";

const BACKEND = window.location.origin;
async function fetchApi(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BACKEND}${path}`, { headers: { "Content-Type": "application/json", ...((opts.headers as Record<string, string>) || {}) }, ...opts });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.json();
}

const MODULE_LABELS: Record<string, string> = {
  culinary: "Culinary", pastry: "Pastry", mixology_sommelier: "Mixology & Sommelier",
  purchasing_receiving: "Purchasing & Receiving", echo_events: "EchoEvents",
  echo_aurum: "EchoAurum (Accounting)", echo_stratus: "EchoStratus",
  global_calendar: "Global Calendar", ai3_intelligence: "AI\u00B3 Intelligence",
  supplier_catalog: "Supplier Catalog", convention_management: "Conventions",
  energy_tracking: "Energy Tracking", plate_costing: "Plate Costing",
  labor_command: "Labor Command", safety_controls: "Safety Controls",
  forecast_hub: "ForecastHub", whiteboard: "Whiteboard", chef_net: "ChefNet",
};

interface Outlet { outlet_id: string; name: string; type: string; gl_code: string; location: string; capacity: number; manager: string; modules: string[]; connected_systems: string[]; active: boolean; }
interface AdminUser { user_id: string; name: string; email: string; role: string; department: string; outlet_ids: string[]; modules: string[]; is_admin: boolean; active: boolean; }
interface Property { property_id: string; name: string; code: string; address: string; outlet_ids: string[]; outlet_names?: string[]; outlet_count?: number; active: boolean; }
interface AdminSettings { setting_id: string; multi_property_enabled: boolean; default_property_id: string | null; }

type TabId = "properties" | "outlets" | "users" | "gl" | "permissions" | "settings";

export default function AdminOnboardingPanel() {
  const [tab, setTab] = useState<TabId>("outlets");
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [glCodes, setGlCodes] = useState<any[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [showCreateProp, setShowCreateProp] = useState(false);
  const [newProp, setNewProp] = useState({ name: "", code: "", address: "", outlet_ids: [] as string[] });

  const load = useCallback(() => {
    fetchApi("/api/admin/outlets").then(d => setOutlets(d.outlets || [])).catch(() => {});
    fetchApi("/api/admin/users").then(d => setUsers(d.users || [])).catch(() => {});
    fetchApi("/api/admin/gl-codes").then(d => setGlCodes(d.gl_codes || [])).catch(() => {});
    fetchApi("/api/admin/modules").then(d => setModules(d.modules || [])).catch(() => {});
    fetchApi("/api/admin/properties").then(d => setProperties(d.properties || [])).catch(() => {});
    fetchApi("/api/admin/settings").then(d => setSettings(d)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleUserModule = async (user: AdminUser, mod: string) => {
    const cur = user.modules || [];
    const newMods = cur.includes(mod) ? cur.filter(m => m !== mod) : [...cur, mod];
    await fetchApi(`/api/admin/users/${user.user_id}`, { method: "PUT", body: JSON.stringify({ modules: newMods }) });
    load();
  };

  const toggleUserActive = async (user: AdminUser) => {
    await fetchApi(`/api/admin/users/${user.user_id}`, { method: "PUT", body: JSON.stringify({ active: !user.active }) });
    load();
  };

  const toggleMultiProperty = async () => {
    const newVal = !settings?.multi_property_enabled;
    await fetchApi("/api/admin/settings", { method: "PUT", body: JSON.stringify({ multi_property_enabled: newVal }) });
    load();
  };

  const createProperty = async () => {
    if (!newProp.name) return;
    await fetchApi("/api/admin/properties", { method: "POST", body: JSON.stringify(newProp) });
    setNewProp({ name: "", code: "", address: "", outlet_ids: [] });
    setShowCreateProp(false);
    load();
  };

  const deleteProperty = async (id: string) => {
    await fetchApi(`/api/admin/properties/${id}`, { method: "DELETE" });
    load();
  };

  const toggleOutletInNewProp = (oid: string) => {
    setNewProp(p => ({
      ...p,
      outlet_ids: p.outlet_ids.includes(oid) ? p.outlet_ids.filter(o => o !== oid) : [...p.outlet_ids, oid],
    }));
  };

  const TABS: { id: TabId; label: string; icon: React.ElementType; count: number; badge?: string }[] = [
    { id: "outlets", label: "Outlets", icon: Building2, count: outlets.length },
    { id: "users", label: "Users", icon: Users, count: users.length },
    { id: "permissions", label: "Permissions", icon: Shield, count: 0 },
    { id: "gl", label: "GL Codes", icon: Layers, count: glCodes.length },
    { id: "properties", label: "Properties", icon: MapPin, count: properties.length, badge: settings?.multi_property_enabled ? "ON" : undefined },
    { id: "settings", label: "Settings", icon: Settings, count: 0 },
  ];

  return (
    <div data-testid="admin-onboarding-panel" className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0e17" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.15))", border: "1px solid rgba(245,158,11,0.25)" }}>
            <Settings className="w-[18px] h-[18px] text-amber-500" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white tracking-wide">Admin & Onboarding</div>
            <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">
              {settings?.multi_property_enabled ? "Multi-Property Mode" : "Single Property"} / {outlets.length} Outlets / {users.length} Users
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b px-5 overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {TABS.map(t => (
          <button key={t.id} data-testid={`admin-tab-${t.id}`} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-mono uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap"
            style={{ borderColor: tab === t.id ? "#3b82f6" : "transparent", color: tab === t.id ? "#93c5fd" : "#64748b" }}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.count > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>{t.count}</span>}
            {t.badge && <span className="text-[8px] px-1 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7" }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: "#2a3348 transparent" }}>

        {/* ═══ SETTINGS TAB ═══ */}
        {tab === "settings" && (
          <div className="space-y-4" data-testid="settings-tab">
            <div className="p-4 rounded-lg border" style={{ background: "#1a1f2e", borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Multi-Property Mode</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Enable to manage multiple resort properties, each grouping their own set of outlets.
                    Property picker appears in the sidebar for outlet-scoped navigation.
                  </div>
                </div>
                <button data-testid="toggle-multi-property" onClick={toggleMultiProperty}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono border transition-all"
                  style={{
                    background: settings?.multi_property_enabled ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.03)",
                    borderColor: settings?.multi_property_enabled ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)",
                    color: settings?.multi_property_enabled ? "#6ee7b7" : "#64748b",
                  }}>
                  {settings?.multi_property_enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  {settings?.multi_property_enabled ? "ENABLED" : "DISABLED"}
                </button>
              </div>
            </div>
            {settings?.multi_property_enabled && (
              <div className="p-4 rounded-lg border" style={{ background: "#131825", borderColor: "rgba(59,130,246,0.15)" }}>
                <div className="text-[10px] font-mono text-blue-400 mb-2">WHAT MULTI-PROPERTY UNLOCKS</div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-blue-400" /> Property picker in the sidebar scopes all data</li>
                  <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-blue-400" /> Each property groups its own outlets, staff, and GL codes</li>
                  <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-blue-400" /> Cross-property executive dashboard compares KPIs</li>
                  <li className="flex items-center gap-2"><ChevronRight className="w-3 h-3 text-blue-400" /> "All Properties" view for enterprise-wide reporting</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ═══ PROPERTIES TAB ═══ */}
        {tab === "properties" && (
          <div className="space-y-3" data-testid="properties-tab">
            {!settings?.multi_property_enabled && (
              <div className="p-4 rounded-lg border text-center" style={{ background: "#131825", borderColor: "rgba(245,158,11,0.2)" }}>
                <div className="text-xs text-amber-400 mb-1">Multi-Property mode is not enabled</div>
                <div className="text-[10px] text-slate-500 mb-3">Go to Settings tab to enable multi-property management</div>
                <button onClick={() => setTab("settings")} className="px-3 py-1.5 text-[10px] font-mono rounded border border-amber-500/30 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-colors">
                  Open Settings
                </button>
              </div>
            )}
            {settings?.multi_property_enabled && (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400">{properties.length} Properties &middot; {outlets.length} Total Outlets</div>
                  <button data-testid="create-property-btn" onClick={() => setShowCreateProp(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded border border-blue-500/30 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 transition-colors">
                    <Plus className="w-3 h-3" /> Add Property
                  </button>
                </div>

                {/* Create property form */}
                {showCreateProp && (
                  <div className="p-4 rounded-lg border space-y-3" style={{ background: "#131825", borderColor: "rgba(59,130,246,0.2)" }}>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-blue-300">New Property</div>
                      <button onClick={() => setShowCreateProp(false)}><X className="w-3.5 h-3.5 text-slate-500" /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input data-testid="prop-name-input" value={newProp.name} onChange={e => setNewProp(p => ({ ...p, name: e.target.value }))}
                        placeholder="Property Name" className="col-span-2 px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 focus:border-blue-500/50 outline-none" />
                      <input value={newProp.code} onChange={e => setNewProp(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                        placeholder="Code (3 char)" maxLength={5} className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 focus:border-blue-500/50 outline-none font-mono" />
                    </div>
                    <input value={newProp.address} onChange={e => setNewProp(p => ({ ...p, address: e.target.value }))}
                      placeholder="Address" className="w-full px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 focus:border-blue-500/50 outline-none" />
                    <div>
                      <div className="text-[9px] font-mono text-slate-500 mb-1.5 uppercase">Assign Outlets</div>
                      <div className="flex flex-wrap gap-1.5">
                        {outlets.map(o => {
                          const sel = newProp.outlet_ids.includes(o.outlet_id);
                          return (
                            <button key={o.outlet_id} onClick={() => toggleOutletInNewProp(o.outlet_id)}
                              className="px-2 py-0.5 rounded text-[9px] font-mono border transition-all"
                              style={{
                                background: sel ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.02)",
                                borderColor: sel ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.06)",
                                color: sel ? "#6ee7b7" : "#475569",
                              }}>
                              {o.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <button data-testid="save-property-btn" onClick={createProperty} disabled={!newProp.name}
                      className="px-4 py-1.5 rounded text-xs font-mono bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      Create Property
                    </button>
                  </div>
                )}

                {/* Property cards */}
                {properties.map((p, i) => (
                  <div key={p.property_id} data-testid={`property-card-${i}`} className="p-4 rounded-lg border transition-all hover:-translate-y-px" style={{ background: "#1a1f2e", borderColor: "rgba(255,255,255,0.05)" }}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: p.active ? "#10b981" : "#ef4444" }} />
                          <span className="text-sm font-semibold text-white">{p.name}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}>{p.code}</span>
                        </div>
                        {p.address && <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.address}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{p.outlet_count} outlets</span>
                        <button onClick={() => deleteProperty(p.property_id)} className="text-slate-600 hover:text-rose-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(p.outlet_names || []).map((name, j) => (
                        <span key={j} className="px-2 py-0.5 rounded text-[9px] font-mono" style={{ background: "rgba(16,185,129,0.1)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}>
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {properties.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-500">No properties created yet. Click "Add Property" to group your outlets.</div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ OUTLETS TAB ═══ */}
        {tab === "outlets" && outlets.map((o, i) => (
          <div key={o.outlet_id} data-testid={`outlet-card-${i}`} className="p-4 rounded-lg border transition-all hover:-translate-y-px" style={{ background: "#1a1f2e", borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: o.active ? "#10b981" : "#ef4444" }} />
                  <span className="text-sm font-semibold text-white">{o.name}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}>{o.outlet_type || o.type || "—"}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {/* iter265 fix: capacity is now an object {seats, turns_per_service, max_daily_covers}. */}
                  {o.location || "—"} &middot; Capacity:{" "}
                  {typeof o.capacity === "object" && o.capacity !== null
                    ? `${o.capacity.seats ?? 0} seats / ${o.capacity.max_daily_covers ?? 0} covers/day`
                    : (o.capacity ?? "—")}
                  {" "}&middot; Manager: {o.manager || "—"}
                </div>
              </div>
              <span className="text-xs font-mono text-amber-400">{o.gl_code}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(o.modules || []).map(m => (
                <span key={m} className="px-2 py-0.5 rounded text-[9px] font-mono" style={{ background: "rgba(16,185,129,0.1)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}>
                  {MODULE_LABELS[m] || m}
                </span>
              ))}
            </div>
            {(o.connected_systems || []).length > 0 && (
              <div className="flex gap-1.5">
                {(o.connected_systems || []).map(s => (
                  <span key={s} className="px-2 py-0.5 rounded text-[9px] font-mono" style={{ background: "rgba(168,85,247,0.1)", color: "#c4b5fd", border: "1px solid rgba(168,85,247,0.2)" }}>
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* ═══ USERS TAB ═══ */}
        {tab === "users" && users.map((u, i) => (
          <div key={u.user_id} data-testid={`user-card-${i}`} className="p-4 rounded-lg border transition-all" style={{ background: "#1a1f2e", borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white" style={{ background: u.is_admin ? "linear-gradient(135deg, #f59e0b, #ef4444)" : "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>
                  {u.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">{u.name}</span>
                    {u.is_admin && <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>ADMIN</span>}
                  </div>
                  <div className="text-[10px] text-slate-500">{u.email} &middot; {u.role} &middot; {u.department}</div>
                </div>
              </div>
              <button onClick={() => toggleUserActive(u)} className="px-2 py-1 rounded text-[9px] font-mono border transition-all"
                style={{ background: u.active ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", borderColor: u.active ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)", color: u.active ? "#10b981" : "#ef4444" }}>
                {u.active ? "ACTIVE" : "DISABLED"}
              </button>
            </div>
            <div className="text-[9px] font-mono text-slate-600 mb-1.5">MODULE ACCESS</div>
            <div className="flex flex-wrap gap-1.5">
              {(modules || []).map(m => {
                const has = (u.modules || []).includes(m);
                return (
                  <button key={m} onClick={() => toggleUserModule(u, m)} data-testid={`user-${i}-mod-${m}`}
                    className="px-2 py-0.5 rounded text-[9px] font-mono border transition-all cursor-pointer"
                    style={{ background: has ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.02)", borderColor: has ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)", color: has ? "#6ee7b7" : "#475569" }}>
                    {MODULE_LABELS[m] || m}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* ═══ PERMISSIONS TAB ═══ */}
        {tab === "permissions" && <PermissionsTab />}

        {/* ═══ GL CODES TAB ═══ */}
        {tab === "gl" && (
          <div className="space-y-1">
            <div className="grid grid-cols-[100px_1fr_1fr_100px] gap-2 px-3 py-1.5 text-[9px] font-mono text-slate-600 uppercase tracking-wider">
              <span>GL Code</span><span>Description</span><span>Outlet</span><span>Type</span>
            </div>
            {glCodes.map((gl, i) => {
              const outlet = outlets.find(o => o.outlet_id === gl.outlet_id);
              return (
                <div key={gl.id} data-testid={`gl-row-${i}`} className="grid grid-cols-[100px_1fr_1fr_100px] gap-2 px-3 py-2.5 rounded-md border" style={{ background: "#1a1f2e", borderColor: "rgba(255,255,255,0.03)" }}>
                  <span className="text-xs font-mono text-amber-400 font-semibold">{gl.gl_code}</span>
                  <span className="text-xs text-white">{gl.description}</span>
                  <span className="text-xs text-slate-400">{outlet?.name || gl.outlet_id}</span>
                  <span className="text-[10px] font-mono" style={{ color: gl.account_type === "revenue" ? "#10b981" : "#f59e0b" }}>{gl.account_type}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
