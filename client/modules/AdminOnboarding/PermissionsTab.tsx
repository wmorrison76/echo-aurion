/**
 * Echo AURION · Onboarding Permissions Tab (iter264.1)
 * Role × Permission matrix. Admin can toggle any cell; "No Access"
 * (all OFF for IRD/Spa group) auto-hides the panel for that role.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Shield, RefreshCw } from "lucide-react";

const API = window.location.origin;

interface Perm { key: string; label: string; group: string; }
interface RoleRow { role: string; perms: Record<string, boolean>; }
interface MatrixResp { permissions: Perm[]; roles: RoleRow[]; }

export default function PermissionsTab() {
  const [data, setData] = useState<MatrixResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`${API}/api/permissions/matrix`);
    setData(await r.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (role: string, key: string, current: boolean) => {
    if (!data) return;
    setBusy(true);
    try {
      const row = data.roles.find(r => r.role === role);
      const newPerms = { ...(row?.perms || {}), [key]: !current };
      await fetch(`${API}/api/permissions/role/${role}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, perms: newPerms }),
      });
      await load();
    } finally { setBusy(false); }
  };

  if (!data) return <div className="p-8 text-center text-xs text-slate-500">Loading permissions matrix…</div>;

  const groups = Array.from(new Set(data.permissions.map(p => p.group)));
  const visibleRoles = data.roles.filter(r => !filter || r.role.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div data-testid="permissions-tab" className="space-y-3">
      <div className="p-4 rounded-lg border" style={{ background: "#131825", borderColor: "rgba(245,158,11,0.18)" }}>
        <div className="flex items-center gap-2 text-amber-300 mb-1">
          <Shield className="w-4 h-4" /> <span className="text-sm font-semibold">Role Permissions Matrix</span>
        </div>
        <div className="text-[11px] text-slate-400 leading-relaxed">
          Toggle any cell to override the default for a role.&nbsp;
          <span className="text-amber-300">CDC = Chef de Cuisine</span> can <strong>view + edit</strong> the IRD menu but cannot <strong>publish live</strong> — they must Submit-for-Approval.
          A role with all IRD permissions OFF will not see the IRD panel in the sidebar at all (No Access).
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          data-testid="perm-role-filter"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter roles…"
          className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 outline-none focus:border-amber-500/50"
          style={{ minWidth: 220 }}
        />
        <button onClick={load} disabled={busy} className="p-1.5 rounded border border-slate-600/30 text-slate-400 hover:text-amber-300">
          <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} />
        </button>
        <span className="text-[10px] text-slate-500 font-mono">{visibleRoles.length} roles · {data.permissions.length} permissions</span>
      </div>

      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <table className="w-full text-[11px]" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: "#0f1422" }}>
              <th className="text-left px-3 py-2 sticky left-0 z-10 font-mono uppercase text-[10px] text-slate-400" style={{ background: "#0f1422", minWidth: 200 }}>Role</th>
              {groups.map(g => (
                <th key={g} colSpan={data.permissions.filter(p => p.group === g).length}
                    className="px-2 py-2 font-mono uppercase text-[10px]" style={{ color: g === "IRD" ? "#fbbf24" : g === "Spa" ? "#a78bfa" : g === "Inventory" ? "#34d399" : "#60a5fa" }}>
                  {g}
                </th>
              ))}
            </tr>
            <tr style={{ background: "#0a0e17" }}>
              <th className="sticky left-0 z-10" style={{ background: "#0a0e17" }}></th>
              {data.permissions.map(p => (
                <th key={p.key} className="px-1.5 py-1 font-normal text-[9px] text-slate-500 whitespace-nowrap" title={p.key}>
                  {p.label.split("·")[1]?.trim() || p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRoles.map(r => (
              <tr key={r.role} data-testid={`perm-row-${r.role}`} className="border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <td className="px-3 py-1.5 sticky left-0 z-10 font-mono text-[10px] text-slate-300" style={{ background: "#141825" }}>
                  {r.role}
                </td>
                {data.permissions.map(p => {
                  const v = !!r.perms[p.key];
                  return (
                    <td key={p.key} className="text-center px-1 py-1">
                      <button
                        data-testid={`perm-cell-${r.role}-${p.key}`}
                        disabled={busy}
                        onClick={() => toggle(r.role, p.key, v)}
                        className="w-5 h-5 rounded transition-all"
                        title={`${r.role} · ${p.label}`}
                        style={{
                          background: v ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${v ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.08)"}`,
                          color: v ? "#10b981" : "#475569",
                          fontSize: 11, lineHeight: 1, fontWeight: 700,
                        }}>
                        {v ? "✓" : ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
