/**
 * LUCCCA Ecosystem Control Panel (Build 0 / Unifier)
 *
 * PURPOSE:
 *   - Tie all builds together under one access + module governance layer
 *   - Define roles, modules, and per-role module permissions
 *   - Control which modules appear in the sidebar per role
 *   - Control who can view/use/configure each module
 *   - Provide a pattern (registerModule) so any new module
 *     automatically appears in this control panel
 *
 * INTENDED USERS:
 *   - EC (Executive Committee)
 *   - Director-level
 *   - System Admin
 */

import React, { useMemo, useState, useEffect } from "react";
import { create } from "zustand";
import { Users, Package, Settings, Lock, Eye, Toggle2, Zap, AlertCircle, FileText } from "lucide-react";
import { cn } from "@/lib/glass";
import RoleBuilderPanel from "./RoleBuilderPanel";
import UserManagementPanel from "./UserManagementPanel";
import ModuleRegistryPanel from "./ModuleRegistryPanel";
import AuditMatrixPanel from "./AuditMatrixPanel";
import { SIPanel } from "./SIPanel";
import { TelemetryPanel } from "./TelemetryPanel";
import ExcelTemplatesPanel from "./ExcelTemplatesPanel";
import {
  initializeDefaultCapabilities,
  getAllModuleCapabilities,
  getAllModuleActions,
} from "@/lib/module-capabilities";

// ============================================================================
// TYPES
// ============================================================================

export interface Role {
  id: string;
  name: string;
  level: number; // higher = more power
}

export interface ModuleDef {
  key: string;
  name: string;
  category: string; // "Events", "Culinary", "Finance", "System"
  route: string;
  icon: string;
  enabledByDefault: boolean;
  defaultRoles: string[];
}

export interface ModulePermission {
  roleId: string;
  moduleKey: string;
  canView: boolean;
  canUse: boolean;
  canConfigure: boolean;
  hideInSidebar: boolean;
}

export interface ActionPermission {
  id: string;
  moduleKey: string;
  action: string; // e.g., "recipes:view", "recipes:edit", "recipes:create"
  description: string;
  rolePermissions: Record<string, boolean>; // roleId -> allowed
}

export interface Outlet {
  id: string;
  name: string;
  department: string; // Reference to department
  location?: string;
  manager?: string;
  createdAt: string;
}

export interface UserAccess {
  userId: string;
  email: string;
  name: string;
  roleId: string;
  outletId: string;
  permissions: Record<string, boolean>; // action -> allowed
  lastLogin?: string;
  credentialsSent: boolean;
}

// ============================================================================
// INITIAL DATA
// ============================================================================

const INITIAL_OUTLETS = [
  "Aviva",
  "Pool Grill",
  "Steakhouse",
  "Seafood Bar",
  "Nightclub",
  "Patisserie",
  "Banquet Kitchen",
  "Employee Cafe",
];

const INITIAL_DEPARTMENTS = [
  "Culinary",
  "Pastry",
  "Banquets",
  "Engineering",
  "Finance",
  "Events",
  "FOH",
];

const INITIAL_ROLES: Role[] = [
  { id: "EC", name: "Executive Committee", level: 5 },
  { id: "DIRECTOR_FB", name: "Director of F&B", level: 4 },
  { id: "BANQUET_MANAGER", name: "Banquet Manager", level: 3 },
  { id: "EXEC_CHEF", name: "Executive Chef", level: 3 },
  { id: "SOUS_CHEF", name: "Sous Chef", level: 2 },
  { id: "LINE_COOK", name: "Line Cook", level: 1 },
  { id: "ENGINEERING_MANAGER", name: "Engineering Manager", level: 3 },
  { id: "FINANCE_DIRECTOR", name: "Finance Director", level: 4 },
];

