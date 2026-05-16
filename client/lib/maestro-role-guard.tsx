/**
 * Role Guard Components
 *
 * Utilities for conditionally rendering UI based on role-based permissions.
 * Provides components and hooks for RBAC in the dashboard.
 */

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { canAccess, type MaestroRole, type PanelId } from "./maestro-rbac";

interface RoleGuardProps {
  children: React.ReactNode;
  action: "read" | "edit" | "approve";
  panelId: PanelId;
  fallback?: React.ReactNode;
}

/**
 * RoleGuard Component
 * Conditionally renders children based on user role and panel permissions
 *
 * @example
 * <RoleGuard action="edit" panelId="production">
 *   <EditButton />
 * </RoleGuard>
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  action,
  panelId,
  fallback = null,
}) => {
  const { user } = useAuth();

  if (!user) {
    return fallback;
  }

  const userRole = (user.role || "guest") as MaestroRole;
  const hasPermission = canAccess(userRole, panelId, action);

  if (!hasPermission) {
    return fallback;
  }

  return <>{children}</>;
};

/**
 * PermissionButton Component
 * Renders a button that is disabled or hidden based on permissions
 */
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  action: "read" | "edit" | "approve";
  panelId: PanelId;
  permissionDeniedText?: string;
  hideIfDenied?: boolean;
  children: React.ReactNode;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  action,
  panelId,
  permissionDeniedText = "Permission denied",
  hideIfDenied = false,
  children,
  title,
  disabled,
  ...rest
}) => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const userRole = (user.role || "guest") as MaestroRole;
  const hasPermission = canAccess(userRole, panelId, action);

  if (!hasPermission) {
    if (hideIfDenied) {
      return null;
    }
    return (
      <button
        disabled
        title={permissionDeniedText}
        className="opacity-50 cursor-not-allowed"
        {...rest}
      >
        {children}
      </button>
    );
  }

  return (
    <button title={title} disabled={disabled} {...rest}>
      {children}
    </button>
  );
};

/**
 * useHasPermission Hook
 * Check if user has a specific permission
 */
export function useHasPermission(
  action: "read" | "edit" | "approve",
  panelId: PanelId,
): boolean {
  const { user } = useAuth();

  if (!user) {
    return false;
  }

  const userRole = (user.role || "guest") as MaestroRole;
  return canAccess(userRole, panelId, action);
}

/**
 * PermissionDenied Component
 * Shows a message when user lacks permission
 */
interface PermissionDeniedProps {
  action: "read" | "edit" | "approve";
  panelId: PanelId;
  message?: string;
}

export const PermissionDenied: React.FC<PermissionDeniedProps> = ({
  action,
  panelId,
  message = "You don't have permission for this action",
}) => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const userRole = (user.role || "guest") as MaestroRole;
  const hasPermission = canAccess(userRole, panelId, action);

  if (hasPermission) {
    return null;
  }

  return (
    <div className="bg-yellow-900 border border-yellow-700 rounded p-3 text-yellow-200 text-sm">
      <strong>Access Restricted:</strong> {message}
    </div>
  );
};
