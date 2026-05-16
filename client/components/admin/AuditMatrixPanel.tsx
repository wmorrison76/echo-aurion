/**
 * Audit Matrix Panel
 * Complete drill-down showing:
 * - Who (users) can do what (actions) in where (outlets)
 * - Grouped by department and role
 * - Highlights potential inconsistencies
 */

import React, { useMemo, useState } from "react";
import {
  useAccessStore,
  getModuleAccessForRole,
  getVisibleModulesForRole,
} from "./EcosystemControlPanel";
import { useUserStore } from "./UserManagementPanel";
import {
  getAllModuleCapabilities,
  getAllModuleActions,
} from "@/lib/module-capabilities";
import {
  checkPermissionConsistency,
  detectSuspiciousPatterns,
  type ConsistencyReport,
} from "@/lib/permission-consistency-checker";
import { AlertTriangle, CheckCircle, XCircle, Eye, Lock, Zap } from "lucide-react";
import { cn } from "@/lib/glass";

interface AuditEntry {
  userId: string;
  userName: string;
  email: string;
  roleId: string;
  roleName: string;
  outletId: string;
  outletName: string;
  department: string;
  permissions: {
    action: string;
    allowed: boolean;
    category: string;
  }[];
  inconsistencies: string[];
}

export default function AuditMatrixPanel() {
  const roles = useAccessStore((s) => s.roles);
  const modules = useAccessStore((s) => s.modules);
  const outlets = useAccessStore((s) => s.outlets);
  const users = useUserStore((s) => s.users);
  const userAccess = useAccessStore((s) => s.userAccess);
  const actionPermissions = useAccessStore((s) => s.actionPermissions);

  const [viewMode, setViewMode] = useState<"byUser" | "byRole" | "byOutlet">("byUser");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Build comprehensive audit entries
  const auditMatrix = useMemo(() => {
    const entries: AuditEntry[] = [];

    users.forEach((user) => {
      const role = roles.find((r) => r.id === user.roleId);
      const outlet = (outlets as any[]).find((o) => o.id === user.outlets[0]);

      if (!role || !outlet) return;

      // Get all actions this role can perform
      const roleActions = actionPermissions.filter((ap) => ap.rolePermissions[user.roleId]);

      // Check for inconsistencies
      const inconsistencies: string[] = [];

      // Check if user's department matches outlet department
      if (user.departments.length > 0 && outlet.department && !user.departments.includes(outlet.department)) {
        inconsistencies.push(
          `User is in ${user.departments.join(", ")} but assigned to ${outlet.department} outlet`
        );
      }

      // Check for role/outlet mismatches
      if (role.name.includes("Chef") && !outlet.department?.includes("Culinary")) {
        inconsistencies.push(`Chef role assigned to non-culinary outlet`);
      }

      if (role.name.includes("Pastry") && outlet.department !== "Pastry") {
        inconsistencies.push(`Pastry role assigned to non-pastry outlet`);
      }

      // Check if user has more permissions than their role typically allows
      const visibleModules = getVisibleModulesForRole(user.roleId);
      const actualAccessCount = roleActions.length;
      const expectedCount = visibleModules.length * 3; // Rough estimate

      if (actualAccessCount > expectedCount * 2) {
        inconsistencies.push(`Excessive permissions for role (${actualAccessCount} actions)`);
      }

      entries.push({
        userId: user.id,
        userName: user.name,
        email: user.email,
        roleId: user.roleId,
        roleName: role.name,
        outletId: user.outlets[0] || "none",
        outletName: outlet.name || "Unassigned",
        department: outlet.department || "Unknown",
        permissions: roleActions.map((ap) => ({
          action: ap.action,
          allowed: true,
          category: ap.action.split(":")[0],
        })),
        inconsistencies,
      });
    });

    return entries;
  }, [users, roles, outlets, actionPermissions]);

  // Group by role
  const byRole = useMemo(() => {
    const grouped: Record<string, AuditEntry[]> = {};
    auditMatrix.forEach((entry) => {
      if (!grouped[entry.roleId]) {
        grouped[entry.roleId] = [];
      }
      grouped[entry.roleId].push(entry);
    });
    return grouped;
  }, [auditMatrix]);

  // Group by outlet
  const byOutlet = useMemo(() => {
    const grouped: Record<string, AuditEntry[]> = {};
    auditMatrix.forEach((entry) => {
      if (!grouped[entry.outletId]) {
        grouped[entry.outletId] = [];
      }
      grouped[entry.outletId].push(entry);
    });
    return grouped;
  }, [auditMatrix]);

  // Count inconsistencies
  const totalInconsistencies = auditMatrix.reduce(
    (sum, entry) => sum + entry.inconsistencies.length,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Access Audit Matrix</h1>
        <p className="text-sm text-slate-600 mt-1">
          Complete drill-down showing who can do what, grouped by user, role, or outlet.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-600 font-semibold">Total Users</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{users.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-600 font-semibold">Total Roles</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{roles.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-600 font-semibold">Total Outlets</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{outlets.length}</p>
        </div>
        <div className={cn("rounded-lg p-4 border", totalInconsistencies > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200")}>
          <p className={cn("text-xs font-semibold", totalInconsistencies > 0 ? "text-red-600" : "text-green-600")}>
            Inconsistencies
          </p>
          <p className={cn("text-2xl font-bold mt-2", totalInconsistencies > 0 ? "text-red-900" : "text-green-900")}>
            {totalInconsistencies}
          </p>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-slate-900 mb-3">View Mode</p>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("byUser")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              viewMode === "byUser"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            By User
          </button>
          <button
            onClick={() => setViewMode("byRole")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              viewMode === "byRole"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            By Role
          </button>
          <button
            onClick={() => setViewMode("byOutlet")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              viewMode === "byOutlet"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            By Outlet
          </button>
        </div>
      </div>

      {/* Matrix View */}
      <div className="space-y-4">
        {viewMode === "byUser" && (
          <div className="space-y-3">
            {auditMatrix.map((entry) => (
              <div key={entry.userId} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                {/* Header */}
                <button
                  onClick={() =>
                    setExpandedUserId(
                      expandedUserId === entry.userId ? null : entry.userId
                    )
                  }
                  className="w-full px-4 py-3 hover:bg-slate-50 flex items-start justify-between border-b border-slate-100"
                >
                  <div className="text-left flex-1">
                    <p className="font-semibold text-slate-900">{entry.userName}</p>
                    <p className="text-xs text-slate-600">
                      {entry.email} • {entry.roleName} • {entry.outletName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.inconsistencies.length > 0 && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                {expandedUserId === entry.userId && (
                  <div className="p-4 space-y-4">
                    {/* Inconsistencies */}
                    {entry.inconsistencies.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-red-900 mb-2">Inconsistencies Detected:</p>
                        <ul className="text-xs text-red-800 space-y-1">
                          {entry.inconsistencies.map((inc, idx) => (
                            <li key={idx}>• {inc}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Permissions */}
                    <div>
                      <p className="text-xs font-semibold text-slate-900 mb-2">
                        Permissions ({entry.permissions.length})
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {entry.permissions.map((perm) => (
                          <div key={perm.action} className="bg-slate-50 rounded px-2 py-1">
                            <p className="text-xs font-mono text-slate-700">{perm.action}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {viewMode === "byRole" && (
          <div className="space-y-4">
            {Object.entries(byRole).map(([roleId, entries]) => {
              const role = roles.find((r) => r.id === roleId);
              return (
                <div key={roleId} className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900">{role?.name}</h3>
                    <span className="text-sm text-slate-600">{entries.length} users</span>
                  </div>
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <div key={entry.userId} className="text-sm">
                        <p className="font-medium text-slate-700">{entry.userName}</p>
                        <p className="text-xs text-slate-600">{entry.outletName}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === "byOutlet" && (
          <div className="space-y-4">
            {Object.entries(byOutlet).map(([outletId, entries]) => {
              const outlet = (outlets as any[]).find((o) => o.id === outletId);
              return (
                <div key={outletId} className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{outlet?.name}</h3>
                      <p className="text-xs text-slate-600">{outlet?.department}</p>
                    </div>
                    <span className="text-sm text-slate-600">{entries.length} users</span>
                  </div>
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <div key={entry.userId} className="text-sm">
                        <p className="font-medium text-slate-700">{entry.userName}</p>
                        <p className="text-xs text-slate-600">{entry.roleName}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