const INITIAL_MODULES: ModuleDef[] = [
  // Top-level navigation (sidebar panelIds)
  { key: "dashboard", name: "Dashboard", category: "System", route: "/dashboard", icon: "layout-dashboard", enabledByDefault: true, defaultRoles: ["EC", "DIRECTOR_FB", "BANQUET_MANAGER", "EXEC_CHEF"] },
  { key: "ekg", name: "EKG Monitor", category: "System", route: "/ekg", icon: "activity", enabledByDefault: true, defaultRoles: ["EC", "ENGINEERING_MANAGER"] },
  {
    key: "maestro_bqt",
    name: "Maestro BQT",
    category: "Events",
    route: "/maestro-bqt",
    icon: "banquet",
    enabledByDefault: true,
    defaultRoles: ["EC", "DIRECTOR_FB", "BANQUET_MANAGER", "EXEC_CHEF"],
  },
  {
    key: "culinary",
    name: "Culinary",
    category: "Culinary",
    route: "/culinary",
    icon: "chef-hat",
    enabledByDefault: true,
    defaultRoles: ["EC", "DIRECTOR_FB", "EXEC_CHEF", "SOUS_CHEF"],
  },
  {
    key: "pastry",
    name: "Pastry",
    category: "Culinary",
    route: "/pastry",
    icon: "cake",
    enabledByDefault: true,
    defaultRoles: ["EC", "DIRECTOR_FB", "EXEC_CHEF", "SOUS_CHEF"],
  },
  {
    key: "schedule",
    name: "Schedule",
    category: "Labor",
    route: "/schedule",
    icon: "calendar",
    enabledByDefault: true,
    defaultRoles: ["EC", "DIRECTOR_FB", "BANQUET_MANAGER", "EXEC_CHEF"],
  },
  {
    key: "inventory",
    name: "Ordering & Inventory",
    category: "Supply",
    route: "/inventory",
    icon: "boxes",
    enabledByDefault: true,
    defaultRoles: ["EC", "DIRECTOR_FB", "EXEC_CHEF"],
  },
  {
    key: "mixology_sommelier",
    name: "Mixology & Sommelier",
    category: "Culinary",
    route: "/mixology-sommelier",
    icon: "wine",
    enabledByDefault: true,
    defaultRoles: ["EC", "DIRECTOR_FB", "EXEC_CHEF"],
  },
  {
    key: "purchasing-receiving",
    name: "Purchasing & Receiving",
    category: "Supply",
    route: "/purchasing-receiving",
    icon: "shopping-cart",
    enabledByDefault: true,
    defaultRoles: ["EC", "DIRECTOR_FB", "EXEC_CHEF"],
  },
  {
    key: "aurum",
    name: "EchoAurum",
    category: "Finance",
    route: "/aurum",
    icon: "coin",
    enabledByDefault: false,
    defaultRoles: ["EC", "FINANCE_DIRECTOR"],
  },
  {
    key: "stratus",
    name: "Echo Stratus",
    category: "Finance",
    route: "/stratus",
    icon: "cloud",
    enabledByDefault: false,
    defaultRoles: ["EC", "FINANCE_DIRECTOR"],
  },
  {
    key: "forecast-hub",
    name: "Forecast Hub",
    category: "Operations",
    route: "/forecast-hub",
    icon: "trending-up",
    enabledByDefault: true,
    defaultRoles: ["EC", "DIRECTOR_FB", "BANQUET_MANAGER", "EXEC_CHEF"],
  },
  {
    key: "echo-events",
    name: "Echo Events",
    category: "Events",
    route: "/echo-events",
    icon: "calendar",
    enabledByDefault: true,
    defaultRoles: ["EC", "DIRECTOR_FB", "BANQUET_MANAGER", "EXEC_CHEF"],
  },
  {
    key: "layout",
    name: "Echo Layout",
    category: "Design",
    route: "/layout",
    icon: "layout",
    enabledByDefault: true,
    defaultRoles: ["EC", "DIRECTOR_FB", "BANQUET_MANAGER"],
  },
  {
    key: "trace-viewer",
    name: "Trace Viewer",
    category: "System",
    route: "/trace-viewer",
    icon: "link",
    enabledByDefault: false,
    defaultRoles: ["EC", "ENGINEERING_MANAGER"],
  },
  {
    key: "chefnet",
    name: "ChefNet",
    category: "Community",
    route: "/chefnet",
    icon: "message-square",
    enabledByDefault: true,
    defaultRoles: ["EC", "DIRECTOR_FB", "EXEC_CHEF", "SOUS_CHEF"],
  },
  {
    key: "support",
    name: "Support",
    category: "Community",
    route: "/support",
    icon: "life-buoy",
    enabledByDefault: true,
    defaultRoles: ["EC", "DIRECTOR_FB", "BANQUET_MANAGER", "EXEC_CHEF"],
  },
  {
    key: "module-status",
    name: "Module Status",
    category: "System",
    route: "/module-status",
    icon: "activity",
    enabledByDefault: false,
    defaultRoles: ["EC", "ENGINEERING_MANAGER"],
  },
  // Legacy/alias entries for backward compatibility
  { key: "culinary_engine", name: "Culinary Engine", category: "Culinary", route: "/maestro-bqt?tab=culinary", icon: "chef-hat", enabledByDefault: true, defaultRoles: ["EC", "DIRECTOR_FB", "EXEC_CHEF", "SOUS_CHEF"] },
  { key: "inventory_engine", name: "Inventory Engine", category: "Supply", route: "/maestro-bqt?tab=inventory", icon: "boxes", enabledByDefault: true, defaultRoles: ["EC", "DIRECTOR_FB", "EXEC_CHEF"] },
  { key: "labor_engine", name: "Labor Engine", category: "Labor", route: "/maestro-bqt?tab=labor", icon: "users", enabledByDefault: true, defaultRoles: ["EC", "DIRECTOR_FB"] },
  { key: "echo_aurum", name: "EchoAurum (Financials)", category: "Finance", route: "/echo-aurum", icon: "coin", enabledByDefault: false, defaultRoles: ["EC", "FINANCE_DIRECTOR"] },
  { key: "resort_forecast", name: "21-Day Resort Forecast", category: "Operations", route: "/resort-forecast", icon: "calendar", enabledByDefault: true, defaultRoles: ["EC", "DIRECTOR_FB", "BANQUET_MANAGER", "EXEC_CHEF"] },
];

