/**
 * useAuth Hook
 * Provides access to authentication context.
 * Safe during HMR and handles cases where provider may not be available yet.
 */

import { useContext, useMemo } from "react";
import { AuthContext, AuthContextType } from "@/contexts/AuthContext";

const DEFAULT_AUTH_CONTEXT: AuthContextType = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  organization: null,
  login: async () => {
    throw new Error("AuthProvider not yet available");
  },
  signup: async () => {
    throw new Error("AuthProvider not yet available");
  },
  logout: async () => {
    throw new Error("AuthProvider not yet available");
  },
  refresh: () => {
    throw new Error("AuthProvider not yet available");
  },
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  // Return default context if provider not available (handles HMR race conditions)
  if (!context) {
    return DEFAULT_AUTH_CONTEXT;
  }

  return context;
}
