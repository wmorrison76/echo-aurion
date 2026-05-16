/**
 * usePermissions Hook
 * Provides permission checking utilities for React components
 */

import { useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import type {
  Permission,
  AccessContext,
  UserRole,
  OutletUserRole,
} from "@/types/roles-permissions";
import {
  checkPermission,
  checkOutletPermission,
  canViewRecipe,
  canEditRecipe,
  canDeleteRecipe,
  canCreateGlobalRecipe,
  canApproveGlobalRecipe,
  canViewInventory,
  canEditInventory,
  canApprovePurchasing,
  canManageOutletStaff,
  canManageUsers,
  canViewReports,
  getAccessibleOutlets,
  canAccessOutletContext,
  filterRecipesByPermission,
  filterOutletsByPermission,
} from "@/lib/rbac-manager";

interface UsePermissionsReturn {
  // Basic checks
  hasPermission: (permission: Permission) => boolean;
  hasOutletPermission: (outletId: string, permission: Permission) => boolean;

  // Recipe-specific checks
  canView: (recipe: { isGlobal?: boolean; outletId?: string; createdBy?: string }) => boolean;
  canEdit: (recipe: { isGlobal?: boolean; outletId?: string; createdBy?: string }) => boolean;
  canDelete: (recipe: { isGlobal?: boolean; outletId?: string; createdBy?: string }) => boolean;
  canCreateGlobal: () => boolean;
  canApproveGlobal: () => boolean;

  // Inventory checks
  canViewInventory: (outletId?: string) => boolean;
  canEditInventory: (outletId?: string) => boolean;
  canApprovePurchasing: (outletId?: string) => boolean;

  // Outlet checks
  canManageOutlet: (outletId: string) => boolean;
  canManageAllUsers: () => boolean;
  canViewAllReports: () => boolean;
  canAccessOutlet: (outletId: string) => boolean;

  // Data filtering
  filterRecipes: (recipes: Array<{ id: string; isGlobal?: boolean; outletId?: string }>) => string[];
  filterOutlets: (outlets: Array<{ id: string }>) => string[];

  // Context and utilities
  context: AccessContext | null;
  isLoading: boolean;
  userRole: UserRole | null;
  accessibleOutlets: string[];
}

export function usePermissions(
  outletId?: string,
): UsePermissionsReturn {
  const { user, loading } = useAuth();

  // Build access context
  const context = useMemo<AccessContext | null>(() => {
    if (!user) return null;

    return {
      userId: user.id,
      userRole: user.role,
      outletId,
      organizationId: user.organization_id,
      outletRoles: (user as any).outletRoles || [],
    };
  }, [user, outletId]);

  // Basic permission checks
  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!context) return false;
      return checkPermission(context, permission);
    },
    [context],
  );

  const hasOutletPermission = useCallback(
    (outletId: string, permission: Permission): boolean => {
      if (!context) return false;
      return checkOutletPermission(context, outletId, permission);
    },
    [context],
  );

  // Recipe-specific checks
  const canViewRecipeImpl = useCallback(
    (recipe: { isGlobal?: boolean; outletId?: string; createdBy?: string }): boolean => {
      if (!context) return false;
      return canViewRecipe(context, recipe);
    },
    [context],
  );

  const canEditRecipeImpl = useCallback(
    (recipe: { isGlobal?: boolean; outletId?: string; createdBy?: string }): boolean => {
      if (!context) return false;
      return canEditRecipe(context, recipe);
    },
    [context],
  );

  const canDeleteRecipeImpl = useCallback(
    (recipe: { isGlobal?: boolean; outletId?: string; createdBy?: string }): boolean => {
      if (!context) return false;
      return canDeleteRecipe(context, recipe);
    },
    [context],
  );

  const canCreateGlobalRecipeImpl = useCallback((): boolean => {
    if (!context) return false;
    return canCreateGlobalRecipe(context);
  }, [context]);

  const canApproveGlobalRecipeImpl = useCallback((): boolean => {
    if (!context) return false;
    return canApproveGlobalRecipe(context);
  }, [context]);

  // Inventory checks
  const canViewInventoryImpl = useCallback(
    (outletId?: string): boolean => {
      if (!context) return false;
      return canViewInventory(context, outletId);
    },
    [context],
  );

  const canEditInventoryImpl = useCallback(
    (outletId?: string): boolean => {
      if (!context) return false;
      return canEditInventory(context, outletId);
    },
    [context],
  );

  const canApprovePurchasingImpl = useCallback(
    (outletId?: string): boolean => {
      if (!context) return false;
      return canApprovePurchasing(context, outletId);
    },
    [context],
  );

  // Outlet checks
  const canManageOutletImpl = useCallback(
    (outletId: string): boolean => {
      if (!context) return false;
      return canManageOutletStaff(context, outletId);
    },
    [context],
  );

  const canManageAllUsersImpl = useCallback((): boolean => {
    if (!context) return false;
    return canManageUsers(context);
  }, [context]);

  const canViewAllReportsImpl = useCallback((): boolean => {
    if (!context) return false;
    return canViewReports(context);
  }, [context]);

  const canAccessOutletImpl = useCallback(
    (outletId: string): boolean => {
      if (!context) return false;
      return canAccessOutletContext(context, outletId);
    },
    [context],
  );

  // Data filtering
  const filterRecipesImpl = useCallback(
    (recipes: Array<{ id: string; isGlobal?: boolean; outletId?: string }>): string[] => {
      if (!context) return [];
      return filterRecipesByPermission(context, recipes);
    },
    [context],
  );

  const filterOutletsImpl = useCallback(
    (outlets: Array<{ id: string }>): string[] => {
      if (!context) return [];
      return filterOutletsByPermission(context, outlets);
    },
    [context],
  );

  const accessibleOutlets = useMemo(() => {
    if (!context) return [];
    return getAccessibleOutlets(context);
  }, [context]);

  return {
    hasPermission,
    hasOutletPermission,
    canView: canViewRecipeImpl,
    canEdit: canEditRecipeImpl,
    canDelete: canDeleteRecipeImpl,
    canCreateGlobal: canCreateGlobalRecipeImpl,
    canApproveGlobal: canApproveGlobalRecipeImpl,
    canViewInventory: canViewInventoryImpl,
    canEditInventory: canEditInventoryImpl,
    canApprovePurchasing: canApprovePurchasingImpl,
    canManageOutlet: canManageOutletImpl,
    canManageAllUsers: canManageAllUsersImpl,
    canViewAllReports: canViewAllReportsImpl,
    canAccessOutlet: canAccessOutletImpl,
    filterRecipes: filterRecipesImpl,
    filterOutlets: filterOutletsImpl,
    context,
    isLoading: loading,
    userRole: user?.role || null,
    accessibleOutlets,
  };
}

/**
 * useOutletContext Hook
 * Provides outlet-specific context and permissions
 */
interface UseOutletContextReturn {
  outletId: string | null;
  canManage: boolean;
  canEdit: boolean;
  canView: boolean;
  isLoading: boolean;
}

export function useOutletContext(outletId: string): UseOutletContextReturn {
  const permissions = usePermissions(outletId);

  const canManage = !permissions.isLoading && permissions.canManageOutlet(outletId);
  const canEdit = !permissions.isLoading && permissions.canEditInventory(outletId);
  const canView = !permissions.isLoading && permissions.canAccessOutlet(outletId);

  return {
    outletId,
    canManage,
    canEdit,
    canView,
    isLoading: permissions.isLoading,
  };
}
