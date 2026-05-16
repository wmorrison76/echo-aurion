/**
 * Role Builder & Permission Editor
 *
 * PURPOSE:
 *   - Allow EC/Admin to create new roles dynamically
 *   - Assign role properties (name, level, departments, outlets)
 *   - Auto-generate default module permissions
 *   - Seamlessly integrate with the existing Ecosystem Control Panel
 *
 * INTEGRATION:
 *   - Rendered as a tab in EcosystemControlPanel
 *   - New roles automatically appear in the "Roles & Permissions" tab
 *   - Auto-generates permissions for all modules
 */

import React, { useState } from "react";
import { useAccessStore, Role, ModulePermission } from "./EcosystemControlPanel";
import { Plus, X } from "lucide-react";
import {
  createCustomRole,
  levelToTier,
  deptLabelToKey,
  roleNameToSlug,
} from "@/lib/admin-api";

interface RoleFormData {
  name: string;
  level: number;
  outlets: string[];
  departments: string[];
  defaultCanView: boolean;
  defaultCanUse: boolean;
  defaultCanConfigure: boolean;
}

const OUTLETS = [
  "Aviva",
  "Pool Grill",
  "Steakhouse",
  "Seafood Bar",
  "Nightclub",
  "Patisserie",
  "Banquet Kitchen",
  "Employee Cafe",
];

const DEPARTMENTS = [
  "Culinary",
  "Pastry",
  "Banquets",
  "Engineering",
  "Finance",
  "Events",
  "FOH",
];

