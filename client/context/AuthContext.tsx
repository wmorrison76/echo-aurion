/**
 * AuthContext Re-export
 * 
 * PurchasingReceiving components import @/context/AuthContext
 * This file re-exports the actual AuthContext from contexts directory
 */
import React from "react";

export {
  AuthContext,
  AuthProvider,
  useAuth,
  type AuthUser,
  type AuthOrganization,
  type AuthContextType,
} from "@/contexts/AuthContext";

/** Stub RoleGuard: renders children unconditionally (auth enforcement is server-side). */
export function RoleGuard({ children }: { children: React.ReactNode; allowedRoles?: string[] }) {
  return <>{children}</>;
}
