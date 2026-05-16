/**
 * UI Guard Components for Genesis RBAC
 * Conditional rendering based on permissions
 */

import React from "react";
import type { User } from "@/../shared/types/genesis-permissions";
import {
  can,
  canAny,
  canAll,
  getPermissionDescription,
} from "../permissions/permissionChecks";

interface ProtectedButtonProps {
  user: User | null;
  requiredPermission: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: string;
  title?: string;
}

/**
 * Button that's disabled if user lacks permission
 */
export function ProtectedButton({
  user,
  requiredPermission,
  children,
  onClick,
  className = "",
  title,
}: ProtectedButtonProps) {
  const hasPermission = can(user, requiredPermission);
  const description = getPermissionDescription(requiredPermission);

  return (
    <button
      disabled={!hasPermission}
      onClick={hasPermission ? onClick : undefined}
      className={`${className} ${!hasPermission ? "opacity-50 cursor-not-allowed" : ""}`}
      title={!hasPermission ? `Requires: ${description}` : title}
    >
      {children}
    </button>
  );
}

interface PermissionGateProps {
  user: User | null;
  requiredPermission: string;
  requiredMode?: "ANY" | "ALL";
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Render children only if user has permission
 */
export function PermissionGate({
  user,
  requiredPermission,
  children,
  fallback,
}: PermissionGateProps) {
  const hasPermission = can(user, requiredPermission);

  if (!hasPermission) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

interface PermissionGateMultiProps {
  user: User | null;
  requiredPermissions: string[];
  mode?: "ANY" | "ALL";
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Render children only if user has ANY or ALL of specified permissions
 */
export function PermissionGateMulti({
  user,
  requiredPermissions,
  mode = "ANY",
  children,
  fallback,
}: PermissionGateMultiProps) {
  const hasPermission =
    mode === "ANY"
      ? canAny(user, requiredPermissions)
      : canAll(user, requiredPermissions);

  if (!hasPermission) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

interface PermissionDisabledOverlayProps {
  user: User | null;
  requiredPermission: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Overlay wrapper that shows why content is disabled
 */
export function PermissionDisabledOverlay({
  user,
  requiredPermission,
  children,
  className = "",
}: PermissionDisabledOverlayProps) {
  const hasPermission = can(user, requiredPermission);

  if (hasPermission) {
    return <>{children}</>;
  }

  const description = getPermissionDescription(requiredPermission);

  return (
    <div className={`relative ${className}`} title={`Requires: ${description}`}>
      <div className="opacity-50 pointer-events-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded">
        <div className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
          Requires: {description}
        </div>
      </div>
    </div>
  );
}

interface RoleRequiredProps {
  user: User | null;
  requiredRole: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Render children only if user has required role
 */
export function RoleRequired({
  user,
  requiredRole,
  children,
  fallback,
}: RoleRequiredProps) {
  if (!user) {
    return fallback ? <>{fallback}</> : null;
  }

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const hasRole = roles.includes(user.role);

  if (!hasRole) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

interface OutletAccessCheckProps {
  user: User | null;
  outletId: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Check if user can access a specific outlet
 */
export function OutletAccessCheck({
  user,
  outletId,
  children,
  fallback,
}: OutletAccessCheckProps) {
  if (!user) {
    return fallback ? <>{fallback}</> : null;
  }

  const canAccess =
    user.role === "SYSTEM_ADMIN" ||
    (user.outletId === outletId && user.role === "OUTLET_MANAGER") ||
    user.role === "PROCUREMENT_MANAGER";

  if (!canAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

/**
 * Helper to get button disabled state
 */
export function getButtonDisabledState(
  user: User | null,
  requiredPermission: string,
): boolean {
  return !can(user, requiredPermission);
}

/**
 * Helper to get button title/tooltip
 */
export function getButtonTooltip(
  user: User | null,
  requiredPermission: string,
  defaultTitle?: string,
): string {
  if (can(user, requiredPermission)) {
    return defaultTitle || "";
  }

  const description = getPermissionDescription(requiredPermission);
  return `Requires: ${description}`;
}
