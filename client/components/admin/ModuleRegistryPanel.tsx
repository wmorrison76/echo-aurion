/**
 * Module Registry Panel
 *
 * PURPOSE:
 *   - Central admin view of all LUCCCA modules (MaestroBQT, Global Calendar, EchoAurum, etc.)
 *   - Enable/disable modules globally
 *   - Edit basic module metadata (name, category, route, icon)
 *   - See which roles have access (summary)
 *
 * INTEGRATION:
 *   - Rendered as a tab in EcosystemControlPanel
 *   - Syncs with panel registry and sidebar permissions
 *
 * DEPENDENCIES:
 *   - useAccessStore from EcosystemControlPanel
 */

import React, { useMemo, useState } from "react";
import { useAccessStore } from "./EcosystemControlPanel";
import { Edit2, CheckCircle } from "lucide-react";

interface ModuleDef {
  key: string;
  name: string;
  category: string;
  route: string;
  icon: string;
  enabledByDefault?: boolean;
}

export default function ModuleRegistryPanel() {
  const modules = useAccessStore((s) => s.modules as ModuleDef[]);
  const roles = useAccessStore((s) => s.roles);
  const permissions = useAccessStore((s) => s.permissions);
  const setModules = useAccessStore((s: any) => s.setModules || (() => {}));
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const sortedModules = useMemo(
    () =>
      [...modules].sort(
        (a, b) =>
          a.category.localeCompare(b.category) ||
          a.name.localeCompare(b.name)
      ),
    [modules]
  );

  const handleToggleEnabled = (modKey: string) => {
    const next = modules.map((m) =>
      m.key === modKey
        ? {
            ...m,
            enabledByDefault: !m.enabledByDefault,
          }
        : m
    );
    setModules(next);
  };

  const handleUpdateModule = (modKey: string, patch: Partial<ModuleDef>) => {
    const next = modules.map((m) =>
      m.key === modKey ? { ...m, ...patch } : m
    );
    setModules(next);
  };

  const getRoleSummary = (modKey: string): string => {
    const roleIdsWithAccess = permissions
      .filter((p: any) => p.moduleKey === modKey && p.canView)
      .map((p: any) => p.roleId);

    const names = roles
      .filter((r: any) => roleIdsWithAccess.includes(r.id))
      .map((r: any) => r.name);

    if (names.length === 0) return "No roles";

    if (names.length <= 3) return names.join(", ");

    return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Module Registry</h2>
        <p className="text-sm text-slate-600 mt-2">
          View and manage all LUCCCA modules. Toggle whether a module is
          globally enabled, and adjust how it appears in the system.
        </p>
      </div>

      {/* Module Grid */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
        {/* Header Row */}
        <div className="grid grid-cols-[2fr,1.2fr,1.5fr,0.8fr,0.8fr] gap-4 px-4 py-3 text-xs font-semibold bg-slate-50 border-b border-slate-200">
          <div>Module</div>
          <div>Category</div>
          <div>Route</div>
          <div className="text-center">Enabled</div>
          <div className="text-center">Roles</div>
        </div>

        {/* Module Rows */}
        <div className="divide-y divide-slate-100">
          {sortedModules.map((mod) => {
            const isEditing = editingKey === mod.key;
            return (
              <div
                key={mod.key}
                className="grid grid-cols-[2fr,1.2fr,1.5fr,0.8fr,0.8fr] gap-4 px-4 py-3 text-sm hover:bg-slate-50/50 transition-colors"
              >
                {/* Module Name & Key */}
                <div className="flex flex-col gap-1">
                  {isEditing ? (
                    <input
                      className="px-3 py-1 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={mod.name}
                      onChange={(e) =>
                        handleUpdateModule(mod.key, { name: e.target.value })
                      }
                    />
                  ) : (
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600">
                        {mod.icon?.slice(0, 1) || "M"}
                      </span>
                      {mod.name}
                    </div>
                  )}
                  <code className="text-xs text-slate-500">
                    key: <span className="font-mono">{mod.key}</span>
                  </code>
                </div>

                {/* Category */}
                <div>
                  {isEditing ? (
                    <input
                      className="w-full px-3 py-1 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={mod.category}
                      onChange={(e) =>
                        handleUpdateModule(mod.key, {
                          category: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {mod.category || "Uncategorized"}
                    </span>
                  )}
                </div>

                {/* Route */}
                <div>
                  {isEditing ? (
                    <input
                      className="w-full px-3 py-1 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                      value={mod.route}
                      onChange={(e) =>
                        handleUpdateModule(mod.key, { route: e.target.value })
                      }
                    />
                  ) : (
                    <code className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded font-mono">
                      {mod.route}
                    </code>
                  )}
                </div>

                {/* Enabled Toggle */}
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => handleToggleEnabled(mod.key)}
                    className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      mod.enabledByDefault
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                        : "bg-slate-100 text-slate-600 border border-slate-300"
                    }`}
                  >
                    {mod.enabledByDefault ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        On
                      </>
                    ) : (
                      "Off"
                    )}
                  </button>
                </div>

                {/* Roles & Edit */}
                <div className="flex flex-col items-center justify-center gap-2">
                  <span className="text-xs text-slate-600">
                    {getRoleSummary(mod.key)}
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    onClick={() =>
                      setEditingKey(isEditing ? null : mod.key)
                    }
                  >
                    <Edit2 className="w-3 h-3" />
                    {isEditing ? "Done" : "Edit"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 space-y-2">
        <p className="font-semibold">ℹ️ Module Registry & Panel Sync</p>
        <p className="text-xs">
          This registry is the single source of truth for modules. When new modules are
          added to the system, please ensure they are registered in{" "}
          <code className="bg-white px-1 rounded">PANEL_REGISTRY</code> and
          mirrored here in{" "}
          <code className="bg-white px-1 rounded">useAccessStore.modules</code> so
          permissions, sidebar visibility, and access control remain consistent.
        </p>
        <p className="text-xs font-medium">
          💡 Enabled modules appear in the sidebar for authorized roles. Disabling a
          module hides it from all users but does not delete its data.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-600 font-medium">Total Modules</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{modules.length}</p>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-600 font-medium">Enabled</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {modules.filter((m) => m.enabledByDefault).length}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-600 font-medium">Disabled</p>
          <p className="text-2xl font-bold text-slate-600 mt-1">
            {modules.filter((m) => !m.enabledByDefault).length}
          </p>
        </div>
      </div>
    </div>
  );
}