// ============================================================================
// ZUSTAND STORE
// ============================================================================

export const useAccessStore = create((set, get) => {
  const initialRoles = INITIAL_ROLES;
  const initialModules = INITIAL_MODULES;

  const defaultPerms: ModulePermission[] = [];
  for (const role of initialRoles) {
    for (const mod of initialModules) {
      const defaultHas = mod.defaultRoles.includes(role.id);
      defaultPerms.push({
        roleId: role.id,
        moduleKey: mod.key,
        canView: defaultHas,
        canUse: defaultHas,
        canConfigure: role.level >= 4 && defaultHas,
        hideInSidebar: !defaultHas,
      });
    }
  }

  return {
    roles: initialRoles,
    modules: initialModules,
    permissions: defaultPerms,
    outlets: INITIAL_OUTLETS.map((name, idx) => ({
      id: `outlet-${idx}`,
      name,
      department: INITIAL_DEPARTMENTS[idx % INITIAL_DEPARTMENTS.length],
    })),
    departments: INITIAL_DEPARTMENTS,
    actionPermissions: [] as ActionPermission[],
    userAccess: [] as UserAccess[],
    selectedRoleId: initialRoles[0]?.id || null,

    setSelectedRoleId: (id: string) => set({ selectedRoleId: id }),

    setModules: (modules: ModuleDef[]) => set({ modules }),

    // Outlets management
    addOutlet: (name: string, department: string, location?: string, manager?: string) =>
      set((state) => ({
        outlets: [
          ...state.outlets,
          {
            id: `outlet-${Date.now()}`,
            name,
            department,
            location,
            manager,
            createdAt: new Date().toISOString(),
          } as Outlet,
        ],
      })),

    updateOutlet: (id: string, updates: Partial<Outlet>) =>
      set((state) => ({
        outlets: state.outlets.map((o) => (o.id === id ? { ...o, ...updates } : o)),
      })),

    deleteOutlet: (id: string) =>
      set((state) => ({
        outlets: state.outlets.filter((o) => o.id !== id),
      })),

    // Action permissions
    registerActionPermission: (moduleKey: string, action: string, description: string) =>
      set((state) => {
        const id = `${moduleKey}:${action}`;
        if (state.actionPermissions.find((p) => p.id === id)) return state;

        const rolePermissions: Record<string, boolean> = {};
        state.roles.forEach((r) => {
          rolePermissions[r.id] = false;
        });

        return {
          actionPermissions: [
            ...state.actionPermissions,
            { id, moduleKey, action, description, rolePermissions },
          ],
        };
      }),

    toggleActionPermission: (actionId: string, roleId: string) =>
      set((state) => ({
        actionPermissions: state.actionPermissions.map((p) =>
          p.id === actionId
            ? {
                ...p,
                rolePermissions: {
                  ...p.rolePermissions,
                  [roleId]: !p.rolePermissions[roleId],
                },
              }
            : p
        ),
      })),

    // User access
    createUserAccess: (
      userId: string,
      email: string,
      name: string,
      roleId: string,
      outletId: string
    ) =>
      set((state) => ({
        userAccess: [
          ...state.userAccess,
          {
            userId,
            email,
            name,
            roleId,
            outletId,
            permissions: {},
            credentialsSent: false,
          },
        ],
      })),

    togglePermissionField(roleId: string, moduleKey: string, fieldName: string) {
      set((state) => {
        const nextPerms = state.permissions.map((p) => {
          if (p.roleId === roleId && p.moduleKey === moduleKey) {
            return { ...p, [fieldName]: !p[fieldName] };
          }
          return p;
        });
        return { permissions: nextPerms };
      });
    },

    registerModule(modDef: ModuleDef) {
      set((state) => {
        if (state.modules.find((m) => m.key === modDef.key)) {
          return state;
        }
        const newModules = [...state.modules, modDef];
        const newPerms = [...state.permissions];

        for (const role of state.roles) {
          const defaultHas =
            Array.isArray(modDef.defaultRoles) &&
            modDef.defaultRoles.includes(role.id);
          newPerms.push({
            roleId: role.id,
            moduleKey: modDef.key,
            canView: defaultHas,
            canUse: defaultHas,
            canConfigure: role.level >= 4 && defaultHas,
            hideInSidebar: !defaultHas,
          });
        }

        return {
          modules: newModules,
          permissions: newPerms,
        };
      });
    },
  };
});

