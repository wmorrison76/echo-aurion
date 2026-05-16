/**
 * PermissionGuard Component
 * Conditionally renders content based on user permissions
 */

import React from "react";
import { usePermissions } from "@/hooks/use-permissions";
import type { Permission } from "@/types/roles-permissions";

interface PermissionGuardProps {
  /** Permission to check */
  permission?: Permission;

  /** Recipe object to check edit/view/delete permissions */
  recipe?: {
    isGlobal?: boolean;
    outletId?: string;
    createdBy?: string;
  };

  /** Action to check: 'view', 'edit', 'delete', 'create-global', 'approve-global' */
  action?: "view" | "edit" | "delete" | "create-global" | "approve-global";

  /** Outlet ID for outlet-specific checks */
  outletId?: string;

  /** Content to show when permission is granted */
  children: React.ReactNode;

  /** Content to show when permission is denied (optional) */
  fallback?: React.ReactNode;

  /** Custom permission check function */
  check?: boolean;

  /** CSS class for the wrapper */
  className?: string;
}

export function PermissionGuard({
  permission,
  recipe,
  action,
  outletId,
  children,
  fallback,
  check,
  className,
}: PermissionGuardProps) {
  const permissions = usePermissions(outletId);

  if (permissions.isLoading) {
    return fallback || null;
  }

  let allowed = false;

  if (check !== undefined) {
    allowed = check;
  } else if (permission) {
    allowed = permissions.hasPermission(permission);
  } else if (recipe && action) {
    switch (action) {
      case "view":
        allowed = permissions.canView(recipe);
        break;
      case "edit":
        allowed = permissions.canEdit(recipe);
        break;
      case "delete":
        allowed = permissions.canDelete(recipe);
        break;
      case "create-global":
        allowed = permissions.canCreateGlobal();
        break;
      case "approve-global":
        allowed = permissions.canApproveGlobal();
        break;
    }
  }

  if (!allowed) {
    return fallback || null;
  }

  return <div className={className}>{children}</div>;
}

/**
 * Hook to check if content should be shown
 */
export function useCanShowContent(
  permission?: Permission,
  recipe?: {
    isGlobal?: boolean;
    outletId?: string;
    createdBy?: string;
  },
  action?: "view" | "edit" | "delete" | "create-global" | "approve-global",
  outletId?: string,
): boolean {
  const permissions = usePermissions(outletId);

  if (permissions.isLoading) {
    return false;
  }

  if (permission) {
    return permissions.hasPermission(permission);
  }

  if (recipe && action) {
    switch (action) {
      case "view":
        return permissions.canView(recipe);
      case "edit":
        return permissions.canEdit(recipe);
      case "delete":
        return permissions.canDelete(recipe);
      case "create-global":
        return permissions.canCreateGlobal();
      case "approve-global":
        return permissions.canApproveGlobal();
    }
  }

  return true;
}

/**
 * Restricted Content Component
 * Shows a message when user doesn't have permission
 */
interface RestrictedContentProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
}

export function RestrictedContent({
  title = "Access Denied",
  message = "You don't have permission to view this content.",
  icon,
}: RestrictedContentProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {icon && <div className="mb-4 text-4xl">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}