export default function RoleBuilderPanel() {
  const roles = useAccessStore((s) => s.roles);
  const modules = useAccessStore((s) => s.modules);
  const permissions = useAccessStore((s) => s.permissions);
  const setSelectedRoleId = useAccessStore((s) => s.setSelectedRoleId);

  const [formData, setFormData] = useState<RoleFormData>({
    name: "",
    level: 1,
    outlets: [],
    departments: [],
    defaultCanView: true,
    defaultCanUse: false,
    defaultCanConfigure: false,
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleInputChange = (field: keyof RoleFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleOutlet = (outlet: string) => {
    setFormData((prev) => ({
      ...prev,
      outlets: prev.outlets.includes(outlet)
        ? prev.outlets.filter((o) => o !== outlet)
        : [...prev.outlets, outlet],
    }));
  };

  const toggleDepartment = (dept: string) => {
    setFormData((prev) => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter((d) => d !== dept)
        : [...prev.departments, dept],
    }));
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    setSaveError(null);
    setSaving(true);

    // D11c · Persist via the backend so the role survives reload AND
    // is honored by the access matrix on the next sign-in. The Zustand
    // store update below is kept as optimistic UI (admin sees the row
    // immediately even on slow connections); on backend failure we
    // surface the error but DO NOT roll back the local row, so the
    // admin doesn't lose their work — they can retry / fix and save.
    const slug = roleNameToSlug(formData.name);
    const tier = levelToTier(formData.level);
    const deptKeys = formData.departments.map(deptLabelToKey);
    try {
      await createCustomRole({
        role: slug,
        label: formData.name,
        tier,
        depts: deptKeys,
        extras: [],
        landing_panel: "chronos",
        description: `Created via Role Builder (level ${formData.level}, ` +
                     `${formData.outlets.length} outlets)`,
      });
    } catch (err) {
      // Surface the error and bail out before mutating the local store
      // — a 409 (duplicate) or 400 (bad dept) means the local row would
      // be lying to the admin about what's persisted.
      setSaveError(err instanceof Error ? err.message : String(err));
      setSaving(false);
      return;
    }

    // Backend persisted — now update the local Zustand store to mirror.
    const newRole: Role = {
      id: formData.name
        .toUpperCase()
        .replace(/\s+/g, "_")
        .replace(/[^A-Z0-9_]/g, ""),
      name: formData.name,
      level: formData.level,
    };
    const state = useAccessStore.getState();
    const updatedRoles = [...state.roles, newRole];
    const newPerms: ModulePermission[] = [];
    for (const mod of modules) {
      newPerms.push({
        roleId: newRole.id,
        moduleKey: mod.key,
        canView: formData.defaultCanView,
        canUse: formData.defaultCanUse,
        canConfigure: newRole.level >= 4 && formData.defaultCanConfigure,
        hideInSidebar: !formData.defaultCanView,
      });
    }
    useAccessStore.setState({
      roles: updatedRoles,
      permissions: [...state.permissions, ...newPerms],
    });
    setSelectedRoleId(newRole.id);

    setFormData({
      name: "",
      level: 1,
      outlets: [],
      departments: [],
      defaultCanView: true,
      defaultCanUse: false,
      defaultCanConfigure: false,
    });
    setShowSuccess(true);
    setSaving(false);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const isValid = formData.name.trim().length > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Create New Role</h2>
        <p className="text-sm text-slate-600 mt-1">
          Define a new role with access permissions that will automatically be
          applied to all modules.
        </p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 border border-green-200">
          <div className="w-2 h-2 bg-green-600 rounded-full" />
          <p className="text-sm font-medium text-green-900">
            Role saved to the server and added to Roles & Permissions.
          </p>
        </div>
      )}

      {/* Error Message (D11c — backend rejected the save) */}
      {saveError && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-rose-50 border border-rose-200">
          <div className="w-2 h-2 bg-rose-600 rounded-full mt-2" />
          <div className="text-sm text-rose-900">
            <p className="font-medium">Couldn't save the role.</p>
            <p className="mt-1 font-mono text-xs">{saveError}</p>
          </div>
        </div>
      )}

      {/* Form Container */}
      <div className="max-w-2xl space-y-6">
        {/* Role Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Role Name *
          </label>
          <input
            type="text"
            placeholder="e.g., Chef Tournant, Beverage Director, Sous Chef"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-600 mt-1">
            Used to identify the role. Spaces and special characters will be
            converted to underscores in the system ID.
          </p>
        </div>

        {/* Role Level */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Role Level *
          </label>
          <select
            value={formData.level}
            onChange={(e) => handleInputChange("level", Number(e.target.value))}
            className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={0}>Level 0 - Entry (No configure rights)</option>
            <option value={1}>Level 1 - Staff (No configure rights)</option>
            <option value={2}>Level 2 - Lead (No configure rights)</option>
            <option value={3}>Level 3 - Supervisor (No configure rights)</option>
            <option value={4}>Level 4 - Director (Auto configure rights)</option>
            <option value={5}>Level 5 - Executive (Auto configure rights)</option>
          </select>
          <p className="text-xs text-slate-600 mt-1">
            Roles at Level 4+ automatically get configuration rights for modules.
          </p>
        </div>

        {/* Outlets */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-3">
            Outlets (Multi-select)
          </label>
          <div className="flex flex-wrap gap-2">
            {OUTLETS.map((outlet) => (
              <button
                key={outlet}
                onClick={() => toggleOutlet(outlet)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.outlets.includes(outlet)
                    ? "bg-blue-600 text-white border border-blue-600"
                    : "bg-white text-slate-900 border border-slate-300 hover:border-slate-400"
                }`}
              >
                {formData.outlets.includes(outlet) && (
                  <span className="mr-1">✓</span>
                )}
                {outlet}
              </button>
            ))}
          </div>
        </div>

        {/* Departments */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-3">
            Departments (Multi-select)
          </label>
          <div className="flex flex-wrap gap-2">
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept}
                onClick={() => toggleDepartment(dept)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.departments.includes(dept)
                    ? "bg-blue-600 text-white border border-blue-600"
                    : "bg-white text-slate-900 border border-slate-300 hover:border-slate-400"
                }`}
              >
                {formData.departments.includes(dept) && (
                  <span className="mr-1">✓</span>
                )}
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Default Permissions */}
        <div className="border-t border-slate-200 pt-6">
          <label className="block text-sm font-semibold text-slate-900 mb-4">
            Default Module Permissions
          </label>
          <p className="text-xs text-slate-600 mb-4">
            These permissions will be applied to all modules for this role.
          </p>

          <div className="space-y-3">
            <PermissionToggle
              label="Can View Modules"
              description="Users can see modules in their sidebar"
              checked={formData.defaultCanView}
              onChange={(v) => handleInputChange("defaultCanView", v)}
            />
            <PermissionToggle
              label="Can Use Modules"
              description="Users can open and interact with modules"
              checked={formData.defaultCanUse}
              onChange={(v) => handleInputChange("defaultCanUse", v)}
            />
            <PermissionToggle
              label="Can Configure Modules"
              description="Users can modify module settings (auto-enabled for Level 4+)"
              checked={formData.defaultCanConfigure}
              disabled={formData.level >= 4}
              onChange={(v) => handleInputChange("defaultCanConfigure", v)}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-6 border-t border-slate-200">
        <button
          onClick={handleCreate}
          disabled={!isValid || saving}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
            isValid && !saving
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-slate-200 text-slate-500 cursor-not-allowed"
          }`}
        >
          <Plus className="w-4 h-4" />
          {saving ? "Saving…" : "Create Role"}
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-900">What happens next:</p>
        <ul className="text-xs text-slate-700 space-y-1">
          <li>✓ Role is added to the system with ID: <code className="bg-white px-1 rounded">{formData.name.toUpperCase().replace(/\s+/g, "_")}</code></li>
          <li>✓ Permissions are auto-generated for {modules.length} modules</li>
          <li>✓ Role appears immediately in "Roles & Permissions" tab</li>
          <li>✓ Can be assigned to users in the user management system</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Permission Toggle Component
 */
interface PermissionToggleProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

function PermissionToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: PermissionToggleProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg border transition-colors ${
        disabled
          ? "bg-slate-50 border-slate-200 cursor-not-allowed"
          : checked
          ? "bg-blue-50 border-blue-300"
          : "bg-white border-slate-300 hover:border-slate-400"
      }`}
    >
      <div
        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
          checked
            ? "bg-blue-600 border-blue-600 text-white"
            : "bg-white border-slate-300"
        }`}
      >
        {checked && "✓"}
      </div>
      <div className="text-left">
        <p className={`text-sm font-medium ${disabled ? "text-slate-500" : "text-slate-900"}`}>
          {label}
        </p>
        <p className="text-xs text-slate-600">{description}</p>
      </div>
    </button>
  );
}