// ============================================================================
// HELPER: Get access for a role & module
// ============================================================================

export function getModuleAccessForRole(roleId: string, moduleKey: string) {
  const state = useAccessStore.getState();
  const perm = state.permissions.find(
    (p) => p.roleId === roleId && p.moduleKey === moduleKey
  );
  if (!perm) {
    return {
      canView: false,
      canUse: false,
      canConfigure: false,
      hideInSidebar: true,
    };
  }
  return perm;
}

// ============================================================================
// HELPER: Get visible modules for a role
// ============================================================================

export function getVisibleModulesForRole(roleId: string) {
  const state = useAccessStore.getState();
  return state.modules.filter((mod) => {
    const perm = state.permissions.find(
      (p) => p.roleId === roleId && p.moduleKey === mod.key
    );
    if (!perm) return false;
    if (perm.hideInSidebar) return false;
    if (!perm.canView) return false;
    return true;
  });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EcosystemControlPanel() {
  const [activeTab, setActiveTab] = useState<"permissions" | "create" | "users" | "modules" | "outlets" | "actions" | "audit" | "si" | "telemetry" | "excel-templates">(
    "permissions"
  );

  return (
    <div className="flex h-full bg-slate-50 flex-col">
      {/* Top: Tab Navigation */}
      <div className="bg-white border-b border-slate-200 overflow-x-auto">
        <div className="flex items-center whitespace-nowrap">
          <TabButton
            active={activeTab === "permissions"}
            onClick={() => setActiveTab("permissions")}
            label="Roles & Permissions"
          />
          <TabButton
            active={activeTab === "actions"}
            onClick={() => setActiveTab("actions")}
            label="Actions & Permissions"
          />
          <TabButton
            active={activeTab === "outlets"}
            onClick={() => setActiveTab("outlets")}
            label="Outlets/Departments"
          />
          <TabButton
            active={activeTab === "audit"}
            onClick={() => setActiveTab("audit")}
            label="Audit Matrix"
          />
          <TabButton
            active={activeTab === "si"}
            onClick={() => setActiveTab("si")}
            label="SI Engine"
          />
          <TabButton
            active={activeTab === "telemetry"}
            onClick={() => setActiveTab("telemetry")}
            label="Telemetry"
          />
          <TabButton
            active={activeTab === "excel-templates"}
            onClick={() => setActiveTab("excel-templates")}
            label="Excel Templates"
          />
          <TabButton
            active={activeTab === "create"}
            onClick={() => setActiveTab("create")}
            label="Create Role"
          />
          <TabButton
            active={activeTab === "users"}
            onClick={() => setActiveTab("users")}
            label="Users"
          />
          <TabButton
            active={activeTab === "modules"}
            onClick={() => setActiveTab("modules")}
            label="Modules"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {activeTab === "permissions" && <PermissionsTabContent />}
        {activeTab === "actions" && <ActionsTabContent />}
        {activeTab === "outlets" && <OutletsTabContent />}
        {activeTab === "audit" && <AuditMatrixPanel />}

      {activeTab === "si" && <SIPanel />}

      {activeTab === "telemetry" && <TelemetryPanel />}
        {activeTab === "excel-templates" && <ExcelTemplatesPanel />}
        {activeTab === "create" && <RoleBuilderPanel />}
        {activeTab === "users" && <UserManagementPanel />}
        {activeTab === "modules" && <ModuleRegistryPanel />}
      </div>
    </div>
  );
}

/**
 * Tab Button Component
 */
function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-6 py-4 text-sm font-medium border-b-2 transition-colors",
        active
          ? "text-blue-600 border-b-blue-600"
          : "text-slate-600 border-b-transparent hover:text-slate-900"
      )}
    >
      {label}
    </button>
  );
}

