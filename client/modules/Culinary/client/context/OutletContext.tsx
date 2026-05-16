/**
 * Outlet Context
 * Manages outlet selection and outlet-specific state
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";
import { getAccessibleOutlets } from "@/lib/rbac-manager";
import type { Outlet } from "@/types/roles-permissions";

interface OutletContextType {
  // Selected outlet
  currentOutletId: string | null;
  setCurrentOutletId: (outletId: string | null) => void;

  // Available outlets for user
  availableOutlets: string[];

  // Outlet data
  outlet: Outlet | null;
  setOutlet: (outlet: Outlet | null) => void;

  // All outlets (for admins)
  allOutlets: Outlet[];
  setAllOutlets: (outlets: Outlet[]) => void;

  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Refresh outlet
  refreshOutlet: () => Promise<void>;
}

const OutletContext = createContext<OutletContextType | undefined>(undefined);

interface OutletProviderProps {
  children: React.ReactNode;
  defaultOutletId?: string;
}

export function OutletProvider({
  children,
  defaultOutletId,
}: OutletProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const [currentOutletId, setCurrentOutletId] = useState<string | null>(
    defaultOutletId || null,
  );
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const permissions = usePermissions(currentOutletId || undefined);

  // Get available outlets for user
  const availableOutlets = React.useMemo(() => {
    if (!permissions.context) return [];
    const outlets = getAccessibleOutlets(permissions.context);
    // Filter out "all" marker for regular users
    return outlets.filter((o) => o !== "all");
  }, [permissions.context]);

  // Auto-select first available outlet on first load
  useEffect(() => {
    if (
      isAuthenticated &&
      user &&
      !currentOutletId &&
      availableOutlets.length > 0
    ) {
      setCurrentOutletId(availableOutlets[0]);
    }
  }, [isAuthenticated, user, currentOutletId, availableOutlets]);

  const refreshOutlet = useCallback(async () => {
    // This would fetch fresh outlet data from server
    // For now, it's a placeholder for future implementation
    return Promise.resolve();
  }, []);

  const value: OutletContextType = {
    currentOutletId,
    setCurrentOutletId,
    availableOutlets,
    outlet,
    setOutlet,
    allOutlets,
    setAllOutlets,
    isLoading,
    setIsLoading,
    refreshOutlet,
  };

  return (
    <OutletContext.Provider value={value}>{children}</OutletContext.Provider>
  );
}

export function useOutlet() {
  const context = useContext(OutletContext);
  if (!context) {
    throw new Error("useOutlet must be used within OutletProvider");
  }
  return context;
}

/**
 * Hook to get outlets accessible to current user
 */
export function useAccessibleOutlets() {
  const outlet = useOutlet();
  return outlet.availableOutlets;
}

/**
 * Hook to check if user has access to outlet
 */
export function useCanAccessOutlet(outletId: string): boolean {
  const { availableOutlets } = useOutlet();
  return availableOutlets.includes(outletId) || availableOutlets.includes("all");
}
