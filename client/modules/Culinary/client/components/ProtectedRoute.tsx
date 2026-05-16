import React from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiresAuth?: boolean;
}

/**
 * Protects routes by requiring user authentication
 * DISABLED FOR MODULE-LEVEL DEVELOPMENT
 * Auth checks will be enforced at the full program level
 */
export function ProtectedRoute({
  children,
  requiredRoles,
  requiresAuth = true,
}: ProtectedRouteProps) {
  // Authentication temporarily disabled for module-level development
  // Full authentication will be enforced in production
  return <>{children}</>;
}