/**
 * Outlets Tab Content
 */
function OutletsTabContent() {
  const outlets = useAccessStore((s) => s.outlets);
  const departments = useAccessStore((s) => s.departments);
  const addOutlet = useAccessStore((s) => s.addOutlet);
  const deleteOutlet = useAccessStore((s) => s.deleteOutlet);

  const [newOutletName, setNewOutletName] = useState("");
  const [newOutletDept, setNewOutletDept] = useState(departments[0] || "");
  const [newOutletLocation, setNewOutletLocation] = useState("");
  const [newOutletManager, setNewOutletManager] = useState("");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Outlets & Departments</h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage physical locations and their departments. Each outlet can have specific module access.
        </p>
      </div>

      {/* Add New Outlet */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Create New Outlet</h2>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Outlet Name (e.g., Main Kitchen)"
            value={newOutletName}
            onChange={(e) => setNewOutletName(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <select
            value={newOutletDept}
            onChange={(e) => setNewOutletDept(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Location"
            value={newOutletLocation}
            onChange={(e) => setNewOutletLocation(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <input
            type="text"
            placeholder="Manager Name"
            value={newOutletManager}
            onChange={(e) => setNewOutletManager(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <button
            onClick={() => {
              if (newOutletName.trim()) {
                addOutlet(newOutletName, newOutletDept, newOutletLocation, newOutletManager);
                setNewOutletName("");
                setNewOutletLocation("");
                setNewOutletManager("");
              }
            }}
            className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Add Outlet
          </button>
        </div>
      </div>

      {/* Outlets List */}
      <div className="grid grid-cols-1 gap-4">
        {outlets.map((outlet) => (
          <div key={outlet.id} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{(outlet as Outlet).name}</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {(outlet as Outlet).department}
                  {(outlet as Outlet).location && ` • ${(outlet as Outlet).location}`}
                </p>
                {(outlet as Outlet).manager && (
                  <p className="text-sm text-slate-600">Manager: {(outlet as Outlet).manager}</p>
                )}
              </div>
              <button
                onClick={() => deleteOutlet(outlet.id)}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Actions Tab Content
 */
function ActionsTabContent() {
  const roles = useAccessStore((s) => s.roles);
  const modules = useAccessStore((s) => s.modules);
  const actionPermissions = useAccessStore((s) => s.actionPermissions);
  const registerActionPermission = useAccessStore((s) => s.registerActionPermission);
  const toggleActionPermission = useAccessStore((s) => s.toggleActionPermission);

  const [selectedModule, setSelectedModule] = useState<string>(modules[0]?.key || "");
  const [newAction, setNewAction] = useState("");
  const [newActionDesc, setNewActionDesc] = useState("");
  const [autoLoadedActions, setAutoLoadedActions] = useState<boolean>(false);

  // Auto-load module capabilities on mount
  useEffect(() => {
    if (!autoLoadedActions) {
      initializeDefaultCapabilities();

      // Auto-register all module actions
      const allActions = getAllModuleActions();
      allActions.forEach((action) => {
        registerActionPermission(action.moduleKey, action.id, action.name);
      });

      setAutoLoadedActions(true);
    }
  }, []);

  const moduleActions = actionPermissions.filter((a) => a.moduleKey === selectedModule);

  const moduleCapabilities = useMemo(() => getAllModuleCapabilities(), []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Actions & Permissions</h1>
        <p className="text-sm text-slate-600 mt-1">
          Define granular actions within modules. Actions are auto-discovered from module declarations.
        </p>
      </div>

      {/* Auto-discovered modules notice */}
      {moduleCapabilities.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold">✓ {moduleCapabilities.length} module(s) auto-discovered</p>
              <p className="text-xs mt-1">Actions are automatically registered from module capabilities.</p>
            </div>
          </div>
        </div>
      )}

      {/* Module selector and add action form */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Define Module Actions</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Module</label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              {modules.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Action (e.g., recipes:view)"
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="Description"
              value={newActionDesc}
              onChange={(e) => setNewActionDesc(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <button
              onClick={() => {
                if (newAction.trim() && newActionDesc.trim()) {
                  registerActionPermission(selectedModule, newAction, newActionDesc);
                  setNewAction("");
                  setNewActionDesc("");
                }
              }}
              className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Add Action
            </button>
          </div>
        </div>
      </div>

      {/* Action permissions matrix */}
      {moduleActions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 overflow-x-auto">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Actions in {modules.find((m) => m.key === selectedModule)?.name}
          </h2>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 font-semibold text-slate-900">Action</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-900">Description</th>
                {roles.map((role) => (
                  <th key={role.id} className="text-center py-2 px-2 font-semibold text-slate-900 text-xs">
                    {role.name.split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {moduleActions.map((action) => (
                <tr key={action.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-3 font-mono text-xs text-slate-700">{action.action}</td>
                  <td className="py-3 px-3 text-slate-600">{action.description}</td>
                  {roles.map((role) => (
                    <td key={role.id} className="text-center py-3 px-2">
                      <input
                        type="checkbox"
                        checked={action.rolePermissions[role.id] || false}
                        onChange={() => toggleActionPermission(action.id, role.id)}
                        className="w-4 h-4 rounded"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Permissions Tab Content
 */
function PermissionsTabContent() {
  const roles = useAccessStore((s) => s.roles);
  const modules = useAccessStore((s) => s.modules);
  const selectedRoleId = useAccessStore((s) => s.selectedRoleId);
  const setSelectedRoleId = useAccessStore((s) => s.setSelectedRoleId);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) || roles[0],
    [roles, selectedRoleId]
  );

  return (
    <div className="flex h-full bg-slate-50">
      {/* Left: Role list */}
      <aside className="w-56 border-r border-slate-200 bg-white overflow-y-auto">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Roles
          </h2>
          <p className="text-xs text-slate-600 mt-2">
            Select a role to configure module access.
          </p>
        </div>

        <nav className="p-3 space-y-1">
          {roles.map((role) => {
            const isActive = role.id === selectedRole?.id;
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <div className="font-medium">{role.name}</div>
                <div className="text-xs opacity-75">Level {role.level}</div>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Center: Permission grid */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Ecosystem Control Panel
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Configure which LUCCCA modules each role can see, use, and
              configure.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900">
              Editing: <strong>{selectedRole?.name}</strong> (Level{" "}
              {selectedRole?.level})
            </p>
          </div>

          <ModulePermissionGrid />
        </div>
      </main>

      {/* Right: Sidebar Preview */}
      <aside className="w-72 border-l border-slate-200 bg-white overflow-y-auto">
        <SidebarPreview />
      </aside>
    </div>
  );
}

// ============================================================================
// MODULE PERMISSION GRID
// ============================================================================

function ModulePermissionGrid() {
  const modules = useAccessStore((s) => s.modules);
  const permissions = useAccessStore((s) => s.permissions);
  const selectedRoleId = useAccessStore((s) => s.selectedRoleId);
  const toggleField = useAccessStore((s) => s.togglePermissionField);

  if (!selectedRoleId) {
    return <div className="text-sm text-slate-600">No role selected.</div>;
  }

  const rows = modules.slice().sort((a, b) => a.category.localeCompare(b.category));

  const getPerm = (moduleKey: string): ModulePermission => {
    const found = permissions.find(
      (p) => p.roleId === selectedRoleId && p.moduleKey === moduleKey
    );
    return (
      found || {
        roleId: selectedRoleId,
        moduleKey,
        canView: false,
        canUse: false,
        canConfigure: false,
        hideInSidebar: true,
      }
    );
  };

  const CellToggle = ({ moduleKey, field }: { moduleKey: string; field: string }) => {
    const perm = getPerm(moduleKey);
    const value = perm[field as keyof ModulePermission];

    return (
      <button
        onClick={() => toggleField(selectedRoleId, moduleKey, field)}
        className={cn(
          "w-6 h-6 rounded border flex items-center justify-center text-sm font-medium transition-colors",
          value
            ? "bg-blue-600 border-blue-600 text-white"
            : "bg-white border-slate-300 text-slate-400 hover:border-slate-400"
        )}
      >
        {value ? "✓" : ""}
      </button>
    );
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="grid grid-cols-6 gap-0 bg-slate-50 border-b border-slate-200 sticky top-0">
        <div className="col-span-2 px-4 py-3 text-sm font-semibold text-slate-900">Module</div>
        <div className="px-4 py-3 text-sm font-semibold text-slate-900 text-center">View</div>
        <div className="px-4 py-3 text-sm font-semibold text-slate-900 text-center">Use</div>
        <div className="px-4 py-3 text-sm font-semibold text-slate-900 text-center">Configure</div>
        <div className="px-4 py-3 text-sm font-semibold text-slate-900 text-center">Hide</div>
      </div>

      {rows.map((mod, idx) => {
        const perm = getPerm(mod.key);
        const isSensitive = mod.key === "echo_aurum";

        return (
          <div
            key={mod.key}
            className={cn(
              "grid grid-cols-6 gap-0 border-b border-slate-100",
              isSensitive ? "bg-orange-50" : "hover:bg-slate-50",
              idx === rows.length - 1 ? "border-b-0" : ""
            )}
          >
            <div className="col-span-2 px-4 py-3">
              <div className="font-medium text-slate-900 text-sm">{mod.name}</div>
              <div className="text-xs text-slate-600">{mod.category}</div>
            </div>
            <div className="px-4 py-3 flex justify-center">
              <CellToggle moduleKey={mod.key} field="canView" />
            </div>
            <div className="px-4 py-3 flex justify-center">
              <CellToggle moduleKey={mod.key} field="canUse" />
            </div>
            <div className="px-4 py-3 flex justify-center">
              <CellToggle moduleKey={mod.key} field="canConfigure" />
            </div>
            <div className="px-4 py-3 flex justify-center">
              <CellToggle moduleKey={mod.key} field="hideInSidebar" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// SIDEBAR PREVIEW
// ============================================================================

function SidebarPreview() {
  const roles = useAccessStore((s) => s.roles);
  const selectedRoleId = useAccessStore((s) => s.selectedRoleId);
  const state = useAccessStore();

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0];

  const visibleModules = useMemo(() => {
    if (!selectedRole) return [];
    return state.modules.filter((mod) => {
      const perm = state.permissions.find(
        (p) => p.roleId === selectedRole.id && p.moduleKey === mod.key
      );
      if (!perm) return false;
      if (perm.hideInSidebar) return false;
      if (!perm.canView) return false;
      return true;
    });
  }, [state.modules, state.permissions, selectedRole]);

  return (
    <div className="p-6 space-y-4">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-lg font-bold text-slate-900">Sidebar Preview</h2>
        <p className="text-xs text-slate-600 mt-2">
          How the sidebar will appear for <strong>{selectedRole?.name}</strong>.
        </p>
      </div>

      <div className="space-y-1">
        {visibleModules.length === 0 && (
          <div className="text-xs text-slate-500 p-4 text-center">
            No modules visible
          </div>
        )}

        {visibleModules.map((mod) => (
          <div
            key={mod.key}
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-100 text-slate-900 text-sm hover:bg-slate-200 transition-colors"
          >
            <span className="w-4 h-4 rounded bg-slate-400 text-white flex items-center justify-center text-xs font-bold">
              {mod.icon.slice(0, 1).toUpperCase()}
            </span>
            <span>{mod.name}</span>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 mt-6">
        <p className="font-medium mb-2">📋 Implementation Note:</p>
        <p>
          Wire this store into your Sidebar component using{" "}
          <code className="bg-white px-1 rounded">getVisibleModulesForRole(roleId)</code>
        </p>
      </div>
    </div>
  );
}
